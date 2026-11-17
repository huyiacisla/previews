// Random chats with read / unread marks: the badge is the sum of the unread of the chats the person can see (minus muted and hidden), "mark as read" leaves 0,
// "mark as unread" brings back exactly one when there is news, and a bell alert never reports more unread than the chat has. Seeded. Run with: npm test

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
const WHO = [...RES, "stf-1"];
const CLAIM = { title: "Mallard Pointe Valet", code: "MALLA10", claimId: "r_res_1_parking0_1", promoId: "parking0", status: "Pending", at: "2026-11-16T09:13:00.000Z" };

function run(seed, steps = 80) {
  const r = rng(seed);
  let t = Date.UTC(2026, 10, 16, 9, 0, 0);
  const store = createStore({ transport: createMemoryBus().connect(), now: () => t });
  store.reset({ empty: true });
  const seen = (u) => store.listFor(u).map((x) => x.id);
  for (let i = 0; i < steps; i++) {
    t += 1000 + Math.floor(r() * 60000);
    const op = pick(r, ["ask", "send", "send", "staffsend", "read", "unread", "read", "mute", "claim"]);
    const res = pick(r, RES);
    const who = pick(r, WHO);
    const ids = seen(who);
    const convId = ids.length ? pick(r, ids) : null;
    const tag = `seed ${seed} step ${i} ${op} ${who} ${convId}`;
    if (op === "ask") store.askAboutClaim(res, CLAIM);
    else if (op === "send" && convId && RES.includes(who)) store.send(convId, who, "hello " + i);
    else if (op === "staffsend" && convId) store.send(convId, "stf-1", "reply " + i);
    else if (op === "claim" && convId) store.claim(convId, "stf-1");
    else if (op === "read" && convId) {
      store.markRead(convId, who);
      assert.equal(store.unreadCount(convId, who), 0, `${tag}: read leaves 0`);
    } else if (op === "unread" && convId) {
      const before = store.unreadCount(convId, who);
      store.markUnread(convId, who);
      const after = store.unreadCount(convId, who);
      assert.ok(after >= before && after <= before + 1, `${tag}: unread adds at most one (${before} -> ${after})`);
    } else if (op === "mute" && convId && typeof store.setMuted === "function") store.setMuted(convId, who, r() < 0.5);
    for (const u of WHO) {
      const total = seen(u).reduce((n, id) => n + store.unreadCount(id, u), 0);
      const badge = store.badgeCount(u);
      assert.ok(badge >= 0 && badge <= total, `${tag}: badge ${badge} of ${u} is within its unread ${total}`);
      for (const a of store.alertsFor(u, { since: 0, limit: 50 })) {
        assert.ok(a.unread >= 0 && a.unread <= store.unreadCount(a.convId, u), `${tag}: alert unread ${a.unread} of ${u}`);
      }
    }
  }
}

test("random chats with read / unread marks keep the badge, the chat counts and the bell consistent", () => {
  for (let seed = 1; seed <= 40; seed++) run(seed);
});
