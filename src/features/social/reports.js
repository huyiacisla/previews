// Reports on posts: a resident or a Staff person tells the property team that a post should be looked at; Staff review them in Social > Moderation.
// Pure logic on a storage object, so node --test can run it. Nothing here changes a post: removing one is a separate step Staff take with the post's own delete.
//
//   eso-social-reports  [{ id, postId, by, byName, reason, note, at, status: open | dismissed | removed, closedAt?, closedBy? }]  newest last

const KEY = 'eso-social-reports';
const MAX = 500;
const NOTE_MAX = 200;

export const REASONS = [
  ['spam', 'Spam or ads'],
  ['privacy', 'Shares private details'],
  ['rude', 'Rude or harassing'],
  ['unsafe', 'Unsafe or illegal'],
  ['other', 'Something else'],
];
export const reasonLabel = (key) => (REASONS.find((r) => r[0] === key) || [0, 'Something else'])[1];

const read = (storage) => {
  try {
    const v = JSON.parse(storage.getItem(KEY));
    return Array.isArray(v) ? v.filter((r) => r && typeof r.id === 'string' && typeof r.postId === 'string' && typeof r.reason === 'string') : [];
  } catch { return []; }
};
const write = (storage, list) => {
  try { storage.setItem(KEY, JSON.stringify(list.slice(-MAX))); return true; } catch { return false; }
};

/** Report a post. One open report for each person and post; a repeat is told so and nothing is added. */
export function reportPost(storage, { postId, by, byName, reason, note = '', now = Date.now() }) {
  if (typeof postId !== 'string' || !postId || typeof by !== 'string' || !by) return { ok: false, reason: 'invalid' };
  if (!REASONS.some((r) => r[0] === reason)) return { ok: false, reason: 'no_reason' };
  const list = read(storage);
  if (list.some((r) => r.postId === postId && r.by === by && r.status === 'open')) return { ok: false, reason: 'already' };
  const report = {
    id: `rp${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    postId, by, byName: String(byName || 'A neighbor').slice(0, 60), reason, note: String(note || '').trim().slice(0, NOTE_MAX), at: now, status: 'open',
  };
  list.push(report);
  return write(storage, list) ? { ok: true, report } : { ok: false, reason: 'save_failed' };
}

/** Open reports, one entry for each post (the newest report first), with how many people reported it. */
export function openReports(storage) {
  const byPost = new Map();
  for (const r of read(storage).filter((x) => x.status === 'open').sort((a, b) => b.at - a.at)) {
    const g = byPost.get(r.postId);
    if (g) { g.count += 1; g.reports.push(r); } else byPost.set(r.postId, { postId: r.postId, count: 1, latest: r, reports: [r] });
  }
  return [...byPost.values()];
}

/** Has this person an open report on this post? (The menu says "Reported" instead of offering it again.) */
export const hasReported = (storage, postId, by) => read(storage).some((r) => r.postId === postId && r.by === by && r.status === 'open');

/** Close every open report of a post: dismissed (nothing wrong) or removed (the post was taken down). */
export function closeReports(storage, postId, action, byName, now = Date.now()) {
  if (action !== 'dismissed' && action !== 'removed') return { ok: false, reason: 'invalid' };
  const list = read(storage);
  let n = 0;
  for (const r of list) if (r.postId === postId && r.status === 'open') { r.status = action; r.closedAt = now; r.closedBy = String(byName || 'Staff').slice(0, 60); n += 1; }
  if (!n) return { ok: false, reason: 'none_open' };
  return write(storage, list) ? { ok: true, closed: n } : { ok: false, reason: 'save_failed' };
}
