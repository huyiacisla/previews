// Social: editing, deleting and hiding comments, and what Staff may do to a comment: remove it, or record a violation (a warning, or a pause until a date).
// Real people through the real stores; every rule has a case that must be refused as well as one that works.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureFeed } from '../src/social/seed.js';
import { REASONS, checkViolation, ruleFor, clockParts, strikesOf, pauseMessage, MAX_NOTE, looksLikeSpam } from '../src/social/moderation.js';
import * as staff from '../src/social/staff-store.js';
import * as res from '../src/social/store.js';

const NOW = Date.parse('2026-11-10T15:00:00');
const HOUR = 3600000;
const DAY = 24 * HOUR;
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), dump: () => Object.fromEntries(m) }; };
const fresh = () => { const s = mem(); ensureFeed(s, NOW); return s; };
const ME = 'Jordan Lee';
const sc = (s, post = 'p1', id) => { const l = staff.timeline(s, ME).find((p) => p.id === post).replies; return id ? l.find((r) => r.id === id) : l; };
const rc = (s, who = 'res-1', post = 'p1', id) => { const l = res.timeline(s, who).find((p) => p.id === post).replies; return id ? l.find((r) => r.id === id) : l; };
const pause = (extra = {}) => ({ comment: 'x', reason: 'hate', note: '', kind: 'pause', until: NOW + 2 * DAY, ...extra });

/* ------------------------------------------------------------ the rules of a violation */

test('a violation needs a known reason, a note for "another reason", and a pause that ends between 15 minutes and 90 days from now', () => {
  const ok = (v) => checkViolation(v, NOW);
  assert.equal(ok(pause()).ok, true);
  assert.equal(ok(pause({ reason: 'nope' })).ok, false);
  assert.equal(ok(pause({ reason: undefined })).ok, false);
  assert.equal(ok(pause({ reason: 'other', note: '' })).ok, false, '"another reason" must say what it is');
  assert.equal(ok(pause({ reason: 'other', note: '  ' })).ok, false);
  assert.equal(ok(pause({ reason: 'other', note: 'Threats' })).ok, true);
  assert.equal(ok(pause({ note: 'x'.repeat(MAX_NOTE + 1) })).ok, false);
  assert.equal(ok(pause({ kind: 'ban' })).ok, false);
  assert.equal(ok(pause({ until: undefined })).ok, false);
  assert.equal(ok(pause({ until: NaN })).ok, false);
  assert.equal(ok(pause({ until: NOW - HOUR })).ok, false, 'a date in the past');
  assert.equal(ok(pause({ until: NOW + 10 * 60000 })).ok, false, 'shorter than 15 minutes');
  assert.equal(ok(pause({ until: NOW + 15 * 60000 })).ok, true);
  assert.equal(ok(pause({ until: NOW + 90 * DAY })).ok, true);
  assert.equal(ok(pause({ until: NOW + 91 * DAY })).ok, false);
  assert.equal(ok({ reason: 'hate', kind: 'warning' }).ok, true, 'a warning has no date');
});

test('the clock splits the time left into days, hours, minutes and seconds, and a day goes when its 24 hours are gone', () => {
  assert.deepEqual(clockParts(2 * DAY + 3 * HOUR + 59 * 60000 + 50 * 1000), { d: 2, h: 3, m: 59, s: 50 });
  assert.deepEqual(clockParts(DAY), { d: 1, h: 0, m: 0, s: 0 });
  assert.deepEqual(clockParts(DAY - 1000), { d: 0, h: 23, m: 59, s: 59 }, 'one second less than a day: no day left');
  assert.deepEqual(clockParts(DAY + 999), { d: 1, h: 0, m: 0, s: 0 }, 'part of a second is not counted');
  assert.deepEqual(clockParts(0), { d: 0, h: 0, m: 0, s: 0 });
  assert.deepEqual(clockParts(-5000), { d: 0, h: 0, m: 0, s: 0 }, 'never negative');
  assert.deepEqual(clockParts(undefined), { d: 0, h: 0, m: 0, s: 0 });
  assert.deepEqual(clockParts(90 * DAY), { d: 90, h: 0, m: 0, s: 0 }, 'the longest pause');
});

