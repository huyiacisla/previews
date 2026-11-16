// Ticket box page controller. <body data-portal="resident|staff|client|admin">.
// All markup and Tailwind classes live in partials/tickets-app.html; this file clones templates, fills text and
// toggles hidden / data-* / aria-*. The data comes from the same store as Messages (store.ticketBox / ticketRecord).

import { createStore, STAGE_LABEL, TICKET_CATEGORIES } from './store.js';
import { createTransport } from './transport.js';
import { PORTALS, pickPersona, initials } from './personas.js';
import { formatFull, formatTime, listTime, groupByDay, duration, formatBytes } from './format.js';
import { parseQuery, describeFilters, withoutFilter } from './query.js';
import { exitTarget } from '../exit-target.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);
const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };
const setIcon = (svg, name) => svg.querySelector('use').setAttribute('href', `#i-${name}`);

const ROLE_LABEL = { resident: 'Resident', staff: 'Staff', client: 'Client', admin: 'Admin', bot: 'Assistant' };
const TONE = { open: 'info', in_progress: 'success', waiting_on_resident: 'warning', pending: 'warning', resolved: 'neutral', closed: 'neutral' };
const TONE_SUPPORT_RESOLVED = 'success';

const EMPTY = {
  resident: ['No tickets yet', 'When a chat reaches the property team it becomes a ticket. Closed ones stay here so you can read them again.'],
  staff: ['No tickets yet', 'Resident chats that reach the team and your Support requests appear here, and stay after they close.'],
  client: ['No tickets yet', 'Your requests to Support appear here, and stay after they are resolved.'],
  admin: ['No tickets yet', 'Support requests from Staff and Clients appear here, and stay after they are resolved.'],
};

const portal = document.body.dataset.portal;
const q = new URLSearchParams(location.search);
const me = pickPersona(portal, q.get('as'));
const info = PORTALS[portal];

const store = createStore({ transport: createTransport() });

const ui = { tab: 'open', query: '', id: null, pane: 'list', sigList: '', sigDetail: '', lastId: null, drafts: {}, stick: false };
// Staff and Clients open tickets with Support (the store enforces it too); Residents use the assistant, Admin answers.
const canCreate = ['staff', 'client'].includes(me.role);
const isMobile = () => matchMedia('(max-width: 1023px)').matches;

/* ------------------------------------------------------------------ header */

$('#portal-label').textContent = `· ${info.label}`;
$('#me-avatar').dataset.role = me.role;
$('#me-avatar').textContent = initials(me.name);
$('#me-name').textContent = me.name;
$('#me-role').textContent = me.title;

function toast(text) {
  const el = tpl('t-toast');
  $('[data-text]', el).textContent = text;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function badge(text, tone = 'neutral', icon) {
  const el = tpl('t-badge');
  el.dataset.tone = tone;
  if (icon) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#i-${icon}`);
    svg.appendChild(use);
    el.appendChild(svg);
  }
  el.appendChild(document.createTextNode(text));
  return el;
}

function button(label, { icon, onClick, href } = {}) {
  const el = href ? Object.assign(document.createElement('a'), { href }) : tpl('t-btn');
  if (href) { el.className = tpl('t-btn').className; el.innerHTML = tpl('t-btn').innerHTML; }
  $('[data-label]', el).textContent = label;
  if (icon) { const svg = $('[data-icon]', el); svg.removeAttribute('hidden'); setIcon(svg, icon); }
  if (onClick) el.addEventListener('click', onClick);
  return el;
}

const stageBadge = (t) => badge(t.stageLabel, (t.kind === 'support' || t.kind === 'direct') && t.stage === 'resolved' ? TONE_SUPPORT_RESOLVED : TONE[t.stage] || 'neutral');

/* -------------------------------------------------------------- navigation */

// Two buttons: Exit (a link, see exit-target.js) always leaves the Ticket box; Back only steps inside it (a ticket to the list) and shows only then.
const backLabel = () => 'Tickets';
const threadOverList = () => isMobile() && ui.pane === 'detail';
const stepsBack = () => ((history.state && history.state.depth) || 0) > 0 || threadOverList();
let leaving = false;

