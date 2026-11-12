import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAll, readMap, setRead, isRead, counts, unreadCount, latestUnread, query, groupByDay, dayLabel, badgeText, CATEGORIES, TONES, ROLE_CATEGORIES, ROLE_PROPERTIES, PROPERTIES } from '../src/notifications/store.js';

const NOW = new Date('2026-11-10T15:00:00').getTime();
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test('the list agrees with what the Client pages already say', () => {
  const list = buildAll(NOW);
  const map = {};
  const c = counts(list, map);
  assert.equal(c.unread, 109, '109 need attention, as the bell always said');
  assert.equal(c.total, c.unread + c.read);
  const unreadBy = (cat) => list.filter((n) => n.cat === cat && !isRead(n, map)).length;
  assert.equal(unreadBy('messages'), 16, '16 unread messages (Communication)');
  assert.equal(unreadBy('plan'), 2, 'Parking Spots and Staff over limit');
  assert.equal(unreadBy('properties'), 1, 'one property needing attention');
  const titles = list.map((n) => `${n.title}|${n.detail}`);
  assert.ok(titles.includes('Parking Spots over limit|261 / 25 on your plan'));
  assert.ok(titles.includes('Staff over limit|18 / 3 on your plan'));
});

test('newest first, ids are unique, every category is named', () => {
  const list = buildAll(NOW);
  for (let i = 1; i < list.length; i += 1) assert.ok(list[i - 1].ts >= list[i].ts);
  assert.equal(new Set(list.map((n) => n.id)).size, list.length);
  assert.ok(list.every((n) => CATEGORIES[n.cat]));
  assert.ok(list.every((n) => n.ts <= NOW));
});

test('the same input always gives the same list (only the times follow "now")', () => {
  const a = buildAll(NOW).map((n) => [n.id, n.title, n.read]);
  const b = buildAll(NOW + 3600000).map((n) => [n.id, n.title, n.read]);
  assert.deepEqual(a, b);
});

test('read and unread are remembered per person, one change at a time or many', () => {
  const s = mem();
  const list = buildAll(NOW);
  const first = list.find((n) => !n.read);
  setRead(s, 'cli-1', [first.id], true);
  assert.equal(isRead(first, readMap(s, 'cli-1')), true);
  assert.equal(isRead(first, readMap(s, 'cli-2')), false, 'another person is not affected');
  assert.equal(unreadCount(s, 'cli-1', NOW), 108);
  setRead(s, 'cli-1', [first.id], false);
  assert.equal(unreadCount(s, 'cli-1', NOW), 109);
  setRead(s, 'cli-1', list.map((n) => n.id), true);
  assert.equal(unreadCount(s, 'cli-1', NOW), 0);
  assert.equal(counts(list, readMap(s, 'cli-1')).read, list.length);
});

test('broken storage is harmless', () => {
  const bad = { getItem: () => '{not json', setItem: () => { throw new Error('full'); } };
  assert.deepEqual(readMap(bad, 'x'), {});
  assert.doesNotThrow(() => setRead(bad, 'x', ['n-messages-0'], true));
  assert.deepEqual(readMap({ getItem: () => '[1,2]' }, 'x'), {});
  assert.equal(unreadCount(bad, 'x', NOW), 109);
});

test('search needs every word; status, category and property narrow it', () => {
  const list = buildAll(NOW);
  const map = {};
  assert.equal(query(list, map, {}).length, list.length);
  const q1 = query(list, map, { q: 'violation spot' });
  assert.ok(q1.length > 0 && q1.every((n) => /violation/i.test(n.title + n.detail + 'Violations') && /spot/i.test(n.title + n.detail + (n.prop || ''))));
  assert.equal(query(list, map, { q: 'zzzz-nothing' }).length, 0);
  assert.ok(query(list, map, { status: 'unread' }).every((n) => !isRead(n, map)));
  assert.ok(query(list, map, { status: 'read' }).every((n) => isRead(n, map)));
  assert.ok(query(list, map, { cat: 'violations' }).every((n) => n.cat === 'violations'));
  assert.ok(query(list, map, { prop: 'Sundale' }).every((n) => n.prop === 'Sundale'));
  assert.equal(query(list, map, { cat: 'messages', status: 'unread' }).length, 16);
  // a changed read state moves an item between the status views
  const m2 = { [list.find((n) => !n.read).id]: true };
  assert.equal(query(list, m2, { status: 'unread' }).length, 108);
});

