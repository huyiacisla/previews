// DOM controller for the Messages pages. All markup and Tailwind classes come from
// partials/messages-app.html templates; this file only clones them, fills text and toggles data-* / hidden.

import { createStore, notifies } from './store.js';
import { createTransport } from './transport.js';
import { PERSONAS, PORTALS, pickPersona, initials } from './personas.js';
import { formatTime, formatFull, groupByDay, listTime, duration, formatBytes } from './format.js';
import { EMOJI_CATEGORIES, QUICK_REACTIONS, searchEmoji } from './emoji.js';

/* ----------------------------------------------------------------- helpers */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);
const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };
const setIcon = (svg, name) => svg.querySelector('use').setAttribute('href', `#i-${name}`);

const REASONS = {
  empty: 'Write a message first.',
  too_long: 'That message is too long. Please shorten it.',
  not_found: 'This conversation is no longer available.',
  closed: 'This conversation is closed.',
  not_member: 'You do not have access to this conversation.',
  not_allowed: 'Your role cannot do that.',
  not_claimed: 'Take this conversation first.',
  one_way: 'This is a one-way message. To reply, contact the property team.',
  awaiting_reply: 'You can write again once they reply.',
  rate_limited: 'This resident already has recent messages from the team. Try again later.',
  use_assistant: 'Residents start with the assistant.',
  already_taken: 'Someone else already took this conversation.',
  not_queued: 'This conversation is no longer waiting in the queue.',
  read_only: 'Announcements are one-way.',
  storage: 'Could not save. Browser storage may be full or blocked.',
  subject_required: 'Add a subject.',
  title_required: 'Add a title.',
  audience_required: 'Choose who should receive it.',
  invalid_emoji: 'That is not an emoji.',
  too_late: 'You can only edit or remove a message for a few minutes after sending it.',
  too_many_attachments: 'Too many attachments for one message.',
  bad_attachment: 'That file could not be attached.',
  attachment_too_large: 'That file is too large to attach.',
  invalid_reply: 'That message can no longer be replied to.',
  name_required: 'Give the group a name.',
  group_too_small: 'A group needs at least three people, including you.',
  group_too_large: 'A group can have up to 12 people.',
};
const reasonText = (r) => REASONS[r] || 'Something went wrong. Please try again.';

const TABS = {
  resident: [['all', 'All'], ['announcements', 'Announcements']],
  staff: [['queue', 'Queue'], ['mine', 'Mine'], ['clients', 'Clients'], ['groups', 'Groups'], ['support', 'Support'], ['all', 'All']],
  client: [['all', 'All'], ['staff', 'Staff'], ['groups', 'Groups'], ['support', 'Support'], ['announcements', 'Announcements']],
  admin: [['queue', 'Queue'], ['mine', 'Mine'], ['direct', 'Direct'], ['resolved', 'Resolved'], ['announcements', 'Sent']],
};
const DEFAULT_TAB = { resident: 'all', staff: 'queue', client: 'all', admin: 'queue' };

const CANNED = {
  staff: ['Thanks for reaching out. I am looking into this now.', 'Could you send your plate number and space number?', 'I have updated this and it should show shortly.', 'Thanks for your patience. Is there anything else I can help with?'],
  admin: ['Thanks for flagging this. I am taking a look now.', 'Could you share the property name and a screenshot if possible?', 'I made a change on our side. Please try again and let me know.', 'Marking this resolved. Reply here any time to reopen it.'],
};

const ROLE_LABEL = { resident: 'Resident', staff: 'Staff', client: 'Client', admin: 'Admin', bot: 'Assistant' };

/* ------------------------------------------------------------------- mount */

