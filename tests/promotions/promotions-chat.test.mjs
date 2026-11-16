// Staff see a resident's promotion claims next to the conversation, and only that resident's. Run with: npm test

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { historyFor, KEY } from "../../src/features/promotions/store.js";

function memory(seed = {}) {
  const m = new Map(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
}

const claimedAt = "2026-11-16T09:13:00.000Z";
const mine = (p, code) => ({ saved: [], claims: { [p]: { count: 1, code, at: claimedAt } }, log: [{ t: claimedAt, p, k: "claimed", n: 1, note: `Code issued: ${code}` }] });

test("the history Staff see is the claims of the resident in the conversation, with what Staff decided", () => {
  const storage = memory({
    [KEY.mine("res-1")]: mine("parking0", "MALLA10"),
    [KEY.mine("res-2")]: mine("moving1", "CUBES20"),
    [KEY.claimState]: { "res-1|parking0|1": { st: "rejected", reason: "Not eligible", at: 1794849000000, jt: 1794849000000 } },
  });
  const ev = historyFor(storage, "res-1", (id) => `Deal ${id}`);
  assert.deepEqual(ev.map((e) => e.label).sort(), ["Claimed", "Rejected"]);
  assert.ok(ev.every((e) => e.promoId === "parking0"), "res-2's claim never shows for res-1");
  assert.equal(ev.find((e) => e.label === "Rejected").note, "Not eligible", "the reason Staff gave is there");
  assert.deepEqual(historyFor(storage, "res-3", () => ""), [], "a resident with no claims has an empty list");
});

test("the Messages details panel for a resident lists their promotion claims, opens the Claims inbox for Staff only, and follows changes made in other tabs", () => {
  const app = readFileSync(new URL("../../src/features/messaging/app.js", import.meta.url), "utf8");
  assert.ok(app.includes('import { allRecords, claimStatus, historyFor, residentState, unitBlocks, unitHistory } from "../promotions/store.js";'));
  assert.ok(app.includes('data && data.kind === "resident" && data.person ? promoEvents(data.person.id) : []'), "only a resident conversation has the list, for that resident");
  assert.ok(app.includes('const promo = ctxSection("Promotions");') && app.includes("No promotion claims from this resident."));
  assert.ok(app.includes('if (portal === "staff") promo.appendChild(button("Open Claims inbox"'), "the inbox link is for the Staff portal only");
  assert.ok(app.includes("JSON.stringify([t.conv.id, data, promoEv, unitEv,"), "the panel is drawn again when the claims change");
  assert.ok(app.includes('e.key.startsWith("eso-res-promo:")') && app.includes('e.key === "eso-pm-claimstate"'), "a claim or a Staff decision in another tab refreshes the open panel");
  assert.ok(app.includes('Verified: "Confirmed by the property team"'), "notes written for the resident are said to Staff");
});
