// The promotions audit log: an append-only record of every claim and every decision about one, for disputes ("who did what to which claim, when, and what happened to the spots").
// Pure functions over a storage object, so node --test can run them. Staff's Claims inbox page (a plain script) writes the same key in the same shape.
//
// "eso-pm-audit-v1" = { v: 1, events: [{ id, type, promoId, residentId, n, actor, reason, spotDelta, code, at }] }, oldest first.
//   type       claim | reject | give_back | verify | redeem   (a resident cancelling is a give_back by the resident)
//   spotDelta  claim -1, give_back +1, every other event 0: the sum over the events is how many of the deal's spots were taken in this app
//   actor      who did it: the resident ("resident:res-1") or the property team ("Dana Whitfield", "Property Manager", "Staff")
// Entries are only ever added. The newest MAX are kept, so one key cannot fill the storage of a browser.

export const AUDIT_KEY = "eso-pm-audit-v1";
export const AUDIT_VERSION = 1;
export const AUDIT_TYPES = ["claim", "reject", "give_back", "verify", "redeem"];
const MAX = 5000;

const clean = (e) =>
  e && typeof e === "object" && !Array.isArray(e) && typeof e.id === "string" && AUDIT_TYPES.includes(e.type) && typeof e.promoId === "string" && typeof e.at === "string";

/** The log, oldest first. Anything that is not a log of this version (broken JSON, another shape) reads as empty and is never thrown on. */
export function readAudit(storage) {
  try {
    const o = JSON.parse(storage.getItem(AUDIT_KEY));
    if (o && typeof o === "object" && !Array.isArray(o) && Array.isArray(o.events)) return o.events.filter(clean);
  } catch {
    /* unreadable: nothing to show */
  }
  return [];
}

const newId = () => {
  const c = globalThis.crypto;
  const r = c && c.getRandomValues ? Array.from(c.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0")).join("") : Math.random().toString(16).slice(2, 10);
  return `a_${Date.now().toString(36)}_${r}`;
};

const SPOT = { claim: -1, give_back: 1 };

/** Build an entry (not stored yet). `at` is an ISO time, a Date or milliseconds; it defaults to now. */
export function auditEntry({ type, promoId, residentId = "", n = 0, actor = "", reason = "", code = "", at }) {
  if (!AUDIT_TYPES.includes(type)) throw new Error(`audit: unknown type ${type}`);
  const t = at instanceof Date ? at.getTime() : typeof at === "number" ? at : Date.parse(at) || Date.now();
  return {
    id: newId(),
    type,
    promoId: String(promoId),
    residentId: String(residentId || ""),
    n: Number(n) || 0,
    actor: String(actor || "").slice(0, 60),
    reason: String(reason || "").replace(/\s+/g, " ").trim().slice(0, 200),
    spotDelta: SPOT[type] || 0,
    ...(code ? { code: String(code).slice(0, 40) } : {}),
    at: new Date(t).toISOString(),
  };
}

/** The raw text of the log now, so a caller that must undo a write can put it back. */
export const auditRaw = (storage) => {
  try {
    return storage.getItem(AUDIT_KEY);
  } catch {
    return null;
  }
};

/** Add entries. Returns { ok, entries }; ok is false when the browser would not store it (nothing was changed then). */
export function appendAudit(storage, ...inputs) {
  const entries = inputs.filter(Boolean).map((i) => (i && i.id && i.spotDelta !== undefined ? i : auditEntry(i)));
  if (!entries.length) return { ok: true, entries };
  const events = [...readAudit(storage), ...entries].slice(-MAX);
  try {
    storage.setItem(AUDIT_KEY, JSON.stringify({ v: AUDIT_VERSION, events }));
    return { ok: true, entries };
  } catch {
    return { ok: false, entries: [] };
  }
}

/** Put the log back as it was (`raw` from auditRaw): used when a later write of the same action failed. */
export function restoreAudit(storage, raw) {
  try {
    if (raw === null || raw === undefined) storage.removeItem(AUDIT_KEY);
    else storage.setItem(AUDIT_KEY, raw);
  } catch {
    /* nothing more can be done */
  }
}

/** How many spots the log says are taken for a promotion (claims minus give-backs). */
export const spotsTaken = (storage, promoId) => readAudit(storage).reduce((s, e) => (e.promoId === String(promoId) ? s - e.spotDelta : s), 0);
