// Promotions as the Resident app sees them. Pure logic, no DOM, so node --test can run it.
//
// Source of truth is what Staff publish in the account-settings prototype (src/staff/account-settings.html), which keeps
//   "eso-pmc-saved"  [{ id, st, x, views, claims }]  newest first; st is draft | scheduled | active, x is the form
//   "eso-pmc-cats"   [[key, name, emoji]]            categories Staff created
//   "eso-proto"      { promoShow, promoSave, ... }   the Staff settings (Workspace > Resident promotions)
// Both apps share one origin, so a promotion published in the Staff tab shows here on the next "storage" event.
// A real app replaces this file with calls to the promotions API; the page code does not change.
//
// This file only READS what Staff published. What a resident does (save, claim) is kept per resident under
// "eso-res-promo:<residentId>" and is never written into Staff's records.

import { companyPrefs } from "../../shared/js/company-prefs.js";
import { HOUSEHOLD, PERSONAS } from "../messaging/personas.js";

// People who live with a resident (Jamie shares Alex's unit, so a promotion limited per unit counts them once): kept with the other people, in messaging/personas.js
export { HOUSEHOLD };
const PEOPLE = [...PERSONAS, ...HOUSEHOLD];
import { appendAudit, auditRaw, readAudit, restoreAudit } from "./audit.js";
import "./catalog.js"; // defines globalThis.PM_CATALOG: the sample deals Staff's page shows too (the Resident sees the running ones)

// `claimState` is written by Staff's Claims inbox: { "<residentId>|<promotionId>|<n>": { st: verified | redeemed | rejected, reason } }. Only a status; the Resident app never writes it.
export const KEY = { published: "eso-pmc-saved", cats: "eso-pmc-cats", settings: "eso-proto", claimState: "eso-pm-claimstate", mine: (id) => `eso-res-promo:${id}` };

const BUILTIN = [
  ["parking", "Parking"],
  ["moving", "Moving & Storage"],
  ["carcare", "Car care"],
  ["ev", "EV charging"],
  ["pets", "Pets"],
  ["dining", "Local dining"],
  ["services", "Services"],
];
const SEGMENTS = { members: "Members", movein: "New move-ins", pet: "Pet owners", ev: "EV drivers" };

