// Date and time helpers. Always Intl with en-US (DESIGN.md: no hand-formatted dates).
// `tz` is optional so tests are deterministic.

// What the person chose in Settings > Date and time (24-hour clock, a time zone) is published by Settings as `ui-prefs:<portal>`.time = { h24, tz }.
// Every time shown here follows it, unless a caller passes its own `tz` (the tests do, so they stay the same on every machine).
let seen = { raw: undefined, prefs: { h24: false, tz: "" } };
export function timePrefs(storage = globalThis.localStorage, path = globalThis.location && globalThis.location.pathname) {
  try {
    const portal = String(path || "").split("/")[1];
    if (!storage || !/^(staff|client|resident|admin)$/.test(portal)) return { h24: false, tz: "" };
    const raw = storage.getItem(`ui-prefs:${portal}`);
    if (raw === seen.raw) return seen.prefs;
    const t = (JSON.parse(raw || "null") || {}).time || {};
    let tz = typeof t.tz === "string" ? t.tz : "";
    try {
      if (tz) new Intl.DateTimeFormat("en-US", { timeZone: tz });
    } catch {
      tz = "";
    } // a time zone that does not exist is ignored
    seen = { raw, prefs: { h24: t.h24 === true, tz } };
    return seen.prefs;
  } catch {
    return { h24: false, tz: "" };
  }
}

const fmt = (opts, tz) => {
  const p = tz ? { h24: false, tz: "" } : timePrefs();
  const o = { ...opts };
  if (p.h24 && o.hour) {
    o.hour = "2-digit";
    o.hourCycle = "h23";
  }
  const zone = tz || p.tz;
  return new Intl.DateTimeFormat("en-US", zone ? { ...o, timeZone: zone } : o);
};

/**
 * A time that can be shown: a number of milliseconds inside the range a date can hold, or a Date that is valid. Anything else (a stored value that is cut, text, NaN) is not a time:
 * the formatters below then say nothing, or "Unknown date", instead of throwing and taking the whole chat down with them.
 */
export const isTime = (ts) => (ts instanceof Date ? Number.isFinite(ts.getTime()) : typeof ts === "number" && Number.isFinite(ts) && Math.abs(ts) <= 8.64e15);

/** The time as ISO text for a <time datetime> (empty when it is not a time, never a throw). */
export const isoOf = (ts) => (isTime(ts) ? new Date(ts).toISOString() : "");

export const formatTime = (ts, tz) => (isTime(ts) ? fmt({ hour: "numeric", minute: "2-digit" }, tz).format(ts) : "");
export const formatFull = (ts, tz) => (isTime(ts) ? fmt({ weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }, tz).format(ts) : "");

export function dayKey(ts, tz) {
  if (!isTime(ts)) return "unknown";
  const p = Object.fromEntries(
    fmt({ year: "numeric", month: "2-digit", day: "2-digit" }, tz)
      .formatToParts(ts)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}

const dayNumber = (ts, tz) => Math.round(Date.parse(`${dayKey(ts, tz)}T00:00:00Z`) / 86400000);

export function dayLabel(ts, now, tz) {
  if (!isTime(ts)) return "Unknown date";
  if (!isTime(now)) now = Date.now();
  const diff = dayNumber(now, tz) - dayNumber(ts, tz);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const sameYear = fmt({ year: "numeric" }, tz).format(ts) === fmt({ year: "numeric" }, tz).format(now);
  return fmt(sameYear ? { weekday: "short", month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" }, tz).format(ts);
}

/** Short label for a conversation row: time today, Yesterday, weekday this week, else date. */
export function listTime(ts, now, tz) {
  if (!isTime(ts)) return "";
  if (!isTime(now)) now = Date.now();
  const diff = dayNumber(now, tz) - dayNumber(ts, tz);
  if (diff <= 0) return formatTime(ts, tz);
  if (diff === 1) return "Yesterday";
  if (diff < 7) return fmt({ weekday: "short" }, tz).format(ts);
  return fmt({ month: "short", day: "numeric" }, tz).format(ts);
}

/** "3 min", "2 h 10 min", "1 d". For queue waiting times. */
export function duration(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 60000) return "under 1 min";
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

export function formatBytes(n) {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Group an ordered message list by calendar day: [{ key, label, items }]. */
export function groupByDay(messages, now, tz) {
  const groups = [];
  for (const m of messages) {
    const key = dayKey(m.at, tz);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(m);
    else groups.push({ key, label: dayLabel(m.at, now, tz), items: [m] });
  }
  return groups;
}
