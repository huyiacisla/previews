// Messaging core. No DOM. Everything the UI shows or allows comes from here, and the rules are enforced
// here (the UI only hides what is not allowed). Tested in tests/messaging.test.mjs.
//
// Conversation kinds
//   resident_support  resident <-> assistant -> staff.  status: bot -> queued -> active -> closed
//   direct            two people (staff<->client, staff/admin -> resident outreach, admin<->anyone)
//   support           staff or client asks Admin for help.  status: open | pending | resolved
//   announcement      one-way broadcast from Admin

import * as assistant from './bot.js';
import { byId } from './personas.js';
import { isEmoji } from './emoji.js';

export const CAN_MESSAGE = {
  resident: ['staff'],
  staff: ['resident', 'client', 'admin'],
  client: ['staff', 'admin'],
  admin: ['staff', 'admin', 'resident', 'client'],
};
export const canMessage = (from, to) => (CAN_MESSAGE[from] || []).includes(to);

export const CONFIG = {
  botIdleMs: 15 * 60 * 1000, // assistant chat nobody continued
  activeIdleMs: 12 * 60 * 60 * 1000, // staff chat with no replies
  outreachWindowMs: 24 * 60 * 60 * 1000,
  outreachMax: 2, // unanswered unsolicited threads a resident can have open per window, from anyone
  maxLen: 2000,
  sendLatencyMs: 0,
  maxAttachments: 4, // per message
  maxAttachmentBytes: 450 * 1024, // per file after the browser downsizes photos
  unsendMs: 15 * 60 * 1000, // how long you can take back your own message
  editMs: 15 * 60 * 1000, // how long you can fix your own message
  presenceMs: 45 * 1000, // "online" if seen within this window
  typingMs: 5 * 1000,
};

const OPEN_RESIDENT = ['bot', 'queued', 'active'];
const preview = (text) => String(text || '').replace(/\s+/g, ' ').slice(0, 140);

/**
 * Does this message count as "new" for someone of this role?
 * Staff are never bothered by the assistant's part of a chat (its replies, or the resident's quick-reply taps):
 * that is history they read in the summary. Residents are told about assistant replies and about staff joining or closing.
 */
export function notifies(m, role) {
  if (m.kind === 'text') return role === 'resident' || !m.viaChoice;
  if (m.kind === 'bot') return role === 'resident';
  if (m.kind === 'system') return !!m.notify && role === 'resident';
  return false;
}