test('strikes: a pause is a strike, numbered from the oldest, a warning is not, and the limit is 3', () => {
  const v = (id, daysAgo, kind = 'pause') => ({ id, t: NOW - daysAgo * DAY, kind });
  const none = strikesOf([], []);
  assert.deepEqual([none.count, none.limit, none.atLimit, none.items, none.folders], [0, 3, false, [], []]);
  const one = strikesOf([v('a', 1)], []);
  assert.equal(one.count, 1);
  assert.equal(one.items[0].strike, 1);
  assert.equal(one.items[0].counting, true);
  assert.equal(strikesOf([{ id: 'p', t: NOW, kind: 'pause', until: NOW + DAY }]).items[0].until, NOW + DAY, 'the pause’s own end date is left alone');
  // newest first in, numbered oldest first: the strike number is the order they happened in
  const three = strikesOf([v('c', 1), v('b', 10), v('a', 30)]);
  assert.deepEqual(three.items.map((i) => [i.id, i.strike]), [['c', 3], ['b', 2], ['a', 1]]);
  assert.equal(three.atLimit, true);
  // there is no expiry: a strike stays until Staff open the account
  assert.equal(strikesOf([v('old', 400)]).count, 1);
  // a warning is on the record but is not a strike, and does not shift the numbering of the ones that are
  const mixed = strikesOf([v('p2', 2), v('w', 5, 'warning'), v('p1', 8)]);
  assert.equal(mixed.count, 2);
  assert.deepEqual(mixed.items.map((i) => [i.id, i.strike, i.counting]), [['p2', 2, true], ['w', 0, false], ['p1', 1, true]]);
});

test('folders: three strikes sealed into a folder leave the count, not the record, and the next run starts from one', () => {
  const v = (id, daysAgo, kind = 'pause') => ({ id, t: NOW - daysAgo * DAY, kind });
  const list = [v('f2', 1), v('f1', 3), v('e', 4), v('d', 6), v('w', 7, 'warning'), v('c', 9), v('b', 20), v('a', 30)];
  const folders = [{ id: 'F1', t: NOW - 8 * DAY, strikes: ['a', 'b', 'c'] }, { id: 'F2', t: NOW - 2 * DAY, strikes: ['d', 'e', 'f1'] }];
  const st = strikesOf(list, folders);
  assert.equal(st.count, 1, 'f2 is the only one not in a folder');
  assert.equal(st.atLimit, false);
  const by = Object.fromEntries(st.items.map((i) => [i.id, i]));
  assert.deepEqual([by.a.folder, by.a.strike, by.a.counting], ['F1', 1, false], 'it keeps its place in its folder');
  assert.deepEqual([by.f1.folder, by.f1.strike], ['F2', 3]);
  assert.deepEqual([by.f2.folder, by.f2.strike, by.f2.counting], [null, 1, true], 'a new run starts from one');
  assert.equal(by.w.folder, null, 'a warning is in no folder');
  assert.deepEqual(st.items.map((i) => i.id), list.map((i) => i.id), 'nothing was dropped');
  assert.deepEqual(st.folders.map((f) => [f.id, f.number]), [['F2', 2], ['F1', 1]], 'newest first, numbered in the order they were opened');
  assert.deepEqual(st.folders[1].items.map((i) => i.id), ['a', 'b', 'c']);
  assert.deepEqual(st.folders[0].items.map((i) => i.id), ['d', 'e', 'f1']);
  assert.equal(strikesOf(list, [{ id: 'X', t: NOW, strikes: ['nope'] }]).folders[0].items.length, 0, 'a folder naming a record that is not there is harmless');
});

test('three strikes close the account for review: no clock, no Resume, nothing to read, until Staff open it', () => {
  const s = fresh();
  const strike = (n, at) => { const c = res.addReply(s, 'res-2', 'p1', `rude ${n}`, at); const r = staff.addViolation(s, { comment: c.reply.id, reason: 'hate', kind: 'pause', until: at + HOUR, alsoRemove: true }, at + 1); return r.violation; };
  // the first two: an ordinary pause each
  strike(1, NOW); assert.equal(res.pauseOf(s, 'res-2', NOW + 5 * HOUR).review, undefined, 'one strike: an ordinary pause');
  res.resumePause(s, 'res-2', NOW + 5 * HOUR); res.acceptGuidelines(s, 'res-2');
  strike(2, NOW + 6 * HOUR);
  assert.equal(staff.accountsUnderReview(s).length, 0);
  res.resumePause(s, 'res-2', NOW + 12 * HOUR); res.acceptGuidelines(s, 'res-2');
  // the third closes it, however long ago the clock ran out
  const third = strike(3, NOW + 13 * HOUR);
  const later = NOW + 30 * DAY;
  const hold = res.pauseOf(s, 'res-2', later);
  assert.equal(hold.review, true);
  assert.equal(hold.until, null, 'there is no end date to count down to');
  assert.equal(hold.id, third.id);
  assert.deepEqual(res.timeline(s, 'res-2', { now: later }), []);
  const refused = res.addReply(s, 'res-2', 'p1', 'hello', later);
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /under review/);
  const resume = res.resumePause(s, 'res-2', later);
  assert.equal(resume.ok, false);
  assert.match(resume.reason, /under review/, 'Resume is not the way out of a review');
  assert.match(pauseMessage(hold), /3 strikes/);
  assert.ok(res.timeline(s, 'res-1', { now: later }).length > 0, 'nobody else is affected');
  const queue = staff.accountsUnderReview(s);
  assert.deepEqual(queue.map((q) => [q.who, q.name, q.count]), [['res:res-2', 'Priya Nair', 3]]);
  assert.equal(queue[0].latest.id, third.id);
});

