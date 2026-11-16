// System health (Admin), an Alpine.js component: the checks of every module. Structure and classes: admin/health-content.html (x-data="systemHealth").
// What is shown is worked out by health/health.js (pure, tested in Node). The page only reads; "Check again" and a change in another tab run the checks again.
import { component, start } from '../alpine.js';
import { modules, overall, healthReport } from '../health/health.js';
import { reportText } from '../social/diagnose.js';
import { reportMixin } from '../health/report-ui.js';

// Links keep the query (?as, ?dark) but not "embed", and open in the whole window.
const keep = new URLSearchParams(location.search); keep.delete('embed');
const withQuery = (href) => { const [path, query = ''] = href.split('?'); const q = new URLSearchParams(query); keep.forEach((v, k) => q.set(k, v)); return `${path}${q.toString() ? `?${q}` : ''}`; };
const run = () => modules(localStorage).map((m) => ({ ...m, href: withQuery(m.link) }));

component('systemHealth', () => ({
  ...reportMixin(),
  mods: run(),
  show: 'all',
  copied: '',
  checkedAt: Date.now(),

  init() {
    addEventListener('storage', (e) => { if (!e.key || e.key.startsWith('eso-feed') || e.key.startsWith('eso-res-social') || e.key === 'eso-msg-v1' || e.key === 'capacity-state:client') this.load(); });
  },
  load() { this.mods = run(); this.checkedAt = Date.now(); },

  get total() { return overall(this.mods); },
  get cards() {
    const t = this.total;
    return [
      { label: 'Modules', value: t.modules },
      { label: 'Clear', value: t.clear },
      { label: 'With findings', value: t.failedModules, warn: t.failedModules > 0 },
      { label: 'Checks run', value: t.checks },
    ];
  },
  get summaryText() {
    const t = this.total, at = new Date(this.checkedAt).toLocaleTimeString('en-US', { timeStyle: 'short' });
    return t.failedModules === 0 ? `Every check passed (${t.checks} checks, ${at}).` : `${t.findings} ${t.findings === 1 ? 'finding' : 'findings'} in ${t.failedModules} of ${t.modules} modules (${at}). The first one to look at is listed first.`;
  },
  // The modules with errors first, then those with warnings, then the clear ones: what needs a person comes first.
  get shown() {
    const list = this.show === 'problems' ? this.mods.filter((m) => m.failed) : this.mods;
    return [...list].sort((a, b) => (b.errors > 0) - (a.errors > 0) || b.failed - a.failed);
  },
  // A Social module belongs to a property, so its team can be told; Messages is the platform's own and has no property team.
  reportModule(m) { this.openReport({ channelId: m.channel, property: m.property, body: reportText(m.checks, m.property) }); },
  async copyReport() {
    try { await navigator.clipboard.writeText(healthReport(this.mods)); this.copied = 'Copied. Paste it into the bug report.'; } catch { this.copied = 'Could not copy here. Select the text and copy it.'; }
    setTimeout(() => { this.copied = ''; }, 4000);
  },
}));

start();
