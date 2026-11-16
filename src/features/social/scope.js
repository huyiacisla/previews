// Social, one property at a time. Pure logic, no DOM, so node --test can run it.
//
// The first property of the company keeps its Social where it always was ("eso-feed", "eso-res-social:<id>", "eso-social"): the Staff and Resident apps
// read and write those keys and do not know about other properties. Every property added in Capacity (ids "extra-1", "extra-2"… in the order they were
// bought; a bought property is never removed, so an id stays the same) has its own copy of each key: "eso-feed:extra-1" and so on.
//
// scoped(storage, id) is a storage that says "eso-feed" and means the key of that property. Everything that reads Social through a storage
// (staff-store.js, diagnose.js…) then works for any property without being changed.

export const MAIN = "main";

const SOCIAL_KEYS = /^(eso-feed|eso-social|eso-res-social)(:|$)/;

/** The real key for a Social key of one property. The first property's keys are the plain ones. */
export function keyFor(id, key) {
  if (!id || id === MAIN) return key;
  const m = SOCIAL_KEYS.exec(key);
  if (!m) return key;
  // "eso-feed" -> "eso-feed:extra-1"; "eso-res-social:res-1" -> "eso-res-social:extra-1:res-1"
  return key === m[1] ? `${key}:${id}` : `${m[1]}:${id}${key.slice(m[1].length)}`;
}

/** A storage for one property. Writes go to that property's keys, too. */
export function scoped(storage, id) {
  if (!id || id === MAIN) return storage;
  return {
    getItem: (k) => storage.getItem(keyFor(id, k)),
    setItem: (k, v) => storage.setItem(keyFor(id, k), v),
    removeItem: (k) => storage.removeItem(keyFor(id, k)),
  };
}

/** Does this property have a feed yet? (No means it has not started Social; that is not an error.) */
export function hasFeed(storage, id) {
  try {
    return scoped(storage, id).getItem("eso-feed") != null;
  } catch {
    return false;
  }
}
