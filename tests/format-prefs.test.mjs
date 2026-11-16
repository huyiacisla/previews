import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTime, listTime, dayKey, timePrefs } from '../src/features/messaging/format.js';

// 2026-11-15 15:07 UTC
const TS = Date.UTC(2026, 10, 15, 15, 7);
const store = (v) => ({ getItem: (k) => (k === 'ui-prefs:staff' ? v : null) });

test('times in Messages follow Settings > Date and time: 24-hour clock and the chosen time zone', () => {
  const saved = { l: globalThis.localStorage, loc: globalThis.location };
  try {
    globalThis.location = { pathname: '/staff/messages.html' };
    // nothing chosen: 12-hour, as before
    globalThis.localStorage = store(null);
    assert.equal(formatTime(TS, 'UTC'), '3:07 PM', 'a caller\'s own zone is left alone');
    // 24-hour, with a zone
    globalThis.localStorage = store(JSON.stringify({ time: { h24: true, tz: 'America/Los_Angeles' } }));
    assert.deepEqual(timePrefs(), { h24: true, tz: 'America/Los_Angeles' });
    assert.equal(formatTime(TS), '07:07', '15:07 UTC is 07:07 in Los Angeles in November');
    assert.equal(listTime(TS, TS), '07:07');
    assert.equal(dayKey(TS), '2026-11-15');
    // 24-hour, no zone chosen: the clock is 24-hour; the day and zone are the machine's
    globalThis.localStorage = store(JSON.stringify({ time: { h24: true, tz: '' } }));
    assert.match(formatTime(TS), /^\d{2}:\d{2}$/);
    assert.ok(!/AM|PM/.test(formatTime(TS)));
    // a zone that does not exist, or junk, changes nothing and never throws
    globalThis.localStorage = store(JSON.stringify({ time: { h24: false, tz: 'Mars/Olympus' } }));
    assert.deepEqual(timePrefs(), { h24: false, tz: '' });
    globalThis.localStorage = store('not json');
    assert.deepEqual(timePrefs(), { h24: false, tz: '' });
    globalThis.localStorage = store(JSON.stringify({ time: 5 }));
    assert.deepEqual(timePrefs(), { h24: false, tz: '' });
    // not a portal page: no preference applies
    globalThis.location = { pathname: '/somewhere/else.html' };
    globalThis.localStorage = store(JSON.stringify({ time: { h24: true, tz: 'Asia/Tokyo' } }));
    assert.deepEqual(timePrefs(), { h24: false, tz: '' });
  } finally {
    globalThis.localStorage = saved.l;
    globalThis.location = saved.loc;
    if (saved.l === undefined) delete globalThis.localStorage;
    if (saved.loc === undefined) delete globalThis.location;
  }
});
