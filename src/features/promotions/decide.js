// What Staff decide about a claim, from the chat or from the Claims inbox: confirm it, apply it by hand (Override, with a reason) or reject it (with a reason).
// One place writes it, so the resident, the chat and the inbox always say the same thing. Pure functions over a storage object.

import { claimStatus, KEY, residentState } from "./store.js";

const INBOX = "eso-pmclaims"; // Staff's Claims inbox (the inbox page keeps it and publishes what the resident may see into KEY.claimState)

const readJson = (storage, key, fallback) => {
  try {
    const v = JSON.parse(storage.getItem(key));
    return v === null || v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
};

/** Words for what Staff did, said to the resident in the chat (the System Message): { text } or null when nothing needs saying. */
export function decisionText(action, title, reason) {
  if (action === "apply") return `The property team applied your promotion "${title}" by hand: ${reason}`;
  if (action === "reject") return `The property team did not approve your claim for "${title}": ${reason}`;
  return null;
}

/**
 * action: "verify" | "apply" | "reject". apply and reject need a reason (what the resident is told).
 * Returns { ok, noop?, rk, st, reason? }. A claim that is already in the state asked for is a no-op, one that cannot go there says why.
 */
export function decideClaim(storage, { rid, promoId, action, reason = "", by = "Property team", now = Date.now() }) {
  const claim = residentState(storage, rid).claims[promoId];
  if (!claim || !claim.count) return { ok: false, reason: "This resident has no claim of this promotion." };
  const why = String(reason || "").replace(/\s+/g, " ").trim().slice(0, 200);
  if ((action === "apply" || action === "reject") && !why) return { ok: false, reason: "Say why, so the resident knows." };
  const cur = claimStatus(storage, rid, promoId);
  const rk = `${rid}|${promoId}|${claim.count}`;
  if (cur.cancelled) return { ok: false, reason: "The resident cancelled this claim." };
  const all = readJson(storage, KEY.claimState, {}) || {};
  const prev = all[rk] || null;

  if (action === "verify") {
    if (cur.st === "verified" || cur.st === "redeemed") return { ok: true, noop: true, rk, st: cur.st };
    if (cur.st !== "pending") return { ok: false, reason: "This claim was already rejected. Move it back to Pending in the Claims inbox first." };
    all[rk] = { st: "verified", reason: "", at: now, vt: now };
  } else if (action === "apply") {
    if (cur.st === "rejected") return { ok: false, reason: "This claim was rejected. Move it back to Pending in the Claims inbox first." };
    if (cur.st === "redeemed") return { ok: false, reason: "This claim was already used." };
    if (cur.manual) return { ok: true, noop: true, rk, st: cur.st };
    all[rk] = { st: "verified", reason: "", at: prev && prev.st === "verified" && prev.at ? prev.at : now, vt: (prev && prev.vt) || now, manual: why };
  } else if (action === "reject") {
    if (cur.st === "redeemed") return { ok: false, reason: "This claim was already used, it cannot be rejected." };
    if (cur.st === "rejected") return { ok: true, noop: true, rk, st: "rejected" };
    all[rk] = { st: "rejected", reason: why, at: now, jt: now };
  } else return { ok: false, reason: "Unknown action." };

  // what the resident reads
  try {
    storage.setItem(KEY.claimState, JSON.stringify(all));
  } catch {
    return { ok: false, reason: "Could not save. Try again." };
  }

  // Staff's inbox keeps the same decision (and makes the record if the inbox page has not been opened since the claim)
  const inbox = readJson(storage, INBOX, null);
  if (Array.isArray(inbox)) {
    let c = inbox.find((x) => x && x.rk === rk);
    if (!c) {
      const who = claim.who || {};
      c = { id: `r_${rk.replace(/[^a-zA-Z0-9]/g, "_")}`, rk, rid, promo: promoId, deal: promoId, name: String(who.name || "Resident").slice(0, 60), unit: String(who.unit || "—").slice(0, 12), pv: "staff", t: Date.parse(claim.at) || now, code: String(claim.code || "").slice(0, 40), st: "pending", sync: false, note: "", reason: "", meth: "app" };
      inbox.unshift(c);
    }
    const noteText = action === "apply" ? `Applied by hand (from the chat): ${why}` : action === "reject" ? `Rejected (from the chat): ${why}` : "";
    if (action === "verify") {
      c.st = "verified";
      c.vt = now;
    } else if (action === "apply") {
      if (c.st === "pending") c.vt = now;
      c.st = "verified";
      c.manual = { by, at: now, reason: why };
    } else {
      c.st = "rejected";
      c.reason = why;
      c.jt = now;
      c.sync = false;
      delete c.lock;
    }
    if (noteText) c.notes = (Array.isArray(c.notes) ? c.notes : []).concat({ by, at: now, text: noteText }).slice(-20);
    try {
      storage.setItem(INBOX, JSON.stringify(inbox));
    } catch {
      /* the resident's side is saved; the inbox catches up from it */
    }
  }
  return { ok: true, rk, st: all[rk].st };
}
