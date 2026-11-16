// My rewards: Active vs Used / Expired by the real end time of the promotion (isExpired), a Pending claim's code is masked and cannot be copied, the steps of a claim come from
// its real timeline, the whole card leads to its promotion and View opens the steps. The fixtures are inside the tests only. Run with: npm test

import "./_clock.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { decideClaim } from "../../src/features/promotions/decide.js";
import { cancelClaim, claim, claimSteps, claimTimeline, isExpired, KEY, listPromotions, maskCode, rewardGroup, rewardInfo } from "../../src/features/promotions/store.js";

const memory = (seed = {}) => {
  const m = new Map(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};
const T = (min) => new Date(2026, 10, 16, 9, min);
const form = (over = {}) => ({ title: "Valet", reward: "r", desc: "d", cat: "parking", otype: "pct", oval: "20", method: "static", code: "VALET20", start: "2026-11-01", end: "2027-01-31", ch: ["In-App"], au: "all", limR: "1", ...over });
const rec = (id, st, x) => ({ id, st, x: form(x), views: 0, claims: 0 });

test("isExpired: by the end time, exactly; no end never expires; nothing odd counts as ended", () => {
  const end = new Date(2026, 10, 16, 10, 0).getTime();
  assert.equal(isExpired(end, T(59)), false, "a minute before");
  assert.equal(isExpired(end, new Date(2026, 10, 16, 10, 0)), true, "at the end itself");
  assert.equal(isExpired(end, new Date(2026, 10, 16, 10, 1)), true, "after");
  assert.equal(isExpired(end, end - 1), false, "milliseconds work as well as dates");
  for (const none of [null, undefined, "2026-11-16", Number.NaN, {}, Infinity]) assert.equal(isExpired(none, T(1)), false, String(none));
  assert.equal(isExpired(end, Number.NaN), false, "an unreadable now does not end anything");
});

test("maskCode keeps four characters and hides the rest", () => {
  assert.equal(maskCode("SHJS1234"), "SHJS****");
  assert.equal(maskCode("RES-J755H5"), "RES-******");
  assert.equal(maskCode("MALLA10"), "MALL***");
  assert.equal(maskCode("AB"), "AB");
  assert.equal(maskCode(""), "");
  assert.equal(maskCode(null), "");
});

test("rewardInfo reads the real record: running, ended at its exact end time, ended by Staff, gone, or no end at all", () => {
  const s = memory({
    [KEY.published]: [
      rec("run", "active", { end: "2026-11-16", etime: "10:00", terms: "One per unit." }),
      rec("closed", "closed", {}),
      rec("gone", "removed", {}),
      rec("open", "active", { end: "" }),
    ],
  });
  assert.deepEqual([rewardInfo(s, "run", T(30)).live, rewardInfo(s, "run", T(30)).terms], ["running", "One per unit."]);
  assert.equal(rewardInfo(s, "run", new Date(2026, 10, 16, 10, 0)).live, "ended");
  assert.equal(rewardInfo(s, "closed", T(1)).live, "closed");
  assert.equal(rewardInfo(s, "gone", T(1)).live, "gone");
  assert.equal(rewardInfo(s, "nobody", T(1)).live, "gone", "a promotion that is not known any more");
  assert.deepEqual([rewardInfo(s, "open", T(1)).live, rewardInfo(s, "open", T(1)).endsAt], ["running", null]);
});

test("rewardGroup: Active is Pending or Verified on a running promotion; everything else is Used / Expired, with its word", () => {
  const run = { live: "running" };
  const over = { live: "ended" };
  assert.deepEqual(rewardGroup("pending", run), { group: "active", label: "Pending" });
  assert.deepEqual(rewardGroup("verified", run), { group: "active", label: "Verified" });
  assert.deepEqual(rewardGroup("redeemed", run), { group: "history", label: "Used" });
  assert.deepEqual(rewardGroup("rejected", run), { group: "history", label: "Not approved" });
  assert.deepEqual(rewardGroup("cancelled", run), { group: "history", label: "Cancelled" });
  assert.deepEqual(rewardGroup("pending", over), { group: "history", label: "Expired" });
  assert.deepEqual(rewardGroup("verified", over), { group: "history", label: "Expired" });
  assert.deepEqual(rewardGroup("redeemed", over), { group: "history", label: "Used" }, "used stays used, expired or not");
  assert.deepEqual(rewardGroup("verified", { live: "gone" }), { group: "history", label: "Expired" });
});

test("the steps of a claim follow what really happened: submitted, awaiting approval, then the decision", () => {
  const s = memory({ [KEY.published]: [rec("1", "active", { limR: "3" })] });
  const p = listPromotions(s, { samples: false, today: "2026-11-16" })[0];
  const steps = (key) => claimSteps(key, claimTimeline(s, "res-1", p.id)).map((x) => [x.label, x.state]);
  assert.ok(claim(s, "res-1", p, T(1)).ok);
  assert.deepEqual(steps("pending"), [["Claim submitted", "done"], ["Awaiting staff approval", "current"], ["Staff approval", "todo"]]);
  assert.ok(decideClaim(s, { rid: "res-1", promoId: p.id, action: "verify", by: "Staff", now: T(5).getTime() }).ok);
  assert.deepEqual(steps("verified"), [["Claim submitted", "done"], ["Reviewed by the property team", "done"], ["Approved: your code is ready", "done"]]);
  assert.equal(claimSteps("verified", claimTimeline(s, "res-1", p.id))[0].at, T(1).toISOString(), "the time of the claim is the real one");
  const st = JSON.parse(s.getItem(KEY.claimState));
  st[`res-1|${p.id}|1`] = { ...st[`res-1|${p.id}|1`], st: "redeemed", rt: T(9).getTime() };
  s.setItem(KEY.claimState, JSON.stringify(st));
  assert.deepEqual(steps("redeemed").at(-1), ["Approved and used", "done"]);
  assert.ok(claim(s, "res-1", p, T(20)).ok);
  assert.ok(decideClaim(s, { rid: "res-1", promoId: p.id, action: "reject", reason: "Wrong building", by: "Staff", now: T(22).getTime() }).ok);
  const rejected = claimSteps("rejected", claimTimeline(s, "res-1", p.id));
  assert.deepEqual([rejected.at(-1).label, rejected.at(-1).state, rejected.at(-1).note], ["Not approved", "stop", "Wrong building"]);
  assert.ok(claim(s, "res-1", p, T(30)).ok);
  assert.ok(cancelClaim(s, "res-1", p.id, T(31)).ok);
  assert.deepEqual(steps("cancelled"), [["Claim submitted", "done"], ["Cancelled by you", "stop"]]);
  assert.deepEqual(claimSteps("pending", []).map((x) => x.at), ["", "", ""], "nothing is made up when the timeline is empty");
});

test("the card: a Pending code is masked with an eye and no Copy, the card leads to its promotion, View opens the steps", () => {
  const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const html = read("src/partials/promotions-app.html");
  const res = read("src/features/promotions/resident.js");
  const start = html.indexOf('<template id="t-reward">');
  const card = html.slice(start, html.indexOf("</template>", start));
  assert.ok(card.includes("data-reveal") && card.includes("size-11"), "an eye of 44 px");
  assert.ok(card.includes("Copy code") && card.includes("h-11"), "Copy code of 44 px");
  assert.ok(card.includes("Code will be available after staff approval."));
  assert.ok(/data-view[^\n]*ml-auto/.test(card), "View at the bottom right");
  assert.ok(!card.includes("<details") && !card.includes("data-timeline"), "the terms and the timeline are in the steps window, not on the card");
  assert.ok(res.includes('bindCode($("[data-code]", li), $("[data-reveal]", li), r.code, approved ? "clear" : waiting ? "masked" : "none");'));
  assert.ok(res.includes('$("[data-copy]", li).hidden = !(approved && r.group === "active");'));
  assert.ok(res.includes('goToCard(r.id, "rewards")') && res.includes("li.dataset.go = String(canGo);"), "the whole card leads to its promotion");
  assert.ok(res.includes('if (!e.target.closest("button, a, output, input, summary")) goToCard'), "its own buttons do not");
  assert.ok(res.includes("if (waiting || !canGo) openClaim(r.id);") && res.includes('openDialog(r.id, null, "rewards");'), "View: the steps while it waits, the promotion itself otherwise");
  assert.ok(html.includes('<dialog id="dlg-steps"') && html.includes('id="cl-steps"'));
});

test("the deal window follows the same rule as the card: masked with an eye and no Copy while Pending, clear with Copy once approved, none when refused, cancelled or someone else's", () => {
  const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const html = read("src/partials/promotions-app.html");
  const res = read("src/features/promotions/resident.js");
  assert.ok(html.includes('id="dlg-reveal"') && html.includes('id="dlg-pending"') && html.includes("Code will be available after staff approval."));
  assert.ok(res.includes('const mode = mate ? "none" : key === "verified" || key === "redeemed" ? "clear" : key === "pending" ? "masked" : "none";'));
  assert.ok(res.includes('paintCode($("#dlg-code"), $("#dlg-reveal"), shown.code, mode, dlgShown);'));
  assert.ok(res.includes('$("#dlg-copy").hidden = mode !== "clear";') && res.includes('$("#dlg-pending").hidden = mode !== "masked";'));
  assert.ok(res.includes('"Claimed. Your code unlocks after staff approval."'), "the toast no longer says the code is below");
  assert.ok(res.includes("dlgShown = false;"), "a new promotion opens with its code hidden");
});