// A strike on a resident: they come back from the one before (Resume, guidelines) if they were held, write a comment, and Staff pause them for an hour over it.
const strikeOn = (s, id, n, at) => {
  const hold = res.pauseOf(s, id, at);
  if (hold && !hold.review) { assert.deepEqual(res.resumePause(s, id, at), { ok: true }); res.acceptGuidelines(s, id); }
  const c = res.addReply(s, id, 'p1', `rude ${n}`, at);
  assert.ok(c.ok, `comment ${n}: ${c.reason}`);
  return staff.addViolation(s, { comment: c.reply.id, reason: 'harass', kind: 'pause', until: at + HOUR, alsoRemove: true }, at + 1).violation;
};

test('Staff open an account: the three strikes become a folder, the count starts again, the record stays, and the way back is Resume', () => {
  const s = fresh();
  const ids = [1, 2, 3].map((n) => strikeOn(s, 'res-2', n, NOW + n * DAY).id);
  const later = NOW + 20 * DAY;
  assert.equal(staff.openAccount(s, 'res:res-1', later).ok, false, 'not at the limit');
  assert.equal(staff.openAccount(s, 'res:nobody', later).ok, false);
  const opened = staff.openAccount(s, 'res:res-2', later);
  assert.ok(opened.ok);
  assert.deepEqual(opened.folder.strikes, ids, 'the three, in the order they happened');
  assert.equal(opened.folder.t, later);
  assert.equal(opened.folder.name, 'Priya Nair');
  assert.deepEqual(staff.accountsUnderReview(s), [], 'nobody is waiting any more');
  assert.equal(staff.openAccount(s, 'res:res-2', later).ok, false, 'a second time there is nothing to open');
  // the count is empty again, the record is whole
  const notes = res.noticesOf(s, 'res-2', later);
  assert.equal(notes.length, 3);
  const st = strikesOf(notes, res.foldersOf(s, 'res-2'));
  assert.deepEqual([st.count, st.atLimit, st.folders.length, st.folders[0].items.length], [0, false, 1, 3]);
  // the review lock is gone: the pauses' clocks ran out long ago, so what is left is Resume, and the guidelines
  const hold = res.pauseOf(s, 'res-2', later);
  assert.equal(hold.review, undefined);
  assert.equal(hold.ended, true);
  assert.deepEqual(res.resumePause(s, 'res-2', later), { ok: true });
  res.acceptGuidelines(s, 'res-2');
  assert.ok(res.timeline(s, 'res-2', { now: later }).length > 0);
  // a second run: another three make a second folder and the first stays
  for (const n of [4, 5, 6]) strikeOn(s, 'res-2', n, later + n * DAY);
  assert.equal(res.pauseOf(s, 'res-2', later + 10 * DAY).review, true, 'three again: closed again');
  assert.ok(staff.openAccount(s, 'res:res-2', later + 10 * DAY).ok);
  const both = strikesOf(res.noticesOf(s, 'res-2', later + 10 * DAY), res.foldersOf(s, 'res-2'));
  assert.deepEqual(both.folders.map((f) => [f.number, f.items.length]), [[2, 3], [1, 3]], 'two folders, the newest first');
  assert.equal(both.items.length, 6, 'six records, none dropped');
  assert.equal(both.count, 0);
});

test('a strike that comes while the account is under review stays in the next run, and only the oldest three are sealed', () => {
  const s = fresh();
  // res-3 is reviewed after three; a fourth is recorded on a comment written before the lock (Staff act on what was written)
  const first3 = [1, 2, 3].map((n) => strikeOn(s, 'res-3', n, NOW + n * DAY).id);
  assert.equal(res.timeline(s, 'res-3', { now: NOW + 4 * DAY }).length, 0, 'shut out now: a comment cannot be added');
  const extra = (() => { const f = JSON.parse(s.getItem('eso-feed')); const v = { ...f.vio[0], id: 'v-extra', t: NOW + 5 * DAY, comment: 'x-extra' }; f.vio.push(v); s.setItem('eso-feed', JSON.stringify(f)); return v; })();
  const opened = staff.openAccount(s, 'res:res-3', NOW + 6 * DAY);
  assert.deepEqual(opened.folder.strikes, first3, 'the oldest three');
  const st = strikesOf(res.noticesOf(s, 'res-3', NOW + 6 * DAY), res.foldersOf(s, 'res-3'));
  assert.equal(st.count, 1);
  assert.equal(st.items.find((i) => i.id === extra.id).strike, 1, 'it starts the new run');
});

