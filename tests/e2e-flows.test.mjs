// End-to-end flows through the real store, pair by pair: who talks to whom, and whether finished support work stays as ticket history.

import assert from "node:assert/strict";
import test from "node:test";
import { createStore } from "../src/features/messaging/store.js";
import { createMemoryBus } from "../src/features/messaging/transport.js";
import { exitTarget } from "../src/shared/js/exit-target.js";

const T0 = Date.UTC(2026, 10, 13, 15, 0, 0);
function setup() {
  const clock = { t: T0 };
  const bus = createMemoryBus();
  const store = createStore({ transport: bus.connect(), now: () => clock.t });
  // `other` is the same store here: what one person writes is read by the next in the same call. (Two tabs staying in step is covered in
  // messaging.test.mjs, where the tests wait for the tabs to hear each other.)
  return { clock, store, other: store };
}
/** A resident who starts from nothing: the sample data may hold an open chat of theirs, which is ended first. */
function freshSession(store, residentId) {
  const first = store.ensureSession(residentId);
  if (first.created) return first;
  store.endChat(first.convId, residentId);
  return store.ensureSession(residentId);
}
const texts = (store, convId, viewer) =>
  store
    .get(convId, viewer)
    .messages.filter((m) => m.kind === "text")
    .map((m) => m.text);

test("Resident and Staff: assistant first, then a person, both directions, then a closed ticket both can read", () => {
  const { store, other, clock } = setup();
  const s = freshSession(store, "res-3");
  assert.ok(s.ok && s.created);
  const id = s.convId;
  // Staff see nothing while the assistant is answering
  assert.ok(!other.ticketBox("stf-1").some((t) => t.id === id), "not a ticket yet");
  assert.ok(store.send(id, "res-3", "My hangtag was stolen.").ok);
  assert.ok(store.requestStaff(id, "res-3").ok);
  // now it is a ticket in the Staff queue, in the other "tab" too
  const queued = other.ticketBox("stf-1").find((t) => t.id === id);
  assert.ok(queued, "Staff see the ticket");
  assert.equal(queued.stage, "open");
  assert.equal(other.send(id, "stf-2", "I can help.").ok, true, "the first Staff reply takes the chat");
  assert.equal(store.claim(id, "stf-1").reason, "already_taken", "only one Staff person wins");
  assert.equal(other.ticketBox("stf-2").find((t) => t.id === id).stage, "in_progress");
  clock.t += 60000;
  assert.ok(store.send(id, "res-3", "Thank you. Unit 08-033.").ok);
  assert.ok(texts(other, id, "stf-2").includes("Thank you. Unit 08-033."), "the resident reply reaches Staff");
  assert.ok(texts(store, id, "res-3").includes("I can help."), "the Staff reply reaches the resident");
  // a Client or an Admin can never read a resident chat
  assert.equal(store.get(id, "cli-1").ok, false);
  assert.equal(store.get(id, "adm-1").ok, false);
  // resolve: closed, and kept as history for both
  clock.t += 60000;
  assert.ok(other.resolve(id, "stf-2").ok);
  for (const who of ["res-3", "stf-2", "stf-1"]) {
    const row = store.ticketBox(who).find((t) => t.id === id);
    assert.ok(row, `${who} still finds the ticket`);
    assert.equal(row.isOpen, false);
    assert.equal(row.stage, "resolved");
    const rec = store.ticketRecord(who, id);
    assert.ok(rec.ok);
    assert.ok(
      rec.entries.some((e) => e.text === "My hangtag was stolen."),
      "the whole conversation is in the record",
    );
  }
  assert.equal(store.send(id, "res-3", "One more thing").ok, false, "a closed chat takes no more messages");
  assert.ok(store.rate(id, "res-3", true).ok, "the resident can rate it once");
  assert.equal(store.ticketBox("res-3").find((t) => t.id === id).csat, "up");
});

test("a chat the assistant answered alone never becomes a ticket", () => {
  const { store } = setup();
  const { convId } = freshSession(store, "res-3");
  assert.ok(store.endChat(convId, "res-3").ok);
  assert.ok(!store.ticketBox("res-3").some((t) => t.id === convId));
  assert.ok(!store.ticketBox("stf-1").some((t) => t.id === convId));
});

