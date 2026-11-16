import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import "../../src/features/promotions/catalog.js";
import { activeClaims, categoriesIn, claim, claimedByResidents, claimStatus, listPromotions, sampleRecords } from "../../src/features/promotions/store.js";

const C = globalThis.PM_CATALOG;
const store = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const TODAY = "2026-11-15";

test("the catalog has 29 sample deals in 7 categories and gives each a status: 17 running, 4 not started, 4 drafts, 4 ended", () => {
  const D = C.deals();
  assert.equal(
    Object.values(D).reduce((n, l) => n + l.length, 0),
    29,
  );
  const M = C.meta(D);
  const by = (st) => Object.values(M).filter((m) => m.st === st).length;
  assert.deepEqual([by("active"), by("scheduled"), by("draft"), by("expired")], [17, 4, 4, 4]);
  // Staff's tabs: Live 16 + Sold out 1 + Expired 2 + Saved 4 + Drafts 4 = 27, because 2 of the 4 ended deals are in Storage. "All" counts the published ones only (23).
  assert.equal(by("active") + by("scheduled") + by("draft") + 2, 27);
});

test('only published deals are counted: Staff\'s "All" and the category numbers leave the drafts out (23 of 27), and a draft is never in the resident view', () => {
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes('if(m.st!="draft")c.all++;'), "the All tab does not count drafts");
  assert.ok(staff.includes('if(m.st=="draft"&&(res||((!PF.tab||PF.tab=="all")&&!PF.st.includes("draft"))))return false;'), "drafts are filtered out of All, the category counts and the resident view");
  const M = C.meta(C.deals());
  const published = Object.values(M).filter((m) => m.st !== "draft").length;
  assert.equal(published - 2, 23, "29 deals, 4 drafts out, 2 moved to Storage");
});

test("a deal that is not running keeps no numbers, and its badge says why (not started, draft, ended)", () => {
  const M = C.meta(C.deals());
  for (const m of Object.values(M)) {
    if (m.st === "scheduled") {
      assert.match(m.d[2], /^Starts /);
      assert.equal(m.claims, 0);
    }
    if (m.st === "draft") {
      assert.equal(m.d[2], "Draft");
      assert.equal(m.views, 0);
    }
    if (m.st === "expired") assert.match(m.d[2], /^Ended /);
  }
});

