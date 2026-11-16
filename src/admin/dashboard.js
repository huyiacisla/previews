// Admin Command Center, an Alpine.js component. The page's structure is partials/admin-dashboard.html (x-data="adminDashboard");
// what it shows is worked out in admin/overview.js (pure, tested in Node). This file only joins the two: it reads the store, keeps
// the result where the partial can see it, and reads it again whenever the store changes.
// NOTE: BRIEF.md allows no JS besides preview.js; like the Messages and Notifications pages this is a deliberate exception.
// The captured file is not edited: its sidebar and header stay, only what <main> shows is replaced when the page opens.
import { component, start } from '../shared/js/alpine.js';
import { createStore } from '../features/messaging/store.js';
import { createTransport } from '../features/messaging/transport.js';
import { pickPersona } from '../features/messaging/personas.js';
import { listTime } from '../features/messaging/format.js';
import { adminOverview, adminView, PLATFORM, HEALTH, ACTIVITY } from './overview.js';

const root = document.getElementById('adm-root');
const main = document.getElementById('main-content');
// Only on the dashboard itself: Notifications and Settings include the same captured page for its frame, and preview.js puts their own content in <main>.
if (root && main && /^\/admin\/dashboard(\.html)?$/.test(location.pathname)) {
  const search = location.search; // ?as=… picks the person, ?dark the theme: every link keeps it
  const me = pickPersona('admin', new URLSearchParams(search).get('as'));
  const store = createStore({ transport: createTransport() }); // kept outside the component: Alpine must not wrap the store in its reactivity
  const links = { tickets: `/admin/tickets.html${search}`, messages: `/admin/messages.html${search}` };

  component('adminDashboard', () => ({
    links,
    date: new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(Date.now()),
    // sample sections: they do not change while the page is open
    platform: PLATFORM,
    health: HEALTH,
    activity: ACTIVITY,
    expanded: {}, // health groups showing all their items
    // live sections: replaced by refresh()
    o: null,
    tiles: [], stages: [], queueRows: [], queueSub: '', queueMore: '', msgRows: [], msgSub: '', emergencyHref: '', emergencyTitle: '', emergencyText: '',

    get q() { return this.o.queue; },

    init() {
      this.refresh();
      store.subscribe(() => this.refresh()); // a ticket or a message from another tab or page redraws the live sections at once
      setInterval(() => this.refresh(), 60000); // "waiting 5 min" keeps counting
    },

    refresh() {
      const now = Date.now();
      this.o = adminOverview(store, me, now);
      Object.assign(this, adminView(this.o, now, links, listTime));
    },

    /** The Platform alerts tile points inside this page: scroll there and move the focus, so a keyboard user lands on it too. */
    toHealth(e) {
      e.preventDefault();
      const h = document.getElementById('adm-health-h');
      h.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      h.focus({ preventScroll: true });
    },
  }));

  // The root goes where it belongs before Alpine draws it, so nothing is drawn twice.
  main.replaceChildren(root);
  root.hidden = false;
  document.documentElement.removeAttribute('data-eso-wait');
  start();
}