test("Staff and Client: when the help is done, Resolve saves the chat as a ticket both can find; a reply reopens it", () => {
  const { store, clock } = setup();
  const r = store.startDirect("cli-2", "stf-2", "Can you send the visitor list for Friday?");
  assert.ok(r.ok);
  const id = r.convId;
  assert.ok(store.send(id, "stf-2", "Sent to your email just now.").ok);
  assert.ok(store.get(id, "stf-2").actions.includes("resolve"), "the Staff person has a Resolve button");
  assert.ok(!store.get(id, "cli-2").actions.includes("resolve"), "the Client does not: the helper decides when it is done");
  assert.equal(store.resolve(id, "cli-2").reason, "not_allowed");
  assert.equal(store.resolve(id, "stf-1").reason, "not_allowed", "a colleague outside the chat cannot resolve it");
  assert.ok(!store.ticketBox("stf-2").some((t) => t.id === id), "not a ticket before it is resolved");
  clock.t += 3600000;
  assert.ok(store.resolve(id, "stf-2").ok);
  for (const who of ["stf-2", "cli-2"]) {
    const row = store.ticketBox(who).find((t) => t.id === id);
    assert.ok(row, `${who} finds it in the Ticket box`);
    assert.equal(row.kind, "direct");
    assert.equal(row.stage, "resolved");
    assert.equal(row.isOpen, false);
    assert.equal(row.requester.name, "Marcus Cole", "the Client is the one who was helped");
    assert.equal(row.assignee, "Sam Okafor", "the Staff person is the owner");
    assert.equal(row.subject, "Can you send the visitor list for Friday?");
    assert.match(row.no, /^T-\d+$/);
    const rec = store.ticketRecord(who, id);
    assert.ok(rec.ok);
    assert.ok(
      rec.entries.some((e) => e.text === "Sent to your email just now."),
      "the whole conversation is kept",
    );
    assert.ok(
      rec.entries.some((e) => e.audit && e.audit.to === "Resolved"),
      "with who resolved it and when",
    );
  }
  for (const who of ["stf-1", "cli-1", "adm-1", "res-1"]) assert.ok(!store.ticketBox(who).some((t) => t.id === id), `${who} never sees it`);
  assert.equal(store.ticketRecord("adm-1", id).ok, false);
  assert.ok(!store.get(id, "stf-2").actions.includes("resolve"), "already resolved: no button");
  assert.equal(store.resolve(id, "stf-2").ok, true, "pressing it twice changes nothing");
  // a reply reopens it, with the same number
  const no = store.ticketBox("cli-2").find((t) => t.id === id).no;
  clock.t += 60000;
  assert.ok(store.send(id, "cli-2", "One name is missing from the list.").ok);
  const again = store.ticketBox("stf-2").find((t) => t.id === id);
  assert.equal(again.isOpen, true);
  assert.equal(again.stage, "open");
  assert.equal(again.no, no);
  assert.ok(store.get(id, "stf-2").actions.includes("resolve"));
});

test("only a Staff and Client chat can be resolved this way", () => {
  const { store } = setup();
  const sr = store.startDirect("stf-1", "res-1", "Your guest pass is ready.");
  if (sr.ok) {
    assert.ok(!store.get(sr.convId, "stf-1").actions.includes("resolve"), "a note to a resident is not a ticket");
    assert.equal(store.resolve(sr.convId, "stf-1").reason, "not_allowed");
  }
  const aa = store.startDirect("adm-1", "adm-2", "Can you take the gate ticket?");
  assert.ok(aa.ok);
  assert.equal(store.resolve(aa.convId, "adm-1").reason, "not_allowed");
  assert.ok(!store.ticketBox("adm-1").some((t) => t.id === aa.convId));
});

test("Staff and Client: a direct chat both ways; it is a conversation, not a ticket until it is resolved", () => {
  const { store, other } = setup();
  const r = store.startDirect("stf-1", "cli-2", "The March report is ready.");
  assert.ok(r.ok);
  assert.ok(other.send(r.convId, "cli-2", "Got it, thanks.").ok);
  assert.ok(texts(store, r.convId, "stf-1").includes("Got it, thanks."));
  assert.ok(texts(other, r.convId, "cli-2").includes("The March report is ready."));
  const again = other.startDirect("cli-2", "stf-1", "One more question.");
  assert.equal(again.convId, r.convId, "the same two people keep one thread");
  assert.ok(!store.ticketBox("stf-1").some((t) => t.id === r.convId), "a direct chat is not in the Ticket box");
  assert.ok(!store.ticketBox("cli-2").some((t) => t.id === r.convId));
  assert.equal(store.get(r.convId, "stf-2").ok, false, "a colleague who is not in the chat cannot read it");
  assert.equal(store.startDirect("cli-1", "res-1", "Hello").reason, "not_allowed", "a Client never writes to a Resident");
});

