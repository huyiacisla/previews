// Notifications page of the Client portal: search, filters, read and unread, mark all as read.
// All markup comes from partials/notifications-app.html (templates); this file clones them, fills text and toggles attributes.
import { pickPersona } from '../messaging/personas.js';
import {
  buildAll, readMap, setRead, isRead, counts, query, groupByDay, CATEGORIES, TONES, ROLE_CATEGORIES, ROLE_PROPERTIES,
} from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);
const clear = (el) => el.replaceChildren();

const qs = new URLSearchParams(location.search);
// One page for every portal: the body says which one (data-portal), and the list, categories and links follow it.
const role = ['client', 'staff', 'resident'].includes(document.body.dataset.portal) ? document.body.dataset.portal : 'client';
const me = pickPersona(role, qs.get('as'));
const PAGE = 25;
const ICONS = {
  messages: 'i-message', requests: 'i-clipboard', violations: 'i-alert', parking: 'i-parking', plan: 'i-gauge', properties: 'i-building', reports: 'i-chart', system: 'i-shield',
  residents: 'i-users', promotions: 'i-tag', community: 'i-megaphone', billing: 'i-card',
};

// Links keep the query (?as=, ?dark, ?v) except "embed", so a click never changes who is using the preview.
const keep = new URLSearchParams(qs); keep.delete('embed');
const search = keep.toString() ? `?${keep}` : '';
const DESTS = {
  client: { messages: '/client/messages.html', plan: '/client/workspace.html', dashboard: '/client/dashboard.html', support: '/client/support.html' },
  staff: { messages: '/staff/messages.html', tickets: '/staff/tickets.html' },
  resident: { messages: '/resident/messages.html', tickets: '/resident/tickets.html', promotions: '/resident/promotions.html', social: '/resident/social.html' },
};
const withSearch = (href) => { const [path, hash = ''] = href.split('#'); return `${path}${search}${hash ? `#${hash}` : ''}`; };
const DEST = Object.fromEntries(Object.entries(DESTS[role]).map(([k, v]) => [k, withSearch(v)]));
const SETTINGS = { client: '/client/settings/notifications.html', staff: '/staff/settings/notifications.html', resident: '/resident/settings/notifications.html' };
$('#settings-link').href = withSearch(SETTINGS[role]);
$('#settings-link').target = '_top';
$('#sample-note').textContent = `Sample data. This preview has no notification service, so these examples follow what the ${{ client: 'Client', staff: 'Staff', resident: 'Resident' }[role]} pages show.`;

const now = Date.now();
const all = buildAll(now, role);
const PROPERTIES = ROLE_PROPERTIES[role];
const CATS = Object.fromEntries(ROLE_CATEGORIES[role].map((c) => [c, CATEGORIES[c]]));
$('#f-prop-wrap').hidden = PROPERTIES.length < 2; // only a Client has several properties to choose from
let map = readMap(localStorage, me.id);
const ui = { q: '', status: 'all', cat: 'all', prop: 'all', sort: 'newest', shown: PAGE };

// ---- filters ----
const fill = (sel, items, value) => {
  clear(sel);
  for (const [v, label] of items) { const o = document.createElement('option'); o.value = v; o.textContent = label; sel.append(o); }
  sel.value = value;
};
fill($('#f-cat'), [['all', 'All categories'], ...Object.entries(CATS)], 'all');
fill($('#f-prop'), [['all', 'All properties'], ...PROPERTIES.map((p) => [p, p])], 'all');

const SORTS = { newest: 'Newest first', oldest: 'Oldest first', unread: 'Unread first' };
// the filters that live in the Filters panel and differ from their default: [key, chip label]
const filtersInUse = () => [
  ...(ui.cat !== 'all' ? [['cat', `Category: ${CATEGORIES[ui.cat]}`]] : []),
  ...(ui.prop !== 'all' ? [['prop', `Property: ${ui.prop}`]] : []),
  ...(ui.sort !== 'newest' ? [['sort', SORTS[ui.sort]]] : []),
];
const filtered = () => query(all, map, ui);
const isFiltered = () => ui.q.trim() !== '' || ui.status !== 'all' || ui.cat !== 'all' || ui.prop !== 'all';

// ---- tabs: All / Unread / Read, each with its count (counts ignore the status itself but follow search, category and property) ----
const renderTabs = () => {
  const base = query(all, map, { ...ui, status: 'all' });
  const c = counts(base, map);
  const tabs = $('#tabs');
  clear(tabs);
  for (const [id, label, n] of [['all', 'All', c.total], ['unread', 'Unread', c.unread], ['read', 'Read', c.read]]) {
    const b = tpl('t-tab');
    b.dataset.tab = id;
    b.setAttribute('aria-selected', String(ui.status === id));
    b.tabIndex = ui.status === id ? 0 : -1;
    $('[data-label]', b).textContent = label;
    $('[data-count]', b).textContent = String(n);
    b.setAttribute('aria-label', `${label}, ${n}`);
    tabs.append(b);
  }
};

// ---- rows ----
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const fullFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

const fillRow = (li, n) => {
  const read = isRead(n, map);
  li.dataset.id = n.id;
  li.dataset.read = String(read);
  $('[data-dot]', li).dataset.read = String(read);
  $('[data-state]', li).textContent = read ? '' : 'Unread: ';
  const chip = $('[data-chip]', li);
  chip.dataset.tone = TONES[n.cat];
  chip.dataset.read = String(read);
  $('[data-icon]', chip).setAttribute('href', `#${ICONS[n.cat]}`);
  const link = $('[data-link]', li);
  const title = $('[data-title]', li);
  if (n.dest) {
    link.hidden = false; link.textContent = n.title; link.href = DEST[n.dest]; link.dataset.id = n.id;
    link.classList.toggle('font-medium', !read);
    title.hidden = true;
  } else {
    link.hidden = true; title.hidden = false; title.textContent = n.title;
    title.classList.toggle('font-medium', !read);
  }
  $('[data-detail]', li).textContent = n.detail;
  const cat = $('[data-cat]', li);
  cat.dataset.tone = TONES[n.cat];
  cat.textContent = CATEGORIES[n.cat];
  const prop = $('[data-prop]', li);
  prop.textContent = n.prop || '';
  prop.hidden = !n.prop || PROPERTIES.length < 2; // one property: naming it on every row says nothing
  const t = $('[data-time]', li);
  t.dateTime = new Date(n.ts).toISOString();
  t.textContent = timeFmt.format(n.ts);
  t.title = fullFmt.format(n.ts);
  const btn = $('[data-toggle]', li);
  btn.dataset.id = n.id;
  btn.setAttribute('aria-pressed', String(read));
  btn.setAttribute('aria-label', `${read ? 'Mark as unread' : 'Mark as read'}: ${n.title}`);
  btn.title = read ? 'Mark as unread' : 'Mark as read';
  $('[data-toggle-icon]', btn).setAttribute('href', read ? '#i-mail' : '#i-check'); // the icon shows what a click does
};

const render = ({ focusIndex = null } = {}) => {
  const list = filtered();
  const shown = list.slice(0, ui.shown);
  const c = counts(all, map);

  $('#summary').textContent = c.unread === 0 ? 'You are all caught up' : `${c.unread} need attention`;
  renderTabs();
  $('#clear').hidden = !isFiltered();

  // a chip for each filter in use, and the number on the Filters button
  const active = filtersInUse();
  const chips = $('#chips');
  clear(chips);
  for (const [key, label] of active) {
    const c = tpl('t-chip');
    $('[data-label]', c).textContent = label;
    c.setAttribute('aria-label', `Remove filter: ${label}`);
    c.addEventListener('click', () => {
      ui[key] = key === 'sort' ? 'newest' : 'all';
      $(`#f-${key}`).value = ui[key];
      ui.shown = PAGE;
      render();
      $('#filters-btn').focus();
    });
    chips.append(c);
  }
  const badge = $('#filters-count');
  badge.hidden = active.length === 0;
  badge.textContent = String(active.length);
  $('#filters-btn').setAttribute('aria-label', active.length ? `Filters, ${active.length} in use` : 'Filters');

  const target = $('#list');
  clear(target);
  target.hidden = shown.length === 0;
  // By date for newest and oldest; "unread first" is grouped by state instead of by day.
  const groups = ui.sort === 'unread'
    ? [{ label: 'Unread', items: shown.filter((n) => !isRead(n, map)) }, { label: 'Read', items: shown.filter((n) => isRead(n, map)) }].filter((g) => g.items.length)
    : groupByDay(shown, now);
  for (const g of groups) {
    const el = tpl('t-day');
    $('[data-day]', el).textContent = g.label;
    $('[data-n]', el).textContent = String(g.items.length);
    const ul = $('[data-items]', el);
    for (const n of g.items) { const li = tpl('t-row'); fillRow(li, n); ul.append(li); }
    target.append(el);
  }

  // empty states say what happened and what to do
  const empty = $('#empty');
  empty.hidden = shown.length !== 0;
  if (shown.length === 0) {
    // Nothing unread is good news, not "no match": say so, and say which view it is.
    const nothingUnread = !isFiltered() || (ui.status === 'unread' && !ui.q.trim());
    const everywhere = ui.cat === 'all' && ui.prop === 'all';
    $('#empty-icon').setAttribute('href', nothingUnread ? '#i-check-all' : '#i-search');
    $('#empty-title').textContent = !nothingUnread ? 'No notifications match' : everywhere ? 'You are all caught up' : 'Nothing unread in this view';
    $('#empty-text').textContent = !nothingUnread ? 'Try a different word, or clear the filters to see everything.' : everywhere ? 'Nothing needs your attention right now.' : 'Everything here has been read. Clear the filters to see all notifications.';
    $('#empty-clear').hidden = !isFiltered();
  }

  // how much of the list is on screen
  $('#count').textContent = list.length === 0 ? '' : isFiltered()
    ? `${list.length} ${list.length === 1 ? 'result' : 'results'}${shown.length < list.length ? `, showing ${shown.length}` : ''}`
    : `Showing ${shown.length} of ${list.length}`;

  const more = list.length - shown.length;
  $('#more-wrap').hidden = more <= 0;
  if (more > 0) $('#more').textContent = `Show ${Math.min(PAGE, more)} more (${shown.length} of ${list.length})`;

  // mark all: acts on what the filters show
  const pending = list.filter((n) => !isRead(n, map));
  const btn = $('#mark-all');
  btn.disabled = pending.length === 0;
  $('#mark-all-label').textContent = isFiltered() ? `Mark ${pending.length} as read` : 'Mark all as read';
  btn.title = pending.length ? `Mark ${pending.length} ${pending.length === 1 ? 'notification' : 'notifications'} as read` : 'Nothing unread here';

  if (focusIndex !== null) {
    const rows = [...document.querySelectorAll('[data-row] [data-toggle]')];
    (rows[Math.min(focusIndex, rows.length - 1)] || $('#tabs [aria-selected="true"]') || $('#search')).focus();
  }
};

// ---- toasts (one at a time) ----
let toastTimer;
const toast = (text, undo) => {
  const box = $('#toasts');
  clear(box);
  const t = tpl('t-toast');
  $('[data-text]', t).textContent = text;
  const u = $('[data-undo]', t);
  if (undo) { u.hidden = false; u.addEventListener('click', () => { undo(); clear(box); }); }
  box.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => clear(box), undo ? 7000 : 3500);
};

