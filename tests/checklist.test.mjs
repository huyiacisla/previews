// Behaviour taken from "Property Messenger UI/UX & Technical Specification": emergency flag, ticket lifecycle,
// audit cards, broadcast reach, structured search. Pure core only (no DOM).

import assert from "node:assert/strict";
import test from "node:test";
import { matchFilters, matchText, parseQuery, withoutFilter } from "../src/features/messaging/query.js";
import { createStore, STAGE_LABEL, ticketStage } from "../src/features/messaging/store.js";
import { createMemoryBus } from "../src/features/messaging/transport.js";

const T0 = Date.UTC(2026, 10, 9, 15, 0, 0);
function setup(opts = {}) {
  const clock = { t: T0 };
  const bus = createMemoryBus();
  const store = createStore({ transport: bus.connect(), now: () => clock.t, config: opts });
  return { store, clock, bus };
}
const audits = (store, id, user) => store.get(id, user).messages.filter((m) => m.audit);

test("emergency from a resident skips the assistant, queues at once and tops the staff list", () => {
  const { store } = setup();
  const { convId } = store.ensureSession("res-1");
  const r = store.send(convId, "res-1", "Water is coming through the ceiling in my unit!", { emergency: true });
  assert.ok(r.ok);
  const v = store.get(convId, "stf-1");
  assert.ok(v.ok, "staff see it immediately");
  assert.equal(v.conv.status, "queued");
  assert.ok(v.emergency);
  assert.equal(store.listFor("stf-1")[0].id, convId, "emergencies sort first");
  assert.equal(store.listFor("stf-1")[0].priority, "emergency");
  assert.ok(
    v.messages.find((m) => m.emergency),
    "the message itself carries the flag",
  );
  assert.equal(store.get(convId, "res-1").messages.filter((m) => m.kind === "bot").length, 2, "no assistant reply was added");
  assert.deepEqual(
    store.emergencies("stf-1").map((e) => e.convId),
    [convId],
  );
  assert.deepEqual(store.emergencies("res-1"), [], "residents get no manager banner");
  assert.deepEqual(store.emergencies("cli-1"), []);
});

test("emergency: only people on the ground can raise one; acknowledging clears it with an audit card", () => {
  const { store } = setup();
  const d = store.startDirect("stf-1", "cli-1", "hello");
  assert.equal(store.send(d.convId, "cli-1", "fire!", { emergency: true }).reason, "not_allowed", "clients do not raise emergencies");
  const { convId } = store.ensureSession("res-2");
  store.send(convId, "res-2", "Gas smell in the garage", { emergency: true });
  assert.equal(store.acknowledgeEmergency(convId, "res-2").ok, false, "a resident cannot acknowledge their own");
  assert.ok(store.acknowledgeEmergency(convId, "stf-2").ok);
  assert.deepEqual(store.emergencies("stf-1"), []);
  assert.equal(store.get(convId, "stf-1").emergency, null);
  const a = audits(store, convId, "stf-1").map((m) => m.audit);
  assert.ok(a.some((x) => x.field === "Emergency" && x.to === "Acknowledged" && x.actorId === "stf-2" && /^\d{4}-\d\d-\d\dT/.test(x.at)));
  assert.ok(
    store.get(convId, "res-2").messages.some((m) => /seen your emergency/.test(m.text)),
    "the resident is told",
  );
  assert.equal(store.acknowledgeEmergency(convId, "stf-2").noop, true, "second ack does nothing");
});

test("emergency unacknowledged for 180 seconds escalates once (simulated SMS) and cuts through Do Not Disturb", () => {
  const { store, clock } = setup();
  store.setPref("res-3", { dnd: true });
  const c = store.startDirect("stf-1", "res-1", "Check-in note");
  const sent = store.send(c.convId, "stf-1", "Water shut-off at 3 PM today in Building 2.", { emergency: true });
  assert.ok(sent.ok);
  clock.t += 179 * 1000;
  store.tick();
  assert.equal(audits(store, c.convId, "stf-1").filter((m) => m.audit.field === "Escalation").length, 0, "not yet");
  clock.t += 2000;
  store.tick();
  store.tick();
  const esc = audits(store, c.convId, "stf-1").filter((m) => m.audit.field === "Escalation");
  assert.equal(esc.length, 1, "escalates exactly once");
  assert.equal(esc[0].audit.actorId, "system");
  const r = setup();
  r.store.setPref("res-1", { dnd: true, muted: [] });
  const o = r.store.startDirect("stf-1", "res-1", "Hello there");
  const quiet = r.store.badgeCount("res-1");
  r.store.send(o.convId, "stf-1", "Gas leak: leave the building", { emergency: true });
  assert.ok(r.store.badgeCount("res-1") > quiet, "an emergency counts even with Do Not Disturb on");
});

