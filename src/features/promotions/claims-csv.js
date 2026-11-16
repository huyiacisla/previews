// The claims export for Staff: one row for every real claim a resident made in the app, as a clean CSV for an outside system (AIM, Salesforce).
// Pure functions over a storage object, so node --test can run them. It reads the same keys the app writes and nothing else:
//   "eso-res-promo:<residentId>"  { v?, saved, claims: { <promoId>: { count, code, codes?: { <n>: code }, at, who?: { name, unit }, cancelled?: [n], cancelledAt?: { <n>: ISO } } }, log: [{ t, p, k, n }] }
//   "eso-pm-claimstate"           { "<residentId>|<promoId>|<n>": { st: verified | redeemed | rejected, at, vt?, jt?, rt?, by? } }
//   "eso-pm-audit-v1"             { v: 1, events: [{ type, promoId, residentId, n, actor, at }] }
// The resident records are found by looking through the storage for their keys (so a resident the code has never heard of is in it too), and the Staff inbox is not needed:
// the export is complete even if nobody has opened it. Rows made by the inbox's own demo generator are not in those keys, so they are not exported.

import { readAudit } from "./audit.js";
import { allRecords, KEY, residentState } from "./store.js";

export const CLAIM_CSV_COLUMNS = ["Claim_ID", "Unique_Code", "Promo_ID", "Promo_Title", "Resident_ID", "Unit", "Status", "Claimed_At", "Decision_By", "Updated_At"];
const PREFIX = "eso-res-promo:";
const MAX_CLAIMS_PER_PROMOTION = 1000; // a damaged `count` must not make a million rows

const keysOf = (storage) => {
  try {
    if (storage && typeof storage.key === "function" && Number.isInteger(storage.length)) return Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k) => typeof k === "string");
    if (storage && typeof storage.keys === "function") return [...storage.keys()].filter((k) => typeof k === "string");
  } catch {
    /* a storage that cannot be listed gives an empty export, not an error */
  }
  return [];
};

const readObject = (storage, key) => {
  try {
    const v = JSON.parse(storage.getItem(key));
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
};

const ms = (v) => {
  const n = typeof v === "number" ? v : Date.parse(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const iso = (t) => (t > 0 ? new Date(t).toISOString() : "");

// "Jordan Lee (stf-1)": the name, and the member's id when the decision recorded it
const who = (d) => (d ? `${d.by}${typeof d.byId === "string" && d.byId ? ` (${d.byId})` : ""}` : "");

/** One object per real claim, newest first: the cells of CLAIM_CSV_COLUMNS, as text. */
export function collectClaimRows(storage) {
  const states = readObject(storage, KEY.claimState);
  const audit = readAudit(storage);
  const titles = new Map();
  for (const r of allRecords(storage)) if (r && r.x) titles.set(String(r.id), String(r.x.title || "").slice(0, 100));
  const rows = [];
  for (const key of keysOf(storage)) {
    if (!key.startsWith(PREFIX) || key.length === PREFIX.length) continue;
    const rid = key.slice(PREFIX.length);
    const st = residentState(storage, rid);
    for (const [pid, c] of Object.entries(st.claims)) {
      const top = Math.min(c.count, MAX_CLAIMS_PER_PROMOTION);
      for (let n = 1; n <= top; n += 1) {
        const claimKey = `${rid}|${pid}|${n}`;
        const s = states[claimKey] && typeof states[claimKey] === "object" ? states[claimKey] : null;
        const cancelled = Array.isArray(c.cancelled) && c.cancelled.includes(n);
        const status = cancelled ? "cancelled" : s && ["verified", "redeemed", "rejected"].includes(s.st) ? s.st : "pending";
        const mine = audit.filter((e) => e.residentId === rid && e.promoId === pid && e.n === n);
        // the moment of the claim: the resident's own record of it (a claim made before the record existed has only the newest one's time)
        const claimedEvent = st.log.find((e) => e && e.k === "claimed" && String(e.p) === pid && Number(e.n) === n);
        const claimedAt = ms(claimedEvent && claimedEvent.t) || (n === c.count ? ms(c.at) : 0);
        // who decided: what Staff's decision says, else the newest decision line of the audit log; a cancellation is the resident's own
        const decisions = mine.filter((e) => e.type === "verify" || e.type === "reject" || e.type === "redeem");
        const decider = cancelled ? `resident:${rid}` : status === "pending" ? "" : who(s && typeof s.by === "string" && s.by ? s : decisions.length ? { by: decisions[decisions.length - 1].actor, byId: decisions[decisions.length - 1].actorId } : null);
        const updated = Math.max(
          claimedAt,
          cancelled && c.cancelledAt && typeof c.cancelledAt === "object" ? ms(c.cancelledAt[n]) : 0,
          s ? Math.max(ms(s.at), ms(s.vt), ms(s.jt), ms(s.rt)) : 0,
          ...mine.map((e) => ms(e.at)),
        );
        const codes = c.codes && typeof c.codes === "object" && !Array.isArray(c.codes) ? c.codes : null;
        rows.push({
          Claim_ID: claimKey,
          Unique_Code: String((codes && codes[n]) || c.code || ""),
          Promo_ID: pid,
          Promo_Title: titles.get(pid) || "",
          Resident_ID: rid,
          Unit: c.who && typeof c.who.unit === "string" ? c.who.unit : "",
          Status: status,
          Claimed_At: iso(claimedAt),
          Decision_By: decider,
          Updated_At: iso(updated),
        });
      }
    }
  }
  return rows.sort((a, b) => b.Claimed_At.localeCompare(a.Claimed_At) || a.Claim_ID.localeCompare(b.Claim_ID));
}

/**
 * One CSV cell. Quoted when it holds a comma, a quote, a line break or a space at an end (RFC 4180); a cell that a spreadsheet would run as a formula
 * (it starts with = + - @, a tab or a carriage return) gets a leading apostrophe, so what comes from a person can never execute in the outside system.
 */
export function csvCell(value) {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** The file's text: a UTF-8 byte order mark (so Excel reads accents), the header, one line per row, CRLF line ends. An empty list gives the header alone. */
export function claimsCsv(rows) {
  const lines = [CLAIM_CSV_COLUMNS.join(","), ...rows.map((r) => CLAIM_CSV_COLUMNS.map((c) => csvCell(r[c])).join(","))];
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** Everything the Staff button needs: { text, count, filename } for the claims that are in the storage now. */
export function exportClaims(storage, now = new Date()) {
  const rows = collectClaimRows(storage);
  const p = (n) => String(n).padStart(2, "0");
  return { text: claimsCsv(rows), count: rows.length, filename: `eso-promotions-claims-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.csv` };
}
