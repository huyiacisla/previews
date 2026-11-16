// Social as the Staff app sees it. Pure logic, no DOM, so node --test can run it.
//
// Staff see the whole timeline (posts for everyone, for residents, and the ones kept for staff), like, reply, and post. What they write goes into
// the same "eso-feed" the Resident app reads, so a post for "all" or "residents" shows up there, and a post for "staff" never does.
// The shape of "eso-feed" is the one the account-settings prototype keeps:
//   { posts: [{ id, a, t, aud, ann, src, pin, txt, img, likes, lk, rs: [reply] }], follow, seen, ... }   reply: { id, a, t, txt, likes, rs }
// "a" is the author key; "me" is whoever is using the Staff app. (The `nr` mark the prototype keeps on a comment is no longer used.)
// Fields this file does not know are kept as they are when it writes the feed back.
//
// What a resident did in Social (their likes and replies) is kept by that resident under "eso-res-social:<id>", and the Resident app never writes
// Staff's data. Staff READ those keys here, and only read them: a resident's reply shows in the post it answers, and their reactions count. A Staff answer to a resident's reply is kept in the feed, as a reply of the post with "re": the
// resident reply it answers.

import { PERSONAS } from '../messaging/personas.js';
import { feedBy, byOf, canon, feedShares, reactorsOf, isReaction } from './reactions.js';
import { residentActivity, reactionOf, followersOf, residentKey, isPerson } from './residents.js';
import { nest } from './threads.js';
import { safeBg, checkImages } from './images.js';
import { allowed, notAllowed, actionOfKind } from './roles.js';
import { settle, liveCounts, checkViolation, reasonLabel, reasonOf, currentStrikesIn, foldersIn, strikesOf, holdIn, rulesOf, checkRules, isHold } from './moderation.js';

export const KEY = { feed: 'eso-feed' };

const PEOPLE = {
  dana: ['Noor Hassan', 'Staff'], luis: ['Luis Ortega', 'Staff'], kim: ['Kim Tran', 'Staff'],
  alex: ['Alex Rivera', 'Resident'], priya: ['Nadia Shah', 'Resident'], marcus: ['Victor Lee', 'Resident'], rena: ['Rena Okafor', 'Resident'],
};
// How often the sample posts were seen. A timeline kept by an earlier visit has no such numbers, so these fill in (a real app counts views).
const SAMPLE_VIEWS = { p1: 523, p2: 349, p4: 239, p5: 241, p9: 164 };
export const AUDIENCES = { all: 'Everyone', residents: 'Residents', staff: 'Staff only' };
export const MAX_POST = 1000;
export const MAX_REPLY = 500;

const person = (key, meName) => {
  if (key === 'me') return { name: meName, role: 'Staff' };
  if (typeof key === 'string' && key.startsWith('res:')) { const r = PERSONAS.find((p) => p.id === key.slice(4)); return { name: r ? r.name : 'Neighbor', role: 'Resident' }; }
  return PEOPLE[key] ? { name: PEOPLE[key][0], role: PEOPLE[key][1] } : { name: 'Neighbor', role: 'Resident' };
};

function readFeed(storage) {
  try { const f = JSON.parse(storage.getItem(KEY.feed)); return f && Array.isArray(f.posts) ? f : { posts: [] }; } catch { return { posts: [] }; }
}
function writeFeed(storage, feed) {
  try { storage.setItem(KEY.feed, JSON.stringify(feed)); return true; } catch { return false; }
}


const isAnn = (p) => !!(p.ann || p.src === 'ann');

// The comments of one post as Staff read them, in reading order with the answers under them (threads.js): the ones in the feed, Staff's answer to a
// resident (`re`: the resident comment it answers), and what residents wrote, which may answer any comment. Each one says who reacted to it, like a post
// does.
function commentsOf(p, feed, residents, meName) {
  const nodes = [];
  const walk = (list, parent) => {
    for (const r of list || []) {
      if (!r || r.id == null) continue;
      nodes.push({ id: String(r.id), a: r.a, key: r.a === 'me' ? 'me' : canon(r.a), parent: r.re ? String(r.re) : parent, t: Number(r.t) || 0, txt: String(r.txt || ''), rb: r.rb, del: r.del, ed: r.ed });
      walk(r.rs, String(r.id));
    }
  };
  walk(p.rs, null);
  for (const res of residents) {
    for (const r of res.replies[String(p.id)] || []) nodes.push({ id: String(r.id), a: `res:${res.id}`, key: `res:${res.id}`, parent: r.re ? String(r.re) : null, t: Number(r.t) || 0, txt: String(r.txt || ''), del: r.del, ed: r.ed });
  }
  // What was deleted or removed leaves a placeholder only where there are answers under it; the rest is gone (moderation.js).
  const list = nest(settle(nodes, { removed: feed.removed && typeof feed.removed === 'object' ? feed.removed : {} }));
  const mrx = feed.mrx && typeof feed.mrx === 'object' ? feed.mrx : {};
  const hid = new Set(Array.isArray(feed.hid) ? feed.hid.map(String) : []);
  const violated = new Set((Array.isArray(feed.vio) ? feed.vio : []).map((v) => String(v.comment)));
  return liveCounts(list.map((n) => {
    const a = person(n.a, meName);
    const named = [];
    for (const [key, kind] of Object.entries(byOf(n.rb))) { if (key !== 'me') { const who = person(key, meName); named.push({ key: canon(key), name: who.name, role: who.role, kind }); } }
    for (const res of residents) { const k = reactionOf(res, n.id); if (k) named.push({ key: `res:${res.id}`, name: res.name, role: 'Resident', kind: k }); }
    const mine = isReaction(mrx[n.id]) ? mrx[n.id] : null;
    if (mine) named.push({ key: 'me', name: meName, role: 'Staff', kind: mine, you: true });
    const who = reactorsOf(named);
    const ok = n.state === 'ok';
    return {
      id: n.id, key: canon(n.a), name: a.name, role: a.role, t: n.t, text: ok ? n.txt : '', depth: n.depth, parentId: n.parentId, replyCount: n.replyCount,
      myReaction: mine, reactions: who.counts, reactionTotal: who.total, reactors: who.people,
      state: n.state, edited: ok && !!n.ed, hidden: hid.has(n.id),
      // What this Staff person may do with it: change or delete their own comment; hide, remove, or record a violation on somebody else's.
      canEdit: ok && n.a === 'me', canDelete: ok && n.a === 'me', canHide: ok && n.a !== 'me', canRemove: ok && n.a !== 'me', canViolate: ok && a.role === 'Resident' && !violated.has(n.id), violated: violated.has(n.id),
    };
  }));
}