test("ticket lifecycle: Open -> In progress -> Waiting on resident -> back -> Resolved, each step an audit card", () => {
  const { store } = setup();
  const id = store.listFor("stf-1").find((r) => r.tags.includes("queue")).id;
  assert.equal(store.get(id, "stf-1").stage, "open");
  assert.ok(store.claim(id, "stf-1").ok);
  assert.equal(store.get(id, "stf-1").stage, "in_progress");
  assert.deepEqual(store.get(id, "stf-1").actions.slice(0, 2), ["wait", "resolve"]);
  assert.equal(store.setTicketState(id, "stf-2", "waiting_on_resident").ok, false, "only the assignee");
  assert.ok(store.setTicketState(id, "stf-1", "waiting_on_resident").ok);
  assert.equal(store.get(id, "res-2").stage, "waiting_on_resident");
  assert.deepEqual(store.get(id, "stf-1").actions.slice(0, 2), ["resume", "resolve"]);
  assert.equal(store.setTicketState(id, "stf-1", "waiting_on_resident").noop, true);
  assert.ok(store.send(id, "res-2", "Here is the plate photo.").ok);
  assert.equal(store.get(id, "stf-1").stage, "in_progress", "the resident replying moves it back");
  assert.ok(store.resolve(id, "stf-1").ok);
  assert.equal(store.get(id, "stf-1").stage, "resolved");
  const steps = audits(store, id, "stf-1").map((m) => `${m.audit.from}>${m.audit.to}`);
  assert.deepEqual(steps, ["Open>In progress", "In progress>Waiting on resident", "Waiting on resident>In progress", "In progress>Resolved"]);
  const first = audits(store, id, "stf-1")[0];
  assert.deepEqual([first.audit.actorId, first.audit.actorName, first.audit.field], ["stf-1", "Jordan Lee", "Status"]);
  assert.equal(store.hideMessage(id, "stf-1", first.id).reason, "not_allowed", "audit cards cannot be removed");
  assert.equal(store.unreadCount(id, "res-2") >= 0, true);
  assert.equal(store.get(id, "res-2").row.last.kind === "system" && /Status/.test(store.get(id, "res-2").row.last.text), false, "audit never becomes the list preview");
});

test("closing a ticket that was waiting on the resident clears the waiting flag (found by the random test)", () => {
  const { store } = setup();
  const id = store.listFor("stf-1").find((r) => r.tags.includes("queue")).id;
  store.claim(id, "stf-1");
  store.setTicketState(id, "stf-1", "waiting_on_resident");
  assert.ok(store.resolve(id, "stf-1").ok);
  const v = store.get(id, "stf-1");
  assert.equal(v.conv.waiting, false);
  assert.equal(v.stage, "resolved");
  assert.equal(audits(store, id, "stf-1").at(-1).audit.from, "Waiting on resident");
});

test("details panel: resident context for Staff, people for other chats, nothing for Residents and Clients", () => {
  const { store, clock } = setup();
  const queued = store.listFor("stf-1").find((r) => r.tags.includes("queue")).id; // Priya Nair, unit 05-114
  const c = store.contextFor(queued, "stf-1");
  assert.equal(c.kind, "resident");
  assert.equal(c.person.name, "Priya Nair");
  assert.deepEqual([c.unit.number, c.unit.building], ["05-114", "Building 5"]);
  assert.ok(c.unit.daysLeft > 0, "lease still running");
  assert.deepEqual(c.tickets, [], "no other tickets yet");
  assert.equal(store.contextFor(queued, "res-2"), null, "residents never see their own account panel");
  assert.equal(store.contextFor(queued, "cli-1"), null);
  assert.equal(store.contextFor(queued, "stf-2").kind, "resident", "every Staff member can open a waiting chat");
  clock.t += 400 * 24 * 3600 * 1000;
  assert.ok(store.contextFor(queued, "stf-1").unit.daysLeft < 0, "an expired lease shows as negative days");
  // history: a second ticket from the same resident shows up as "recent ticket" in the first one
  store.claim(queued, "stf-1");
  store.resolve(queued, "stf-1");
  const next = store.ensureSession("res-2").convId;
  store.send(next, "res-2", "Another question", { emergency: true });
  const again = store.contextFor(next, "stf-1");
  assert.equal(again.tickets.length, 1);
  assert.deepEqual([again.tickets[0].id, again.tickets[0].stage, again.tickets[0].assignee], [queued, "resolved", "Jordan Lee"]);
  const group = store.listFor("stf-1").find((r) => r.kind === "group").id;
  assert.deepEqual(
    store
      .contextFor(group, "stf-1")
      .people.map((p) => p.name)
      .sort(),
    ["Dana Whitfield", "Jordan Lee", "Marcus Cole"],
  );
  const ann = store.listFor("stf-1").find((r) => r.kind === "announcement").id;
  assert.equal(store.contextFor(ann, "stf-1"), null, "nothing to show for a broadcast");
});