// What a resident's record looks like on disk: { v, saved, claims, log }. `v` is the version of that shape; a record without one is the first shape and reads the same.
// A newer version is read for the fields known here and is not rewritten by an older page: put() only writes this version.
const SCHEMA = 1;
const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
// A value that is not the kind of thing the caller expects (the fallback tells which: a list or a plain object) reads as the fallback, so a broken or edited key can never throw later.
const read = (storage, key, fallback) => {
  try {
    const v = JSON.parse(storage.getItem(key));
    if (v === null || v === undefined) return fallback;
    if (Array.isArray(fallback)) return Array.isArray(v) ? v : fallback;
    if (isObj(fallback)) return isObj(v) ? v : fallback;
    return v;
  } catch {
    return fallback;
  }
};
const write = (storage, key, value) => {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

/** Local calendar date as YYYY-MM-DD, the same shape as the Staff date inputs. */
export function todayISO(now = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** The two Staff switches. Missing means on (the Staff defaults). */
export function readConfig(storage) {
  const s = read(storage, KEY.settings, {}) || {};
  // (the company can also switch Promotions off for its residents: Client > Workspace settings > Residents)
  return { show: s.promoShow !== false && companyPrefs(storage).promos, save: s.promoSave !== false };
}

function categoryNames(storage) {
  const map = new Map(BUILTIN);
  for (const c of read(storage, KEY.cats, [])) if (Array.isArray(c) && c[0]) map.set(c[0], c[1] || c[0]);
  return map;
}

/** The sample deals that are running, as records (the same ones Staff see in their list: 17 of the 27 are running). Made once, they never change by themselves. */
let sampleCache = { key: null, list: [] };

// Staff's card cover pictures and partner logos for sample deals ("<id>" = cover, "logo:<id>" = logo). Data URLs only.
export const COVERS_KEY = "eso-covers-v1";
function readCovers(storage) {
  try {
    const raw = storage && storage.getItem(COVERS_KEY);
    const o = raw ? JSON.parse(raw) : {};
    return o && typeof o === "object" && !Array.isArray(o) ? o : {};
  } catch {
    return {};
  }
}
export function sampleRecords(storage) {
  const C = globalThis.PM_CATALOG;
  if (!C) return [];
  // What Staff turned off (a draft) or on is read each time; the list is only made again when that choice changed.
  const overrides = storage ? C.readOverrides(storage) : {};
  const edits = storage ? C.readEdits(storage) : {};
  const ends = storage ? C.readEnds(storage) : {};
  const covers = readCovers(storage);
  const key = JSON.stringify([overrides, edits, covers, ends, C.clock().getTime()]);
  if (sampleCache.key !== key) {
    const list = C.records(overrides, edits, ends).map((r) => {
      const logo = covers[`logo:${r.id}`];
      const cv = covers[r.id];
      const x = { ...r.x };
      if (logo && safeSrc(logo.src)) x.plogo = logo.src;
      if (cv && safeSrc(cv.src)) Object.assign(x, { cover: cv.src, cx: cv.fx, cy: cv.fy, alt: cv.alt || "" });
      return { ...r, x };
    });
    sampleCache = { key, list };
  }
  return sampleCache.list;
}

export function offerLabel(x) {
  if (x.offerText) return String(x.offerText).slice(0, 40); // a sample deal says its price as it is ("$96/mo", "Free")
  if (x.otype === "pct") return `${x.oval || "?"}% off`;
  if (x.otype === "fixed") return `$${x.oval || "?"} off`;
  if (x.otype === "free") return "Free";
  return "Buy one, get one";
}

function audienceLabel(x) {
  if (x.au === "bld") return (x.blds || []).length ? `Building ${(x.blds || []).join(", ").replace(/Building /g, "")}` : "";
  if (x.au === "seg") return (x.segs || []).map((k) => SEGMENTS[k] || k).join(", ");
  return "";
}

/** A promotion is shown once it has started and until its end date; drafts and not-yet-started ones stay hidden. */
export function isLive(rec, today) {
  const x = rec && rec.x;
  if (!x || rec.st === "draft" || rec.st === "closed" || rec.st === "removed") return false; // closed = Staff ended it; removed = Staff took it off the list
  if (x.start && x.start > today) return false;
  if (x.end && x.end < today) return false;
  if (Array.isArray(x.ch) && x.ch.length && !x.ch.includes("In-App")) return false; // not delivered in the app
  return true;
}

// Images come from what Staff uploaded (data URLs) or an https address; anything else (javascript:, file:) is dropped.
const safeSrc = (v) => (typeof v === "string" && /^(data:image\/|https?:\/\/)/i.test(v) ? v : "");

/**
 * A resident's claims of one promotion that count: what they claimed, minus the ones Staff rejected (a rejected claim gives its place back).
 * `locked` is true when Staff rejected one of them with "Lock": the deal is really out and this resident cannot claim it again.
 */
export function activeClaims(storage, residentId, promoId) {
  const mineClaim = residentState(storage, residentId).claims[promoId];
  const count = Number(mineClaim?.count) || 0;
  const cancelled = new Set(Array.isArray(mineClaim?.cancelled) ? mineClaim.cancelled : []);
  const all = read(storage, KEY.claimState, {}) || {};
  let rejected = 0;
  let locked = false;
  for (let n = 1; n <= count; n += 1) {
    const s = all[`${residentId}|${promoId}|${n}`];
    if (cancelled.has(n) && !(s && s.st === "rejected")) rejected += 1; // cancelled by the resident
    if (s && s.st === "rejected") {
      rejected += 1;
      if (s.lock) locked = true;
    }
  }
  return { count, active: count - rejected, rejected, locked };
}

/** The other residents of this resident's unit (same unit number), not the resident. */
export function unitMates(residentId) {
  const me = PEOPLE.find((p) => p.id === residentId);
  const n = me && me.unit && me.unit.number;
  return n ? PEOPLE.filter((p) => p.role === "resident" && p.id !== residentId && p.unit && p.unit.number === n) : [];
}

/** What the other people of this unit claimed of this promotion (only claims Staff did not reject): [{ id, name, code, at, count }]. */
export function householdClaims(storage, residentId, promoId) {
  const out = [];
  for (const m of unitMates(residentId)) {
    const c = residentState(storage, m.id).claims[promoId];
    const a = activeClaims(storage, m.id, promoId);
    if (c && a.active > 0) out.push({ id: m.id, name: m.name, code: c.code || "", at: c.at || "", count: a.active });
  }
  return out;
}

/**
 * For Staff: what this resident's unit already holds that blocks them. A promotion limited per unit that someone in the unit claimed (and Staff did not reject),
 * while this resident has no claim of it: [{ promoId, title, by, at, code }]. Staff use it to refuse a second claim by the rule and not pay twice.
 */
export function unitBlocks(storage, residentId, titleOf = () => "") {
  const out = [];
  for (const rec of allRecords(storage)) {
    if (!rec.x || rec.x.limS !== "unit") continue;
    if (activeClaims(storage, residentId, rec.id).active > 0) continue;
    const by = householdClaims(storage, residentId, rec.id)[0];
    if (by) out.push({ promoId: String(rec.id), title: titleOf(rec.id) || (rec.x && rec.x.title) || "Promotion", by: by.name, at: by.at, code: by.code });
  }
  return out;
}

/** For Staff: what the other people of this resident's unit did about promotions, newest first: [{ name, at, promoId, title, label, note, tone }]. */
export function unitHistory(storage, residentId, titleOf = () => "") {
  const out = [];
  for (const m of unitMates(residentId)) for (const e of historyFor(storage, m.id, titleOf)) out.push({ ...e, name: m.name });
  return out.sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0));
}