/** Every post, pinned first then newest. `meName` is the name the Staff person goes by. */
export function timeline(storage, meName) {
  const residents = residentActivity(storage);
  const feed = readFeed(storage);
  const myShares = new Set((Array.isArray(feed.myRp) ? feed.myRp : []).map(String)); // the posts this Staff person shared
  return feed.posts
    .filter((p) => p && p.id)
    .map((p) => {
      const a = person(p.a, meName);
      const replies = commentsOf(p, feed, residents, meName);
      // Shares are people too: the ones the feed names, each resident who shared it, and this Staff person.
      const sharers = feedShares(p).filter((k) => k !== 'me').map((k) => ({ name: person(k, meName).name, role: person(k, meName).role }));
      for (const res of residents) if (res.shares.has(String(p.id))) sharers.push({ name: res.name, role: 'Resident' });
      const iShared = myShares.has(String(p.id));
      if (iShared) sharers.unshift({ name: meName, role: 'Staff', you: true });
      // The reactions are the people who gave them: the ones the feed names, each resident who reacted, and this Staff person. The count is the list.
      const named = [];
      for (const [key, kind] of Object.entries(feedBy(p))) { if (key !== 'me') { const who = person(key, meName); named.push({ key: canon(key), name: who.name, role: who.role, kind }); } }
      for (const res of residents) { const k = reactionOf(res, p.id); if (k) named.push({ key: `res:${res.id}`, name: res.name, role: 'Resident', kind: k }); }
      const mineKind = mineReaction(p);
      if (mineKind) named.push({ key: 'me', name: meName, role: 'Staff', kind: mineKind, you: true });
      const who = reactorsOf(named);
      return {
        id: String(p.id),
        name: a.name,
        role: a.role,
        by: String(p.a || ''),
        mine: p.a === 'me',
        t: Number(p.t) || 0,
        text: String(p.txt || ''),
        aud: AUDIENCES[p.aud] ? p.aud : 'all',
        announcement: isAnn(p),
        kind: isAnn(p) ? 'Announcement' : p.src === 'com' ? 'Community post' : p.src === 'promo' ? 'Promotion' : 'Staff discussion',
        pinned: !!p.pin,
        edited: !!p.ed,
        poll: !!p.poll,
        images: (p.img || []).map((i) => ({ bg: safeBg(i && i[0]), alt: String((i && i[1]) || 'Photo') })).filter((i) => i.bg),
        likes: who.counts.like,
        liked: mineKind === 'like',
        myReaction: mineKind,
        reactions: who.counts,
        reactionTotal: who.total,
        reactors: who.people,
        sharers,
        shares: sharers.length,
        shared: iShared,
        views: Number(p.vw) || SAMPLE_VIEWS[p.id] || 0,
        replies,
      };
    })
    .sort((x, y) => (y.pinned - x.pinned) || (y.t - x.t));
}

// What this person muted: people, words and single threads. It lives with the Social settings of the prototype ("eso-social", field "muted").
const MUTE_DEFAULT = { people: ['marcus'], kw: ['parking ticket'], threads: ['p7'] };
const readSocial = (storage) => { try { const s = JSON.parse(storage.getItem('eso-social')); return s && typeof s === 'object' ? s : {}; } catch { return {}; } };
export function muted(storage) {
  const m = readSocial(storage).muted || {};
  return { people: m.people || MUTE_DEFAULT.people, kw: m.kw || MUTE_DEFAULT.kw, threads: m.threads || MUTE_DEFAULT.threads };
}

/** Split a timeline into what the mute settings let through and how many posts they hold back. A person's own posts are never held back. */
export function applyMute(storage, posts) {
  const m = muted(storage);
  const words = m.kw.map((k) => String(k).toLowerCase());
  const hide = (p) => !p.mine && (m.people.includes(p.by) || m.threads.includes(p.id) || words.some((k) => p.text.toLowerCase().includes(k)));
  const shown = posts.filter((p) => !hide(p));
  return { shown, hidden: posts.length - shown.length };
}