test('every reason but "another reason" points at a block of the guidelines, and says which', () => {
  const blocks = [['Be a good neighbor', 'Keep posts respectful.'], ['Protect everyone’s privacy', 'No plates.']];
  assert.deepEqual(ruleFor('hate', blocks), { title: 'Be a good neighbor', text: 'Keep posts respectful.' });
  assert.equal(ruleFor('other', blocks), null);
  assert.equal(ruleFor('spam', blocks).text, '', 'a rule the guidelines no longer carry is still named');
  assert.ok(REASONS.filter((r) => r.id !== 'other').every((r) => r.rule), 'each reason names its rule');
});

/* ------------------------------------------------------- your own comments: edit and delete */

test('a resident changes their own comment; nobody else’s, and not Staff’s', () => {
  const s = fresh();
  const c = res.addReply(s, 'res-1', 'p1', 'Frist draft', NOW).reply;
  assert.deepEqual(res.editReply(s, 'res-1', c.id, 'First draft', NOW + 1000), { ok: true });
  const seen = rc(s, 'res-1', 'p1', c.id);
  assert.equal(seen.text, 'First draft');
  assert.equal(seen.edited, true);
  assert.equal(seen.canEdit, true);
  assert.equal(rc(s, 'res-2', 'p1', c.id).canEdit, false, 'another resident cannot');
  assert.equal(res.editReply(s, 'res-2', c.id, 'Hacked', NOW).ok, false);
  assert.equal(res.editReply(s, 'res-1', 'r3', 'Hacked', NOW).ok, false, 'a neighbor’s comment in the feed is not theirs to change');
  assert.equal(res.editReply(s, 'res-1', c.id, '   ', NOW).ok, false);
  assert.equal(res.editReply(s, 'res-1', c.id, 'x'.repeat(501), NOW).ok, false);
  assert.equal(sc(s, 'p1', c.id).text, 'First draft', 'Staff read the change');
  assert.equal(sc(s, 'p1', c.id).edited, true);
});

test('what the feed keeps under a resident’s name reads as theirs but is not theirs to change: Staff’s data is not written by a resident', () => {
  const s = fresh();
  const own = rc(s, 'res-1', 'p1', 'r1');
  assert.equal(own.mine, true);
  assert.equal(own.canEdit, false);
  assert.equal(own.canDelete, false);
  const before = s.getItem('eso-feed');
  const c = res.addReply(s, 'res-1', 'p1', 'Mine', NOW).reply;
  res.editReply(s, 'res-1', c.id, 'Mine, changed', NOW + 1);
  res.deleteReply(s, 'res-1', c.id, NOW + 2);
  res.hideComment(s, 'res-1', 'r3');
  assert.equal(s.getItem('eso-feed'), before, 'nothing a resident does touches the feed');
});

test('deleting twice, or deleting a comment Staff removed, is refused and changes nothing', () => {
  const s = fresh();
  const c = res.addReply(s, 'res-1', 'p1', 'Mine', NOW).reply;
  const kid = res.addReply(s, 'res-2', 'p1', 'Kid', NOW + 5, c.id).reply; // an answer keeps the comment as a placeholder
  assert.ok(res.deleteReply(s, 'res-1', c.id, NOW + 10).ok);
  const saved = s.getItem('eso-res-social:res-1');
  assert.match(res.deleteReply(s, 'res-1', c.id, NOW + 99).reason, /already deleted/);
  assert.equal(s.getItem('eso-res-social:res-1'), saved, 'the time it was deleted is not rewritten');
  const d = res.addReply(s, 'res-1', 'p1', 'Another', NOW + 20).reply;
  assert.ok(staff.removeComment(s, d.id, NOW + 21).ok);
  const keep = s.getItem('eso-res-social:res-1');
  assert.match(res.deleteReply(s, 'res-1', d.id, NOW + 22).reason, /no longer available/);
  assert.equal(s.getItem('eso-res-social:res-1'), keep, 'a removed comment is kept for the record');
  assert.ok(kid.id);
});

