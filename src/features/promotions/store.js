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
import { PERSONAS } from "../messaging/personas.js";
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

const read = (storage, key, fallback) => {
  try {
    const v = JSON.parse(storage.getItem(key));
    return v ?? fallback;
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
export function sampleRecords(storage) {
  const C = globalThis.PM_CATALOG;
  if (!C) return [];
  // What Staff turned off (a draft) or on is read each time; the list is only made again when that choice changed.
  const overrides = storage ? C.readOverrides(storage) : {};
  const edits = storage ? C.readEdits(storage) : {};
  const key = JSON.stringify([overrides, edits]);
  if (sampleCache.key !== key) sampleCache = { key, list: C.records(overrides, edits) };
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
  if (!x || rec.st === "draft") return false;
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
  const count = Number(residentState(storage, residentId).claims[promoId]?.count) || 0;
  const all = read(storage, KEY.claimState, {}) || {};
  let rejected = 0;
  let locked = false;
  for (let n = 1; n <= count; n += 1) {
    const s = all[`${residentId}|${promoId}|${n}`];
    if (s && s.st === "rejected") {
      rejected += 1;
      if (s.lock) locked = true;
    }
  }
  return { count, active: count - rejected, rejected, locked };
}

/** How many times residents claimed this promotion in this app: every resident's own claims that Staff did not reject. */
export function claimedByResidents(storage, promoId) {
  let n = 0;
  for (const p of PERSONAS) {
    if (p.role !== "resident") continue;
    n += activeClaims(storage, p.id, promoId).active;
  }
  return n;
}

function toPromo(rec, names, extra = 0) {
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
    total,
    // What Staff's record says plus what residents claimed in this app (each resident's own key): the "fully claimed" limit counts both.
    claimed: (Number(rec.claims) || 0) + (extra || 0),
    full: total > 0 && (Number(rec.claims) || 0) + (extra || 0) >= total,
    end: x.end || "",
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

/** Live promotions for this resident, newest first, filtered by free text and category. */
export function listPromotions(storage, { today = todayISO(), query = "", category = "all", viewer, samples = true } = {}) {
  if (!readConfig(storage).show) return [];
  const names = categoryNames(storage);
  const q = query.trim().toLowerCase();
  const published = read(storage, KEY.published, []);
  return [...(Array.isArray(published) ? published : []), ...(samples ? sampleRecords(storage) : [])]
    .filter((rec) => isLive(rec, today) && inAudience(rec.x, viewer))
    .map((rec) => toPromo(rec, names, claimedByResidents(storage, rec.id)))
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

export function residentState(storage, residentId) {
  const s = read(storage, KEY.mine(residentId), {}) || {};
  return { saved: new Set(Array.isArray(s.saved) ? s.saved : []), claims: s.claims && typeof s.claims === "object" ? s.claims : {} };
}

/**
 * What Staff decided about this resident's newest claim of this promotion.
 * Returns { st: 'pending' | 'verified' | 'redeemed' | 'rejected', reason } and null when the resident has not claimed it.
 */
export function claimStatus(storage, residentId, promoId) {
  const count = Number(residentState(storage, residentId).claims[promoId]?.count) || 0;
  if (!count) return null;
  const all = read(storage, KEY.claimState, {}) || {};
  // the newest claim is the one that is shown: an older rejected one does not speak for a new claim that waits
  const s = all[`${residentId}|${promoId}|${count}`];
  if (s && (s.st === "verified" || s.st === "redeemed" || s.st === "rejected"))
    return { st: s.st, reason: s.st === "rejected" ? String(s.reason || "").slice(0, 200) : "", locked: s.st === "rejected" && !!s.lock };
  return { st: "pending", reason: "", locked: false };
}

function put(storage, residentId, st) {
  return write(storage, KEY.mine(residentId), { saved: [...st.saved], claims: st.claims });
}

/** Save or unsave. Returns the new saved state, or null when the Staff turned saving off. */
export function toggleSaved(storage, residentId, id) {
  if (!readConfig(storage).save) return null;
  const st = residentState(storage, residentId);
  const now = !st.saved.has(id);
  if (now) st.saved.add(id);
  else st.saved.delete(id);
  put(storage, residentId, st);
  return now;
}

// 5 characters, no look-alikes, the same for the same resident and promotion.
function uniqueCode(prefix, residentId, id) {
  let h = 2166136261;
  for (const ch of `${residentId}|${id}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i += 1) {
    out += A[h % A.length];
    h = Math.imul(h ^ (h >>> 7), 2654435761) >>> 0;
  }
  return `${prefix}-${out}`;
}

/**
 * Claim a promotion. Static and QR promotions reveal the shared code, unique ones make a code for this resident,
 * link ones hand back the partner address. Returns { ok, code?, link?, reason? }. Claiming again returns the same result.
 */
export function claim(storage, residentId, promo, now = new Date()) {
  if (promo.full) return { ok: false, reason: "This promotion has been fully claimed." };
  const st = residentState(storage, residentId);
  const prev = st.claims[promo.id];
  const code = promo.method === "unique" ? uniqueCode(promo.prefix, residentId, promo.id) : promo.code;
  if (prev) {
    const own = activeClaims(storage, residentId, promo.id);
    if (own.locked) return { ok: false, reason: "The property team closed this claim. Contact them if you think this is a mistake." };
    // a claim Staff rejected does not count against the limit: the resident may claim again
    if (own.active >= promo.perResident) return { ok: true, again: true, code: prev.code || code, link: promo.link };
  }
  // `who` is what Staff's Claims inbox shows for this claim (a real app sends the resident's profile with the claim).
  const person = PERSONAS.find((p) => p.id === residentId);
  const who = person ? { name: person.name, unit: (person.unit && person.unit.number) || "" } : undefined;
  st.claims[promo.id] = { count: (prev ? prev.count : 0) + 1, code, at: now.toISOString(), ...(who ? { who } : {}) };
  if (!put(storage, residentId, st)) return { ok: false, reason: "Could not save your claim. Try again." };
  return { ok: true, code, link: promo.link };
}