/** A small generated picture for the demo data (no real photos). */
function samplePhoto(label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><rect width="480" height="320" fill="#cbd5e1"/><rect x="60" y="40" width="360" height="240" fill="#94a3b8"/><path d="M80 60h320M80 260h320M170 60v200M310 60v200" stroke="#f8fafc" stroke-width="6" fill="none"/><rect x="190" y="110" width="100" height="120" rx="14" fill="#64748b"/><text x="240" y="92" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#0f172a">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ------------------------------------------------------------------ seed */

export function createSeed(now, { empty = false } = {}) {
  const d = { v: 1, rev: 0, seq: 0, convs: {}, msgs: {}, prefs: {} };
  if (empty) return d;
  const min = (n) => now - n * 60000;
  const nid = (p) => `${p}${++d.seq}`;
  const conv = (c) => {
    const id = nid('c');
    d.convs[id] = { id, createdAt: c.at, updatedAt: c.at, last: null, ...c };
    d.msgs[id] = [];
    return d.convs[id];
  };
  const msg = (c, from, kind, text, at, readers = [], extra = {}) => {
    const m = { id: nid('m'), convId: c.id, from, kind, text, at, readBy: {}, ...extra };
    for (const r of readers) m.readBy[r] = at;
    d.msgs[c.id].push(m);
    c.updatedAt = at;
    c.last = { at, from, kind, text: preview(text) };
    return m;
  };
  const greet = (c, at, readers) => assistant.greeting().forEach((g, i) => msg(c, 'bot', 'bot', g.text, at + i, readers, g.choices ? { choices: g.choices, chosen: 'x' } : {}));

  // 1. Resident history: solved by the assistant two days ago, staff never involved.
  const c1 = conv({ kind: 'resident_support', status: 'closed', at: min(2 * 24 * 60), residentId: 'res-1', assigneeId: null, topic: 'Guest parking', bot: assistant.initialBotState(), summary: null, queuedAt: null, closedAt: min(2 * 24 * 60 - 3), closedBy: 'bot', closeReason: 'resolved_by_assistant', csat: null });
  greet(c1, min(2 * 24 * 60), ['res-1']);
  msg(c1, 'res-1', 'text', 'Guest parking', min(2 * 24 * 60 - 1), ['res-1'], { viaChoice: 'topic:guest' });
  msg(c1, 'bot', 'bot', 'Guest passes are requested from Access & Passes. Add the guest plate and the dates; most are approved automatically.', min(2 * 24 * 60 - 1), ['res-1']);
  msg(c1, 'res-1', 'text', 'Yes, thanks', min(2 * 24 * 60 - 2), ['res-1'], { viaChoice: 'helped:yes' });
  msg(c1, 'system', 'system', 'Chat closed. Start a new one any time.', min(2 * 24 * 60 - 3), ['res-1']);

  // 2. Resident waiting in the queue (Staff sees it, summary included).
  const c2 = conv({ kind: 'resident_support', status: 'queued', at: min(9), residentId: 'res-2', assigneeId: null, topic: 'Vehicle or permit', bot: { ...assistant.initialBotState(), topic: 'permit', answered: ['permit:lost'] }, summary: { topic: 'Vehicle or permit', asked: ['Lost or damaged pass'], details: ['My hangtag was torn at the gate this morning. Plate 7XYZ482.'] }, queuedAt: min(7), closedAt: null, closedBy: null, closeReason: null, csat: null });
  greet(c2, min(9), ['res-2']);
  msg(c2, 'res-2', 'text', 'Vehicle or permit', min(8.5), ['res-2'], { viaChoice: 'topic:permit' });
  msg(c2, 'bot', 'bot', 'Common questions about vehicle or permit:', min(8.5), ['res-2'], { chosen: 'x' });
  msg(c2, 'res-2', 'text', 'Lost or damaged pass', min(8), ['res-2'], { viaChoice: 'faq:permit:lost' });
  msg(c2, 'bot', 'bot', 'Replacement passes are issued by the office. Staff will confirm how to collect one.', min(8), ['res-2']);
  msg(c2, 'res-2', 'text', 'Talk to a person', min(7.5), ['res-2'], { viaChoice: 'staff:request' });
  msg(c2, 'system', 'system', 'Your request was sent to the property team. You will be notified when someone replies.', min(7), ['res-2']);
  msg(c2, 'res-2', 'text', 'My hangtag was torn at the gate this morning. Plate 7XYZ482.', min(6), ['res-2']);

  // 3. Active staff chat with a resident (Staff "Mine").
  const c3 = conv({ kind: 'resident_support', status: 'active', at: min(50), residentId: 'res-3', assigneeId: 'stf-1', topic: 'My parking space', bot: { ...assistant.initialBotState(), topic: 'space', answered: ['space:occupied'] }, summary: { topic: 'My parking space', asked: ['Someone is in my space'], details: ['Grey SUV in space 118 again.'] }, queuedAt: min(46), closedAt: null, closedBy: null, closeReason: null, csat: null });
  greet(c3, min(50), ['res-3']);
  msg(c3, 'res-3', 'text', 'Grey SUV in space 118 again.', min(46), ['res-3', 'stf-1']);
  msg(c3, 'system', 'system', 'Jordan Lee from the property team joined the chat.', min(40), ['res-3', 'stf-1'], { notify: true });
  msg(c3, 'stf-1', 'text', 'Thanks Morgan. Can you send the plate or a description so I can check it against the permit list?', min(39), ['res-3', 'stf-1'], { reactions: { '👍': ['res-3'] } });
  msg(c3, 'res-3', 'text', 'Grey Honda CR-V, no hangtag. It was there yesterday too.', min(12), ['res-3'], { attachments: [{ id: 'a-seed-1', kind: 'image', name: 'space-118.svg', mime: 'image/svg+xml', size: 1100, data: samplePhoto('Space 118') }] });

  // 4. Staff <-> client, one unread for the client.
  const c4 = conv({ kind: 'direct', status: 'open', at: min(26 * 60), participants: ['stf-1', 'cli-1'], startedBy: 'stf-1', outreach: false, residentReplied: true });
  msg(c4, 'cli-1', 'text', 'Can you share the March occupancy numbers for Riverbend before Thursday\'s review?', min(26 * 60), ['cli-1', 'stf-1']);
  msg(c4, 'stf-1', 'text', 'Yes. Occupancy is at 94% and I am pulling the March export now.', min(25 * 60), ['cli-1', 'stf-1']);
  msg(c4, 'stf-1', 'text', 'Report is ready. I will keep it as a PDF unless you want the raw export.', min(95), ['stf-1']);

  // 5. Support: waiting in the admin queue.
  const c5 = conv({ kind: 'support', status: 'open', at: min(35), requesterId: 'cli-2', assigneeId: null, subject: 'Cannot export March occupancy report', priority: 'normal', resolvedAt: null });
  msg(c5, 'cli-2', 'text', 'The Export button on Reports does nothing for the March range. Other months work.', min(35), ['cli-2']);
  msg(c5, 'cli-2', 'text', 'Tried Chrome and Edge, same result.', min(33), ['cli-2']);

  // 6. Support: resolved yesterday.
  const c6 = conv({ kind: 'support', status: 'resolved', at: min(30 * 60), requesterId: 'stf-1', assigneeId: 'adm-1', subject: 'Plate lookup returns no results', priority: 'normal', resolvedAt: min(28 * 60) });
  msg(c6, 'stf-1', 'text', 'Plate lookup returns nothing for a plate I can see in Vehicles.', min(30 * 60), ['stf-1', 'adm-1']);
  msg(c6, 'adm-1', 'text', 'Thanks. The plate had a trailing space from an import. I fixed the record, please try again.', min(29 * 60), ['stf-1', 'adm-1']);
  msg(c6, 'stf-1', 'text', 'Works now.', min(28.5 * 60), ['stf-1', 'adm-1']);
  msg(c6, 'system', 'system', 'Taylor Brooks marked this resolved.', min(28 * 60), ['stf-1', 'adm-1']);

  // 7. Support: pending (agent replied, waiting on the requester), unread by the requester.
  const c7 = conv({ kind: 'support', status: 'pending', at: min(5 * 60), requesterId: 'stf-2', assigneeId: 'adm-2', subject: 'Bulk-approve guest passes', priority: 'low', resolvedAt: null });
  msg(c7, 'stf-2', 'text', 'Is there a way to approve several guest passes at once?', min(5 * 60), ['stf-2', 'adm-2']);
  msg(c7, 'adm-2', 'text', 'Yes: Access & Passes, select the rows, then Approve selected. Which property are you on?', min(4 * 60), ['adm-2']);

  // 8. Announcement from Admin to everyone.
  const c8 = conv({ kind: 'announcement', status: 'open', at: min(2 * 24 * 60 + 30), authorId: 'adm-1', audience: 'everyone', title: 'Lot B resurfacing this Saturday' });
  msg(c8, 'adm-1', 'text', 'Lot B will be resurfaced Saturday from 7 AM to 3 PM. Please move vehicles by Friday 10 PM; spaces in Lot A are available for the day.', min(2 * 24 * 60 + 30), ['adm-1']);
  // 9. Group of three: Staff and two Clients. The last message is unread by Staff only.
  const c9 = conv({ kind: 'group', status: 'open', at: min(180), participants: ['stf-1', 'cli-1', 'cli-2'], name: 'Riverbend March review', createdBy: 'stf-1' });
  msg(c9, 'system', 'system', 'Jordan Lee created the group with Dana Whitfield, Marcus Cole.', min(180), ['stf-1', 'cli-1', 'cli-2']);
  msg(c9, 'stf-1', 'text', 'Adding you both so we can finalise the March numbers in one place.', min(179), ['stf-1', 'cli-1', 'cli-2']);
  msg(c9, 'cli-1', 'text', 'Thanks Jordan. Marcus, can you confirm the budget line?', min(150), ['stf-1', 'cli-1', 'cli-2']);
  msg(c9, 'cli-2', 'text', 'Confirmed. I will send the signed PDF today.', min(40), ['cli-2', 'cli-1']);
  return d;
}

/* ----------------------------------------------------------------- store */

export function createStore({ transport, now = Date.now, config = {} } = {}) {
  const cfg = { ...CONFIG, ...config };
  const seed = () => createSeed(now());
  const subs = new Set();
  let state = transport.read();
  let lastRev = state ? state.rev : -1;

  const ensureLoaded = () => {
    if (!state) {
      const r = transport.update((d) => d, seed);
      state = r.state;
      lastRev = state.rev;
    }
  };
  ensureLoaded();

  const notify = (source) => subs.forEach((fn) => { try { fn(source); } catch (e) { console.error(e); } });
  if (transport.live) transport.live.onChange(() => notify('live'));
  transport.onChange(() => {
    const s = transport.read();
    if (s && s.rev !== lastRev) {
      state = s;
      lastRev = s.rev;
      notify('remote');
    }
  });

  /** Run a mutation atomically. fn(draft) returns {ok:false,reason} to abort, or {ok:true,...}. */
  function act(fn) {
    let result;
    const r = transport.update((d) => {
      result = fn(d);
      return result && (result.ok === false || result.noop) ? false : undefined; // failed or nothing changed: do not write
    }, seed);
    if (r.error) return { ok: false, reason: 'storage', message: r.error.message };
    if (r.changed) {
      state = r.state;
      lastRev = state.rev;
      notify('local');
    }
    return result || { ok: true };
  }

  const nid = (d, p) => `${p}${++d.seq}`;
  const user = (id) => byId[id];
  const msgsOf = (d, id) => d.msgs[id] || (d.msgs[id] = []);

  function push(d, conv, from, kind, text, extra = {}) {
    const at = now();
    const m = { id: nid(d, 'm'), convId: conv.id, from, kind, text, at, readBy: {}, ...extra };
    msgsOf(d, conv.id).push(m);
    conv.updatedAt = at;
    const a = extra.attachments && extra.attachments[0];
    conv.last = { at, from, kind, text: preview(text || (a ? (a.kind === 'image' ? 'Photo' : `Attachment: ${a.name}`) : '')) };
    return m;
  }

  /** "read" only when everyone else in the conversation has read it; groups report who has. */
  function deliveryOf(m, conv) {
    const others = conv.participants ? conv.participants.filter((p) => p !== m.from) : null;
    if (others && others.length) return others.every((p) => m.readBy[p]) ? 'read' : others.some((p) => m.readBy[p]) ? 'partial' : 'sent';
    return Object.keys(m.readBy).some((id) => id !== m.from) ? 'read' : 'sent';
  }

  /** Validate attachments: images and small files as data URLs. Returns a clean array or {ok:false,reason}. */
  function normalizeAttachments(list) {
    if (!list || !list.length) return [];
    if (!Array.isArray(list) || list.length > cfg.maxAttachments) return { ok: false, reason: 'too_many_attachments', max: cfg.maxAttachments };
    const out = [];
    for (const a of list) {
      const kind = a && a.kind === 'image' ? 'image' : 'file';
      const data = a && typeof a.data === 'string' ? a.data : '';
      if (!data.startsWith('data:') || (kind === 'image' && !data.startsWith('data:image/'))) return { ok: false, reason: 'bad_attachment' };
      const size = Number(a.size) || Math.round((data.length * 3) / 4);
      if (size > cfg.maxAttachmentBytes) return { ok: false, reason: 'attachment_too_large', max: cfg.maxAttachmentBytes };
      out.push({ id: `a${Math.random().toString(36).slice(2, 9)}`, kind, name: String(a.name || (kind === 'image' ? 'photo' : 'file')).replace(/[\\/]/g, '_').slice(0, 80), mime: String(a.mime || '').slice(0, 80), size, data });
    }
    return out;
  }

  function audienceIncludes(conv, role) {
    return conv.audience === 'everyone' || (Array.isArray(conv.audience) && conv.audience.includes(role));
  }

  function canSee(conv, u) {
    switch (conv.kind) {
      case 'resident_support':
        if (u.role === 'resident') return conv.residentId === u.id;
        if (u.role === 'staff') return conv.status !== 'bot' && (conv.status === 'queued' || conv.assigneeId === u.id);
        return false;
      case 'direct':
      case 'group':
        return conv.participants.includes(u.id);
      case 'support':
        return u.role === 'admin' || conv.requesterId === u.id;
      case 'announcement':
        return conv.authorId === u.id || audienceIncludes(conv, u.role);
      default:
        return false;
    }
  }

  /** Can this user post in this conversation right now? */
  function postCheck(d, conv, u) {
    if (!u) return { ok: false, reason: 'unknown_user' };
    if (!canSee(conv, u)) return { ok: false, reason: 'not_member' };
    switch (conv.kind) {
      case 'resident_support':
        if (conv.status === 'closed') return { ok: false, reason: 'closed' };
        if (u.role === 'resident') return { ok: true };
        if (u.role === 'staff') return conv.status === 'active' && conv.assigneeId === u.id ? { ok: true } : { ok: false, reason: 'not_claimed' };
        return { ok: false, reason: 'not_member' };
      case 'direct': {
        const other = user(conv.participants.find((p) => p !== u.id));
        if (!other) return { ok: false, reason: 'not_allowed' };
        // Residents only ever write to Staff. A note from Admin is one-way; they ask the property team instead.
        if (u.role === 'resident' && other.role !== 'staff') return { ok: false, reason: 'one_way' };
        if (!canMessage(u.role, other.role)) return { ok: false, reason: 'not_allowed' };
        if (other.role === 'resident' && conv.outreach && !conv.residentReplied) {
          const sent = msgsOf(d, conv.id).filter((m) => m.from === u.id && m.kind === 'text').length;
          if (sent >= 1) return { ok: false, reason: 'awaiting_reply' };
        }
        return { ok: true };
      }
      case 'support':
      case 'group':
        return { ok: true };
      case 'announcement':
        return { ok: false, reason: 'read_only' };
      default:
        return { ok: false, reason: 'unknown_kind' };
    }
  }

  function clean(text) {
    const t = String(text ?? '').replace(/\r\n/g, '\n').trim();
    if (!t) return { ok: false, reason: 'empty' };
    if (t.length > cfg.maxLen) return { ok: false, reason: 'too_long', max: cfg.maxLen };
    return { ok: true, text: t };
  }

  /* --- resident support internals --- */

  const sys = (d, conv, text, extra = {}) => push(d, conv, 'system', 'system', text, extra);
  /** Quick replies that were not used can no longer be tapped once the chat moves on. */
  const retireChoices = (d, conv) => msgsOf(d, conv.id).forEach((m) => { if (m.choices && !m.chosen) m.chosen = 'x'; });

  function closeResident(d, conv, by, reason, systemText) {
    conv.status = 'closed';
    conv.closedAt = now();
    conv.closedBy = by;
    conv.closeReason = reason;
    retireChoices(d, conv);
    sys(d, conv, systemText, { notify: reason !== 'resident_ended' });
  }

  function queue(d, conv) {
    conv.status = 'queued';
    conv.queuedAt = now();
    conv.summary = assistant.summarize(conv.bot, msgsOf(d, conv.id));
    retireChoices(d, conv);
    sys(d, conv, 'Your request was sent to the property team. You will be notified when someone replies.');
  }

  function runAssistant(d, conv, reply) {
    for (const m of reply.messages || []) push(d, conv, 'bot', 'bot', m.text, m.choices ? { choices: m.choices } : {});
    if (reply.patch) Object.assign(conv.bot, reply.patch);
    if (reply.answered) conv.bot.answered = [...new Set([...(conv.bot.answered || []), reply.answered])];
    if (reply.patch?.topic) conv.topic = assistant.TOPICS.find((t) => t.id === reply.patch.topic)?.label || conv.topic;
    if (reply.outcome === 'resolved') closeResident(d, conv, 'bot', 'resolved_by_assistant', 'Chat closed. Start a new one any time.');
    if (reply.outcome === 'handoff') queue(d, conv);
  }

  function newBotSession(d, residentId) {
    const id = nid(d, 'c');
    const conv = { id, kind: 'resident_support', status: 'bot', createdAt: now(), updatedAt: now(), last: null, residentId, assigneeId: null, topic: null, bot: assistant.initialBotState(), summary: null, queuedAt: null, closedAt: null, closedBy: null, closeReason: null, csat: null };
    d.convs[id] = conv;
    d.msgs[id] = [];
    for (const g of assistant.greeting()) push(d, conv, 'bot', 'bot', g.text, g.choices ? { choices: g.choices } : {});
    return conv;
  }

  /* --- public actions --- */

  const api = {
    config: cfg,
    transportInfo: () => transport.info(),
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    user,
    canMessage,
    revision: () => (state ? state.rev : 0),

    /** Resident opens Messages. Staff are not involved: the assistant greets first. */
    ensureSession(userId) {
      const u = user(userId);
      if (!u || u.role !== 'resident') return { ok: false, reason: 'not_allowed' };
      api.tick();
      return act((d) => {
        const open = Object.values(d.convs).find((c) => c.kind === 'resident_support' && c.residentId === userId && OPEN_RESIDENT.includes(c.status));
        if (open) return { ok: true, convId: open.id, created: false, noop: true };
        return { ok: true, convId: newBotSession(d, userId).id, created: true };
      });
    },

    /** Resident taps a quick reply offered by the assistant. */
    choose(convId, userId, choiceId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || conv.kind !== 'resident_support' || conv.residentId !== userId || conv.status !== 'bot') return { ok: false, reason: 'not_allowed' };
        const offered = [...msgsOf(d, convId)].reverse().find((m) => m.choices && !m.chosen);
        const choice = offered?.choices.find((c) => c.id === choiceId);
        if (!choice) return { ok: false, reason: 'invalid_choice' };
        offered.chosen = choiceId;
        push(d, conv, u.id, 'text', choice.label, { viaChoice: choiceId });
        runAssistant(d, conv, assistant.onChoice(conv.bot, choiceId));
        return { ok: true };
      });
    },

    /** Send a message. `clientId` makes retries safe (same id is never stored twice). */
    send(convId, userId, text, { clientId, attachments, replyTo } = {}) {
      const atts = normalizeAttachments(attachments);
      if (!Array.isArray(atts)) return atts;
      const raw = String(text ?? '').replace(/\r\n/g, '\n').trim();
      if (!raw && !atts.length) return { ok: false, reason: 'empty' };
      if (raw.length > cfg.maxLen) return { ok: false, reason: 'too_long', max: cfg.maxLen };
      const c = { text: raw };
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv) return { ok: false, reason: 'not_found' };
        const check = postCheck(d, conv, u);
        if (!check.ok) return check;
        if (clientId) {
          const dup = msgsOf(d, convId).find((m) => m.clientId === clientId && m.from === userId);
          if (dup) return { ok: true, messageId: dup.id, duplicate: true };
        }
        const extra = {};
        if (clientId) extra.clientId = clientId;
        if (atts.length) extra.attachments = atts;
        if (replyTo) {
          const target = msgsOf(d, convId).find((m) => m.id === replyTo);
          if (!target || target.deleted || target.kind === 'system') return { ok: false, reason: 'invalid_reply' };
          extra.replyTo = replyTo;
        }
        const m = push(d, conv, userId, 'text', c.text, extra);
        if (conv.kind === 'resident_support' && u.role === 'resident' && conv.status === 'bot') {
          runAssistant(d, conv, assistant.onText(conv.bot, c.text));
        }
        if (conv.kind === 'direct' && u.role === 'resident') conv.residentReplied = true;
        if (conv.kind === 'support') {
          if (u.role === 'admin') {
            if (!conv.assigneeId) conv.assigneeId = u.id;
            if (conv.status === 'open') conv.status = 'pending';
          } else if (conv.status !== 'open') {
            conv.status = 'open';
            conv.resolvedAt = null;
          }
        }
        return { ok: true, messageId: m.id };
      });
    },

    /** Resident asks for a person (button). Moves the chat to the staff queue. */
    requestStaff(convId, userId) {
      return act((d) => {
        const conv = d.convs[convId];
        if (!conv || conv.kind !== 'resident_support' || conv.residentId !== userId || conv.status !== 'bot') return { ok: false, reason: 'not_allowed' };
        queue(d, conv);
        return { ok: true };
      });
    },

    /** Staff takes a queued chat. Only one staff member can win. */
    claim(convId, staffId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(staffId);
        if (!conv || conv.kind !== 'resident_support' || !u || u.role !== 'staff') return { ok: false, reason: 'not_allowed' };
        if (conv.status !== 'queued') return { ok: false, reason: conv.status === 'active' ? 'already_taken' : 'not_queued' };
        conv.status = 'active';
        conv.assigneeId = u.id;
        conv.claimedAt = now();
        sys(d, conv, `${u.name} from the property team joined the chat.`, { notify: true });
        return { ok: true };
      });
    },

    /** Staff ends the chat as resolved. */
    resolve(convId, userId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || !u) return { ok: false, reason: 'not_found' };
        if (conv.kind === 'resident_support') {
          if (u.role !== 'staff' || conv.status !== 'active' || conv.assigneeId !== u.id) return { ok: false, reason: 'not_allowed' };
          closeResident(d, conv, u.id, 'resolved_by_staff', `${u.name} marked this resolved. Thanks for contacting the property team.`);
          return { ok: true };
        }
        if (conv.kind === 'support') return api._setSupportStatus(d, conv, u, 'resolved');
        return { ok: false, reason: 'not_allowed' };
      });
    },

    /** Resident ends their own chat at any point (also leaves the queue). */
    endChat(convId, userId) {
      return act((d) => {
        const conv = d.convs[convId];
        if (!conv || conv.kind !== 'resident_support' || conv.residentId !== userId || !OPEN_RESIDENT.includes(conv.status)) return { ok: false, reason: 'not_allowed' };
        closeResident(d, conv, userId, 'resident_ended', 'You ended this chat.');
        return { ok: true };
      });
    },

    rate(convId, userId, up) {
      return act((d) => {
        const conv = d.convs[convId];
        if (!conv || conv.kind !== 'resident_support' || conv.residentId !== userId || conv.status !== 'closed' || !conv.assigneeId || conv.csat) return { ok: false, reason: 'not_allowed' };
        conv.csat = up ? 'up' : 'down';
        return { ok: true };
      });
    },

    /** Start (or reuse) a one-to-one thread. Residents cannot start one: they use the assistant. */
    startDirect(fromId, toId, text) {
      const c = clean(text);
      if (!c.ok) return c;
      return act((d) => {
        const from = user(fromId);
        const to = user(toId);
        if (!from || !to || from.id === to.id) return { ok: false, reason: 'not_allowed' };
        if (from.role === 'resident') return { ok: false, reason: 'use_assistant' };
        if (!canMessage(from.role, to.role)) return { ok: false, reason: 'not_allowed' };
        if (to.role === 'admin' && from.role !== 'admin') return api._startSupportIn(d, from, { subject: 'Message to Support', text: c.text, priority: 'normal' });
        let conv = Object.values(d.convs).find((x) => x.kind === 'direct' && x.participants.includes(fromId) && x.participants.includes(toId));
        if (!conv) {
          const isOutreach = to.role === 'resident';
          if (isOutreach) {
            // Protect the resident: cap unsolicited new threads per window, whoever sends them.
            const recent = Object.values(d.convs).filter((x) => x.kind === 'direct' && x.outreach && x.participants.includes(toId) && !x.residentReplied && now() - x.createdAt < cfg.outreachWindowMs);
            if (recent.length >= cfg.outreachMax) return { ok: false, reason: 'rate_limited', retryAt: Math.min(...recent.map((x) => x.createdAt)) + cfg.outreachWindowMs };
          }
          const id = nid(d, 'c');
          conv = { id, kind: 'direct', status: 'open', createdAt: now(), updatedAt: now(), last: null, participants: [fromId, toId], startedBy: fromId, outreach: isOutreach, residentReplied: false };
          d.convs[id] = conv;
          d.msgs[id] = [];
        }
        const check = postCheck(d, conv, from);
        if (!check.ok) return check;
        push(d, conv, fromId, 'text', c.text);
        return { ok: true, convId: conv.id };
      });
    },

    _startSupportIn(d, requester, { subject, text, priority }) {
      if (!['staff', 'client'].includes(requester.role)) return { ok: false, reason: 'not_allowed' };
      const id = nid(d, 'c');
      const conv = { id, kind: 'support', status: 'open', createdAt: now(), updatedAt: now(), last: null, requesterId: requester.id, assigneeId: null, subject: preview(subject) || 'Support request', priority: priority || 'normal', resolvedAt: null };
      d.convs[id] = conv;
      d.msgs[id] = [];
      push(d, conv, requester.id, 'text', text);
      return { ok: true, convId: id };
    },

    /** Staff or client asks Admin for help. */
    startSupport(requesterId, { subject, text, priority } = {}) {
      const c = clean(text);
      if (!c.ok) return c;
      const s = clean(subject);
      if (!s.ok) return { ok: false, reason: 'subject_required' };
      return act((d) => api._startSupportIn(d, user(requesterId), { subject: s.text, text: c.text, priority }));
    },

    _setSupportStatus(d, conv, u, status) {
      if (u.role !== 'admin' || conv.kind !== 'support' || !['open', 'pending', 'resolved'].includes(status)) return { ok: false, reason: 'not_allowed' };
      if (conv.status === status) return { ok: true, noop: true };
      conv.status = status;
      if (!conv.assigneeId) conv.assigneeId = u.id;
      conv.resolvedAt = status === 'resolved' ? now() : null;
      if (status === 'resolved') sys(d, conv, `${u.name} marked this resolved. Reply to reopen it.`, { notify: true });
      return { ok: true };
    },

    setSupportStatus(convId, userId, status) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        return conv && u ? api._setSupportStatus(d, conv, u, status) : { ok: false, reason: 'not_found' };
      });
    },

    assignSupport(convId, adminId, toId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(adminId);
        const to = toId ? user(toId) : null;
        if (!conv || conv.kind !== 'support' || !u || u.role !== 'admin' || (to && to.role !== 'admin')) return { ok: false, reason: 'not_allowed' };
        conv.assigneeId = to ? to.id : null;
        return { ok: true };
      });
    },

    setPriority(convId, adminId, priority) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(adminId);
        if (!conv || conv.kind !== 'support' || !u || u.role !== 'admin' || !['low', 'normal', 'high'].includes(priority)) return { ok: false, reason: 'not_allowed' };
        conv.priority = priority;
        return { ok: true };
      });
    },

    /**
     * Group chat for Staff, Client and Admin people (never residents, who only ever talk to Staff one to one).
     * Created by Staff or Admin; 3 to 12 people including the creator. Every join/leave is written into the thread.
     */
    createGroup(creatorId, { name, memberIds = [], text } = {}) {
      const n = clean(name);
      if (!n.ok) return { ok: false, reason: 'name_required' };
      const first = String(text ?? '').trim();
      if (first.length > cfg.maxLen) return { ok: false, reason: 'too_long', max: cfg.maxLen };
      return act((d) => {
        const creator = user(creatorId);
        if (!creator || !['staff', 'admin'].includes(creator.role)) return { ok: false, reason: 'not_allowed' };
        const ids = [...new Set([creatorId, ...memberIds])];
        const people = ids.map(user);
        if (people.some((p) => !p || !['staff', 'client', 'admin'].includes(p.role))) return { ok: false, reason: 'not_allowed' };
        if (ids.length < 3) return { ok: false, reason: 'group_too_small' };
        if (ids.length > 12) return { ok: false, reason: 'group_too_large' };
        const id = nid(d, 'c');
        const conv = { id, kind: 'group', status: 'open', createdAt: now(), updatedAt: now(), last: null, participants: ids, name: preview(n.text).slice(0, 60), createdBy: creatorId };
        d.convs[id] = conv;
        d.msgs[id] = [];
        sys(d, conv, `${creator.name} created the group with ${people.slice(1).map((p) => p.name).join(', ')}.`);
        if (first) push(d, conv, creatorId, 'text', first);
        return { ok: true, convId: id };
      });
    },

    addMember(convId, byId, userId) {
      return act((d) => {
        const conv = d.convs[convId];
        const by = user(byId);
        const who = user(userId);
        if (!conv || conv.kind !== 'group' || !by || !conv.participants.includes(byId) || !['staff', 'admin'].includes(by.role)) return { ok: false, reason: 'not_allowed' };
        if (!who || !['staff', 'client', 'admin'].includes(who.role)) return { ok: false, reason: 'not_allowed' };
        if (conv.participants.includes(userId)) return { ok: true, noop: true };
        if (conv.participants.length >= 12) return { ok: false, reason: 'group_too_large' };
        conv.participants.push(userId);
        sys(d, conv, `${by.name} added ${who.name}.`);
        return { ok: true };
      });
    },

    leaveGroup(convId, userId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || conv.kind !== 'group' || !u || !conv.participants.includes(userId)) return { ok: false, reason: 'not_allowed' };
        if (conv.participants.length <= 2) return { ok: false, reason: 'group_too_small' };
        sys(d, conv, `${u.name} left the group.`);
        conv.participants = conv.participants.filter((p) => p !== userId);
        return { ok: true };
      });
    },

    /** Admin announcement to everyone or to chosen roles. One-way: replies go to Support, not to the author. */
    broadcast(adminId, { title, text, audience = 'everyone' } = {}) {
      const t = clean(title);
      const c = clean(text);
      if (!t.ok) return { ok: false, reason: 'title_required' };
      if (!c.ok) return c;
      return act((d) => {
        const u = user(adminId);
        if (!u || u.role !== 'admin') return { ok: false, reason: 'not_allowed' };
        const roles = audience === 'everyone' ? 'everyone' : [...new Set([].concat(audience))].filter((r) => ['resident', 'staff', 'client', 'admin'].includes(r));
        if (roles !== 'everyone' && !roles.length) return { ok: false, reason: 'audience_required' };
        const id = nid(d, 'c');
        const conv = { id, kind: 'announcement', status: 'open', createdAt: now(), updatedAt: now(), last: null, authorId: u.id, audience: roles, title: preview(t.text) };
        d.convs[id] = conv;
        d.msgs[id] = [];
        push(d, conv, u.id, 'text', c.text);
        return { ok: true, convId: id };
      });
    },

    markRead(convId, userId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: 'not_found' };
        let changed = false;
        const at = now();
        for (const m of msgsOf(d, convId)) {
          if (m.from !== userId && !m.readBy[userId]) {
            m.readBy[userId] = at;
            changed = true;
          }
        }
        return changed ? { ok: true } : { ok: true, noop: true };
      });
    },

    /** One reaction per person per message: a new emoji replaces the old one, the same emoji removes it. */
    react(convId, userId, msgId, emoji) {
      if (!isEmoji(emoji)) return { ok: false, reason: 'invalid_emoji' };
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: 'not_found' };
        const m = msgsOf(d, convId).find((x) => x.id === msgId);
        if (!m || m.deleted || m.kind !== 'text') return { ok: false, reason: 'not_found' };
        const r = (m.reactions = m.reactions || {});
        const had = (r[emoji] || []).includes(userId);
        for (const k of Object.keys(r)) {
          r[k] = r[k].filter((x) => x !== userId);
          if (!r[k].length) delete r[k];
        }
        if (!had) (r[emoji] = r[emoji] || []).push(userId);
        return { ok: true, reacted: !had };
      });
    },

    /** Take back your own message for a short while. The thread keeps a "Message removed" note. */
    unsend(convId, userId, msgId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: 'not_found' };
        const m = msgsOf(d, convId).find((x) => x.id === msgId);
        if (!m || m.from !== userId || m.kind !== 'text' || m.deleted) return { ok: false, reason: 'not_allowed' };
        if (now() - m.at > cfg.unsendMs) return { ok: false, reason: 'too_late' };
        if (conv.kind === 'resident_support' && conv.status === 'closed') return { ok: false, reason: 'closed' };
        m.deleted = true;
        m.text = '';
        m.attachments = [];
        m.reactions = {};
        delete m.replyTo;
        const list = msgsOf(d, convId);
        if (list[list.length - 1] === m && conv.last) conv.last.text = 'Message removed';
        return { ok: true };
      });
    },

    /** Fix a typo in your own message for a short while. The thread shows "Edited"; the old text is not kept. */
    edit(convId, userId, msgId, text) {
      const c = clean(text);
      if (!c.ok) return c;
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: 'not_found' };
        const list = msgsOf(d, convId);
        const m = list.find((x) => x.id === msgId);
        if (!m || m.from !== userId || m.kind !== 'text' || m.deleted || m.viaChoice) return { ok: false, reason: 'not_allowed' };
        if (now() - m.at > cfg.editMs) return { ok: false, reason: 'too_late' };
        if (conv.kind === 'resident_support' && conv.status === 'closed') return { ok: false, reason: 'closed' };
        if (m.text === c.text) return { ok: true, noop: true };
        m.text = c.text;
        m.editedAt = now();
        if (list[list.length - 1] === m && conv.last) conv.last.text = preview(c.text);
        return { ok: true };
      });
    },

    /** Pin or mute a conversation for yourself only. Muted chats stay in the list but do not add to the badge. */
    toggleFlag(convId, userId, flag) {
      if (!['pinned', 'muted'].includes(flag)) return { ok: false, reason: 'invalid_flag' };
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: 'not_found' };
        const p = (d.prefs[userId] = d.prefs[userId] || {});
        const list = new Set(p[flag] || []);
        const on = !list.has(convId);
        if (on) list.add(convId); else list.delete(convId);
        p[flag] = [...list];
        return { ok: true, on };
      });
    },

    /** Search message text across every conversation this person can see. Newest first. */
    search(userId, query, { limit = 30 } = {}) {
      const u = user(userId);
      const q = String(query ?? '').trim().toLowerCase();
      if (!u || q.length < 2) return [];
      const out = [];
      for (const conv of Object.values(state.convs)) {
        if (!canSee(conv, u)) continue;
        const row = api.rowFor(conv, u);
        for (const m of state.msgs[conv.id] || []) {
          if (m.deleted || m.kind === 'system' || !m.text) continue;
          if (conv.kind === 'resident_support' && u.role === 'staff' && m.kind === 'bot') continue;
          const i = m.text.toLowerCase().indexOf(q);
          if (i < 0) continue;
          const from = Math.max(0, i - 24);
          const snippet = `${from ? '…' : ''}${m.text.slice(from, i + q.length + 48).replace(/\s+/g, ' ')}${i + q.length + 48 < m.text.length ? '…' : ''}`;
          out.push({ convId: conv.id, msgId: m.id, at: m.at, title: row.title, snippet, match: [snippet.toLowerCase().indexOf(q), q.length], who: m.from === userId ? 'You' : m.from === 'bot' ? 'Assistant' : (user(m.from) || {}).name });
        }
      }
      return out.sort((a, b) => b.at - a.at).slice(0, limit);
    },

    /* --- live signals: online presence and typing (not stored in the conversation document) --- */

    touchPresence(userId) {
      if (transport.live) transport.live.update((d) => { (d.presence = d.presence || {})[userId] = now(); });
    },
    goOffline(userId) {
      if (transport.live) transport.live.update((d) => { if (d.presence) delete d.presence[userId]; });
    },
    presenceOf(userId) {
      const ts = transport.live ? ((transport.live.read().presence || {})[userId] || 0) : 0;
      return { online: !!ts && now() - ts < cfg.presenceMs, at: ts };
    },
    setTyping(convId, userId, on = true) {
      if (!transport.live) return;
      transport.live.update((d) => {
        const t = (d.typing = d.typing || {});
        const c = (t[convId] = t[convId] || {});
        if (on) c[userId] = now();
        else delete c[userId];
      });
    },
    /** People (other than the viewer) typing right now in a conversation the viewer can see. */
    typingIn(convId, viewerId) {
      const conv = state.convs[convId];
      const viewer = user(viewerId);
      if (!conv || !viewer || !canSee(conv, viewer) || !transport.live) return [];
      const c = (transport.live.read().typing || {})[convId] || {};
      return Object.entries(c).filter(([id, ts]) => id !== viewerId && now() - ts < cfg.typingMs).map(([id]) => user(id)).filter(Boolean);
    },

    setPref(userId, patch) {
      return act((d) => {
        d.prefs[userId] = { ...(d.prefs[userId] || {}), ...patch };
        return { ok: true };
      });
    },
    pref: (userId) => ({ dnd: false, pinned: [], muted: [], ...((state && state.prefs[userId]) || {}) }),

    /** Close idle chats. Called on a timer by the UI; safe to call any time. */
    tick() {
      const t = now();
      const stale = Object.values(state.convs).filter((c) => c.kind === 'resident_support' && ((c.status === 'bot' && t - c.updatedAt > cfg.botIdleMs) || (c.status === 'active' && t - c.updatedAt > cfg.activeIdleMs)));
      if (!stale.length) return { ok: true, closed: 0 };
      return act((d) => {
        let n = 0;
        for (const s of stale) {
          const conv = d.convs[s.id];
          if (!conv || !OPEN_RESIDENT.includes(conv.status)) continue;
          closeResident(d, conv, 'system', 'timeout', conv.status === 'bot' ? 'Chat closed after a period of inactivity.' : 'This chat was closed after a period of inactivity. Start a new one any time.');
          n++;
        }
        return { ok: true, closed: n };
      });
    },

    reset({ empty = false } = {}) {
      return act((d) => {
        const fresh = createSeed(now(), { empty });
        for (const k of Object.keys(d)) delete d[k];
        Object.assign(d, fresh);
        return { ok: true };
      });
    },

    /* --- reads --- */

    unreadCount(convId, userId) {
      const conv = state.convs[convId];
      const u = user(userId);
      if (!conv || !u) return 0;
      return (state.msgs[convId] || []).filter((m) => m.from !== userId && !m.readBy[userId] && notifies(m, u.role)).length;
    },

    /** Total shown on a badge. Do Not Disturb silences outreach and announcements, never active chats. */
    badgeCount(userId) {
      const u = user(userId);
      if (!u) return 0;
      const { dnd, muted } = api.pref(userId);
      let n = 0;
      for (const c of Object.values(state.convs)) {
        if (!canSee(c, u) || muted.includes(c.id)) continue;
        if (dnd && (c.kind === 'announcement' || (c.kind === 'direct' && c.outreach && !c.residentReplied))) continue;
        n += api.unreadCount(c.id, userId);
      }
      return n;
    },

    /** Who can this user start a conversation with? */
    recipients(userId) {
      const u = user(userId);
      if (!u || u.role === 'resident') return [];
      const out = [];
      for (const role of CAN_MESSAGE[u.role]) {
        if (role === 'admin' && u.role !== 'admin') {
          out.push({ type: 'support', label: 'EasySpotOps Support', hint: 'Ask Support for help' });
        } else {
          for (const p of Object.values(byId)) if (p.role === role && p.id !== u.id) out.push({ type: 'direct', userId: p.id, label: p.name, hint: `${p.title}${p.org ? ` · ${p.org}` : ''}`, role: p.role });
        }
      }
      return out;
    },

    rowFor(conv, viewer) {
      const unread = api.unreadCount(conv.id, viewer.id);
      const { pinned, muted } = api.pref(viewer.id);
      const base = { id: conv.id, kind: conv.kind, status: conv.status, updatedAt: conv.updatedAt, last: conv.last, unread, tags: [], pinned: pinned.includes(conv.id), muted: muted.includes(conv.id) };
      if (conv.kind === 'resident_support') {
        const res = user(conv.residentId);
        const staff = conv.assigneeId ? user(conv.assigneeId) : null;
        if (viewer.role === 'resident') {
          const title = conv.status === 'bot' ? 'EasySpotOps Assistant' : conv.status === 'closed' && conv.closedBy === 'bot' ? 'EasySpotOps Assistant' : staff ? staff.name : 'Property team';
          const subtitle = { bot: conv.topic || 'Ask a question', queued: 'Waiting for the property team', active: 'Property team', closed: conv.closedBy === 'bot' ? 'Answered by the assistant' : 'Closed' }[conv.status];
          return { ...base, title, subtitle, avatar: conv.status === 'bot' || conv.closedBy === 'bot' ? { role: 'bot', name: 'Assistant' } : { role: 'staff', name: staff ? staff.name : 'Property team' }, tags: [conv.status === 'closed' ? 'history' : 'current'], waitingSince: conv.queuedAt };
        }
        return { ...base, title: res.name, subtitle: `${res.title} · ${conv.topic || 'General question'}`, avatar: { role: 'resident', name: res.name }, tags: [conv.status === 'queued' ? 'queue' : 'mine', ...(conv.status === 'closed' ? ['closed'] : [])], waitingSince: conv.queuedAt, topic: conv.topic };
      }
      if (conv.kind === 'direct') {
        const other = user(conv.participants.find((p) => p !== viewer.id));
        const tags = viewer.role === 'staff' ? [other.role === 'client' ? 'clients' : other.role === 'resident' ? 'residents' : 'other'] : viewer.role === 'resident' ? ['current'] : viewer.role === 'client' ? ['staff'] : ['direct'];
        return { ...base, title: other.name, subtitle: other.title, avatar: { role: other.role, name: other.name }, tags };
      }
      if (conv.kind === 'support') {
        const req = user(conv.requesterId);
        const asg = conv.assigneeId ? user(conv.assigneeId) : null;
        if (viewer.role === 'admin') {
          const tags = [];
          if (conv.status !== 'resolved' && !conv.assigneeId) tags.push('queue');
          if (conv.status !== 'resolved' && conv.assigneeId === viewer.id) tags.push('mine');
          if (conv.status === 'resolved') tags.push('resolved');
          return { ...base, title: req.name, subtitle: conv.subject, avatar: { role: req.role, name: req.name }, tags, priority: conv.priority, assignee: asg && asg.name, waitingSince: conv.status === 'open' ? conv.updatedAt : null };
        }
        return { ...base, title: 'EasySpotOps Support', subtitle: conv.subject, avatar: { role: 'admin', name: 'Support' }, tags: ['support'], priority: conv.priority, assignee: asg && asg.name };
      }
      if (conv.kind === 'group') {
        const names = conv.participants.map((p) => (p === viewer.id ? 'You' : user(p).name.split(' ')[0]));
        return { ...base, title: conv.name, subtitle: `${conv.participants.length} people · ${names.join(', ')}`, avatar: { role: 'group', name: conv.name }, tags: [viewer.role === 'staff' ? 'groups' : viewer.role === 'client' ? 'groups' : 'direct'], members: conv.participants.map((p) => ({ id: p, name: user(p).name, role: user(p).role, title: user(p).title })) };
      }
      return { ...base, title: conv.title, subtitle: `Announcement from ${user(conv.authorId).name}`, avatar: { role: 'admin', name: 'Support' }, tags: ['announcements'] };
    },

    listFor(userId) {
      const u = user(userId);
      if (!u) return [];
      return Object.values(state.convs)
        .filter((c) => canSee(c, u))
        .map((c) => api.rowFor(c, u))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
    },

    /** People you could put in a group: Staff, Client and Admin people other than you. */
    groupCandidates(userId) {
      const u = user(userId);
      if (!u || !['staff', 'admin'].includes(u.role)) return [];
      return Object.values(byId).filter((p) => ['staff', 'client', 'admin'].includes(p.role) && p.id !== userId);
    },

    /** Everything the thread view needs for one viewer. */
    get(convId, userId) {
      const conv = state.convs[convId];
      const u = user(userId);
      if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: 'not_found' };
      const all = state.msgs[convId] || [];
      const byMsg = Object.fromEntries(all.map((x) => [x.id, x]));
      const quoted = (m) => {
        const q = m.replyTo && byMsg[m.replyTo];
        if (!q) return null;
        const who = q.from === 'bot' ? 'EasySpotOps Assistant' : (user(q.from) || {}).name || 'Someone';
        return { id: q.id, who: q.from === userId ? 'You' : who, text: q.deleted ? 'Message removed' : q.text || (q.attachments && q.attachments.length ? (q.attachments[0].kind === 'image' ? 'Photo' : q.attachments[0].name) : '') };
      };
      const messages = all.map((m) => ({ ...m, replyPreview: quoted(m), mine: m.from === userId, delivery: m.from === userId ? deliveryOf(m, conv) : null, seenBy: m.from === userId && conv.kind === 'group' ? conv.participants.filter((p) => p !== m.from && m.readBy[p]).map((p) => user(p).name) : null, author: m.from === 'bot' ? { id: 'bot', name: 'EasySpotOps Assistant', role: 'bot' } : m.from === 'system' ? null : user(m.from) }));
      const post = postCheck(state, conv, u);
      const actions = [];
      if (conv.kind === 'resident_support') {
        if (u.role === 'staff' && conv.status === 'queued') actions.push('claim');
        if (u.role === 'staff' && conv.status === 'active' && conv.assigneeId === u.id) actions.push('resolve');
        if (u.role === 'resident' && OPEN_RESIDENT.includes(conv.status)) actions.push('end');
        if (u.role === 'resident' && conv.status === 'bot') actions.push('request_staff');
        if (u.role === 'resident' && conv.status === 'closed' && conv.assigneeId && !conv.csat) actions.push('rate');
      }
      if (conv.kind === 'support' && u.role === 'admin') {
        for (const s of ['open', 'pending', 'resolved']) if (conv.status !== s) actions.push(`status:${s}`);
        if (conv.assigneeId !== u.id) actions.push('assign_me');
      }
      return { ok: true, conv: { ...conv }, row: api.rowFor(conv, u), messages, canPost: post, actions, viewer: u };
    },

    counts(userId) {
      const u = user(userId);
      const rows = api.listFor(userId);
      const by = {};
      for (const r of rows) for (const t of r.tags) by[t] = (by[t] || 0) + 1;
      return { total: rows.length, by, unread: api.badgeCount(userId), role: u && u.role };
    },
  };
  return api;
}