test("Client and Admin: a Support ticket, answered, resolved, kept as history, reopened by a reply", () => {
  const { store, other, clock } = setup();
  const r = store.startSupport("cli-1", { subject: "Export fails", text: "The CSV export stops at 50 rows.", category: "Bug / technical" });
  assert.ok(r.ok);
  assert.ok(
    other.ticketBox("adm-1").some((t) => t.id === r.convId),
    "the admin sees the ticket",
  );
  assert.ok(other.send(r.convId, "adm-1", "We are looking at it.").ok);
  const mid = store.ticketBox("cli-1").find((t) => t.id === r.convId);
  assert.equal(mid.assignee, "Taylor Brooks", "the admin who answers owns it");
  assert.ok(texts(store, r.convId, "cli-1").includes("We are looking at it."));
  clock.t += 60000;
  assert.ok(other.setSupportStatus(r.convId, "adm-1", "resolved").ok);
  for (const who of ["cli-1", "adm-1", "adm-2"]) {
    const row = store.ticketBox(who).find((t) => t.id === r.convId);
    assert.ok(row, `${who} keeps the ticket`);
    assert.equal(row.stage, "resolved");
    assert.ok(store.ticketRecord(who, r.convId).entries.some((e) => e.text === "The CSV export stops at 50 rows."));
  }
  assert.equal(
    store.ticketBox("cli-2").some((t) => t.id === r.convId),
    false,
    "another Client never sees it",
  );
  clock.t += 60000;
  assert.ok(store.send(r.convId, "cli-1", "It happened again.").ok, "a reply reopens it");
  assert.equal(store.ticketBox("adm-1").find((t) => t.id === r.convId).isOpen, true);
});

test("Staff and Admin: the same Support flow; a message to Support becomes a ticket by itself", () => {
  const { store } = setup();
  const r = store.startDirect("stf-2", "adm-1", "Can you reset the gate integration?");
  assert.ok(r.ok);
  const row = store.ticketBox("adm-1").find((t) => t.id === r.convId);
  assert.ok(row, "writing to an admin opens a ticket");
  assert.equal(row.kind, "support");
  assert.equal(row.requester.name, "Sam Okafor");
  assert.ok(
    store.ticketBox("stf-2").some((t) => t.id === r.convId),
    "the Staff person finds it in their own Ticket box",
  );
  assert.ok(!store.ticketBox("stf-1").some((t) => t.id === r.convId), "a colleague does not");
  assert.ok(store.resolve(r.convId, "adm-2").ok, "any admin can resolve it");
  assert.equal(store.ticketBox("stf-2").find((t) => t.id === r.convId).stage, "resolved");
});

test("who may not write to whom is refused by the store, not only hidden in the page", () => {
  const { store } = setup();
  assert.equal(store.startDirect("res-1", "stf-1", "hi").reason, "use_assistant");
  assert.equal(store.startDirect("res-1", "cli-1", "hi").reason, "use_assistant");
  assert.equal(store.startSupport("res-1", { subject: "x", text: "y" }).reason, "not_allowed");
  assert.equal(store.startDirect("cli-1", "cli-2", "hi").reason, "not_allowed");
  assert.equal(store.setSupportStatus("nope", "adm-1", "resolved").reason, "not_found");
});

test("Exit goes to the page the person came from, or home", () => {
  const run = (referrer, search = "") => {
    globalThis.document = { referrer };
    globalThis.location = { origin: "http://localhost:3590", search };
    try {
      return exitTarget("/messages.html", "/staff/dashboard.html");
    } finally {
      delete globalThis.document;
      delete globalThis.location;
    }
  };
  assert.equal(run("http://localhost:3590/staff/notifications.html?as=stf-2"), "/staff/notifications.html?as=stf-2");
  assert.equal(run("http://localhost:3590/staff/social.html"), "/staff/social.html");
  assert.equal(run(""), "/staff/dashboard.html", "opened directly: home");
  assert.equal(run("https://example.com/x"), "/staff/dashboard.html", "from another site: home");
  assert.equal(run("http://localhost:3590/staff/messages.html"), "/staff/dashboard.html", 'a reload of this page is not "came from"');
  assert.equal(run("", "?as=stf-2&embed=1"), "/staff/dashboard.html?as=stf-2", "the person stays the same, the frame flag goes");
  // Messages and the Ticket box link to each other: Exit from one must not send the person to the other (a loop, "stuck")
  assert.equal(run("http://localhost:3590/admin/tickets.html?as=adm-1"), "/staff/dashboard.html", "came from the Ticket box: home, not back there");
  const fromMessages = (referrer) => {
    globalThis.document = { referrer };
    globalThis.location = { origin: "http://localhost:3590", search: "?as=adm-1" };
    try {
      return exitTarget("/tickets.html", "/admin/dashboard.html");
    } finally {
      delete globalThis.document;
      delete globalThis.location;
    }
  };
  assert.equal(fromMessages("http://localhost:3590/admin/messages.html?as=adm-1"), "/admin/dashboard.html?as=adm-1", "Ticket box opened from Messages: Exit goes home");
});