function leave() {
  if (leaving) return;
  const depth = (history.state && history.state.depth) || 0;
  if (depth > 0) { leaving = true; setTimeout(() => { leaving = false; }, 500); return history.back(); }
  if (threadOverList()) return go({ pane: 'list' });
}
$('#btn-back').addEventListener('click', leave);
$('#btn-exit').href = exitTarget('/tickets.html', info.home);

const routeId = () => (location.hash.match(/^#\/t\/(\w+)/) || [])[1] || null;

function go({ pane, id }, { push = false } = {}) {
  ui.pane = pane;
  if (id !== undefined) ui.id = id;
  const depth = (history.state && history.state.depth) || 0;
  const url = ui.id && pane === 'detail' ? `#/t/${ui.id}` : `${location.pathname}${location.search}`;
  const state = { depth: push ? depth + 1 : depth, pane, id: ui.id };
  if (push) history.pushState(state, '', url); else history.replaceState(state, '', url);
  render(true);
}

window.addEventListener('popstate', (e) => {
  leaving = false;
  if (e.state && e.state.pane) { ui.pane = e.state.pane; ui.id = e.state.id || null; }
  else { ui.id = routeId(); ui.pane = ui.id ? 'detail' : 'list'; }
  render(true);
});

function open(id) {
  go({ pane: 'detail', id }, { push: isMobile() && ui.pane !== 'detail' });
  if (isMobile()) setTimeout(() => $('#d-subject').focus(), 0);
}

/* -------------------------------------------------------------------- list */

function rowsNow() {
  const all = store.ticketBox(me.id, ui.query);
  const counts = { open: all.filter((t) => t.isOpen).length, closed: all.filter((t) => !t.isOpen).length, all: all.length };
  let rows = ui.tab === 'all' ? all : all.filter((t) => (ui.tab === 'open') === t.isOpen);
  if (ui.tab === 'closed') rows = [...rows].sort((a, b) => (b.closedAt || b.updatedAt) - (a.closedAt || a.updatedAt));
  // Support works the open tickets by urgency: an emergency, then High priority, then the newest activity.
  if (ui.tab === 'open' && me.role === 'admin') {
    const rank = (t) => (t.emergency ? 2 : t.priority === 'high' ? 1 : 0);
    rows = [...rows].sort((a, b) => rank(b) - rank(a) || b.updatedAt - a.updatedAt);
  }
  return { rows, counts };
}

const ROLE_WORD = { client: 'Client', staff: 'Staff', resident: 'Resident' };
function whoLine(t) {
  // Admin: who asked (and what they are), where from, and who has it: "Marcus Cole · Client · Unassigned"
  if (me.role === 'admin') return [t.requester.name, ROLE_WORD[t.requester.role], t.unit && `Unit ${t.unit}`, t.assignee ? `With ${t.assignee}` : t.isOpen ? 'Unassigned' : ''].filter(Boolean).join(' · ');
  if (me.role === 'staff') return [t.requester.name, t.unit && `Unit ${t.unit}`, t.assignee].filter(Boolean).join(' · ');
  return t.assignee ? `With ${t.assignee}` : 'Waiting for the team';
}

function renderTabs(counts) {
  const box = $('#tabs');
  if (!box.children.length) {
    [['open', 'Open'], ['closed', 'Closed'], ['all', 'All']].forEach(([id, label]) => {
      const b = tpl('t-tab');
      b.dataset.tab = id;
      $('[data-label]', b).textContent = label;
      b.addEventListener('click', () => { ui.tab = id; render(true); });
      box.appendChild(b);
    });
  }
  $$('[role=tab]', box).forEach((b) => {
    b.setAttribute('aria-selected', String(b.dataset.tab === ui.tab));
    $('[data-count]', b).textContent = String(counts[b.dataset.tab]);
  });
}

function renderChips() {
  const chips = $('#chips');
  clear(chips);
  for (const f of describeFilters(parseQuery(ui.query))) {
    const c = tpl('t-fchip');
    $('[data-label]', c).textContent = `${f.label} ×`;
    c.setAttribute('aria-label', `Remove filter ${f.label}`);
    c.addEventListener('click', () => { ui.query = withoutFilter(ui.query, f.key); $('#search').value = ui.query; render(true); });
    chips.appendChild(c);
  }
}

function emptyState(box, [title, text], actions = []) {
  const e = tpl('t-empty');
  $('[data-title]', e).textContent = title;
  $('[data-text]', e).textContent = text;
  actions.forEach((a) => $('[data-actions]', e).appendChild(a));
  box.appendChild(e);
}

function renderList(force) {
  const { rows, counts } = rowsNow();
  const sig = JSON.stringify([ui.tab, ui.query, ui.id, counts, rows.map((t) => [t.id, t.updatedAt, t.stage, t.assignee])]);
  if (!force && sig === ui.sigList) return;
  ui.sigList = sig;
  renderTabs(counts);
  renderChips();
  const list = $('#list');
  const hadFocus = list.contains(document.activeElement) ? document.activeElement.closest('[data-row]')?.dataset.id : null;
  clear(list);
  const empty = $('#list-empty');
  clear(empty);
  empty.hidden = rows.length > 0;
  list.hidden = rows.length === 0;
  if (!rows.length) {
    if (ui.query.trim()) emptyState(empty, ['No matching tickets', 'Check the spelling, remove a filter, or look in another tab.'], [(() => { const b = button('Clear search', { onClick: () => { ui.query = ''; $('#search').value = ''; render(true); } }); return b; })()]);
    else if (counts.all === 0) emptyState(empty, EMPTY[portal], canCreate ? [button('Create ticket', { icon: 'plus', onClick: openNewTicket })] : []);
    else emptyState(empty, ui.tab === 'open' ? ['Nothing open', 'Every ticket is closed. They are kept under Closed.'] : ['Nothing closed yet', 'Tickets move here when they are closed or resolved.']);
  }
  for (const t of rows) {
    const li = tpl('t-row');
    const b = $('[data-row]', li);
    b.dataset.id = t.id;
    if (t.id === ui.id) b.setAttribute('aria-current', 'true');
    $('[data-no]', li).textContent = t.no;
    const bx = $('[data-badges]', li);
    bx.appendChild(stageBadge(t));
    if (t.emergency) bx.appendChild(badge('Emergency', 'danger', 'alert'));
    else if (t.priority === 'high' && t.isOpen) bx.appendChild(badge('High priority', 'danger')); // seen from the list, not only inside the ticket
    const tm = $('[data-time]', li);
    const when = t.isOpen ? t.updatedAt : t.closedAt || t.updatedAt;
    tm.textContent = listTime(when, Date.now());
    tm.dateTime = new Date(when).toISOString();
    tm.title = `${t.isOpen ? 'Last activity' : 'Closed'} ${formatFull(when)}`;
    $('[data-subject]', li).textContent = t.subject;
    $('[data-who]', li).textContent = whoLine(t);
    b.addEventListener('click', () => open(t.id));
    list.appendChild(li);
  }
  if (hadFocus) $(`[data-row][data-id="${hadFocus}"]`, list)?.focus();
}

$('#list').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const rows = $$('[data-row]', $('#list'));
  const i = rows.indexOf(document.activeElement);
  if (i < 0) return;
  e.preventDefault();
  rows[Math.max(0, Math.min(rows.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus();
});
$('#search').addEventListener('input', (e) => { ui.query = e.target.value; render(true); });
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (isMobile() && ui.pane === 'detail') go({ pane: 'list' }, { push: true }); $('#search').focus(); $('#search').select(); }
  else if (e.key === 'Escape' && isMobile() && ui.pane === 'detail' && !$('#detail').contains(document.activeElement)) leave();
});

