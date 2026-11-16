// Social monitoring (Admin), an Alpine.js component. Structure and classes: admin/social-monitoring-content.html (x-data="socialMonitoring").
// What is shown is worked out by social/monitor.js (pure, tested in Node); this file keeps what the person chose (property, tab, search, filters,
// which replies are open) and redraws when another tab changes the feed. It never writes the feed: Admin only looks.

import { postFinding } from "../features/health/report-to-team.js";
import { reportMixin } from "../features/health/report-ui.js";
import { filterActivity, reportText } from "../features/social/diagnose.js";
import { channels, filterPosts, KINDS, monitor } from "../features/social/monitor.js";
import { component, start } from "../shared/js/alpine.js";

const ch = channels(localStorage);
const qs = new URLSearchParams(location.search);
const qs0 = new URLSearchParams(location.search);
qs.delete("tab");
const first = ch.list.some((c) => c.id === qs.get("property")) ? qs.get("property") : "main"; // "Open social" on a property's card arrives with ?property=
qs.delete("embed");
qs.delete("property");
const back = `/admin/social-management.html${qs.toString() ? `?${qs}` : ""}`;

const fmt = (at) => new Date(at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

component("socialMonitoring", () => ({
  ...reportMixin(),
  channels: ch.list.map((c) => ({ ...c, name: c.ended ? `${c.name} (ended)` : c.name })),
  channel: first,
  back,
  tab: ["posts", "activity", "moderation", "checks"].includes(qs0.get("tab")) ? qs0.get("tab") : "posts", // the menu of a property card opens Activity or Checks directly
  q: "",
  kind: "all",
  aud: "any",
  kinds: KINDS,
  aq: "",
  atype: "all",
  copied: "",
  openIds: [],
  m: monitor(localStorage, first),

  init() {
    addEventListener("storage", (e) => {
      if (!e.key || e.key.startsWith("eso-feed") || e.key.startsWith("eso-res-social:")) this.load();
    });
  },
  load() {
    this.m = monitor(localStorage, this.channel);
    this.openIds = [];
  },

  get channelName() {
    return (this.channels.find((c) => c.id === this.channel) || this.channels[0]).name;
  },
  get cards() {
    const s = this.m.stats;
    return [
      { label: "Posts", value: s.posts },
      { label: "Replies", value: s.comments },
      { label: "Reactions", value: s.reactions },
      { label: "Pauses running", value: s.active },
      { label: "Accounts under review", value: s.review },
      { label: "Data checks", value: s.problems ? `${s.problems} to look at` : "All clear", warn: s.problems > 0 },
    ];
  },
  get tabs() {
    return [
      { id: "posts", label: "Posts", n: this.m.posts.length },
      { id: "activity", label: "Activity", n: this.m.log.length },
      { id: "moderation", label: "Moderation", n: this.m.violations.length },
      { id: "checks", label: "Checks", n: this.m.stats.problems || "", warn: this.m.stats.problems > 0 },
    ];
  },
  get events() {
    return filterActivity(this.m.log, { q: this.aq, type: this.atype });
  },
  get failedChecks() {
    return this.m.checks.filter((c) => !c.ok);
  },
  get passedChecks() {
    return this.m.checks.filter((c) => c.ok);
  },
  eventLabel: (e) => ({ post: "Post", reply: "Reply", violation: "Violation", removal: "Removed" })[e.type] || e.type,
  // Tell the property team: about the checks that found something, or about one post.
  reportChecks() {
    const body = this.failedChecks.length ? reportText(this.m.checks, this.channelName) : `No data check found anything in the Social of ${this.channelName} (${this.m.checks.length} checks).`;
    this.openReport({ channelId: this.channel, property: this.channelName, body });
  },
  reportPost(p) {
    this.openReport({ channelId: this.channel, property: this.channelName, body: postFinding(p) });
  },
  async copyReport() {
    const text = reportText(this.m.checks, this.channelName);
    try {
      await navigator.clipboard.writeText(text);
      this.copied = "Copied. Paste it into the bug report.";
    } catch {
      this.copied = "Could not copy here. Select the text of the checks and copy it.";
    }
    setTimeout(() => {
      this.copied = "";
    }, 4000);
  },
  get posts() {
    return filterPosts(this.m.posts, { q: this.q, kind: this.kind, aud: this.aud });
  },
  get resultText() {
    const n = this.posts.length,
      all = this.m.posts.length;
    return n === all ? `${all} ${all === 1 ? "post" : "posts"}` : `${n} of ${all} posts`;
  },
  resetFilters() {
    this.q = "";
    this.kind = "all";
    this.aud = "any";
  },
  moveTab(d) {
    const i = this.tabs.findIndex((t) => t.id === this.tab);
    const t = this.tabs[(i + d + this.tabs.length) % this.tabs.length];
    this.tab = t.id;
    this.$nextTick(() => document.getElementById(`tab-${t.id}`)?.focus());
  },

  isOpen(id) {
    return this.openIds.includes(id);
  },
  toggle(id) {
    this.openIds = this.isOpen(id) ? this.openIds.filter((x) => x !== id) : [...this.openIds, id];
  },

  initials: (name) =>
    String(name)
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
  when: fmt,
  statusLabel: (s) => (s.status === "review" ? "Under review" : s.status === "paused" ? "Paused" : s.status === "awaiting" ? "Pause ended" : "Has strikes"),
  kindLabel: (v) =>
    v.kind === "pause" || v.kind === "light"
      ? v.active
        ? `Pause until ${v.until ? new Date(v.until).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "it ends"}`
        : "Pause ended"
      : v.kind === "warning"
        ? "Warning"
        : "Strike",
}));

start();
