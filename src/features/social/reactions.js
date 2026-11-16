// The reactions a person can give a post, and how they are counted. Pure logic, no DOM, shared by the Staff and the Resident side.
//
// Everything is counted from PEOPLE: a post has as many reactions as there are people who reacted, each with one reaction (one per person per post), and
// the list of who is the same as the count. Where the people are kept:
//   - the feed names some in the post's `rb` ({ dana: 'like' }, by author key);
//   - a Staff person's own reaction is `mr` (and `lk` for a Like, as before there were other reactions);
//   - each resident keeps theirs in their own data: `liked` (a Like) and `reacts` ({ postId: 'love' }).
// A number the feed kept before ("likes": 48) is not counted any more: nobody could be named for it. The sample posts name their people below.

export const REACTIONS = [
  { id: 'like', label: 'Like', icon: '👍' },
  { id: 'love', label: 'Love', icon: '❤️' },
  { id: 'laugh', label: 'Haha', icon: '😄' },
  { id: 'wow', label: 'Wow', icon: '😮' },
  { id: 'sad', label: 'Sad', icon: '😢' },
];
export const KINDS = REACTIONS.map((r) => r.id);
export const isReaction = (k) => KINDS.includes(k);
export const OTHERS = KINDS.filter((k) => k !== 'like'); // every reaction but Like, which has its own place in the data
export const labelOf = (k) => (REACTIONS.find((r) => r.id === k) || REACTIONS[0]).label;
export const iconOf = (k) => (REACTIONS.find((r) => r.id === k) || REACTIONS[0]).icon;

// Who reacted to the sample posts (a timeline kept by an earlier visit has no `rb`, so they are read from here). Staff-only posts have only staff.
const SAMPLE_BY = {
  p1: { dana: 'like', luis: 'like', kim: 'love', marcus: 'love', priya: 'wow', rena: 'like' },
  p2: { luis: 'like', kim: 'like', rena: 'like', marcus: 'love' },
  p3: { kim: 'like', dana: 'love' },
  p4: { dana: 'like', kim: 'like', luis: 'like', priya: 'like', marcus: 'wow', rena: 'like' },
  p5: { kim: 'like', dana: 'love', luis: 'like', marcus: 'laugh', rena: 'love' },
  p6: { dana: 'like', luis: 'like' },
  p7: { priya: 'like', marcus: 'like', kim: 'love' },
  p8: { kim: 'love', luis: 'like', priya: 'love', marcus: 'like', rena: 'love' },
  p9: { kim: 'like', marcus: 'laugh' },
};
// Who shared the sample posts (the feed's `sb`, by author key).
const SAMPLE_SHARES = { p1: ['dana', 'kim'], p2: ['kim'], p4: ['dana'], p8: ['kim', 'luis', 'priya'], p9: ['kim'] };

/** The people the feed names as having reacted to a post, { authorKey: reaction }. */
export function feedBy(p) {
  const by = p && p.rb && typeof p.rb === 'object' ? p.rb : (p && SAMPLE_BY[p.id]) || {};
  const out = {};
  for (const [k, v] of Object.entries(by)) if (isReaction(v)) out[k] = v;
  return out;
}

/** A map of { personKey: reaction } with the reactions that are real ones (what a comment's `rb` holds). */
export function byOf(obj) {
  const out = {};
  if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) if (isReaction(v)) out[k] = v;
  return out;
}

// One person has one key everywhere. The feed names Alex Rivera "alex"; as a resident he is "res:res-1". The key of the person using Staff is "me".
const ALIAS = { alex: 'res:res-1' };
export const canon = (key) => (Object.prototype.hasOwnProperty.call(ALIAS, key) ? ALIAS[key] : String(key)); // (a key like "constructor" is not an alias)

/** The people the feed names as having shared a post: [authorKey]. */
export function feedShares(p) {
  const sb = p && Array.isArray(p.sb) ? p.sb : (p && SAMPLE_SHARES[p.id]) || [];
  return sb.map(String);
}

/** From the people who reacted ([{ name, role, kind, you? }]): the list in a fixed order (you first, then by reaction, then by name), the count of each
 *  reaction and the total. The list and the counts are the same people, so they always agree. */
export function reactorsOf(named) {
  const order = (k) => KINDS.indexOf(k);
  const people = named.slice().sort((a, b) => (b.you ? 1 : 0) - (a.you ? 1 : 0) || order(a.kind) - order(b.kind) || a.name.localeCompare(b.name));
  const counts = Object.fromEntries(KINDS.map((k) => [k, people.filter((n) => n.kind === k).length]));
  return { people, counts, total: people.length };
}

/** The reactions in use, the most given first, at most `max` of them. */
export function topKinds(counts, max = 3) {
  return KINDS.filter((k) => counts[k] > 0).sort((a, b) => counts[b] - counts[a] || KINDS.indexOf(a) - KINDS.indexOf(b)).slice(0, max);
}

/** "48 likes, 7 loves, 2 wows" for a tooltip and for screen readers. */
export function describe(counts) {
  const word = { like: ['like', 'likes'], love: ['love', 'loves'], laugh: ['haha', 'hahas'], wow: ['wow', 'wows'], sad: ['sad', 'sads'] };
  return KINDS.filter((k) => counts[k] > 0).map((k) => `${counts[k]} ${word[k][counts[k] === 1 ? 0 : 1]}`).join(', ');
}