/** Stop muting one person ("people"), word ("kw") or thread ("threads"). */
export function unmute(storage, kind, value) {
  const s = readSocial(storage);
  const m = muted(storage);
  if (!Array.isArray(m[kind])) return false;
  m[kind] = m[kind].filter((x) => String(x) !== String(value));
  s.muted = m;
  try { storage.setItem('eso-social', JSON.stringify(s)); return true; } catch { return false; }
}

/** The numbers on a Social profile: the people who follow this person, the people they follow, and their posts. Each is a count of named people. */
export function profileStats(storage, meName) {
  return { followers: followersOf(storage, 'me').length, following: new Set(following(storage).map(canon)).size, posts: timeline(storage, meName).filter((p) => p.mine).length };
}

/** Turn Social off (or back on) for ONE resident, without a violation: { who: "res:res-1" }. It is kept in the feed's `off` list (Staff never write what a resident keeps).
 *  Returns { ok, off, reason? }. */
export function setResidentSocial(storage, who, on, byTitle) {
  const no = guard(byTitle, 'switchOff');
  if (no) return no;
  const key = String(who || '');
  if (!residentPersonas().some((p) => `res:${p.id}` === key)) return { ok: false, reason: 'Choose a resident.' };
  const f = readFeed(storage);
  const set = new Set(Array.isArray(f.off) ? f.off.map(String) : []);
  if (on) set.delete(key); else set.add(key);
  f.off = [...set];
  return writeFeed(storage, f) ? { ok: true, off: !on } : { ok: false, reason: 'Could not save. Try again.' };
}
export const residentSocialOff = (storage, who) => { const f = readFeed(storage); return Array.isArray(f.off) && f.off.includes(String(who)); };

/** Mute a person by their key ("priya", "res:res-1"): their posts are held back for this Staff person. Never yourself. Returns true when it is saved. */
export function mutePerson(storage, key) {
  const k = String(key || '');
  if (!k || k === 'me') return false;
  const s = readSocial(storage);
  const m = muted(storage);
  if (!m.people.includes(k)) m.people = [...m.people, k];
  s.muted = m;
  try { storage.setItem('eso-social', JSON.stringify(s)); return true; } catch { return false; }
}

export function muteThread(storage, postId) {
  const s = readSocial(storage);
  const m = muted(storage);
  if (!m.threads.includes(String(postId))) m.threads = [...m.threads, String(postId)];
  s.muted = m;
  try { storage.setItem('eso-social', JSON.stringify(s)); return true; } catch { return false; }
}

/** The authors this person follows (the "Following" view shows their posts, and the person's own). */
export function following(storage) {
  const f = readFeed(storage);
  return Array.isArray(f.follow) ? f.follow.map(String) : [];
}

/** Follow a person, or stop following them. People are named by their key ("dana", "res:res-1"); the Staff person's follows are the feed's `follow`.
 *  Returns { ok, following }. */
export function follow(storage, key) {
  const f = readFeed(storage);
  const k = canon(key);
  if (!k || k === 'me') return { ok: false, following: false };
  if (!isPerson(k)) return { ok: false, following: false, reason: 'That person is not available.' };
  const mine = new Set((Array.isArray(f.follow) ? f.follow : []).map((x) => canon(x)));
  const now = !mine.has(k);
  if (now) mine.add(k); else mine.delete(k);
  f.follow = [...mine];
  return writeFeed(storage, f) ? { ok: true, following: now } : { ok: false, following: !now };
}

/** The announcements this person wrote, with how they are doing. */
export function ownAnnouncements(storage, meName) {
  return timeline(storage, meName).filter((p) => p.mine && p.announcement).map((p) => ({ id: p.id, text: p.text, likes: p.likes, reactions: p.reactionTotal, comments: p.replies.filter((r) => r.state === 'ok').length }));
}

// This person's own reaction to a post: the one kept in `mr`, or, in a feed kept before there were reactions, a Like.
const mineReaction = (p) => (isReaction(p.mr) ? p.mr : p.lk ? 'like' : null);

/** Give a post a reaction, or take it back by giving the same one again. A person has one reaction per post: a different one replaces the first.
 *  Returns { ok, kind } where kind is the reaction now, or null when it was taken back. */
export function react(storage, postId, kind) {
  if (!isReaction(kind)) return { ok: false, kind: null };
  const f = readFeed(storage);
  const p = f.posts.find((x) => String(x.id) === String(postId));
  if (!p) {
    // Not a post: a comment (of the feed, or one a resident wrote). The Staff person's reactions to comments are the feed's `mrx`, { commentId: kind }.
    const id = String(postId);
    const inFeed = (list) => (list || []).some((r) => r && (String(r.id) === id || inFeed(r.rs)));
    const exists = f.posts.some((x) => inFeed(x.rs)) || residentActivity(storage).some((res) => Object.values(res.replies).some((list) => (list || []).some((r) => String(r.id) === id)));
    if (!exists) return { ok: false, kind: null };
    const mrx = f.mrx && typeof f.mrx === 'object' ? f.mrx : {};
    const was = isReaction(mrx[id]) ? mrx[id] : null;
    const now = was === kind ? null : kind;
    if (now) mrx[id] = now; else delete mrx[id];
    f.mrx = mrx;
    return writeFeed(storage, f) ? { ok: true, kind: now } : { ok: false, kind: was, reason: NO_ROOM };
  }
  const was = mineReaction(p);
  const now = was === kind ? null : kind;
  p.lk = now === 'like' ? 1 : 0; // (what an earlier version kept for a Like)
  if (now) p.mr = now; else delete p.mr;
  return writeFeed(storage, f) ? { ok: true, kind: now } : { ok: false, kind: was, reason: NO_ROOM };
}
const NO_ROOM = 'Could not save your reaction: this browser has no room left to keep it.';