test("the Resident sees the 17 running deals, and Staff's page carries no list of its own that could drift from them", () => {
  const list = listPromotions(store(), { today: TODAY });
  assert.equal(list.length, 17);
  assert.equal(sampleRecords().length, 17);
  assert.ok(
    list.every((p) => p.visual && p.visual.emoji),
    "each has its colour and symbol",
  );
  assert.equal(new Set(list.map((p) => p.id)).size, 17);
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.match(staff, /<!--include:promotions\/catalog\.js-->/);
  assert.ok(!staff.includes("const DEALS={parking:["), "the deals are only in promotions/catalog.js");
  assert.match(staff, /PM_CATALOG\.meta\(DEALS,/);
});

test('exactly one running deal is sold out ("Fully claimed"), one is low, and the rest are open', () => {
  const list = listPromotions(store(), { today: TODAY });
  assert.equal(list.filter((p) => p.full).length, 1);
  assert.equal(list.filter((p) => p.total > 0 && !p.full).length, 2);
  assert.equal(list.filter((p) => p.total === 0).length, 14);
  const full = list.find((p) => p.full);
  assert.equal(claim(store(), "res-1", full).ok, false);
});

test("a resident claims a sample deal like any other: the claim is theirs and is counted under the deal's id, which is what Staff's page counts", () => {
  const s = store();
  const p = listPromotions(s, { today: TODAY }).find((x) => x.total > 0 && !x.full);
  const before = claimedByResidents(s, p.id);
  const r = claim(s, "res-1", p);
  assert.equal(r.ok, true);
  assert.ok(r.code);
  assert.equal(claimedByResidents(s, p.id), before + 1);
  assert.match(p.id, /^[a-z]+\d$/, "the id is the one Staff names the deal by (parking1, ev0…)");
});

test("a deal Staff published sits next to the samples; the categories list counts both", () => {
  const rec = {
    id: "x1",
    st: "active",
    claims: 0,
    x: { title: "Rooftop night", reward: "Free entry", cat: "dining", partner: "Roof", otype: "free", method: "static", code: "ROOF1", limT: 0, limR: 1, start: "2026-11-01", end: "2026-12-01" },
  };
  const s = store({ "eso-pmc-saved": JSON.stringify([rec]) });
  const list = listPromotions(s, { today: TODAY });
  assert.equal(list.length, 18);
  assert.equal(list[0].id, "x1", "what Staff published comes first");
  const dining = (st) => categoriesIn(st, TODAY).find((c) => c.key === "dining").count;
  assert.equal(dining(s), dining(store()) + 1);
});

test("Staff's on/off choice: off hides a running sample deal from residents, on shows a draft, an ended deal stays ended, junk in the key is ignored", () => {
  const live = (st) => listPromotions(st, { today: TODAY }).map((p) => p.id);
  const base = live(store());
  assert.ok(base.includes("parking0"));
  const off = store({ "eso-pm-status": JSON.stringify({ parking0: "draft" }) });
  assert.equal(live(off).length, 16);
  assert.ok(!live(off).includes("parking0"), "a deal turned off is not in the resident list");
  const parking = (st) => categoriesIn(st, TODAY).find((c) => c.key === "parking").count;
  assert.equal(parking(off), parking(store()) - 1, "the category count follows the switch");
  // parking... n=5 is a draft (5 % 7 = 5): turning it on makes it live for residents
  const M0 = C.meta(C.deals());
  const draftId = Object.values(M0).find((m) => m.st === "draft").id;
  const on = store({ "eso-pm-status": JSON.stringify({ [draftId]: "active" }) });
  assert.ok(live(on).includes(draftId));
  assert.equal(live(on).length, 18);
  // an ended deal cannot be turned on from here
  const endedId = Object.values(M0).find((m) => m.st === "expired").id;
  assert.ok(!live(store({ "eso-pm-status": JSON.stringify({ [endedId]: "active" }) })).includes(endedId));
  // only known ids and the two choices are read
  assert.deepEqual(C.readOverrides(store({ "eso-pm-status": JSON.stringify({ parking0: "hack", "../x": "draft", ev3: "draft", a: "draft" }) })), { ev3: "draft" });
  assert.deepEqual(C.readOverrides(store({ "eso-pm-status": "[1,2]" })), {});
  assert.deepEqual(C.readOverrides(store({ "eso-pm-status": "not json" })), {});
});

test('Staff\'s switch is a Staff-only button at the top of the card, with words and a role="switch", and it is caught before the card opens', () => {
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes('${res||!m.id?"":pmVisBtn(m,br)}'), "not drawn in the resident view");
  assert.match(staff, /role="switch" aria-checked=/);
  assert.match(staff, /on:"Live",wait:"Scheduled",off:"Off live",ended:"Ended"/);
  assert.ok(staff.includes("window.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-pmvis]')"), "caught on window, before the card's own handlers");
  assert.ok(staff.includes('!t.closest("[data-pmvis]")&&!t.closest(".stf")'), "the card does not open when the switch is pressed");
  assert.ok(!/\.pmv\{[^}]*font:600 12px\/16px inherit/.test(staff), 'a font shorthand with "inherit" is dropped by the browser, and the label came out huge');
  // the same switch inside the deal's detail box, Staff only (skipped in the resident view), shared helper so the two can never differ
  assert.ok(staff.includes("window._pmVisBtn=pmVisBtn;"));
  assert.ok(staff.includes("if(!box||(window._pm&&_pm.res))return;"), "no switch in the box in the resident view");
  assert.match(staff, /row\.innerHTML='<span>Shown to residents<\/span>'\+_pmVisBtn\(m,m\.d\[0\]\)/);
  // the card is followed: after a change Staff land on the tab it moved to, at its card, marked for a moment
  assert.ok(staff.includes("window._pmTabOf=pmTabOf;"));
  assert.ok(staff.includes("follow(id,kb);"), "toggle() follows the deal");
  assert.ok(staff.includes("c.classList.add('pmv-flash')"));
  assert.ok(staff.includes("@media(prefers-reduced-motion:reduce){.pd.pmv-flash{animation:none}}"), "no animation for reduced motion");
  // a deal scheduled for a date is live from that date in Staff's list too (the Resident app already shows it then): Saved becomes Live
  assert.ok(staff.includes('s.st==="scheduled"&&s.x&&s.x.start&&s.x.start<=todayISO?"active":s.st'));
  // keyboard: the list is drawn again after a change, so focus goes to the new switch (card and box); the words stay on touch screens too
  assert.ok(staff.includes("document.activeElement.closest('[data-pmvis]')"), "the focused switch is remembered");
  assert.ok(staff.includes("var nb=document.querySelector('#pdd .pmv');if(nb)nb.focus()"), "focus returns to the switch in the box");
  assert.ok(staff.includes("if(refocus){var s=c.querySelector('.pmv');if(s)s.focus({preventScroll:true})}"), "focus follows the card to its new tab");
  assert.ok(!/@media\(pointer:coarse\)\{\.pmv\{[^}]*\}\.pmv-t\{display:none\}\}/.test(staff), "no icon-only switch on touch screens: Live / Off live must be readable");
  // 1,000 deals: off-screen cards are skipped, and the follow looks again until a long list is drawn (and scrolls at once before it focuses)
  assert.ok(staff.includes(".pd{content-visibility:auto;contain-intrinsic-size:auto 260px 400px}"));
  assert.ok(staff.includes("if(++tries<50)setTimeout(look,100)"), "follow waits for a long list");
  assert.ok(staff.includes("behavior:refocus||window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'"), "focus needs the card on screen: no smooth scroll when refocusing");
  // "Show more": a category over 60 deals draws 60 and a button; counts stay true; the rest opens by a count, never by what is on screen; follow() and links reveal a hidden card
  assert.ok(staff.includes("const shown=list.length>MR.page?Math.min(list.length,MR.shown[k]||MR.page):list.length;"), "at 60 or fewer nothing changes");
  assert.ok(staff.includes('<small>${list.length} ${list.length==1?"deal":"deals"}</small>'), "the number in the title is the real count");
  assert.ok(staff.includes("if(MR.sig!==sig){MR.sig=sig;MR.shown={}}"), "a filter, tab, search or sort starts again");
  assert.ok(staff.includes("window._pmReveal=function(id){"), "a card that is not drawn yet can be opened by id");
  assert.ok(staff.includes("if(!c&&window._pmReveal&&_pmReveal(id))c="), "follow() opens it");
  assert.ok(staff.includes('role="status" aria-live="polite">${left?`Showing ${s.shown} of ${s.list.length}`'), "a screen reader hears how many are shown");
  assert.ok(staff.includes('aria-label="Show ${next} more promotions in ${H(C[1])}, ${left} not shown yet"'), "the button says what it opens");
  // every change of the switch is kept with its time, and shown in the box; only the switch writes it
  assert.ok(staff.includes("var LK='eso-pm-vislog';"));
  assert.ok(staff.includes("note(id,m.st==='draft'?'off':m.st==='scheduled'?'scheduled':'on');"), "toggle() writes one entry per change");
  assert.ok(staff.includes("Visibility history ("), "the box shows the history");
  const resident = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(!resident.includes("eso-pm-vislog"), "residents never read the history");
  assert.ok(!/pmvis|pmv-/.test(resident), "the resident app has no on/off switch");
});