/* ------------------------------------------------------------------ detail */

function metaRow(k, v, tone) {
  const r = tpl('t-meta');
  $('[data-k]', r).textContent = k;
  const dd = $('[data-v]', r);
  dd.textContent = v;
  if (tone) dd.dataset.tone = tone;
  $('#d-meta').appendChild(r);
}

function avatar(author) {
  const a = tpl('t-avatar');
  a.dataset.role = author.role;
  a.textContent = author.role === 'bot' ? 'AI' : initials(author.name);
  return a;
}

function entryText(e) {
  return e.deleted ? 'This message was removed.' : e.text;
}

/** Plain-text copy of the record, for the Export button. */
function exportText(t, entries) {
  const iso = (ts) => new Date(ts).toISOString();
  const lines = [
    `Ticket ${t.no}: ${t.subject}`,
    `Status: ${t.stageLabel}`,
    `Requester: ${t.requester.name} (${t.requester.title})`,
    ...(t.unit ? [`Unit: ${t.unit}${t.building ? `, ${t.building}` : ''}`] : []),
    `Assigned to: ${t.assignee || 'Unassigned'}`,
    `Opened: ${iso(t.openedAt)}`,
    `Closed: ${t.closedAt ? iso(t.closedAt) : 'still open'}`,
    t.csat ? `Rating: ${t.csat === 'up' ? 'Helpful' : 'Not helpful'}` : 'Rating: not rated',
    `Exported by ${me.name} (${me.id}) on ${iso(Date.now())}`,
    '',
    '--- Conversation ---',
  ];
  for (const e of entries) {
    if (e.audit) lines.push(`[${e.audit.at}] AUDIT ${e.audit.field}: ${e.audit.from} -> ${e.audit.to} by ${e.audit.actorName}${me.role === 'staff' || me.role === 'admin' ? ` (${e.audit.actorId})` : ''}`);
    else if (!e.author) lines.push(`[${iso(e.at)}] System: ${e.text}`);
    else {
      lines.push(`[${iso(e.at)}] ${e.author.name} (${ROLE_LABEL[e.author.role]})${e.emergency ? ' [EMERGENCY]' : ''}: ${entryText(e)}`);
      e.attachments.forEach((a) => lines.push(`    attachment: ${a.name} (${formatBytes(a.size)})`));
    }
  }
  return `${lines.join('\n')}\n`;
}

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderDetail(force) {
  const none = $('#detail-none');
  const detail = $('#detail');
  const rec = ui.id ? store.ticketRecord(me.id, ui.id) : null;
  if (!rec || !rec.ok) {
    none.hidden = false;
    detail.hidden = true;
    ui.sigDetail = '';
    if (ui.id) { ui.id = null; if (isMobile()) ui.pane = 'list'; render(true); }
    return;
  }
  const t = rec.ticket;
  none.hidden = true;
  detail.hidden = false;
  const sig = JSON.stringify([t, rec.entries.map((e) => [e.id, e.text, e.deleted, e.editedAt])]);
  if (!force && sig === ui.sigDetail) return;
  const sameTicket = ui.lastId === ui.id;
  ui.sigDetail = sig;
  ui.lastId = ui.id;

  $('#d-no').textContent = t.no;
  const bx = $('#d-badges');
  clear(bx);
  bx.appendChild(stageBadge(t));
  if (t.emergency) bx.appendChild(badge('Emergency', 'danger', 'alert'));
  $('#d-subject').textContent = t.subject;

  const meta = $('#d-meta');
  clear(meta);
  metaRow('Requester', `${t.requester.name}${t.requester.title ? `, ${t.requester.title}` : ''}`);
  if (t.kind === 'resident') metaRow('Unit', [t.unit, t.building].filter(Boolean).join(', ') || 'Not set');
  metaRow('Assigned to', t.assignee || 'Unassigned', t.assignee ? '' : 'warning');
  if (t.category) metaRow('Category', t.category);
  metaRow('Opened', formatFull(t.openedAt));
  metaRow(t.isOpen ? 'Status' : 'Closed', t.isOpen ? 'Still open' : formatFull(t.closedAt || t.updatedAt));
  if (!t.isOpen && t.closedAt) metaRow('Time to resolve', duration(t.closedAt - t.openedAt));
  if (t.kind === 'resident') metaRow('Rating', t.csat === 'up' ? 'Helpful' : t.csat === 'down' ? 'Not helpful' : t.isOpen ? 'Not yet' : 'Not rated', t.csat === 'up' ? 'success' : t.csat === 'down' ? 'danger' : '');
  metaRow('Priority', { emergency: 'Emergency', high: 'High', low: 'Low', normal: 'Normal' }[t.priority] || 'Normal', t.priority === 'emergency' || t.priority === 'high' ? 'danger' : '');
  metaRow('Messages', String(t.messages));

  const actions = $('#d-actions');
  clear(actions);
  actions.appendChild(button('Export', { icon: 'download', onClick: () => { download(`${t.no}.txt`, exportText(t, rec.entries)); toast(`Saved ${t.no}.txt`); } }));
  actions.appendChild(button('Copy link', { icon: 'copy', onClick: () => {
    // The address of the page with the portal frame around it, not of the bare content page it is drawn from.
    const url = `${location.origin}${location.pathname.replace(/-content\.html$/, '.html')}?as=${me.id}#/t/${t.id}`;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Link copied.'), () => toast('Could not copy the link.'));
  } }));
  // Support can always go to the conversation, also after it is closed (to reopen it or to see it with the Reopen button).
  if ((t.isOpen || me.role === 'admin') && t.canOpenLive) {
    const om = button('Open in Messages', { icon: 'message', href: `/${portal}/messages.html?as=${me.id}#/c/${t.id}` });
    om.target = '_top'; // inside the portal frame the whole window goes to Messages, not only the frame
    actions.appendChild(om);
  }

  $('#d-count').textContent = `${t.messages} ${t.messages === 1 ? 'message' : 'messages'}`;
  const record = $('#record');
  const prevTop = record.scrollTop;
  clear(record);
  for (const grp of groupByDay(rec.entries, Date.now())) {
    const d = tpl('t-day');
    const tm = $('[data-day]', d);
    tm.textContent = grp.label;
    tm.dateTime = new Date(grp.items[0].at).toISOString().slice(0, 10);
    record.appendChild(d);
    for (const e of grp.items) {
      if (e.audit) {
        const a = tpl('t-audit');
        $('[data-change]', a).textContent = `${e.audit.field}: ${e.audit.from} → ${e.audit.to}`;
        // The internal id and the raw ISO time are for Staff and Admin (the audit trail); a Resident or a Client reads a name and a time, as in Messages.
        const full = me.role === 'staff' || me.role === 'admin';
        $('[data-actor]', a).textContent = e.audit.actorId === 'system' ? 'System' : full ? `${e.audit.actorName} (${e.audit.actorId})` : e.audit.actorName;
        $('[data-time]', a).textContent = full ? e.audit.at : formatFull(new Date(e.audit.at).getTime());
        $('[data-time]', a).dateTime = e.audit.at;
        record.appendChild(a);
      } else if (!e.author) {
        const n = tpl('t-note');
        $('[data-text]', n).textContent = e.text;
        record.appendChild(n);
      } else {
        const el = tpl('t-entry');
        el.dataset.emergency = String(e.emergency);
        $('[data-avatar]', el).replaceWith(avatar(e.author));
        $('[data-name]', el).textContent = e.author.name;
        $('[data-rolelabel]', el).textContent = ROLE_LABEL[e.author.role];
        const time = $('[data-time]', el);
        time.textContent = formatTime(e.at);
        time.dateTime = new Date(e.at).toISOString();
        time.title = formatFull(e.at);
        const flags = $('[data-flags]', el);
        if (e.emergency) flags.appendChild(badge('Emergency', 'danger', 'alert'));
        if (e.forwarded) flags.appendChild(document.createTextNode('Forwarded'));
        if (e.editedAt) flags.appendChild(document.createTextNode('Edited'));
        const text = $('[data-text]', el);
        text.textContent = entryText(e);
        if (e.deleted) text.className += ' italic';
        if (!entryText(e)) text.hidden = true;
        if (e.attachments.length) {
          const ul = $('[data-files]', el);
          ul.hidden = false;
          for (const f of e.attachments) {
            const li = tpl('t-file');
            const a = $('[data-link]', li);
            a.href = f.data;
            a.download = f.name;
            $('[data-name]', li).textContent = f.name;
            $('[data-size]', li).textContent = formatBytes(f.size);
            a.setAttribute('aria-label', `Download ${f.name}`);
            ul.appendChild(li);
          }
        }
        record.appendChild(el);
      }
    }
  }
  record.scrollTop = ui.stick ? record.scrollHeight : sameTicket ? prevTop : 0;
  ui.stick = false;
  renderReply(t, sameTicket);
}