test('deleting: gone when nothing is under it, a placeholder when there are answers, and the answers keep their count', () => {
  const s = fresh();
  const top = res.addReply(s, 'res-1', 'p1', 'Top', NOW).reply;
  assert.ok(rc(s, 'res-1', 'p1', top.id));
  assert.deepEqual(res.deleteReply(s, 'res-1', top.id, NOW + 1), { ok: true });
  assert.equal(rc(s, 'res-1', 'p1', top.id), undefined, 'nothing under it: it disappears');
  assert.equal(rc(s, 'res-2', 'p1', top.id), undefined, 'for everyone');
  const parent = res.addReply(s, 'res-1', 'p1', 'Parent', NOW + 10).reply;
  const kid = res.addReply(s, 'res-2', 'p1', 'Kid', NOW + 20, parent.id).reply;
  res.deleteReply(s, 'res-1', parent.id, NOW + 30);
  const ph = rc(s, 'res-2', 'p1', parent.id);
  assert.equal(ph.state, 'deleted');
  assert.equal(ph.text, '', 'the words are gone');
  assert.equal(ph.canEdit, false);
  assert.equal(rc(s, 'res-2', 'p1', kid.id).text, 'Kid');
  assert.equal(ph.replyCount, 1);
  assert.equal(res.addReply(s, 'res-2', 'p1', 'To a deleted one', NOW + 40, parent.id).ok, false, 'a deleted comment cannot be answered');
  assert.equal(res.deleteReply(s, 'res-2', parent.id, NOW).ok, false, 'not somebody else’s');
  res.deleteReply(s, 'res-2', kid.id, NOW + 50);
  assert.equal(rc(s, 'res-2', 'p1', parent.id), undefined, 'when the last answer goes, so does the placeholder');
});

test('Staff change and delete their own comments, not a resident’s', () => {
  const s = fresh();
  assert.equal(sc(s, 'p1', 'r1a').canEdit, true, 'r1a is the Staff person’s answer');
  assert.equal(sc(s, 'p1', 'r2').canEdit, false);
  assert.deepEqual(staff.editComment(s, 'r1a', 'Level 2 stays open until 11 AM.', NOW), { ok: true });
  assert.equal(sc(s, 'p1', 'r1a').text, 'Level 2 stays open until 11 AM.');
  assert.equal(sc(s, 'p1', 'r1a').edited, true);
  assert.equal(rc(s, 'res-1', 'p1', 'r1a').text, 'Level 2 stays open until 11 AM.', 'the resident reads the change');
  assert.equal(staff.editComment(s, 'r2', 'x', NOW).ok, false);
  assert.equal(staff.deleteComment(s, 'r2', NOW).ok, false);
  const mine = res.addReply(s, 'res-1', 'p1', 'A resident comment', NOW);
  assert.equal(staff.editComment(s, mine.reply.id, 'x', NOW).ok, false, 'a resident’s comment in their own data');
  assert.equal(staff.deleteComment(s, 'r1a', NOW + 1).ok, true);
  assert.equal(sc(s, 'p1', 'r1a'), undefined, 'nothing under it: gone');
});

/* ------------------------------------------------------------------------------- hide */

test('hiding a comment hides it only for the one who hid it, and can be undone', () => {
  const s = fresh();
  assert.deepEqual(res.hideComment(s, 'res-1', 'r3'), { ok: true, hidden: true });
  assert.equal(rc(s, 'res-1', 'p1', 'r3').hidden, true);
  assert.equal(rc(s, 'res-2', 'p1', 'r3').hidden, false);
  assert.equal(sc(s, 'p1', 'r3').hidden, false);
  assert.equal(rc(s, 'res-1', 'p1', 'r3').text, 'Is the surface lot gated during cleaning?', 'the words stay for "Show"');
  assert.deepEqual(res.hideComment(s, 'res-1', 'r3'), { ok: true, hidden: false }, 'again: shown again');
  assert.equal(res.hideComment(s, 'res-1', 'nope').ok, false);
  assert.equal(staff.hideComment(s, 'r3').hidden, true);
  assert.equal(sc(s, 'p1', 'r3').hidden, true);
  assert.equal(rc(s, 'res-2', 'p1', 'r3').hidden, false, 'Staff hiding does not hide it for residents');
  assert.equal(rc(s, 'res-1', 'p1', 'r3').canHide, true);
  assert.equal(rc(s, 'res-1', 'p1', 'r1').canHide, false, 'not your own comment');
});

/* ------------------------------------------------------------------------------ remove */

test('Staff remove a comment: it is gone for everyone, a placeholder where there are answers, and only somebody else’s', () => {
  const s = fresh();
  const c = res.addReply(s, 'res-2', 'p1', 'Rude words', NOW).reply;
  assert.equal(sc(s, 'p1', c.id).canRemove, true);
  assert.equal(sc(s, 'p1', 'r1a').canRemove, false, 'your own: delete it instead');
  assert.deepEqual(staff.removeComment(s, c.id, NOW + 1), { ok: true });
  assert.equal(staff.removeComment(s, c.id, NOW + 2).ok, false, 'twice');
  assert.equal(staff.removeComment(s, 'r1a', NOW).ok, false);
  assert.equal(staff.removeComment(s, 'nope', NOW).ok, false);
  assert.equal(sc(s, 'p1', c.id), undefined);
  assert.equal(rc(s, 'res-3', 'p1', c.id), undefined);
  // the author is not left wondering: they still see it, without the words
  const theirs = rc(s, 'res-2', 'p1', c.id);
  assert.ok(theirs);
  assert.equal(theirs.state, 'removed');
  assert.equal(theirs.text, '');
  assert.equal(theirs.removedReason, '', 'a plain removal names no reason');
  // answers under a removed comment stay, under a placeholder that is not counted as a reply
  const base = sc(s, 'p1').length;
  const parent = res.addReply(s, 'res-2', 'p1', 'Bad parent', NOW + 10).reply;
  res.addReply(s, 'res-3', 'p1', 'A fine answer', NOW + 20, parent.id);
  staff.removeComment(s, parent.id, NOW + 30);
  const ph = sc(s, 'p1', parent.id);
  assert.equal(ph.state, 'removed');
  assert.equal(ph.text, '');
  assert.equal(ph.canRemove, false);
  assert.equal(ph.replyCount, 1);
  assert.equal(sc(s, 'p1').length, base + 2);
  assert.equal(staff.addReply(s, 'p1', 'x', { to: parent.id }, NOW + 40).ok, false, 'a removed comment cannot be answered');
  assert.equal(res.addReply(s, 'res-1', 'p1', 'x', NOW + 40, parent.id).ok, false);
});