test("a resident's claim keeps who made it (for Staff's Claims inbox), and Staff's inbox, the Resident app and the day change are wired", () => {
  const s = store();
  const p = listPromotions(s, { today: TODAY }).find((x) => x.total > 0 && !x.full);
  assert.equal(claim(s, "res-1", p).ok, true);
  const rec = JSON.parse(s.getItem("eso-res-promo:res-1")).claims[p.id];
  assert.deepEqual(rec.who, { name: "Alex Rivera", unit: "02-291" });
  assert.equal(claim(s, "nobody", p).ok, true, "an unknown resident can still claim; there is just no name");
  assert.equal(JSON.parse(s.getItem("eso-res-promo:nobody")).claims[p.id].who, undefined);
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes("function fromRes(){"), "Staff builds inbox claims from the residents' records");
  assert.ok(staff.includes("if(CL.some(x=>x.rk===rk))continue;"), "once each");
  assert.ok(staff.includes('c.deal==id&&c.st!="rejected"&&!c.rid'), "a resident claim is not counted twice in the stock numbers");
  assert.ok(staff.includes('c.rid&&c.st=="rejected"'), "rejecting a resident claim frees its place");
  assert.ok(staff.includes("sv();fromRes()}}"), "a reset of the inbox keeps the real claims");
  assert.ok(staff.includes("function atMidnight(){"));
  const resident = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(resident.includes("e.key === globalThis.PM_CATALOG.STATUS_KEY"), "switching a sample deal in Staff reaches an open Resident page");
  assert.ok(resident.includes("renderAtMidnight();"));
});

