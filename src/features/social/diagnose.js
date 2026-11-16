// Social: what happened, and whether the data is sound. For Admin's Social monitoring. Pure logic, no DOM, so node --test can run it.
//
//  activity(storage)  the log: every post, reply, violation and removal in one list, newest first, each with the id to look it up by.
//  diagnose(storage)  the checks: what is wrong with the data (a broken feed, a reply without its post, two posts with one id…), where, and how to fix it.
//
// Both only read. The point is to make an error easy to find: a bug report that says "post p7, reply r12, 14 Nov 19:12" is one a developer can use.

import { PERSONAS } from '../messaging/personas.js';
import { residentKey } from './residents.js';

export const MAX_PINNED = 3;
export const MAX_POST = 1000;
const AUDIENCES = ['all', 'residents', 'staff'];
const HOUR = 3600000;

const NAMES = {
  dana: 'Noor Hassan', luis: 'Luis Ortega', kim: 'Kim Tran', me: 'Property team',
  alex: 'Alex Rivera', priya: 'Nadia Shah', marcus: 'Victor Lee', rena: 'Rena Okafor',
};
const who = (key) => {
  if (typeof key === 'string' && key.startsWith('res:')) { const r = PERSONAS.find((p) => p.id === key.slice(4)); return r ? r.name : 'Resident'; }
  return NAMES[key] || (key ? String(key) : 'Unknown');
};

/** The feed as stored: { state: 'none' | 'ok' | 'bad', feed?, why? }. 'none' is a property that has not started yet; 'bad' is what a developer must look at. */
export function readRaw(storage) {
  let text = null;
  try { text = storage.getItem('eso-feed'); } catch { return { state: 'bad', why: 'The browser would not let the page read its storage.' }; }
  if (text == null) return { state: 'none' };
  try {
    const feed = JSON.parse(text);
    if (!feed || typeof feed !== 'object' || !Array.isArray(feed.posts)) return { state: 'bad', why: 'It has no list of posts.' };
    return { state: 'ok', feed };
  } catch {
    return { state: 'bad', why: 'It is not valid JSON.' };
  }
}

// Every comment of the feed, with the post it sits under and the comment it answers (`re`), in one flat list.
function commentsOf(feed) {
  const out = [];
  const walk = (list, post, parent) => {
    for (const r of Array.isArray(list) ? list : []) {
      if (!r || typeof r !== 'object') continue;
      out.push({ id: r.id == null ? '' : String(r.id), post: String(post.id), parent: r.re != null ? String(r.re) : parent, a: r.a, t: Number(r.t), txt: String(r.txt == null ? '' : r.txt) });
      walk(r.rs, post, r.id == null ? parent : String(r.id));
    }
  };
  for (const p of feed.posts) if (p && typeof p === 'object') walk(p.rs, p, null);
  return out;
}

function residentReplies(storage) {
  const out = [];
  for (const p of PERSONAS) {
    if (p.role !== 'resident') continue;
    let s = null;
    try { s = JSON.parse(storage.getItem(residentKey(p.id))); } catch { continue; }
    if (!s || typeof s !== 'object' || !s.replies || typeof s.replies !== 'object') continue;
    for (const [post, list] of Object.entries(s.replies)) for (const r of Array.isArray(list) ? list : []) if (r && typeof r === 'object') out.push({ id: String(r.id), post: String(post), parent: r.re != null ? String(r.re) : null, a: `res:${p.id}`, t: Number(r.t), txt: String(r.txt || '') });
  }
  return out;
}

const snippet = (s, n = 90) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

/** The log. Each event: { id, type: 'post' | 'reply' | 'violation' | 'removal', at, who, text, postId, ref }. */
export function activity(storage) {
  const r = readRaw(storage);
  if (r.state !== 'ok') return [];
  const feed = r.feed;
  const events = [];
  for (const p of feed.posts) {
    if (!p || p.id == null) continue;
    events.push({ id: `post-${p.id}`, type: 'post', at: Number(p.t) || 0, who: who(p.a), text: snippet(p.txt), postId: String(p.id), ref: `Post ${p.id}`, kind: p.ann || p.src === 'ann' ? 'Announcement' : p.src === 'com' ? 'Community post' : p.src === 'promo' ? 'Promotion' : 'Staff discussion' });
  }
  const all = [...commentsOf(feed), ...residentReplies(storage)];
  for (const c of all) events.push({ id: `reply-${c.post}-${c.id}`, type: 'reply', at: c.t || 0, who: who(c.a), text: snippet(c.txt), postId: c.post, ref: `Reply ${c.id} on post ${c.post}` });
  for (const v of Array.isArray(feed.vio) ? feed.vio : []) {
    if (!v || typeof v !== 'object') continue;
    events.push({ id: `vio-${v.id}`, type: 'violation', at: Number(v.t) || 0, who: v.name || who(v.who), text: `${v.kind === 'warning' ? 'Warning' : v.kind === 'pause' || v.kind === 'light' ? 'Pause' : 'Strike'} recorded${v.note ? `: ${snippet(v.note, 70)}` : ''}`, postId: null, ref: `Violation ${v.id}` });
  }
  const removed = feed.removed && typeof feed.removed === 'object' ? feed.removed : {};
  for (const [id, info] of Object.entries(removed)) {
    const at = info && typeof info === 'object' ? Number(info.t || info.at) || 0 : 0;
    events.push({ id: `removal-${id}`, type: 'removal', at, who: info && info.by ? String(info.by) : 'Staff', text: 'A reply was removed by Staff', postId: null, ref: `Reply ${id}` });
  }
  return events.sort((a, b) => b.at - a.at);
}

