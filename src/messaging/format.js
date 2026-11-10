// Date and time helpers. Always Intl with en-US (DESIGN.md: no hand-formatted dates).
// `tz` is optional so tests are deterministic.

const fmt = (opts, tz) => new Intl.DateTimeFormat('en-US', tz ? { ...opts, timeZone: tz } : opts);

export const formatTime = (ts, tz) => fmt({ hour: 'numeric', minute: '2-digit' }, tz).format(ts);
export const formatFull = (ts, tz) => fmt({ weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }, tz).format(ts);

export function dayKey(ts, tz) {
  const p = Object.fromEntries(fmt({ year: 'numeric', month: '2-digit', day: '2-digit' }, tz).formatToParts(ts).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

const dayNumber = (ts, tz) => Math.round(Date.parse(`${dayKey(ts, tz)}T00:00:00Z`) / 86400000);

export function dayLabel(ts, now, tz) {
  const diff = dayNumber(now, tz) - dayNumber(ts, tz);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  const sameYear = fmt({ year: 'numeric' }, tz).format(ts) === fmt({ year: 'numeric' }, tz).format(now);
  return fmt(sameYear ? { weekday: 'short', month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' }, tz).format(ts);
}

/** Short label for a conversation row: time today, Yesterday, weekday this week, else date. */
export function listTime(ts, now, tz) {
  const diff = dayNumber(now, tz) - dayNumber(ts, tz);
  if (diff <= 0) return formatTime(ts, tz);
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return fmt({ weekday: 'short' }, tz).format(ts);
  return fmt({ month: 'short', day: 'numeric' }, tz).format(ts);
}

/** "3 min", "2 h 10 min", "1 d". For queue waiting times. */
export function duration(ms) {
  if (ms < 60000) return 'under 1 min';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

export function formatBytes(n) {
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