/** How many times residents claimed this promotion in this app: every resident's own claims that Staff did not reject. */
export function claimedByResidents(storage, promoId) {
  let n = 0;
  for (const p of PEOPLE) {
    if (p.role !== "resident") continue;
    n += activeClaims(storage, p.id, promoId).active;
  }
  return n;
}

const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 864e5);

// The moment a promotion ends, as milliseconds: Staff's end date and time, or (a sample deal, whose dates count from today) the end of the day that many days from today.
function endsAtOf(x, today) {
  if (x.end) return new Date(`${x.end}T${/^\d{2}:\d{2}$/.test(x.etime || "") ? x.etime : "23:59"}:00`).getTime();
  if (Number.isFinite(x.endsIn) && x.endsIn >= 0) {
    const d = new Date(`${today}T23:59:00`);
    d.setDate(d.getDate() + x.endsIn);
    return d.getTime();
  }
  return null;
}

function toPromo(rec, names, extra = 0, today = todayISO()) {
  const x = rec.x;
  const link = x.method === "link" && /^https?:\/\//i.test(x.link || "") ? x.link : "";
  const total = Number(x.limT) > 0 ? Number(x.limT) : 0;
  return {
    id: String(rec.id),
    // Staff's fields have limits; a record that is longer (an old one, a pasted one) is cut here so a card never grows without bound.
    title: String(x.title || "Promotion").slice(0, 100),
    summary: String(x.reward || "").slice(0, 80),
    description: String(x.desc || "").slice(0, 500),
    category: { key: x.cat || "services", name: names.get(x.cat) || "Other" },
    partner: String(x.partner || "").slice(0, 120),
    partnerLogo: safeSrc(x.plogo),
    cover: safeSrc(x.cover) ? { src: x.cover, x: x.cx ?? 50, y: x.cy ?? 50, zoom: x.cz ?? 1, alt: x.alt || x.title || "" } : null,
    // A sample deal has no picture file: a colour and a symbol stand in (only a plain CSS gradient and a short text are accepted).
    visual:
      x.visual && /^linear-gradient\(135deg,#[0-9a-f]{6},#[0-9a-f]{6}\)$/i.test(x.visual.gradient || "") ? { gradient: x.visual.gradient, emoji: String(x.visual.emoji || "").slice(0, 8) } : null,
    offer: offerLabel(x),
    method: x.method || "static",
    code:
      x.method === "static" || x.method === "qr"
        ? String(x.code || "")
            .trim()
            .slice(0, 30)
        : "",
    prefix: (x.prefix || "RES").toUpperCase(),
    link,
    perResident: Math.max(1, Number(x.limR) || 1),
    // who the per-person limit counts: each resident, or everyone who lives in the same unit
    scope: x.limS === "unit" ? "unit" : "resident",
    total,
    // What Staff's record says plus what residents claimed in this app (each resident's own key): the "fully claimed" limit counts both.
    claimed: (Number(rec.claims) || 0) + (extra || 0),
    // how many are left of the total limit (null when there is no limit)
    left: total > 0 ? Math.max(0, total - ((Number(rec.claims) || 0) + (extra || 0))) : null,
    full: total > 0 && (Number(rec.claims) || 0) + (extra || 0) >= total,
    end: x.end || "",
    endShow: String(x.endShow || ""),
    // Tags for the filter: new (the badge says New, or Staff started it in the last 14 days), limited (a total limit with some left), free, days left.
    isNew: x.badge === "New" || (!rec.sample && !!x.start && daysBetween(x.start, today) >= 0 && daysBetween(x.start, today) <= 14),
    isLimited: total > 0 && !((Number(rec.claims) || 0) + (extra || 0) >= total),
    isFree: /\bfree\b|\$0\b|\$1\b/i.test(offerLabel(x)),
    endsAt: endsAtOf(x, today),
    daysLeft: Number.isFinite(x.endsIn) ? x.endsIn : x.end ? daysBetween(today, x.end) : null,
    audience: audienceLabel(x),
    terms: String(x.terms || "").slice(0, 1000),
  };
}

/**
 * Does the promotion's audience include this resident? Everyone, selected buildings, or selected segments.
 * `viewer` is { block, segments }; without one only promotions for everyone qualify.
 */
export function inAudience(x, viewer) {
  if (!x.au || x.au === "all") return true;
  if (!viewer) return false;
  if (x.au === "bld") return (x.blds || []).includes(viewer.block);
  if (x.au === "seg") return (x.segs || []).some((s) => (viewer.segments || []).includes(s));
  return false;
}

/** Every record the Resident app knows about (what Staff published and the running samples), live or not. */
export function allRecords(storage) {
  const published = read(storage, KEY.published, []);
  return [...(Array.isArray(published) ? published : []), ...sampleRecords(storage)];
}

/**
 * The Redeem box: what does this code belong to?
 * { state: "empty" | "none" | "live" | "full" | "ended" | "soon" | "audience", promo }.
 * A draft or a removed promotion answers "none": a resident is not told about what Staff have not published.
 */
export function lookupCode(storage, raw, { today = todayISO(), viewer } = {}) {
  const code = String(raw || "").trim().toUpperCase();
  if (!code) return { state: "empty" };
  if (!readConfig(storage).show) return { state: "none" };
  const rec = allRecords(storage).find((r) => r.x && (r.x.method === "static" || r.x.method === "qr") && String(r.x.code || "").trim().toUpperCase() === code);
  if (!rec || rec.st === "draft" || rec.st === "removed") return { state: "none" };
  const promo = toPromo(rec, categoryNames(storage), claimedByResidents(storage, rec.id), today);
  if (rec.st === "closed" || (rec.x.end && rec.x.end < today)) return { state: "ended", promo };
  if (rec.x.start && rec.x.start > today) return { state: "soon", promo };
  if (!inAudience(rec.x, viewer)) return { state: "audience", promo };
  return { state: promo.full ? "full" : "live", promo };
}

/** Live promotions for this resident, newest first, filtered by free text and category. */
export function listPromotions(storage, { today = todayISO(), query = "", category = "all", viewer, samples = true } = {}) {
  if (!readConfig(storage).show) return [];
  const names = categoryNames(storage);
  const q = query.trim().toLowerCase();
  const published = read(storage, KEY.published, []);
  return [...(Array.isArray(published) ? published : []), ...(samples ? sampleRecords(storage) : [])]
    .filter((rec) => isLive(rec, today) && inAudience(rec.x, viewer))
    .map((rec) => toPromo(rec, names, claimedByResidents(storage, rec.id), today))
    .filter((p) => category === "all" || p.category.key === category)
    .filter((p) => !q || [p.title, p.summary, p.description, p.partner, p.category.name].join(" ").toLowerCase().includes(q));
}

/** Categories that have at least one live promotion, for the filter row. */
export function categoriesIn(storage, today = todayISO(), viewer, samples = true) {
  const counts = new Map();
  for (const p of listPromotions(storage, { today, viewer, samples })) counts.set(p.category.key, { name: p.category.name, count: (counts.get(p.category.key)?.count || 0) + 1 });
  return [...counts].map(([key, v]) => ({ key, ...v }));
}

/* -------------------------------------------------------------- what a resident has done */

// One claim record as the code uses it: count is a whole number, cancelled a list of them, cancelledAt a plain object; anything else that is there is kept as it is.
function claimRecord(c) {
  const out = { ...c, count: Math.max(0, Math.floor(Number(c.count)) || 0) };
  if (c.cancelled !== undefined) out.cancelled = Array.isArray(c.cancelled) ? c.cancelled.filter((n) => Number.isInteger(n)) : [];
  if (c.cancelledAt !== undefined && !isObj(c.cancelledAt)) delete out.cancelledAt;
  return out;
}
export function residentState(storage, residentId) {
  const s = read(storage, KEY.mine(residentId), {});
  const claims = {};
  if (isObj(s.claims)) for (const [id, c] of Object.entries(s.claims)) if (isObj(c)) claims[id] = claimRecord(c);
  return {
    saved: new Set(Array.isArray(s.saved) ? s.saved.filter((x) => typeof x === "string" || typeof x === "number") : []),
    claims,
    log: Array.isArray(s.log) ? s.log.filter((e) => isObj(e)) : [],
  };
}

/**
 * What Staff decided about this resident's newest claim of this promotion.
 * Returns { st: 'pending' | 'verified' | 'redeemed' | 'rejected', reason } and null when the resident has not claimed it.
 */
export function claimStatus(storage, residentId, promoId) {
  const count = Number(residentState(storage, residentId).claims[promoId]?.count) || 0;
  if (!count) return null;
  const all = read(storage, KEY.claimState, {}) || {};
  const gone = residentState(storage, residentId).claims[promoId]?.cancelled;
  if (Array.isArray(gone) && gone.includes(count)) return { st: "rejected", reason: "Cancelled by you", locked: false, cancelled: true };
  // the newest claim is the one that is shown: an older rejected one does not speak for a new claim that waits
  const s = all[`${residentId}|${promoId}|${count}`];
  if (s && (s.st === "verified" || s.st === "redeemed" || s.st === "rejected"))
    return { st: s.st, reason: s.st === "rejected" ? String(s.reason || "").slice(0, 200) : "", locked: s.st === "rejected" && !!s.lock, ...(s.st !== "rejected" && s.manual ? { manual: String(s.manual).slice(0, 200) } : {}) };
  return { st: "pending", reason: "", locked: false };
}

// The resident's own record of what they did, oldest first, kept apart from the claims so that nothing is lost when a claim is made again:
// { t: ISO time, p: promotion id, k: "claimed" | "failed" | "cancelled", n: which claim, note }. The newest 200 are kept.
// Returns false when nothing was added: a failure that says what the newest entry of this promotion already says (a full deal tried again and again) is one row, not a row per click.
function note(st, ev) {
  if (ev.k === "failed") {
    const newest = [...st.log].reverse().find((e) => e && e.p === ev.p);
    if (newest && newest.k === "failed" && newest.note === ev.note) return false;
  }
  st.log = [...st.log, ev].slice(-200);
  return true;
}

/** The resident cancels a claim that is still waiting. It gives its place back (and the unit's). Staff's inbox shows it as cancelled by the resident. */
export function cancelClaim(storage, residentId, promoId, now = new Date()) {
  const st = residentState(storage, residentId);
  const c = st.claims[promoId];
  if (!c || !c.count) return { ok: false, reason: "You have not claimed this." };
  const status = claimStatus(storage, residentId, promoId);
  if (status && status.st !== "pending") return { ok: false, reason: "Only a claim that is waiting can be cancelled." };
  c.cancelled = [...(Array.isArray(c.cancelled) ? c.cancelled : []), c.count];
  c.cancelledAt = { ...(c.cancelledAt || {}), [c.count]: now.toISOString() };
  note(st, { t: now.toISOString(), p: String(promoId), k: "cancelled", n: c.count, note: "You cancelled this claim" });
  const before = auditRaw(storage);
  const logged = appendAudit(storage, { type: "give_back", promoId, residentId, n: c.count, actor: `resident:${residentId}`, reason: "Cancelled by the resident", code: c.code, at: now });
  if (!logged.ok) return { ok: false, reason: "Could not save. Try again." };
  if (put(storage, residentId, st)) return { ok: true };
  restoreAudit(storage, before);
  return { ok: false, reason: "Could not save. Try again." };
}

/**
 * The history of this resident's newest claim of a promotion, oldest first: [{ label, at, note, tone }].
 * Claimed, then what Staff decided (Verified, Redeemed, Rejected) with the times Staff published, or Cancelled by the resident.
 */
export function claimTimeline(storage, residentId, promoId) {
  const c = residentState(storage, residentId).claims[promoId];
  if (!c || !c.count) return [];
  const n = c.count;
  const s = (read(storage, KEY.claimState, {}) || {})[`${residentId}|${promoId}|${n}`];
  const ms = (v) => (Number(v) > 0 ? new Date(Number(v)).toISOString() : "");
  const out = [{ label: "Claimed", at: c.at || "", note: c.code ? `Code issued: ${c.code}` : "", tone: "wait" }];
  if (s && (s.st === "verified" || s.st === "redeemed")) out.push({ label: "Verified", at: ms(s.vt) || (s.st === "verified" ? ms(s.at) : ""), note: s.manual ? `Applied by the property team: ${String(s.manual).slice(0, 200)}` : "The property team confirmed your claim", tone: "ok" });
  if (s && s.st === "redeemed") out.push({ label: "Redeemed", at: ms(s.rt) || ms(s.at), note: "The code was used", tone: "ok" });
  const byMe = Array.isArray(c.cancelled) && c.cancelled.includes(n);
  if (s && s.st === "rejected" && !byMe) out.push({ label: "Rejected", at: ms(s.jt) || ms(s.at), note: String(s.reason || "No reason given").slice(0, 200), tone: "no" });
  if (byMe) out.push({ label: "Cancelled", at: (c.cancelledAt && c.cancelledAt[n]) || "", note: "You cancelled this claim", tone: "no" });
  return out;
}

/**
 * Everything this resident did about promotions and what came of it, newest first: [{ at, promoId, title, label, note, tone }].
 * Claims that went through, claims that did not (with the reason), cancellations, and what Staff decided (Verified, Redeemed, Rejected) with the time they decided.
 * Claims made before the record existed are rebuilt from the claim itself. titleOf(promoId) names a promotion.
 */
export function historyFor(storage, residentId, titleOf = () => "") {
  const st = residentState(storage, residentId);
  const states = read(storage, KEY.claimState, {}) || {};
  const ms = (v) => (Number(v) > 0 ? new Date(Number(v)).toISOString() : "");
  const ev = [];
  const has = new Set(st.log.filter((e) => e && e.k === "claimed").map((e) => `${e.p}|${e.n}`));
  const rows = st.log.filter((e) => e && typeof e.t === "string" && typeof e.p === "string");
  // claims from before the record: the newest claim of each promotion
  for (const [p, c] of Object.entries(st.claims)) {
    if (!c || !c.count || has.has(`${p}|${c.count}`)) continue;
    if (c.at) rows.push({ t: c.at, p, k: "claimed", n: c.count, note: c.code ? `Code issued: ${c.code}` : "" });
    if (Array.isArray(c.cancelled) && c.cancelled.includes(c.count)) rows.push({ t: (c.cancelledAt && c.cancelledAt[c.count]) || "", p, k: "cancelled", n: c.count, note: "You cancelled this claim" });
  }
  // Staff's inbox records a cancellation by the resident as a rejection: it is the same event, so it is shown once, as Cancelled
  const mine = new Set(rows.filter((e) => e.k === "cancelled").map((e) => `${e.p}|${e.n}`));
  const LABEL = { claimed: ["Claimed", "wait"], failed: ["Could not claim", "no"], cancelled: ["Cancelled", "no"] };
  for (const e of rows) {
    const [label, tone] = LABEL[e.k] || [];
    if (!label) continue;
    const title = titleOf(e.p) || "Promotion";
    ev.push({ at: e.t, promoId: e.p, title, label, note: String(e.note || "").slice(0, 200), tone });
    if (e.k !== "claimed") continue;
    const s = states[`${residentId}|${e.p}|${e.n}`];
    if (!s) continue;
    if (s.st === "verified" || s.st === "redeemed") ev.push({ at: ms(s.vt) || (s.st === "verified" ? ms(s.at) : ""), promoId: e.p, title, label: "Verified", note: s.manual ? `Applied by the property team: ${String(s.manual).slice(0, 200)}` : "The property team confirmed your claim", tone: "ok" });
    if (s.st === "redeemed") ev.push({ at: ms(s.rt) || ms(s.at), promoId: e.p, title, label: "Redeemed", note: "The code was used", tone: "ok" });
    if (s.st === "rejected" && !mine.has(`${e.p}|${e.n}`)) ev.push({ at: ms(s.jt) || ms(s.at), promoId: e.p, title, label: "Rejected", note: String(s.reason || "No reason given").slice(0, 200), tone: "no" });
  }
  return ev.sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0));
}

