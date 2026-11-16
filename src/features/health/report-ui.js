// The "Report to property team" window for the Admin pages (an Alpine mixin). The markup is partials/report-dialog.html, included inside the page's
// x-data element; the logic that composes and sends the message is health/report-to-team.js (pure, tested). One person, one dialog: a page opens it
// with openReport({ channelId, property, body }) and the rest is here.
import { createStore } from '../messaging/store.js';
import { createTransport } from '../messaging/transport.js';
import { pickPersona } from '../messaging/personas.js';
import { composeReport, teamContact, reportToTeam } from './report-to-team.js';
import { trapTab, restoreFocus } from '../../shared/js/dialog-trap.js';

const qs = new URLSearchParams(location.search);
const keep = new URLSearchParams(qs); keep.delete('embed'); keep.delete('property'); keep.delete('tab');
const search = keep.toString() ? `?${keep}` : '';

let reportOpener = null;
let store = null; // made the first time something is sent: the page does not need Messages until then
const messages = () => store || (store = createStore({ transport: createTransport() }));

export { trapTab };

export function reportMixin() {
  return {
    rd: { channelId: 'main', property: '', body: '', note: '', to: null, preview: '', cut: false, error: '', sending: false, sentConv: null, messagesHref: '' },

    openReport({ channelId, property, body, opener }) {
      // Where the focus goes back to when the window closes: the button it was opened from (a menu item is gone by then, so the caller can name another).
      reportOpener = opener || document.activeElement; // kept outside the component: Alpine would wrap a page element in a proxy and break its methods
      const admin = pickPersona('admin', qs.get('as'));
      this.rd = { channelId, property, body, note: '', to: teamContact(channelId), admin, preview: '', cut: false, error: '', sending: false, sentConv: null, messagesHref: '' };
      this.refreshPreview();
      this.$refs.reportDlg.showModal();
      this.$nextTick(() => document.getElementById(this.rd.to ? 'report-note' : 'report-cancel')?.focus());
    },
    refreshPreview() {
      const c = composeReport({ property: this.rd.property, from: this.rd.admin && this.rd.admin.name, note: this.rd.note, body: this.rd.body });
      this.rd.preview = c.text; this.rd.cut = c.cut;
    },
    closeReport() { this.$refs.reportDlg.close(); },
    reportClosed() { this.rd.sending = false; restoreFocus(reportOpener); },

    sendReport() {
      if (!this.rd.to || this.rd.sending || this.rd.sentConv) return;
      this.rd.sending = true; this.rd.error = '';
      const r = reportToTeam(messages(), { admin: this.rd.admin, channelId: this.rd.channelId, property: this.rd.property, note: this.rd.note, body: this.rd.body });
      this.rd.sending = false;
      if (!r.ok) { this.rd.error = r.message; return; }
      this.rd.sentConv = r.convId;
      this.rd.messagesHref = `/admin/messages.html${search}#/c/${r.convId}`;
      this.$nextTick(() => document.getElementById('report-cancel')?.focus());
    },
    async copyReportText() {
      try { await navigator.clipboard.writeText(this.rd.preview); this.rd.error = ''; } catch { this.rd.error = 'Could not copy here. Select the text above and copy it.'; }
    },

    // A native dialog in a frame lets Tab leave the box, so it is wrapped by hand (docs/qa/09-social-admin-ghi-chu.md, lesson 8).
    reportKey(e) { trapTab(this.$refs.reportDlg, e); },
  };
}
