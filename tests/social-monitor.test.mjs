import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monitor, channels, filterPosts, overview, filterChannels } from '../src/social/monitor.js';

const store = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };

test('Admin sees every post of the property, with its counts, and the feed is not changed by looking', () => {
  const s = store();
  const m = monitor(s, 'main');
  assert.equal(m.live, true);
  assert.ok(m.posts.length >= 8);
  assert.equal(m.stats.posts, m.posts.length);
  assert.ok(m.posts.some((p) => p.aud === 'staff'), 'the posts kept for staff are visible to Admin');
  const before = s.getItem('eso-feed');
  monitor(s, 'main');
  assert.equal(s.getItem('eso-feed'), before);
});

test('channels list the first property and each one added in Capacity; an added one is quiet', () => {
  const s = store({ 'capacity-state:client': JSON.stringify({ properties: [{ name: 'Harbor Court', units: 40 }] }) });
  const c = channels(s);
  assert.deepEqual(c.list.map((x) => x.name).slice(1), ['Harbor Court']);
  assert.equal(c.list[0].live, true);
  assert.equal(c.list[1].live, false);
  const q = monitor(s, 'extra-1');
  assert.equal(q.live, false);
  assert.equal(q.stats.posts, 0);
  assert.equal(s.getItem('eso-feed'), null, 'a quiet channel does not create a feed');
});

test('filter by kind, audience and words (author, post or reply)', () => {
  const m = monitor(store(), 'main');
  const ann = filterPosts(m.posts, { kind: 'Announcement' });
  assert.ok(ann.length && ann.every((p) => p.kind === 'Announcement'));
  const staff = filterPosts(m.posts, { aud: 'staff' });
  assert.ok(staff.length && staff.every((p) => p.aud === 'staff'));
  assert.equal(filterPosts(m.posts, { q: 'zzzz-nothing' }).length, 0);
  assert.ok(filterPosts(m.posts, { q: 'garage' }).length >= 1);
});

test('the property list: one card for each property, the first one with its posts, an added one quiet; search and filter', () => {
  const s = store({ 'capacity-state:client': JSON.stringify({ properties: [{ name: 'Harbor Court', units: 40 }] }) });
  const cards = overview(s);
  assert.equal(cards.length, 2);
  assert.ok(cards[0].posts > 0);
  assert.equal(cards[1].name, 'Harbor Court');
  assert.equal(cards[1].posts, 0);
  assert.deepEqual(filterChannels(cards, { q: 'harbor' }).map((c) => c.name), ['Harbor Court']);
  assert.deepEqual(filterChannels(cards, { show: 'quiet' }).map((c) => c.name), ['Harbor Court']);
  assert.equal(filterChannels(cards, { show: 'active' }).length, 1);
  assert.equal(filterChannels(cards, { q: 'zzz' }).length, 0);
});

test('every card says whether it ended, true or false (a page that binds hidden to an undefined value hides the element)', () => {
  const s = store({ 'capacity-state:client': JSON.stringify({ properties: [{ name: 'Harbor Court', units: 40 }] }) });
  for (const c of overview(s)) assert.equal(typeof c.ended, 'boolean', c.name);
});

test('a running pause says when it ends', () => {
  const s = store();
  monitor(s, 'main'); // makes the sample feed
  const f = JSON.parse(s.getItem('eso-feed'));
  const until = Date.now() + 3600000;
  f.vio = [{ id: 'v1', who: 'res:res-1', name: 'Alex Rivera', kind: 'pause', t: Date.now() - 60000, until, reason: 'spam' }];
  s.setItem('eso-feed', JSON.stringify(f));
  const v = monitor(s, 'main').violations[0];
  assert.equal(v.active, true);
  assert.equal(v.until, until);
});

test('a broken feed shows as an empty channel, not an error', () => {
  const s = store({ 'eso-feed': '{not json' });
  const m = monitor(s, 'main');
  assert.ok(Array.isArray(m.posts));
});
