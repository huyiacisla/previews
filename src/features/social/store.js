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

import { companyPrefs } from "../../shared/js/company-prefs.js";
import { PERSONAS } from "../messaging/personas.js";
import { safeBg } from "./images.js";
import { foldersIn, holdIn, isHold, liveCounts, pauseMessage, reasonLabel, rulesOf, settle, shutsOut, violationsIn } from "./moderation.js";
import { byOf, canon, feedBy, feedShares, isReaction, OTHERS, reactorsOf } from "./reactions.js";
import { isPerson, reactionOf, residentActivity } from "./residents.js";
import { nest } from "./threads.js";

export const KEY = { feed: "eso-feed", mod: "eso-mod", social: "eso-social", mine: (id) => `eso-res-social:${id}` };

// Same text as the Staff prototype's default guidelines (v3).
export const DEFAULT_GUIDELINES = {
  ver: 3,
  pub: Date.parse("2026-10-12T10:00:00-07:00"),
  by: "Property Manager",
  accept: true,
  blocks: [
    ["Be a good neighbor", "Keep posts respectful and constructive. Disagree with ideas, not people. Assume good intent from neighbors and staff."],
    [
      "Protect everyone’s privacy",
      "Don’t post other residents’ license plates, unit numbers, names, phone numbers or photos of their vehicles or homes. To report a parking issue, use Requests or message the office — staff will follow up privately.",
    ],
    [
      "Parking disputes",
      "Social is not the place to call out a neighbor’s parking. Report blocked spots, guest-pass questions or towing concerns to the office. Towing and violation decisions are made by Mallard Pointe staff only.",
    ],
    [
      "Marketplace & promotions",
      "Personal items for sale are welcome in Discussions, one post per item per week. Business promotions are published by the property through Promotions; please don’t post unsolicited ads or referral links.",
    ],
    ["Quiet hours (10 PM – 7 AM)", "Please keep posts during quiet hours to urgent building matters. Noise concerns go to the courtesy patrol at (916) 555-0199, not to Social."],
    ["Photos and AI", "Only share photos you took or have permission to use. Label images or text that were created or substantially altered by AI as “AI-generated” or “AI-assisted”."],
  ],
};

// Who wrote a post, as a resident should see it: staff by role, neighbors by name, never a unit number.
const AUTHORS = {
  // A resident sees ONE name for every member of the staff: "Property team", whoever wrote or reacted (decision: staff are told apart inside, not outside).
  me: ["Property team", "Staff"],
  dana: ["Property team", "Staff"],
  luis: ["Property team", "Staff"],
  kim: ["Property team", "Staff"],
  alex: ["Alex Rivera", "Resident"],
  priya: ["Nadia Shah", "Resident"],
  marcus: ["Victor Lee", "Resident"],
  rena: ["Rena Okafor", "Resident"],
};
const author = (key) => {
  const a = AUTHORS[key];
  return a ? { name: a[0], role: a[1] } : { name: "Neighbor", role: "Resident" };
};