// ---- changing read state ----
const change = (ids, value, { focusIndex = null } = {}) => {
  map = setRead(localStorage, me.id, ids, value);
  render({ focusIndex });
};

document.addEventListener('click', (e) => {
  const toggle = e.target.closest('[data-toggle]');
  if (toggle) {
    const n = all.find((x) => x.id === toggle.dataset.id);
    if (!n) return;
    const was = isRead(n, map);
    const rows = [...document.querySelectorAll('[data-row] [data-toggle]')];
    const at = rows.indexOf(toggle);
    change([n.id], !was, { focusIndex: at });
    toast(was ? 'Marked as unread' : 'Marked as read', () => change([n.id], was));
    return;
  }
  // opening a notification reads it
  const link = e.target.closest('[data-link]');
  if (link && link.dataset.id) change([link.dataset.id], true);
  const tab = e.target.closest('#tabs [role="tab"]');
  if (tab) { ui.status = tab.dataset.tab; ui.shown = PAGE; render(); $('#tabs [aria-selected="true"]')?.focus(); }
});

$('#mark-all').addEventListener('click', () => {
  const ids = filtered().filter((n) => !isRead(n, map)).map((n) => n.id);
  if (!ids.length) return;
  change(ids, true);
  toast(`${ids.length} marked as read`, () => change(ids, false));
  $('#tabs [aria-selected="true"]')?.focus();
});

