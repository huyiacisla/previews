// The live part of the bell and the Notifications page: what Messenger and Social have really said to this person.
//
// The sample list in store.js stays (the preview has no notification service). On top of it, these items are DERIVED from the two
// systems that exist, every time they are asked for, so nothing is copied and nothing can drift:
//  - Messenger: one item per conversation with something new (store.alertsFor, which follows the same quiet rules as the Messages badge).
//    Reading the chat in Messenger reads the item.
//  - Social (Staff and Resident only): replies to your comments, announcements, and what residents wrote on your posts (social/alerts.js).
//    A resident's items are read when the Social page has seen them; a Staff person's follow the Notifications read state.
// `liveItems` is pure (stores are passed in), so node --test can run it. `browserLive` wires the real stores, once per page.

import { createStore } from "../messaging/store.js";
import { createTransport } from "../messaging/transport.js";
import { listPromotions, KEY as PROMO_KEY, todayISO } from "../promotions/store.js";
import { socialAlerts } from "../social/alerts.js";
import { staffSocialPrefs } from "../social/prefs.js";
import * as staffSocial from "../social/staff-store.js";
import * as residentSocial from "../social/store.js";

const WEEK = 7 * 86400000;
const SOCIAL_LIMIT = 8;
const HOME = "Mallard Pointe at Riverbend";

/** Messenger items for this person, in the shape of a notification. */
export function messengerItems(store, me) {
  if (!store || !me) return [];
  return store.alertsFor(me.id).map((a) => ({
    id: a.id,
    cat: "messages",
    title: a.title,
    detail: a.detail,
    prop: null,
    dest: "messages",
    read: a.unread === 0,
    ts: a.ts,
    live: "messenger",
    convId: a.convId,
  }));
}

export { staffSocialPrefs }; // what a Staff person chose in Settings > Social lives in social/prefs.js (the Social page's own bell reads it too)

/** Social items for this person. `seen` is the resident's own "seen" map ({ id: true }); a Staff person has none. */
export function socialItems(storage, role, me, now = Date.now(), seen = {}) {
  if (!storage || !me || (role !== "staff" && role !== "resident")) return [];
  let posts = [];
  try {
    posts = role === "staff" ? staffSocial.timeline(storage, me.name) : residentSocial.timeline(storage, me.id, { now });
  } catch {
    return [];
  }
  const prefs = role === "staff" ? staffSocialPrefs(storage, now) : null;
  if (prefs && prefs.silent) return [];
  return socialAlerts(posts, { staff: role === "staff" })
    .filter((a) => a.t && now - a.t < WEEK)
    .filter((a) => !prefs || !prefs.off.has(a.meta))
    .slice(0, SOCIAL_LIMIT)
    .map((a) => {
      const cut = a.what.indexOf(": ");
      return {
        id: `soc-${a.id}`,
        cat: "community",
        title: `${a.who} ${cut < 0 ? a.what : a.what.slice(0, cut)}`,
        detail: cut < 0 ? "Open Social to read it." : a.what.slice(cut + 2),
        prop: HOME,
        dest: "social",
        read: !!seen[a.id],
        ts: a.t,
        live: "social",
        post: a.post,
      };
    });
}

/**
 * What the property team decided about this resident's promotion claims: confirmed, used, or not approved (with the reason Staff wrote for them).
 * Derived from the status Staff's Claims inbox publishes (promotions/store.js claimStatus), so nothing is copied; one item per decided claim, last 7 days.
 * Read or unread follows the Notifications page like any other item (the id is stable: promo-<resident>|<promotion>|<n>).
 */
export function promoItems(storage, role, me, now = Date.now()) {
  if (!storage || !me || role !== "resident") return [];
  let all = {};
  try {
    all = JSON.parse(storage.getItem(PROMO_KEY.claimState)) || {};
  } catch {
    return [];
  }
  if (!all || typeof all !== "object" || Array.isArray(all)) return [];
  const names = new Map();
  try {
    for (const p of listPromotions(storage, { today: todayISO(new Date(now)), samples: true })) names.set(p.id, p.title);
  } catch {
    /* a missing title is not a reason to lose the notice */
  }
  const say = {
    verified: ["Your claim was confirmed", (t) => `${t}: the property team confirmed it. Use your code at the partner.`],
    redeemed: ["Your claim was marked as used", (t) => `${t}: the property team marked it as used.`],
    rejected: ["Your claim was not approved", (t, r) => `${t}${r ? `: ${r}` : ""}`],
  };
  const out = [];
  for (const [rk, s] of Object.entries(all)) {
    const [rid, pid] = rk.split("|");
    if (rid !== me.id || !s || !say[s.st]) continue;
    const at = Number(s.at);
    if (!at || now - at > WEEK) continue;
    const title = names.get(pid) || "A promotion";
    // the decision is part of the id: a claim confirmed and later rejected is news again, even if the first notice was read
    out.push({
      id: `promo-${rk}|${s.st}`,
      cat: "promotions",
      title: say[s.st][0],
      detail: say[s.st][1](title, String(s.reason || "").slice(0, 120)),
      prop: HOME,
      dest: "promotions",
      read: false,
      ts: at,
      live: "promo",
    });
  }
  return out.sort((a, b) => b.ts - a.ts).slice(0, 8);
}

export function liveItems({ role, me, store, storage, now = Date.now(), seen = {} }) {
  return [...messengerItems(store, me), ...socialItems(storage, role, me, now, seen), ...promoItems(storage, role, me, now)];
}

const SEEN_KEY = (id) => `eso-res-social-seen:${id}`;
const readJson = (storage, key) => {
  try {
    return JSON.parse(storage.getItem(key)) || {};
  } catch {
    return {};
  }
};

/**
 * The real thing for a page: `{ items(), markRead(items), onChange(fn) }`. The Messenger store is made once per page and kept; it hears about
 * other tabs and documents (the Messages page lives in a frame) through the same transport the Messages page uses.
 */
let shared = null;
export function browserLive(role, me, storage = globalThis.localStorage) {
  if (shared && shared.key === `${role}:${me.id}`) return shared.api;
  let store = null;
  try {
    store = createStore({ transport: createTransport() });
  } catch (e) {
    console.error(e);
  }
  const subs = new Set();
  const fire = () =>
    subs.forEach((fn) => {
      try {
        fn();
      } catch {
        /* one listener failing must not stop the others */
      }
    });
  if (store) store.subscribe(fire);
  // Social keeps its data in the browser's storage: the feed, each resident's own data, and the "seen" map.
  addEventListener("storage", (e) => {
    if (e.key && /^eso-(feed|res-|pm-claimstate)/.test(e.key)) fire();
  });
  const api = {
    items: (now = Date.now()) => liveItems({ role, me, store, storage, now, seen: role === "resident" ? readJson(storage, SEEN_KEY(me.id)) : {} }),
    /** Reading a message notification in the list reads the chat too, so the Messages badge agrees. */
    markRead(items) {
      if (store) for (const n of items) if (n.live === "messenger" && n.convId) store.markRead(n.convId, me.id);
    },
    /** "Mark as unread" on a message notification makes the chat's newest message unread again. */
    markUnread(items) {
      if (store) for (const n of items) if (n.live === "messenger" && n.convId) store.markUnread(n.convId, me.id);
    },
    onChange(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    /** The same number the Messages page shows in its title: unread messages (not conversations). null when the Messenger store could not start. */
    badge() {
      try {
        return store ? store.badgeCount(me.id) : null;
      } catch {
        return null;
      }
    },
  };
  shared = { key: `${role}:${me.id}`, api };
  return api;
}
