// Social monitoring for Admin. Pure logic, no DOM, so node --test can run it.
//
// Admin watches the Social of every property: what is posted, what is being answered, and what Staff did about it (violations, accounts under
// review). It is a window, not a tool: nothing here writes the feed. The people who run each property (Staff) keep moderating it from their own pages.
//
// Every property has its own feed (scope.js): the first one is "eso-feed", each one added in Capacity is "eso-feed:extra-N", made when it is bought.
// The channels list names every property of the company; one whose feed does not exist (bought before feeds were made, or its Staff have not started)
// shows as quiet, which is not an error.

import { timeline, violations, standings } from './staff-store.js';
import { ensureFeed } from './seed.js';
import { scoped, hasFeed } from './scope.js';
import { normalizePurchased, propertiesCount } from '../capacity/store.js';
import { propertyName } from '../property-name.js';
import { activity, diagnose, summary } from './diagnose.js';
import { endedRecord } from '../property-lifecycle.js';

export const KINDS = ['Announcement', 'Community post', 'Promotion', 'Staff discussion'];
export const AUDIENCE_LABEL = { all: 'Everyone', residents: 'Residents', staff: 'Staff only' };

const purchasedOf = (storage) => { try { return normalizePurchased(JSON.parse(storage.getItem('capacity-state:client'))); } catch { return normalizePurchased(null); } };

/** The properties Admin can switch between: the first one (it has the feed) and each one added in Capacity. */
export function channels(storage) {
  const bought = purchasedOf(storage).properties;
  const first = endedRecord(storage, 'main');
  const list = [{ id: 'main', name: propertyName(storage), live: !first, ended: !!first, endedAt: first ? first.at : null, endedBy: first ? first.by || null : null }];
  // The id is the one the property was given when it was added (capacity/store.js), never its place in the list.
  bought.forEach((p) => { const rec = endedRecord(storage, p.id); const ended = p.status === 'ended' || !!rec; list.push({ id: p.id, name: p.name, live: !ended && hasFeed(storage, p.id), ended, endedAt: p.endedAt || (rec && rec.at) || null, endedBy: (rec && rec.by) || null }); });
  return { list, total: propertiesCount(purchasedOf(storage)) };
}

const EMPTY = { posts: [], violations: [], standings: [], log: [], checks: [], stats: { problems: 0, checksRun: 0, posts: 0, comments: 0, announcements: 0, staffOnly: 0, violations: 0, active: 0, review: 0, reactions: 0 } };

/** Everything to show for one channel: the posts (newest first, pinned first), the violations, the accounts under review, and the counts. */
export function monitor(root, channelId = 'main', now = Date.now()) {
  // A property that has ended is not looked at: its data is sealed, and making a feed for it now would bring back what was cut off.
  if (endedRecord(root, channelId)) return { ...EMPTY, live: false, ended: true };
  // The first property's feed is made on first look (Staff and Residents do the same); another property's is only ever made when it is bought.
  if (channelId === 'main') ensureFeed(root, now);
  else if (!hasFeed(root, channelId)) return { ...EMPTY, live: false };
  const storage = scoped(root, channelId);
  // The posts Staff wrote as "me" carry no name of their own in the feed: they are the property team's.
  const posts = timeline(storage, 'Property team').map((p) => ({
    id: p.id, author: p.name, role: p.role, at: p.t, text: p.text, kind: p.kind, aud: p.aud, audience: AUDIENCE_LABEL[p.aud] || 'Everyone', pinned: p.pinned,
    reactions: p.reactionTotal, shares: p.shares, views: p.views,
    replies: flat(p.replies),
  }));
  const vio = violations(storage, now);
  const stand = standings(storage, now).filter((s) => s.status !== 'clear' || s.count > 0);
  const comments = posts.reduce((n, p) => n + p.replies.length, 0);
  const checks = diagnose(storage, now);
  const sum = summary(checks);
  return {
    live: true,
    posts,
    log: activity(storage),
    checks,
    violations: vio.map((v) => ({ id: v.id, who: v.name || v.who, reason: v.label, at: v.t, kind: v.kind, active: v.active, until: Number(v.until) || null, note: v.note || '' })),
    standings: stand.map((s) => ({ who: s.name, unit: s.unit, status: s.status, count: s.count, limit: s.limit, until: s.until })),
    stats: {
      problems: sum.failed, checksRun: sum.run,
      posts: posts.length, comments,
      announcements: posts.filter((p) => p.kind === 'Announcement').length,
      staffOnly: posts.filter((p) => p.aud === 'staff').length,
      violations: vio.length, active: vio.filter((v) => v.active).length,
      review: stand.filter((s) => s.status === 'review').length,
      reactions: posts.reduce((n, p) => n + p.reactions, 0),
    },
  };
}

/** One card per property for the Social management list: its name, whether it has Social activity, and a few numbers (a quiet property still has its card). */
export function overview(storage, now = Date.now()) {
  return channels(storage).list.map((c) => {
    // A property that has ended shows as ended, with no numbers: its data is cut off, and reading it again would be reading what must not be read.
    if (c.ended) return { id: c.id, name: c.name, live: false, ended: true, endedAt: c.endedAt, endedBy: c.endedBy || null, posts: 0, replies: 0, review: 0, active: 0, problems: 0, lastAt: null, attention: 0 };
    const m = monitor(storage, c.id, now);
    const last = m.posts.reduce((t, p) => Math.max(t, p.at), 0);
    // `ended` is always there, true or false: a page that binds `:hidden="c.ended"` hides the element when it is undefined (docs/qa/09, lesson 17).
    return { id: c.id, name: c.name, live: c.live, ended: false, endedAt: null, endedBy: null, posts: m.stats.posts, replies: m.stats.comments, review: m.stats.review, active: m.stats.active, problems: m.stats.problems, lastAt: last || null, attention: m.stats.review + m.stats.active + m.stats.problems };
  });
}

/** Search by name; show: 'all' | 'active' (has posts) | 'quiet' (none yet) | 'attention' (an account under review, a pause running, or a data check that found something). */
export function filterChannels(cards, { q = '', show = 'all' } = {}) {
  const needle = String(q).trim().toLowerCase();
  return cards.filter((c) => (!needle || c.name.toLowerCase().includes(needle))
    && (show === 'ended' ? c.ended
      : !c.ended && (show === 'all' || (show === 'active' && c.posts > 0) || (show === 'quiet' && c.posts === 0) || (show === 'attention' && c.attention > 0))));
}

function flat(list) {
  return (list || []).filter((r) => r.state === 'ok').map((r) => ({ id: r.id, author: r.name, role: r.role, at: r.t, text: r.text, depth: r.depth || 0, hidden: !!r.hidden }));
}

/** Search (author, text), kind and audience filters; the order of the list is kept. */
export function filterPosts(posts, { q = '', kind = 'all', aud = 'any' } = {}) {
  const needle = String(q).trim().toLowerCase();
  return posts.filter((p) => (kind === 'all' || p.kind === kind) && (aud === 'any' || p.aud === aud)
    && (!needle || p.text.toLowerCase().includes(needle) || p.author.toLowerCase().includes(needle) || p.replies.some((r) => r.text.toLowerCase().includes(needle))));
}
