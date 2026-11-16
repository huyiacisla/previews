// What the Notifications page draws, as plain values. No DOM and no Alpine: the component (notifications/app.js) holds the result and
// the partial reads it, so the wording, the counts, the grouping and the links are tested in Node.
import { CATEGORIES, counts, groupByDay, isRead, query, TONES } from "./store.js";

export const PAGE = 25;
export const SORTS = { newest: "Newest first", oldest: "Oldest first", unread: "Unread first" };
export const ICONS = {
  messages: "i-message",
  requests: "i-clipboard",
  violations: "i-alert",
  parking: "i-parking",
  plan: "i-gauge",
  properties: "i-building",
  reports: "i-chart",
  system: "i-shield",
  residents: "i-users",
  promotions: "i-tag",
  community: "i-megaphone",
  billing: "i-card",
};

const DEFAULT_TIME = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const DEFAULT_FULL = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

/** Where a notification opens: its page, and for a live chat or Social item the exact chat (#/c/<id>) or post (#/post/<id>) on that page. */
export function linkFor(n, dest = {}) {
  const base = n.dest && dest[n.dest] ? dest[n.dest] : "";
  if (!base || base.includes("#")) return base;
  if (n.live === "messenger" && n.convId) return `${base}#/c/${encodeURIComponent(n.convId)}`;
  if (n.live === "social" && n.post) return `${base}#/post/${encodeURIComponent(n.post)}`;
  return base;
}

/** The two time formats of a row, for the person's choice in Settings > Date and time: { h24, tz } (a time zone that does not exist is ignored). */
export function timeFormats(t = {}) {
  const base = {};
  if (t && t.tz) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: t.tz });
      base.timeZone = t.tz;
    } catch {
      /* unknown zone: the device's */
    }
  }
  const hc = t && t.h24 ? { hourCycle: "h23" } : {};
  return {
    timeFmt: new Intl.DateTimeFormat("en-US", { ...base, hour: t && t.h24 ? "2-digit" : "numeric", minute: "2-digit", ...hc }),
    fullFmt: new Intl.DateTimeFormat("en-US", { ...base, dateStyle: "medium", timeStyle: "short", ...hc }),
  };
}

export const isFiltered = (ui) => ui.q.trim() !== "" || ui.status !== "all" || ui.cat !== "all" || ui.prop !== "all";

/** The filters that live in the Filters panel and differ from their default: [{ key, label }]. */
export function filtersInUse(ui) {
  return [
    ...(ui.cat !== "all" ? [{ key: "cat", label: `Category: ${CATEGORIES[ui.cat]}` }] : []),
    ...(ui.prop !== "all" ? [{ key: "prop", label: `Property: ${ui.prop}` }] : []),
    ...(ui.sort !== "newest" ? [{ key: "sort", label: SORTS[ui.sort] }] : []),
  ];
}

/**
 * @param all   the notifications (buildAll)
 * @param map   the person's read marks (readMap)
 * @param ui    { q, status, cat, prop, sort, shown }
 * @param now   time in ms (anchors "Today" and "Yesterday")
 * @param opts  { dest: { messages: '/…' }, multiProp: boolean }
 */
export function notificationsView(all, map, ui, now, { dest = {}, multiProp = false, time } = {}) {
  const { timeFmt, fullFmt } = time && (time.h24 || time.tz) ? timeFormats(time) : { timeFmt: DEFAULT_TIME, fullFmt: DEFAULT_FULL };
  const list = query(all, map, ui);
  const shown = list.slice(0, ui.shown);
  const total = counts(all, map);
  const filtered = isFiltered(ui);

  // tabs: each with its count (the counts ignore the status itself but follow search, category and property)
  const base = counts(query(all, map, { ...ui, status: "all" }), map);
  const tabs = [
    ["all", "All", base.total],
    ["unread", "Unread", base.unread],
    ["read", "Read", base.read],
  ].map(([id, label, n]) => ({ id, label, n, selected: ui.status === id, aria: `${label}, ${n}` }));

  const row = (n) => {
    const read = isRead(n, map);
    return {
      id: n.id,
      read,
      tone: TONES[n.cat],
      icon: ICONS[n.cat] || "i-bell",
      title: n.title,
      detail: n.detail,
      href: linkFor(n, dest),
      cat: CATEGORIES[n.cat],
      prop: multiProp && n.prop ? n.prop : "", // one property: naming it on every row says nothing
      time: timeFmt.format(n.ts),
      timeTitle: fullFmt.format(n.ts),
      iso: new Date(n.ts).toISOString(),
      toggleLabel: `${read ? "Mark as unread" : "Mark as read"}: ${n.title}`,
      toggleTitle: read ? "Mark as unread" : "Mark as read",
      toggleIcon: read ? "i-mail" : "i-check", // the icon shows what a click does
    };
  };
  // By date for newest and oldest; "unread first" is grouped by state instead of by day.
  const raw =
    ui.sort === "unread"
      ? [
          { label: "Unread", items: shown.filter((n) => !isRead(n, map)) },
          { label: "Read", items: shown.filter((n) => isRead(n, map)) },
        ].filter((g) => g.items.length)
      : groupByDay(shown, now);
  const groups = raw.map((g) => ({ label: g.label, n: g.items.length, items: g.items.map(row) }));

  // Nothing unread is good news, not "no match": say so, and say which view it is.
  const nothingUnread = !filtered || (ui.status === "unread" && !ui.q.trim());
  const everywhere = ui.cat === "all" && ui.prop === "all";
  const empty = {
    show: shown.length === 0,
    icon: nothingUnread ? "i-check-all" : "i-search",
    title: !nothingUnread ? "No notifications match" : everywhere ? "You are all caught up" : "Nothing unread in this view",
    text: !nothingUnread
      ? "Try a different word, or clear the filters to see everything."
      : everywhere
        ? "Nothing needs your attention right now."
        : "Everything here has been read. Clear the filters to see all notifications.",
    clearable: filtered,
  };

  const more = list.length - shown.length;
  const pending = list.filter((n) => !isRead(n, map));
  const active = filtersInUse(ui);
  return {
    summary: total.unread === 0 ? "You are all caught up" : `${total.unread} need attention`,
    tabs,
    chips: active,
    filterCount: active.length,
    filtersLabel: active.length ? `Filters, ${active.length} in use` : "Filters",
    isFiltered: filtered,
    groups,
    rows: shown.length,
    empty,
    count:
      list.length === 0
        ? ""
        : filtered
          ? `${list.length} ${list.length === 1 ? "result" : "results"}${shown.length < list.length ? `, showing ${shown.length}` : ""}`
          : `Showing ${shown.length} of ${list.length}`,
    more: { show: more > 0, label: more > 0 ? `Show ${Math.min(PAGE, more)} more (${shown.length} of ${list.length})` : "" },
    markAll: {
      ids: pending.map((n) => n.id),
      disabled: pending.length === 0,
      label: filtered ? `Mark ${pending.length} as read` : "Mark all as read",
      title: pending.length ? `Mark ${pending.length} ${pending.length === 1 ? "notification" : "notifications"} as read` : "Nothing unread here",
    },
  };
}