/** When Staff decided about this resident's newest claim of the promotion (milliseconds), or 0 while it waits. */
export function claimDecidedAt(storage, residentId, promoId) {
  const count = Number(residentState(storage, residentId).claims[promoId]?.count) || 0;
  const s = count ? (read(storage, KEY.claimState, {}) || {})[`${residentId}|${promoId}|${count}`] : null;
  return s ? Number(s.at) || 0 : 0;
}

function put(storage, residentId, st) {
  return write(storage, KEY.mine(residentId), { v: SCHEMA, saved: [...st.saved], claims: st.claims, log: st.log });
}

/** Save or unsave. Returns the new saved state, or null when the Staff turned saving off. */
export function toggleSaved(storage, residentId, id) {
  if (!readConfig(storage).save) return null;
  const st = residentState(storage, residentId);
  const was = st.saved.has(id);
  if (was) st.saved.delete(id);
  else st.saved.add(id);
  // the browser would not store it: the star stays as it was (the page shows what is really kept)
  return put(storage, residentId, st) ? !was : was;
}

// A code that belongs to one claim: random characters (no look-alikes) from the browser's secure generator, so nobody can work it out from a resident or a promotion.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 31 characters
function randomToken(len) {
  const c = globalThis.crypto;
  let out = "";
  while (out.length < len) {
    const bytes = c && c.getRandomValues ? c.getRandomValues(new Uint8Array(len * 2)) : Array.from({ length: len * 2 }, () => Math.floor(Math.random() * 256));
    for (const b of bytes) {
      if (b < 248 && out.length < len) out += CODE_ALPHABET[b % 31]; // 248 = 8 x 31: no character is likelier than another
    }
  }
  return out;
}
/** A new code for `prefix` that no claim in this app (kept in a resident's record or in the audit log) has ever had. */
export function newUniqueCode(storage, prefix) {
  const used = new Set(readAudit(storage).map((e) => e.code).filter(Boolean));
  for (const p of PEOPLE) if (p.role === "resident") for (const c of Object.values(residentState(storage, p.id).claims)) if (c.code) used.add(c.code);
  for (let i = 0; i < 20; i += 1) {
    const code = `${prefix}-${randomToken(6)}`;
    if (!used.has(code)) return code;
  }
  return `${prefix}-${randomToken(10)}`;
}

