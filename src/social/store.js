// Social as the Resident app sees it. Pure logic, no DOM, so node --test can run it.
//
// A resident READS and INTERACTS (like, reply, hide the whole timeline). A resident never posts and never sees what
// Staff keep for themselves (posts for "staff" only, moderation queue, enforcement, analytics).
//
// Source of truth is the Staff account-settings prototype, which keeps in the same origin:
//   "eso-feed"    { posts: [{ id, a, t, aud, ann, pin, txt, img, likes, rs: [reply] }] }   the timeline
//   "eso-mod"     { gl: { ver, pub, by, accept, blocks: [[title, text]] }, perms }           guidelines and rules
//   "eso-social"  { on, sidebar }                                                           Staff switch for Social
// Until Staff change a moderation setting "eso-mod" does not exist yet, so the default guidelines are repeated here.
// A real app replaces this file with calls to the social API.
//
// What a resident does lives under "eso-res-social:<residentId>" and is never written into Staff's data.

import { feedBy, byOf, canon, feedShares, reactorsOf, isReaction, OTHERS } from './reactions.js';
import { residentActivity, reactionOf } from './residents.js';
import { nest } from './threads.js';
import { PERSONAS } from '../messaging/personas.js';

export const KEY = { feed: 'eso-feed', mod: 'eso-mod', social: 'eso-social', mine: (id) => `eso-res-social:${id}` };

// Same text as the Staff prototype's default guidelines (v3).
export const DEFAULT_GUIDELINES = {
  ver: 3,
  pub: Date.parse('2026-10-12T10:00:00-07:00'),
  by: 'Property Manager',
  accept: true,
  blocks: [
    ['Be a good neighbor', 'Keep posts respectful and constructive. Disagree with ideas, not people. Assume good intent from neighbors and staff.'],
    ['Protect everyone’s privacy', 'Don’t post other residents’ license plates, unit numbers, names, phone numbers or photos of their vehicles or homes. To report a parking issue, use Requests or message the office — staff will follow up privately.'],
    ['Parking disputes', 'Social is not the place to call out a neighbor’s parking. Report blocked spots, guest-pass questions or towing concerns to the office. Towing and violation decisions are made by Mallard Pointe staff only.'],
    ['Marketplace & promotions', 'Personal items for sale are welcome in Discussions, one post per item per week. Business promotions are published by the property through Promotions; please don’t post unsolicited ads or referral links.'],
    ['Quiet hours (10 PM – 7 AM)', 'Please keep posts during quiet hours to urgent building matters. Noise concerns go to the courtesy patrol at (916) 555-0199, not to Social.'],
    ['Photos and AI', 'Only share photos you took or have permission to use. Label images or text that were created or substantially altered by AI as “AI-generated” or “AI-assisted”.'],
  ],
};

// Who wrote a post, as a resident should see it: staff by role, neighbors by name, never a unit number.
const AUTHORS = {
  me: ['Property team', 'Staff'], dana: ['Dana Whitfield', 'Staff'], luis: ['Luis Ortega', 'Staff'], kim: ['Kim Tran', 'Staff'],
  alex: ['Alex Rivera', 'Resident'], priya: ['Priya Shah', 'Resident'], marcus: ['Marcus Lee', 'Resident'], rena: ['Rena Okafor', 'Resident'],
};
const author = (key) => { const a = AUTHORS[key]; return a ? { name: a[0], role: a[1] } : { name: 'Neighbor', role: 'Resident' }; };