/** Share a post (to your own profile), or take the share back. Returns { ok, shared }. The Staff person's shares are the feed's `myRp`. */
export function share(storage, postId) {
  const f = readFeed(storage);
  const id = String(postId);
  if (!f.posts.some((x) => String(x.id) === id)) return { ok: false, shared: false };
  const mine = new Set((Array.isArray(f.myRp) ? f.myRp : []).map(String));
  const now = !mine.has(id);
  if (now) mine.add(id); else mine.delete(id);
  f.myRp = [...mine];
  return writeFeed(storage, f) ? { ok: true, shared: now } : { ok: false, shared: !now };
}

/** Like or unlike (kept for what called it before there were other reactions). Returns the new state, or null when the post is not there. */
export function toggleLike(storage, postId) {
  const r = react(storage, postId, 'like');
  return r.ok ? r.kind === 'like' : null;
}

/** A reply to a post, or to one comment of it (`to`, a comment id): answering a comment clears its "needs a reply" mark. */
export function addReply(storage, postId, text, { to = null } = {}, now = Date.now()) {
  const body = String(text || '').trim();
  if (!body) return { ok: false, reason: 'Write something first.' };
  if (body.length > MAX_REPLY) return { ok: false, reason: `Keep replies under ${MAX_REPLY} characters.` };
  const f = readFeed(storage);
  const p = f.posts.find((x) => String(x.id) === String(postId));
  if (!p) return { ok: false, reason: 'This post is no longer available.' };
  // Not the same id as a reply written in the same millisecond by a resident (their replies are read together with these).
  const taken = new Set();
  const collect = (list) => { for (const r of list || []) { taken.add(String(r.id)); collect(r.rs); } };
  for (const x of f.posts) collect(x.rs);
  for (const r of residentActivity(storage)) for (const list of Object.values(r.replies || {})) collect(list);
  let rid = `m${now}`;
  while (taken.has(rid)) rid += 'x';
  const reply = { id: rid, a: 'me', t: now, txt: body, likes: 0, rs: [] };
  if (to && f.removed && f.removed[String(to)]) return { ok: false, reason: 'That comment is no longer available.' };
  if (to) {
    const find = (list) => { for (const r of list || []) { if (String(r.id) === String(to)) return r; const hit = find(r.rs); if (hit) return hit; } return null; };
    const parent = find(p.rs);
    if (parent) {
      parent.rs = [...(parent.rs || []), reply];
      delete parent.nr;
    } else if (residentActivity(storage).some((res) => (res.replies[String(postId)] || []).some((r) => String(r.id) === String(to)))) {
      // The comment is a resident's, kept in the resident's own data: the answer stays in the feed and says which comment it answers.
      reply.re = String(to);
      p.rs = [...(p.rs || []), reply];
    } else {
      return { ok: false, reason: 'That comment is no longer available.' };
    }
  } else {
    p.rs = [...(p.rs || []), reply];
  }
  return writeFeed(storage, f) ? { ok: true, reply } : { ok: false, reason: 'Could not save your reply. Try again.' };
}

/* ---------------------------------------------------------------- moderating comments */

// Find a comment by id in the feed (any depth) or in a resident's own data. { post, node, mine, authorKey, authorName, text } or null.
function findComment(storage, f, commentId) {
  const id = String(commentId);
  const hunt = (list) => { for (const r of list || []) { if (r && String(r.id) === id) return r; const hit = hunt(r && r.rs); if (hit) return hit; } return null; };
  for (const p of f.posts) {
    const node = hunt(p.rs);
    if (node) return { post: String(p.id), node, mine: node.a === 'me', authorKey: canon(node.a), authorRole: person(node.a, '').role, authorName: person(node.a, '').name, text: String(node.txt || '') };
  }
  for (const res of residentActivity(storage)) {
    for (const [post, list] of Object.entries(res.replies)) {
      const node = (list || []).find((r) => r && String(r.id) === id);
      if (node) return { post, node: null, mine: false, authorKey: `res:${res.id}`, authorRole: 'Resident', authorName: res.name, text: String(node.txt || '') };
    }
  }
  return null;
}
const clipQuote = (s) => (s.length > 200 ? `${s.slice(0, 199)}…` : s);

/** Change one of your own comments. Returns { ok, reason? }. */
export function editComment(storage, commentId, text, now = Date.now()) {
  const body = String(text || '').trim();
  if (!body) return { ok: false, reason: 'Write something first.' };
  if (body.length > MAX_REPLY) return { ok: false, reason: `Keep replies under ${MAX_REPLY} characters.` };
  const f = readFeed(storage);
  const c = findComment(storage, f, commentId);
  if (!c || !c.node || !c.mine || c.node.del) return { ok: false, reason: 'You can only change your own comments.' };
  if (f.removed && f.removed[String(commentId)]) return { ok: false, reason: 'That comment is no longer available.' };
  c.node.txt = body;
  c.node.ed = now;
  return writeFeed(storage, f) ? { ok: true } : { ok: false, reason: 'Could not save your change. Try again.' };
}