/**
 * Can this promotion be claimed right now? Looked at again from what is stored, at the moment of the claim, and not from the card the resident was looking at:
 * Staff may have paused, ended or removed it, or the last place may have gone, while the details were open.
 * Returns { block: { why, reason } } when it cannot, or { fresh } with the promotion as it is now (its limits and codes too).
 */
export function claimCheck(storage, promoId, now = new Date()) {
  const no = (why, reason) => ({ block: { why, reason } });
  if (!readConfig(storage).show) return no("off", "Promotions are not available right now.");
  const rec = allRecords(storage).find((r) => r && r.x && String(r.id) === String(promoId));
  if (!rec || rec.st === "removed") return no("gone", "This promotion is no longer available.");
  if (rec.st === "draft") return no("paused", "This promotion is paused right now. Try again later.");
  const today = todayISO(now);
  const x = rec.x;
  if (rec.st === "closed") return no("ended", "This promotion has ended.");
  if (x.start && x.start > today) return no("soon", "This promotion has not started yet.");
  if (Array.isArray(x.ch) && x.ch.length && !x.ch.includes("In-App")) return no("gone", "This promotion is no longer available.");
  const fresh = toPromo(rec, categoryNames(storage), claimedByResidents(storage, rec.id), today);
  if (fresh.endsAt !== null && fresh.endsAt <= now.getTime()) return no("ended", "This promotion has ended.");
  if (fresh.full) return no("full", "This promotion has been fully claimed.");
  return { fresh };
}

