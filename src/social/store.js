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
    replies: s.replies && typeof s.replies === 'object' ? s.replies : {},
  };
}

function put(storage, residentId, st) {
  return write(storage, KEY.mine(residentId), { accepted: st.accepted, show: st.show, liked: [...st.liked], replies: st.replies });
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

function toReply(r, mine) {
  const a = author(r.a);
  return { id: String(r.id), name: a.name, role: a.role, t: Number(r.t) || 0, text: String(r.txt || ''), likes: Number(r.likes) || 0, mine: !!mine };
}

/**
 * Posts a resident may see: for everyone, pinned first then newest, with their own likes and replies merged in.
 * Posts for staff only are never returned. Returns [] when Staff turned Social off or the resident hid it.
 */
export function timeline(storage, residentId, { limit = 0 } = {}) {
  if (!socialOn(storage)) return [];
  const st = residentState(storage, residentId);
  if (!st.show) return [];
  const posts = (read(storage, KEY.feed, { posts: [] }) || {}).posts || [];
  const out = posts
    .filter((p) => p && (p.aud === 'all' || p.aud === 'residents'))
    .map((p) => {
      const a = author(p.a);
      const replies = [...(p.rs || []).map((r) => toReply(r, false)), ...(st.replies[p.id] || []).map((r) => toReply({ ...r, a: '' }, true))];
      return {
        id: String(p.id),
        name: a.name,
        role: a.role,
        t: Number(p.t) || 0,
        text: String(p.txt || ''),
        announcement: !!p.ann,
        pinned: !!p.pin,
        poll: !!p.poll,
        images: (p.img || []).map((i) => ({ bg: safeBg(i && i[0]), alt: String((i && i[1]) || 'Photo') })).filter((i) => i.bg),
        likes: (Number(p.likes) || 0) + (st.liked.has(String(p.id)) ? 1 : 0),
        liked: st.liked.has(String(p.id)),
        replies: replies.map((r) => (r.mine ? { ...r, name: 'You', role: 'Resident' } : r)),
      };
    })
    .sort((x, y) => (y.pinned - x.pinned) || (y.t - x.t));
  return limit ? out.slice(0, limit) : out;
}

/** Like or unlike. Returns the new state, or null when the post is not visible to residents. */
export function toggleLike(storage, residentId, postId) {
  if (!timeline(storage, residentId).some((p) => p.id === postId)) return null;
  const st = residentState(storage, residentId);
  const now = !st.liked.has(postId);
  if (now) st.liked.add(postId); else st.liked.delete(postId);
  put(storage, residentId, st);
  return now;
}

export const MAX_REPLY = 500;

/** A reply from this resident. Returns { ok, reply?, reason? }. */
export function addReply(storage, residentId, postId, text, now = Date.now()) {
  if (!canReply(storage)) return { ok: false, reason: 'Replies are turned off by the property team.' };
  if (!timeline(storage, residentId).some((p) => p.id === postId)) return { ok: false, reason: 'This post is no longer available.' };
  const body = String(text || '').trim();
  if (!body) return { ok: false, reason: 'Write something first.' };
  if (body.length > MAX_REPLY) return { ok: false, reason: `Keep replies under ${MAX_REPLY} characters.` };
  const st = residentState(storage, residentId);
  const list = st.replies[postId] || [];
  const reply = { id: `m${now}`, t: now, txt: body, likes: 0 };
  st.replies[postId] = [...list, reply];
  if (!put(storage, residentId, st)) return { ok: false, reason: 'Could not save your reply. Try again.' };
  return { ok: true, reply: { id: reply.id, name: 'You', role: 'Resident', t: now, text: body, likes: 0, mine: true } };
}