/* ------------------------------------------------------------------- reply */

// A support ticket can be answered here by the person who opened it and by Admin; a reply to a resolved ticket opens it again.
function renderReply(t, sameTicket) {
  const form = $('#reply-form');
  const can = t.kind === 'support' && t.canOpenLive;
  form.hidden = !can;
  $('#d-mode').textContent = !can ? 'Read only' : t.isOpen ? 'You can reply' : 'Resolved: a reply opens it again';
  if (!can) return;
  const ta = $('#reply-text');
  if (!sameTicket) ta.value = ui.drafts[t.id] || '';
  $('#reply-hint').textContent = t.isOpen ? 'Enter sends. Shift+Enter adds a line.' : 'Replying opens this ticket again.';
  $('#reply-error').hidden = true;
}

$('#reply-text').addEventListener('input', (e) => { if (ui.id) ui.drafts[ui.id] = e.target.value; });
$('#reply-text').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#reply-form').requestSubmit(); }
});
$('#reply-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const ta = $('#reply-text');
  const err = $('#reply-error');
  const text = ta.value.trim();
  if (!text || !ui.id) { err.textContent = 'Write a reply first.'; err.hidden = false; ta.focus(); return; }
  const r = store.send(ui.id, me.id, text);
  if (!r.ok) {
    err.textContent = r.reason === 'too_long' ? `Keep a reply under ${r.max} characters.` : 'The reply could not be sent. Try again.';
    err.hidden = false;
    return;
  }
  err.hidden = true;
  ta.value = '';
  delete ui.drafts[ui.id];
  ui.stick = true;
  render(true);
  ta.focus();
});