/* --------------------------------------------------------------------------- violation */

test('a violation is recorded on a resident’s comment, once, with the rule it breaks', () => {
  const s = fresh();
  const c = res.addReply(s, 'res-2', 'p1', 'You people are awful', NOW).reply;
  assert.equal(sc(s, 'p1', c.id).canViolate, true);
  assert.equal(sc(s, 'p1', 'r1a').canViolate, false, 'not on Staff');
  assert.equal(staff.addViolation(s, { comment: 'r1a', reason: 'hate', kind: 'warning' }, NOW).ok, false);
  assert.equal(staff.addViolation(s, { comment: 'nope', reason: 'hate', kind: 'warning' }, NOW).ok, false);
  assert.equal(staff.addViolation(s, { comment: c.id, reason: 'other', note: '', kind: 'warning' }, NOW).ok, false, 'rules apply here too');
  assert.equal(staff.addViolation(s, { comment: c.id, reason: 'hate', kind: 'pause', until: NOW + 5 * 60000 }, NOW).ok, false);
  assert.deepEqual(staff.violations(s, NOW), [], 'a refused one leaves nothing behind');
  const r = staff.addViolation(s, { comment: c.id, reason: 'hate', note: 'Insulting neighbors', kind: 'pause', until: NOW + 2 * DAY, alsoRemove: true }, NOW + 1000);
  assert.ok(r.ok);
  assert.equal(r.violation.who, 'res:res-2');
  assert.equal(r.violation.name, 'Priya Nair');
  assert.equal(r.violation.rule, 'Be a good neighbor');
  assert.equal(r.violation.quote, 'You people are awful');
  assert.equal(sc(s, 'p1', c.id), undefined, '"also remove" took the comment out');
  assert.equal(staff.addViolation(s, { comment: c.id, reason: 'harass', kind: 'warning' }, NOW + 2000).ok, false, 'one violation per comment');
  const list = staff.violations(s, NOW + 3000);
  assert.equal(list.length, 1);
  assert.equal(list[0].active, true);
  assert.equal(list[0].label, 'Hate speech');
});

test('a pause stops a resident writing, reacting and sharing until the date, and lets them back after it', () => {
  const s = fresh();
  const c = res.addReply(s, 'res-2', 'p1', 'Rude', NOW).reply;
  const until = NOW + 2 * DAY;
  staff.addViolation(s, { comment: c.id, reason: 'hate', note: 'n', kind: 'light', until }, NOW + 1000);
  const during = NOW + DAY;
  const why = res.pauseOf(s, 'res-2', during);
  assert.ok(why);
  assert.equal(why.until, until);
  assert.equal(res.pauseOf(s, 'res-1', during), null, 'only the one who broke the rule');
  const a = res.addReply(s, 'res-2', 'p1', 'Again', during);
  assert.equal(a.ok, false);
  assert.match(a.reason, /paused until .*Hate speech/);
  assert.equal(res.react(s, 'res-2', 'p2', 'love', during).ok, false);
  assert.equal(res.share(s, 'res-2', 'p2', during).ok, false);
  assert.equal(res.editReply(s, 'res-2', c.id, 'Sorry', during).ok, false, 'not even rewriting');
  assert.ok(res.timeline(s, 'res-2', { now: during }).length > 0, 'an ordinary pause only stops writing: the feed can still be read');
  assert.ok(res.timeline(s, 'res-1', { now: during }).length > 0, 'nobody else is shut out');
  assert.equal(res.timeline(s, 'res-3', { now: during }).length, res.timeline(s, 'res-1', { now: during }).length);
  assert.equal(res.follow(s, 'res-2', 'dana').ok, true);
  assert.equal(res.deleteReply(s, 'res-2', c.id, during).ok, true, 'taking your own words back is never held against you');
  // At zero the hold does not lift by itself: the person still cannot write, and is told to press Resume
  const after = until + 1;
  const ended = res.pauseOf(s, 'res-2', after);
  assert.equal(ended.ended, true);
  const waiting = res.addReply(s, 'res-2', 'p1', 'Too soon', after);
  assert.equal(waiting.ok, false);
  assert.match(waiting.reason, /Resume Social/);
  assert.equal(res.resumePause(s, 'res-2', during).ok, false, 'not before the clock reaches zero');
  assert.equal(res.resumePause(s, 'res-1', after).ok, false, 'nothing to resume for somebody who was never paused');
  // Resume: back in, but the guidelines have to be read and accepted again
  res.acceptGuidelines(s, 'res-2');
  assert.equal(res.needsGuidelines(s, 'res-2'), false);
  assert.deepEqual(res.resumePause(s, 'res-2', after), { ok: true });
  assert.equal(res.pauseOf(s, 'res-2', after), null);
  assert.equal(res.needsGuidelines(s, 'res-2'), true, 'the way back in is through the guidelines');
  assert.equal(res.resumePause(s, 'res-2', after).ok, false, 'only once');
  res.acceptGuidelines(s, 'res-2');
  assert.ok(res.timeline(s, 'res-2', { now: after }).length > 0, 'the feed is open again');
  assert.equal(res.addReply(s, 'res-2', 'p1', 'Back again', after).ok, true);
  assert.equal(res.react(s, 'res-2', 'p2', 'love', after).ok, true);
  assert.equal(res.share(s, 'res-2', 'p2', after).ok, true);
});

