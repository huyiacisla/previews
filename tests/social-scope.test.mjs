import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyFor, scoped, hasFeed } from '../src/social/scope.js';
import { ensurePropertyFeed } from '../src/social/seed.js';
import { monitor, overview, channels } from '../src/social/monitor.js';
import { diagnose } from '../src/social/diagnose.js';

const store = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), keys: () => [...m.keys()] }; };
const bought = (n) => ({ 'capacity-state:client': JSON.stringify({ properties: Array.from({ length: n }, (_, i) => ({ name: `Property ${i + 2}`, units: 10 })) }) });

test('the first property keeps its plain keys; another property gets its own copy of each Social key', () => {
  assert.equal(keyFor('main', 'eso-feed'), 'eso-feed');
  assert.equal(keyFor(undefined, 'eso-social'), 'eso-social');
  assert.equal(keyFor('extra-1', 'eso-feed'), 'eso-feed:extra-1');
  assert.equal(keyFor('extra-2', 'eso-social'), 'eso-social:extra-2');
  assert.equal(keyFor('extra-1', 'eso-res-social:res-1'), 'eso-res-social:extra-1:res-1');
  assert.equal(keyFor('extra-1', 'capacity-state:client'), 'capacity-state:client', 'keys that are not Social stay as they are');
});

test('a scoped storage reads and writes the property\'s own keys and never the first property\'s', () => {
  const s = store({ 'eso-feed': 'MAIN' });
  const x = scoped(s, 'extra-1');
  assert.equal(x.getItem('eso-feed'), null);
  x.setItem('eso-feed', 'EXTRA');
  assert.equal(s.getItem('eso-feed'), 'MAIN');
  assert.equal(s.getItem('eso-feed:extra-1'), 'EXTRA');
  assert.equal(scoped(s, 'main'), s);
});

test('buying a property makes its feed with a welcome post; it never replaces one, and never touches the first property', () => {
  const s = store({ 'eso-feed': 'MAIN' });
  assert.equal(ensurePropertyFeed(s, 'extra-1', 'Harbor Court'), true);
  assert.equal(ensurePropertyFeed(s, 'extra-1', 'Other'), false);
  assert.equal(ensurePropertyFeed(s, 'main', 'x'), false);
  assert.equal(s.getItem('eso-feed'), 'MAIN');
  assert.equal(hasFeed(s, 'extra-1'), true);
  assert.match(JSON.parse(s.getItem('eso-feed:extra-1')).posts[0].txt, /Harbor Court/);
});

test('each property shows its own posts and its own checks; one property\'s fault is not another\'s', () => {
  const s = store(bought(2));
  ensurePropertyFeed(s, 'extra-1', 'Property 2');
  monitor(s, 'main'); // the first property's sample feed
  const a = monitor(s, 'main'), b = monitor(s, 'extra-1');
  assert.ok(a.posts.length >= 8);
  assert.equal(b.posts.length, 1);
  assert.equal(b.live, true);
  assert.equal(monitor(s, 'extra-2').live, false, 'a property with no feed is quiet');
  // damage only the second property's feed
  const f = JSON.parse(s.getItem('eso-feed:extra-1')); f.posts.push({ id: 'w1', a: 'me', t: Date.now(), txt: 'twin', aud: 'all' }); s.setItem('eso-feed:extra-1', JSON.stringify(f));
  assert.equal(monitor(s, 'extra-1').stats.problems, 1);
  assert.equal(monitor(s, 'main').stats.problems, 0);
  assert.deepEqual(diagnose(scoped(s, 'extra-1')).filter((c) => !c.ok).map((c) => c.id), ['unique-ids']);
});

test('the list names every property, says which have a feed, and counts problems of each', () => {
  const s = store(bought(2));
  ensurePropertyFeed(s, 'extra-1', 'Property 2');
  const cards = overview(s);
  assert.equal(cards.length, 3);
  assert.deepEqual(channels(s).list.map((c) => c.live), [true, true, false]);
  assert.equal(cards[1].posts, 1);
  assert.equal(cards[2].posts, 0);
});
