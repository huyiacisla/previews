// The messaging record (conversations, messages, ticket numbers, preferences) damaged field by field: loading it and every read a page makes (lists, a conversation, the details window,
// the Ticket box, search, badges, alerts) either work or say no, never throw and never run for long. Seeded. Run with: npm test

import assert from "node:assert/strict";
import test from "node:test";
import { PERSONAS } from "../../src/features/messaging/personas.js";
import { createStore } from "../../src/features/messaging/store.js";
import { createTransport } from "../../src/features/messaging/transport.js";

const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k), _m: m };
};
const ODD = [null, "x", "", 12, -1, 0, 1e308, 8.7e15, [], {}, [1, "a"], { a: 1 }, true, false, "2026-13-45", 1.5];
const NOW = Date.UTC(2026, 10, 16, 12);
const USERS = PERSONAS.map((p) => p.id);

const open = (storage) => {
  class Ch { constructor() { this.onmessage = null; } postMessage() {} close() {} }
  return createStore({ transport: createTransport({ storage, Channel: Ch, win: null }), now: () => NOW });
};

function mutate(r, text) {
  if (r() < 0.1) return text.slice(0, Math.floor(r() * text.length));
  let v;
  try {
    v = JSON.parse(text);
  } catch {
    return text; // already cut off
  }
  const paths = [];
  const walk = (o, p) => {
    paths.push(p);
    if (o && typeof o === "object") for (const k of Object.keys(o)) walk(o[k], [...p, k]);
  };
  walk(v, []);
  const p = paths[Math.floor(r() * paths.length)];
  const odd = ODD[Math.floor(r() * ODD.length)];
  if (!p.length) return JSON.stringify(odd);
  let o = v;
  for (const k of p.slice(0, -1)) o = o[k];
  if (r() < 0.2) delete o[p[p.length - 1]];
  else o[p[p.length - 1]] = odd;
  return JSON.stringify(v);
}

function reads(store) {
  const bad = [];
  const tryit = (name, fn) => {
    try { fn(); } catch (e) { bad.push(`${name}: ${e && e.message}`); }
  };
  for (const u of USERS) {
    tryit(`listFor ${u}`, () => store.listFor(u));
    tryit(`badge ${u}`, () => store.badgeCount(u));
    tryit(`alerts ${u}`, () => store.alertsFor(u));
    tryit(`ticketBox ${u}`, () => store.ticketBox(u));
    tryit(`search ${u}`, () => store.search(u, "claim"));
    tryit(`emergencies ${u}`, () => store.emergencies(u));
    tryit(`hidden ${u}`, () => store.hiddenItems(u));
    tryit(`recipients ${u}`, () => store.recipients(u));
    let rows = [];
    try { rows = store.listFor(u); } catch { rows = []; }
    for (const row of rows.slice(0, 12)) {
      tryit(`get ${row.id} ${u}`, () => store.get(row.id, u));
      tryit(`context ${row.id} ${u}`, () => store.contextFor(row.id, u));
      tryit(`unread ${row.id} ${u}`, () => store.unreadCount(row.id, u));
    }
  }
  return bad;
}

test("the messaging record damaged field by field never makes a read throw or run long (300 damaged copies)", () => {
  const all = [];
  for (let seed = 1; seed <= 300; seed++) {
    const r = rng(seed);
    const storage = memory();
    const first = open(storage);
    first.reset({});
    first.askAboutClaim("res-2", { title: "Covered Spot Upgrade", code: "RES-D438R", claimId: "r_res_2_parking1_1", promoId: "parking1", status: "Pending", at: "2026-11-16T10:00:00.000Z" });
    first.claim(first.listFor("stf-1")[0] ? first.listFor("stf-1")[0].id : "c8", "stf-1");
    const keyName = [...storage._m.keys()].find((k) => k === "eso-msg-v1") || [...storage._m.keys()][0];
    const raw = storage.getItem(keyName);
    let damaged = raw;
    const times = 1 + Math.floor(r() * 3);
    for (let k = 0; k < times; k++) damaged = mutate(r, damaged);
    storage.setItem(keyName, damaged);
    const t0 = Date.now();
    let store;
    try {
      store = open(storage);
    } catch (e) {
      all.push(`seed ${seed}: opening threw ${e.message}`);
      continue;
    }
    const bad = reads(store);
    if (Date.now() - t0 > 3000) bad.push("ran for more than 3 seconds");
    all.push(...bad.map((b) => `seed ${seed} -> ${damaged.slice(0, 80)} :: ${b}`));
  }
  assert.deepEqual(all.slice(0, 10), [], `${all.length} calls threw on a damaged messaging record`);
});
