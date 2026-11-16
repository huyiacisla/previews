// What a person switched off in Settings > Notifications is left out of the bell and the list.

import assert from "node:assert/strict";
import test from "node:test";
import { buildAll, hiddenCategories } from "../../src/features/notifications/store.js";

const mem = (o = {}) => {
  const m = new Map(Object.entries(o).map(([k, v]) => [k, JSON.stringify(v)]));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null) };
};
const NOW = Date.UTC(2026, 10, 9, 15, 0, 0);
const cats = (list) => new Set(list.map((n) => n.cat));

test("nothing is hidden before a person chooses", () => {
  for (const role of ["resident", "admin", "staff", "client"]) assert.equal(hiddenCategories(role, mem()).size, 0, role);
});

test("Resident switches hide their category: Parking, Requests, Payments, Community, Promotions, Messages", () => {
  const all = buildAll(NOW, "resident", undefined, mem());
  assert.ok(cats(all).has("parking"));
  const off = mem({ "resident:eso-proto": { rnParking: false, rnCommunity: false, rnPromos: false } });
  const list = buildAll(NOW, "resident", undefined, off);
  for (const c of ["parking", "community", "promotions"]) assert.ok(!cats(list).has(c), `${c} hidden`);
  assert.ok(cats(list).has("requests"), "what stays on stays");
  assert.ok(list.length < all.length);
});

test("Admin switches: direct messages and platform alerts", () => {
  const off = mem({ "admin:eso-proto": { anMessages: false, anAlerts: false } });
  assert.deepEqual([...hiddenCategories("admin", off)].sort(), ["messages", "properties", "system"]);
  assert.equal(hiddenCategories("admin", mem({ "admin:eso-proto": { anTickets: false } })).size, 0, "a switch with no list of its own hides nothing here");
});

test("Staff In-app switch: a category of several events goes only when every one has In-app off; an event that is a category alone goes at once", () => {
  const dm = mem({ "eso-notif": { m: { msg_dm: [0, 1, 1], msg_men: [1, 1, 0] } } });
  assert.ok(hiddenCategories("staff", dm).has("messages"), "Direct message In-app off: the chats leave the bell, Mention does not matter");
  assert.ok(!hiddenCategories("staff", mem({ "eso-notif": { m: { msg_dm: [1, 0, 0] } } })).has("messages"), "Email off only: nothing leaves");
  const req = mem({ "eso-notif": { m: { req_new: [0, 0, 0], req_upd: [1, 1, 0] } } });
  assert.ok(!hiddenCategories("staff", req).has("requests"), "Request updated is still on");
  assert.ok(hiddenCategories("staff", mem({ "eso-notif": { m: { req_new: [0, 0, 0], req_upd: [0, 0, 0] } } })).has("requests"));
  const lim = mem({ "eso-notif": { m: { cap: [0, 1, 0], sys: [0, 1, 0], msg_com: [0, 1, 0] } } });
  const gone = hiddenCategories("staff", lim);
  assert.ok(gone.has("plan") && gone.has("system") && gone.has("community"), "Near plan limit, Updates and Community post");
  const viol = mem({ "eso-notif": { m: { vio_new: [0, 0, 0], vio_esc: [0, 0, 0] } } });
  assert.ok(!cats(buildAll(NOW, "staff", undefined, viol)).has("violations"));
});

test("broken storage hides nothing", () => {
  const bad = { getItem: () => "{not json" };
  assert.equal(hiddenCategories("resident", bad).size, 0);
  assert.ok(buildAll(NOW, "staff", undefined, bad).length > 0);
});