test("a resident sees what Staff decided about their claim: waiting, confirmed, used, or not approved with the reason", () => {
  const s = store();
  const p = listPromotions(s, { today: TODAY }).find((x) => x.total > 0 && !x.full);
  assert.equal(claimStatus(s, "res-1", p.id), null, "not claimed yet: nothing to say");
  claim(s, "res-1", p);
  assert.deepEqual(claimStatus(s, "res-1", p.id), { st: "pending", reason: "", locked: false });
  const put = (o) => s.setItem("eso-pm-claimstate", JSON.stringify(o));
  put({ [`res-1|${p.id}|1`]: { st: "verified", reason: "" } });
  assert.equal(claimStatus(s, "res-1", p.id).st, "verified");
  put({ [`res-1|${p.id}|1`]: { st: "redeemed", reason: "" } });
  assert.equal(claimStatus(s, "res-1", p.id).st, "redeemed");
  put({ [`res-1|${p.id}|1`]: { st: "rejected", reason: "Not a current resident at this unit" } });
  assert.deepEqual(claimStatus(s, "res-1", p.id), { st: "rejected", reason: "Not a current resident at this unit", locked: false });
  // another resident's decision is not mine; unknown words and junk are ignored
  put({ [`res-2|${p.id}|1`]: { st: "rejected", reason: "x" } });
  assert.equal(claimStatus(s, "res-1", p.id).st, "pending");
  put({ [`res-1|${p.id}|1`]: { st: "hack", reason: "<b>" } });
  assert.equal(claimStatus(s, "res-1", p.id).st, "pending");
  s.setItem("eso-pm-claimstate", "not json");
  assert.equal(claimStatus(s, "res-1", p.id).st, "pending");
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes("function publish(){"), "Staff publishes the status of every decided claim");
  assert.ok(staff.includes('c.st==="rejected"?String(c.reason||"").slice(0,200):""'), "only a rejected claim carries its reason");
  const resident = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(resident.includes("e.key === KEY.claimState"), "an open dialog follows Staff's decision");
  assert.ok(!resident.includes("setItem(KEY.claimState"), "the Resident app only reads the status");
});