test('sorting: oldest first, and unread before read', () => {
  const list = buildAll(NOW);
  const old = query(list, {}, { sort: 'oldest' });
  for (let i = 1; i < old.length; i += 1) assert.ok(old[i - 1].ts <= old[i].ts);
  const u = query(list, {}, { sort: 'unread' });
  const firstRead = u.findIndex((n) => isRead(n, {}));
  assert.ok(u.slice(0, firstRead).every((n) => !isRead(n, {})) && u.slice(firstRead).every((n) => isRead(n, {})));
});

test('the bell lists the newest unread ones', () => {
  const list = buildAll(NOW);
  const top = latestUnread(list, {}, 4);
  assert.equal(top.length, 4);
  assert.ok(top.every((n) => !isRead(n, {})));
  const gone = { [top[0].id]: true };
  assert.notEqual(latestUnread(list, gone, 4)[0].id, top[0].id);
});

test('days: Today, Yesterday, then the date; groups keep the order', () => {
  assert.equal(dayLabel(NOW - 3600000, NOW), 'Today');
  assert.equal(dayLabel(NOW - 86400000, NOW), 'Yesterday');
  assert.match(dayLabel(NOW - 4 * 86400000, NOW), /^\w+day, \w+ \d+$/);
  const groups = groupByDay(buildAll(NOW), NOW);
  assert.equal(groups[0].label, 'Today');
  assert.equal(groups.reduce((n, g) => n + g.items.length, 0), buildAll(NOW).length);
  assert.equal(new Set(groups.map((g) => g.label)).size, groups.length, 'each day appears once');
});

test('each portal has its own list, with the number its bell already showed', () => {
  assert.equal(counts(buildAll(NOW, 'staff'), {}).unread, 7, 'Staff: 7 need attention');
  assert.equal(counts(buildAll(NOW, 'resident'), {}).unread, 33, 'Resident: 33 need attention');
  assert.equal(counts(buildAll(NOW, 'client'), {}).unread, 109);
  assert.equal(counts(buildAll(NOW), {}).unread, 109, 'no role means Client, as before');
  for (const role of ['staff', 'resident', 'client']) {
    const list = buildAll(NOW, role);
    assert.equal(new Set(list.map((n) => n.id)).size, list.length, `${role}: ids are unique`);
    assert.ok(list.every((n) => CATEGORIES[n.cat] && TONES[n.cat]), `${role}: every category is named`);
    assert.ok(list.every((n) => ROLE_CATEGORIES[role].includes(n.cat)), `${role}: only its own categories`);
    for (let i = 1; i < list.length; i += 1) assert.ok(list[i - 1].ts >= list[i].ts, `${role}: newest first`);
  }
});

test('a Resident sees nothing meant for Staff, and Staff nothing meant for a Client', () => {
  const res = buildAll(NOW, 'resident').map((n) => `${n.title} ${n.detail}`).join(' ');
  assert.ok(!/capacity|plan limit|violation escalated|staff tool|draft/i.test(res));
  const staff = buildAll(NOW, 'staff').map((n) => `${n.title} ${n.detail}`).join(' ');
  assert.ok(!/over limit|Properties needing attention|Billing contact/i.test(staff));
  assert.deepEqual(ROLE_PROPERTIES.staff, [PROPERTIES[0]]);
  assert.ok(ROLE_PROPERTIES.client.length > 1, 'only a Client has several properties to filter by');
});

test('read state is per person and per portal list', () => {
  const s = mem();
  setRead(s, 'stf-1', buildAll(NOW, 'staff').map((n) => n.id), true);
  assert.equal(unreadCount(s, 'stf-1', NOW, 'staff'), 0);
  assert.equal(unreadCount(s, 'stf-2', NOW, 'staff'), 7);
  assert.equal(unreadCount(s, 'res-1', NOW, 'resident'), 33);
});

test('badge text: the count, 99+ above 99, nothing at zero', () => {
  assert.equal(badgeText(109), '99+');
  assert.equal(badgeText(100), '99+');
  assert.equal(badgeText(99), '99');
  assert.equal(badgeText(7), '7');
  assert.equal(badgeText(0), '');
});
