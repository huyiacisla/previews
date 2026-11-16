// Messaging core. No DOM. Everything the UI shows or allows comes from here, and the rules are enforced
// here (the UI only hides what is not allowed). Tested in tests/messaging.test.mjs.
//
// Conversation kinds
//   resident_support  resident <-> assistant -> staff.  status: bot -> queued -> active -> closed
//   direct            two people (staff<->client, staff/admin -> resident outreach, admin<->anyone)
//   support           staff or client asks Admin for help.  status: open | pending | resolved
//   announcement      one-way broadcast from Admin

import * as assistant from "./bot.js";
import { isEmoji } from "./emoji.js";
import { byId } from "./personas.js";
import { matchFilters, matchText, parseQuery } from "./query.js";

export const CAN_MESSAGE = {
  resident: ["staff"],
  staff: ["resident", "client", "admin"],
  client: ["staff", "admin"],
  admin: ["staff", "admin", "resident", "client"],
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
  emergencySmsMs: 180 * 1000, // unacknowledged emergency: escalate to an SMS and a critical alert (simulated)
};

export const STAGE_LABEL = { open: "Open", in_progress: "In progress", waiting_on_resident: "Waiting on resident", resolved: "Resolved", closed: "Closed" };
/** Human ticket number from the conversation id, stable and unique: c8 -> T-1008. */
/** What a Staff or Client person can pick when they open a ticket with Support (the same topics the Support page lists). */
export const TICKET_CATEGORIES = ["Billing", "Account & access", "Bug / technical", "Parking ops", "Feature request", "Other"];
export const ticketNo = (conv) => `T-${conv.ticketNo || 1000 + (parseInt(String(conv.id).replace(/\D/g, ""), 10) || 0)}`;
const nextTicket = (d) => {
  d.ticketSeq = (d.ticketSeq || 1080) + 1;
  return d.ticketSeq;
};
export const STAGES = ["open", "in_progress", "waiting_on_resident", "resolved", "closed"];

/** Where a resident ticket is in its life: Open -> In progress -> Waiting on resident -> Resolved -> Closed. */
export function ticketStage(conv) {
  if (!conv || conv.kind !== "resident_support") return null;
  if (conv.status === "bot" || conv.status === "queued") return "open";
  if (conv.status === "active") return conv.waiting ? "waiting_on_resident" : "in_progress";
  return conv.closeReason === "resolved_by_staff" ? "resolved" : "closed";
}

const OPEN_RESIDENT = ["bot", "queued", "active"];
const preview = (text) =>
  String(text || "")
    .replace(/\s+/g, " ")
    .slice(0, 140);

/**
 * Does this message count as "new" for someone of this role?
 * Staff are never bothered by the assistant's part of a chat (its replies, or the resident's quick-reply taps):
 * that is history they read in the summary. Residents are told about assistant replies and about staff joining or closing.
 */
export function notifies(m, role) {
  if (m.kind === "text") return role === "resident" || !m.viaChoice;
  if (m.kind === "bot") return role === "resident";
  if (m.kind === "system") return !!m.notify && role === "resident";
  return false;
}

