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
import { residentActivity, reactionOf, followersOf } from './residents.js';
import { nest } from './threads.js';

export const KEY = { feed: 'eso-feed' };

const PEOPLE = {
  dana: ['Dana Whitfield', 'Staff'], luis: ['Luis Ortega', 'Staff'], kim: ['Kim Tran', 'Staff'],
  alex: ['Alex Rivera', 'Resident'], priya: ['Priya Shah', 'Resident'], marcus: ['Marcus Lee', 'Resident'], rena: ['Rena Okafor', 'Resident'],
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

const safeBg = (v) => (typeof v === 'string' && /^linear-gradient\([#0-9a-z%,.() -]+\)$/i.test(v) ? v : '');
const isAnn = (p) => !!(p.ann || p.src === 'ann');

// The comments of one post as Staff read them, in reading order with the answers under them (threads.js): the ones in the feed, Staff's answer to a
// resident (`re`: the resident comment it answers), and what residents wrote, which may answer any comment. Each one says who reacted to it, like a post
// does.
function commentsOf(p, feed, residents, meName) {
  const nodes = [];
  const walk = (list, parent) => {
    for (const r of list || []) {
      if (!r || r.id == null) continue;
      nodes.push({ id: String(r.id), a: r.a, parent: r.re ? String(r.re) : parent, t: Number(r.t) || 0, txt: String(r.txt || ''), rb: r.rb });
      walk(r.rs, String(r.id));
    }
  };
  walk(p.rs, null);
  for (const res of residents) {
    for (const r of res.replies[String(p.id)] || []) nodes.push({ id: String(r.id), a: `res:${res.id}`, parent: r.re ? String(r.re) : null, t: Number(r.t) || 0, txt: String(r.txt || '') });
  }
  const list = nest(nodes);
  const mrx = feed.mrx && typeof feed.mrx === 'object' ? feed.mrx : {};
  return list.map((n) => {
    const a = person(n.a, meName);
    const named = [];
    for (const [key, kind] of Object.entries(byOf(n.rb))) { if (key !== 'me') { const who = person(key, meName); named.push({ key: canon(key), name: who.name, role: who.role, kind }); } }
    for (const res of residents) { const k = reactionOf(res, n.id); if (k) named.push({ key: `res:${res.id}`, name: res.name, role: 'Resident', kind: k }); }
    const mine = isReaction(mrx[n.id]) ? mrx[n.id] : null;
    if (mine) named.push({ key: 'me', name: meName, role: 'Staff', kind: mine, you: true });
    const who = reactorsOf(named);
    return {
      id: n.id, key: canon(n.a), name: a.name, role: a.role, t: n.t, text: n.txt, depth: n.depth, parentId: n.parentId, replyCount: n.replyCount,
      myReaction: mine, reactions: who.counts, reactionTotal: who.total, reactors: who.people,
    };
  });
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
  const mine = new Set((Array.isArray(f.follow) ? f.follow : []).map((x) => canon(x)));
  const now = !mine.has(k);
  if (now) mine.add(k); else mine.delete(k);
  f.follow = [...mine];
  return writeFeed(storage, f) ? { ok: true, following: now } : { ok: false, following: !now };
}

/** The announcements this person wrote, with how they are doing. */
export function ownAnnouncements(storage, meName) {
  return timeline(storage, meName).filter((p) => p.mine && p.announcement).map((p) => ({ id: p.id, text: p.text, likes: p.likes, reactions: p.reactionTotal, comments: p.replies.length }));
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
    return writeFeed(storage, f) ? { ok: true, kind: now } : { ok: false, kind: was };
  }
  const was = mineReaction(p);
  const now = was === kind ? null : kind;
  p.lk = now === 'like' ? 1 : 0; // (what an earlier version kept for a Like)
  if (now) p.mr = now; else delete p.mr;
  return writeFeed(storage, f) ? { ok: true, kind: now } : { ok: false, kind: was };
}

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
  const reply = { id: `m${now}`, a: 'me', t: now, txt: body, likes: 0, rs: [] };
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

// The rules a post must meet, whether it is new or changed: the same words in both cases.
function postProblem(body, aud, announcement) {
  if (!body) return 'Write something first.';
  if (body.length > MAX_POST) return `Keep posts under ${MAX_POST} characters.`;
  if (!AUDIENCES[aud]) return 'Choose who can see this post.';
  if (announcement && aud === 'staff') return 'An announcement is for residents. Choose Everyone or Residents.';
  return '';
}

/** A new post. An announcement is for residents, so it cannot be "Staff only". Returns { ok, post?, reason? }. */
export function addPost(storage, { text, aud = 'all', announcement = false }, now = Date.now()) {
  const body = String(text || '').trim();
  const problem = postProblem(body, aud, announcement);
  if (problem) return { ok: false, reason: problem };
  const f = readFeed(storage);
  const post = { id: `u${now}`, a: 'me', t: now, aud, txt: body, likes: 0, lk: 0, rp: 0, rs: [] };
  if (announcement) { post.ann = 1; post.src = 'ann'; } else if (aud !== 'staff') post.src = 'com';
  f.posts = [post, ...f.posts];
  return writeFeed(storage, f) ? { ok: true, post } : { ok: false, reason: 'Could not save your post. Try again.' };
}

/** Change one of your own posts: its text, who can see it, whether it is an announcement. Its id, time, likes and replies stay, and it is marked
 *  edited. A post somebody else wrote is not yours to change. Returns { ok, post?, reason? }. */
export function editPost(storage, postId, { text, aud = 'all', announcement = false }, now = Date.now()) {
  const f = readFeed(storage);
  const p = f.posts.find((x) => String(x.id) === String(postId));
  if (!p) return { ok: false, reason: 'This post is no longer available.' };
  if (p.a !== 'me') return { ok: false, reason: 'You can only change your own posts.' };
  const body = String(text || '').trim();
  const problem = postProblem(body, aud, announcement);
  if (problem) return { ok: false, reason: problem };
  p.txt = body;
  p.aud = aud;
  // The same marks addPost gives: an announcement is "ann"; anything else for residents is a community post; a staff-only post has none.
  if (announcement) { p.ann = 1; p.src = 'ann'; } else {
    delete p.ann;
    if (aud === 'staff') delete p.src; else if (p.src === 'ann' || !p.src) p.src = 'com';
  }
  p.ed = now;
  return writeFeed(storage, f) ? { ok: true, post: p } : { ok: false, reason: 'Could not save your changes. Try again.' };
}

/** Delete one of your own posts, with its replies and likes. Returns { ok, reason? }. */
export function deletePost(storage, postId) {
  const f = readFeed(storage);
  const p = f.posts.find((x) => String(x.id) === String(postId));
  if (!p) return { ok: false, reason: 'This post is no longer available.' };
  if (p.a !== 'me') return { ok: false, reason: 'You can only delete your own posts.' };
  f.posts = f.posts.filter((x) => x !== p);
  return writeFeed(storage, f) ? { ok: true } : { ok: false, reason: 'Could not delete the post. Try again.' };
}