const read = (storage, key, fallback) => {
  try { const v = JSON.parse(storage.getItem(key)); return v ?? fallback; } catch { return fallback; }
};
const write = (storage, key, value) => {
  try { storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
};

/** Staff switch for the whole of Social. Missing means on. */
export function socialOn(storage) {
  const s = read(storage, KEY.social, {}) || {};
  return s.on !== false;
}

/** The guidelines Staff published, and whether residents must accept them before getting in. */
export function guidelines(storage) {
  const mod = read(storage, KEY.mod, {}) || {};
  const g = mod.gl && typeof mod.gl === 'object' ? mod.gl : {};
  const blocks = Array.isArray(g.blocks) && g.blocks.length ? g.blocks : DEFAULT_GUIDELINES.blocks;
  return {
    ver: Number(g.ver) || DEFAULT_GUIDELINES.ver,
    pub: g.pub || DEFAULT_GUIDELINES.pub,
    by: g.by || DEFAULT_GUIDELINES.by,
    required: g.accept !== false,
    blocks: blocks.filter((b) => Array.isArray(b) && b[0]).map((b) => [String(b[0]), String(b[1] || '')]),
  };
}

/** Can residents reply? Staff set who may reply; "all" means everyone. Posting is never open to residents. */
export function canReply(storage) {
  const mod = read(storage, KEY.mod, {}) || {};
  const r = mod.perms && mod.perms.reply;
  return !r || r === 'all';
}

/* -------------------------------------------------------------- what a resident has done */

export function residentState(storage, residentId) {
  const s = read(storage, KEY.mine(residentId), {}) || {};
  return {
    accepted: Number(s.accepted) || 0,
    show: s.show !== false,
    liked: new Set(Array.isArray(s.liked) ? s.liked : []),
    // The reactions other than Like, { postId: 'love' }: a Like stays in `liked`, as before there were other reactions.
    reacts: s.reacts && typeof s.reacts === 'object' ? Object.fromEntries(Object.entries(s.reacts).filter(([, k]) => OTHERS.includes(k))) : {},
    shares: new Set(Array.isArray(s.shares) ? s.shares.map(String) : []), // the posts this resident shared to their own profile
    following: Array.isArray(s.following) ? s.following.map((k) => canon(k)) : [], // the people this resident follows, by key ("dana", "res:res-2", "me")
    replies: s.replies && typeof s.replies === 'object' ? s.replies : {},
  };
}

function put(storage, residentId, st) {
  return write(storage, KEY.mine(residentId), { accepted: st.accepted, show: st.show, liked: [...st.liked], reacts: st.reacts, shares: [...st.shares], following: st.following, replies: st.replies });
}

/** The gate: true while Staff require acceptance and this resident has not accepted the current version. */
export function needsGuidelines(storage, residentId) {
  const g = guidelines(storage);
  return g.required && residentState(storage, residentId).accepted < g.ver;
}

export function acceptGuidelines(storage, residentId) {
  const st = residentState(storage, residentId);
  st.accepted = guidelines(storage).ver;
  return put(storage, residentId, st);
}

/** The resident's own switch: show the Social timeline (Social page and My property) or hide it. */
export function setShow(storage, residentId, on) {
  const st = residentState(storage, residentId);
  st.show = !!on;
  return put(storage, residentId, st);
}

/* ------------------------------------------------------------------------ the timeline */

const safeBg = (v) => (typeof v === 'string' && /^linear-gradient\([#0-9a-z%,.() -]+\)$/i.test(v) ? v : '');

// The comments of one post as this resident reads them, in reading order with the answers under them (threads.js): the ones in the feed (Staff's answers
// sit under the comment they answer), what other residents wrote (read from their own data), and this resident's own words. Each one says who reacted
// to it, like a post does (the other residents' reactions are read from their data, too).
function commentsOf(p, st, residentId, feedData, others) {
  const nodes = [];
  const walk = (list, parent) => {
    for (const r of list || []) {
      if (!r || r.id == null) continue;
      nodes.push({ id: String(r.id), a: r.a, parent: r.re ? String(r.re) : parent, t: Number(r.t) || 0, txt: String(r.txt || ''), rb: r.rb, mine: false });
      walk(r.rs, String(r.id));
    }
  };
  walk(p.rs, null);
  for (const r of st.replies[p.id] || []) nodes.push({ id: String(r.id), a: '', parent: r.re ? String(r.re) : null, t: Number(r.t) || 0, txt: String(r.txt || ''), mine: true });
  for (const res of others) for (const r of res.replies[String(p.id)] || []) nodes.push({ id: String(r.id), a: `res:${res.id}`, parent: r.re ? String(r.re) : null, t: Number(r.t) || 0, txt: String(r.txt || ''), mine: false, fromResident: true });
  const mrx = feedData.mrx && typeof feedData.mrx === 'object' ? feedData.mrx : {};
  return nest(nodes).map((n) => {
    const isStaffMe = n.a === 'me';
    const who0 = n.mine ? { name: 'You', role: 'Resident' } : n.a && n.a.startsWith('res:') ? { name: (PERSONAS.find((x) => x.id === n.a.slice(4)) || {}).name || 'Neighbor', role: 'Resident' } : author(n.a);
    const named = [];
    for (const [key, kind] of Object.entries(byOf(n.rb))) { if (key !== 'me') { const w = author(key); named.push({ key: canon(key), name: w.name, role: w.role, kind }); } }
    if (isReaction(mrx[n.id])) named.push({ key: 'me', name: author('me').name, role: 'Staff', kind: mrx[n.id] });
    for (const res of others) { const k = reactionOf(res, n.id); if (k) named.push({ key: `res:${res.id}`, name: res.name, role: 'Resident', kind: k }); }
    const mine = st.liked.has(n.id) ? 'like' : st.reacts[n.id] || null;
    if (mine) named.push({ key: `res:${residentId}`, name: 'You', role: 'Resident', kind: mine, you: true });
    const who = reactorsOf(named);
    return {
      id: n.id, key: n.mine ? `res:${residentId}` : isStaffMe ? 'me' : canon(n.a), name: who0.name, role: who0.role, t: n.t, text: n.txt, mine: !!n.mine,
      depth: n.depth, parentId: n.parentId, replyCount: n.replyCount,
      myReaction: mine, reactions: who.counts, reactionTotal: who.total, reactors: who.people,
    };
  });
}

/**
 * Posts a resident may see: for everyone, pinned first then newest, with their own likes and replies merged in.
 * Posts for staff only are never returned. Returns [] when Staff turned Social off or the resident hid it.
 */
export function timeline(storage, residentId, { limit = 0 } = {}) {
  if (!socialOn(storage)) return [];
  const st = residentState(storage, residentId);
  if (!st.show) return [];
  const feedData = read(storage, KEY.feed, { posts: [] }) || {};
  const posts = feedData.posts || [];
  const myRp = new Set((Array.isArray(feedData.myRp) ? feedData.myRp : []).map(String)); // the posts the property team shared
  const othersHere = residentActivity(storage).filter((r) => r.id !== residentId); // the other residents, read from their own data
  const out = posts
    .filter((p) => p && (p.aud === 'all' || p.aud === 'residents'))
    .map((p) => {
      const a = author(p.a);
      const replies = commentsOf(p, st, residentId, feedData, othersHere);
      // The reactions are the people who gave them: the ones the feed names (staff by role, neighbors by name), the property team's own, the other
      // residents (read from their own data), and this resident. The count is the list.
      const mine = st.liked.has(String(p.id)) ? 'like' : st.reacts[String(p.id)] || null;
      const named = [];
      for (const [key, kind] of Object.entries(feedBy(p))) { if (key !== 'me') { const who = author(key); named.push({ key: canon(key), name: who.name, role: who.role, kind }); } }
      if (isReaction(p.mr)) named.push({ key: 'me', name: author('me').name, role: 'Staff', kind: p.mr });
      for (const res of othersHere) { const k = reactionOf(res, p.id); if (k) named.push({ key: `res:${res.id}`, name: res.name, role: 'Resident', kind: k }); }
      if (mine) named.push({ key: `res:${residentId}`, name: 'You', role: 'Resident', kind: mine, you: true });
      const who = reactorsOf(named);
      // Shares are people too: the ones the feed names, the property team, the other residents, and this resident.
      const sharers = feedShares(p).filter((k) => k !== 'me').map((k) => ({ name: author(k).name, role: author(k).role }));
      if (myRp.has(String(p.id))) sharers.push({ name: author('me').name, role: 'Staff' });
      for (const res of othersHere) if (res.shares.has(String(p.id))) sharers.push({ name: res.name, role: 'Resident' });
      const iShared = st.shares.has(String(p.id));
      if (iShared) sharers.unshift({ name: 'You', role: 'Resident', you: true });
      return {
        id: String(p.id),
        name: a.name,
        role: a.role,
        by: String(p.a || ''),
        t: Number(p.t) || 0,
        text: String(p.txt || ''),
        announcement: !!p.ann,
        pinned: !!p.pin,
        poll: !!p.poll,
        images: (p.img || []).map((i) => ({ bg: safeBg(i && i[0]), alt: String((i && i[1]) || 'Photo') })).filter((i) => i.bg),
        likes: who.counts.like,
        liked: mine === 'like',
        myReaction: mine,
        reactions: who.counts,
        reactionTotal: who.total,
        reactors: who.people,
        sharers,
        shares: sharers.length,
        shared: iShared,
        replies,
      };
    })
    .sort((x, y) => (y.pinned - x.pinned) || (y.t - x.t));
  return limit ? out.slice(0, limit) : out;
}

/** Give a post a reaction, or take it back by giving the same one again; a different one replaces the first. Returns { ok, kind } where kind is the
 *  reaction now (null when taken back), and ok is false when the post is not visible to residents. */
export function react(storage, residentId, postId, kind) {
  if (!isReaction(kind)) return { ok: false, kind: null };
  // A post, or a comment of a post the resident can see (their own, the feed's, another resident's).
  if (!timeline(storage, residentId).some((p) => p.id === String(postId) || p.replies.some((r) => r.id === String(postId)))) return { ok: false, kind: null };
  const st = residentState(storage, residentId);
  const id = String(postId);
  const was = st.liked.has(id) ? 'like' : st.reacts[id] || null;
  st.liked.delete(id);
  delete st.reacts[id];
  const now = was === kind ? null : kind;
  if (now === 'like') st.liked.add(id); else if (now) st.reacts[id] = now;
  return put(storage, residentId, st) ? { ok: true, kind: now } : { ok: false, kind: was };
}

/** Share a post to the resident's own profile, or take the share back. Returns { ok, shared }; ok is false when the post is not visible to residents. */
export function share(storage, residentId, postId) {
  if (!timeline(storage, residentId).some((p) => p.id === String(postId))) return { ok: false, shared: false };
  const st = residentState(storage, residentId);
  const id = String(postId);
  const now = !st.shares.has(id);
  if (now) st.shares.add(id); else st.shares.delete(id);
  return put(storage, residentId, st) ? { ok: true, shared: now } : { ok: false, shared: !now };
}

/** Follow a person (by key), or stop following them. A resident cannot follow themselves. Returns { ok, following }. */
export function follow(storage, residentId, key) {
  const k = canon(key);
  if (!k || k === `res:${residentId}`) return { ok: false, following: false };
  const st = residentState(storage, residentId);
  const mine = new Set(st.following);
  const now = !mine.has(k);
  if (now) mine.add(k); else mine.delete(k);
  st.following = [...mine];
  return put(storage, residentId, st) ? { ok: true, following: now } : { ok: false, following: !now };
}

/** Like or unlike (kept for what called it before there were other reactions). Returns the new state, or null when the post is not visible to residents. */
export function toggleLike(storage, residentId, postId) {
  const r = react(storage, residentId, postId, 'like');
  return r.ok ? r.kind === 'like' : null;
}

export const MAX_REPLY = 500;

/** A reply from this resident, to the post or (`to`, a comment id) to one comment of it. Returns { ok, reply?, reason? }. */
export function addReply(storage, residentId, postId, text, now = Date.now(), to = null) {
  if (!canReply(storage)) return { ok: false, reason: 'Replies are turned off by the property team.' };
  const post = timeline(storage, residentId).find((p) => p.id === postId);
  if (!post) return { ok: false, reason: 'This post is no longer available.' };
  if (to && !post.replies.some((r) => r.id === String(to))) return { ok: false, reason: 'That comment is no longer available.' };
  const body = String(text || '').trim();
  if (!body) return { ok: false, reason: 'Write something first.' };
  if (body.length > MAX_REPLY) return { ok: false, reason: `Keep replies under ${MAX_REPLY} characters.` };
  const st = residentState(storage, residentId);
  const list = st.replies[postId] || [];
  const reply = { id: `m${now}`, t: now, txt: body, likes: 0 };
  if (to) reply.re = String(to);
  st.replies[postId] = [...list, reply];
  if (!put(storage, residentId, st)) return { ok: false, reason: 'Could not save your reply. Try again.' };
  return { ok: true, reply: { id: reply.id, name: 'You', role: 'Resident', t: now, text: body, likes: 0, mine: true } };
}