/** Delete one of your own comments. Its answers stay, under a placeholder. Returns { ok, reason? }. */
export function deleteComment(storage, commentId, now = Date.now()) {
  const f = readFeed(storage);
  const c = findComment(storage, f, commentId);
  if (!c || !c.node || !c.mine) return { ok: false, reason: 'You can only delete your own comments.' };
  c.node.del = now;
  return writeFeed(storage, f) ? { ok: true } : { ok: false, reason: 'Could not delete. Try again.' };
}

/** Hide a comment from yourself, or show it again. Only you stop seeing it. Returns { ok, hidden }. */
export function hideComment(storage, commentId) {
  const f = readFeed(storage);
  if (!findComment(storage, f, commentId)) return { ok: false, hidden: false };
  const id = String(commentId);
  const set = new Set((Array.isArray(f.hid) ? f.hid : []).map(String));
  const now = !set.has(id);
  if (now) set.add(id); else set.delete(id);
  f.hid = [...set];
  return writeFeed(storage, f) ? { ok: true, hidden: now } : { ok: false, hidden: !now };
}

/** Take somebody else's comment out for everyone. Its answers stay under a placeholder. Returns { ok, reason? }. */
// What the staff person's title allows (roles.js): the store refuses, so a hidden button is not the only guard. No title, no limit.
const guard = (title, action) => (allowed(title, action) ? null : { ok: false, reason: notAllowed(action) });

export function removeComment(storage, commentId, now = Date.now(), byTitle) {
  const no = guard(byTitle, 'remove');
  if (no) return no;
  const f = readFeed(storage);
  const c = findComment(storage, f, commentId);
  if (!c) return { ok: false, reason: 'That comment is no longer available.' };
  if (c.mine) return { ok: false, reason: 'Delete your own comment instead.' };
  if (f.removed && f.removed[String(commentId)]) return { ok: false, reason: 'That comment is already removed.' };
  f.removed = { ...(f.removed && typeof f.removed === 'object' ? f.removed : {}), [String(commentId)]: { t: now, quote: clipQuote(c.text) } };
  return writeFeed(storage, f) ? { ok: true } : { ok: false, reason: 'Could not remove it. Try again.' };
}

/** Record a violation on a resident's comment: { comment, reason, note, kind: 'warning'|'pause', until (ms, for a pause), alsoRemove }.
 *  The rules are in moderation.js: a resident's comment, one violation per comment, a known reason, a note for "another reason", and a pause that ends
 *  between 15 minutes and 90 days from now. Returns { ok, violation?, reason? }. */
export function addViolation(storage, input, now = Date.now()) {
  const no = guard(input.byTitle, actionOfKind(input.kind));
  if (no) return no;
  const f = readFeed(storage);
  const c = findComment(storage, f, input.comment);
  if (!c) return { ok: false, reason: 'That comment is no longer available.' };
  if (c.authorRole !== 'Resident') return { ok: false, reason: 'A violation is recorded on a resident’s comment.' };
  if (c.mine) return { ok: false, reason: 'Delete your own comment instead.' };
  if ((Array.isArray(f.vio) ? f.vio : []).some((v) => String(v.comment) === String(input.comment))) return { ok: false, reason: 'A violation is already recorded on this comment.' };
  const check = checkViolation(input, now, rulesOf(f));
  if (!check.ok) return check;
  const post = f.posts.find((x) => String(x.id) === c.post) || {};
  const v = {
    id: `v${now}`, post: c.post, comment: String(input.comment), who: c.authorKey, name: c.authorName,
    reason: input.reason, note: String(input.note || '').trim(), rule: (reasonOf(input.reason) || {}).rule || '', kind: input.kind,
    t: now, quote: clipQuote(c.text),
    // The post it was on, as it was: a paused resident cannot open the feed, but is told which post it was.
    postBy: post.a === 'me' ? 'Property team' : person(post.a, '').name,
    postText: clipQuote(String(post.txt || '')),
  };
  if (isHold(input)) v.until = Number(input.until);
  f.vio = [...(Array.isArray(f.vio) ? f.vio : []), v];
  if (input.alsoRemove && !(f.removed && f.removed[v.comment])) f.removed = { ...(f.removed && typeof f.removed === 'object' ? f.removed : {}), [v.comment]: { t: now, reason: v.reason, vid: v.id, quote: v.quote } };
  return writeFeed(storage, f) ? { ok: true, violation: v } : { ok: false, reason: 'Could not record it. Try again.' };
}

/** The accounts at STRIKE_LIMIT strikes, waiting for Staff to open them: [{ who, name, count, latest (the newest violation) }]. */
export function accountsUnderReview(storage) {
  const f = readFeed(storage);
  const people = new Map();
  for (const v of Array.isArray(f.vio) ? f.vio : []) if (v && v.kind === 'pause' && !people.has(v.who)) people.set(v.who, v.name);
  const out = [];
  for (const [who, name] of people) {
    const current = currentStrikesIn(f, who);
    if (current.length >= rulesOf(f).limit) out.push({ who, name, count: current.length, latest: current[current.length - 1] });
  }
  return out.sort((a, b) => b.latest.t - a.latest.t);
}