export function mount({ portal }) {
  if (!PORTALS[portal]) throw new Error(`Unknown portal: ${portal}`);
  const q = new URLSearchParams(location.search);
  const me = pickPersona(portal, q.get('as'));
  const portalInfo = PORTALS[portal];
  const root = $('#app');

  let transport;
  let store;
  try {
    transport = createTransport();
    store = createStore({ transport });
  } catch (error) {
    return showError(error);
  }

  const ui = {
    tab: DEFAULT_TAB[portal],
    query: '',
    convId: null,
    pane: 'list',
    pending: [], // optimistic outgoing messages
    gate: null, // { convId, since, until } while the assistant "types"
    anchor: null, // { convId, msgId } where "New messages" divider goes
    sigList: '',
    sigThread: '',
    sigLog: '',
    stick: true,
    newBelow: 0,
    confirm: null, // { key, timer } for two-step buttons
    cannedOpen: false,
    seen: new Set(),
    revealed: new Set(), // messages whose time and actions are showing
    quickFor: null, // message whose reaction bar is open
    flash: null,
    reply: null, // { id, who, text } being replied to
    edit: null, // { id, text, prev } while fixing one of your own messages
    attach: [], // files waiting to be sent
    emojiOpen: false,
    lastKind: null,
    lastStatus: null,
    lastConv: null,
  };
  const isMobile = () => matchMedia('(max-width: 1023px)').matches;
  const offline = () => sessionStorage.getItem('eso-msg-offline') === '1' || navigator.onLine === false;
  const draftKey = (id) => `eso-msg-draft:${me.id}:${id}`;

  /* ---------------------------------------------------------- small widgets */

  function avatar({ name, role, size = 'md' }) {
    const el = tpl('t-avatar');
    el.dataset.role = role;
    el.dataset.size = size;
    if (role === 'bot' || role === 'group') {
      $('[data-initials]', el).hidden = true;
      if (role === 'group') setIcon($('[data-bot]', el), 'users');
      $('[data-bot]', el).removeAttribute('hidden'); // SVG elements have no .hidden property
    } else {
      $('[data-initials]', el).textContent = initials(name);
    }
    return el;
  }

  function svgIcon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#i-${name}`);
    svg.appendChild(use);
    return svg;
  }

  function badge(text, tone = 'neutral', icon) {
    const el = tpl('t-badge');
    el.dataset.tone = tone;
    if (icon) el.appendChild(svgIcon(icon));
    el.appendChild(document.createTextNode(text));
    return el;
  }

  function button(label, { variant = 'outline', icon, onClick, disabled, ariaLabel } = {}) {
    const el = tpl('t-btn');
    el.dataset.variant = variant;
    $('[data-label]', el).textContent = label;
    if (!label) { $('[data-label]', el).hidden = true; el.dataset.iconOnly = 'true'; }
    if (icon) {
      const svg = $('[data-icon]', el);
      svg.removeAttribute('hidden'); // SVG elements have no .hidden property
      setIcon(svg, icon);
    }
    if (disabled) el.disabled = true;
    if (ariaLabel) el.setAttribute('aria-label', ariaLabel);
    if (onClick) el.addEventListener('click', onClick);
    return el;
  }

  function toast(text, { action, onAction, ms = 4500 } = {}) {
    const el = tpl('t-toast');
    $('[data-text]', el).textContent = text;
    if (action) {
      const b = $('[data-action]', el);
      b.hidden = false;
      b.textContent = action;
      b.addEventListener('click', () => { onAction && onAction(); el.remove(); });
    }
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  const announce = (text) => {
    const a = $('#announce');
    a.textContent = '';
    setTimeout(() => { a.textContent = text; }, 30);
  };

  function banner(tone, text, actions = []) {
    const el = tpl('t-banner');
    el.dataset.tone = tone;
    setIcon($('svg', el), tone === 'warning' ? 'alert' : tone === 'success' ? 'check' : 'info');
    $('[data-text]', el).textContent = text;
    const box = $('[data-actions]', el);
    actions.forEach((a) => box.appendChild(a));
    return el;
  }

  function empty({ icon = 'message', title, text, actions = [] }) {
    const el = tpl('t-empty');
    setIcon($('[data-icon]', el), icon);
    $('[data-title]', el).textContent = title;
    $('[data-text]', el).textContent = text;
    const box = $('[data-actions]', el);
    actions.forEach((a) => box.appendChild(a));
    return el;
  }

  /** A button that asks to be pressed twice, for actions that end a conversation. */
  function confirmButton(key, label, confirmLabel, run, opts = {}) {
    const b = button(ui.confirm && ui.confirm.key === key ? confirmLabel : label, { ...opts, variant: ui.confirm && ui.confirm.key === key ? 'soft' : opts.variant });
    b.addEventListener('click', () => {
      if (ui.confirm && ui.confirm.key === key) {
        clearTimeout(ui.confirm.timer);
        ui.confirm = null;
        run();
        return;
      }
      if (ui.confirm) clearTimeout(ui.confirm.timer);
      ui.confirm = { key, timer: setTimeout(() => { ui.confirm = null; renderThread(true); }, 4000) };
      renderThread(true);
      const again = $$('#thread-actions button').find((x) => x.textContent === confirmLabel);
      if (again) again.focus();
    });
    return b;
  }

  /* --------------------------------------------------------------- chrome */

  $('#portal-label').textContent = `· ${portalInfo.label}`;
  $('#me-avatar').textContent = initials(me.name);
  $('#me-avatar').dataset.role = me.role;
  $('#me-name').textContent = me.name;
  $('#me-role').textContent = me.title;
  document.title = document.title.replace(/^\(\d+\)\s*/, '');
  const baseTitle = document.title;

  const canCompose = me.role !== 'resident';
  $('#btn-new').hidden = !canCompose;
  $('#btn-announce').hidden = me.role !== 'admin';
  $('#btn-dnd').hidden = me.role !== 'resident';

  const backLabel = () => {
    const depth = (history.state && history.state.depth) || 0;
    if (depth > 0) return ui.pane === 'thread' ? 'Messages' : 'Chat';
    return me.role === 'resident' ? 'Home' : 'Dashboard';
  };
  function leave() {
    const depth = (history.state && history.state.depth) || 0;
    if (depth > 0) return history.back();
    let sameSite = false;
    try {
      const ref = new URL(document.referrer);
      sameSite = ref.origin === location.origin && !ref.pathname.endsWith('/messages.html');
    } catch { /* no referrer */ }
    if (sameSite && history.length > 1) history.back();
    else location.assign(portalInfo.home);
  }
  $('#btn-back').addEventListener('click', leave);

  /* ----------------------------------------------------------- navigation */

  const routeConv = () => (location.hash.match(/^#\/c\/(\w+)/) || [])[1] || null;

  function go({ pane, conv }, { push = false } = {}) {
    ui.pane = pane;
    if (conv !== undefined) ui.convId = conv;
    const depth = (history.state && history.state.depth) || 0;
    const state = { depth: push ? depth + 1 : depth, pane, conv: ui.convId };
    const url = ui.convId && pane === 'thread' ? `#/c/${ui.convId}` : `${location.pathname}${location.search}`;
    if (push) history.pushState(state, '', url);
    else history.replaceState(state, '', url);
    renderAll(true);
  }

  window.addEventListener('popstate', (e) => {
    const s = e.state;
    if (s && s.pane) {
      ui.pane = s.pane;
      ui.convId = s.conv || null;
    } else {
      const c = routeConv();
      ui.convId = c;
      ui.pane = c ? 'thread' : 'list';
    }
    openSideEffects();
    renderAll(true);
  });

  function openConv(id, { fromList = true } = {}) {
    const t = store.get(id, me.id);
    if (!t.ok) return toast(reasonText(t.reason));
    ui.stick = true;
    ui.newBelow = 0;
    ui.cannedOpen = false;
    ui.confirm = null;
    const unread = t.messages.find((m) => m.from !== me.id && !m.readBy[me.id] && notifies(m, me.role));
    ui.anchor = unread ? { convId: id, msgId: unread.id } : null;
    ui.sigLog = '';
    go({ pane: 'thread', conv: id }, { push: fromList && isMobile() });
    openSideEffects();
    if (!isMobile()) setTimeout(() => { const i = $('#msg-input'); if (i && !i.disabled && !$('#thread').hidden) i.focus(); }, 0);
    else setTimeout(() => $('#thread-title').focus(), 0);
  }

  /** Runs whenever a conversation becomes the visible one. */
  function openSideEffects() {
    if (!ui.convId) return;
    if (ui.lastConv !== ui.convId) {
      ui.lastConv = ui.convId;
      const input = $('#msg-input');
      input.value = localStorage.getItem(draftKey(ui.convId)) || '';
      autosize();
      ui.reply = null;
      ui.edit = null;
      ui.attach = [];
      ui.emojiOpen = false;
      ui.quickFor = null;
      renderComposerExtras();
    }
    if (document.visibilityState === 'visible') store.markRead(ui.convId, me.id);
  }

  /* ---------------------------------------------------------------- tabs */

  function renderTabs(rows) {
    const box = $('#tabs');
    if (!box.children.length) {
      TABS[portal].forEach(([id, label]) => {
        const t = tpl('t-tab');
        t.dataset.tab = id;
        $('[data-label]', t).textContent = label;
        t.addEventListener('click', () => { ui.tab = id; renderList(true); });
        t.addEventListener('keydown', (e) => {
          const tabs = $$('[role=tab]', box);
          const i = tabs.indexOf(t);
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
            n.focus();
            n.click();
          }
        });
        box.appendChild(t);
      });
    }
    for (const t of $$('[role=tab]', box)) {
      const id = t.dataset.tab;
      const selected = id === ui.tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      const inTab = rows.filter((r) => id === 'all' || r.tags.includes(id));
      const n = id === 'queue' ? inTab.length : inTab.reduce((a, r) => a + r.unread, 0);
      const c = $('[data-count]', t);
      c.hidden = n === 0 || id === 'all';
      c.textContent = String(n);
      t.setAttribute('aria-label', n && id !== 'all' ? `${$('[data-label]', t).textContent}, ${n} ${id === 'queue' ? 'waiting' : 'unread'}` : $('[data-label]', t).textContent);
    }
  }

  /* ----------------------------------------------------------------- list */

  function rowChips(r) {
    const chips = [];
    if (r.kind === 'resident_support') {
      if (r.status === 'queued') chips.push(badge(me.role === 'resident' ? 'Waiting' : `Waiting ${duration(Date.now() - r.waitingSince)}`, 'warning', 'clock'));
      else if (r.status === 'active') chips.push(badge('Active', 'success'));
      else if (r.status === 'bot') chips.push(badge('Assistant', 'info', 'bot'));
      else chips.push(badge('Closed'));
    } else if (r.kind === 'support') {
      if (r.priority === 'high') chips.push(badge('High', 'danger'));
      chips.push(badge({ open: 'Open', pending: 'Pending', resolved: 'Resolved' }[r.status], { open: 'info', pending: 'warning', resolved: 'success' }[r.status]));
    } else if (r.kind === 'announcement') {
      chips.push(badge('Announcement', 'neutral', 'megaphone'));
    }
    return chips;
  }

  function renderList(force) {
    const all = store.listFor(me.id);
    renderTabs(all);
    const query = ui.query.trim().toLowerCase();
    let rows = all.filter((r) => (ui.tab === 'all' || r.tags.includes(ui.tab)) && (!query || [r.title, r.subtitle, r.last && r.last.text].join(' ').toLowerCase().includes(query)));
    if (ui.tab === 'queue') rows = rows.sort((a, b) => (a.waitingSince || a.updatedAt) - (b.waitingSince || b.updatedAt));
    const minute = Math.floor(Date.now() / 60000);
    const hits = query.length >= 2 ? store.search(me.id, query) : [];
    const sig = JSON.stringify([ui.tab, query, ui.convId, minute, offline(), store.pref(me.id).dnd, store.badgeCount(me.id), rows.map((r) => [r.id, r.updatedAt, r.status, r.unread, r.priority, r.pinned, r.muted]), hits.map((h) => h.msgId)]);
    if (!force && sig === ui.sigList) return;
    ui.sigList = sig;

    renderHits(hits, query);
    const list = $('#list');
    const hadFocus = list.contains(document.activeElement) ? document.activeElement.closest('[data-row]')?.dataset.id : null;
    clear(list);
    const emptyBox = $('#list-empty');
    clear(emptyBox);
    emptyBox.hidden = rows.length > 0 || hits.length > 0;
    list.hidden = rows.length === 0;
    if (!rows.length && !hits.length) {
      if (query) {
        emptyBox.appendChild(empty({ icon: 'search', title: `No matches for “${ui.query.trim()}”`, text: 'Check the spelling or clear the search.', actions: [button('Clear search', { onClick: () => { $('#list-search').value = ''; ui.query = ''; renderList(true); } })] }));
      } else {
        const copy = {
          queue: ['Queue is clear', 'Residents who ask for a person appear here. Nothing is waiting right now.'],
          mine: ['No chats assigned to you', me.role === 'admin' ? 'Requests you pick up from the queue show up here.' : 'Take a conversation from the queue and it moves here.'],
          clients: ['No client conversations', 'Start one with New.'],
          support: ['No support requests', me.role === 'admin' ? 'Nothing from staff or clients right now.' : 'Ask Support for help with New.'],
          resolved: ['Nothing resolved yet', 'Resolved requests are kept here.'],
          announcements: ['No announcements', me.role === 'admin' ? 'Use Announce to send a one-way notice.' : 'Notices from Support will appear here.'],
          direct: ['No direct messages', 'Start one with New.'],
          staff: ['No messages with staff', 'Start one with New.'],
        }[ui.tab] || ['No conversations yet', canCompose ? 'Start one with New.' : 'Open the assistant to ask a question.'];
        emptyBox.appendChild(empty({ title: copy[0], text: copy[1], actions: me.role === 'resident' ? [button('Start a conversation', { variant: 'primary', onClick: startResidentSession })] : [] }));
      }
    }
    for (const r of rows) {
      const li = tpl('t-row');
      const b = $('[data-row]', li);
      b.dataset.id = r.id;
      b.dataset.unread = String(r.unread > 0);
      if (r.id === ui.convId) b.setAttribute('aria-current', 'true');
      $('[data-avatar]', b).replaceWith(avatar({ name: r.avatar.name, role: r.avatar.role }));
      $('[data-title]', b).textContent = r.title;
      $('[data-subtitle]', b).textContent = r.subtitle || '';
      const t = $('[data-time]', b);
      t.textContent = listTime(r.last ? r.last.at : r.updatedAt, Date.now());
      t.dateTime = new Date(r.last ? r.last.at : r.updatedAt).toISOString();
      t.title = formatFull(r.last ? r.last.at : r.updatedAt);
      const who = r.last && r.last.from === me.id ? 'You: ' : '';
      $('[data-preview]', b).textContent = r.last ? `${who}${r.last.text}` : 'No messages yet';
      if (r.pinned) $('[data-pin]', b).hidden = false;
      if (r.muted) $('[data-mute]', b).hidden = false;
      rowChips(r).forEach((c) => $('[data-chips]', b).appendChild(c));
      const u = $('[data-unread]', b);
      if (r.unread) {
        u.hidden = false;
        u.textContent = r.unread > 99 ? '99+' : String(r.unread);
        u.setAttribute('role', 'img');
        u.setAttribute('aria-label', `${r.unread} unread`);
      }
      b.addEventListener('click', () => openConv(r.id));
      list.appendChild(li);
    }
    if (hadFocus) $(`[data-row][data-id="${hadFocus}"]`, list)?.focus();

    const dnd = $('#btn-dnd');
    if (!dnd.hidden) dnd.setAttribute('aria-pressed', String(store.pref(me.id).dnd));
    const lb = $('#list-banner');
    clear(lb);
    if (offline()) lb.appendChild(banner('warning', 'You are offline. Messages will not send until the connection is back.'));
    const unread = store.badgeCount(me.id);
    document.title = `${unread ? `(${unread}) ` : ''}${baseTitle}`;
  }

  /** Messages that contain the search words, across every conversation. Opening one scrolls to it. */
  function renderHits(hits, query) {
    const box = $('#hits');
    const ul = $('#hit-list');
    clear(ul);
    box.hidden = !hits.length;
    $('#hits-title').textContent = hits.length ? `Messages (${hits.length}${hits.length >= 30 ? '+' : ''})` : 'Messages';
    for (const h of hits) {
      const li = tpl('t-hit');
      const [i, n] = h.match;
      $('[data-title]', li).textContent = h.title;
      const tm = $('[data-time]', li);
      tm.textContent = listTime(h.at, Date.now());
      tm.dateTime = new Date(h.at).toISOString();
      $('[data-who]', li).textContent = `${h.who}:`;
      $('[data-pre]', li).textContent = h.snippet.slice(0, i);
      $('[data-m]', li).textContent = h.snippet.slice(i, i + n);
      $('[data-post]', li).textContent = h.snippet.slice(i + n);
      $('[data-hit]', li).setAttribute('aria-label', `${h.title}, ${h.who}: ${h.snippet}`);
      $('[data-hit]', li).addEventListener('click', () => jumpTo(h.convId, h.msgId));
      ul.appendChild(li);
    }
  }

  function jumpTo(convId, msgId) {
    openConv(convId);
    ui.stick = false;
    ui.revealed.add(msgId);
    setTimeout(() => {
      renderThread(true);
      ui.stick = false;
      const target = $(`[data-msgid="${msgId}"]`, $('#log'));
      if (!target) return;
      target.scrollIntoView({ block: 'center', behavior: 'auto' });
      target.dataset.flash = 'true';
      setTimeout(() => { delete target.dataset.flash; }, 1600);
    }, 120);
  }

  $('#list').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const rows = $$('[data-row]', $('#list'));
    const i = rows.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    rows[Math.max(0, Math.min(rows.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus();
  });
  $('#list-search').addEventListener('input', (e) => { ui.query = e.target.value; renderList(true); });

  /* --------------------------------------------------------------- thread */

  function threadStatusBadges(row, conv) {
    const out = [];
    if (conv.kind === 'resident_support') {
      if (conv.status === 'queued') out.push(badge('Waiting for staff', 'warning', 'clock'));
      if (conv.status === 'active') out.push(badge('Active', 'success'));
      if (conv.status === 'bot') out.push(badge('Automated assistant', 'info', 'bot'));
      if (conv.status === 'closed') out.push(badge('Closed'));
    } else if (conv.kind === 'support') {
      out.push(badge({ open: 'Open', pending: 'Pending', resolved: 'Resolved' }[conv.status], { open: 'info', pending: 'warning', resolved: 'success' }[conv.status]));
      if (conv.priority === 'high') out.push(badge('High priority', 'danger'));
    } else if (conv.kind === 'announcement') {
      out.push(badge('Announcement', 'neutral', 'megaphone'));
    } else if (conv.kind === 'group') {
      out.push(badge(`${conv.participants.length} people`, 'neutral', 'users'));
    }
    const online = onlineOthers(conv);
    if (online.length && conv.status !== 'closed') out.push(badge(conv.kind === 'group' ? `${online.length} online` : 'Online', 'success'));
    return out;
  }

  /** People other than me in this conversation who are online right now. */
  function onlineOthers(conv) {
    let ids = [];
    if (conv.participants) ids = conv.participants.filter((p) => p !== me.id);
    else if (conv.kind === 'resident_support') ids = conv.status === 'active' ? [me.id === conv.residentId ? conv.assigneeId : conv.residentId] : [];
    else if (conv.kind === 'support') ids = me.role === 'admin' ? [conv.requesterId] : conv.assigneeId ? [conv.assigneeId] : [];
    return ids.filter((id) => id && store.presenceOf(id).online);
  }

  function flagButton(t, flag) {
    const on = flag === 'pinned' ? t.row.pinned : t.row.muted;
    const label = { pinned: on ? 'Unpin conversation' : 'Pin conversation', muted: on ? 'Unmute conversation' : 'Mute conversation' }[flag];
    const b = button('', { variant: on ? 'soft' : 'ghost', icon: flag === 'pinned' ? 'pin' : 'bell-off', ariaLabel: label, onClick: () => {
      const r = store.toggleFlag(t.conv.id, me.id, flag);
      if (r.ok) toast({ pinned: r.on ? 'Pinned to the top of your list.' : 'Unpinned.', muted: r.on ? 'Muted. It will not add to your unread count.' : 'Unmuted.' }[flag]);
      else act(r);
    } });
    b.setAttribute('aria-pressed', String(on));
    b.title = label;
    return b;
  }

  function headerActions(t) {
    const box = $('#thread-actions');
    clear(box);
    const { conv, actions } = t;
    const flags = $('#thread-flags');
    clear(flags);
    flags.appendChild(flagButton(t, 'pinned'));
    flags.appendChild(flagButton(t, 'muted'));
    if (me.role === 'resident') {
      const hist = button('', { variant: 'ghost', icon: 'list', ariaLabel: 'Conversations', onClick: () => go({ pane: 'list' }, { push: true }) });
      hist.classList.add('lg:hidden');
      box.appendChild(hist);
    }
    if (conv.kind === 'group') box.appendChild(button(`${conv.participants.length} people`, { variant: 'ghost', icon: 'users', onClick: () => openMembers(conv.id) }));
    if (actions.includes('claim')) box.appendChild(button('Take conversation', { variant: 'primary', icon: 'check', onClick: () => act(store.claim(conv.id, me.id), 'You took this conversation.') }));
    if (actions.includes('request_staff')) box.appendChild(button('Talk to a person', { variant: 'soft', icon: 'users', onClick: () => requestStaff(conv.id) }));
    if (actions.includes('resolve')) box.appendChild(confirmButton(`resolve:${conv.id}`, 'Resolve', 'Confirm resolve', () => act(store.resolve(conv.id, me.id), 'Conversation resolved.'), { icon: 'check' }));
    if (actions.includes('end')) box.appendChild(confirmButton(`end:${conv.id}`, 'End chat', 'Confirm end chat', () => act(store.endChat(conv.id, me.id), 'Chat ended.'), { variant: 'ghost', icon: 'x' }));
  }

  function act(result, okText) {
    if (!result.ok) {
      // "taken by someone else" is already explained when the conversation leaves the list
      if (result.reason !== 'already_taken') toast(reasonText(result.reason));
      renderAll(true);
      return result;
    }
    if (okText) toast(okText);
    return result;
  }

  function requestStaff(convId) {
    if (offline()) return toast('You are offline. Try again when the connection is back.');
    ui.gate = { convId, since: Date.now() - 1, until: Date.now() + 700 };
    setTimeout(() => renderThread(true), 720);
    const r = store.requestStaff(convId, me.id);
    if (!r.ok) toast(reasonText(r.reason));
    else announce('Request sent to the property team.');
  }

  function startResidentSession() {
    const r = store.ensureSession(me.id);
    if (!r.ok) return toast(reasonText(r.reason));
    openConv(r.convId, { fromList: false });
  }

  function threadTools(t) {
    const tools = $('#thread-tools');
    const show = me.role === 'admin' && t.conv.kind === 'support';
    tools.hidden = !show;
    if (!show) return;
    const status = $('#sel-status');
    const prio = $('#sel-priority');
    const asg = $('#sel-assignee');
    status.value = t.conv.status;
    prio.value = t.conv.priority;
    if (!asg.options.length) {
      asg.add(new Option('Unassigned', ''));
      PERSONAS.filter((p) => p.role === 'admin').forEach((p) => asg.add(new Option(p.id === me.id ? `${p.name} (you)` : p.name, p.id)));
    }
    asg.value = t.conv.assigneeId || '';
    status.onchange = () => act(store.setSupportStatus(t.conv.id, me.id, status.value), 'Status updated.');
    prio.onchange = () => act(store.setPriority(t.conv.id, me.id, prio.value), 'Priority updated.');
    asg.onchange = () => act(store.assignSupport(t.conv.id, me.id, asg.value || null), 'Assignment updated.');
  }

  function threadBanner(t) {
    const box = $('#thread-banner');
    clear(box);
    const { conv } = t;
    if (offline()) box.appendChild(banner('warning', 'You are offline. Messages will not send until the connection is back.'));
    if (conv.kind === 'resident_support' && me.role === 'resident') {
      if (conv.status === 'bot') box.appendChild(banner('neutral', 'You are chatting with an automated assistant. The property team is only contacted if you ask for a person.'));
      if (conv.status === 'queued') box.appendChild(banner('info', `Sent to the property team ${duration(Date.now() - (conv.queuedAt || Date.now()))} ago. A team member will reply here, and you will only be notified when someone does. You can add details below.`));
    }
    if (conv.kind === 'resident_support' && me.role === 'staff' && conv.status === 'queued') box.appendChild(banner('info', 'The resident is waiting. Take the conversation to reply; they will see that you joined.'));
    if (conv.kind === 'support' && t.conv.status === 'resolved') box.appendChild(banner('success', me.role === 'admin' ? 'Resolved. A reply from the requester reopens it.' : 'Resolved. Reply here if you still need help and it will reopen.'));
  }

  function composerNote(t) {
    const note = $('#composer-note');
    const form = $('#composer');
    clear(note);
    const ok = t.canPost.ok;
    form.hidden = !ok;
    note.hidden = ok;
    if (ok) return;
    const reason = t.canPost.reason;
    let text = reasonText(reason);
    const actions = [];
    if (reason === 'closed') {
      text = me.role === 'resident' ? 'This conversation is closed.' : 'This conversation is closed. Closed conversations cannot be changed.';
      if (me.role === 'resident') actions.push(button('Start a new conversation', { variant: 'primary', icon: 'message', onClick: startResidentSession }));
    }
    if (reason === 'not_claimed') text = 'Take this conversation to reply. Until then the resident only sees that someone will answer.';
    if (reason === 'awaiting_reply') text = 'You have sent a note. You can write again once they reply, so they are not bothered.';
    if (reason === 'one_way') {
      text = 'This is a one-way message from Support. To reply, ask the property team.';
      actions.push(button('Ask the property team', { variant: 'soft', icon: 'users', onClick: startResidentSession }));
    }
    if (reason === 'read_only') text = 'Announcements are one-way. Replies are not collected here.';
    note.appendChild(banner('neutral', text, actions));
  }

  function composerState(t) {
    const input = $('#msg-input');
    const ph = (() => {
      const c = t.conv;
      if (c.kind === 'resident_support' && me.role === 'resident') return c.status === 'bot' ? 'Ask a question' : c.status === 'queued' ? 'Add details for the team' : 'Write a message';
      if (c.kind === 'support') return me.role === 'admin' ? 'Reply to the requester' : 'Reply to Support';
      return 'Write a message';
    })();
    input.placeholder = ph;
    const showCanned = t.canPost.ok && (me.role === 'staff' || me.role === 'admin');
    $('#btn-canned').hidden = !showCanned;
    $('#canned-menu').hidden = !(showCanned && ui.cannedOpen);
    $('#btn-canned').setAttribute('aria-expanded', String(showCanned && ui.cannedOpen));
    if (showCanned && !$('#canned-menu').children.length) {
      CANNED[me.role].forEach((text) => {
        const b = tpl('t-canned');
        b.textContent = text;
        b.addEventListener('click', () => { insertText(text); ui.cannedOpen = false; renderThread(true); input.focus(); });
        $('#canned-menu').appendChild(b);
      });
    }
    composerNote(t);
    updateCount();
  }

  function renderThread(force) {
    const none = $('#thread-none');
    const thread = $('#thread');
    if (!ui.convId) {
      none.hidden = false;
      thread.hidden = true;
      return;
    }
    const t = store.get(ui.convId, me.id);
    if (!t.ok) {
      ui.convId = null;
      ui.lastConv = null;
      none.hidden = false;
      thread.hidden = true;
      if (isMobile() && ui.pane === 'thread') {
        ui.pane = 'list';
        root.dataset.pane = 'list';
      }
      toast(me.role === 'staff' ? 'That conversation was taken by another team member.' : reasonText(t.reason));
      renderList(true);
      return;
    }
    none.hidden = true;
    thread.hidden = false;
    ui.lastKind = t.conv.kind;
    ui.lastStatus = t.conv.status;
    const sig = JSON.stringify([t.conv.id, t.conv.status, t.conv.assigneeId, t.conv.priority, t.actions, t.canPost, ui.confirm && ui.confirm.key, offline(), ui.cannedOpen, Math.floor(Date.now() / 60000), onlineOthers(t.conv), t.conv.participants || 0, t.row.pinned, t.row.muted]);
    if (force || sig !== ui.sigThread) {
      ui.sigThread = sig;
      const row = t.row;
      const av = $('#thread-avatar');
      av.dataset.role = row.avatar.role;
      clear(av);
      if (row.avatar.role === 'bot') {
        const icon = svgIcon('bot');
        icon.setAttribute('class', 'size-5');
        av.appendChild(icon);
      } else {
        av.textContent = initials(row.avatar.name);
      }
      $('#thread-title').textContent = row.title;
      $('#thread-sub').textContent = row.subtitle || '';
      const bx = $('#thread-badges');
      clear(bx);
      threadStatusBadges(row, t.conv).forEach((b) => bx.appendChild(b));
      headerActions(t);
      threadTools(t);
      threadBanner(t);
      composerState(t);
    }
    renderLog(t);
    renderTyping();
  }

  /* ------------------------------------------------------------------ log */

  function visibleMessages(t) {
    const g = ui.gate && ui.gate.convId === t.conv.id && Date.now() < ui.gate.until ? ui.gate : null;
    return t.messages.filter((m) => !(g && !m.mine && m.at >= g.since && (m.from === 'bot' || m.from === 'system')));
  }

  function renderLog(t) {
    const g = ui.gate && ui.gate.convId === t.conv.id && Date.now() < ui.gate.until;
    const msgs = visibleMessages(t);
    const pending = ui.pending.filter((p) => p.convId === t.conv.id && !p.done);
    const latestChoices = [...msgs].reverse().find((m) => m.choices && !m.chosen);
    const sig = JSON.stringify([msgs.map((m) => [m.id, m.delivery, m.chosen || '', m.deleted ? 1 : 0, m.reactions || 0, (m.seenBy || []).length, (m.attachments || []).length, m.editedAt || 0]), ui.quickFor, ui.flash, pending.map((p) => [p.cid, p.state]), !!g, ui.anchor && ui.anchor.msgId, t.actions.includes('rate'), t.conv.status, latestChoices && latestChoices.id]);
    if (sig === ui.sigLog) return;
    ui.sigLog = sig;

    const log = $('#log');
    const prevTop = log.scrollTop;
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    const wasStick = ui.stick || nearBottom;
    const prevCount = log.dataset.count ? Number(log.dataset.count) : 0;
    clear(log);

    if (me.role === 'staff' && t.conv.kind === 'resident_support' && t.conv.summary) {
      const s = tpl('t-summary');
      $('[data-topic]', s).textContent = t.conv.summary.topic;
      const asked = t.conv.summary.asked || [];
      $('[data-asked-row]', s).hidden = !asked.length;
      $('[data-asked]', s).textContent = asked.join(' · ');
      const details = t.conv.summary.details || [];
      $('[data-details-row]', s).hidden = !details.length;
      $('[data-details]', s).textContent = details.join('\n');
      log.appendChild(s);
    }

    const groups = groupByDay(msgs, Date.now());
    let lastOutId = null;
    for (const m of msgs) if (m.mine) lastOutId = m.id;
    const sameRun = (a, b) => a && b && a.kind !== 'system' && b.kind !== 'system' && a.from === b.from && b.at - a.at < 5 * 60000;
    for (const grp of groups) {
      const d = tpl('t-day');
      const tm = $('[data-day]', d);
      tm.textContent = grp.label;
      tm.dateTime = new Date(grp.items[0].at).toISOString().slice(0, 10);
      log.appendChild(d);
      grp.items.forEach((m, i) => {
        const prev = grp.items[i - 1];
        const next = grp.items[i + 1];
        // a quiet time marker when the conversation paused for a while (like Messenger)
        if (prev && m.at - prev.at > 30 * 60000) {
          const tt = tpl('t-time');
          $('[data-t]', tt).textContent = formatTime(m.at);
          $('[data-t]', tt).dateTime = new Date(m.at).toISOString();
          log.appendChild(tt);
        }
        if (ui.anchor && ui.anchor.convId === t.conv.id && ui.anchor.msgId === m.id) log.appendChild(tpl('t-new-divider'));
        if (m.kind === 'system') {
          const s = tpl('t-sys');
          $('[data-text]', s).textContent = m.text;
          log.appendChild(s);
          return;
        }
        const offer = !!(latestChoices && m.id === latestChoices.id && t.conv.status === 'bot' && me.role === 'resident' && !g);
        log.appendChild(bubble(m, { first: !sameRun(prev, m), last: !sameRun(m, next), isLastOut: m.id === lastOutId, offerChoices: offer, t }));
      });
    }
    for (const p of pending) log.appendChild(pendingBubble(p));
    if (g) {
      const ty = tpl('t-typing');
      $('[data-avatar]', ty).replaceWith(avatar({ name: 'Assistant', role: 'bot', size: 'sm' }));
      log.appendChild(ty);
    }
    if (t.actions.includes('rate')) {
      const r = tpl('t-rate');
      const box = $('[data-actions]', r);
      box.appendChild(button('Helpful', { icon: 'thumbs-up', onClick: () => { act(store.rate(t.conv.id, me.id, true)); toast('Thanks for the feedback.'); } }));
      box.appendChild(button('Not helpful', { icon: 'thumbs-down', onClick: () => { act(store.rate(t.conv.id, me.id, false)); toast('Thanks for the feedback.'); } }));
      log.appendChild(r);
    }

    log.dataset.count = String(msgs.length + pending.length);
    const incoming = msgs.filter((m) => !m.mine && m.kind !== 'system' && !ui.seen.has(m.id));
    const grew = msgs.length + pending.length > prevCount;
    if (wasStick) {
      const div = $('[role=separator]', log);
      if (ui.anchor && div && ui.sigThreadOpen !== t.conv.id) { div.scrollIntoView({ block: 'center' }); ui.sigThreadOpen = t.conv.id; }
      else log.scrollTop = log.scrollHeight;
      ui.newBelow = 0;
    } else {
      log.scrollTop = prevTop;
      if (grew && incoming.length) ui.newBelow += incoming.length;
    }
    for (const m of msgs) ui.seen.add(m.id);
    const jump = $('#jump-new');
    jump.hidden = ui.newBelow === 0;
    $('#jump-new-label').textContent = ui.newBelow === 1 ? '1 new message' : `${ui.newBelow} new messages`;
    ui.stick = wasStick && true;
  }

  $('#log').addEventListener('scroll', () => {
    const log = $('#log');
    const near = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    ui.stick = near;
    if (near && ui.newBelow) { ui.newBelow = 0; $('#jump-new').hidden = true; }
  });
  $('#jump-new').addEventListener('click', () => { const log = $('#log'); log.scrollTop = log.scrollHeight; ui.newBelow = 0; $('#jump-new').hidden = true; $('#msg-input').focus(); });

  /* ---- message pieces ---- */

  const URL_RE = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)]/gi;

  /** Text with safe, clickable links (http/https only). Everything else stays plain text. */
  function renderText(el, text) {
    el.textContent = '';
    let last = 0;
    for (const match of text.matchAll(URL_RE)) {
      if (match.index > last) el.appendChild(document.createTextNode(text.slice(last, match.index)));
      const a = tpl('t-a');
      a.href = match[0];
      a.textContent = match[0];
      el.appendChild(a);
      last = match.index + match[0].length;
    }
    if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
  }

  function attachmentsEl(box, list) {
    if (!list || !list.length) return;
    box.hidden = false;
    for (const a of list) {
      if (a.kind === 'image') {
        const b = tpl('t-att-img');
        const img = $('[data-img]', b);
        img.src = a.data;
        img.alt = a.name;
        b.setAttribute('aria-label', `Open photo ${a.name}`);
        b.addEventListener('click', () => openLightbox(a));
        box.appendChild(b);
      } else {
        const f = tpl('t-att-file');
        f.href = a.data;
        f.download = a.name;
        $('[data-name]', f).textContent = a.name;
        $('[data-size]', f).textContent = formatBytes(a.size);
        f.setAttribute('aria-label', `Download ${a.name}, ${formatBytes(a.size)}`);
        box.appendChild(f);
      }
    }
  }

  function openLightbox(a) {
    $('#lightbox-img').src = a.data;
    $('#lightbox-img').alt = a.name;
    $('#lightbox-name').textContent = a.name;
    const dl = $('#lightbox-download');
    dl.href = a.data;
    dl.download = a.name;
    $('#dlg-image').showModal();
  }

  function reactionsEl(box, m, convId) {
    const entries = Object.entries(m.reactions || {});
    if (!entries.length) return;
    box.hidden = false;
    for (const [emoji, ids] of entries) {
      const c = tpl('t-chip');
      $('[data-emoji]', c).textContent = emoji;
      $('[data-count]', c).textContent = ids.length > 1 ? String(ids.length) : '';
      const mine = ids.includes(me.id);
      c.dataset.mine = String(mine);
      const names = ids.map((id) => (id === me.id ? 'You' : (store.user(id) || {}).name)).filter(Boolean).join(', ');
      c.setAttribute('aria-label', `${emoji} ${names}. ${mine ? 'Tap to remove your reaction.' : 'Tap to react the same.'}`);
      c.title = names;
      c.addEventListener('click', () => act(store.react(convId, me.id, m.id, emoji)));
      box.appendChild(c);
    }
  }

  function actionBtn(label, icon, onClick) {
    const b = tpl('t-act');
    setIcon($('svg', b), icon);
    b.setAttribute('aria-label', label);
    b.title = label;
    b.addEventListener('click', (e) => { e.stopPropagation(); onClick(b, e); });
    return b;
  }

  function copyText(text) {
    const done = () => toast('Copied.');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => toast('Could not copy.'));
    else { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch { toast('Could not copy.'); } ta.remove(); }
  }

  /** Tap or click the bubble to show its time and actions; the avatar and time stay out of the way otherwise. */
  function wireReveal(el, m) {
    const body = $('[data-body]', el);
    el.dataset.msgid = m.id;
    const set = (on) => {
      el.dataset.reveal = String(on);
      body.setAttribute('aria-expanded', String(on));
      if (on) ui.revealed.add(m.id); else ui.revealed.delete(m.id);
      if (!on && ui.quickFor === m.id) { ui.quickFor = null; $('[data-quick]', el).hidden = true; }
    };
    set(ui.revealed.has(m.id));
    const toggle = () => { if (window.getSelection && String(window.getSelection())) return; set(el.dataset.reveal !== 'true'); };
    body.addEventListener('click', toggle);
    body.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } if (e.key === 'Escape') set(false); });
  }

  function quoteEl(el, m) {
    const q = $('[data-quote]', el);
    if (!m.replyPreview) return;
    q.hidden = false;
    $('[data-who]', q).textContent = m.replyPreview.who;
    $('[data-qtext]', q).textContent = m.replyPreview.text;
    const jump = () => {
      const target = $(`[data-msgid="${m.replyPreview.id}"]`, $('#log'));
      if (!target) return toast('That message is no longer in view.');
      target.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      ui.flash = m.replyPreview.id;
      target.dataset.flash = 'true';
      setTimeout(() => { delete target.dataset.flash; ui.flash = null; }, 1200);
    };
    q.setAttribute('aria-label', `Replying to ${m.replyPreview.who}: ${m.replyPreview.text}. Go to message.`);
    q.addEventListener('click', jump);
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jump(); } });
  }

  function messageActions(el, m, t) {
    const box = $('[data-actions]', el);
    const quick = $('[data-quick]', el);
    const react = actionBtn('React', 'smile', (btn) => {
      const open = quick.hidden;
      quick.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      ui.quickFor = open ? m.id : null;
      if (open && !quick.children.length) {
        for (const emoji of QUICK_REACTIONS) {
          const e = tpl('t-emoji');
          e.textContent = emoji;
          const mine = (m.reactions && m.reactions[emoji] || []).includes(me.id);
          e.dataset.mine = String(mine);
          e.setAttribute('aria-label', `React with ${emoji}`);
          e.addEventListener('click', (ev) => { ev.stopPropagation(); quick.hidden = true; ui.quickFor = null; act(store.react(t.conv.id, me.id, m.id, emoji)); });
          quick.appendChild(e);
        }
      }
    });
    box.appendChild(react);
    if (t.canPost.ok) box.appendChild(actionBtn('Reply', 'reply', () => setReply(m)));
    if (m.text) box.appendChild(actionBtn('Copy text', 'copy', () => copyText(m.text)));
    if (m.mine && m.text && !m.viaChoice && t.canPost.ok && Date.now() - m.at < store.config.editMs) box.appendChild(actionBtn('Edit message', 'pencil', () => startEdit(m)));
    if (m.mine && Date.now() - m.at < store.config.unsendMs) box.appendChild(actionBtn('Remove message', 'trash', () => { act(store.unsend(t.conv.id, me.id, m.id), 'Message removed.'); }));
    if (ui.quickFor === m.id) { react.click(); }
  }

  function bubble(m, ctx) {
    const { first, last, isLastOut, offerChoices, t } = ctx;
    const when = formatTime(m.at);
    const iso = new Date(m.at).toISOString();
    const interactive = m.kind !== 'bot';
    if (m.mine) {
      const el = tpl('t-out');
      const body = $('[data-body]', el);
      if (m.deleted) { body.textContent = 'You removed a message'; body.dataset.state = 'deleted'; }
      else if (m.text) renderText(body, m.text); else body.hidden = true;
      const tm = $('[data-time]', el);
      tm.textContent = when;
      tm.dateTime = iso;
      tm.title = formatFull(m.at);
      if (!m.deleted) { quoteEl(el, m); attachmentsEl($('[data-attachments]', el), m.attachments); reactionsEl($('[data-reactions]', el), m, t.conv.id); }
      if (m.editedAt && !m.deleted) $('[data-edited]', el).hidden = false;
      wireReveal(el, m);
      if (!m.deleted) messageActions(el, m, t);
      if (isLastOut) {
        const group = t.conv.kind === 'group';
        const ind = m.delivery === 'read' ? 'read' : m.delivery === 'partial' ? 'partial' : 'sent';
        const span = $(`[data-ind="${ind}"]`, el);
        span.hidden = false;
        if (ind === 'read' && group) $('[data-label]', span).textContent = 'Seen by everyone';
        if (ind === 'partial') $('[data-label]', span).textContent = `Seen by ${m.seenBy.join(', ')}`;
      }
      return el;
    }
    const el = tpl('t-in');
    const body = $('[data-body]', el);
    body.dataset.kind = m.kind === 'bot' ? 'bot' : 'text';
    if (m.deleted) { body.textContent = 'This message was removed'; body.dataset.state = 'deleted'; }
    else if (m.text) renderText(body, m.text); else body.hidden = true;
    const a = m.author || { name: 'Assistant', role: 'bot' };
    const who = m.kind === 'bot' ? 'EasySpotOps Assistant' : `${a.name}${a.role && a.role !== 'bot' ? ` · ${ROLE_LABEL[a.role]}` : ''}`;
    if (first) $('[data-author]', el).textContent = who; else $('[data-author]', el).hidden = true;
    if (last) $('[data-avatar]', el).replaceWith(avatar({ name: a.name, role: a.role === 'bot' ? 'bot' : a.role, size: 'sm' }));
    const tm = $('[data-time]', el);
    tm.textContent = when;
    tm.dateTime = iso;
    tm.title = formatFull(m.at);
    if (!m.deleted) { quoteEl(el, m); attachmentsEl($('[data-attachments]', el), m.attachments); reactionsEl($('[data-reactions]', el), m, t.conv.id); }
    if (m.editedAt && !m.deleted) $('[data-edited]', el).hidden = false;
    if (interactive) { wireReveal(el, m); if (!m.deleted) messageActions(el, m, t); }
    else { body.removeAttribute('role'); body.removeAttribute('tabindex'); body.removeAttribute('aria-expanded'); body.classList.remove('cursor-pointer'); el.dataset.msgid = m.id; }
    // Quick replies are only shown while they can be used. Once one is tapped (or the chat moves on), the
    // person's choice already appears as their own message, so the options collapse like in any chat app.
    if (m.choices && offerChoices) {
      const box = $('[data-choices]', el);
      box.hidden = false;
      for (const c of m.choices) {
        const b = tpl('t-choice');
        b.textContent = c.label;
        b.dataset.state = 'open';
        b.addEventListener('click', () => choose(t.conv.id, c.id));
        box.appendChild(b);
      }
    }
    return el;
  }

  function pendingBubble(p) {
    const el = tpl('t-out');
    const body = $('[data-body]', el);
    if (p.text) body.textContent = p.text; else body.hidden = true;
    body.dataset.state = p.state;
    body.removeAttribute('role');
    body.removeAttribute('tabindex');
    body.removeAttribute('aria-expanded');
    attachmentsEl($('[data-attachments]', el), p.attachments);
    $('[data-time]', el).textContent = formatTime(p.at);
    $(`[data-ind="${p.state}"]`, el).hidden = false;
    if (p.state === 'failed') {
      const box = $('[data-failed-actions]', el);
      box.hidden = false;
      const err = document.createElement('p');
      err.className = 'text-xs text-danger-text';
      err.textContent = p.error || 'Message not sent.';
      box.appendChild(err);
      box.appendChild(button('Retry', { variant: 'soft', onClick: () => deliver(p) }));
      box.appendChild(button('Discard', { variant: 'ghost', onClick: () => { ui.pending = ui.pending.filter((x) => x !== p); renderThread(true); } }));
    }
    return el;
  }

  /* -------------------------------------------------------- sending, bot */

  function choose(convId, choiceId) {
    if (offline()) return toast('You are offline. Try again when the connection is back.');
    ui.gate = { convId, since: Date.now() - 1, until: Date.now() + 650 + Math.random() * 450 };
    setTimeout(() => renderThread(true), ui.gate.until - Date.now() + 20);
    ui.stick = true;
    const r = store.choose(convId, me.id, choiceId);
    if (!r.ok) { ui.gate = null; toast(reasonText(r.reason)); }
    else announce('Assistant is typing');
  }

  function fail(p, error) {
    p.state = 'failed';
    p.error = error;
    ui.sigLog = '';
    renderThread(true);
  }

  function deliver(p) {
    p.state = 'sending';
    p.error = null;
    ui.sigLog = '';
    renderThread(true);
    setTimeout(() => {
      if (!ui.pending.includes(p)) return;
      if (offline()) return fail(p, 'You are offline. Check your connection and try again.');
      const conv = store.get(p.convId, me.id);
      if (conv.ok && conv.conv.kind === 'resident_support' && conv.conv.status === 'bot') {
        ui.gate = { convId: p.convId, since: Date.now() - 1, until: Date.now() + 750 + Math.random() * 400 };
        setTimeout(() => renderThread(true), ui.gate.until - Date.now() + 20);
      }
      p.done = true;
      const r = store.send(p.convId, me.id, p.text, { clientId: p.cid, attachments: p.attachments, replyTo: p.replyTo });
      if (!r.ok) {
        p.done = false;
        ui.gate = null;
        return fail(p, reasonText(r.reason));
      }
      ui.pending = ui.pending.filter((x) => x !== p);
      localStorage.removeItem(draftKey(p.convId));
      renderThread(true);
    }, 160 + Math.random() * 260);
  }

  /** Edit mode reuses the composer: the old text is loaded, Send saves it, Esc or the cross puts your draft back. */
  function startEdit(m) {
    const input = $('#msg-input');
    if (!ui.edit) ui.edit = { prev: input.value };
    ui.edit.id = m.id;
    ui.edit.text = m.text;
    ui.reply = null;
    ui.attach = [];
    ui.emojiOpen = false;
    input.value = m.text;
    autosize();
    renderComposerExtras();
    updateCount();
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function endEdit({ restore = true } = {}) {
    if (!ui.edit) return;
    const prev = ui.edit.prev;
    ui.edit = null;
    if (restore) $('#msg-input').value = prev;
    autosize();
    renderComposerExtras();
    updateCount();
  }

  function saveEdit() {
    const input = $('#msg-input');
    const text = input.value.trim();
    if (!text) return toast(reasonText('empty'));
    if (text === ui.edit.text) return endEdit();
    const r = store.edit(ui.convId, me.id, ui.edit.id, text);
    if (!r.ok) { toast(reasonText(r.reason)); if (r.reason === 'too_late' || r.reason === 'not_allowed') endEdit(); return; }
    toast('Message updated.');
    endEdit();
    renderThread(true);
  }

  function send() {
    const input = $('#msg-input');
    if (ui.edit) return saveEdit();
    const text = input.value.trim();
    const ready = ui.attach.filter((a) => a.state === 'ready');
    if (ui.attach.some((a) => a.state === 'processing')) return toast('Wait for the photo to finish preparing.');
    if ((!text && !ready.length) || !ui.convId) return;
    const t = store.get(ui.convId, me.id);
    if (!t.ok || !t.canPost.ok) return toast(reasonText(t.ok ? t.canPost.reason : t.reason));
    if (text.length > 2000) return toast(reasonText('too_long'));
    input.value = '';
    localStorage.removeItem(draftKey(ui.convId));
    autosize();
    const p = { cid: `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, convId: ui.convId, text, at: Date.now(), state: 'sending', attachments: ready.map(({ kind, name, mime, size, data }) => ({ kind, name, mime, size, data })), replyTo: ui.reply ? ui.reply.id : undefined };
    ui.attach = [];
    ui.reply = null;
    ui.emojiOpen = false;
    renderComposerExtras();
    updateCount();
    store.setTyping(ui.convId, me.id, false);
    ui.pending.push(p);
    ui.stick = true;
    deliver(p);
    input.focus();
  }

  const form = $('#composer');
  form.addEventListener('submit', (e) => { e.preventDefault(); send(); });
  const input = $('#msg-input');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !matchMedia('(pointer: coarse)').matches) { e.preventDefault(); send(); }
    if (e.key === 'Escape' && ui.edit) { e.preventDefault(); endEdit(); return; }
    if (e.key === 'Escape' && isMobile() && ui.pane === 'thread') leave();
  });
  let draftTimer;
  let typingSent = 0;
  input.addEventListener('input', () => {
    autosize();
    updateCount();
    if (ui.edit) return; // an edit is not a draft and is not "typing a new message"
    const t = ui.convId && Date.now() - typingSent > 2000 && input.value.trim();
    if (t && !(ui.lastKind === 'resident_support' && ui.lastStatus === 'bot')) { typingSent = Date.now(); store.setTyping(ui.convId, me.id, true); }
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => { if (ui.convId) { if (input.value) localStorage.setItem(draftKey(ui.convId), input.value); else localStorage.removeItem(draftKey(ui.convId)); } }, 250);
  });
  function autosize() { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight + 2, 160)}px`; }
  function updateCount() {
    const n = input.value.length;
    $('#composer-count').textContent = n > 1600 ? `${n} / 2000` : '';
    const ready = ui.attach.some((a) => a.state === 'ready');
    const busy = ui.attach.some((a) => a.state === 'processing');
    $('#btn-send').disabled = busy || (!input.value.trim() && !ready);
  }
  function insertText(text) {
    const s = input.selectionStart ?? input.value.length;
    input.value = `${input.value.slice(0, s)}${input.value && !/\s$/.test(input.value.slice(0, s)) ? ' ' : ''}${text}${input.value.slice(input.selectionEnd ?? s)}`;
    autosize();
    updateCount();
    input.dispatchEvent(new Event('input'));
  }
  $('#btn-canned').addEventListener('click', () => { ui.cannedOpen = !ui.cannedOpen; renderThread(true); });

  /* ------------------------------------------- reply, attachments, emoji */

  function setReply(m) {
    ui.reply = { id: m.id, who: m.mine ? 'yourself' : (m.author ? m.author.name : 'Assistant'), text: m.text || (m.attachments && m.attachments[0] ? (m.attachments[0].kind === 'image' ? 'Photo' : m.attachments[0].name) : '') };
    renderComposerExtras();
    $('#msg-input').focus();
  }
  $('#reply-cancel').addEventListener('click', () => {
    if (ui.edit) endEdit(); else { ui.reply = null; renderComposerExtras(); }
    $('#msg-input').focus();
  });

  function renderComposerExtras() {
    const bar = $('#reply-bar');
    bar.hidden = !ui.reply && !ui.edit;
    $('#reply-cancel').setAttribute('aria-label', ui.edit ? 'Cancel editing' : 'Cancel reply');
    $('#btn-send').lastChild.textContent = ui.edit ? 'Save' : 'Send';
    if (ui.edit) {
      $('#reply-who').textContent = 'Editing message';
      $('#reply-text').textContent = ui.edit.text;
    } else if (ui.reply) {
      $('#reply-who').textContent = `Replying to ${ui.reply.who}`;
      $('#reply-text').textContent = ui.reply.text;
    }
    const tray = $('#tray');
    clear(tray);
    tray.hidden = !ui.attach.length;
    for (const a of ui.attach) {
      const el = tpl('t-tray');
      $('[data-name]', el).textContent = a.name;
      $('[data-size]', el).textContent = a.state === 'processing' ? 'Preparing…' : formatBytes(a.size);
      if (a.kind === 'image' && a.data) { const img = $('[data-img]', el); img.hidden = false; img.src = a.data; $('[data-icon]', el).hidden = true; }
      if (a.state === 'processing') { $('[data-spin]', el).removeAttribute('hidden'); $('[data-icon]', el).hidden = true; }
      $('[data-remove]', el).setAttribute('aria-label', `Remove ${a.name}`);
      $('[data-remove]', el).addEventListener('click', () => { ui.attach = ui.attach.filter((x) => x !== a); renderComposerExtras(); updateCount(); });
      tray.appendChild(el);
    }
    $('#btn-emoji').setAttribute('aria-expanded', String(ui.emojiOpen));
    $('#emoji-pop').hidden = !ui.emojiOpen;
    $('#btn-attach').disabled = ui.attach.length >= store.config.maxAttachments;
    updateCount();
  }

  const MAX_SIDE = 1280;
  const fileToDataUrl = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  const loadImage = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });

  /** Photos are downsized in the browser so they fit in storage; other files must already be small. */
  async function prepareFile(file) {
    const max = store.config.maxAttachmentBytes;
    if (file.type.startsWith('image/') && file.type !== 'image/svg+xml' && file.type !== 'image/gif') {
      const img = await loadImage(await fileToDataUrl(file));
      let scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      for (let attempt = 0; attempt < 5; attempt++) {
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const data = c.toDataURL('image/jpeg', attempt < 2 ? 0.82 : 0.65);
        const size = Math.round((data.length * 3) / 4);
        if (size <= max) return { kind: 'image', name: file.name.replace(/\.[^.]+$/, '') + '.jpg', mime: 'image/jpeg', size, data };
        scale *= 0.75;
      }
      throw new Error('That photo is too large even after shrinking it.');
    }
    if (file.type.startsWith('image/')) {
      if (file.size > max) throw new Error(`${file.name} is larger than ${formatBytes(max)}.`);
      return { kind: 'image', name: file.name, mime: file.type, size: file.size, data: await fileToDataUrl(file) };
    }
    if (!/\.(pdf|txt|csv)$/i.test(file.name)) throw new Error(`${file.name}: only photos, PDF, TXT and CSV files can be attached.`);
    if (file.size > max) throw new Error(`${file.name} is larger than ${formatBytes(max)}.`);
    return { kind: 'file', name: file.name, mime: file.type || 'application/octet-stream', size: file.size, data: await fileToDataUrl(file) };
  }

  async function addFiles(files) {
    const err = $('#attach-error');
    err.hidden = true;
    const list = [...files];
    const room = store.config.maxAttachments - ui.attach.length;
    if (list.length > room) { err.hidden = false; err.textContent = `You can attach up to ${store.config.maxAttachments} files to one message.`; }
    for (const file of list.slice(0, Math.max(0, room))) {
      const item = { kind: file.type.startsWith('image/') ? 'image' : 'file', name: file.name, size: file.size, state: 'processing' };
      ui.attach.push(item);
      renderComposerExtras();
      try {
        Object.assign(item, await prepareFile(file), { state: 'ready' });
      } catch (e) {
        ui.attach = ui.attach.filter((x) => x !== item);
        err.hidden = false;
        err.textContent = e && e.message ? e.message : 'That file could not be attached.';
      }
      renderComposerExtras();
    }
  }
  window.__eso_addFiles = addFiles; // used by the preview checks

  $('#btn-attach').addEventListener('click', () => $('#file-input').click());
  $('#file-input').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
  input.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData ? e.clipboardData.files : [])];
    if (files.length) { e.preventDefault(); addFiles(files); }
  });
  const pane = $('#thread-pane');
  let dragDepth = 0;
  pane.addEventListener('dragenter', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { dragDepth++; pane.dataset.drop = 'true'; } });
  pane.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) pane.dataset.drop = 'false'; });
  pane.addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault(); });
  pane.addEventListener('drop', (e) => { e.preventDefault(); dragDepth = 0; pane.dataset.drop = 'false'; if (!$('#composer').hidden && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });

  /* emoji picker: our own selection of Unicode characters (see emoji.js), with a "recent" row */
  const RECENT_KEY = 'eso-msg-recent-emoji';
  const recent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } };
  let emojiCat = 'recent';
  function renderEmoji() {
    const q = $('#emoji-search').value;
    const grid = $('#emoji-grid');
    clear(grid);
    const tabs = $('#emoji-tabs');
    if (!tabs.children.length) {
      [{ id: 'recent', label: 'Recent', icon: '🕘' }, ...EMOJI_CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: c.items[0][0] }))].forEach((c) => {
        const b = tpl('t-emoji');
        b.textContent = c.icon;
        b.dataset.cat = c.id;
        b.setAttribute('aria-label', c.label);
        b.title = c.label;
        b.addEventListener('click', () => { emojiCat = c.id; $('#emoji-search').value = ''; renderEmoji(); });
        tabs.appendChild(b);
      });
    }
    $$('[data-cat]', tabs).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === emojiCat && !q)));
    let list;
    if (q.trim()) list = searchEmoji(q);
    else if (emojiCat === 'recent') list = recent().length ? recent() : EMOJI_CATEGORIES[0].items.slice(0, 16).map((x) => x[0]);
    else list = EMOJI_CATEGORIES.find((c) => c.id === emojiCat).items.map((x) => x[0]);
    $('#emoji-empty').hidden = list.length > 0;
    for (const ch of list) {
      const b = tpl('t-emoji');
      b.textContent = ch;
      b.setAttribute('aria-label', `Insert ${ch}`);
      b.addEventListener('click', () => {
        insertEmoji(ch);
        localStorage.setItem(RECENT_KEY, JSON.stringify([ch, ...recent().filter((x) => x !== ch)].slice(0, 16)));
      });
      grid.appendChild(b);
    }
  }
  function insertEmoji(ch) {
    const s = input.selectionStart ?? input.value.length;
    const e = input.selectionEnd ?? s;
    input.value = input.value.slice(0, s) + ch + input.value.slice(e);
    input.selectionStart = input.selectionEnd = s + ch.length;
    autosize();
    updateCount();
    input.dispatchEvent(new Event('input'));
    input.focus();
  }
  $('#btn-emoji').addEventListener('click', () => { ui.emojiOpen = !ui.emojiOpen; renderComposerExtras(); if (ui.emojiOpen) { renderEmoji(); $('#emoji-search').focus(); } });
  $('#emoji-search').addEventListener('input', renderEmoji);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.emojiOpen) { ui.emojiOpen = false; renderComposerExtras(); $('#btn-emoji').focus(); } });
  document.addEventListener('click', (e) => { if (ui.emojiOpen && !e.target.closest('#emoji-pop, #btn-emoji')) { ui.emojiOpen = false; renderComposerExtras(); } });

  /* typing line and presence */
  function typingText(people) {
    if (!people.length) return '';
    const n = people.map((p) => p.name.split(' ')[0]);
    if (n.length === 1) return `${n[0]} is typing`;
    if (n.length === 2) return `${n[0]} and ${n[1]} are typing`;
    return `${n.length} people are typing`;
  }
  let typingTimer;
  function renderTyping() {
    const line = $('#typing-line');
    const people = ui.convId ? store.typingIn(ui.convId, me.id) : [];
    const text = typingText(people);
    line.hidden = !text;
    if (text && line.dataset.text !== text) { line.textContent = `${text}…`; line.dataset.text = text; }
    if (!text) line.dataset.text = '';
    clearTimeout(typingTimer);
    if (text) typingTimer = setTimeout(renderTyping, store.config.typingMs + 200);
  }
  window.addEventListener('pagehide', () => { store.goOffline(me.id); if (ui.convId) store.setTyping(ui.convId, me.id, false); });
  input.addEventListener('blur', () => { if (ui.convId) store.setTyping(ui.convId, me.id, false); });

  /* -------------------------------------------------------------- dialogs */

  const dlg = (id) => document.getElementById(id);
  const wireDialog = (d) => {
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => d.close()));
  };
  ['dlg-new', 'dlg-announce', 'dlg-preview', 'dlg-image', 'dlg-members'].forEach((id) => wireDialog(dlg(id)));

  /* new conversation: one to one, or a group of three or more (Staff and Admin start groups) */
  function setNewMode(mode) {
    const d = dlg('dlg-new');
    d._mode = mode;
    $$('[data-mode]', d).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    $('#new-direct-wrap').hidden = mode === 'group';
    $('#new-group-wrap').hidden = mode !== 'group';
    $('#new-subject-wrap').hidden = mode === 'group' || !$('input[name=recipient]:checked', d) || d._recipients[Number($('input[name=recipient]:checked', d).value)].type !== 'support';
    $('#dlg-new-title').textContent = mode === 'group' ? 'New group' : 'New conversation';
    $('#new-text').previousElementSibling.textContent = mode === 'group' ? 'First message (optional)' : 'Message';
  }
  $$('#new-mode [data-mode]').forEach((b) => b.addEventListener('click', () => setNewMode(b.dataset.mode)));

  function openNew() {
    const d = dlg('dlg-new');
    const box = $('#new-recipients');
    clear(box);
    const canGroup = store.groupCandidates(me.id).length > 0;
    $('#new-mode').hidden = !canGroup;
    const members = $('#new-members');
    clear(members);
    $('#new-group-name').value = '';
    const countEl = $('#new-group-count');
    const syncCount = () => { const n = $$('input:checked', members).length + 1; countEl.textContent = `(${n} including you, 3 to 12)`; };
    for (const p of store.groupCandidates(me.id)) {
      const el = tpl('t-audience');
      const cb = $('input', el);
      cb.value = p.id;
      cb.addEventListener('change', syncCount);
      $('[data-label]', el).textContent = `${p.name} · ${p.title}`;
      members.appendChild(el);
    }
    syncCount();
    const recipients = store.recipients(me.id);
    recipients.forEach((r, i) => {
      const el = tpl('t-recipient');
      const radio = $('input', el);
      radio.value = String(i);
      radio.addEventListener('change', () => { $('#new-subject-wrap').hidden = r.type !== 'support'; });
      $('[data-avatar]', el).replaceWith(avatar({ name: r.label, role: r.type === 'support' ? 'admin' : r.role, size: 'md' }));
      $('[data-name]', el).textContent = r.label;
      $('[data-hint]', el).textContent = r.hint;
      box.appendChild(el);
    });
    $('#new-subject').value = '';
    $('#new-text').value = '';
    $('#new-error').hidden = true;
    $('#new-subject-wrap').hidden = true;
    d._recipients = recipients;
    setNewMode('direct');
    d.showModal();
    $('input[name=recipient]', d)?.focus();
  }
  $('#btn-new').addEventListener('click', openNew);
  $('#form-new').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = dlg('dlg-new');
    const err = $('#new-error');
    const picked = $('input[name=recipient]:checked', d);
    const fail = (msg) => { err.hidden = false; err.textContent = msg; };
    if (d._mode === 'group') {
      if (offline()) return fail('You are offline. Try again when the connection is back.');
      const ids = $$('#new-members input:checked').map((c) => c.value);
      const res = store.createGroup(me.id, { name: $('#new-group-name').value, memberIds: ids, text: $('#new-text').value });
      if (!res.ok) return fail(reasonText(res.reason));
      d.close();
      toast('Group created.');
      ui.tab = me.role === 'admin' ? 'direct' : 'groups';
      return openConv(res.convId);
    }
    if (!picked) return fail('Choose who to message.');
    const r = d._recipients[Number(picked.value)];
    const text = $('#new-text').value;
    if (offline()) return fail('You are offline. Try again when the connection is back.');
    const res = r.type === 'support' ? store.startSupport(me.id, { subject: $('#new-subject').value, text }) : store.startDirect(me.id, r.userId, text);
    if (!res.ok) return fail(reasonText(res.reason));
    d.close();
    toast('Message sent.');
    ui.tab = 'all';
    openConv(res.convId);
  });

  /* group members: who is in it, who is online, add a person, leave */
  function openMembers(convId) {
    const t = store.get(convId, me.id);
    if (!t.ok) return;
    const d = dlg('dlg-members');
    d._conv = convId;
    const members = t.row.members;
    $('#dlg-members-title').textContent = t.conv.name;
    $('#members-sub').textContent = `${members.length} people. Everyone in the group sees every message.`;
    const list = $('#members-list');
    clear(list);
    for (const m of members) {
      const li = tpl('t-member');
      $('[data-avatar]', li).replaceWith(avatar({ name: m.name, role: m.role, size: 'md' }));
      $('[data-name]', li).textContent = m.id === me.id ? `${m.name} (you)` : m.name;
      $('[data-title]', li).textContent = `${ROLE_LABEL[m.role]} · ${m.title}`;
      if (m.id !== me.id && store.presenceOf(m.id).online) $('[data-presence]', li).appendChild(badge('Online', 'success'));
      list.appendChild(li);
    }
    const canAdd = ['staff', 'admin'].includes(me.role);
    const left = store.groupCandidates(me.id).filter((p) => !members.some((m) => m.id === p.id));
    $('#members-add').hidden = !canAdd || !left.length || members.length >= 12;
    const sel = $('#members-select');
    clear(sel);
    left.forEach((p) => sel.add(new Option(`${p.name} · ${ROLE_LABEL[p.role]}`, p.id)));
    $('#members-error').hidden = true;
    $('#members-leave').disabled = members.length <= 2;
    d.showModal();
  }
  $('#members-add-btn').addEventListener('click', () => {
    const d = dlg('dlg-members');
    const r = store.addMember(d._conv, me.id, $('#members-select').value);
    if (!r.ok) { $('#members-error').hidden = false; $('#members-error').textContent = reasonText(r.reason); return; }
    toast('Person added.');
    openMembers(d._conv);
  });
  $('#members-leave').addEventListener('click', () => {
    const d = dlg('dlg-members');
    const r = store.leaveGroup(d._conv, me.id);
    if (!r.ok) { $('#members-error').hidden = false; $('#members-error').textContent = reasonText(r.reason); return; }
    d.close();
    toast('You left the group.');
    renderAll(true);
  });

  function audienceCount(sel) {
    const roles = sel === 'everyone' ? ['resident', 'staff', 'client', 'admin'] : sel;
    return PERSONAS.filter((p) => roles.includes(p.role)).length;
  }
  function openAnnounce() {
    const d = dlg('dlg-announce');
    const box = $('#ann-audience');
    clear(box);
    const mk = (value, label, checked) => {
      const el = tpl('t-audience');
      const cb = $('input', el);
      cb.value = value;
      cb.checked = checked;
      $('[data-label]', el).textContent = label;
      cb.addEventListener('change', sync);
      box.appendChild(el);
      return cb;
    };
    const every = mk('everyone', 'Everyone', true);
    const roles = [['resident', 'Residents'], ['staff', 'Staff'], ['client', 'Clients'], ['admin', 'Admins']].map(([v, l]) => mk(v, l, false));
    function sync() {
      roles.forEach((cb) => { cb.disabled = every.checked; if (every.checked) cb.checked = false; });
      const sel = every.checked ? 'everyone' : roles.filter((c) => c.checked).map((c) => c.value);
      $('#ann-count').textContent = sel === 'everyone' || sel.length ? `Reaches about ${audienceCount(sel)} people in this preview.` : 'Choose at least one group.';
    }
    sync();
    $('#ann-title').value = '';
    $('#ann-text').value = '';
    $('#ann-error').hidden = true;
    d.showModal();
    $('#ann-title').focus();
  }
  $('#btn-announce').addEventListener('click', openAnnounce);
  $('#form-announce').addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('#ann-error');
    const boxes = $$('#ann-audience input');
    const every = boxes.find((b) => b.value === 'everyone').checked;
    const audience = every ? 'everyone' : boxes.filter((b) => b.checked && b.value !== 'everyone').map((b) => b.value);
    const res = store.broadcast(me.id, { title: $('#ann-title').value, text: $('#ann-text').value, audience });
    if (!res.ok) { err.hidden = false; err.textContent = reasonText(res.reason); return; }
    dlg('dlg-announce').close();
    toast('Announcement sent.');
    ui.tab = 'announcements';
    openConv(res.convId);
  });

  function openPreview() {
    const d = dlg('dlg-preview');
    const sel = $('#pv-persona');
    clear(sel);
    PERSONAS.filter((p) => p.role === portal).forEach((p) => sel.add(new Option(`${p.name} · ${p.title}`, p.id)));
    sel.value = me.id;
    sel.onchange = () => { location.href = `${location.pathname}?as=${sel.value}${q.has('dark') ? '&dark' : ''}`; };
    const box = $('#pv-portals');
    clear(box);
    Object.entries(PORTALS).forEach(([key, p]) => {
      const a = tpl('t-link');
      a.href = `/${key}/messages.html${q.has('dark') ? '?dark' : ''}`;
      a.textContent = p.label;
      if (key === portal) a.setAttribute('aria-current', 'page');
      box.appendChild(a);
    });
    $('#pv-offline').checked = sessionStorage.getItem('eso-msg-offline') === '1';
    const mode = transport.info().mode;
    $('#pv-conn').textContent = { broadcast: 'Live sync between tabs', storage: 'Saved in this browser', memory: 'Not saved (storage is blocked)' }[mode];
    d.showModal();
  }
  $('#btn-preview').addEventListener('click', openPreview);
  $('#btn-preview-icon').addEventListener('click', openPreview);
  $('#pv-offline').addEventListener('change', (e) => {
    sessionStorage.setItem('eso-msg-offline', e.target.checked ? '1' : '0');
    renderAll(true);
  });
  const twoStep = (btn, label, run) => {
    let armed = false;
    let timer;
    btn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        btn.textContent = 'Click again to confirm';
        timer = setTimeout(() => { armed = false; btn.textContent = label; }, 3500);
        return;
      }
      clearTimeout(timer);
      armed = false;
      btn.textContent = label;
      run();
    });
  };
  const afterReset = () => { ui.convId = null; ui.lastConv = null; ui.pending = []; ui.seen.clear(); dlg('dlg-preview').close(); boot(); toast('Demo data reset.'); };
  twoStep($('#pv-reset'), 'Reset demo data', () => { store.reset(); afterReset(); });
  twoStep($('#pv-empty'), 'Start empty', () => { store.reset({ empty: true }); afterReset(); });

  $('#btn-dnd').addEventListener('click', () => {
    const on = !store.pref(me.id).dnd;
    store.setPref(me.id, { dnd: on });
    toast(on ? 'Do not disturb is on. Notes and announcements stay quiet; chats with staff still notify you.' : 'Do not disturb is off.');
  });

  /* --------------------------------------------------------------- render */

  function renderAll(force) {
    root.dataset.pane = ui.pane;
    const label = backLabel();
    $('#back-label').textContent = label;
    renderList(force);
    renderThread(force);
  }

  function onStore(source) {
    if (source === 'live') { renderThread(false); renderList(false); return; } // presence or typing only
    if (ui.convId && document.visibilityState === 'visible' && (!isMobile() || ui.pane === 'thread')) {
      const before = store.unreadCount(ui.convId, me.id);
      if (before > 0) {
        const t = store.get(ui.convId, me.id);
        const last = t.ok && [...t.messages].reverse().find((m) => !m.mine && notifies(m, me.role));
        if (last && !ui.seen.has(last.id) && source === 'remote') announce(`${last.author ? last.author.name : 'Assistant'}: ${last.text || (last.attachments && last.attachments.length ? 'sent an attachment' : '')}`);
        // keep unread dividers visible while the person is scrolled up
        if (ui.stick) store.markRead(ui.convId, me.id);
        else if (source === 'remote') { /* leave unread until they scroll down */ }
      }
    }
    renderAll(false);
  }

  /* ----------------------------------------------------------------- boot */

  function showError(error) {
    console.error(error);
    $('#view-boot').hidden = true;
    $('#view-app').hidden = true;
    $('#view-error').hidden = false;
    $('#error-text').textContent = reasonText('storage');
    $('#btn-retry').onclick = () => location.reload();
  }

  function boot() {
    try {
      const bootList = $('#boot-list');
      if (bootList && !bootList.children.length) for (let i = 0; i < 5; i++) bootList.appendChild(tpl('t-skel-row'));
      $('#view-boot').hidden = true;
      $('#view-app').hidden = false;
      store.tick();
      let conv = routeConv();
      if (conv && !store.get(conv, me.id).ok) conv = null;
      if (me.role === 'resident' && !conv) {
        const r = store.ensureSession(me.id);
        if (!r.ok) throw new Error(r.reason);
        conv = r.convId;
      }
      ui.convId = conv;
      ui.pane = conv ? 'thread' : 'list';
      const unread = conv ? store.get(conv, me.id).messages.find((m) => m.from !== me.id && !m.readBy[me.id] && notifies(m, me.role)) : null;
      ui.anchor = unread ? { convId: conv, msgId: unread.id } : null;
      history.replaceState({ depth: (history.state && history.state.depth) || 0, pane: ui.pane, conv }, '', conv ? `#/c/${conv}` : location.pathname + location.search);
      ui.sigLog = '';
      openSideEffects();
      renderAll(true);
    } catch (error) {
      showError(error);
    }
  }

  store.subscribe(onStore);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { openSideEffects(); renderAll(true); } });
  window.addEventListener('online', () => renderAll(true));
  window.addEventListener('offline', () => renderAll(true));
  matchMedia('(max-width: 1023px)').addEventListener('change', () => renderAll(true));
  setInterval(() => { store.tick(); renderAll(false); }, 30000);
  store.touchPresence(me.id);
  setInterval(() => { if (document.visibilityState === 'visible') store.touchPresence(me.id); }, 20000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') store.touchPresence(me.id); });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      if (isMobile() && ui.pane === 'thread') return;
      $('#list-search').focus();
    }
  });
  boot();
}
