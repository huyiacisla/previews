// Random sequences in the support chat about claims (a resident asks, writes, ends the chat; Staff take it, reply, move it, resolve it, tell a decision): a resident never has two open
// chats, ticket numbers never repeat, no step throws, the unread counts are never negative, and Staff's details window can always be drawn. Seeded. Run with: npm test

import assert from "node:assert/strict";
import test from "node:test";
import { createStore } from "../../src/features/messaging/store.js";
import { createMemoryBus } from "../../src/features/messaging/transport.js";

const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const pick = (r, a) => a[Math.floor(r() * a.length)];
const RES = ["res-1", "res-2", "res-3", "res-4"];
const STAFF = ["stf-1"];
const CLAIMS = [
  { title: "Mallard Pointe Valet", code: "MALLA10", claimId: "r_res_1_parking0_1", promoId: "parking0", status: "Pending", at: "2026-11-16T09:13:00.000Z" },
  { title: "Covered Spot Upgrade", code: "RES-D438R", claimId: "r_res_2_parking1_1", promoId: "parking1", status: "Verified", at: "2026-11-16T10:00:00.000Z" },
  { title: "Bike Locker", code: "", claimId: "r_res_3_moving2_2", promoId: "moving2", status: "Pending", at: "2026-11-16T11:00:00.000Z", unit: true },
];
const OPEN = ["bot", "queued", "active"];

function run(seed, steps = 60) {
  const r = rng(seed);
  let t = Date.UTC(2026, 10, 16, 9, 0, 0);
  const store = createStore({ transport: createMemoryBus().connect(), now: () => t });
  store.reset({ empty: true });
  const log = [];
  const convOf = (res) => store.listFor(res).map((x) => x.id);
  for (let i = 0; i < steps; i++) {
    t += 1000 + Math.floor(r() * 90000);
    const res = pick(r, RES);
    const staff = pick(r, STAFF);
    const op = pick(r, ["ask", "ask", "send", "claim", "staffsend", "resolve", "end", "requestStaff", "reroute", "wait", "decision", "stage"]);
    const ids = convOf(res);
    const convId = ids.length ? pick(r, ids) : null;
    log.push(`${op} ${res} ${convId || "-"}`);
    try {
      if (op === "ask") store.askAboutClaim(res, pick(r, CLAIMS));
      else if (op === "send" && convId) store.send(convId, res, pick(r, ["hello", "any news?", "x".repeat(300), "  ", "line1\nline2"]));
      else if (op === "claim" && convId) store.claim(convId, staff);
      else if (op === "staffsend" && convId) store.send(convId, staff, pick(r, ["on it", "please send the plate", "done"]));
      else if (op === "resolve" && convId) store.resolve(convId, staff);
      else if (op === "end" && convId) store.endChat(convId, res);
      else if (op === "requestStaff" && convId) store.requestStaff(convId, res);
      else if (op === "reroute" && convId) store.reroute(convId, staff, pick(r, ["platform", "property"]));
      else if (op === "wait" && convId) store.setTicketState(convId, staff, pick(r, ["waiting_on_resident", "in_progress"]));
      else if (op === "decision" && convId) store.noteClaimDecision(convId, staff, pick(r, ["The property team did not approve your claim: x", "", "applied by hand: y"]));
      else if (op === "stage" && convId) store.setTicketState(convId, staff, pick(r, ["resolved", "closed", "open"]));
    } catch (e) {
      assert.fail(`seed ${seed} step ${i} (${op} ${res}) threw: ${e && e.stack}\n${log.join("\n")}`);
    }
    // invariants
    const where = () => `seed ${seed} step ${i}\n${log.slice(-10).join("\n")}`;
    for (const who of RES) {
      const rows = store.listFor(who);
      const open = rows.filter((x) => x.status && OPEN.includes(x.status) && x.kind === "resident_support");
      assert.ok(open.length <= 1, `${who} has ${open.length} open chats: ${where()}`);
      assert.ok(store.badgeCount(who) >= 0, `negative badge for ${who}: ${where()}`);
      for (const x of rows) assert.ok(store.unreadCount(x.id, who) >= 0, `negative unread: ${where()}`);
    }
    const box = store.ticketBox("stf-1");
    const nos = (box.rows || box || []).map((x) => x.no).filter(Boolean);
    assert.equal(new Set(nos).size, nos.length, `a ticket number repeats (${nos.join(",")}): ${where()}`);
    for (const x of store.listFor("stf-1")) {
      const ctx = store.contextFor(x.id, "stf-1");
      if (ctx && ctx.kind === "resident") {
        const ids2 = (ctx.ticketList || []).map((k) => k.id);
        assert.equal(new Set(ids2).size, ids2.length, `a ticket twice in the resident's list: ${where()}`);
        assert.equal((ctx.ticketList || []).filter((k) => k.current).length, 1, `the current chat is not exactly once in the ticket list: ${where()}`);
      }
    }
  }
}

test("random support chats about claims keep one open chat per resident, unique ticket numbers and a drawable details window (150 sequences)", () => {
  for (let seed = 1; seed <= 150; seed++) run(seed);
});