test('two kinds of ban: a LIGHT pause lets the resident read and is no strike; a HEAVY ban is a strike and shuts them out', () => {
  const s = fresh();
  const until = NOW + 2 * DAY;
  const during = NOW + DAY;
  // light: from a comment, and straight to a resident
  const c = res.addReply(s, 'res-2', 'p1', 'Rude', NOW).reply;
  assert.equal(staff.addViolation(s, { comment: c.id, reason: 'hate', note: 'n', kind: 'light', until }, NOW + 1000).ok, true);
  assert.ok(res.timeline(s, 'res-2', { now: during }).length > 0, 'light: can read');
  assert.equal(res.addReply(s, 'res-2', 'p1', 'Again', during).ok, false, 'light: cannot write');
  assert.equal(res.pauseOf(s, 'res-2', during).until, until, 'the clock is there');
  assert.equal(staff.banResident(s, { who: 'res:res-3', reason: 'hate', note: 'n', until, light: true }, NOW + 2000, 'Staff').ok, true);
  assert.ok(res.timeline(s, 'res-3', { now: during }).length > 0, 'a light ban given straight: can read');
  assert.equal(staff.standings(s, during).find((p) => p.who === 'res:res-3').count, 0, 'a light pause is not a strike');
  // heavy
  assert.equal(staff.banResident(s, { who: 'res:res-1', reason: 'hate', note: 'n', until }, NOW + 3000, 'Staff').ok, true);
  assert.deepEqual(res.timeline(s, 'res-1', { now: during }), [], 'heavy: nothing to read until it ends');
  assert.deepEqual(res.timeline(s, 'res-1', { now: until + 1 }), [], 'still shut out until they press Resume');
  assert.equal(res.addReply(s, 'res-1', 'p1', 'Hi', during).ok, false);
  assert.equal(staff.standings(s, during).find((p) => p.who === 'res:res-1').count, 1, 'a heavy ban is a strike');
  assert.equal(staff.unbanResident(s, 'res:res-3', during).ok, true, 'a light pause can be lifted too');
});

test('gibberish such as “Aaaaaaaaaaaa.sssssssss” is a reason Staff can ban for, and is spotted as a hint', () => {
  assert.ok(REASONS.some((r) => r.id === 'gibberish' && r.rule), 'a reason of its own, tied to a guideline');
  assert.equal(looksLikeSpam('Aaaaaaaaaaaaaaaaaaaaaaaaaaa.sssssssssssssssss'), true);
  for (const t of ['hahahahahahahaha', 'asdfasdfasdfasdf', 'lkjhlkjhlkjhlkjh', 'zzzzzzzzzzzzzz', 'xxxxxxxxxxxxxxxxxxxxxx buy now']) assert.equal(looksLikeSpam(t), true, t);
  // it must stay quiet for people who are just lively
  for (const t of ['Does this include the EV row on level 2?', 'Yesss!', 'Noooooooo!', 'Nooooooooo way', 'hahaha', 'lol lol lol lol lol lol', 'ok ok ok ok ok ok ok', 'Thanks!!!!!!!!!', '!!!!!!!!!!!!', '..........', '😂😂😂😂😂😂😂😂😂', 'Unit 0000000 is mine', 'Mississippi', '']) assert.equal(looksLikeSpam(t), false, t);
  const s = fresh();
  const c = res.addReply(s, 'res-2', 'p1', 'Aaaaaaaaaaaaaaaaaaaaaaaaaaa.sssssssssssssssss', NOW).reply;
  assert.equal(staff.addViolation(s, { comment: c.id, reason: 'gibberish', note: '', kind: 'light', until: NOW + DAY }, NOW + 1000).ok, true, 'Staff can ban for it');
  assert.equal(staff.rules(s).defaults.gibberish.kind, 'light', 'the first action the rules give it');
});