/** Open an account that reached STRIKE_LIMIT strikes. The oldest STRIKE_LIMIT strikes are sealed into a folder (kept in the resident's history, with the time it
 *  was opened), and the count starts again from none. The pauses and the record stay as they are. Returns { ok, folder?, reason? }. */
export function openAccount(storage, who, now = Date.now()) {
  const f = readFeed(storage);
  const current = currentStrikesIn(f, who);
  const { limit } = rulesOf(f);
  if (current.length < limit) return { ok: false, reason: `This account has fewer than ${limit} strikes.` };
  const folder = { id: `f${now}`, who, name: current[0].name, t: now, strikes: current.slice(0, limit).map((v) => String(v.id)) };
  f.folders = [...(Array.isArray(f.folders) ? f.folders : []), folder];
  return writeFeed(storage, f) ? { ok: true, folder } : { ok: false, reason: 'Could not save. Try again.' };
}

/** The violations Staff recorded, newest first, with whether each pause is still running. */
export function violations(storage, now = Date.now()) {
  const f = readFeed(storage);
  const list = (Array.isArray(f.vio) ? f.vio : []).map((v) => ({ ...v, label: reasonLabel(v.reason), active: isHold(v) && Number(v.until) > now })).sort((a, b) => b.t - a.t);
  // Each one says which folder it was sealed into (if any) and its strike number, so the Moderation page can show a person's standing.
  const placed = new Map();
  for (const who of new Set(list.map((v) => v.who))) {
    const st = strikesOf(list.filter((v) => v.who === who), foldersIn(f, who), rulesOf(f).limit);
    for (const it of st.items) placed.set(it.id, { folder: it.folder, strike: it.strike, counting: it.counting });
  }
  return list.map((v) => ({ ...v, ...placed.get(v.id) }));
}

/* ------------------------------------------------- the Violations page (Staff): residents, strikes, ban, warn, unban */

const residentPersonas = () => PERSONAS.filter((p) => p.role === 'resident');
const residentSaved = (storage, id) => { try { return JSON.parse(storage.getItem(residentKey(id))) || {}; } catch { return {}; } };

/** Every resident (the ones who log in, and anyone with a record) and where they stand:
 *  { who, name, unit, count (strikes in the current run), limit, folders [{ number, items }], items (every record, newest first), latest, status, hold, until }.
 *  status: 'review' (3 strikes: closed until Staff open the account) | 'paused' (a ban is running) | 'awaiting' (the ban ended; they have not pressed Resume) | 'clear'. */
export function standings(storage, now = Date.now()) {
  const f = readFeed(storage);
  const people = new Map(residentPersonas().map((p) => [`res:${p.id}`, { who: `res:${p.id}`, name: p.name, unit: p.title || '' }]));
  for (const v of Array.isArray(f.vio) ? f.vio : []) if (v && v.who && !people.has(v.who)) people.set(v.who, { who: v.who, name: v.name || v.who, unit: '' });
  const all = violations(storage, now);
  return [...people.values()].map((p) => {
    const mine = all.filter((v) => v.who === p.who); // newest first
    const st = strikesOf(mine, foldersIn(f, p.who), rulesOf(f).limit);
    const resumed = new Set((Array.isArray(residentSaved(storage, p.who.replace('res:', '')).resumed) ? residentSaved(storage, p.who.replace('res:', '')).resumed : []).map(String));
    const hold = holdIn(f, p.who, resumed, now);
    const status = !hold ? 'clear' : hold.review ? 'review' : hold.ended ? 'awaiting' : 'paused';
    return { ...p, count: st.count, limit: st.limit, folders: st.folders, items: st.items, latest: mine[0] || null, status, hold, until: hold && !hold.review ? hold.until : null };
  });
}

/** Search, filter and sort the residents of `standings`: { q (name, unit, reason, note, comment), status ('all' | 'review' | 'paused' | 'awaiting' | 'clear' | 'strikes'),
 *  reason ('all' | a reason id: they have a record for it), sort ('strikes' | 'recent' | 'name') }. */
export function filterStandings(list, { q = '', status = 'all', reason = 'all', sort = 'strikes' } = {}) {
  const needle = String(q).trim().toLowerCase();
  const out = list.filter((p) => {
    if (status === 'strikes' ? p.count < 1 : status !== 'all' && p.status !== status) return false;
    if (reason !== 'all' && !p.items.some((v) => v.reason === reason)) return false;
    if (!needle) return true;
    const hay = [p.name, p.unit, ...p.items.flatMap((v) => [v.label, v.note, v.quote, v.postText])].join(' ').toLowerCase();
    return hay.includes(needle);
  });
  const byName = (a, b) => a.name.localeCompare(b.name);
  const last = (p) => (p.latest ? Number(p.latest.t) : 0);
  if (sort === 'name') return out.sort(byName);
  if (sort === 'recent') return out.sort((a, b) => last(b) - last(a) || byName(a, b));
  return out.sort((a, b) => b.count - a.count || last(b) - last(a) || byName(a, b)); // 'strikes': the closest to the limit first
}

