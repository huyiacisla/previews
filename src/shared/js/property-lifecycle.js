// When a property stops working with EasySpotOps. Pure logic, no DOM, so node --test can run it.
//
// The rules (from the project owner, 2026-11-15):
//  - The property ends: the accounts tied to it are cut, and so is its data. Every Resident is signed out with "Sorry, you no longer have access."
//    A person who is still with the client but moved to another property takes their Social with that property; the old property's data stays cut.
//    A Staff or Client person loses access when the property is no longer in the client's chain of properties.
//  - A new owner who picks the property up starts from nothing: nothing of the old data comes back; it is a new property.
//
// What this file does about it:
//  - endProperty(): records the end and SEALS the property's Social data: the keys the apps read are moved under "eso-sealed:<id>:…", where no page
//    reads them. Nothing is deleted yet (a person cannot undo a delete, and how long to keep sealed data is still a decision for the owner).
//  - A property added in Capacity is marked ended there too: it is neither counted nor charged.
//  - startOver() is the new owner: for the first property it lifts the end, and because the old keys are sealed the Social starts empty.
//    Another property cannot be started over: its place is taken by a new property with a new id (the Capacity flow).
//  - hasLostAccess() is what the Resident and Staff pages ask.

import { normalizePurchased } from "../../features/capacity/store.js";
import { propertyName } from "./property-name.js";

export const LIFE_KEY = "eso-property-lifecycle";
export const NO_ACCESS = "Sorry, you no longer have access.";
export const MAIN = "main";
const CAPACITY_KEYS = ["eso-capacity:client", "capacity-state:client"];

const read = (storage, key) => {
  try {
    return JSON.parse(storage.getItem(key));
  } catch {
    return null;
  }
};
const readLife = (storage) => {
  const v = read(storage, LIFE_KEY);
  return v && typeof v === "object" && v.ended && typeof v.ended === "object" ? v : { ended: {} };
};

/** Every key of a storage (the preview's storages list their own; the browser's is walked). */
export function allKeys(storage) {
  try {
    if (typeof storage.keys === "function") return [...storage.keys()];
    return Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k) => typeof k === "string");
  } catch {
    return [];
  }
}

/** The Social keys of one property: the first property's are the plain ones, another's carry its id (social/scope.js). */
export function socialKeysOf(storage, id) {
  const keys = allKeys(storage);
  if (id === MAIN) return keys.filter((k) => k === "eso-feed" || k === "eso-social" || /^eso-res-social:[^:]+$/.test(k));
  return keys.filter((k) => k === `eso-feed:${id}` || k === `eso-social:${id}` || k.startsWith(`eso-res-social:${id}:`));
}

/**
 * Everything of one property that is the property's own and is kept in this browser: its Social, its promotions (what Staff published and what each
 * Resident claimed), and what each Resident chose and did (privacy, preferences, what they have seen). Only the first property has the last two groups:
 * Staff and Resident belong to it. Not here, on purpose: Messages (one shared document with Admin's support tickets, see docs/qa/09), and Documents
 * (they belong to the company, not to the property).
 */
export function propertyKeysOf(storage, id) {
  const social = socialKeysOf(storage, id);
  if (id !== MAIN) return social;
  const more = allKeys(storage).filter((k) => /^eso-pmc-(saved|cats|draft)$/.test(k) || /^eso-res-(promo|social-seen|privacy|privacy-log|pref):[^:]+$/.test(k));
  return [...social, ...more];
}

export const isEnded = (storage, id = MAIN) => !!readLife(storage).ended[id];
export const endedRecord = (storage, id = MAIN) => readLife(storage).ended[id] || null;
/** The first property is the one the Staff and Resident apps belong to: when it has ended, nobody there gets in. */
export const hasLostAccess = (storage) => isEnded(storage, MAIN);

