// Messages: is the data sound? For Admin's System health. Pure logic, no DOM, so node --test can run it.
// Same shape as the Social checks (social/diagnose.js): { id, label, severity, found: [{ where, detail }], fix, ok }. Only reads.

import { PERSONAS } from '../messaging/personas.js';

const HOUR = 3600000;
const KEY = 'eso-msg-v1';
const KNOWN = new Set(['bot', 'system', ...PERSONAS.map((p) => p.id)]);
const STATUS = { resident_support: ['bot', 'queued', 'active', 'closed'], support: ['open', 'pending', 'resolved'] };
const EMERGENCY_WAIT_MS = 15 * 60000; // the Staff app escalates to an SMS after 3 minutes; this is a real wait

/** The document as stored: { state: 'none' | 'ok' | 'bad', doc?, why? }. */
export function readMessages(storage) {
  let text = null;
  try { text = storage.getItem(KEY); } catch { return { state: 'bad', why: 'The browser would not let the page read its storage.' }; }
  if (text == null) return { state: 'none' };
  try {
    const doc = JSON.parse(text);
    if (!doc || typeof doc !== 'object' || !doc.convs || typeof doc.convs !== 'object' || !doc.msgs || typeof doc.msgs !== 'object') return { state: 'bad', why: 'It has no conversations or no messages.' };
    return { state: 'ok', doc };
  } catch { return { state: 'bad', why: 'It is not valid JSON.' }; }
}

const ref = (c) => (c.ticketNo ? `T-${c.ticketNo} (${c.id})` : `Conversation ${c.id}`);