const read = (storage, key, fallback) => {
  try {
    const v = JSON.parse(storage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (storage, key, value) => {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

/** Staff switch for the whole of Social, and the company's ("Social timeline" in the Client's Residents settings). Missing means on. */
export function socialOn(storage) {
  const s = read(storage, KEY.social, {}) || {};
  return s.on !== false && companyPrefs(storage).social;
}

/** The guidelines Staff published, and whether residents must accept them before getting in. */
export function guidelines(storage) {
  const mod = read(storage, KEY.mod, {}) || {};
  const g = mod.gl && typeof mod.gl === "object" ? mod.gl : {};
  const blocks = Array.isArray(g.blocks) && g.blocks.length ? g.blocks : DEFAULT_GUIDELINES.blocks;
  return {
    ver: Number(g.ver) || DEFAULT_GUIDELINES.ver,
    pub: g.pub || DEFAULT_GUIDELINES.pub,
    by: g.by || DEFAULT_GUIDELINES.by,
    required: !(g.accept === false || g.accept === 0 || g.accept === "0"), // the Staff switch writes 0 or 1; missing means required
    blocks: blocks.filter((b) => Array.isArray(b) && b[0]).map((b) => [String(b[0]), String(b[1] || "")]),
  };
}

/** Can residents reply? Staff set who may reply; "all" means everyone. Posting is never open to residents. */
export function canReply(storage) {
  const mod = read(storage, KEY.mod, {}) || {};
  const r = mod.perms && mod.perms.reply;
  return !r || r === "all";
}

/* -------------------------------------------------------------- what a resident has done */

export function residentState(storage, residentId) {
  const s = read(storage, KEY.mine(residentId), {}) || {};
  return {
    accepted: Number(s.accepted) || 0,
    show: s.show !== false,
    liked: new Set(Array.isArray(s.liked) ? s.liked : []),
    // The reactions other than Like, { postId: 'love' }: a Like stays in `liked`, as before there were other reactions.
    reacts: s.reacts && typeof s.reacts === "object" ? Object.fromEntries(Object.entries(s.reacts).filter(([, k]) => OTHERS.includes(k))) : {},
    shares: new Set(Array.isArray(s.shares) ? s.shares.map(String) : []), // the posts this resident shared to their own profile
    following: Array.isArray(s.following) ? s.following.map((k) => canon(k)) : [], // the people this resident follows, by key ("dana", "res:res-2", "me")
    replies: s.replies && typeof s.replies === "object" ? s.replies : {},
    hidden: new Set(Array.isArray(s.hidden) ? s.hidden.map(String) : []), // the comments this resident hid for themselves
    acked: new Set(Array.isArray(s.acked) ? s.acked.map(String) : []), // the violation notices this resident has read ("Got it")
    resumed: new Set(Array.isArray(s.resumed) ? s.resumed.map(String) : []), // the pauses this resident has come back from (Resume Social)
    muted: new Set(Array.isArray(s.muted) ? s.muted.map(String) : []), // the neighbors this resident muted (by key, "priya"): their posts stay out of this resident's feed
  };
}

function put(storage, residentId, st) {
  // A post Staff deleted takes its place away from the resident's data too: what this resident wrote under it and shared of it go the next time they save.
  // (Only this resident's own key is written, as before.)
  const feed = read(storage, KEY.feed, { posts: [] }) || {};
  if (Array.isArray(feed.posts) && feed.posts.length) {
    const alive = new Set(feed.posts.map((p) => String(p.id)));
    st = { ...st, replies: Object.fromEntries(Object.entries(st.replies).filter(([postId]) => alive.has(String(postId)))), shares: new Set([...st.shares].filter((id) => alive.has(String(id)))) };
  }
  return write(storage, KEY.mine(residentId), {
    accepted: st.accepted,
    show: st.show,
    liked: [...st.liked],
    reacts: st.reacts,
    shares: [...st.shares],
    following: st.following,
    replies: st.replies,
    hidden: [...st.hidden],
    acked: [...st.acked],
    resumed: [...st.resumed],
    muted: [...st.muted],
  });
}

/** The resident has read a notice. A pause that is still running cannot be dismissed (the notice stays until it ends). Returns { ok }. */
export function ackNotice(storage, residentId, violationId, now = Date.now()) {
  const v = noticesOf(storage, residentId, now).find((x) => x.id === String(violationId));
  if (!v || v.active) return { ok: false };
  const st = residentState(storage, residentId);
  st.acked.add(v.id);
  return put(storage, residentId, st) ? { ok: true } : { ok: false };
}

/* ------------------------------------------------------------- what Staff did to this resident */

/** The hold this resident is under now ({ id, until, reason, note, rule, ended, … }) or null. A pause does not lift by itself: when its clock reaches zero the hold
 *  stays (`ended: true`) until the resident presses Resume (resumePause). Staff write the pause; a resident only reads it. */
export function pauseOf(storage, residentId, now = Date.now()) {
  return holdIn(read(storage, KEY.feed, {}) || {}, `res:${residentId}`, residentState(storage, residentId).resumed, now);
}

/** Come back after a pause: allowed only once every pause has reached zero. It marks them resumed, and makes the resident read and accept the guidelines again
 *  (their acceptance is cleared), which is the way back in. Returns { ok, reason? }. */
export function resumePause(storage, residentId, now = Date.now()) {
  const hold = pauseOf(storage, residentId, now);
  if (!hold) return { ok: false, reason: "Nothing to resume." };
  if (hold.review) return { ok: false, reason: "Your account is under review. Social opens when the property team reopens it." };
  if (!hold.ended) return { ok: false, reason: "The clock has not reached zero yet." };
  const st = residentState(storage, residentId);
  const feed = read(storage, KEY.feed, {}) || {};
  for (const v of Array.isArray(feed.vio) ? feed.vio : []) if (v.who === `res:${residentId}` && isHold(v) && Number(v.until) <= now) st.resumed.add(String(v.id));
  st.accepted = 0;
  return put(storage, residentId, st) ? { ok: true } : { ok: false, reason: "Could not save. Try again." };
}

/** Every violation Staff recorded on this resident, newest first, each with whether its pause is still running. */
export function noticesOf(storage, residentId, now = Date.now()) {
  return violationsIn(read(storage, KEY.feed, {}) || {}, `res:${residentId}`).map((v) => ({ ...v, label: reasonLabel(v.reason), active: isHold(v) && Number(v.until) > now }));
}

/** How many strikes close an account for review, as Staff set it (the Violations page → Rules). */
export function strikeLimit(storage) {
  return rulesOf(read(storage, KEY.feed, {}) || {}).limit;
}

/** The folders Staff opened for this resident (3 strikes each, kept in their history), oldest first: [{ id, t, strikes: [violation id] }]. */
export function foldersOf(storage, residentId) {
  return foldersIn(read(storage, KEY.feed, {}) || {}, `res:${residentId}`);
}

// Refused while paused: the reason, in the words the resident reads.
const pausedReason = (storage, residentId, now) => {
  const v = pauseOf(storage, residentId, now);
  return v ? pauseMessage(v) : "";
};

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

// The comments of one post as this resident reads them, in reading order with the answers under them (threads.js): the ones in the feed (Staff's answers
// sit under the comment they answer), what other residents wrote (read from their own data), and this resident's own words. Each one says who reacted
// to it, like a post does (the other residents' reactions are read from their data, too).
function commentsOf(p, st, residentId, feedData, others) {
  const nodes = [];
  const walk = (list, parent) => {
    for (const r of list || []) {
      if (!r || r.id == null) continue;
      // A comment the feed keeps under this resident's own name (the sample's "Alex Rivera") is theirs: it reads "You" and counts as their reply.
      nodes.push({
        id: String(r.id),
        a: r.a,
        key: r.a == null ? "" : canon(r.a),
        parent: r.re ? String(r.re) : parent,
        t: Number(r.t) || 0,
        txt: String(r.txt || ""),
        rb: r.rb,
        del: r.del,
        ed: r.ed,
        mine: r.a != null && canon(r.a) === `res:${residentId}`,
      });
      walk(r.rs, String(r.id));
    }
  };
  walk(p.rs, null);
  const mineKey = `res:${residentId}`;
  for (const r of st.replies[p.id] || [])
    nodes.push({ id: String(r.id), a: "", key: mineKey, parent: r.re ? String(r.re) : null, t: Number(r.t) || 0, txt: String(r.txt || ""), del: r.del, ed: r.ed, mine: true, editable: true });
  for (const res of others)
    for (const r of res.replies[String(p.id)] || [])
      nodes.push({
        id: String(r.id),
        a: `res:${res.id}`,
        key: `res:${res.id}`,
        parent: r.re ? String(r.re) : null,
        t: Number(r.t) || 0,
        txt: String(r.txt || ""),
        del: r.del,
        ed: r.ed,
        mine: false,
        fromResident: true,
      });
  const mrx = feedData.mrx && typeof feedData.mrx === "object" ? feedData.mrx : {};
  // A deleted or removed comment leaves a placeholder only where there are answers under it (the one who wrote a removed comment keeps seeing it, with the reason).
  const kept = settle(nodes, { removed: feedData.removed && typeof feedData.removed === "object" ? feedData.removed : {}, viewer: mineKey });
  return liveCounts(
    nest(kept).map((n) => {
      const ok = n.state === "ok";
      const isStaffMe = n.a === "me";
      const who0 = n.mine
        ? { name: "You", role: "Resident" }
        : n.a && n.a.startsWith("res:")
          ? { name: (PERSONAS.find((x) => x.id === n.a.slice(4)) || {}).name || "Neighbor", role: "Resident" }
          : author(n.a);
      const named = [];
      for (const [key, kind] of Object.entries(byOf(n.rb))) {
        if (key !== "me") {
          const w = author(key);
          named.push({ key: canon(key), name: w.name, role: w.role, kind });
        }
      }
      if (isReaction(mrx[n.id])) named.push({ key: "me", name: author("me").name, role: "Staff", kind: mrx[n.id] });
      for (const res of others) {
        const k = reactionOf(res, n.id);
        if (k) named.push({ key: `res:${res.id}`, name: res.name, role: "Resident", kind: k });
      }
      const mine = st.liked.has(n.id) ? "like" : st.reacts[n.id] || null;
      if (mine) named.push({ key: `res:${residentId}`, name: "You", role: "Resident", kind: mine, you: true });
      const who = reactorsOf(named);
      return {
        id: n.id,
        key: n.mine ? `res:${residentId}` : isStaffMe ? "me" : canon(n.a),
        name: who0.name,
        role: who0.role,
        t: n.t,
        text: ok ? n.txt : "",
        mine: !!n.mine,
        depth: n.depth,
        parentId: n.parentId,
        replyCount: n.replyCount,
        myReaction: mine,
        reactions: who.counts,
        reactionTotal: who.total,
        reactors: who.people,
        state: n.state,
        edited: ok && !!n.ed,
        hidden: st.hidden.has(n.id),
        removedReason: n.state === "removed" && n.mine && n.removal && n.removal.reason ? reasonLabel(n.removal.reason) : "", // only the author is told why
        // Change or delete: only a comment kept in this resident's own data (what the feed keeps under their name is Staff's to change). Hide: somebody else's.
        canEdit: ok && !!n.editable,
        canDelete: ok && !!n.editable,
        canHide: ok && !n.mine,
      };
    }),
  );
}

/**
 * Posts a resident may see: for everyone, pinned first then newest, with their own likes and replies merged in.
 * Posts for staff only are never returned. Returns [] when Staff turned Social off or the resident hid it.
 */
/** Did Staff switch Social off for this resident (Violations > the resident > Turn off Social)? Not a violation and not a strike: a switch. Messages are unaffected. */
export function staffSwitchedOff(storage, residentId) {
  const f = read(storage, KEY.feed, {}) || {};
  return Array.isArray(f.off) && f.off.includes(`res:${residentId}`);
}

/** Mute a neighbor: their posts leave this resident's feed (nobody else's). Staff and yourself cannot be muted. Returns { ok, reason? }. */
export function mutePerson(storage, residentId, key) {
  const k = canon(String(key || ""));
  if (!k || k === "me" || k === `res:${residentId}`) return { ok: false, reason: "You cannot mute yourself or the property team." };
  if (author(k).role !== "Resident") return { ok: false, reason: "You cannot mute the property team." };
  const st = residentState(storage, residentId);
  st.muted.add(k);
  return put(storage, residentId, st) ? { ok: true } : { ok: false, reason: "Could not save. Try again." };
}

/** Show everybody this resident muted again. */
export function unmuteAll(storage, residentId) {
  const st = residentState(storage, residentId);
  st.muted.clear();
  return put(storage, residentId, st) ? { ok: true } : { ok: false, reason: "Could not save. Try again." };
}

/** How many posts this resident's mutes hold back right now. */
export function hiddenByMute(storage, residentId, now = Date.now()) {
  return timeline(storage, residentId, { now, muted: false }).length - timeline(storage, residentId, { now }).length;
}

export function timeline(storage, residentId, { limit = 0, now = Date.now(), muted = true } = {}) {
  if (!socialOn(storage)) return [];
  const st = residentState(storage, residentId);
  if (!st.show) return [];
  if (staffSwitchedOff(storage, residentId)) return [];
  if (shutsOut(pauseOf(storage, residentId, now))) return []; // blocked completely (serious cases, or 3 strikes): nothing to read. An ordinary pause only stops writing.
  const feedData = read(storage, KEY.feed, { posts: [] }) || {};
  const posts = feedData.posts || [];
  const myRp = new Set((Array.isArray(feedData.myRp) ? feedData.myRp : []).map(String)); // the posts the property team shared
  const othersHere = residentActivity(storage).filter((r) => r.id !== residentId); // the other residents, read from their own data
  const out = posts
    .filter((p) => p && (p.aud === "all" || p.aud === "residents"))
    .filter((p) => !(muted && st.muted.has(canon(p.a))))
    .map((p) => {
      const a = author(p.a);
      const replies = commentsOf(p, st, residentId, feedData, othersHere);
      // The reactions are the people who gave them: the ones the feed names (staff by role, neighbors by name), the property team's own, the other
      // residents (read from their own data), and this resident. The count is the list.
      const mine = st.liked.has(String(p.id)) ? "like" : st.reacts[String(p.id)] || null;
      const named = [];
      for (const [key, kind] of Object.entries(feedBy(p))) {
        if (key !== "me") {
          const who = author(key);
          named.push({ key: canon(key), name: who.name, role: who.role, kind });
        }
      }
      if (isReaction(p.mr)) named.push({ key: "me", name: author("me").name, role: "Staff", kind: p.mr });
      for (const res of othersHere) {
        const k = reactionOf(res, p.id);
        if (k) named.push({ key: `res:${res.id}`, name: res.name, role: "Resident", kind: k });
      }
      if (mine) named.push({ key: `res:${residentId}`, name: "You", role: "Resident", kind: mine, you: true });
      const who = reactorsOf(named);
      // Shares are people too: the ones the feed names, the property team, the other residents, and this resident.
      const sharers = feedShares(p)
        .filter((k) => k !== "me")
        .map((k) => ({ name: author(k).name, role: author(k).role }));
      if (myRp.has(String(p.id))) sharers.push({ name: author("me").name, role: "Staff" });
      for (const res of othersHere) if (res.shares.has(String(p.id))) sharers.push({ name: res.name, role: "Resident" });
      const iShared = st.shares.has(String(p.id));
      if (iShared) sharers.unshift({ name: "You", role: "Resident", you: true });
      return {
        id: String(p.id),
        name: a.name,
        role: a.role,
        by: String(p.a || ""),
        t: Number(p.t) || 0,
        text: String(p.txt || ""),
        announcement: !!p.ann,
        pinned: !!p.pin,
        poll: !!p.poll,
        images: (p.img || []).map((i) => ({ bg: safeBg(i && i[0]), alt: String((i && i[1]) || "Photo") })).filter((i) => i.bg),
        likes: who.counts.like,
        liked: mine === "like",
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
    .sort((x, y) => y.pinned - x.pinned || y.t - x.t);
  return limit ? out.slice(0, limit) : out;
}

/** Give a post a reaction, or take it back by giving the same one again; a different one replaces the first. Returns { ok, kind } where kind is the
 *  reaction now (null when taken back), and ok is false when the post is not visible to residents. */
export function react(storage, residentId, postId, kind, at = Date.now()) {
  if (!isReaction(kind)) return { ok: false, kind: null };
  const paused = pausedReason(storage, residentId, at);
  if (paused) return { ok: false, kind: null, reason: paused };
  // A post, or a comment of a post the resident can see (their own, the feed's, another resident's).
  if (!timeline(storage, residentId, { now: at }).some((p) => p.id === String(postId) || p.replies.some((r) => r.id === String(postId)))) return { ok: false, kind: null };
  const st = residentState(storage, residentId);
  const id = String(postId);
  const was = st.liked.has(id) ? "like" : st.reacts[id] || null;
  st.liked.delete(id);
  delete st.reacts[id];
  const now = was === kind ? null : kind;
  if (now === "like") st.liked.add(id);
  else if (now) st.reacts[id] = now;
  return put(storage, residentId, st) ? { ok: true, kind: now } : { ok: false, kind: was };
}

/** Share a post to the resident's own profile, or take the share back. Returns { ok, shared }; ok is false when the post is not visible to residents. */
export function share(storage, residentId, postId, at = Date.now()) {
  const paused = pausedReason(storage, residentId, at);
  if (paused) return { ok: false, shared: false, reason: paused };
  if (!timeline(storage, residentId, { now: at }).some((p) => p.id === String(postId))) return { ok: false, shared: false };
  const st = residentState(storage, residentId);
  const id = String(postId);
  const now = !st.shares.has(id);
  if (now) st.shares.add(id);
  else st.shares.delete(id);
  return put(storage, residentId, st) ? { ok: true, shared: now } : { ok: false, shared: !now };
}

/** Follow a person (by key), or stop following them. A resident cannot follow themselves. Returns { ok, following }. */
export function follow(storage, residentId, key) {
  const k = canon(key);
  if (!k || k === `res:${residentId}`) return { ok: false, following: false };
  if (!isPerson(k)) return { ok: false, following: false, reason: "That person is not available." };
  const st = residentState(storage, residentId);
  const mine = new Set(st.following);
  const now = !mine.has(k);
  if (now) mine.add(k);
  else mine.delete(k);
  st.following = [...mine];
  return put(storage, residentId, st) ? { ok: true, following: now } : { ok: false, following: !now };
}

/** Like or unlike (kept for what called it before there were other reactions). Returns the new state, or null when the post is not visible to residents. */
export function toggleLike(storage, residentId, postId) {
  const r = react(storage, residentId, postId, "like");
  return r.ok ? r.kind === "like" : null;
}

export const MAX_REPLY = 500;

/**
 * The Staff person chose who may reply to THEIR posts (Settings > Social > Posts > Who can reply): everyone, only staff of the workspace,
 * or only the people the post mentions. Returns the reason a resident may not reply to this post, or '' when they may.
 */
export function replyBlockedBy(storage, residentId, post) {
  if (!post || post.by !== "me") return "";
  const s = read(storage, "eso-social", {}) || {};
  const rule = s.posts && s.posts.reply;
  if (rule === "workspace") return "Only the property team can reply to this post.";
  if (rule === "mentioned") {
    const name = String((PERSONAS.find((p) => p.id === residentId) || {}).name || "").toLowerCase();
    const text = String(post.text || "").toLowerCase();
    const first = name.split(/\s+/)[0];
    const mentioned = !!name && (text.includes(`@${name}`) || (first && new RegExp(`@${first}\\b`).test(text)));
    if (!mentioned) return "Only the people mentioned in this post can reply.";
  }
  return "";
}

/** A reply from this resident, to the post or (`to`, a comment id) to one comment of it. Returns { ok, reply?, reason? }. */
export function addReply(storage, residentId, postId, text, now = Date.now(), to = null) {
  if (!canReply(storage)) return { ok: false, reason: "Replies are turned off by the property team." };
  const paused = pausedReason(storage, residentId, now);
  if (paused) return { ok: false, reason: paused };
  const post = timeline(storage, residentId, { now }).find((p) => p.id === postId);
  if (!post) return { ok: false, reason: "This post is no longer available." };
  if (to && !post.replies.some((r) => r.id === String(to) && r.state === "ok")) return { ok: false, reason: "That comment is no longer available." };
  const blocked = replyBlockedBy(storage, residentId, post);
  if (blocked) return { ok: false, reason: blocked };
  const body = String(text || "").trim();
  if (!body) return { ok: false, reason: "Write something first." };
  if (body.length > MAX_REPLY) return { ok: false, reason: `Keep replies under ${MAX_REPLY} characters.` };
  const st = residentState(storage, residentId);
  const list = st.replies[postId] || [];
  // The id is the time in milliseconds. Two people answering in the same millisecond used to get the same id, and Staff's view of the post
  // (which reads every resident's replies together) showed only one of them: an "x" is added until the id is free.
  const taken = new Set();
  const collect = (list) => {
    for (const r of list || []) {
      taken.add(String(r.id));
      collect(r.rs);
    }
  };
  for (const r of residentActivity(storage)) for (const list of Object.values(r.replies || {})) collect(list);
  for (const p of (read(storage, KEY.feed, { posts: [] }) || {}).posts || []) collect(p.rs);
  let rid = `m${now}`;
  while (taken.has(rid)) rid += "x";
  const reply = { id: rid, t: now, txt: body, likes: 0 };
  if (to) reply.re = String(to);
  st.replies[postId] = [...list, reply];
  if (!put(storage, residentId, st)) return { ok: false, reason: "Could not save your reply. Try again." };
  return { ok: true, reply: { id: reply.id, name: "You", role: "Resident", t: now, text: body, likes: 0, mine: true } };
}

// One of this resident's own comments, wherever in their data it is: { st, post, node } or null.
function ownReply(storage, residentId, commentId) {
  const st = residentState(storage, residentId);
  for (const [post, list] of Object.entries(st.replies)) {
    const node = (list || []).find((r) => r && String(r.id) === String(commentId));
    if (node) return { st, post, node };
  }
  return null;
}

/** Change one of your own comments. Not while your activity is paused (a pause stops what you write), and not once Staff removed it. */
export function editReply(storage, residentId, commentId, text, now = Date.now()) {
  const paused = pausedReason(storage, residentId, now);
  if (paused) return { ok: false, reason: paused };
  const body = String(text || "").trim();
  if (!body) return { ok: false, reason: "Write something first." };
  if (body.length > MAX_REPLY) return { ok: false, reason: `Keep replies under ${MAX_REPLY} characters.` };
  const own = ownReply(storage, residentId, commentId);
  const feed = read(storage, KEY.feed, {}) || {};
  if (!own || own.node.del) return { ok: false, reason: "You can only change your own comments." };
  if (feed.removed && feed.removed[String(commentId)]) return { ok: false, reason: "That comment is no longer available." };
  own.node.txt = body;
  own.node.ed = now;
  return put(storage, residentId, own.st) ? { ok: true } : { ok: false, reason: "Could not save your change. Try again." };
}

/** Delete one of your own comments. Answers under it stay, under a placeholder. Allowed while paused: taking your own words back is never held against you. */
export function deleteReply(storage, residentId, commentId, now = Date.now()) {
  const own = ownReply(storage, residentId, commentId);
  if (!own) return { ok: false, reason: "You can only delete your own comments." };
  if (own.node.del) return { ok: false, reason: "That comment is already deleted." }; // the time it was deleted is not rewritten
  const feed = read(storage, KEY.feed, {}) || {};
  if (feed.removed && feed.removed[String(commentId)]) return { ok: false, reason: "That comment is no longer available." }; // Staff took it out: it is kept for the record
  own.node.del = now;
  return put(storage, residentId, own.st) ? { ok: true } : { ok: false, reason: "Could not delete. Try again." };
}

/** Hide somebody else's comment from yourself, or show it again. Only you stop seeing it. Returns { ok, hidden }. */
export function hideComment(storage, residentId, commentId, at = Date.now()) {
  if (!timeline(storage, residentId, { now: at }).some((p) => p.replies.some((r) => r.id === String(commentId)))) return { ok: false, hidden: false };
  const st = residentState(storage, residentId);
  const id = String(commentId);
  const now = !st.hidden.has(id);
  if (now) st.hidden.add(id);
  else st.hidden.delete(id);
  return put(storage, residentId, st) ? { ok: true, hidden: now } : { ok: false, hidden: !now };
}
