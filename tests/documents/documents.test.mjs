import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, expiryState, daysLeft, sortDocs, filterDocs, counts, validateUpload, sizeLabel, MAX_BYTES, findW9, w9State, validateW9,
  validateGuard, makeGuard, verifyGuard, canTryGuard, failGuard, guardTriesLeft, guardLabel, GUARD_TRIES, GUARD_PAUSE_MS,
  makePending, checkPending, isLive, canMakeKey, keyWaitMs, clock,
  maskEmail, randomKey, normalizeKey, formatKey, digestKey, generateUnused, rememberIssued, isUnlocked, recordAccess,
  KEY_ALPHABET, KEY_CHARS, KEY_TTL_MS, MAX_TRIES, UNLOCK_MS, ISSUED_MAX } from '../../src/features/documents/store.js';

const NOW = Date.parse('2026-11-10T12:00:00Z');

test('expiry: none, ok, soon (within 30 days), expired, and the day itself is still valid', () => {
  assert.equal(expiryState(null, NOW), 'none');
  assert.equal(expiryState('2027-06-01', NOW), 'ok');
  assert.equal(expiryState('2026-12-10', NOW), 'soon'); // exactly 30 days
  assert.equal(expiryState('2026-12-11', NOW), 'ok');
  assert.equal(expiryState('2026-11-10', NOW), 'soon'); // today
  assert.equal(expiryState('2026-11-09', NOW), 'expired');
  assert.equal(daysLeft('2026-11-15', NOW), 5);
});

test('seed has a document about to expire and one that has expired, so the page shows both on first visit', () => {
  const c = counts(seed(NOW), NOW);
  assert.equal(c.total, 7);
  assert.equal(c.soon, 1);
  assert.equal(c.expired, 1);
});

test('sorting puts what needs attention first: expired, then soonest, then newest', () => {
  const names = sortDocs(seed(NOW), NOW).map((d) => d.id);
  assert.deepEqual(names.slice(0, 2), ['d3', 'd2']);
  assert.equal(names[2], 'd7'); // the rest, most recently updated first
});

test('filters: text, category, and a property keeps the documents for all properties', () => {
  const docs = seed(NOW);
  assert.deepEqual(filterDocs(docs, { q: 'insurance' }).map((d) => d.id), ['d2']);
  assert.equal(filterDocs(docs, { category: 'template' }).length, 2);
  assert.equal(filterDocs(docs, { property: 'riverbend' }).length, 7);
  assert.equal(filterDocs(docs, { q: 'nothing like this' }).length, 0);
  assert.equal(filterDocs(docs, { category: 'all', property: 'all', q: '  ' }).length, 7);
});

test('upload: a file, a name and the choices are required, and each problem is said by field', () => {
  const ok = { file: { name: 'Lease.PDF', size: 1000 }, name: 'Lease', category: 'contract', property: 'all', share: 'admins', expires: '' };
  const r = validateUpload(ok, NOW);
  assert.equal(r.ok, true);
  assert.equal(r.doc.name, 'Lease.pdf');
  assert.equal(r.doc.expires, null);
  assert.equal(r.doc.updated, '2026-11-10');

  assert.equal(validateUpload({ ...ok, file: null }, NOW).errors.file, 'Choose a file to upload.');
  assert.match(validateUpload({ ...ok, file: { name: 'run.exe', size: 5 } }, NOW).errors.file, /not accepted/);
  assert.match(validateUpload({ ...ok, file: { name: 'a.pdf', size: MAX_BYTES + 1 } }, NOW).errors.file, /10 MB/);
  assert.equal(validateUpload({ ...ok, name: '   ' }, NOW).errors.name, 'Give the document a name.');
  assert.ok(validateUpload({ ...ok, name: 'x'.repeat(121) }, NOW).errors.name);
  assert.ok(validateUpload({ ...ok, category: 'secret' }, NOW).errors.category);
  assert.ok(validateUpload({ ...ok, share: 'everyone' }, NOW).errors.share);
  assert.ok(validateUpload({ ...ok, expires: '10/11/2026' }, NOW).errors.expires);
  assert.equal(validateUpload({ ...ok, expires: '2027-01-31' }, NOW).doc.expires, '2027-01-31');
});