test('the violation keeps the post it was on, so a resident shut out of the feed is still told which one', () => {
  const s = fresh();
  const c = res.addReply(s, 'res-2', 'p1', 'Rude', NOW).reply;
  const v = staff.addViolation(s, { comment: c.id, reason: 'hate', kind: 'pause', until: NOW + DAY }, NOW + 1000).violation;
  assert.equal(v.post, 'p1');
  assert.equal(v.postBy, 'Property team', 'p1 is the Staff person’s own post');
  assert.match(v.postText, /^Garage deep-cleaning/);
  assert.equal(res.noticesOf(s, 'res-2', NOW + 2000)[0].postText, v.postText, 'the resident can read it from their notice');
});

test('a warning pauses nothing, and the resident is told either way', () => {
  const s = fresh();
  const c = res.addReply(s, 'res-2', 'p1', 'Careless', NOW).reply;
  const r = staff.addViolation(s, { comment: c.id, reason: 'privacy', note: 'Posted a plate number', kind: 'warning' }, NOW + 1000);
  assert.ok(r.ok);
  assert.equal(r.violation.until, undefined);
  assert.equal(res.pauseOf(s, 'res-2', NOW + 2000), null);
  assert.equal(res.addReply(s, 'res-2', 'p1', 'Fine', NOW + 2000).ok, true);
  const notes = res.noticesOf(s, 'res-2', NOW + 3000);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].label, 'Sharing private information');
  assert.equal(notes[0].note, 'Posted a plate number');
  assert.equal(notes[0].rule, 'Protect everyone’s privacy');
  assert.equal(notes[0].active, false);
  assert.deepEqual(res.noticesOf(s, 'res-1', NOW), [], 'nobody else is told');
});

test('a notice can be read and dismissed, but not while its pause is still running', () => {
  const s = fresh();
  const c = res.addReply(s, 'res-2', 'p1', 'Rude', NOW).reply;
  const v = staff.addViolation(s, { comment: c.id, reason: 'hate', kind: 'pause', until: NOW + DAY }, NOW + 1000).violation;
  assert.equal(res.ackNotice(s, 'res-2', v.id, NOW + 2000).ok, false, 'running');
  assert.equal(res.ackNotice(s, 'res-1', v.id, NOW + 2000).ok, false, 'not theirs');
  assert.equal(res.ackNotice(s, 'res-2', 'nope', NOW + 2000).ok, false);
  assert.equal(res.ackNotice(s, 'res-2', v.id, NOW + 2 * DAY).ok, true, 'after it ended');
  assert.ok(res.residentState(s, 'res-2').acked.has(v.id));
  assert.equal(res.noticesOf(s, 'res-2', NOW + 2 * DAY).length, 1, 'still on record');
});

test('the one who wrote a removed comment is told why; nobody else is', () => {
  const s = fresh();
  const c = res.addReply(s, 'res-2', 'p1', 'Rude', NOW).reply;
  staff.addViolation(s, { comment: c.id, reason: 'harass', note: '', kind: 'warning', alsoRemove: true }, NOW + 1000);
  assert.equal(rc(s, 'res-2', 'p1', c.id).removedReason, 'Harassment or bullying');
  assert.equal(rc(s, 'res-1', 'p1', c.id), undefined);
});

test('the longest running pause is the one that counts, and a violation record is never lost to a resident’s own writes', () => {
  const s = fresh();
  const a = res.addReply(s, 'res-2', 'p1', 'One', NOW).reply;
  const b = res.addReply(s, 'res-2', 'p1', 'Two', NOW + 1).reply;
  staff.addViolation(s, { comment: a.id, reason: 'hate', kind: 'pause', until: NOW + 2 * DAY }, NOW + 10);
  staff.addViolation(s, { comment: b.id, reason: 'spam', kind: 'pause', until: NOW + 5 * DAY }, NOW + 11);
  assert.equal(res.pauseOf(s, 'res-2', NOW + 20).until, NOW + 5 * DAY);
  res.deleteReply(s, 'res-2', a.id, NOW + 30); // taking it back does not take the violation back
  assert.equal(staff.violations(s, NOW + 40).length, 2);
  assert.ok(res.pauseOf(s, 'res-2', NOW + 40));
});