/** Tell the plan (Capacity) that a property left, or came back as a new owner's: the first property is a flag, another is marked on its own entry. */
function markInCapacity(storage, id, now, { ended = true } = {}) {
  for (const key of CAPACITY_KEYS) {
    const raw = read(storage, key);
    if (!raw && id !== MAIN) continue;
    const p = normalizePurchased(raw);
    if (id === MAIN) {
      if (ended) p.primaryEnded = true;
      else delete p.primaryEnded;
    } else {
      const hit = p.properties.find((x) => x.id === id);
      if (!hit) continue;
      hit.status = "ended";
      hit.endedAt = now;
    }
    try {
      storage.setItem(key, JSON.stringify(p));
    } catch {
      /* storage full: the Admin list still says it ended */
    }
  }
}

/** End a property: seal its Social data, record it, and take it out of the account. Returns { ok, sealed } or { ok: false, reason }. */
export function endProperty(storage, id, { by = "Admin", name = "", now = Date.now() } = {}) {
  if (!id) return { ok: false, reason: "no_property" };
  if (isEnded(storage, id)) return { ok: false, reason: "already_ended" };
  const keys = propertyKeysOf(storage, id);
  try {
    for (const k of keys) {
      const v = storage.getItem(k);
      if (v != null) storage.setItem(`eso-sealed:${id}:${k}`, v);
    }
    for (const k of keys) storage.removeItem(k);
    const life = readLife(storage);
    life.ended[id] = { at: now, by, name };
    storage.setItem(LIFE_KEY, JSON.stringify(life));
  } catch {
    return { ok: false, reason: "storage" };
  }
  markInCapacity(storage, id, now);
  return { ok: true, sealed: keys.length };
}

/** The client's portfolio as the Capacity page shows it: the properties still in it, and the ones removed (newest first). */
export function portfolio(storage) {
  const p = normalizePurchased(read(storage, "eso-capacity:client") || read(storage, "capacity-state:client"));
  const life = readLife(storage).ended;
  const active = [];
  if (!life[MAIN] && !p.primaryEnded) active.push({ id: MAIN, name: propertyName(storage), main: true });
  for (const x of p.properties) if (x.status !== "ended" && !life[x.id]) active.push({ id: x.id, name: x.name, units: x.units, address: x.address, main: false });
  const removed = Object.entries(life)
    .map(([id, r]) => ({ id, name: r.name || (id === MAIN ? propertyName(storage) : (p.properties.find((x) => x.id === id) || {}).name) || "Property", at: r.at, by: r.by }))
    .sort((a, b) => b.at - a.at);
  return { active, removed };
}

/**
 * The client takes a property out of its portfolio. It is the same end as Admin's: the people of the property are signed out and its Social is cut off.
 * The last property cannot be removed: that would close the account, which is a different thing (a conversation with Support).
 */
export function removeFromPortfolio(storage, id, { by = "Client", now = Date.now() } = {}) {
  const { active } = portfolio(storage);
  const target = active.find((x) => x.id === id);
  if (!target) return { ok: false, reason: "not_in_portfolio" };
  if (active.length <= 1) return { ok: false, reason: "last_property" };
  return endProperty(storage, id, { by, name: target.name, now });
}

/** A new owner takes the first property over: it is open again and its Social starts empty. The old data stays sealed and is never read again. */
export function startOver(storage, id = MAIN, { now = Date.now() } = {}) {
  if (id !== MAIN) return { ok: false, reason: "new_property" }; // another property is replaced by a new one (Capacity), with a new id and a new feed
  if (!isEnded(storage, id)) return { ok: false, reason: "not_ended" };
  try {
    const life = readLife(storage);
    life.history = [...(Array.isArray(life.history) ? life.history : []), { id, ...life.ended[id], reopenedAt: now }];
    delete life.ended[id];
    storage.setItem(LIFE_KEY, JSON.stringify(life));
  } catch {
    return { ok: false, reason: "storage" };
  }
  markInCapacity(storage, id, now, { ended: false });
  return { ok: true };
}