test('business W-9: needed until one is on file; one W-9 at a time; over 3 years old is to be reviewed', () => {
  assert.equal(w9State(findW9(seed(NOW)), NOW), 'missing');
  const ok = { file: { name: 'w9.PDF', size: 2000 }, legalName: ' AMC LLC ', classification: 'llc', signed: '2026-03-04' };
  const r = validateW9(ok, NOW);
  assert.equal(r.ok, true);
  assert.equal(r.doc.kind, 'w9');
  assert.equal(r.doc.legalName, 'AMC LLC');
  assert.equal(r.doc.share, 'admins'); // only admins see it
  assert.equal(r.doc.name, 'Business W-9.pdf');
  assert.equal(w9State(r.doc, NOW), 'ok');
  assert.equal(w9State({ ...r.doc, signed: '2023-11-09' }, NOW), 'review');
  assert.equal(w9State({ ...r.doc, signed: '2023-11-10' }, NOW), 'ok');
  const old = { ...r.doc, id: 'w9-old', updated: '2025-01-01' };
  assert.equal(findW9([old, r.doc, ...seed(NOW)]).id, r.doc.id); // the newest is the one on file
});

test('business W-9 form: file, business name, classification and a date that is not in the future; no tax ID is asked for', () => {
  const ok = { file: { name: 'w9.png', size: 10 }, legalName: 'AMC LLC', classification: 's-corp', signed: '2026-11-10' };
  assert.equal(validateW9(ok, NOW).ok, true);
  assert.equal(validateW9({ ...ok, file: null }, NOW).errors.file, 'Choose the signed W-9.');
  assert.match(validateW9({ ...ok, file: { name: 'w9.docx', size: 10 } }, NOW).errors.file, /pdf, png, jpg/);
  assert.ok(validateW9({ ...ok, legalName: '' }, NOW).errors.legalName);
  assert.ok(validateW9({ ...ok, classification: '' }, NOW).errors.classification);
  assert.ok(validateW9({ ...ok, signed: '' }, NOW).errors.signed);
  assert.match(validateW9({ ...ok, signed: '2026-11-11' }, NOW).errors.signed, /future/);
  assert.equal(Object.keys(validateW9(ok, NOW).doc).some((k) => /tin|ein|ssn|tax_?id/i.test(k)), false);
});

const seq = (...n) => { let i = 0; return () => n[i++ % n.length]; }; // a fixed "random" source