/* ------------------------------------------------------------ create ticket */

const dlgNew = $('#dlg-new-ticket');
function openNewTicket() {
  if (!canCreate) return;
  const cat = $('#nt-category');
  if (!cat.options.length) TICKET_CATEGORIES.forEach((c) => cat.add(new Option(c, c)));
  $('#nt-subject').value = '';
  $('#nt-text').value = '';
  cat.value = 'Other';
  $('#nt-priority').value = 'normal';
  $('#nt-error').hidden = true;
  dlgNew.showModal();
  $('#nt-subject').focus();
}
$('#btn-new').hidden = !canCreate;
$('#btn-new').addEventListener('click', openNewTicket);
$$('[data-close]', dlgNew).forEach((b) => b.addEventListener('click', () => dlgNew.close()));
$('#form-new-ticket').addEventListener('submit', (e) => {
  e.preventDefault();
  const err = $('#nt-error');
  const fail = (msg, field) => { err.textContent = msg; err.hidden = false; $(field).focus(); };
  const subject = $('#nt-subject').value.trim();
  const text = $('#nt-text').value.trim();
  if (!subject) return fail('Enter a subject so Support knows what this is about.', '#nt-subject');
  if (!text) return fail('Describe what happened.', '#nt-text');
  const r = store.startSupport(me.id, { subject, text, priority: $('#nt-priority').value, category: $('#nt-category').value });
  if (!r.ok) {
    if (r.reason === 'subject_too_long') return fail(`Keep the subject under ${r.max} characters.`, '#nt-subject');
    if (r.reason === 'too_long') return fail(`Keep the description under ${r.max} characters.`, '#nt-text');
    return fail('The ticket could not be created. Try again.', '#nt-subject');
  }
  dlgNew.close();
  // show it: the Open tab, no search, the new ticket selected, with its own number in the confirmation
  ui.tab = 'open';
  ui.query = '';
  $('#search').value = '';
  open(r.convId);
  const no = store.ticketRecord(me.id, r.convId).ticket.no;
  toast(`Created ${no}. Support will reply in this ticket.`);
  setTimeout(() => $('#reply-text').focus(), 0);
});

/* ------------------------------------------------------------------ render */

function render(force) {
  const root = $('#app');
  root.dataset.pane = ui.pane;
  $('#back-label').textContent = backLabel();
  $('#btn-back').hidden = !stepsBack();
  renderList(force);
  renderDetail(force);
}

store.subscribe((source) => { if (source !== 'live') render(false); });
setInterval(() => render(false), 60000);

/* -------------------------------------------------------------------- boot */

ui.id = routeId();
if (ui.id && !store.ticketRecord(me.id, ui.id).ok) ui.id = null;
ui.pane = ui.id ? 'detail' : 'list';
history.replaceState({ depth: (history.state && history.state.depth) || 0, pane: ui.pane, id: ui.id }, '', ui.id ? `#/t/${ui.id}` : location.pathname + location.search);
render(true);
if (q.has('new') && canCreate) setTimeout(openNewTicket, 0); // "Submit a ticket" on the Support page lands here with the form open
if (!ui.id && !isMobile()) {
  const first = rowsNow().rows[0];
  if (first) { ui.id = first.id; ui.pane = 'list'; render(true); }
}