// A violation not tied to a comment (a direct ban or warning from the Violations page).
function directViolation(storage, input, kind, now, by) {
  const no = guard(input.byTitle, actionOfKind(kind));
  if (no) return no;
  const who = String(input.who || '');
  const p = residentPersonas().find((x) => `res:${x.id}` === who);
  if (!p) return { ok: false, reason: 'Choose a resident.' };
  const f = readFeed(storage);
  const check = checkViolation({ ...input, kind }, now, rulesOf(f));
  if (!check.ok) return check;
  const ids = new Set((Array.isArray(f.vio) ? f.vio : []).map((v) => String(v.id)));
  let id = `v${now}`;
  while (ids.has(id)) id += 'x';
  const v = { id, post: null, comment: null, who, name: p.name, reason: input.reason, note: String(input.note || '').trim(), rule: (reasonOf(input.reason) || {}).rule || '', kind, t: now, quote: '', manual: true, by: by || '' };
  if (isHold({ kind })) v.until = Number(input.until);
  f.vio = [...(Array.isArray(f.vio) ? f.vio : []), v];
  return writeFeed(storage, f) ? { ok: true, violation: v } : { ok: false, reason: 'Could not record it. Try again.' };
}

/** Ban a resident for a time, with no comment attached: { who, reason, note, until, light? }. The same rules as a violation on a comment.
 *  Heavy (the default): one strike, and the resident cannot use Social at all. `light: true`: a reminder with a clock, they can still read, not a strike. */
export const banResident = (storage, input, now = Date.now(), by = '') => directViolation(storage, input, input && input.light === true ? 'light' : 'pause', now, by);
/** A warning to a resident with no comment attached: { who, reason, note }. Not a strike. */
export const warnResident = (storage, input, now = Date.now(), by = '') => directViolation(storage, input, 'warning', now, by);

/** Lift a ban that is running: its clock stops now (the strike stays on the record) and the resident can press Resume. Not for an account at STRIKE_LIMIT strikes:
 *  that one is opened (openAccount), which seals its strikes. Returns { ok, ended?, reason? }. */
export function unbanResident(storage, who, now = Date.now(), by = '') {
  const f = readFeed(storage);
  const running = (Array.isArray(f.vio) ? f.vio : []).filter((v) => v && v.who === who && isHold(v) && Number(v.until) > now);
  if (!running.length) return { ok: false, reason: 'No ban is running for this resident.' };
  const { limit } = rulesOf(f);
  if (currentStrikesIn(f, who).length >= limit) return { ok: false, review: true, reason: `This account has ${limit} strikes. Open the account instead.` };
  for (const v of running) { v.until = now; v.lifted = { t: now, by }; }
  return writeFeed(storage, f) ? { ok: true, ended: running.length } : { ok: false, reason: 'Could not save. Try again.' };
}

/** The violation rules in force (strikes before review, shortest and longest pause, a note on every violation, the first action for each reason). */
export const rules = (storage) => rulesOf(readFeed(storage));

/** Save the violation rules from the settings form (see moderation.js `checkRules`). They apply from now on: a record already made is never changed, but a hold
 *  is judged by the rules in force, so lowering the limit closes an account that already has that many strikes and raising it reopens one that was at the old limit.
 *  Returns { ok, rules?, reason? }. */
export function saveRules(storage, input, by = '', now = Date.now()) {
  const no = guard(input && input.byTitle, 'rules');
  if (no) return no;
  const check = checkRules(input);
  if (!check.ok) return check;
  const f = readFeed(storage);
  f.rules = { ...check.rules, by, t: now };
  return writeFeed(storage, f) ? { ok: true, rules: rulesOf(f) } : { ok: false, reason: 'Could not save. Try again.' };
}

/** Put the rules back to the ones the product starts with. */
export function resetRules(storage) {
  const f = readFeed(storage);
  delete f.rules;
  return writeFeed(storage, f) ? { ok: true, rules: rulesOf(f) } : { ok: false, reason: 'Could not save. Try again.' };
}

// The rules a post must meet, whether it is new or changed: the same words in both cases.
function postProblem(body, aud, announcement, photos = 0) {
  if (!body && !photos) return 'Write something first.'; // a post may be photos only
  if (body.length > MAX_POST) return `Keep posts under ${MAX_POST} characters.`;
  if (!AUDIENCES[aud]) return 'Choose who can see this post.';
  if (announcement && aud === 'staff') return 'An announcement is for residents. Choose Everyone or Residents.';
  return '';
}

/** A new post, with up to MAX_IMAGES photos (`images`: [[background, alt]], see images.js; a post may be photos only). An announcement is for residents, so it
 *  cannot be "Staff only". Returns { ok, post?, reason? }. */
export function addPost(storage, { text, aud = 'all', announcement = false, images = [] }, now = Date.now()) {
  const body = String(text || '').trim();
  const pics = checkImages(images);
  if (!pics.ok) return pics;
  const problem = postProblem(body, aud, announcement, pics.images.length);
  if (problem) return { ok: false, reason: problem };
  const f = readFeed(storage);
  const post = { id: `u${now}`, a: 'me', t: now, aud, txt: body, likes: 0, lk: 0, rp: 0, rs: [] };
  if (pics.images.length) post.img = pics.images;
  if (announcement) { post.ann = 1; post.src = 'ann'; } else if (aud !== 'staff') post.src = 'com';
  f.posts = [post, ...f.posts];
  return writeFeed(storage, f) ? { ok: true, post } : { ok: false, reason: pics.images.length ? 'There is not room to keep these photos. Remove one and try again.' : 'Could not save your post. Try again.' };
}

