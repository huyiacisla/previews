// Structured search, e.g.   unit:304 status:open priority:high "water leak"
// Pure functions (no DOM, no store) so the rules are easy to test.
//
//   unit:<text>      unit number or building
//   status:<stage>   open | in-progress | waiting | resolved | closed (support: open | pending | resolved)
//   priority:<p>     low | normal | high | emergency
//   assignee:<name>  part of the assigned person's name
//   tag:<text>       topic or subject
//   after:<date>     YYYY-MM-DD, last activity on or after that day (UTC)
//   before:<date>    YYYY-MM-DD, last activity before the end of that day (UTC)
// Anything else is free text: every word and every "quoted phrase" must appear.

export const FILTER_KEYS = ['unit', 'status', 'priority', 'assignee', 'tag', 'after', 'before'];

const norm = (s) => String(s ?? '').toLowerCase().replace(/[\s_-]+/g, '');
const DAY = 24 * 60 * 60 * 1000;

function dayStart(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(t) ? null : t;
}

/** Split into filters, words and phrases. Unknown "key:value" pieces stay free text so nothing is silently dropped. */
export function parseQuery(input) {
  const out = { text: [], filters: {}, raw: String(input ?? '') };
  const re = /(?:(\w+):)?(?:"([^"]*)"|(\S+))/g;
  let m;
  while ((m = re.exec(out.raw))) {
    const key = m[1] && m[1].toLowerCase();
    const value = (m[2] ?? m[3] ?? '').trim();
    if (key && FILTER_KEYS.includes(key)) {
      if (value) out.filters[key] = value;
    } else {
      const piece = key && m[3] !== undefined ? `${m[1]}:${m[3]}` : value;
      if (piece) out.text.push(piece.toLowerCase());
    }
  }
  return out;
}

export const hasFilters = (q) => Object.keys(q.filters).length > 0;
export const hasText = (q) => q.text.length > 0;
export const isEmptyQuery = (q) => !hasFilters(q) && !hasText(q);

/** Does a conversation row pass every filter? `row` needs: unit, building, stage, priority, assigneeName, topic, updatedAt. */
export function matchFilters(row, q) {
  const f = q.filters;
  if (f.unit && !`${row.unit || ''} ${row.building || ''}`.toLowerCase().includes(f.unit.toLowerCase())) return false;
  if (f.status) {
    const want = norm(f.status);
    const have = [row.stage, row.status].map(norm);
    const alias = { waiting: 'waitingonresident', inprogress: 'inprogress', progress: 'inprogress' }[want] || want;
    if (!have.includes(alias) && !have.some((h) => h === want)) return false;
  }
  if (f.priority && norm(row.priority || 'normal') !== norm(f.priority)) return false;
  if (f.assignee && !String(row.assigneeName || '').toLowerCase().includes(f.assignee.toLowerCase())) return false;
  if (f.tag && !`${row.topic || ''} ${row.subject || ''}`.toLowerCase().includes(f.tag.toLowerCase())) return false;
  if (f.after) {
    const t = dayStart(f.after);
    if (t === null || row.updatedAt < t) return false;
  }
  if (f.before) {
    const t = dayStart(f.before);
    if (t === null || row.updatedAt >= t + DAY) return false;
  }
  return true;
}

/** Free-text part against a haystack string. */
export function matchText(haystack, q) {
  const h = String(haystack || '').toLowerCase();
  return q.text.every((t) => h.includes(t));
}

/** Short human labels for the chips shown under the search box. */
export function describeFilters(q) {
  return Object.entries(q.filters).map(([k, v]) => ({ key: k, value: v, label: `${k}: ${v}` }));
}

/** Remove one filter from the raw text (used by the chip's remove button). */
export function withoutFilter(raw, key) {
  return String(raw ?? '').replace(new RegExp(`(?:^|\\s)${key}:(?:"[^"]*"|\\S+)`, 'i'), '').trim();
}