test('a claim Staff rejected gives its place back: the resident claims again, the numbers follow, and "Lock" closes it for good', () => {
  const s = store();
  const p = listPromotions(s, { today: TODAY }).find((x) => x.total > 0 && !x.full && x.perResident === 1);
  const first = claim(s, "res-1", p);
  assert.equal(first.ok, true);
  assert.equal(claim(s, "res-1", p).again, true, "a second try while the claim stands just shows the same code");
  const used = claimedByResidents(s, p.id);
  const put = (o) => s.setItem("eso-pm-claimstate", JSON.stringify(o));
  put({ [`res-1|${p.id}|1`]: { st: "rejected", reason: "No" } });
  assert.deepEqual(activeClaims(s, "res-1", p.id), { count: 1, active: 0, rejected: 1, locked: false });
  assert.equal(claimedByResidents(s, p.id), used - 1, "the rejected claim does not use the stock");
  const again = claim(s, "res-1", p);
  assert.equal(again.ok, true);
  assert.notEqual(again.again, true, "a real new claim, not the old code shown again");
  assert.equal(JSON.parse(s.getItem("eso-res-promo:res-1")).claims[p.id].count, 2);
  assert.equal(claimStatus(s, "res-1", p.id).st, "pending", "the new claim waits for Staff");
  assert.equal(activeClaims(s, "res-1", p.id).active, 1);
  // a limit still holds after the new claim
  assert.equal(claim(s, "res-1", p).again, true);
  // Staff locks the second one too: closed for good
  put({ [`res-1|${p.id}|1`]: { st: "rejected", reason: "No" }, [`res-1|${p.id}|2`]: { st: "rejected", reason: "Out", lock: true } });
  assert.equal(activeClaims(s, "res-1", p.id).locked, true);
  const closed = claim(s, "res-1", p);
  assert.equal(closed.ok, false);
  assert.match(closed.reason, /closed this claim/);
  assert.equal(claimStatus(s, "res-1", p.id).locked, true);
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes('...(c.st==="rejected"&&c.lock?{lock:true}:{})'), "Staff publishes the lock");
});

test("the resident gets a notice when Staff decides a claim: confirmed, used, or not approved with the reason, dated, once each, only theirs", async () => {
  const { promoItems, liveItems } = await import("../../src/features/notifications/live.js");
  const s = store();
  const p = listPromotions(s, { today: TODAY }).find((x) => x.total > 0 && !x.full);
  const NOW = Date.parse("2026-11-15T12:00:00");
  const me = { id: "res-1", name: "Alex Rivera" };
  claim(s, "res-1", p);
  assert.deepEqual(promoItems(s, "resident", me, NOW), [], "waiting is not news");
  const put = (o) => s.setItem("eso-pm-claimstate", JSON.stringify(o));
  put({ [`res-1|${p.id}|1`]: { st: "verified", reason: "", at: NOW - 60000 } });
  let items = promoItems(s, "resident", me, NOW);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Your claim was confirmed");
  assert.match(items[0].detail, new RegExp(p.title));
  assert.equal(items[0].cat, "promotions");
  assert.equal(items[0].dest, "promotions");
  assert.equal(items[0].read, false);
  assert.equal(items[0].id, `promo-res-1|${p.id}|1|verified`, "a stable id, so the read state keeps working; a new decision is a new id, so it is unread again");
  put({ [`res-1|${p.id}|1`]: { st: "rejected", reason: "Wrong unit", at: NOW - 60000 } });
  items = promoItems(s, "resident", me, NOW);
  assert.equal(items[0].title, "Your claim was not approved");
  assert.match(items[0].detail, /Wrong unit/);
  put({ [`res-1|${p.id}|1`]: { st: "redeemed", reason: "", at: NOW - 60000 } });
  assert.equal(promoItems(s, "resident", me, NOW)[0].title, "Your claim was marked as used");
  // not theirs, not a resident, too old, no date, junk
  put({ [`res-2|${p.id}|1`]: { st: "verified", at: NOW - 1000 } });
  assert.deepEqual(promoItems(s, "resident", me, NOW), []);
  put({ [`res-1|${p.id}|1`]: { st: "verified", at: NOW - 1000 } });
  assert.deepEqual(promoItems(s, "staff", me, NOW), [], "only residents are told");
  put({ [`res-1|${p.id}|1`]: { st: "verified", at: NOW - 8 * 86400000 } });
  assert.deepEqual(promoItems(s, "resident", me, NOW), [], "older than a week");
  put({ [`res-1|${p.id}|1`]: { st: "verified" } });
  assert.deepEqual(promoItems(s, "resident", me, NOW), [], "no date, no notice");
  put({ [`res-1|${p.id}|1`]: { st: "hack", at: NOW } });
  assert.deepEqual(promoItems(s, "resident", me, NOW), []);
  s.setItem("eso-pm-claimstate", "[1]");
  assert.deepEqual(promoItems(s, "resident", me, NOW), []);
  // it joins the other live items
  put({ [`res-1|${p.id}|1`]: { st: "verified", at: NOW - 1000 } });
  assert.equal(liveItems({ role: "resident", me, store: null, storage: s, now: NOW }).filter((n) => n.live === "promo").length, 1);
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes("at:o&&o.st===c.st&&o.at?o.at:Date.now()"), "Staff dates a decision once and keeps the date");
  const live = readFileSync(new URL("../../src/features/notifications/live.js", import.meta.url), "utf8");
  assert.ok(live.includes("eso-(feed|res-|pm-claimstate)"), "an open bell hears about a decision");
});