export function checkMessages(storage, now = Date.now()) {
  const raw = readMessages(storage);
  const checks = [];
  const add = (id, label, severity, found, fix) => checks.push({ id, label, severity, found, fix, ok: found.length === 0 });

  add('messages-readable', 'The messages can be read', 'error', raw.state === 'bad' ? [{ where: `Storage key "${KEY}"`, detail: raw.why }] : [],
    `Remove the key "${KEY}" in the browser's storage: the sample conversations are made again on the next visit (everything typed since is lost). Find the code that wrote the bad value.`);
  if (raw.state !== 'ok') return checks;

  const { convs, msgs } = raw.doc;
  const convList = Object.values(convs).filter((c) => c && typeof c === 'object');
  const allMsgs = [];
  for (const [cid, list] of Object.entries(msgs)) for (const m of Array.isArray(list) ? list : []) if (m && typeof m === 'object') allMsgs.push({ ...m, _in: cid });

  add('msg-conversation', 'Every message belongs to a conversation', 'error',
    Object.keys(msgs).filter((cid) => !convs[cid]).map((cid) => ({ where: `Messages of "${cid}"`, detail: `${(msgs[cid] || []).length} message(s) belong to a conversation that does not exist.` }))
      .concat(allMsgs.filter((m) => m.convId && m.convId !== m._in).map((m) => ({ where: `Message ${m.id}`, detail: `It is stored under ${m._in} but says it belongs to ${m.convId}.` }))),
    'Delete the messages with their conversation, or restore the conversation. Check the code that deletes a conversation also deletes its messages.');

  const seen = new Set(), dup = [];
  for (const m of allMsgs) { if (seen.has(m.id)) dup.push({ where: `Message ${m.id}`, detail: 'Two messages have this id.' }); seen.add(m.id); }
  add('msg-unique', 'Every message has its own id', 'error', dup, 'Ids must come from the counter `seq` of the document: never from a copy of an older document.');

  const tickets = convList.filter((c) => c.ticketNo != null);
  const byNo = new Map(), twin = [];
  for (const c of tickets) { const k = Number(c.ticketNo); if (byNo.has(k)) twin.push({ where: `T-${k}`, detail: `${ref(byNo.get(k))} and ${ref(c)} have the same ticket number.` }); byNo.set(k, c); }
  const top = tickets.reduce((n, c) => Math.max(n, Number(c.ticketNo) || 0), 0);
  if (Number(raw.doc.ticketSeq || 0) < top) twin.push({ where: 'ticketSeq', detail: `The counter is ${raw.doc.ticketSeq || 0} but T-${top} exists: the next ticket would repeat a number.` });
  add('ticket-numbers', 'Ticket numbers are unique and the counter is ahead of them', 'error', twin, 'Set `ticketSeq` to the highest ticket number, and give the later conversation a new number. Numbers are only ever taken from `ticketSeq`.');

  const badStatus = convList.filter((c) => STATUS[c.kind] && !STATUS[c.kind].includes(c.status)).map((c) => ({ where: ref(c), detail: `Status "${c.status}" is not one of ${STATUS[c.kind].join(', ')}.` }));
  add('status-valid', 'Every conversation has a status its kind knows', 'error', badStatus, 'The Messages list and the Ticket box filter by status, so a conversation with another status is in no list. Set it to a valid one.');

  const stale = [];
  for (const c of convList) {
    const list = (msgs[c.id] || []).filter((m) => m && typeof m.at === 'number');
    if (!list.length) continue;
    const latest = list.reduce((a, b) => (b.at > a.at ? b : a));
    if (!c.last || typeof c.last.at !== 'number') stale.push({ where: ref(c), detail: 'It has messages but no "last message" preview.' });
    else if (c.last.at < latest.at) stale.push({ where: ref(c), detail: 'Its preview is older than its newest message, so the list shows an old line.' });
  }
  add('last-preview', 'Each list line shows the newest message', 'warning', stale, 'Whatever adds a message must also set `last` and `updatedAt` (store.js `msg()`).');

  const strangers = [];
  for (const m of allMsgs) if (m.from && !KNOWN.has(m.from)) strangers.push({ where: `Message ${m.id} in ${m._in}`, detail: `It is from "${m.from}", who is not a known person.` });
  for (const c of convList) { if (c.assigneeId && !KNOWN.has(c.assigneeId)) strangers.push({ where: ref(c), detail: `It is assigned to "${c.assigneeId}", who is not a known person.` }); if (c.kind === 'resident_support' && c.residentId && !KNOWN.has(c.residentId)) strangers.push({ where: ref(c), detail: `Its resident "${c.residentId}" is not a known person.` }); }
  add('known-people', 'Every sender and assignee is a known person', 'warning', strangers.slice(0, 30), 'A person who was removed leaves their messages behind; keep the person (marked as left) instead of deleting them.');

  const odd = [];
  for (const c of convList) { if (typeof c.createdAt !== 'number' || c.createdAt <= 0) odd.push({ where: ref(c), detail: 'It has no usable creation time.' }); else if (c.createdAt > now + HOUR) odd.push({ where: ref(c), detail: 'It was created in the future.' }); else if (typeof c.updatedAt === 'number' && c.updatedAt < c.createdAt) odd.push({ where: ref(c), detail: 'It was updated before it was created.' }); }
  for (const m of allMsgs) if (typeof m.at !== 'number' || m.at <= 0) odd.push({ where: `Message ${m.id} in ${m._in}`, detail: 'It has no usable time.' }); else if (m.at > now + HOUR) odd.push({ where: `Message ${m.id} in ${m._in}`, detail: 'It is dated in the future.' });
  add('times', 'Every conversation and message has a sensible time', 'warning', odd.slice(0, 30), 'Take the time from `Date.now()` when it is written; lists are ordered by it.');

  const waiting = convList.filter((c) => c.emergency && !c.emergency.ackAt && now - Number(c.emergency.at || 0) > EMERGENCY_WAIT_MS)
    .map((c) => ({ where: ref(c), detail: `An emergency has waited ${Math.round((now - Number(c.emergency.at)) / 60000)} minutes with nobody acknowledging it.` }));
  add('emergency-waiting', 'No emergency is waiting for someone to acknowledge it', 'error', waiting, 'This is not a data fault: someone on the property team must open the chat and press Acknowledge now. If nobody is on duty, the escalation (SMS) is not reaching anyone.');

  return checks;
}