/** Search (who, text, id) and type; the order is kept. */
export function filterActivity(list, { q = '', type = 'all' } = {}) {
  const needle = String(q).trim().toLowerCase();
  return list.filter((e) => (type === 'all' || e.type === type) && (!needle || e.who.toLowerCase().includes(needle) || e.text.toLowerCase().includes(needle) || e.ref.toLowerCase().includes(needle)));
}

/**
 * The checks. Each: { id, label, severity: 'error' | 'warning', found: [{ where, detail }], fix } — `found` is empty when the check passed.
 * `fix` says what to do about it (the same words for every finding of that check).
 */
export function diagnose(storage, now = Date.now()) {
  const raw = readRaw(storage);
  const checks = [];
  const add = (id, label, severity, found, fix) => checks.push({ id, label, severity, found, fix, ok: found.length === 0 });

  add('feed-readable', 'The feed can be read', 'error', raw.state === 'bad' ? [{ where: 'Storage key "eso-feed"', detail: raw.why }] : [],
    'Remove the key "eso-feed" in the browser\'s storage: the sample feed is made again on the next visit. A real app needs the post that wrote the bad value (check the last change to the feed writer).');

  // The resident data can be unreadable even when the feed is fine.
  const badRes = [];
  for (const p of PERSONAS) {
    if (p.role !== 'resident') continue;
    let text = null;
    try { text = storage.getItem(residentKey(p.id)); } catch { continue; }
    if (text == null) continue;
    try { const s = JSON.parse(text); if (!s || typeof s !== 'object') throw new Error('not an object'); } catch { badRes.push({ where: `Storage key "${residentKey(p.id)}"`, detail: `${p.name}'s likes and replies cannot be read, so they are left out of every count.` }); }
  }
  add('resident-data-readable', 'What residents did can be read', 'error', badRes, 'Remove the named key: the resident starts again with no likes or replies. Find the code that wrote it if it comes back.');

  if (raw.state === 'ok') {
    const feed = raw.feed;
    const posts = feed.posts.filter((p) => p && typeof p === 'object');
    const comments = commentsOf(feed);
    const resident = residentReplies(storage);

    const seen = new Map();
    const dupPosts = [];
    for (const p of posts) { const id = String(p.id); if (seen.has(id)) dupPosts.push({ where: `Post ${id}`, detail: 'Two posts have this id: one of them hides the other in lists keyed by id.' }); seen.set(id, true); }
    const seenC = new Set();
    const dupComments = [];
    for (const c of comments) { const k = `${c.post}/${c.id}`; if (c.id && seenC.has(k)) dupComments.push({ where: `Reply ${c.id} on post ${c.post}`, detail: 'Two replies of one post have this id.' }); seenC.add(k); }
    add('unique-ids', 'Every post and reply has its own id', 'error', [...dupPosts, ...dupComments], 'Give the newer one a new id where it is made (ids must come from one counter or from the time plus a random part).');

    const noFields = [];
    for (const p of feed.posts) {
      if (!p || typeof p !== 'object') { noFields.push({ where: 'A post', detail: 'It is not an object.' }); continue; }
      if (p.id == null || p.id === '') noFields.push({ where: `Post "${snippet(p.txt, 30)}"`, detail: 'It has no id.' });
      else if (!String(p.txt == null ? '' : p.txt).trim()) noFields.push({ where: `Post ${p.id}`, detail: 'It has no text.' });
      else if (!p.a) noFields.push({ where: `Post ${p.id}`, detail: 'It has no author.' });
    }
    add('post-fields', 'Every post has an id, a text and an author', 'warning', noFields, 'Find where the post was written and check it sets all three; the page shows a post like this as written by "Unknown" or not at all.');

    const longPosts = posts.filter((p) => String(p.txt || '').length > MAX_POST).map((p) => ({ where: `Post ${p.id}`, detail: `${String(p.txt).length} characters; the most is ${MAX_POST}.` }));
    add('post-length', `No post is longer than ${MAX_POST} characters`, 'warning', longPosts, 'The writer must cut the text at the limit (a value set by script or pasted skips the box\'s own limit).');

    const badAud = posts.filter((p) => p.aud != null && !AUDIENCES.includes(p.aud)).map((p) => ({ where: `Post ${p.id}`, detail: `Audience "${p.aud}" is not one of everyone, residents or staff.` }));
    add('audience', 'Every post has a known audience', 'warning', badAud, 'The page treats an unknown audience as everyone, so a post meant for staff can be shown to residents. Set it to one of: all, residents, staff.');

    const staffToResidents = posts.filter((p) => p.aud === 'staff' && resident.some((r) => r.post === String(p.id))).map((p) => ({ where: `Post ${p.id}`, detail: 'A post kept for staff has a resident reply, so a resident saw it.' }));
    add('staff-only-private', 'Posts kept for staff were not seen by residents', 'error', staffToResidents, 'Check the resident app filters by audience before it offers a reply box, and remove the resident reply.');

    const pinned = posts.filter((p) => p.pin);
    add('pinned-limit', `At most ${MAX_PINNED} posts are pinned`, 'warning', pinned.length > MAX_PINNED ? [{ where: 'Pinned posts', detail: `${pinned.length} are pinned: ${pinned.map((p) => p.id).join(', ')}.` }] : [], `Unpin the oldest ones; the writer must refuse the ${MAX_PINNED + 1}th pin.`);

    const postIds = new Set(posts.map((p) => String(p.id)));
    const orphans = [];
    for (const c of resident) if (!postIds.has(c.post)) orphans.push({ where: `Reply ${c.id} (${who(c.a)})`, detail: `It answers post ${c.post}, which is not in the feed.` });
    for (const c of comments) if (c.parent && !comments.some((x) => x.id === c.parent) && !resident.some((x) => x.id === c.parent)) orphans.push({ where: `Reply ${c.id} on post ${c.post}`, detail: `It answers reply ${c.parent}, which is not there.` });
    add('reply-parent', 'Every reply has the post or reply it answers', 'warning', orphans, 'A post that was deleted leaves its replies behind. Delete them with the post, or keep a placeholder (moderation.js settle()).');

    const odd = [];
    for (const p of posts) { const t = Number(p.t); if (!Number.isFinite(t) || t <= 0) odd.push({ where: `Post ${p.id}`, detail: 'It has no usable time.' }); else if (t > now + HOUR) odd.push({ where: `Post ${p.id}`, detail: 'Its time is in the future.' }); }
    for (const c of [...comments, ...resident]) { if (!Number.isFinite(c.t) || c.t <= 0) odd.push({ where: `Reply ${c.id} on post ${c.post}`, detail: 'It has no usable time.' }); else if (c.t > now + HOUR) odd.push({ where: `Reply ${c.id} on post ${c.post}`, detail: 'Its time is in the future.' }); }
    add('times', 'Every post and reply has a sensible time', 'warning', odd, 'Set the time when it is written ("Date.now()"), not from a typed or copied value; lists are ordered by it.');

    const early = [];
    // Two posts with one id (reported above) must not make a good reply look old: the earliest of them is the one the reply answers.
    const postTime = new Map();
    for (const p of posts) { const id = String(p.id), t = Number(p.t); if (!postTime.has(id) || t < postTime.get(id)) postTime.set(id, t); }
    for (const c of [...comments, ...resident]) { const pt = postTime.get(c.post); if (pt && c.t && c.t < pt) early.push({ where: `Reply ${c.id} on post ${c.post}`, detail: 'It is older than the post it answers.' }); }
    add('reply-order', 'No reply is older than its post', 'warning', early, 'Replies must take their time from the moment they are written; check the sample data and any import.');
  }
  return checks;
}

/** The number of checks that found something, and how many were run. */
export function summary(checks) {
  const failed = checks.filter((c) => !c.ok);
  return { run: checks.length, failed: failed.length, errors: failed.filter((c) => c.severity === 'error').length, findings: failed.reduce((n, c) => n + c.found.length, 0) };
}

/** The checks as plain text, to paste in a bug report. */
export function reportText(checks, property, now = Date.now()) {
  const s = summary(checks);
  const head = `Social checks for ${property}, ${new Date(now).toISOString()}: ${s.failed === 0 ? `all ${s.run} passed` : `${s.failed} of ${s.run} found something`}`;
  const body = checks.filter((c) => !c.ok).map((c) => `- [${c.severity}] ${c.label}\n${c.found.map((f) => `    ${f.where}: ${f.detail}`).join('\n')}\n    Fix: ${c.fix}`);
  return [head, ...body].join('\n');
}