test('what Staff changes with "Edit details" is what the resident reads: sample deals through eso-pmedits, deals Staff made through their record', () => {
  const edit = { parking0: { o: {}, d: ["Mallard Valet Plus", "25% off valet", null, "$89/mo"], code: "VALET25" } };
  const s = store({ "eso-pmedits": JSON.stringify(edit) });
  const list = listPromotions(s, { today: TODAY });
  const p = list.find((x) => x.id === "parking0");
  assert.equal(p.title, "Mallard Valet Plus");
  assert.equal(p.summary, "25% off valet");
  assert.equal(p.offer, "$89/mo");
  assert.equal(p.code, "VALET25");
  assert.equal(list.length, 17, "an edit does not add or remove a deal");
  assert.equal(listPromotions(store(), { today: TODAY }).find((x) => x.id === "parking0").title, "Mallard Pointe Valet", "no edit, the catalog's own title");
  // junk is made safe: unknown ids, wrong shapes, long text, bad codes
  const junk = C.readEdits(store({ "eso-pmedits": JSON.stringify({ "bad id": { d: ["x"] }, ev0: { d: ["T".repeat(200), 5, null, "P".repeat(80)], code: "a b" }, pets1: "x", pets2: { d: "no" } }) }));
  assert.deepEqual(Object.keys(junk).sort(), ["ev0", "pets2"]);
  assert.equal(junk.ev0.title.length, 60);
  assert.equal(junk.ev0.reward, "");
  assert.equal(junk.ev0.price.length, 30);
  assert.equal(junk.ev0.code, "", "a code that is not 3 to 20 letters, numbers or dashes is dropped");
  assert.deepEqual(C.readEdits(store({ "eso-pmedits": "[1]" })), {});
  assert.deepEqual(C.readEdits(store({ "eso-pmedits": "nope" })), {});
  // the same edit made again is not cached wrong: a new edit shows at once
  s.setItem("eso-pmedits", JSON.stringify({ parking0: { d: ["Third Title", "x", null, "$1"] } }));
  assert.equal(listPromotions(s, { today: TODAY }).find((x) => x.id === "parking0").title, "Third Title");
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes("const recSync=(m,title,offer,price,code,orig)=>{"), "Edit details also writes the published record");
  assert.ok(staff.includes("recSync(x,title,offer,price,code,ED[id].o);"));
  assert.ok(staff.includes('recSync(m[id],o.d[0],o.d[1],o.d[3],o.code||"",o)'), "Revert goes back in the record too");
  assert.ok(staff.includes('Category can’t change after publishing."'), "the reason a category is locked is written on the page, not only in a tooltip");
  const resident = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(resident.includes("globalThis.PM_CATALOG.EDITS_KEY"), "an open Resident page follows an edit");
});

test('the Staff switch "show promotions" hides the samples too', () => {
  const s = store({ "eso-proto": JSON.stringify({ promoShow: false }) });
  assert.equal(listPromotions(s, { today: TODAY }).length, 0);
});