// Two claims of one promotion by one resident closer together than this are one press that arrived twice (a double click), not two claims.
const SAME_PRESS_MS = 1500;

/**
 * Claim a promotion. Static and QR promotions reveal the shared code, unique ones make a code for this resident,
 * link ones hand back the partner address. Returns { ok, code?, link?, reason? }. Claiming again returns the same result.
 */
export function claim(storage, residentId, shown, now = new Date()) {
  const st = residentState(storage, residentId); // read again here: what is stored now decides, not what the page showed
  // a claim that did not go through is part of the history too, with the reason (said once, not once per click)
  const fail = (reason, extra) => {
    if (note(st, { t: now.toISOString(), p: String(shown.id), k: "failed", note: reason })) put(storage, residentId, st);
    return { ok: false, reason, ...extra };
  };
  const checked = claimCheck(storage, shown.id, now);
  if (checked.block) return fail(checked.block.reason, { why: checked.block.why });
  const promo = checked.fresh;
  if (shown.full) return fail("This promotion has been fully claimed.", { why: "full" });
  const prev = st.claims[promo.id];
  const code = promo.method === "unique" ? "" : promo.code; // a unique code is made only when a claim is really made
  if (prev && prev.count > 0 && prev.at) {
    const since = now.getTime() - Date.parse(prev.at);
    const standing = (claimStatus(storage, residentId, promo.id) || {}).st !== "rejected"; // a claim Staff rejected or the resident cancelled is over: claiming again is real
    if (since >= 0 && since < SAME_PRESS_MS && standing) return { ok: true, again: true, code: prev.code || code, link: promo.link };
  }
  if (prev) {
    const own = activeClaims(storage, residentId, promo.id);
    if (own.locked) return fail("The property team closed this claim. Contact them if you think this is a mistake.");
    // a claim Staff rejected does not count against the limit: the resident may claim again
    if (own.active >= promo.perResident && promo.scope !== "unit") return { ok: true, again: true, code: prev.code || code, link: promo.link };
  }
  if (promo.scope === "unit") {
    // the limit is the unit's: the claims of everyone who lives there count together
    const own = activeClaims(storage, residentId, promo.id);
    const mates = householdClaims(storage, residentId, promo.id);
    const total = own.active + mates.reduce((n, m) => n + m.count, 0);
    if (total >= promo.perResident) {
      if (own.active > 0) return { ok: true, again: true, code: (prev && prev.code) || code, link: promo.link };
      const by = mates[0];
      const when = by && by.at ? new Date(by.at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
      return fail(`Your unit already claimed this${by ? `: ${by.name}${when ? ` claimed it on ${when}` : " claimed it"}` : ""}.`, { unit: by ? { by: by.name, at: by.at, code: by.code } : undefined });
    }
  }
  // `who` is what Staff's Claims inbox shows for this claim (a real app sends the resident's profile with the claim).
  const person = PEOPLE.find((p) => p.id === residentId);
  const who = person ? { name: person.name, unit: (person.unit && person.unit.number) || "" } : undefined;
  const issued = promo.method === "unique" ? newUniqueCode(storage, promo.prefix) : code;
  // `code` is the newest claim's; `codes` keeps the code of each claim by its number (a second claim has a code of its own)
  const num = (prev ? prev.count : 0) + 1;
  // what the resident cancelled before stays on the record: a new claim must not make a cancelled one count again (until Staff's inbox has taken the cancellation over, this is the only place it is kept)
  const kept = {};
  if (prev && Array.isArray(prev.cancelled)) kept.cancelled = prev.cancelled;
  if (prev && isObj(prev.cancelledAt)) kept.cancelledAt = prev.cancelledAt;
  st.claims[promo.id] = { ...kept, count: num, code: issued, codes: { ...(prev && isObj(prev.codes) ? prev.codes : {}), [num]: issued }, at: now.toISOString(), ...(who ? { who } : {}) };
  note(st, { t: now.toISOString(), p: String(promo.id), k: "claimed", n: st.claims[promo.id].count, note: issued ? `Code issued: ${issued}` : "" });
  // the audit log first, the record second: if the record cannot be saved the log is put back, so the two never disagree
  const before = auditRaw(storage);
  const logged = appendAudit(storage, { type: "claim", promoId: promo.id, residentId, n: st.claims[promo.id].count, actor: `resident:${residentId}`, code: issued, at: now });
  if (!logged.ok) return { ok: false, reason: "Could not save your claim. Try again." };
  if (!put(storage, residentId, st)) {
    restoreAudit(storage, before);
    return { ok: false, reason: "Could not save your claim. Try again." };
  }
  return { ok: true, code: issued, link: promo.link };
}