// tabs: arrow keys move between them
$('#tabs').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const tabs = [...$('#tabs').querySelectorAll('[role="tab"]')];
  const i = tabs.indexOf(document.activeElement);
  if (i < 0) return;
  e.preventDefault();
  const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
  ui.status = next.dataset.tab; ui.shown = PAGE; render(); $('#tabs [aria-selected="true"]')?.focus();
});

// ---- the Filters panel ----
const fbtn = $('#filters-btn');
const fpanel = $('#filters-panel');
const closeFilters = (back = true) => {
  if (fpanel.hidden) return;
  fpanel.hidden = true;
  fbtn.setAttribute('aria-expanded', 'false');
  if (back) fbtn.focus();
};
fbtn.addEventListener('click', () => {
  if (!fpanel.hidden) { closeFilters(); return; }
  fpanel.hidden = false;
  fbtn.setAttribute('aria-expanded', 'true');
  $('#f-cat').focus();
});
document.addEventListener('pointerdown', (e) => { if (!fpanel.hidden && !fpanel.contains(e.target) && !fbtn.contains(e.target)) closeFilters(false); });
fpanel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFilters(); } });

// ---- search and filters ----
let typing;
$('#search').addEventListener('input', (e) => { clearTimeout(typing); typing = setTimeout(() => { ui.q = e.target.value; ui.shown = PAGE; render(); }, 120); });
$('#search').addEventListener('keydown', (e) => { if (e.key === 'Escape' && e.target.value) { e.target.value = ''; ui.q = ''; ui.shown = PAGE; render(); e.stopPropagation(); } });
for (const [id, key] of [['#f-cat', 'cat'], ['#f-prop', 'prop'], ['#f-sort', 'sort']]) {
  $(id).addEventListener('change', (e) => { ui[key] = e.target.value; ui.shown = PAGE; render(); });
}
const reset = () => {
  Object.assign(ui, { q: '', status: 'all', cat: 'all', prop: 'all', sort: 'newest', shown: PAGE });
  $('#search').value = ''; $('#f-cat').value = 'all'; $('#f-prop').value = 'all'; $('#f-sort').value = 'newest';
  render();
};
$('#clear').addEventListener('click', () => { reset(); $('#search').focus(); });
$('#empty-clear').addEventListener('click', () => { reset(); $('#search').focus(); });
$('#more').addEventListener('click', () => {
  const before = document.querySelectorAll('[data-row]').length;
  ui.shown += PAGE;
  render();
  document.querySelectorAll('[data-row] [data-toggle]')[before]?.focus(); // keyboard users land on the first new row
});
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && !e.metaKey && !e.ctrlKey) { e.preventDefault(); $('#search').focus(); }
});

// another tab or the bell changed the read state
addEventListener('storage', (e) => { if (e.key && e.key.startsWith('eso-notif-read:')) { map = readMap(localStorage, me.id); render(); } });

render();