/** Change one of your own posts: its text, who can see it, whether it is an announcement. Its id, time, likes and replies stay, and it is marked
 *  edited. A post somebody else wrote is not yours to change. Returns { ok, post?, reason? }. */
export function editPost(storage, postId, { text, aud = 'all', announcement = false, images }, now = Date.now()) {
  const f = readFeed(storage);
  const p = f.posts.find((x) => String(x.id) === String(postId));
  if (!p) return { ok: false, reason: 'This post is no longer available.' };
  if (p.a !== 'me') return { ok: false, reason: 'You can only change your own posts.' };
  const body = String(text || '').trim();
  // `images` left out keeps the pictures the post has; a list (even an empty one) replaces them.
  const pics = images === undefined ? { ok: true, images: (Array.isArray(p.img) ? p.img : []) } : checkImages(images);
  if (!pics.ok) return pics;
  const problem = postProblem(body, aud, announcement, pics.images.length);
  if (problem) return { ok: false, reason: problem };
  if (images !== undefined) { if (pics.images.length) p.img = pics.images; else delete p.img; }
  p.txt = body;
  p.aud = aud;
  // The same marks addPost gives: an announcement is "ann"; anything else for residents is a community post; a staff-only post has none.
  if (announcement) { p.ann = 1; p.src = 'ann'; } else {
    delete p.ann;
    if (aud === 'staff') delete p.src; else if (p.src === 'ann' || !p.src) p.src = 'com';
  }
  p.ed = now;
  return writeFeed(storage, f) ? { ok: true, post: p } : { ok: false, reason: pics.images.length ? 'There is not room to keep these photos. Remove one and try again.' : 'Could not save your changes. Try again.' };
}

export const MAX_PINNED = 3;

/** Pin one of your own posts to the top of the feed (everyone who can see it sees it first), or take it down again (`on` false). At most MAX_PINNED posts are
 *  pinned at once, so a pinned post stays worth seeing: pin a fourth and it is refused until one is unpinned. Returns { ok, pinned?, reason? }. */
export function pinPost(storage, postId, on = true) {
  const f = readFeed(storage);
  const p = f.posts.find((x) => String(x.id) === String(postId));
  if (!p) return { ok: false, reason: 'This post is no longer available.' };
  if (p.a !== 'me') return { ok: false, reason: 'You can only pin your own posts.' };
  if (!on) { delete p.pin; return writeFeed(storage, f) ? { ok: true, pinned: false } : { ok: false, reason: 'Could not save. Try again.' }; }
  if (!p.pin && f.posts.filter((x) => x.pin).length >= MAX_PINNED) return { ok: false, reason: `You can pin up to ${MAX_PINNED} posts. Unpin one first.` };
  p.pin = 1;
  return writeFeed(storage, f) ? { ok: true, pinned: true } : { ok: false, reason: 'Could not save. Try again.' };
}

/** Delete one of your own posts, with its replies and likes. Returns { ok, reason? }. */
export function deletePost(storage, postId, { any = false } = {}) {
  const f = readFeed(storage);
  const p = f.posts.find((x) => String(x.id) === String(postId));
  if (!p) return { ok: false, reason: 'This post is no longer available.' };
  // `any` is Moderation taking down a reported post of someone else; everywhere else only your own can be deleted
  if (p.a !== 'me' && !any) return { ok: false, reason: 'You can only delete your own posts.' };
  f.posts = f.posts.filter((x) => x !== p);
  // What Staff's own data kept about this post goes with it: the comments' reactions, hidden and removed marks, the share, the muted thread.
  // A recorded violation stays: it is the record of what a resident wrote, and the strikes count it.
  const ids = new Set();
  (function collect(list) { for (const r of list || []) { ids.add(String(r.id)); collect(r.rs); } })(p.rs);
  if (f.mrx && typeof f.mrx === 'object') for (const k of Object.keys(f.mrx)) if (ids.has(k)) delete f.mrx[k];
  if (f.removed && typeof f.removed === 'object') for (const k of Object.keys(f.removed)) if (ids.has(k) && !(Array.isArray(f.vio) && f.vio.some((v) => String(v.comment) === k))) delete f.removed[k];
  if (Array.isArray(f.hid)) f.hid = f.hid.filter((k) => !ids.has(String(k)));
  if (Array.isArray(f.myRp)) f.myRp = f.myRp.filter((k) => String(k) !== String(postId));
  const ok = writeFeed(storage, f);
  if (ok) {
    const s = readSocial(storage);
    if (s.muted && Array.isArray(s.muted.threads) && s.muted.threads.includes(String(postId))) {
      s.muted.threads = s.muted.threads.filter((k) => k !== String(postId));
      try { storage.setItem('eso-social', JSON.stringify(s)); } catch { /* the mute stays: harmless, the post is gone */ }
    }
  }
  return ok ? { ok: true } : { ok: false, reason: 'Could not delete the post. Try again.' };
}