test("ticket box: closed conversations are kept, readable and searchable by the right people only", () => {
  const { store } = setup();
  const staffBox = store.ticketBox("stf-1");
  // Seed order: waiting resident chat T-1081, active chat T-1082, support T-1083 (client), T-1084 (staff), T-1085 (staff 2).
  assert.deepEqual(staffBox.map((t) => t.no).sort(), ["T-1081", "T-1082", "T-1084"], "two resident tickets and their own support thread");
  assert.equal(new Set(store.ticketBox("adm-1").map((t) => t.no)).size, 3, "numbers are unique");
  assert.ok(!staffBox.some((t) => t.id && t.kind === "resident" && t.requester.id === "res-1"), "a chat the assistant answered never becomes a ticket");
  const counts = store.ticketCounts("stf-1");
  assert.equal(counts.open + counts.closed, counts.total);
  // close one and see it stay in the box with its whole record
  const id = store.listFor("stf-1").find((r) => r.tags.includes("queue")).id;
  store.claim(id, "stf-1");
  store.send(id, "stf-1", "Replacement hangtag is at the office.");
  assert.ok(store.resolve(id, "stf-1").ok);
  const row = store.ticketBox("stf-1").find((t) => t.id === id);
  assert.deepEqual([row.isOpen, row.stage, row.stageLabel, row.assignee, row.kind], [false, "resolved", "Resolved", "Jordan Lee", "resident"]);
  assert.ok(row.closedAt >= row.openedAt);
  const rec = store.ticketRecord("stf-2", id);
  assert.ok(rec.ok, "any Staff member can read a closed resident ticket");
  assert.ok(rec.entries.some((e) => e.text === "Replacement hangtag is at the office."));
  assert.ok(
    rec.entries.some((e) => e.audit && e.audit.to === "Resolved"),
    "the audit trail is part of the record",
  );
  assert.ok(
    rec.entries.some((e) => e.author && e.author.role === "bot"),
    "so is what the assistant said",
  );
  assert.ok(store.ticketRecord("res-2", id).ok, "the resident can read their own ticket");
  assert.equal(store.ticketRecord("res-1", id).ok, false, "another resident cannot");
  assert.equal(store.ticketRecord("cli-1", id).ok, false);
  assert.equal(store.ticketRecord("adm-1", id).ok, false, "Admin does not see resident tickets");
  assert.deepEqual(store.ticketBox("res-1"), [], "res-1 has no tickets");
  // support threads: requester and Admin
  const sup = store.ticketBox("adm-1");
  assert.ok(sup.length >= 3 && sup.every((t) => t.kind === "support"));
  assert.deepEqual(
    store.ticketBox("cli-2").map((t) => t.no),
    ["T-1083"],
    "a client sees only their own support thread",
  );
  assert.equal(store.ticketBox("cli-1").length, 0);
  // search: filters and words across the whole conversation
  assert.deepEqual(
    store.ticketBox("stf-1", "hangtag status:resolved").map((t) => t.id),
    [id],
  );
  assert.equal(store.ticketBox("stf-1", "T-1081").length, 1, "search by ticket number");
  assert.equal(store.ticketBox("stf-1", "zzzz").length, 0);
  assert.equal(store.ticketBox("stf-1", "unit:05-114").length, 1);
  // hidden-for-me messages stay out of your copy of the record
  const mid = rec.entries.find((e) => e.text === "Replacement hangtag is at the office.").id;
  store.hideMessage(id, "stf-1", mid);
  assert.ok(!store.ticketRecord("stf-1", id).entries.some((e) => e.id === mid));
});