/** A small generated picture for the demo data (no real photos). */
function samplePhoto(label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><rect width="480" height="320" fill="#cbd5e1"/><rect x="60" y="40" width="360" height="240" fill="#94a3b8"/><path d="M80 60h320M80 260h320M170 60v200M310 60v200" stroke="#f8fafc" stroke-width="6" fill="none"/><rect x="190" y="110" width="100" height="120" rx="14" fill="#64748b"/><text x="240" y="92" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#0f172a">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ------------------------------------------------------------------ seed */

export function createSeed(now, { empty = false } = {}) {
  const d = { v: 1, rev: 0, seq: 0, ticketSeq: 1080, convs: {}, msgs: {}, prefs: {} };
  if (empty) return d;
  const min = (n) => now - n * 60000;
  const nid = (p) => `${p}${++d.seq}`;
  const conv = (c) => {
    const id = nid("c");
    // Support threads and resident chats that reached the team are tickets and get a number (T-1081, T-1082, ...).
    const isTicket = c.kind === "support" || (c.kind === "resident_support" && c.queuedAt);
    d.convs[id] = { id, createdAt: c.at, updatedAt: c.at, last: null, ...c, ...(isTicket ? { ticketNo: ++d.ticketSeq } : {}) };
    d.msgs[id] = [];
    return d.convs[id];
  };
  const msg = (c, from, kind, text, at, readers = [], extra = {}) => {
    const m = { id: nid("m"), convId: c.id, from, kind, text, at, readBy: {}, ...extra };
    for (const r of readers) m.readBy[r] = at;
    d.msgs[c.id].push(m);
    c.updatedAt = at;
    c.last = { at, from, kind, text: preview(text) };
    return m;
  };
  const greet = (c, at, readers) => assistant.greeting().forEach((g, i) => msg(c, "bot", "bot", g.text, at + i, readers, g.choices ? { choices: g.choices, chosen: "x" } : {}));

  // 1. Resident history: solved by the assistant two days ago, staff never involved.
  const c1 = conv({
    kind: "resident_support",
    status: "closed",
    at: min(2 * 24 * 60),
    residentId: "res-1",
    assigneeId: null,
    topic: "Guest parking",
    bot: assistant.initialBotState(),
    summary: null,
    queuedAt: null,
    closedAt: min(2 * 24 * 60 - 3),
    closedBy: "bot",
    closeReason: "resolved_by_assistant",
    csat: null,
  });
  greet(c1, min(2 * 24 * 60), ["res-1"]);
  msg(c1, "res-1", "text", "Guest parking", min(2 * 24 * 60 - 1), ["res-1"], { viaChoice: "topic:guest" });
  msg(c1, "bot", "bot", "Guest passes are requested from Access & Passes. Add the guest plate and the dates; most are approved automatically.", min(2 * 24 * 60 - 1), ["res-1"]);
  msg(c1, "res-1", "text", "Yes, thanks", min(2 * 24 * 60 - 2), ["res-1"], { viaChoice: "helped:yes" });
  msg(c1, "system", "system", "Chat closed. Start a new one any time.", min(2 * 24 * 60 - 3), ["res-1"]);

  // 2. Resident waiting in the queue (Staff sees it, summary included).
  const c2 = conv({
    kind: "resident_support",
    status: "queued",
    at: min(9),
    residentId: "res-2",
    assigneeId: null,
    topic: "Vehicle or permit",
    bot: { ...assistant.initialBotState(), topic: "permit", answered: ["permit:lost"] },
    summary: { topic: "Vehicle or permit", asked: ["Lost or damaged pass"], details: ["My hangtag was torn at the gate this morning. Plate 7XYZ482."] },
    queuedAt: min(7),
    closedAt: null,
    closedBy: null,
    closeReason: null,
    csat: null,
  });
  greet(c2, min(9), ["res-2"]);
  msg(c2, "res-2", "text", "Vehicle or permit", min(8.5), ["res-2"], { viaChoice: "topic:permit" });
  msg(c2, "bot", "bot", "Common questions about vehicle or permit:", min(8.5), ["res-2"], { chosen: "x" });
  msg(c2, "res-2", "text", "Lost or damaged pass", min(8), ["res-2"], { viaChoice: "faq:permit:lost" });
  msg(c2, "bot", "bot", "Replacement passes are issued by the office. Staff will confirm how to collect one.", min(8), ["res-2"]);
  msg(c2, "res-2", "text", "Talk to a person", min(7.5), ["res-2"], { viaChoice: "staff:request" });
  msg(c2, "system", "system", "Your request was sent to the property team. You will be notified when someone replies.", min(7), ["res-2"]);
  msg(c2, "res-2", "text", "My hangtag was torn at the gate this morning. Plate 7XYZ482.", min(6), ["res-2"]);

  // 3. Active staff chat with a resident (Staff "Mine").
  const c3 = conv({
    kind: "resident_support",
    status: "active",
    at: min(50),
    residentId: "res-3",
    assigneeId: "stf-1",
    topic: "My parking space",
    bot: { ...assistant.initialBotState(), topic: "space", answered: ["space:occupied"] },
    summary: { topic: "My parking space", asked: ["Someone is in my space"], details: ["Grey SUV in space 118 again."] },
    queuedAt: min(46),
    closedAt: null,
    closedBy: null,
    closeReason: null,
    csat: null,
  });
  greet(c3, min(50), ["res-3"]);
  msg(c3, "res-3", "text", "Grey SUV in space 118 again.", min(46), ["res-3", "stf-1"]);
  msg(c3, "system", "system", "A member of the property team joined the chat.", min(40), ["res-3", "stf-1"], { notify: true });
  msg(c3, "stf-1", "text", "Thanks Morgan. Can you send the plate or a description so I can check it against the permit list?", min(39), ["res-3", "stf-1"], { reactions: { "👍": ["res-3"] } });
  msg(c3, "res-3", "text", "Grey Honda CR-V, no hangtag. It was there yesterday too.", min(12), ["res-3"], {
    attachments: [{ id: "a-seed-1", kind: "image", name: "space-118.svg", mime: "image/svg+xml", size: 1100, data: samplePhoto("Space 118") }],
  });

  // 4. Staff <-> client, one unread for the client.
  const c4 = conv({ kind: "direct", status: "open", at: min(26 * 60), participants: ["stf-1", "cli-1"], startedBy: "stf-1", outreach: false, residentReplied: true });
  msg(c4, "cli-1", "text", "Can you share the March occupancy numbers for Riverbend before Thursday's review?", min(26 * 60), ["cli-1", "stf-1"]);
  msg(c4, "stf-1", "text", "Yes. Occupancy is at 94% and I am pulling the March export now.", min(25 * 60), ["cli-1", "stf-1"]);
  msg(c4, "stf-1", "text", "Report is ready. I will keep it as a PDF unless you want the raw export.", min(95), ["stf-1"]);

  // 5. Support: waiting in the admin queue.
  const c5 = conv({ kind: "support", status: "open", at: min(35), requesterId: "cli-2", assigneeId: null, subject: "Cannot export March occupancy report", priority: "normal", resolvedAt: null });
  msg(c5, "cli-2", "text", "The Export button on Reports does nothing for the March range. Other months work.", min(35), ["cli-2"]);
  msg(c5, "cli-2", "text", "Tried Chrome and Edge, same result.", min(33), ["cli-2"]);

  // 6. Support: resolved yesterday.
  const c6 = conv({
    kind: "support",
    status: "resolved",
    at: min(30 * 60),
    requesterId: "stf-1",
    assigneeId: "adm-1",
    subject: "Plate lookup returns no results",
    priority: "normal",
    resolvedAt: min(28 * 60),
  });
  msg(c6, "stf-1", "text", "Plate lookup returns nothing for a plate I can see in Vehicles.", min(30 * 60), ["stf-1", "adm-1"]);
  msg(c6, "adm-1", "text", "Thanks. The plate had a trailing space from an import. I fixed the record, please try again.", min(29 * 60), ["stf-1", "adm-1"]);
  msg(c6, "stf-1", "text", "Works now.", min(28.5 * 60), ["stf-1", "adm-1"]);
  msg(c6, "system", "system", "Taylor Brooks marked this resolved.", min(28 * 60), ["stf-1", "adm-1"]);

  // 7. Support: pending (agent replied, waiting on the requester), unread by the requester.
  const c7 = conv({ kind: "support", status: "pending", at: min(5 * 60), requesterId: "stf-2", assigneeId: "adm-2", subject: "Bulk-approve guest passes", priority: "low", resolvedAt: null });
  msg(c7, "stf-2", "text", "Is there a way to approve several guest passes at once?", min(5 * 60), ["stf-2", "adm-2"]);
  msg(c7, "adm-2", "text", "Yes: Access & Passes, select the rows, then Approve selected. Which property are you on?", min(4 * 60), ["adm-2"]);

  // 8. Announcement from Admin to everyone.
  const c8 = conv({ kind: "announcement", status: "open", at: min(2 * 24 * 60 + 30), authorId: "adm-1", audience: "everyone", title: "Lot B resurfacing this Saturday" });
  msg(c8, "adm-1", "text", "Lot B will be resurfaced Saturday from 7 AM to 3 PM. Please move vehicles by Friday 10 PM; spaces in Lot A are available for the day.", min(2 * 24 * 60 + 30), ["adm-1"]);
  // 9. Group of three: Staff and two Clients. The last message is unread by Staff only.
  const c9 = conv({ kind: "group", status: "open", at: min(180), participants: ["stf-1", "cli-1", "cli-2"], name: "Riverbend March review", createdBy: "stf-1" });
  msg(c9, "system", "system", "Jordan Lee created the group with Dana Whitfield, Marcus Cole.", min(180), ["stf-1", "cli-1", "cli-2"]);
  msg(c9, "stf-1", "text", "Adding you both so we can finalise the March numbers in one place.", min(179), ["stf-1", "cli-1", "cli-2"]);
  msg(c9, "cli-1", "text", "Thanks Jordan. Marcus, can you confirm the budget line?", min(150), ["stf-1", "cli-1", "cli-2"]);
  msg(c9, "cli-2", "text", "Confirmed. I will send the signed PDF today.", min(40), ["cli-2", "cli-1"]);
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

  const notify = (source) =>
    subs.forEach((fn) => {
      try {
        fn(source);
      } catch (e) {
        console.error(e);
      }
    });
  if (transport.live) transport.live.onChange(() => notify("live"));
  transport.onChange(() => {
    const s = transport.read();
    if (s && s.rev !== lastRev) {
      state = s;
      lastRev = s.rev;
      notify("remote");
    }
  });

  /** Run a mutation atomically. fn(draft) returns {ok:false,reason} to abort, or {ok:true,...}. */
  function act(fn) {
    let result;
    const r = transport.update((d) => {
      result = fn(d);
      return result && (result.ok === false || result.noop) ? false : undefined; // failed or nothing changed: do not write
    }, seed);
    if (r.error) return { ok: false, reason: "storage", message: r.error.message };
    if (r.changed) {
      state = r.state;
      lastRev = state.rev;
      notify("local");
    }
    return result || { ok: true };
  }

  const nid = (d, p) => `${p}${++d.seq}`;
  const user = (id) => byId[id];
  /** What `viewer` is allowed to know about a person: a resident sees every member of the staff as the one "Property team", never a name or a job title. */
  const maskStaff = (person, viewer, conv) => {
    if (!person || !viewer || viewer.role !== "resident") return person;
    if (person.role === "staff") return { ...person, name: "Property team", title: "Property team" };
    // In a chat with the platform's own support the resident knows one name too: "EasySpotOps Support".
    if (person.role === "admin" && conv && conv.kind === "resident_support") return { ...person, name: "EasySpotOps Support", title: "EasySpotOps Support" };
    return person;
  };
  /**
   * What a member of the staff may do by job title (decision #5): the Property Manager can do everything; any other title (Leasing Agent, Front Desk…)
   * handles ordinary requests and may say "I have seen the emergency" (anybody on duty must be able to), but closing a chat that holds an emergency
   * or a high-priority complaint is the Property Manager's. The store refuses; the button is only hidden.
   */
  const canDo = (u, action, conv) => {
    if (!u || u.role !== "staff" || u.title === "Property Manager") return true;
    const urgent = !!(conv && (conv.emergency || conv.priority === "high"));
    if (action === "resolve") return !urgent;
    return true;
  };
  /** Who answers a resident's request: the building's staff, or (a problem with the app) the platform's own support, which is Admin. */
  const handlerOf = (conv) => (conv && conv.route === "platform" ? "admin" : "staff");
  const teamName = (conv) => (conv && conv.route === "platform" ? "EasySpotOps Support" : "the property team");
  /** The same rule for a sentence that names somebody ("Sam Okafor marked this resolved."): a resident reads "The property team". */
  const maskText = (text, viewer, conv) => {
    if (!viewer || viewer.role !== "resident") return text;
    let t = String(text == null ? "" : text);
    for (const p of Object.values(byId)) {
      if (!p || !p.name) continue;
      if (p.role === "staff") t = t.split(p.name).join("The property team");
      else if (p.role === "admin" && conv && conv.kind === "resident_support") t = t.split(p.name).join("EasySpotOps Support");
    }
    return t;
  };
  const msgsOf = (d, id) => d.msgs[id] || (d.msgs[id] = []);

  function push(d, conv, from, kind, text, extra = {}) {
    const at = now();
    const m = { id: nid(d, "m"), convId: conv.id, from, kind, text, at, readBy: {}, ...extra };
    msgsOf(d, conv.id).push(m);
    conv.updatedAt = at;
    const a = extra.attachments && extra.attachments[0];
    conv.last = { at, from, kind, text: preview(text || (a ? (a.kind === "image" ? "Photo" : `Attachment: ${a.name}`) : "")) };
    return m;
  }

  /** "read" only when everyone else in the conversation has read it; groups report who has. */
  function deliveryOf(m, conv) {
    const seen = (p) => m.readBy[p] && !(m.quiet && m.quiet[p]); // a reader who turned receipts off does not show as having read it
    const others = conv.participants ? conv.participants.filter((p) => p !== m.from) : null;
    if (others && others.length) return others.every(seen) ? "read" : others.some(seen) ? "partial" : "sent";
    return Object.keys(m.readBy).some((id) => id !== m.from && seen(id)) ? "read" : "sent";
  }

  /** Validate attachments: images and small files as data URLs. Returns a clean array or {ok:false,reason}. */
  function normalizeAttachments(list) {
    if (!list || !list.length) return [];
    if (!Array.isArray(list) || list.length > cfg.maxAttachments) return { ok: false, reason: "too_many_attachments", max: cfg.maxAttachments };
    const out = [];
    for (const a of list) {
      const kind = a && a.kind === "image" ? "image" : "file";
      const data = a && typeof a.data === "string" ? a.data : "";
      if (!data.startsWith("data:") || (kind === "image" && !data.startsWith("data:image/"))) return { ok: false, reason: "bad_attachment" };
      const size = Number(a.size) || Math.round((data.length * 3) / 4);
      if (size > cfg.maxAttachmentBytes) return { ok: false, reason: "attachment_too_large", max: cfg.maxAttachmentBytes };
      out.push({
        id: `a${Math.random().toString(36).slice(2, 9)}`,
        kind,
        name: String(a.name || (kind === "image" ? "photo" : "file"))
          .replace(/[\\/]/g, "_")
          .slice(0, 80),
        mime: String(a.mime || "").slice(0, 80),
        size,
        data,
      });
    }
    return out;
  }

  function audienceIncludes(conv, role) {
    return conv.audience === "everyone" || (Array.isArray(conv.audience) && conv.audience.includes(role));
  }

  function canSee(conv, u) {
    switch (conv.kind) {
      case "resident_support":
        if (u.role === "resident") return conv.residentId === u.id;
        // Only the team the request was sent to sees it: staff for the property, Admin for the platform's support. Never both.
        if (u.role === handlerOf(conv)) return conv.status !== "bot" && (conv.status === "queued" || conv.assigneeId === u.id);
        return false;
      case "direct":
      case "group":
        return conv.participants.includes(u.id);
      case "support":
        return u.role === "admin" || conv.requesterId === u.id;
      case "announcement":
        return conv.authorId === u.id || audienceIncludes(conv, u.role);
      default:
        return false;
    }
  }

  /** Can this user post in this conversation right now? */
  function postCheck(d, conv, u, { emergency = false } = {}) {
    if (!u) return { ok: false, reason: "unknown_user" };
    if (!canSee(conv, u)) return { ok: false, reason: "not_member" };
    switch (conv.kind) {
      case "resident_support":
        if (conv.status === "closed") return { ok: false, reason: "closed" };
        if (u.role === "resident") return { ok: true };
        // The team can answer a waiting resident straight away: the first reply takes the chat (see takeChat).
        if (u.role === handlerOf(conv)) {
          if (conv.status === "queued") return { ok: true, takes: true };
          return conv.status === "active" && conv.assigneeId === u.id ? { ok: true } : { ok: false, reason: "not_claimed" };
        }
        return { ok: false, reason: "not_member" };
      case "direct": {
        const other = user(conv.participants.find((p) => p !== u.id));
        if (!other) return { ok: false, reason: "not_allowed" };
        // Residents only ever write to Staff. A note from Admin is one-way; they ask the property team instead.
        if (u.role === "resident" && other.role !== "staff") return { ok: false, reason: "one_way" };
        if (!canMessage(u.role, other.role)) return { ok: false, reason: "not_allowed" };
        // The one-note-until-they-reply rule protects residents from noise; an emergency is not noise.
        // It is for Staff only: a resident cannot answer Admin, so the rule would shut Admin out for good (a bug, not a design). Admin may write as many notes as needed.
        if (other.role === "resident" && u.role !== "admin" && conv.outreach && !conv.residentReplied && !emergency) {
          const sent = msgsOf(d, conv.id).filter((m) => m.from === u.id && m.kind === "text").length;
          if (sent >= 1) return { ok: false, reason: "awaiting_reply" };
        }
        return { ok: true };
      }
      case "support":
      case "group":
        return { ok: true };
      case "announcement":
        return { ok: false, reason: "read_only" };
      default:
        return { ok: false, reason: "unknown_kind" };
    }
  }

  /** A direct chat between one Staff person and one Client: the only direct chat that can be resolved into a ticket. */
  function isStaffClient(conv) {
    if (!conv || conv.kind !== "direct") return false;
    const roles = conv.participants
      .map((p) => (user(p) || {}).role)
      .sort()
      .join("+");
    return roles === "client+staff";
  }
  /** A new message in a resolved Staff and Client chat opens it again (the same ticket number). */
  function reopenDirect(d, conv, u) {
    if (!isStaffClient(conv) || !conv.resolvedAt) return;
    conv.resolvedAt = null;
    conv.resolvedBy = null;
    audit(d, conv, u, "Status", "Resolved", "Open");
  }

  function clean(text) {
    const t = String(text ?? "")
      .replace(/\r\n/g, "\n")
      .trim();
    if (!t) return { ok: false, reason: "empty" };
    if (t.length > cfg.maxLen) return { ok: false, reason: "too_long", max: cfg.maxLen };
    return { ok: true, text: t };
  }

  /* --- resident support internals --- */

  const sys = (d, conv, text, extra = {}) => push(d, conv, "system", "system", text, extra);
  /** Quick replies that were not used can no longer be tapped once the chat moves on. */
  const retireChoices = (d, conv) =>
    msgsOf(d, conv.id).forEach((m) => {
      if (m.choices && !m.chosen) m.chosen = "x";
    });

  /**
   * Immutable audit card: what changed, from what to what, who did it (id and name) and when (ISO).
   * It sits in the thread but never becomes the list preview and never counts as unread.
   */
  function audit(d, conv, actor, field, from, to) {
    const at = now();
    const a = actor || { id: "system", name: "System" };
    const m = {
      id: nid(d, "m"),
      convId: conv.id,
      from: "system",
      kind: "system",
      text: `${field}: ${from} → ${to}`,
      at,
      readBy: {},
      audit: { field, from, to, actorId: a.id, actorName: a.name, at: new Date(at).toISOString() },
    };
    msgsOf(d, conv.id).push(m);
    conv.updatedAt = at;
    return m;
  }

  function closeResident(d, conv, by, reason, systemText) {
    const before = ticketStage(conv);
    conv.status = "closed";
    conv.waiting = false; // a closed ticket is never "waiting"
    conv.closedAt = now();
    conv.closedBy = by;
    conv.closeReason = reason;
    retireChoices(d, conv);
    sys(d, conv, systemText, { notify: reason !== "resident_ended" });
    // A chat that never reached a team was only ever with the assistant: it is not a ticket and has no status card.
    if (conv.queuedAt && user(by) && by !== "bot") audit(d, conv, user(by), "Status", STAGE_LABEL[before], STAGE_LABEL[ticketStage(conv)]);
  }

  function queue(d, conv) {
    if (!conv.ticketNo) conv.ticketNo = nextTicket(d); // from here on it is a ticket and lives in the Ticket box
    conv.status = "queued";
    conv.queuedAt = now();
    conv.summary = assistant.summarize(conv.bot, msgsOf(d, conv.id));
    if (!conv.topic && conv.summary.topic === "Promotions") conv.topic = "Promotions";
    retireChoices(d, conv);
    sys(d, conv, `Your request was sent to ${teamName(conv)}. You will be notified when someone replies.`);
  }

  /** A resident may open this many requests with the platform's support in a day: the line is for problems with the app, not a place to write to. */
  const SUPPORT_PER_DAY = 3;
  const supportRequestsToday = (d, residentId) =>
    Object.values(d.convs).filter((c) => c.kind === "resident_support" && c.residentId === residentId && c.route === "platform" && c.queuedAt && now() - c.queuedAt < 24 * 3600000).length;

  function runAssistant(d, conv, reply) {
    for (const m of reply.messages || []) push(d, conv, "bot", "bot", m.text, m.choices ? { choices: m.choices } : {});
    if (reply.patch) Object.assign(conv.bot, reply.patch);
    if (reply.outcome === "handoff") {
      // Danger said in words ("smoke in the garage", "a truck blocks the fire exit") is an EMERGENCY for the team, the same as the button: a chip, the banner, first in the queue,
      // and it never leaves the property team nor is closed by a Leasing Agent.
      if (reply.patch && reply.patch.urgent && !emergencyOpen(conv)) {
        const said = [...msgsOf(d, conv.id)].reverse().find((x) => x.from === conv.residentId && x.kind === "text");
        if (said) said.emergency = true;
        conv.emergency = { at: now(), by: conv.residentId, msgId: said ? said.id : null, ackBy: null, ackAt: null, smsAt: null };
        audit(d, conv, user(conv.residentId), "Priority", "Normal", "Emergency");
      }
      conv.route = reply.route === "platform" ? "platform" : "property";
      if (conv.route === "platform" && supportRequestsToday(d, conv.residentId) >= SUPPORT_PER_DAY) {
        // Not queued: the answer says why and points back to what is open or to the property team.
        conv.route = "property";
        push(
          d,
          conv,
          "bot",
          "bot",
          `You already have ${SUPPORT_PER_DAY} requests with EasySpotOps Support today. They will reply to those first. For anything about the building, I can pass it to the property team.`,
          { choices: [assistant.ROUTE_PROPERTY, assistant.MENU_CHOICE] },
        );
        return;
      }
    }
    if (reply.answered) conv.bot.answered = [...new Set([...(conv.bot.answered || []), reply.answered])];
    if (reply.patch?.topic) conv.topic = assistant.TOPICS.find((t) => t.id === reply.patch.topic)?.label || conv.topic;
    if (reply.outcome === "resolved") closeResident(d, conv, "bot", "resolved_by_assistant", "Chat closed. Start a new one any time.");
    if (reply.outcome === "handoff") queue(d, conv);
  }

  /** Staff takes a waiting resident chat: it becomes theirs and the resident is told someone joined. */
  function takeChat(d, conv, u) {
    const before = ticketStage(conv);
    conv.status = "active";
    conv.assigneeId = u.id;
    conv.claimedAt = now();
    sys(d, conv, `A member of ${teamName(conv)} joined the chat.`, { notify: true });
    audit(d, conv, u, "Status", STAGE_LABEL[before], STAGE_LABEL[ticketStage(conv)]);
  }

  const emergencyOpen = (conv) => !!(conv.emergency && !conv.emergency.ackAt);

  /** A Support thread moves with each post: Admin picks it up, the requester reopens it. */
  function supportEffects(conv, u) {
    if (conv.kind !== "support") return;
    if (u.role === "admin") {
      if (!conv.assigneeId) conv.assigneeId = u.id;
      if (conv.status === "open") conv.status = "pending";
    } else if (conv.status !== "open") {
      conv.status = "open";
      conv.resolvedAt = null;
    }
  }

  function newBotSession(d, residentId) {
    const id = nid(d, "c");
    const conv = {
      id,
      kind: "resident_support",
      status: "bot",
      createdAt: now(),
      updatedAt: now(),
      last: null,
      residentId,
      assigneeId: null,
      topic: null,
      bot: assistant.initialBotState(),
      summary: null,
      queuedAt: null,
      closedAt: null,
      closedBy: null,
      closeReason: null,
      csat: null,
    };
    d.convs[id] = conv;
    d.msgs[id] = [];
    // "Assistant answers first" (the company's choice for its residents): off means the first question is where to send the message.
    const direct = typeof cfg.botFirst === "function" && cfg.botFirst() === false;
    for (const g of direct ? assistant.directGreeting() : assistant.greeting()) push(d, conv, "bot", "bot", g.text, g.choices ? { choices: g.choices } : {});
    return conv;
  }

  /* --- public actions --- */

  const api = {
    config: cfg,
    transportInfo: () => transport.info(),
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    user,
    canMessage,
    revision: () => (state ? state.rev : 0),

    /** Resident opens Messages. Staff are not involved: the assistant greets first. */
    ensureSession(userId) {
      const u = user(userId);
      if (!u || u.role !== "resident") return { ok: false, reason: "not_allowed" };
      api.tick();
      return act((d) => {
        const open = Object.values(d.convs).find((c) => c.kind === "resident_support" && c.residentId === userId && OPEN_RESIDENT.includes(c.status));
        if (open) return { ok: true, convId: open.id, created: false, noop: true };
        return { ok: true, convId: newBotSession(d, userId).id, created: true };
      });
    },

    /**
     * The resident asks about one of their promotion claims ("Ask about this claim"): no assistant, straight to the property team, with the claim in the first message.
     * Idempotent: a chat already with the team gets the claim added once (not a second ticket); the same claim is never added twice in a row.
     */
    askAboutClaim(userId, claim = {}) {
      const u = user(userId);
      if (!u || u.role !== "resident") return { ok: false, reason: "not_allowed" };
      const clean = (v, n) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, n);
      const title = clean(claim.title, 80) || "Promotion";
      const code = clean(claim.code, 40);
      const status = clean(claim.status, 30);
      const claimId = clean(claim.claimId, 80);
      const promoId = clean(claim.promoId, 60);
      const when = claim.at && Number.isFinite(Date.parse(claim.at)) ? new Date(claim.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
      const text = ["I have a question about my promotion claim.", `Promotion: ${title}`, code && `Code: ${code}`, when && `Claimed: ${when}`, status && `Status: ${status}`].filter(Boolean).join("\n");
      // the card: what the team needs to find the claim, shown in the chat to both sides
      const card = { type: "claim", claimId, promoId, title, code, status, at: when ? String(claim.at) : "" };
      api.tick();
      return act((d) => {
        let conv = Object.values(d.convs).find((c) => c.kind === "resident_support" && c.residentId === userId && OPEN_RESIDENT.includes(c.status));
        if (!conv) conv = newBotSession(d, userId);
        const seen = msgsOf(d, conv.id).slice(-30).some((m) => m.from === userId && m.kind === "text" && m.text === text);
        if (conv.status === "bot") {
          if (seen) return { ok: true, convId: conv.id, noop: true };
          push(d, conv, userId, "text", text, { card });
          conv.bot.topic = "promo";
          conv.bot.route = "property";
          conv.topic = "Promotions";
          queue(d, conv);
          return { ok: true, convId: conv.id };
        }
        if (seen) return { ok: true, convId: conv.id, noop: true };
        push(d, conv, userId, "text", text, { card });
        return { ok: true, convId: conv.id };
      });
    },

    /**
     * What Staff decided about the resident's promotion claim, said in the chat by the system so both sides read the same words (Override with its reason, Reject with its reason).
     * Only Staff or Admin, only in a resident's chat with the team; the resident is notified.
     */
    noteClaimDecision(convId, userId, text) {
      const u = user(userId);
      if (!u || !["staff", "admin"].includes(u.role)) return { ok: false, reason: "not_allowed" };
      const said = String(text ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 300);
      if (!said) return { ok: false, reason: "empty" };
      return act((d) => {
        const conv = d.convs[convId];
        if (!conv || conv.kind !== "resident_support") return { ok: false, reason: "not_allowed" };
        sys(d, conv, said, { notify: true });
        return { ok: true };
      });
    },

    /** Resident taps a quick reply offered by the assistant. */
    choose(convId, userId, choiceId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || conv.kind !== "resident_support" || conv.residentId !== userId || conv.status !== "bot") return { ok: false, reason: "not_allowed" };
        const offered = [...msgsOf(d, convId)].reverse().find((m) => m.choices && !m.chosen);
        const choice = offered?.choices.find((c) => c.id === choiceId);
        if (!choice) return { ok: false, reason: "invalid_choice" };
        offered.chosen = choiceId;
        push(d, conv, u.id, "text", choice.label, { viaChoice: choiceId });
        runAssistant(d, conv, assistant.onChoice(conv.bot, choiceId));
        return { ok: true };
      });
    },

    /** Send a message. `clientId` makes retries safe (same id is never stored twice). */
    send(convId, userId, text, { clientId, attachments, replyTo, emergency } = {}) {
      const atts = normalizeAttachments(attachments);
      if (!Array.isArray(atts)) return atts;
      const raw = String(text ?? "")
        .replace(/\r\n/g, "\n")
        .trim();
      if (!raw && !atts.length) return { ok: false, reason: "empty" };
      if (raw.length > cfg.maxLen) return { ok: false, reason: "too_long", max: cfg.maxLen };
      const c = { text: raw };
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv) return { ok: false, reason: "not_found" };
        const check = postCheck(d, conv, u, { emergency: !!emergency });
        if (!check.ok) return check;
        if (check.takes) takeChat(d, conv, u); // the reply and the take land together, so only one staff member can win
        if (clientId) {
          const dup = msgsOf(d, convId).find((m) => m.clientId === clientId && m.from === userId);
          if (dup) return { ok: true, messageId: dup.id, duplicate: true };
        }
        const extra = {};
        if (clientId) extra.clientId = clientId;
        if (atts.length) extra.attachments = atts;
        if (replyTo) {
          const target = msgsOf(d, convId).find((m) => m.id === replyTo);
          if (!target || target.deleted || target.kind === "system") return { ok: false, reason: "invalid_reply" };
          extra.replyTo = replyTo;
        }
        if (emergency) {
          // Only the people on the ground raise one: a resident in their own chat, or Staff/Admin in a chat they can post in.
          if (!["resident", "staff", "admin"].includes(u.role) || !["resident_support", "direct"].includes(conv.kind)) return { ok: false, reason: "not_allowed" };
          extra.emergency = true;
        }
        reopenDirect(d, conv, u);
        const m = push(d, conv, userId, "text", c.text, extra);
        if (emergency) {
          if (!emergencyOpen(conv)) {
            conv.emergency = { at: m.at, by: u.id, msgId: m.id, ackBy: null, ackAt: null, smsAt: null };
            audit(d, conv, u, "Priority", "Normal", "Emergency");
          }
          if (conv.kind === "resident_support" && conv.status === "bot") queue(d, conv); // no assistant for an emergency: straight to the team
        } else if (conv.kind === "resident_support" && u.role === "resident" && conv.status === "bot") {
          runAssistant(d, conv, assistant.onText(conv.bot, c.text));
        }
        if (conv.kind === "resident_support" && u.role === "resident" && conv.waiting) {
          conv.waiting = false;
          audit(d, conv, u, "Status", STAGE_LABEL.waiting_on_resident, STAGE_LABEL.in_progress);
        }
        if (conv.kind === "direct" && u.role === "resident") conv.residentReplied = true;
        // "Away reply" (Settings > Messages): while the staff person's status is Away, the resident who writes gets one short note (not on every message).
        if (u.role === "resident" && !emergency && ["resident_support", "direct"].includes(conv.kind) && conv.status !== "bot" && typeof cfg.awayReply === "function") {
          const note = cfg.awayReply(conv);
          if (note && (!conv.awayAt || now() - conv.awayAt > 30 * 60000)) {
            conv.awayAt = now();
            sys(d, conv, note, { notify: true });
          }
        }
        supportEffects(conv, u);
        return { ok: true, messageId: m.id };
      });
    },

    /** Send a copy of one of your visible messages into another conversation you can post in. Residents cannot forward. */
    forward(convId, userId, msgId, targetId) {
      return act((d) => {
        const src = d.convs[convId];
        const dst = d.convs[targetId];
        const u = user(userId);
        if (!src || !dst || !u || !canSee(src, u) || !canSee(dst, u)) return { ok: false, reason: "not_found" };
        if (u.role === "resident") return { ok: false, reason: "not_allowed" };
        if (convId === targetId) return { ok: false, reason: "same_conversation" };
        const m = msgsOf(d, convId).find((x) => x.id === msgId);
        if (!m || m.deleted || m.kind !== "text" || (!m.text && !(m.attachments && m.attachments.length))) return { ok: false, reason: "not_allowed" };
        const check = postCheck(d, dst, u);
        if (!check.ok) return check;
        if (check.takes) return { ok: false, reason: "not_claimed" }; // forwarding must not silently take someone's waiting chat
        const extra = { forwarded: true };
        if (m.attachments && m.attachments.length) extra.attachments = m.attachments.map((a) => ({ ...a, id: `a${Math.random().toString(36).slice(2, 9)}` }));
        const copy = push(d, dst, userId, "text", m.text, extra);
        supportEffects(dst, u);
        return { ok: true, messageId: copy.id, convId: targetId };
      });
    },

    /** Conversations this person could forward into right now. */
    forwardTargets(userId, exceptId) {
      const u = user(userId);
      if (!u || u.role === "resident") return [];
      return api.listFor(userId).filter((r) => {
        const c = postCheck(state, state.convs[r.id], u);
        return r.id !== exceptId && c.ok && !c.takes;
      });
    },

    /** Resident asks for a person (button). Moves the chat to the staff queue. */
    requestStaff(convId, userId) {
      return act((d) => {
        const conv = d.convs[convId];
        if (!conv || conv.kind !== "resident_support" || conv.residentId !== userId || conv.status !== "bot") return { ok: false, reason: "not_allowed" };
        queue(d, conv);
        return { ok: true };
      });
    },

    /** Staff takes a queued chat. Only one staff member can win. */
    claim(convId, staffId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(staffId);
        if (!conv || conv.kind !== "resident_support" || !u || u.role !== handlerOf(conv)) return { ok: false, reason: "not_allowed" };
        if (conv.status !== "queued") return { ok: false, reason: conv.status === "active" ? "already_taken" : "not_queued" };
        takeChat(d, conv, u);
        return { ok: true };
      });
    },

    /**
     * The team that has a resident's request passes it to the other team (it was sent to the wrong place). It goes back to the queue of the
     * other team with its summary, and the resident is told it was moved. An open emergency never leaves the property team.
     */
    reroute(convId, userId, route) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || conv.kind !== "resident_support" || !u || !["property", "platform"].includes(route)) return { ok: false, reason: "not_allowed" };
        if (u.role !== handlerOf(conv) || !canSee(conv, u) || !["queued", "active"].includes(conv.status)) return { ok: false, reason: "not_allowed" };
        if ((conv.route || "property") === route) return { ok: true, noop: true };
        if (route === "platform" && emergencyOpen(conv)) return { ok: false, reason: "emergency_open" };
        const from = conv.route === "platform" ? "EasySpotOps Support" : "Property team";
        conv.route = route;
        conv.assigneeId = null;
        conv.status = "queued";
        conv.queuedAt = now();
        conv.waiting = false;
        conv.summary = { ...(conv.summary || {}), route };
        audit(d, conv, u, "Route", from, route === "platform" ? "EasySpotOps Support" : "Property team");
        sys(d, conv, `Your request was moved to ${teamName(conv)}. They have the summary, so you do not need to repeat yourself.`, { notify: true });
        return { ok: true };
      });
    },

    /** Staff ends the chat as resolved. */
    resolve(convId, userId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || !u) return { ok: false, reason: "not_found" };
        if (conv.kind === "resident_support") {
          if (u.role !== handlerOf(conv) || conv.status !== "active" || conv.assigneeId !== u.id) return { ok: false, reason: "not_allowed" };
          if (!canDo(u, "resolve", conv)) return { ok: false, reason: "role" };
          closeResident(d, conv, u.id, "resolved_by_staff", `${conv.route === "platform" ? "EasySpotOps Support" : "Property team"} closed this ticket. It is saved in the Ticket box.`);
          return { ok: true };
        }
        if (conv.kind === "support") return api._setSupportStatus(d, conv, u, "resolved");
        // A Staff person helping a Client in a direct chat: when the help is done, the chat is saved as a ticket both can find later.
        if (isStaffClient(conv)) {
          if (u.role !== "staff" || !conv.participants.includes(u.id)) return { ok: false, reason: "not_allowed" };
          if (conv.resolvedAt) return { ok: true, noop: true };
          if (!msgsOf(d, conv.id).some((m) => m.kind === "text")) return { ok: false, reason: "empty" };
          if (!conv.ticketNo) conv.ticketNo = nextTicket(d); // the number is given once and stays when the chat is reopened
          audit(d, conv, u, "Status", "Open", "Resolved");
          conv.resolvedAt = now();
          conv.resolvedBy = u.id;
          sys(d, conv, `${u.name} marked this resolved. It is saved in the Ticket box. Reply to reopen it.`);
          return { ok: true };
        }
        return { ok: false, reason: "not_allowed" };
      });
    },

    /** Resident ends their own chat at any point (also leaves the queue). */
    endChat(convId, userId) {
      return act((d) => {
        const conv = d.convs[convId];
        if (!conv || conv.kind !== "resident_support" || conv.residentId !== userId || !OPEN_RESIDENT.includes(conv.status)) return { ok: false, reason: "not_allowed" };
        closeResident(d, conv, userId, "resident_ended", conv.queuedAt ? "You ended this chat. The ticket is saved in the Ticket box." : "You ended this chat.");
        return { ok: true };
      });
    },

    /** Staff or Admin confirms they have seen an emergency. Stops the 3-minute escalation and clears the banner. */
    acknowledgeEmergency(convId, userId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || !u || !["staff", "admin"].includes(u.role) || !canSee(conv, u)) return { ok: false, reason: "not_found" };
        if (!emergencyOpen(conv)) return { ok: true, noop: true };
        if (!canDo(u, "ack_emergency", conv)) return { ok: false, reason: "role" };
        conv.emergency.ackBy = u.id;
        conv.emergency.ackAt = now();
        audit(d, conv, u, "Emergency", "Unacknowledged", "Acknowledged");
        if (conv.kind === "resident_support") sys(d, conv, "The property team has seen your emergency report.", { notify: true });
        return { ok: true };
      });
    },

    /** Unacknowledged emergencies this person should see in the top banner (Staff and Admin only), oldest first. */
    emergencies(userId) {
      const u = user(userId);
      if (!u || !["staff", "admin"].includes(u.role)) return [];
      return Object.values(state.convs)
        .filter((c) => emergencyOpen(c) && canSee(c, u))
        .map((c) => ({ convId: c.id, title: api.rowFor(c, u).title, at: c.emergency.at, smsAt: c.emergency.smsAt }))
        .sort((a, b) => a.at - b.at);
    },

    /** Staff moves their own resident ticket between "In progress" and "Waiting on resident". */
    setTicketState(convId, userId, stage) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || conv.kind !== "resident_support" || !u) return { ok: false, reason: "not_found" };
        if (u.role !== handlerOf(conv) || conv.status !== "active" || conv.assigneeId !== u.id || !["in_progress", "waiting_on_resident"].includes(stage)) return { ok: false, reason: "not_allowed" };
        const before = ticketStage(conv);
        if (before === stage) return { ok: true, noop: true };
        conv.waiting = stage === "waiting_on_resident";
        audit(d, conv, u, "Status", STAGE_LABEL[before], STAGE_LABEL[stage]);
        return { ok: true };
      });
    },

    rate(convId, userId, up) {
      return act((d) => {
        const conv = d.convs[convId];
        if (!conv || conv.kind !== "resident_support" || conv.residentId !== userId || conv.status !== "closed" || !conv.assigneeId || conv.csat) return { ok: false, reason: "not_allowed" };
        conv.csat = up ? "up" : "down";
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
        if (!from || !to || from.id === to.id) return { ok: false, reason: "not_allowed" };
        if (from.role === "resident") return { ok: false, reason: "use_assistant" };
        if (!canMessage(from.role, to.role)) return { ok: false, reason: "not_allowed" };
        if (to.role === "admin" && from.role !== "admin") return api._startSupportIn(d, from, { subject: "Message to Support", text: c.text, priority: "normal" });
        let conv = Object.values(d.convs).find((x) => x.kind === "direct" && x.participants.includes(fromId) && x.participants.includes(toId));
        if (!conv) {
          const isOutreach = to.role === "resident";
          if (isOutreach) {
            // Protect the resident: cap unsolicited new threads per window, whoever sends them.
            const recent = Object.values(d.convs).filter((x) => x.kind === "direct" && x.outreach && x.participants.includes(toId) && !x.residentReplied && now() - x.createdAt < cfg.outreachWindowMs);
            if (recent.length >= cfg.outreachMax) return { ok: false, reason: "rate_limited", retryAt: Math.min(...recent.map((x) => x.createdAt)) + cfg.outreachWindowMs };
          }
          const id = nid(d, "c");
          conv = { id, kind: "direct", status: "open", createdAt: now(), updatedAt: now(), last: null, participants: [fromId, toId], startedBy: fromId, outreach: isOutreach, residentReplied: false };
          d.convs[id] = conv;
          d.msgs[id] = [];
        }
        const check = postCheck(d, conv, from);
        if (!check.ok) return check;
        reopenDirect(d, conv, from);
        push(d, conv, fromId, "text", c.text);
        return { ok: true, convId: conv.id };
      });
    },

    _startSupportIn(d, requester, { subject, text, priority, category }) {
      if (!["staff", "client"].includes(requester.role)) return { ok: false, reason: "not_allowed" };
      const id = nid(d, "c");
      // Every ticket gets the next number of its own (T-1081, T-1082, …); priority and category are checked against the allowed lists.
      const conv = {
        id,
        kind: "support",
        status: "open",
        ticketNo: nextTicket(d),
        createdAt: now(),
        updatedAt: now(),
        last: null,
        requesterId: requester.id,
        assigneeId: null,
        subject: preview(subject) || "Support request",
        priority: ["low", "normal", "high"].includes(priority) ? priority : "normal",
        category: TICKET_CATEGORIES.includes(category) ? category : "",
        resolvedAt: null,
      };
      d.convs[id] = conv;
      d.msgs[id] = [];
      push(d, conv, requester.id, "text", text);
      return { ok: true, convId: id };
    },

    /** Staff or client asks Admin for help. */
    startSupport(requesterId, { subject, text, priority, category } = {}) {
      const c = clean(text);
      if (!c.ok) return c;
      const s = clean(subject);
      if (!s.ok) return { ok: false, reason: "subject_required" };
      if (s.text.length > 120) return { ok: false, reason: "subject_too_long", max: 120 };
      return act((d) => api._startSupportIn(d, user(requesterId), { subject: s.text, text: c.text, priority, category }));
    },

    _setSupportStatus(d, conv, u, status) {
      if (u.role !== "admin" || conv.kind !== "support" || !["open", "pending", "resolved"].includes(status)) return { ok: false, reason: "not_allowed" };
      if (conv.status === status) return { ok: true, noop: true };
      const was = conv.status;
      conv.status = status;
      audit(d, conv, u, "Status", was[0].toUpperCase() + was.slice(1), status[0].toUpperCase() + status.slice(1));
      if (!conv.assigneeId) conv.assigneeId = u.id;
      conv.resolvedAt = status === "resolved" ? now() : null;
      if (status === "resolved") sys(d, conv, "EasySpotOps Support marked this ticket resolved. It is saved in the Ticket box. Reply to reopen it.", { notify: true });
      return { ok: true };
    },

    setSupportStatus(convId, userId, status) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        return conv && u ? api._setSupportStatus(d, conv, u, status) : { ok: false, reason: "not_found" };
      });
    },

    assignSupport(convId, adminId, toId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(adminId);
        const to = toId ? user(toId) : null;
        if (!conv || conv.kind !== "support" || !u || u.role !== "admin" || (to && to.role !== "admin")) return { ok: false, reason: "not_allowed" };
        if ((conv.assigneeId || null) === (to ? to.id : null)) return { ok: true, noop: true };
        audit(d, conv, u, "Assignee", conv.assigneeId ? user(conv.assigneeId).name : "Unassigned", to ? to.name : "Unassigned");
        conv.assigneeId = to ? to.id : null;
        return { ok: true };
      });
    },

    setPriority(convId, adminId, priority) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(adminId);
        if (!conv || conv.kind !== "support" || !u || u.role !== "admin" || !["low", "normal", "high"].includes(priority)) return { ok: false, reason: "not_allowed" };
        if (conv.priority === priority) return { ok: true, noop: true };
        const cap = (s) => s[0].toUpperCase() + s.slice(1);
        audit(d, conv, u, "Priority", cap(conv.priority || "normal"), cap(priority));
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
      if (!n.ok) return { ok: false, reason: "name_required" };
      const first = String(text ?? "").trim();
      if (first.length > cfg.maxLen) return { ok: false, reason: "too_long", max: cfg.maxLen };
      return act((d) => {
        const creator = user(creatorId);
        if (!creator || !["staff", "admin"].includes(creator.role)) return { ok: false, reason: "not_allowed" };
        const ids = [...new Set([creatorId, ...memberIds])];
        const people = ids.map(user);
        if (people.some((p) => !p || !["staff", "client", "admin"].includes(p.role))) return { ok: false, reason: "not_allowed" };
        if (ids.length < 3) return { ok: false, reason: "group_too_small" };
        if (ids.length > 12) return { ok: false, reason: "group_too_large" };
        const id = nid(d, "c");
        const conv = { id, kind: "group", status: "open", createdAt: now(), updatedAt: now(), last: null, participants: ids, name: preview(n.text).slice(0, 60), createdBy: creatorId };
        d.convs[id] = conv;
        d.msgs[id] = [];
        sys(
          d,
          conv,
          `${creator.name} created the group with ${people
            .slice(1)
            .map((p) => p.name)
            .join(", ")}.`,
        );
        if (first) push(d, conv, creatorId, "text", first);
        return { ok: true, convId: id };
      });
    },

    addMember(convId, byId, userId) {
      return act((d) => {
        const conv = d.convs[convId];
        const by = user(byId);
        const who = user(userId);
        if (!conv || conv.kind !== "group" || !by || !conv.participants.includes(byId) || !["staff", "admin"].includes(by.role)) return { ok: false, reason: "not_allowed" };
        if (!who || !["staff", "client", "admin"].includes(who.role)) return { ok: false, reason: "not_allowed" };
        if (conv.participants.includes(userId)) return { ok: true, noop: true };
        if (conv.participants.length >= 12) return { ok: false, reason: "group_too_large" };
        conv.participants.push(userId);
        sys(d, conv, `${by.name} added ${who.name}.`);
        return { ok: true };
      });
    },

    leaveGroup(convId, userId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || conv.kind !== "group" || !u || !conv.participants.includes(userId)) return { ok: false, reason: "not_allowed" };
        if (conv.participants.length <= 2) return { ok: false, reason: "group_too_small" };
        sys(d, conv, `${u.name} left the group.`);
        conv.participants = conv.participants.filter((p) => p !== userId);
        return { ok: true };
      });
    },

    /** Admin announcement to everyone or to chosen roles. One-way: replies go to Support, not to the author. */
    broadcast(adminId, { title, text, audience = "everyone" } = {}) {
      const t = clean(title);
      const c = clean(text);
      if (!t.ok) return { ok: false, reason: "title_required" };
      if (!c.ok) return c;
      return act((d) => {
        const u = user(adminId);
        if (!u || u.role !== "admin") return { ok: false, reason: "not_allowed" };
        const roles = audience === "everyone" ? "everyone" : [...new Set([].concat(audience))].filter((r) => ["resident", "staff", "client", "admin"].includes(r));
        if (roles !== "everyone" && !roles.length) return { ok: false, reason: "audience_required" };
        const id = nid(d, "c");
        const conv = { id, kind: "announcement", status: "open", createdAt: now(), updatedAt: now(), last: null, authorId: u.id, audience: roles, title: preview(t.text) };
        d.convs[id] = conv;
        d.msgs[id] = [];
        push(d, conv, u.id, "text", c.text);
        return { ok: true, convId: id };
      });
    },

    /** `receipt: false` ("Show when I have read a message" is off): it is read for this person, but the sender is not told. */
    markRead(convId, userId, { receipt = true } = {}) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: "not_found" };
        let changed = false;
        const at = now();
        for (const m of msgsOf(d, convId)) {
          if (m.from !== userId && !m.readBy[userId]) {
            m.readBy[userId] = at;
            if (!receipt) m.quiet = { ...(m.quiet || {}), [userId]: true };
            changed = true;
          }
        }
        return changed ? { ok: true } : { ok: true, noop: true };
      });
    },

    /** "Mark as unread": the newest message that counts as news for this person is unread again (so the badge and the bell show it). */
    markUnread(convId, userId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: "not_found" };
        const last = [...msgsOf(d, convId)].reverse().find((m) => m.from !== userId && notifies(m, u.role));
        if (!last || !last.readBy[userId]) return { ok: true, noop: true };
        delete last.readBy[userId];
        return { ok: true };
      });
    },

    /** One reaction per person per message: a new emoji replaces the old one, the same emoji removes it. */
    react(convId, userId, msgId, emoji) {
      if (!isEmoji(emoji)) return { ok: false, reason: "invalid_emoji" };
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: "not_found" };
        const m = msgsOf(d, convId).find((x) => x.id === msgId);
        if (!m || m.deleted || m.kind !== "text") return { ok: false, reason: "not_found" };
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
        if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: "not_found" };
        const m = msgsOf(d, convId).find((x) => x.id === msgId);
        if (!m || m.from !== userId || m.kind !== "text" || m.deleted) return { ok: false, reason: "not_allowed" };
        if (now() - m.at > cfg.unsendMs) return { ok: false, reason: "too_late" };
        if (conv.kind === "resident_support" && conv.status === "closed") return { ok: false, reason: "closed" };
        m.deleted = true;
        m.text = "";
        m.attachments = [];
        m.reactions = {};
        delete m.editedAt;
        delete m.forwarded;
        delete m.replyTo;
        const list = msgsOf(d, convId);
        if (list[list.length - 1] === m && conv.last) conv.last.text = "Message removed";
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
        if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: "not_found" };
        const list = msgsOf(d, convId);
        const m = list.find((x) => x.id === msgId);
        if (!m || m.from !== userId || m.kind !== "text" || m.deleted || m.viaChoice) return { ok: false, reason: "not_allowed" };
        if (now() - m.at > cfg.editMs) return { ok: false, reason: "too_late" };
        if (conv.kind === "resident_support" && conv.status === "closed") return { ok: false, reason: "closed" };
        if (m.text === c.text) return { ok: true, noop: true };
        m.text = c.text;
        m.editedAt = now();
        if (list[list.length - 1] === m && conv.last) conv.last.text = preview(c.text);
        return { ok: true };
      });
    },

    /** "Delete for me": hide one message from your own view, any time. Other people still see it. */
    hideMessage(convId, userId, msgId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: "not_found" };
        const m = msgsOf(d, convId).find((x) => x.id === msgId);
        if (!m || m.kind === "system") return { ok: false, reason: "not_allowed" };
        const p = (d.prefs[userId] = d.prefs[userId] || {});
        const hidden = new Set(p.hidden || []);
        if (hidden.has(msgId)) return { ok: true, noop: true };
        hidden.add(msgId);
        p.hidden = [...hidden];
        return { ok: true };
      });
    },

    /** Undo "Delete for me". */
    unhideMessage(convId, userId, msgId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: "not_found" };
        const p = d.prefs[userId];
        if (!p || !(p.hidden || []).includes(msgId)) return { ok: true, noop: true };
        p.hidden = p.hidden.filter((x) => x !== msgId);
        return { ok: true };
      });
    },

    /**
     * Hide a whole conversation from your own lists. Nothing is deleted and other people still see it.
     * It lives under the Hidden tab until you restore it, and it comes back by itself when something new happens in it.
     * An open emergency cannot be hidden. Saved tickets stay in the Ticket box either way.
     */
    hideConversation(convId, userId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: "not_found" };
        if (emergencyOpen(conv)) return { ok: false, reason: "emergency_open" };
        const p = (d.prefs[userId] = d.prefs[userId] || {});
        p.hiddenConvs = { ...(p.hiddenConvs || {}), [convId]: Math.max(now(), conv.updatedAt || 0) };
        return { ok: true };
      });
    },

    /** Put a hidden conversation back in your lists. */
    unhideConversation(convId, userId) {
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: "not_found" };
        const p = d.prefs[userId];
        if (!p || !p.hiddenConvs || !(convId in p.hiddenConvs)) return { ok: true, noop: true };
        const next = { ...p.hiddenConvs };
        delete next[convId];
        p.hiddenConvs = next;
        return { ok: true };
      });
    },

    /** Is this conversation hidden for this person right now? New activity (or an open emergency) brings it back. */
    isHiddenConv(conv, userId) {
      const at = (api.pref(userId).hiddenConvs || {})[conv.id];
      return !!at && (conv.updatedAt || 0) <= at && !emergencyOpen(conv);
    },

    /** Everything this person has put away, for the Hidden tab: whole conversations and single messages ("Delete for me"). */
    hiddenItems(userId) {
      const u = user(userId);
      if (!u) return { conversations: [], messages: [] };
      const hiddenIds = new Set(api.pref(userId).hidden);
      const conversations = [];
      const messages = [];
      for (const c of Object.values(state.convs)) {
        if (!canSee(c, u)) continue;
        const row = api.rowFor(c, u);
        if (row.hidden) conversations.push(row);
        for (const m of state.msgs[c.id] || []) {
          if (!hiddenIds.has(m.id) || m.kind === "system") continue;
          messages.push({
            id: m.id,
            convId: c.id,
            convTitle: row.title,
            text: m.text || (m.attachments && m.attachments.length ? "Attachment" : ""),
            at: m.at,
            mine: m.from === userId,
            from: m.from === userId ? "You" : user(m.from) ? user(m.from).name : "Someone",
          });
        }
      }
      conversations.sort((a, b) => b.updatedAt - a.updatedAt);
      messages.sort((a, b) => b.at - a.at);
      return { conversations, messages };
    },

    /** Pin or mute a conversation for yourself only. Muted chats stay in the list but do not add to the badge. */
    toggleFlag(convId, userId, flag) {
      if (!["pinned", "muted", "important"].includes(flag)) return { ok: false, reason: "invalid_flag" };
      return act((d) => {
        const conv = d.convs[convId];
        const u = user(userId);
        if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: "not_found" };
        const p = (d.prefs[userId] = d.prefs[userId] || {});
        const list = new Set(p[flag] || []);
        const on = !list.has(convId);
        if (on) list.add(convId);
        else list.delete(convId);
        p[flag] = [...list];
        return { ok: true, on };
      });
    },

    /** Search message text across every conversation this person can see. Newest first. */
    search(userId, query, { limit = 30 } = {}) {
      const u = user(userId);
      const parsed = parseQuery(query);
      // Filters (unit:, status:, priority:, assignee:, tag:, after:, before:) pick conversations; words and "phrases" pick messages.
      if (!u || !parsed.text.length || parsed.text.join(" ").length < 2) return [];
      const q = parsed.text[0];
      const out = [];
      const hiddenIds = new Set(api.pref(userId).hidden);
      for (const conv of Object.values(state.convs)) {
        if (!canSee(conv, u)) continue;
        const row = api.rowFor(conv, u);
        if (row.hidden || !matchFilters(row, parsed)) continue; // hidden chats are searched under the Hidden tab only
        for (const m of state.msgs[conv.id] || []) {
          if (m.deleted || m.kind === "system" || !m.text || hiddenIds.has(m.id)) continue;
          if (conv.kind === "resident_support" && u.role === "staff" && m.kind === "bot") continue;
          if (!matchText(m.text, parsed)) continue;
          const i = m.text.toLowerCase().indexOf(q);
          if (i < 0) continue;
          const from = Math.max(0, i - 24);
          const snippet = `${from ? "…" : ""}${m.text.slice(from, i + q.length + 48).replace(/\s+/g, " ")}${i + q.length + 48 < m.text.length ? "…" : ""}`;
          out.push({
            convId: conv.id,
            msgId: m.id,
            at: m.at,
            title: row.title,
            snippet,
            match: [snippet.toLowerCase().indexOf(q), q.length],
            who: m.from === userId ? "You" : m.from === "bot" ? "Assistant" : (user(m.from) || {}).name,
          });
        }
      }
      return out.sort((a, b) => b.at - a.at).slice(0, limit);
    },

    /* --- live signals: online presence and typing (not stored in the conversation document) --- */

    touchPresence(userId) {
      if (transport.live)
        transport.live.update((d) => {
          (d.presence = d.presence || {})[userId] = now();
        });
    },
    goOffline(userId) {
      if (transport.live)
        transport.live.update((d) => {
          if (d.presence) delete d.presence[userId];
        });
    },
    presenceOf(userId) {
      const ts = transport.live ? (transport.live.read().presence || {})[userId] || 0 : 0;
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
      return Object.entries(c)
        .filter(([id, ts]) => id !== viewerId && now() - ts < cfg.typingMs)
        .map(([id]) => user(id))
        .filter(Boolean);
    },

    setPref(userId, patch) {
      return act((d) => {
        d.prefs[userId] = { ...(d.prefs[userId] || {}), ...patch };
        return { ok: true };
      });
    },
    pref: (userId) => ({ dnd: false, pinned: [], muted: [], important: [], hidden: [], hiddenConvs: {}, ...((state && state.prefs[userId]) || {}) }),

    /** Close idle chats. Called on a timer by the UI; safe to call any time. */
    tick() {
      const t = now();
      const stale = Object.values(state.convs).filter(
        (c) => c.kind === "resident_support" && ((c.status === "bot" && t - c.updatedAt > cfg.botIdleMs) || (c.status === "active" && t - c.updatedAt > cfg.activeIdleMs)),
      );
      const late = Object.values(state.convs).filter((c) => emergencyOpen(c) && !c.emergency.smsAt && t - c.emergency.at >= cfg.emergencySmsMs);
      if (!stale.length && !late.length) return { ok: true, closed: 0 };
      return act((d) => {
        let n = 0;
        // An emergency nobody acknowledged in time escalates: an SMS and a critical alert go to the on-call manager (simulated).
        for (const l of late) {
          const conv = d.convs[l.id];
          if (!conv || !emergencyOpen(conv) || conv.emergency.smsAt) continue;
          conv.emergency.smsAt = now();
          // "Text me if I have not acknowledged" (Settings > Messages): off means the critical alert still goes, but no SMS is sent.
          const sms = typeof cfg.smsOn === "function" ? cfg.smsOn() !== false : true;
          audit(d, conv, null, "Escalation", "None", sms ? "SMS and critical alert sent (simulated)" : "Critical alert sent (no SMS: switched off in Settings)");
        }
        for (const s of stale) {
          const conv = d.convs[s.id];
          if (!conv || !OPEN_RESIDENT.includes(conv.status)) continue;
          closeResident(
            d,
            conv,
            "system",
            "timeout",
            conv.status === "bot" ? "Chat closed after a period of inactivity." : "This chat was closed after a period of inactivity. The ticket is saved in the Ticket box. Start a new one any time.",
          );
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
        if (!canSee(c, u)) continue;
        if (api.isHiddenConv(c, userId)) continue; // hidden chats stay quiet
        // An open emergency gets through Do Not Disturb and mute.
        if (!emergencyOpen(c)) {
          if (muted.includes(c.id)) continue;
          if (dnd && (c.kind === "announcement" || (c.kind === "direct" && c.outreach && !c.residentReplied))) continue;
        }
        n += api.unreadCount(c.id, userId);
      }
      return n;
    },

    /**
     * What the Notifications bell lists for this person: one entry per conversation with something new (or that had in the last 3 days),
     * newest first. The same quiet rules as badgeCount (hidden, muted, Do Not Disturb; an open emergency always gets through), so the two never disagree.
     * { id, convId, title, detail, ts, unread, emergency } — `id` changes with each new message, so a new message is unread again.
     */
    alertsFor(userId, { since = now() - 3 * 86400000, limit = 12 } = {}) {
      const u = user(userId);
      if (!u) return [];
      const { dnd, muted } = api.pref(userId);
      const out = [];
      for (const c of Object.values(state.convs)) {
        if (!canSee(c, u) || api.isHiddenConv(c, userId)) continue;
        const em = emergencyOpen(c);
        if (!em && (muted.includes(c.id) || (dnd && (c.kind === "announcement" || (c.kind === "direct" && c.outreach && !c.residentReplied))))) continue;
        const incoming = (state.msgs[c.id] || []).filter((m) => m.from !== userId && notifies(m, u.role));
        const last = incoming[incoming.length - 1];
        if (!last) continue;
        const unread = incoming.filter((m) => !m.readBy[userId]).length;
        if (!unread && last.at < since) continue;
        const name = api.rowFor(c, u).title || "Conversation";
        const sender = (user(last.from) || {}).name || name;
        let title;
        if (last.kind === "system") title = name;
        else if (c.kind === "announcement") title = `Announcement · ${name}`;
        else title = unread > 1 ? `${sender} sent ${unread} messages` : `${sender} sent you a message`;
        const detail = last.deleted ? "This message was deleted." : last.text ? preview(last.text) : last.attachments && last.attachments.length ? "Sent an attachment." : "";
        out.push({ id: `msg-${c.id}-${last.id}`, convId: c.id, title: em ? `Emergency · ${title}` : title, detail, ts: last.at, unread, emergency: em });
      }
      return out.sort((a, b) => b.ts - a.ts).slice(0, limit);
    },

    /** Who can this user start a conversation with? */
    recipients(userId) {
      const u = user(userId);
      if (!u || u.role === "resident") return [];
      const out = [];
      for (const role of CAN_MESSAGE[u.role]) {
        if (role === "admin" && u.role !== "admin") {
          out.push({ type: "support", label: "EasySpotOps Support", hint: "Ask Support for help" });
        } else {
          for (const p of Object.values(byId))
            if (p.role === role && p.id !== u.id) out.push({ type: "direct", userId: p.id, label: p.name, hint: `${p.title}${p.org ? ` · ${p.org}` : ""}`, role: p.role });
        }
      }
      return out;
    },

    /** One list row: what the list shows plus the fields search and filters use (unit, stage, priority, assignee, topic). */
    rowFor(conv, viewer) {
      const r0 = api._rowBase(conv, viewer);
      // A hidden conversation shows only under the Hidden tab, so it carries just that tag.
      const hidden = api.isHiddenConv(conv, viewer.id);
      const r = hidden ? { ...r0, tags: ["hidden"], hidden: true } : { ...r0, hidden: false };
      const resId = conv.kind === "resident_support" ? conv.residentId : conv.kind === "direct" ? conv.participants.find((p) => user(p) && user(p).role === "resident") : null;
      const res = resId && user(resId);
      const asg = conv.assigneeId && user(conv.assigneeId);
      const em = emergencyOpen(conv);
      // Every ticket has its own number (T-1083), shown wherever it is: in the list, the header of the thread, the Ticket box. A chat with only the assistant is not a ticket and has none.
      const isTicket = conv.kind === "support" || (conv.kind === "resident_support" && !!conv.queuedAt) || (conv.kind === "direct" && !!conv.ticketNo);
      return {
        ...r,
        no: isTicket ? ticketNo(conv) : "",
        emergency: em,
        stage: ticketStage(conv),
        priority: em ? "emergency" : r.priority || conv.priority || "normal",
        unit: res && res.unit ? res.unit.number : "",
        building: res && res.unit ? res.unit.building : "",
        assigneeName: asg ? asg.name : "",
        subject: conv.subject || conv.title || conv.name || "",
        topic: r.topic || conv.topic || "",
      };
    },

    _rowBase(conv, viewer) {
      const unread = api.unreadCount(conv.id, viewer.id);
      const { pinned, muted, important } = api.pref(viewer.id);
      const base = {
        id: conv.id,
        kind: conv.kind,
        status: conv.status,
        updatedAt: conv.updatedAt,
        last: conv.last,
        unread,
        tags: [],
        pinned: pinned.includes(conv.id),
        muted: muted.includes(conv.id),
        important: important.includes(conv.id),
      };
      if (conv.kind === "resident_support") {
        const res = user(conv.residentId);
        const staff = conv.assigneeId ? user(conv.assigneeId) : null;
        if (viewer.role === "resident") {
          // A resident is never told WHICH member of the staff answers: it is always the "Property team" (staff are told apart inside, not outside).
          const platform = conv.route === "platform";
          const team = platform ? "EasySpotOps Support" : "Property team";
          // The name is the one the resident talked to: the assistant until a team was chosen (also after "End chat" or a timeout that came first), the team after.
          const reached = !!conv.queuedAt;
          const title = reached ? team : "EasySpotOps Assistant";
          const subtitle = {
            bot: conv.topic || "Ask a question",
            queued: `Waiting for ${platform ? "EasySpotOps Support" : "the property team"}`,
            active: team,
            closed: reached ? "Closed" : conv.closedBy === "bot" ? "Answered by the assistant" : conv.topic ? `${conv.topic} · Ended` : "Ended",
          }[conv.status];
          return {
            ...base,
            title,
            subtitle,
            avatar: reached ? { role: platform ? "admin" : "staff", name: team } : { role: "bot", name: "Assistant" },
            tags: [conv.status === "closed" ? "history" : "current"],
            waitingSince: conv.queuedAt,
            route: conv.route || null,
          };
        }
        // The team sees where the request came from and was sent to, so it is easy to tell a building matter from a platform one.
        const where = conv.route === "platform" ? "Platform support" : "Property";
        return {
          ...base,
          title: res.name,
          subtitle: `${where} · ${res.title} · ${conv.topic || "General question"}`,
          avatar: { role: "resident", name: res.name },
          tags: [
            conv.status === "queued" ? "queue" : "mine",
            ...(conv.status === "closed" ? ["closed", ...(viewer.role === "admin" ? ["resolved"] : [])] : []),
            conv.route === "platform" ? "platform" : "property",
          ],
          waitingSince: conv.queuedAt,
          topic: conv.topic,
          route: conv.route || "property",
        };
      }
      if (conv.kind === "direct") {
        const other = user(conv.participants.find((p) => p !== viewer.id));
        const tags =
          viewer.role === "staff"
            ? [other.role === "client" ? "clients" : other.role === "resident" ? "residents" : "other"]
            : viewer.role === "resident"
              ? ["current"]
              : viewer.role === "client"
                ? ["staff"]
                : ["direct"];
        // A resident sees the staff as one "Property team", never a person's name or job title.
        if (viewer.role === "resident" && other.role === "staff") return { ...base, title: "Property team", subtitle: "Property team", avatar: { role: "staff", name: "Property team" }, tags };
        return { ...base, title: other.name, subtitle: other.title, avatar: { role: other.role, name: other.name }, tags };
      }
      if (conv.kind === "support") {
        const req = user(conv.requesterId);
        const asg = conv.assigneeId ? user(conv.assigneeId) : null;
        if (viewer.role === "admin") {
          const tags = [];
          if (conv.status !== "resolved" && !conv.assigneeId) tags.push("queue");
          if (conv.status !== "resolved" && conv.assigneeId === viewer.id) tags.push("mine");
          if (conv.status === "resolved") tags.push("resolved");
          return {
            ...base,
            title: req.name,
            subtitle: conv.subject,
            avatar: { role: req.role, name: req.name },
            tags,
            priority: conv.priority,
            assignee: asg && asg.name,
            waitingSince: conv.status === "open" ? conv.updatedAt : null,
          };
        }
        return { ...base, title: "EasySpotOps Support", subtitle: conv.subject, avatar: { role: "admin", name: "Support" }, tags: ["support"], priority: conv.priority, assignee: asg && asg.name };
      }
      if (conv.kind === "group") {
        const names = conv.participants.map((p) => (p === viewer.id ? "You" : user(p).name.split(" ")[0]));
        return {
          ...base,
          title: conv.name,
          subtitle: `${conv.participants.length} people · ${names.join(", ")}`,
          avatar: { role: "group", name: conv.name },
          tags: [viewer.role === "staff" ? "groups" : viewer.role === "client" ? "groups" : "direct"],
          members: conv.participants.map((p) => ({ id: p, name: user(p).name, role: user(p).role, title: user(p).title })),
        };
      }
      return { ...base, title: conv.title, subtitle: `Announcement from ${user(conv.authorId).name}`, avatar: { role: "admin", name: "Support" }, tags: ["announcements"] };
    },

    listFor(userId) {
      const u = user(userId);
      if (!u) return [];
      return Object.values(state.convs)
        .filter((c) => canSee(c, u))
        .map((c) => api.rowFor(c, u))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Number(b.emergency) - Number(a.emergency) || b.updatedAt - a.updatedAt);
    },

    /**
     * What the right-hand details panel shows next to a conversation (Staff and Admin only).
     * A conversation with a resident gives the resident's unit, lease and entry notes plus their recent tickets;
     * any other conversation gives the people in it. Demo data lives in personas.js; a real app reads its property system.
     */
    contextFor(convId, userId) {
      const conv = state.convs[convId];
      const u = user(userId);
      if (!conv || !u || !["staff", "admin"].includes(u.role) || !canSee(conv, u)) return null;
      const resId = conv.kind === "resident_support" ? conv.residentId : conv.kind === "direct" ? conv.participants.find((p) => user(p) && user(p).role === "resident") : null;
      const res = resId && user(resId);
      if (res && res.unit) {
        const end = Date.parse(`${res.unit.leaseEnd}T00:00:00Z`);
        const tickets = Object.values(state.convs)
          .filter((c) => c.kind === "resident_support" && c.residentId === resId && c.id !== conv.id && (u.role === "staff" || canSee(c, u)))
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 5)
          .map((c) => ({ id: c.id, topic: c.topic || "General question", stage: ticketStage(c), at: c.updatedAt, assignee: c.assigneeId ? user(c.assigneeId).name : "", open: canSee(c, u) }));
        return { kind: "resident", person: { id: res.id, name: res.name, title: res.title, org: res.org }, unit: { ...res.unit, daysLeft: Math.ceil((end - now()) / 86400000) }, tickets };
      }
      const ids = conv.participants || (conv.kind === "support" ? [conv.requesterId, conv.assigneeId].filter(Boolean) : []);
      const people = ids
        .map(user)
        .filter(Boolean)
        .map((p) => ({ id: p.id, name: p.name, role: p.role, title: p.title, org: p.org }));
      return people.length ? { kind: "people", people } : null;
    },

    /* --- Ticket box: every conversation that became a ticket, kept after it closes --- */

    /** Who can open the saved record of a ticket (read-only): residents their own, Staff every resident ticket, Admin every support thread, Client and Staff their own support threads. */
    _ticketAccess(conv, u) {
      if (conv.kind === "resident_support") {
        if (!conv.queuedAt) return false; // answered by the assistant: never became a ticket
        return u.role === handlerOf(conv) || (u.role === "resident" && conv.residentId === u.id);
      }
      if (conv.kind === "support") return u.role === "admin" || conv.requesterId === u.id;
      // A Staff and Client chat that was resolved at least once: the two people in it, nobody else.
      if (conv.kind === "direct") return !!conv.ticketNo && isStaffClient(conv) && conv.participants.includes(u.id);
      return false;
    },

    _ticketRow(conv, viewer) {
      const asg = conv.assigneeId ? user(conv.assigneeId) : null;
      const msgs = state.msgs[conv.id] || [];
      const base = {
        id: conv.id,
        no: ticketNo(conv),
        updatedAt: conv.updatedAt,
        messages: msgs.filter((m) => m.kind === "text" || m.kind === "bot").length,
        assignee: asg ? maskStaff(asg, viewer, conv).name : "",
        assigneeName: asg ? maskStaff(asg, viewer, conv).name : "",
        emergency: !!conv.emergency,
        canOpenLive: canSee(conv, viewer),
        route: conv.kind === "support" ? "platform" : conv.route || "property",
      };
      if (conv.kind === "resident_support") {
        const res = user(conv.residentId);
        const stage = ticketStage(conv);
        return {
          ...base,
          kind: "resident",
          subject: conv.topic || "General question",
          topic: conv.topic || "",
          requester: { id: res.id, name: res.name, role: "resident", title: res.title },
          unit: res.unit ? res.unit.number : "",
          building: res.unit ? res.unit.building : "",
          stage,
          status: conv.status,
          stageLabel: STAGE_LABEL[stage],
          isOpen: conv.status !== "closed",
          openedAt: conv.queuedAt || conv.createdAt,
          closedAt: conv.closedAt || null,
          csat: conv.csat || null,
          priority: conv.emergency ? "emergency" : "normal",
        };
      }
      if (conv.kind === "direct") {
        // The Client is the one who was helped; the Staff person is the owner. The subject is how the chat began.
        const cl = user(conv.participants.find((p) => (user(p) || {}).role === "client"));
        const sf = user(conv.participants.find((p) => (user(p) || {}).role === "staff"));
        const first = msgs.find((m) => m.kind === "text" && !m.deleted && m.text);
        const open = !conv.resolvedAt;
        return {
          ...base,
          assignee: sf.name,
          assigneeName: sf.name,
          kind: "direct",
          category: "",
          subject: first ? preview(first.text).slice(0, 80) : `Conversation with ${cl.name}`,
          topic: "",
          requester: { id: cl.id, name: cl.name, role: "client", title: cl.title },
          unit: "",
          building: "",
          stage: open ? "open" : "resolved",
          status: open ? "open" : "resolved",
          stageLabel: open ? "Open" : "Resolved",
          isOpen: open,
          openedAt: conv.createdAt,
          closedAt: conv.resolvedAt || null,
          csat: null,
          priority: "normal",
        };
      }
      const req = user(conv.requesterId);
      const label = { open: "Open", pending: "Pending", resolved: "Resolved" }[conv.status];
      return {
        ...base,
        kind: "support",
        category: conv.category || "",
        subject: conv.subject,
        topic: conv.subject,
        requester: { id: req.id, name: req.name, role: req.role, title: req.title },
        unit: "",
        building: "",
        stage: conv.status,
        status: conv.status,
        stageLabel: label,
        isOpen: conv.status !== "resolved",
        openedAt: conv.createdAt,
        closedAt: conv.resolvedAt || null,
        csat: null,
        priority: conv.priority || "normal",
      };
    },

    /** Everything this person can find in the box, newest activity first. */
    ticketBox(userId, query = "") {
      const u = user(userId);
      if (!u) return [];
      const parsed = parseQuery(query);
      return Object.values(state.convs)
        .filter((c) => api._ticketAccess(c, u))
        .map((c) => api._ticketRow(c, u))
        .filter((r) => matchFilters(r, parsed))
        .filter(
          (r) => !parsed.text.length || matchText([r.no, r.subject, r.requester.name, r.unit, r.assignee, ...(state.msgs[r.id] || []).filter((m) => !m.deleted).map((m) => m.text)].join(" "), parsed),
        )
        .sort((a, b) => b.updatedAt - a.updatedAt);
    },

    ticketCounts(userId) {
      const rows = api.ticketBox(userId);
      const open = rows.filter((r) => r.isOpen).length;
      return { open, closed: rows.length - open, total: rows.length };
    },

    /** The saved record: ticket details and the whole conversation, audit cards included. Read-only. */
    ticketRecord(userId, convId) {
      const conv = state.convs[convId];
      const u = user(userId);
      if (!conv || !u || !api._ticketAccess(conv, u)) return { ok: false, reason: "not_found" };
      const hiddenIds = new Set(api.pref(userId).hidden);
      const entries = (state.msgs[convId] || [])
        .filter((m) => !hiddenIds.has(m.id) && !(u.role === "resident" && m.audit && m.audit.field === "Escalation"))
        .map((m) => ({
          // A resident reads the team, never a person's name: the same masking as in the thread (text, status cards, authors).
          id: m.id,
          at: m.at,
          kind: m.kind,
          text: m.deleted ? "" : m.kind === "system" ? maskText(m.text || "", u, conv) : m.text || "",
          deleted: !!m.deleted,
          audit: m.audit ? (u.role === "resident" ? { ...m.audit, actorName: maskText(m.audit.actorName, u, conv) } : m.audit) : null,
          emergency: !!m.emergency,
          forwarded: !!m.forwarded,
          editedAt: m.editedAt || null,
          attachments: m.deleted ? [] : (m.attachments || []).map((a) => ({ id: a.id, kind: a.kind, name: a.name, mime: a.mime, size: a.size, data: a.data })),
          author:
            m.from === "bot"
              ? { id: "bot", name: "EasySpotOps Assistant", role: "bot" }
              : m.from === "system"
                ? null
                : user(m.from)
                  ? (() => {
                      const p = maskStaff(user(m.from), u, conv);
                      return { id: m.from, name: p.name, role: p.role, title: p.title };
                    })()
                  : null,
        }));
      return { ok: true, ticket: api._ticketRow(conv, u), entries };
    },

    /** People you could put in a group: Staff, Client and Admin people other than you. */
    groupCandidates(userId) {
      const u = user(userId);
      if (!u || !["staff", "admin"].includes(u.role)) return [];
      return Object.values(byId).filter((p) => ["staff", "client", "admin"].includes(p.role) && p.id !== userId);
    },

    /** Everything the thread view needs for one viewer. */
    get(convId, userId) {
      const conv = state.convs[convId];
      const u = user(userId);
      if (!conv || !u || !canSee(conv, u)) return { ok: false, reason: "not_found" };
      const all = state.msgs[convId] || [];
      const byMsg = Object.fromEntries(all.map((x) => [x.id, x]));
      const quoted = (m) => {
        const q = m.replyTo && byMsg[m.replyTo];
        if (!q) return null;
        const who = q.from === "bot" ? "EasySpotOps Assistant" : (maskStaff(user(q.from), u, conv) || {}).name || "Someone";
        return {
          id: q.id,
          who: q.from === userId ? "You" : who,
          text: q.deleted ? "Message removed" : q.text || (q.attachments && q.attachments.length ? (q.attachments[0].kind === "image" ? "Photo" : q.attachments[0].name) : ""),
        };
      };
      const hiddenIds = new Set(api.pref(userId).hidden);
      // (the internal escalation card, "SMS and critical alert sent", is the team's record, not the resident's)
      const messages = all
        .filter((m) => !hiddenIds.has(m.id) && !(u.role === "resident" && m.audit && m.audit.field === "Escalation"))
        .map((m) => ({
          ...m,
          ...(m.kind === "system" ? { text: maskText(m.text, u, conv), ...(m.audit && u.role === "resident" ? { audit: { ...m.audit, actorName: maskText(m.audit.actorName, u, conv) } } : {}) } : {}),
          replyPreview: quoted(m),
          mine: m.from === userId,
          delivery: m.from === userId ? deliveryOf(m, conv) : null,
          seenBy: m.from === userId && conv.kind === "group" ? conv.participants.filter((p) => p !== m.from && m.readBy[p]).map((p) => user(p).name) : null,
          author: m.from === "bot" ? { id: "bot", name: "EasySpotOps Assistant", role: "bot" } : m.from === "system" ? null : maskStaff(user(m.from), u, conv),
        }));
      const post = postCheck(state, conv, u);
      const actions = [];
      if (conv.kind === "resident_support") {
        if (u.role === handlerOf(conv) && conv.status === "queued") actions.push("claim");
        if (u.role === handlerOf(conv) && conv.status === "active" && conv.assigneeId === u.id) actions.push(conv.waiting ? "resume" : "wait", ...(canDo(u, "resolve", conv) ? ["resolve"] : []));
        // Sent to the wrong place: the team that has it can pass it on, with the same summary, so the resident does not start again.
        if (u.role === handlerOf(conv) && ["queued", "active"].includes(conv.status) && canSee(conv, u)) actions.push(conv.route === "platform" ? "move:property" : "move:platform");
        if (u.role === "resident" && OPEN_RESIDENT.includes(conv.status)) actions.push("end");
        if (u.role === "resident" && conv.status === "bot") actions.push("request_staff");
        if (u.role === "resident" && conv.status === "closed" && conv.assigneeId && !conv.csat) actions.push("rate");
      }
      if (conv.kind === "support" && u.role === "admin") {
        for (const s of ["open", "pending", "resolved"]) if (conv.status !== s) actions.push(`status:${s}`);
        if (conv.assigneeId !== u.id) actions.push("assign_me");
        // The plain buttons of a support thread: take it, close it (it is then saved in the Ticket box), or open it again.
        if (conv.status !== "resolved" && conv.assigneeId !== u.id) actions.push("take");
        if (conv.status !== "resolved") actions.push("resolve");
        else actions.push("reopen");
      }
      // Staff helping a Client: "Resolve" saves the chat as a ticket (while there is something to save and it is not resolved already).
      if (isStaffClient(conv) && u.role === "staff" && !conv.resolvedAt && all.some((m) => m.kind === "text")) actions.push("resolve");
      if (emergencyOpen(conv) && ["staff", "admin"].includes(u.role) && canDo(u, "ack_emergency", conv)) actions.push("ack_emergency");
      // Broadcast reach for the people who sent or manage it: how many of the audience have opened it.
      let ack = null;
      if (conv.kind === "announcement" && (u.id === conv.authorId || u.role === "admin")) {
        const audience = Object.values(byId).filter((p) => p.role !== "bot" && p.id !== conv.authorId && audienceIncludes(conv, p.role));
        const first = all.find((m) => m.kind === "text");
        const read = first ? audience.filter((p) => first.readBy[p.id]).length : 0;
        ack = {
          read,
          total: audience.length,
          pct: audience.length ? Math.round((read / audience.length) * 100) : 0,
          unread: audience.filter((p) => !(first && first.readBy[p.id])).map((p) => p.name),
        };
      }
      return {
        ok: true,
        conv: { ...conv },
        row: api.rowFor(conv, u),
        messages,
        canPost: post,
        actions,
        viewer: u,
        stage: ticketStage(conv),
        ack,
        emergency: emergencyOpen(conv) ? { ...conv.emergency } : null,
      };
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
