// Notifications page (Client, Staff, Resident and Admin), an Alpine.js component: search, filters, read and unread, mark all as read.
// Structure and classes: partials/notifications-app.html (x-data="notificationsPage"). What is drawn: notifications/view.js (pure,
// tested in Node). This file joins the two: it keeps what the person chose (`ui`), asks view.js what to show (`v`), and does what a
// click asks for (mark read, undo, move the focus).
import { component, start } from '../../shared/js/alpine.js';
import { pickPersona } from '../messaging/personas.js';
import { browserLive } from './live.js';
import { buildAll, readMap, setRead, CATEGORIES, ROLE_CATEGORIES, ROLE_PROPERTIES } from './store.js';
import { notificationsView, PAGE } from './view.js';

const qs = new URLSearchParams(location.search);
// One page for every portal: the body says which one (data-portal), and the list, categories and links follow it.
const role = ['client', 'staff', 'resident', 'admin'].includes(document.body.dataset.portal) ? document.body.dataset.portal : 'client';
const me = pickPersona(role, qs.get('as'));

// Links keep the query (?as=, ?dark, ?v) except "embed", so a click never changes who is using the preview.
const keep = new URLSearchParams(qs); keep.delete('embed');
const search = keep.toString() ? `?${keep}` : '';
const DESTS = {
  client: { messages: '/client/messages.html', plan: '/client/workspace.html', dashboard: '/client/dashboard.html', support: '/client/support.html' },
  staff: { messages: '/staff/messages.html', tickets: '/staff/tickets.html', social: '/staff/social.html' },
  resident: { messages: '/resident/messages.html', tickets: '/resident/tickets.html', promotions: '/resident/promotions.html', social: '/resident/social.html' },
  admin: { messages: '/admin/messages.html', tickets: '/admin/tickets.html', dashboard: '/admin/dashboard.html' },
};
const withSearch = (href) => { const [path, hash = ''] = href.split('#'); return `${path}${search}${hash ? `#${hash}` : ''}`; };
const DEST = Object.fromEntries(Object.entries(DESTS[role]).map(([k, v]) => [k, withSearch(v)]));
const SETTINGS = { client: '/client/settings/notifications.html', staff: '/staff/settings/notifications.html', resident: '/resident/settings/notifications.html', admin: '/admin/settings.html#/settings/notifications' };
const LABEL = { client: 'Client', staff: 'Staff', resident: 'Resident', admin: 'Admin' }[role];
const LIVE_NOTE = { client: 'Messages are live', staff: 'Messages and Social are live', resident: 'Messages and Social are live', admin: 'Messages and Support tickets are live' }[role];
const PROPERTIES = ROLE_PROPERTIES[role];

// The data stays outside the component: Alpine wraps whatever a component holds, and neither the list nor the live store needs that.
// Messenger and Social are real (live.js); the rest is the sample list. A change in either, even from another tab, redraws the list.
const live = browserLive(role, me);
let all = buildAll(Date.now(), role, live.items());
let map = readMap(localStorage, me.id);
let undoFn = null;
let toastTimer;

// Settings > Date and time (12 or 24 hours, time zone), as the Settings page publishes it for the real pages.
function timePrefs() { try { return JSON.parse(localStorage.getItem(`ui-prefs:${role}`) || 'null')?.time || {}; } catch { return {}; } }

const DEFAULTS = { q: '', status: 'all', cat: 'all', prop: 'all', sort: 'newest', shown: PAGE };
const TABS = ['all', 'unread', 'read'];

component('notificationsPage', () => ({
  ui: { ...DEFAULTS },
  v: notificationsView(all, map, DEFAULTS, Date.now(), { dest: DEST, multiProp: PROPERTIES.length > 1, time: timePrefs() }),
  filtersOpen: false,
  toast: null, // { text, undo } or null: one at a time
  settingsHref: withSearch(SETTINGS[role]),
  sampleNote: `${LIVE_NOTE}. The rest is sample data: this preview has no notification service, so those examples follow what the ${LABEL} pages show.`,
  catOptions: [{ value: 'all', label: 'All categories' }, ...ROLE_CATEGORIES[role].map((c) => ({ value: c, label: CATEGORIES[c] }))],
  propOptions: [{ value: 'all', label: 'All properties' }, ...PROPERTIES.map((p) => ({ value: p, label: p }))],
  showProp: PROPERTIES.length > 1, // only a Client has several properties to choose from

  init() {
    // a new search, tab or filter starts from the first page of results
    for (const k of ['q', 'status', 'cat', 'prop', 'sort']) this.$watch(`ui.${k}`, () => { this.ui.shown = PAGE; this.refresh(); });
    this.$watch('ui.shown', () => this.refresh());
    // another tab or the bell changed the read state
    addEventListener('storage', (e) => { if (e.key && e.key.startsWith('eso-notif-read:')) { map = readMap(localStorage, me.id); this.refresh(); } });
    live.onChange(() => { all = buildAll(Date.now(), role, live.items()); this.refresh(); });
  },

  refresh() {
    this.v = notificationsView(all, map, this.ui, Date.now(), { dest: DEST, multiProp: PROPERTIES.length > 1, time: timePrefs() });
  },

  /* ---- read and unread ---- */

  change(ids, value) {
    // a message notification and its chat are one thing: reading or un-reading here does the same there
    (value ? live.markRead : live.markUnread)(all.filter((n) => ids.includes(n.id)));
    map = setRead(localStorage, me.id, ids, value);
    this.refresh();
  },

  toggle(n, el) {
    const was = n.read;
    const at = this.toggles().indexOf(el);
    this.change([n.id], !was);
    this.say(was ? 'Marked as unread' : 'Marked as read', () => this.change([n.id], was));
    // the row may have moved or left the view: the focus stays at the same place in the list
    this.$nextTick(() => { const rows = this.toggles(); (rows[Math.min(at, rows.length - 1)] || this.selectedTab() || document.getElementById('search')).focus(); });
  },

  /** Opening a notification reads it (the link then opens its page). */
  open(n) { this.change([n.id], true); },

  markAll() {
    const ids = this.v.markAll.ids;
    if (!ids.length) return;
    this.change(ids, true);
    this.say(`${ids.length} marked as read`, () => this.change(ids, false));
    this.$nextTick(() => this.selectedTab()?.focus());
  },

  /* ---- tabs ---- */

  setTab(id) {
    this.ui.status = id;
    this.$nextTick(() => this.selectedTab()?.focus());
  },
  /** Arrow keys move between the tabs. */
  moveTab(dir) {
    const now = TABS.indexOf(document.activeElement?.dataset.tab);
    if (now < 0) return;
    this.setTab(TABS[(now + dir + TABS.length) % TABS.length]);
  },

  /* ---- search and filters ---- */

  toggleFilters() {
    if (this.filtersOpen) { this.closeFilters(true); return; }
    this.filtersOpen = true;
    this.$nextTick(() => document.getElementById('f-cat').focus());
  },
  closeFilters(back) {
    if (!this.filtersOpen) return;
    this.filtersOpen = false;
    if (back) document.getElementById('filters-btn').focus();
  },
  dropFilter(key) {
    this.ui[key] = key === 'sort' ? 'newest' : 'all';
    document.getElementById('filters-btn').focus();
  },
  clearSearch(e) {
    if (!e.target.value) return;
    e.target.value = '';
    this.ui.q = '';
    e.stopPropagation();
  },
  reset() {
    Object.assign(this.ui, DEFAULTS);
    this.refresh();
    this.$nextTick(() => document.getElementById('search').focus());
  },
  showMore() {
    const before = this.toggles().length;
    this.ui.shown += PAGE;
    this.$nextTick(() => this.toggles()[before]?.focus()); // keyboard users land on the first new row
  },
  /** "/" puts the cursor in the search box, unless the person is typing somewhere. */
  slash(e) {
    if (e.key !== '/' || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    document.getElementById('search').focus();
  },

  /* ---- toasts ---- */

  say(text, undo) {
    undoFn = undo || null;
    this.toast = { text, undo: !!undo };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { this.toast = null; undoFn = null; }, undo ? 7000 : 3500);
  },
  undo() {
    const fn = undoFn;
    undoFn = null;
    clearTimeout(toastTimer);
    this.toast = null;
    if (fn) fn();
  },

  /* ---- what is on screen ---- */

  toggles() { return [...document.querySelectorAll('[data-row] [data-toggle]')]; },
  selectedTab() { return document.querySelector('#tabs [aria-selected="true"]'); },
}));

start();