test("ticketStage covers every state and the labels exist", () => {
  assert.equal(ticketStage({ kind: "direct" }), null);
  assert.equal(ticketStage({ kind: "resident_support", status: "bot" }), "open");
  assert.equal(ticketStage({ kind: "resident_support", status: "closed", closeReason: "resident_ended" }), "closed");
  for (const s of ["open", "in_progress", "waiting_on_resident", "resolved", "closed"]) assert.ok(STAGE_LABEL[s]);
});

test("support changes write audit cards: status, assignee, priority", () => {
  const { store } = setup();
  const id = store.listFor("adm-1").find((r) => r.tags.includes("queue")).id;
  store.assignSupport(id, "adm-1", "adm-2");
  store.setPriority(id, "adm-1", "high");
  store.setSupportStatus(id, "adm-1", "pending");
  const a = audits(store, id, "adm-1").map((m) => m.audit);
  assert.deepEqual(
    a.map((x) => x.field),
    ["Assignee", "Priority", "Status"],
  );
  assert.deepEqual([a[0].from, a[0].to], ["Unassigned", "Casey Ng"]);
  assert.deepEqual([a[1].from, a[1].to], ["Normal", "High"]);
  assert.equal(store.setPriority(id, "adm-1", "high").noop, true, "no audit when nothing changes");
});

test("broadcast reach: the author sees how many of the audience have read it", () => {
  const { store } = setup();
  const b = store.broadcast("adm-1", { title: "Water off", text: "Water is off 2 to 4 PM.", audience: ["resident"] });
  let a = store.get(b.convId, "adm-1").ack;
  assert.deepEqual([a.read, a.total, a.pct], [0, 3, 0]);
  store.markRead(b.convId, "res-1");
  a = store.get(b.convId, "adm-1").ack;
  assert.deepEqual([a.read, a.pct], [1, 33]);
  assert.deepEqual(a.unread.sort(), ["Morgan Ellis", "Priya Nair"]);
  assert.equal(store.get(b.convId, "res-1").ack, null, "readers do not see the stats");
});

test("structured search: unit, status, priority, assignee, tag, dates and quoted phrases", () => {
  const q = parseQuery('unit:304 status:open priority:high "water leak" urgent');
  assert.deepEqual(q.filters, { unit: "304", status: "open", priority: "high" });
  assert.deepEqual(q.text, ["water leak", "urgent"]);
  assert.deepEqual(parseQuery("foo:bar baz").text, ["foo:bar", "baz"], "unknown keys stay text");
  assert.equal(withoutFilter("unit:304 status:open", "unit"), "status:open");
  const row = {
    unit: "03-04",
    building: "Building 3",
    stage: "waiting_on_resident",
    status: "active",
    priority: "high",
    assigneeName: "Jordan Lee",
    topic: "Vehicle or permit",
    updatedAt: Date.UTC(2026, 10, 9, 12),
  };
  assert.ok(matchFilters(row, parseQuery("unit:03-04 priority:high assignee:jordan tag:permit status:waiting")));
  assert.ok(!matchFilters(row, parseQuery("priority:low")));
  assert.ok(!matchFilters(row, parseQuery("status:open")));
  assert.ok(matchFilters(row, parseQuery("after:2026-11-09 before:2026-11-09")), "both dates are inclusive days");
  assert.ok(!matchFilters(row, parseQuery("before:2026-11-08")));
  assert.ok(!matchFilters(row, parseQuery("after:not-a-date")), "a bad date matches nothing instead of everything");
  assert.ok(matchText("the water leak in unit 4", parseQuery('"water leak" unit')));
  assert.ok(!matchText("leak", parseQuery('"water leak"')));
});

test("search by structured query finds only what the person can see", () => {
  const { store } = setup();
  const { convId } = store.ensureSession("res-1");
  store.send(convId, "res-1", "Water leak near the gate", { emergency: true });
  assert.equal(store.search("stf-1", 'unit:02-291 "water leak"').length, 1);
  assert.equal(store.search("stf-1", "priority:emergency leak").length, 1);
  assert.equal(store.search("stf-1", "priority:low leak").length, 0);
  assert.equal(store.search("cli-1", "leak").length, 0);
  assert.equal(store.search("stf-1", "unit:99-999 leak").length, 0);
});