test('secret key: 16 characters in four groups, from an alphabet with nothing that looks like another', () => {
  const k = randomKey(seq(0, 0.5, 0.99));
  assert.match(k, /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
  assert.equal(normalizeKey(k).length, KEY_CHARS);
  for (const bad of '01OIL') assert.equal(KEY_ALPHABET.includes(bad), false);
  assert.equal(randomKey(() => 0), 'AAAA-AAAA-AAAA-AAAA');
  assert.equal(formatKey('k7q9m2xdr8taw4hn'), 'K7Q9-M2XD-R8TA-W4HN');
  assert.equal(normalizeKey(' k7q9-m2xd r8ta-w4hn '), 'K7Q9M2XDR8TAW4HN');
  // real randomness: a thousand keys, no two alike
  assert.equal(new Set(Array.from({ length: 1000 }, () => randomKey())).size, 1000);
});

test('secret key: made new every time, and never one that was made before', async () => {
  const first = await generateUnused([], seq(0));
  assert.equal(first.key, 'AAAA-AAAA-AAAA-AAAA');
  assert.equal(first.digest, await digestKey('aaaa aaaa aaaa aaaa'));
  assert.equal(first.digest.length, 64);
  // the same "random" source would make the same key again: it is refused, and the next one is used
  const second = await generateUnused([first.digest], seq(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5));
  assert.notEqual(second.digest, first.digest);
  // if nothing new can be made, it says so instead of repeating
  await assert.rejects(generateUnused([first.digest], seq(0)), /Could not make a new key/);
  // the list of issued keys keeps digests only, newest first, without repeats, and is capped
  let issued = [];
  for (let i = 0; i < ISSUED_MAX + 5; i += 1) issued = rememberIssued(issued, `d${i}`);
  assert.equal(issued.length, ISSUED_MAX);
  assert.equal(issued[0], `d${ISSUED_MAX + 4}`);
  assert.deepEqual(rememberIssued(['b', 'a'], 'a'), ['a', 'b']);
});

test('the live key: one at a time, only its digest is kept, it opens once, typed any way, a wrong one uses a try, five kill it, and it expires after 5 minutes', async () => {
  const key = 'K7Q9-M2XD-R8TA-W4HN';
  const p = makePending(await digestKey(key), NOW, 'settings');
  assert.equal(p.via, 'settings');
  assert.equal(p.expiresAt, NOW + KEY_TTL_MS);
  assert.equal(KEY_TTL_MS, 5 * 60 * 1000);
  assert.equal(JSON.stringify(p).includes('K7Q9'), false);
  assert.equal(isLive(p, NOW + 1000), true);
  assert.equal(isLive(p, NOW + KEY_TTL_MS + 1), false);
  assert.equal(isLive(null, NOW), false);
  const ok = await checkPending(p, ' k7q9 m2xd-r8ta w4hn ', NOW + 1000);
  assert.equal(ok.ok, true);
  assert.equal(ok.pending, null); // used once
  assert.equal((await checkPending(ok.pending, key, NOW + 2000)).reason, 'expired');
  assert.equal((await checkPending(p, 'K7Q9-M2XD', NOW)).reason, 'format');
  assert.equal((await checkPending(p, 'K7Q9-M2XD', NOW)).pending.tries, 0); // a short entry costs nothing
  let cur = p;
  for (let i = 1; i <= 4; i += 1) { const r = await checkPending(cur, 'AAAA-AAAA-AAAA-AAAA', NOW); assert.equal(r.reason, 'wrong'); assert.equal(r.left, MAX_TRIES - i); cur = r.pending; }
  const last = await checkPending(cur, 'AAAA-AAAA-AAAA-AAAA', NOW);
  assert.equal(last.reason, 'locked');
  assert.equal(isLive(last.pending, NOW), false);
  assert.equal((await checkPending(last.pending, key, NOW)).reason, 'locked'); // even the right key no longer works
  assert.equal((await checkPending(p, key, NOW + KEY_TTL_MS + 1)).reason, 'expired');
  assert.equal((await checkPending(null, key, NOW)).reason, 'expired');
  assert.equal(p.tries, 0); // never changed
});

test('keys are not made by the dozen: a new one only when the last one\'s time is over, even if it was used', () => {
  const windowUntil = NOW + KEY_TTL_MS;
  assert.equal(canMakeKey(0, NOW), true); // never made one
  assert.equal(canMakeKey(windowUntil, NOW + 1), false);
  assert.equal(canMakeKey(windowUntil, windowUntil - 1), false);
  assert.equal(canMakeKey(windowUntil, windowUntil), true);
  assert.equal(keyWaitMs(windowUntil, NOW), KEY_TTL_MS);
  assert.equal(keyWaitMs(windowUntil, windowUntil + 5000), 0);
  assert.equal(clock(KEY_TTL_MS), '5:00');
  assert.equal(clock(61000), '1:01');
  assert.equal(clock(59001), '1:00');
  assert.equal(clock(-5), '0:00');
});

test('the email is masked, the W-9 stays open for 5 minutes, and the last openings are kept newest first', () => {
  assert.equal(maskEmail('dana.whitfield@amcllc.example'), `d${'•'.repeat(13)}@amcllc.example`);
  assert.equal(maskEmail('ab@x.example'), 'a•••@x.example');
  assert.equal(isUnlocked(NOW + UNLOCK_MS, NOW), true);
  assert.equal(isUnlocked(NOW - 1, NOW), false);
  assert.equal(isUnlocked(0, NOW), false);
  let log = [];
  for (let i = 0; i < 7; i += 1) log = recordAccess(log, { at: i, by: 'x', how: 'email' });
  assert.equal(log.length, 5);
  assert.equal(log[0].at, 6);
});

test('PIN or password: a PIN is 6 digits and not an easy run; a password has length, variety and no company name; the two entries must match', () => {
  assert.equal(validateGuard('pin', '482916', '482916').ok, true);
  assert.match(validateGuard('pin', '4829', '4829').errors.value, /6 digits/);
  assert.match(validateGuard('pin', '48291a', '48291a').errors.value, /6 digits/);
  assert.match(validateGuard('pin', '111111', '111111').errors.value, /too easy/);
  assert.match(validateGuard('pin', '123456', '123456').errors.value, /too easy/);
  assert.match(validateGuard('pin', '654321', '654321').errors.value, /too easy/);
  assert.match(validateGuard('pin', '482916', '482917').errors.confirm, /not the same/);
  assert.equal(validateGuard('password', 'Blue-heron 42', 'Blue-heron 42', 'AMC LLC').ok, true);
  assert.match(validateGuard('password', 'short', 'short').errors.value, /at least 8/);
  assert.match(validateGuard('password', 'x'.repeat(65), 'x'.repeat(65)).errors.value, /64/);
  assert.match(validateGuard('password', 'aaaaaaaa', 'aaaaaaaa').errors.value, /different/);
  assert.match(validateGuard('password', 'Password', 'Password').errors.value, /too easy/);
  assert.match(validateGuard('password', 'myAMCLLC2026', 'myAMCLLC2026', 'AMC LLC').errors.value, /company name/);
  assert.match(validateGuard('nope', 'x', 'x').errors.value, /Choose/);
});

test('PIN or password: only a scrambled copy is kept; the right one passes, another does not; five wrong ones pause trying for five minutes', async () => {
  const rec = await makeGuard('pin', '482916', NOW);
  assert.equal(rec.type, 'pin');
  assert.equal(rec.set, '2026-11-10');
  assert.equal(JSON.stringify(rec).includes('482916'), false);
  assert.equal(await verifyGuard(rec, '482916'), true);
  assert.equal(await verifyGuard(rec, '482917'), false);
  assert.equal(await verifyGuard(rec, ''), false);
  assert.equal(await verifyGuard(null, '482916'), false);
  assert.notEqual((await makeGuard('pin', '482916', NOW)).hash, rec.hash); // a new salt each time
  let att = null;
  for (let i = 1; i <= 4; i += 1) { att = failGuard(att, NOW); assert.equal(att.lockUntil, 0); assert.equal(guardTriesLeft(att), GUARD_TRIES - i); }
  att = failGuard(att, NOW);
  assert.equal(canTryGuard(att, NOW + 1), false);
  assert.equal(att.lockUntil, NOW + GUARD_PAUSE_MS);
  assert.equal(canTryGuard(att, NOW + GUARD_PAUSE_MS), true);
  assert.equal(failGuard(att, NOW + GUARD_PAUSE_MS).n, 1);
  assert.equal(canTryGuard(null, NOW), true);
  assert.equal(guardLabel('pin'), 'PIN');
  assert.equal(guardLabel('password'), 'Password');
});

test('sizes read in KB and MB', () => {
  assert.equal(sizeLabel(38000), '37 KB');
  assert.equal(sizeLabel(934000), '912 KB');
  assert.equal(sizeLabel(5 * 1048576), '5.0 MB');
});
