import assert from "node:assert/strict";
import { test } from "node:test";
import { composeReport, MAX_TEXT, postFinding, reportToTeam, teamContact } from "../../src/features/health/report-to-team.js";
import { PERSONAS } from "../../src/features/messaging/personas.js";
import { createStore } from "../../src/features/messaging/store.js";
import { createMemoryBus } from "../../src/features/messaging/transport.js";

const admin = PERSONAS.find((p) => p.id === "adm-1");
const make = () => createStore({ transport: createMemoryBus().connect() });

test("the Property Manager is the person told; a property that is not the first has nobody yet", () => {
  assert.equal(teamContact("main").title, "Property Manager");
  assert.equal(teamContact("extra-1"), null);
});

test("the text says who writes, about which property, the note and the finding; a long one is cut and says so", () => {
  const { text, cut } = composeReport({ property: "Mallard Pointe", from: "Taylor Brooks", note: "Please look today.", body: "Post p1: Two posts have this id.", link: "/admin/health.html" });
  assert.match(text, /Taylor Brooks from EasySpotOps writes about the Social of Mallard Pointe/);
  assert.match(text, /Note: Please look today\./);
  assert.match(text, /Post p1/);
  assert.equal(cut, false);
  const long = composeReport({ property: "X", body: "a".repeat(5000) });
  assert.equal(long.cut, true);
  assert.ok(long.text.length <= MAX_TEXT);
  assert.match(long.text, /Cut to fit one message/);
});

test("a post becomes one line a person can find: id, author and the start of the text", () => {
  const line = postFinding({ id: "p7", author: "Nadia Shah", text: "x".repeat(300) });
  assert.match(line, /^Post p7 by Nadia Shah: "x+…"$/);
});

test("Admin's report arrives in the Property Manager's Messages as a message from Admin, and nothing else changes", () => {
  const store = make();
  const manager = teamContact("main");
  const before = store.listFor(manager.id).length;
  const r = reportToTeam(store, { admin, channelId: "main", property: "Mallard Pointe", body: "Post p1: Two posts have this id.", note: "Please fix." });
  assert.equal(r.ok, true);
  assert.equal(r.to, manager.name);
  const rows = store.listFor(manager.id);
  assert.equal(rows.length, before + 1);
  const thread = store.get(r.convId, manager.id);
  assert.ok(thread);
  assert.match(JSON.stringify(thread), /Two posts have this id/);
  // a second report goes into the same thread, it does not make a new one each time
  const again = reportToTeam(store, { admin, channelId: "main", property: "Mallard Pointe", body: "Another." });
  assert.equal(again.convId, r.convId);
});

test("it says plainly why it could not send: not an Admin, or no team for that property", () => {
  const store = make();
  const staff = PERSONAS.find((p) => p.role === "staff");
  assert.equal(reportToTeam(store, { admin: staff, channelId: "main", property: "P", body: "x" }).reason, "not_admin");
  const none = reportToTeam(store, { admin, channelId: "extra-1", property: "Harbor Court", body: "x" });
  assert.equal(none.ok, false);
  assert.equal(none.reason, "no_team");
  assert.match(none.message, /Harbor Court has no team in Messages yet/);
});
