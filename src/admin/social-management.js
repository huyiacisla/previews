// Social management (Admin), an Alpine.js component: the properties of the company, each with its Social and an "Open social" button.
// Structure and classes: admin/social-management-content.html (x-data="socialManagement"). The cards come from social/monitor.js (pure, tested).
// A property added in Capacity shows up here by itself; a change to the feed in another tab redraws the numbers.
import { component, start } from '../alpine.js';
import { overview, filterChannels, monitor } from '../social/monitor.js';
import { reportText } from '../social/diagnose.js';
import { reportMixin } from '../health/report-ui.js';
import { trapTab, restoreFocus } from '../dialog-trap.js';
import { endProperty, startOver } from '../property-lifecycle.js';
import { pickPersona } from '../messaging/personas.js';

// The links keep the query (?as, ?dark) but not "embed", and open in the whole window, not inside this frame.
const keep = new URLSearchParams(location.search); keep.delete('embed');

const ago = (at) => {
  const m = Math.round((Date.now() - at) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

component('socialManagement', () => ({
  ...reportMixin(),
  all: overview(localStorage),
  q: '',
  show: 'all',
  menuFor: null,
  endOpener: '',
  menuUp: false,
  copied: '',
  ed: { mode: 'end', id: '', name: '', typed: '', error: '' },

  init() {
    const redraw = (e) => { if (!e.key || e.key.startsWith('eso-feed') || e.key === 'capacity-state:client' || e.key === 'eso-property-lifecycle' || e.key === 'eso-prop' || e.key.startsWith('eso-res-social:')) this.all = overview(localStorage); };
    addEventListener('storage', redraw);
  },

  get cards() { return filterChannels(this.all, { q: this.q, show: this.show }); },
  get filtered() { return !!this.q.trim() || this.show !== 'all'; },
  get countText() { const n = this.cards.length, t = this.all.length; return n === t ? `${t} ${t === 1 ? 'property' : 'properties'}` : `${n} of ${t} properties`; },
  reset() { this.q = ''; this.show = 'all'; },

  summary(c) {
    if (c.ended) return `Ended${c.endedAt ? ` ${new Date(c.endedAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}` : ''}${c.endedBy ? ` by ${c.endedBy}` : ''}. Accounts signed out, Social disconnected.`;
    if (!c.posts && !c.problems) return 'No posts yet';
    const bits = c.posts ? [`${c.posts} ${c.posts === 1 ? 'post' : 'posts'}`, `${c.replies} ${c.replies === 1 ? 'reply' : 'replies'}`] : [];
    if (c.lastAt) bits.push(`last ${ago(c.lastAt)}`);
    if (c.problems) bits.push(`${c.problems} data ${c.problems === 1 ? 'check' : 'checks'} to look at`);
    return bits.join(' · ');
  },
  openHref(c) { const q = new URLSearchParams(keep); q.set('property', c.id); return `/admin/social-monitoring.html?${q}`; },
  // The same page, on the tab asked for (Activity or Checks).
  tabHref(c, tab) { const q = new URLSearchParams(keep); q.set('property', c.id); q.set('tab', tab); return `/admin/social-monitoring.html?${q}`; },
  openUrl(c) { return new URL(this.openHref(c), location.origin).href; },
  checksText(c) { return reportText(monitor(localStorage, c.id).checks, c.name); },

  // "Report to property team": the checks of that property are the body; a property with nothing found says so, and the note is what matters.
  reportFrom(c) {
    this.closeMenu(false);
    const m = monitor(localStorage, c.id);
    const body = m.stats.problems ? reportText(m.checks, c.name) : `No data check found anything in the Social of ${c.name} (${m.stats.checksRun || 0} checks).`;
    this.openReport({ channelId: c.id, property: c.name, body, opener: `more-${c.id}` });
  },

  // Ending a property (or a new owner starting over). The name must be typed to end one: it cannot be undone by the person who does it.
  askEnd(c, mode) {
    this.closeMenu(false);
    this.endOpener = `more-${c.id}`;
    this.ed = { mode, id: c.id, name: c.name, typed: '', error: '' };
    this.$refs.endDlg.showModal();
    this.$nextTick(() => document.getElementById(mode === 'end' ? 'end-name' : 'end-cancel')?.focus());
  },
  get endReady() { return this.ed.mode === 'startover' || this.ed.typed.trim() === this.ed.name; },
  confirmEnd() {
    if (!this.endReady) return;
    const by = pickPersona('admin', new URLSearchParams(location.search).get('as')).name;
    const r = this.ed.mode === 'end' ? endProperty(localStorage, this.ed.id, { by, name: this.ed.name }) : startOver(localStorage, this.ed.id);
    if (!r.ok) { this.ed.error = { already_ended: 'It has already ended.', storage: 'The browser could not save this. Try again.', not_ended: 'It has not ended.', new_property: 'Add it again as a new property in Capacity.' }[r.reason] || 'It could not be done.'; return; }
    this.$refs.endDlg.close();
    this.all = overview(localStorage);
    this.copied = this.ed.mode === 'end' ? `${this.ed.name} ended. Its accounts are signed out and its Social is disconnected.` : `${this.ed.name} starts over as a new property.`;
    setTimeout(() => { this.copied = ''; }, 6000);
  },
  endKey(e) { trapTab(this.$refs.endDlg, e); },
  // Back to the card's "..." button; if that card left the list (it was just ended), to the search box, so the keyboard user is never left on the page itself.
  endClosed() { restoreFocus(this.endOpener, ['search']); },

  // The "..." menu of a card: only things that look (Admin does not change a property's Social), plus two that copy.
  toggleMenu(id) { this.menuFor === id ? this.closeMenu(true) : this.openMenu(id); },
  openMenu(id) {
    this.menuFor = id; this.menuUp = false;
    this.$nextTick(() => {
      // Under the button by default; above it when the card is near the bottom of the window and there is room above (otherwise it is cut off).
      const m = document.getElementById(`menu-${id}`), b = document.getElementById(`more-${id}`);
      if (m && b) { const r = m.getBoundingClientRect(), br = b.getBoundingClientRect(); if (r.bottom > innerHeight && br.top > r.height + 8) this.menuUp = true; }
      [...document.querySelectorAll(`#menu-${id} [role=menuitem]`)].find((i) => !i.hidden)?.focus();
    });
  },
  closeMenu(refocus) { const id = this.menuFor; this.menuFor = null; if (refocus && id) this.$nextTick(() => document.getElementById(`more-${id}`)?.focus()); },
  menuKey(e, id) {
    const items = [...document.querySelectorAll(`#menu-${id} [role=menuitem]`)].filter((i) => !i.hidden);
    const i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); this.closeMenu(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    else if (e.key === 'Tab') this.closeMenu(false);
  },
  async copyText(text, done) {
    this.closeMenu(true);
    try { await navigator.clipboard.writeText(text); this.copied = done; } catch { this.copied = 'Could not copy here.'; }
    setTimeout(() => { this.copied = ''; }, 3500);
  },
}));

start();
