// What every resident did in Social, read from each resident's own data ("eso-res-social:<id>"). Pure logic, no DOM.
//
// A resident writes only their own key and the Resident app never writes Staff's data. What other people did (their reactions, their replies) is READ
// from their keys, so Staff see residents' reactions and replies, and a resident sees what other residents reacted. Nothing here writes.

import { PERSONAS } from '../messaging/personas.js';
import { isReaction, canon } from './reactions.js';

export const residentKey = (id) => `eso-res-social:${id}`;

/** Every resident persona's activity: [{ id, name, liked: Set(postId), reacts: { postId: kind }, shares: Set(postId), replies: { postId: [reply] }, following: [key] }]. */
export function residentActivity(storage) {
  const out = [];
  for (const p of PERSONAS) {
    if (p.role !== 'resident') continue;
    let s = null;
    try { s = JSON.parse(storage.getItem(residentKey(p.id))); } catch { s = null; }
    if (!s || typeof s !== 'object') continue;
    const reacts = {};
    if (s.reacts && typeof s.reacts === 'object') for (const [post, k] of Object.entries(s.reacts)) if (isReaction(k) && k !== 'like') reacts[String(post)] = k;
    out.push({
      id: p.id,
      name: p.name,
      liked: new Set(Array.isArray(s.liked) ? s.liked.map(String) : []),
      reacts,
      shares: new Set(Array.isArray(s.shares) ? s.shares.map(String) : []),
      replies: s.replies && typeof s.replies === 'object' ? s.replies : {},
      following: Array.isArray(s.following) ? s.following.map(String) : [],
    });
  }
  return out;
}

/** Who follows a person (by key): "me" when the Staff person does, and each resident who does. */
export function followersOf(storage, key) {
  const k = canon(key);
  const out = [];
  try {
    const feed = JSON.parse(storage.getItem('eso-feed'));
    if (feed && Array.isArray(feed.follow) && feed.follow.some((x) => canon(x) === k)) out.push('me');
  } catch { /* no feed yet */ }
  for (const r of residentActivity(storage)) if (r.following.some((x) => canon(x) === k)) out.push(`res:${r.id}`);
  return out;
}

const PEOPLE = {
  dana: ['Noor Hassan', 'Staff'], luis: ['Luis Ortega', 'Staff'], kim: ['Kim Tran', 'Staff'],
  alex: ['Alex Rivera', 'Resident'], priya: ['Nadia Shah', 'Resident'], marcus: ['Victor Lee', 'Resident'], rena: ['Rena Okafor', 'Resident'],
};

/** Is this the key of a person Social knows ("me", a Staff or neighbor name, or a resident who logs in)? Following anyone else is refused. */
export function isPerson(key) {
  const k = canon(key);
  if (!k) return false;
  if (k === 'me') return true;
  if (k.startsWith('res:')) return PERSONAS.some((p) => p.role === 'resident' && p.id === k.slice(4));
  return  Object.hasOwn(PEOPLE, k);
}

/** Who a person key is: { name, role }. "me" is the Staff person using the Staff app, which a resident reads as the property team (`staffName`). */
export function whoIs(key, staffName = 'Property team') {
  const k = canon(key);
  if (k === 'me') return { name: staffName, role: 'Staff' };
  if (k.startsWith('res:')) { const r = PERSONAS.find((p) => p.id === k.slice(4)); return { name: r ? r.name : 'Neighbor', role: 'Resident' }; }
  const a = PEOPLE[k];
  return a ? { name: a[0], role: a[1] } : { name: 'Neighbor', role: 'Resident' };
}

/** The reaction a resident gave a post: 'like', another kind, or null. */
export const reactionOf = (res, postId) => (res.liked.has(String(postId)) ? 'like' : res.reacts[String(postId)] || null);
