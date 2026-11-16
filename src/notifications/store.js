// Notifications of the Client portal: the list, who has read what, search, filters and the counts the bell shows.
//
// Pure logic with no DOM, so tests can run it in Node. The list is SAMPLE data made on the spot from fixed recipes (the preview has no
// notification service): it agrees with what the Client pages already say (16 unread messages, the plan's limits from capacity/store.js,
// one property needing attention) and totals 109 that need attention, the number the bell has always shown.
// "Read" is remembered per person in the browser; nothing is written anywhere else.

import { ITEMS, limitFor, normalizePurchased } from '../capacity/store.js';

// The plan AS IT IS NOW: what the company added in Capacity counts (set from the storage by buildAll before the samples are made).
let BOUGHT = normalizePurchased(null);
const limit = (id) => limitFor(id, BOUGHT);
function readBought(storage) {
  for (const key of ['eso-capacity:client', 'capacity-state:client']) {
    try { const v = JSON.parse(storage && storage.getItem(key)); if (v && typeof v === 'object') return normalizePurchased(v); } catch { /* not there or unreadable */ }
  }
  return normalizePurchased(null);
}

export const CATEGORIES = {
  messages: 'Messages',
  requests: 'Requests',
  violations: 'Violations',
  parking: 'Parking',
  plan: 'Capacity & plan',
  properties: 'Properties',
  reports: 'Reports',
  system: 'System',
  residents: 'Residents',
  promotions: 'Promotions',
  community: 'Community',
  billing: 'Billing',
};
// Colour pair of each category's icon chip (the page maps these to status tokens).
export const TONES = { messages: 'info', requests: 'neutral', violations: 'danger', parking: 'warning', plan: 'warning', properties: 'warning', reports: 'success', system: 'neutral', residents: 'info', promotions: 'success', community: 'info', billing: 'warning' };
export const PROPERTIES = ['Mallard Pointe at Riverbend', 'Sundale'];
/** The categories of each portal's notifications, in the order the filter lists them. */
export const ROLE_CATEGORIES = {
  client: ['messages', 'requests', 'violations', 'parking', 'plan', 'properties', 'reports', 'system'],
  staff: ['messages', 'requests', 'violations', 'parking', 'residents', 'community', 'system'],
  resident: ['messages', 'requests', 'parking', 'promotions', 'community', 'billing', 'system'],
};
/** A Client runs several properties; Staff and Residents belong to one, so they get no property filter. */
ROLE_CATEGORIES.admin = ['messages', 'properties', 'system']; // Messages are the live Support tickets and chats (live.js)
export const ROLE_PROPERTIES = { client: PROPERTIES, staff: [PROPERTIES[0]], resident: [PROPERTIES[0]], admin: [PROPERTIES[0]] };

const KEY = (personaId) => `eso-notif-read:${personaId}`;

// [category, unread, read, builder(i) -> [title, detail, property|null, destination|null]]
// destination: 'messages' | 'plan' | 'dashboard' | 'support' (pages that exist); null means the page is not part of the preview.
const unit = (i) => 100 + ((i * 37) % 380);
const CLIENT_RECIPES = [
  ['messages', 16, 3, (i) => {
    const who = ['Jordan Lee', 'Sam Okafor', 'EasySpotOps Support'][i % 3];
    const text = ['Can you confirm the gate repair window for Friday?', 'The visitor pass list is ready for your review.', 'We moved the garage cleaning to Saturday morning.', 'Two residents asked about guest parking this weekend.', 'Your reply on the lease report was added to the thread.', 'Please approve the updated parking rules before Monday.', 'A tow request is waiting on your answer.', 'The monthly meeting notes are attached.'][i % 8];
    return [`${who} sent you a message`, text, null, 'messages'];
  }],
  ['requests', 30, 6, (i) => {
    const p = PROPERTIES[i % 2];
    const kind = ['Guest pass', 'Permit renewal', 'Spot change', 'Visitor parking', 'Reserved spot'][i % 5];
    return [`New request · Unit ${unit(i)}`, `${kind} · waiting for review`, p, null];
  }],
  ['violations', 20, 5, (i) => {
    const p = PROPERTIES[(i + 1) % 2];
    const spot = `${'ABCDG'[i % 5]}-${10 + ((i * 7) % 40)}`;
    const why = ['Expired permit', 'Parked in a fire lane', 'Wrong spot', 'No permit on display', 'Over the time limit'][i % 5];
    return [`Violation escalated · Spot ${spot}`, `${why}, notice ${1 + (i % 3)}`, p, null];
  }],
  ['parking', 14, 4, (i) => {
    const p = PROPERTIES[i % 2];
    const what = ['Guest spot reserved', 'Spot assignment changed', 'Spot released', 'Overflow lot opened', 'Spot swap approved'][i % 5];
    return [what, `Spot ${'ABCG'[i % 4]}-${5 + ((i * 11) % 60)} · ${p}`, p, null];
  }],
  ['plan', 2, 1, (i) => [
    ['Parking Spots near limit', `${ITEMS[0].used} / ${limit('parking')} on your plan`, null, 'plan'],
    ['Plan limits', `Your plan covers ${limit('residents')} residents, ${limit('staff')} staff and ${limit('parking')} parking spaces`, null, 'plan'],
    ['Billing contact updated', 'Your billing contact was changed', null, 'plan'],
  ][i]],
  ['properties', 1, 0, () => ['Properties needing attention', 'Mallard Pointe at Riverbend · 0 open violations', 'Mallard Pointe at Riverbend', 'dashboard']],
  ['reports', 12, 3, (i) => {
    const p = PROPERTIES[i % 2];
    const what = ['Weekly report is ready', 'Occupancy summary is ready', 'Revenue summary is ready', 'Violations report is ready'][i % 4];
    return [what, `${p} · week ${44 - Math.floor(i / 2)}`, p, null];
  }],
  ['system', 14, 2, (i) => {
    const what = ['Scheduled maintenance tonight', 'New sign-in on your account', 'Support replied to your ticket', 'A data sync finished', 'Your export is ready', 'A password reminder'][i % 6];
    return [what, ['No action needed. Service stays available.', 'A device you use signed in from a new place.', 'Open Support to read the reply.', 'All properties are up to date.', 'Download it from Reports.', 'Your password is 90 days old.'][i % 6], null, i % 6 === 2 ? 'support' : null];
  }],
];

const HOME = PROPERTIES[0];
// Staff: 7 need attention (the number the Staff bell shows), plus what was already read.
const STAFF_RECIPES = [
  ['messages', 2, 5, (i) => {
    const who = ['Alex Rivera', 'Priya Nair', 'Morgan Ellis'][i % 3];
    return [`${who} is waiting for a person`, ['Guest pass question for Saturday.', 'The gate code does not work.', 'Asking about visitor parking hours.'][i % 3], HOME, 'messages'];
  }],
  ['requests', 2, 4, (i) => [`New request · Unit ${unit(i)}`, `${['Guest pass', 'Permit renewal', 'Spot change'][i % 3]} · waiting for review`, HOME, null]],
  ['violations', 1, 3, (i) => [`Violation escalated · Spot ${'ABG'[i % 3]}-${10 + ((i * 7) % 40)}`, `${['Expired permit', 'Parked in a fire lane', 'Wrong spot'][i % 3]}, notice ${1 + (i % 3)}`, HOME, null]],
  ['parking', 1, 3, (i) => [['Guest spot reserved', 'Spot released', 'Spot assignment changed'][i % 3], `Spot ${'ABCG'[i % 4]}-${5 + ((i * 11) % 60)}`, HOME, null]],
  ['residents', 0, 3, (i) => [['New resident added', 'Vehicle added', 'Lease updated'][i % 3], `Unit ${unit(i + 3)}`, HOME, null]],
  ['system', 1, 0, () => ['Scheduled maintenance tonight', 'No action needed. Service stays available.', null, null]],
];
// Resident: 33 need attention (the number the Resident bell shows). Only things meant for a resident: no Staff tools, no unpublished work.
const RESIDENT_RECIPES = [
  ['messages', 3, 2, (i) => [['Property team replied', 'Your question was answered', 'A new message from the team'][i % 3], ['Your guest pass for Saturday is approved.', 'The gate repair is finished.', 'We moved the garage cleaning to Saturday.'][i % 3], HOME, 'messages']],
  ['requests', 6, 3, (i) => [`Request update · ${['Waitlist request', 'Guest pass', 'Vehicle change'][i % 3]}`, ['Your request was received.', 'Your request is being reviewed.', 'Your request was approved.'][i % 3], HOME, 'tickets']],
  ['parking', 8, 3, (i) => [['Parking pass ready', 'Guest spot reserved', 'Spot assigned', 'Pass expires soon'][i % 4], `Spot ${'ABCG'[i % 4]}-${5 + ((i * 11) % 60)}`, HOME, null]],
  ['promotions', 7, 2, (i) => [['New offer for residents', 'Car wash discount', 'Parking promotion', 'Move-in perk'][i % 4], 'Published by the property team. Open Promotions to save or claim it.', HOME, 'promotions']],
  ['community', 5, 2, (i) => [['Garage cleaning this Saturday', 'Quiet hours reminder', 'Package room update', 'Pool closes early', 'Community meeting'][i % 5], 'From the property team.', HOME, 'social']],
  ['billing', 2, 2, (i) => [['Payment received', 'Statement is ready'][i % 2], `Unit 02-291`, HOME, null]],
  ['system', 2, 1, (i) => [['New sign-in on your account', 'Your password is 90 days old'][i % 2], 'Open Profile settings to review.', null, null]],
];
// Admin: what the captured Admin dashboard says about the platform (32 health warnings, 8 people needing a space, sign-ins). Tickets and chats are live.
const ADMIN_RECIPES = [
  ['properties', 1, 1, (i) => [
    ['People needing space assignment', '8 approved parkers have no assigned space at Mallard Pointe at Riverbend.', PROPERTIES[0], 'dashboard'],
    ['Client account is healthy', 'AMC LLC: both properties are active.', null, null],
  ][i]],
  ['system', 2, 3, (i) => [
    ['32 platform health warnings', 'No critical checks. Open the Command Center to review them.', null, 'dashboard'],
    ['New sign-in on your account', 'A device you use signed in from a new place.', null, null],
    ['Scheduled maintenance tonight', 'No action needed. Service stays available.', null, null],
    ['A data sync finished', 'All properties are up to date.', null, null],
    ['Your password is 90 days old', 'Open Settings to change it.', null, null],
  ][i]],
];
const RECIPES = { client: CLIENT_RECIPES, staff: STAFF_RECIPES, resident: RESIDENT_RECIPES, admin: ADMIN_RECIPES };

/** All notifications of a portal ("client", "staff" or "resident"), newest first. `now` anchors the times; content and read flags do not depend on it. */
// What the live items (live.js) replace: a sample "message" next to a real one would say the same thing twice.
export const REPLACED_BY_LIVE = { admin: ['messages'], client: ['messages'], staff: ['messages', 'community'], resident: ['messages', 'community'] };

/* What each person switched off in Settings > Notifications. Every portal keeps its settings in the prototype's own key (the page shim prefixes it):
   Resident and Admin in "<portal>:eso-proto" (rn* and an* switches), Staff and Client in "eso-notif" / "client:eso-notif" ({ m: { event: [in-app, email, sms] } }). */
const RESIDENT_SWITCHES = { rnParking: ['parking'], rnRequests: ['requests'], rnPayments: ['billing'], rnCommunity: ['community'], rnPromos: ['promotions'], rnMessages: ['messages'] };
const ADMIN_SWITCHES = { anMessages: ['messages'], anAlerts: ['properties', 'system'] };
const RESIDENT_DEFAULT_OFF = new Set(); // every Resident switch starts on ("Community posts" too: it carries the replies they are waiting for)
// A category made of several events (requests: new + updated) goes quiet only when every one of them has In-app off.
const EVENT_CATEGORY = { req_new: 'requests', req_upd: 'requests', vio_new: 'violations', vio_esc: 'violations' };
// An event that is a category of its own goes quiet as soon as its In-app switch is off: Direct message (the live chats), Community post, Near plan limit, Updates & recovery.
const EVENT_ALONE = { msg_dm: 'messages', msg_com: 'community', cap: 'plan', sys: 'system' };
const readJson = (storage, key) => { try { return JSON.parse(storage.getItem(key)); } catch { return null; } };

/** The categories this person does not want in the bell and the list, from their switches. `storage` is the browser's; without it nothing is hidden. */
export function hiddenCategories(role, storage = globalThis.localStorage) {
  const hide = new Set();
  if (!storage) return hide;
  if (role === 'resident' || role === 'admin') {
    const s = readJson(storage, `${role}:eso-proto`) || {};
    const table = role === 'resident' ? RESIDENT_SWITCHES : ADMIN_SWITCHES;
    for (const [key, cats] of Object.entries(table)) {
      const on = s[key] === undefined ? !(role === 'resident' && RESIDENT_DEFAULT_OFF.has(key)) : !!s[key];
      if (!on) for (const c of cats) hide.add(c);
    }
  } else if (role === 'staff' || role === 'client') {
    const m = (readJson(storage, role === 'client' ? 'client:eso-notif' : 'eso-notif') || {}).m || {};
    const byCat = {};
    for (const [event, cat] of Object.entries(EVENT_CATEGORY)) if (Array.isArray(m[event])) (byCat[cat] ||= []).push(!!m[event][0]);
    for (const [cat, flags] of Object.entries(byCat)) if (flags.length && flags.every((on) => !on)) hide.add(cat); // every event of the category has In-app off
    for (const [event, cat] of Object.entries(EVENT_ALONE)) if (Array.isArray(m[event]) && !m[event][0]) hide.add(cat);
  }
  return hide;
}

/** Pass `live` (an array, even an empty one) to swap the sample Messages and Community for the real ones; leave it out for the sample list alone.
 *  What the person switched off in Settings (hiddenCategories) is left out of the list. */
export function buildAll(now = Date.now(), role = 'client', live, storage = globalThis.localStorage) {
  const hide = hiddenCategories(role, storage);
  const keep = (n) => !hide.has(n.cat);
  BOUGHT = readBought(storage);
  const sample = buildSample(now, role);
  if (!Array.isArray(live)) return sample.filter(keep);
  const drop = new Set(REPLACED_BY_LIVE[role] || []);
  // They sit among the rest by time. Their ids are stable, so the read state keeps working.
  return [...live, ...sample.filter((n) => !drop.has(n.cat))].filter(keep).sort((a, b) => b.ts - a.ts);
}

function buildSample(now, role) {
  const items = [];
  (RECIPES[role] || RECIPES.client).forEach(([cat, unread, read, make], ci) => {
    if (unread + read === 0) return;
    const n = unread + read;
    for (let i = 0; i < n; i += 1) {
      const [title, detail, prop, dest] = make(i);
      items.push({ id: `n-${cat}-${i}`, cat, title, detail, prop, dest, read: i >= unread, rank: (i + 0.5 + ci * 0.13) / n });
    }
  });
  items.sort((a, b) => a.rank - b.rank || (a.id < b.id ? -1 : 1));
  return items.map((it, k) => {
    const minutes = Math.round(3 + k * k * 0.95 + k * 9);
    return { ...it, ts: now - minutes * 60000 };
  });
}

/** What this person has changed: { id: true | false } (true = read, false = unread). Broken or missing data reads as "no changes". */
export function readMap(storage, personaId) {
  try {
    const v = JSON.parse(storage.getItem(KEY(personaId)) || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}
// A person's own choice wins, except that reading the chat or the post where it lives reads its notification too.
export const isRead = (n, map) => (typeof map[n.id] === 'boolean' ? (map[n.id] || (n.live ? n.read : false)) : n.read);

/** Mark these ids read (value true) or unread (false). Returns the new map. */
export function setRead(storage, personaId, ids, value) {
  const map = { ...readMap(storage, personaId) };
  for (const id of ids) map[id] = Boolean(value);
  try { storage.setItem(KEY(personaId), JSON.stringify(map)); } catch { /* storage full or blocked: the change lasts until reload */ }
  return map;
}

export function counts(list, map) {
  const out = { total: list.length, unread: 0, read: 0 };
  for (const n of list) { if (isRead(n, map)) out.read += 1; else out.unread += 1; }
  return out;
}

/** How many need attention, for the bell. */
export const unreadCount = (storage, personaId, now, role = 'client') => counts(buildAll(now, role), readMap(storage, personaId)).unread;

/** The newest unread ones (the bell lists a few). */
export const latestUnread = (list, map, n = 4) => list.filter((x) => !isRead(x, map)).slice(0, n);

const norm = (s) => String(s || '').toLowerCase();

/** Search words must all appear in the title, detail, property or category name. Status: all | unread | read. Sort: newest | oldest | unread. */
export function query(list, map, { q = '', status = 'all', cat = 'all', prop = 'all', sort = 'newest' } = {}) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  let out = list.filter((n) => {
    const r = isRead(n, map);
    if (status === 'unread' && r) return false;
    if (status === 'read' && !r) return false;
    if (cat !== 'all' && n.cat !== cat) return false;
    if (prop !== 'all' && n.prop !== prop) return false;
    if (!words.length) return true;
    const hay = norm(`${n.title} ${n.detail} ${n.prop || ''} ${CATEGORIES[n.cat]}`);
    return words.every((w) => hay.includes(w));
  });
  if (sort === 'oldest') out = [...out].sort((a, b) => a.ts - b.ts);
  else if (sort === 'unread') out = [...out].sort((a, b) => Number(isRead(a, map)) - Number(isRead(b, map)) || b.ts - a.ts);
  return out;
}

const dayStart = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** "Today", "Yesterday", or the date. */
export function dayLabel(ts, now = Date.now()) {
  const diff = Math.round((dayStart(now) - dayStart(ts)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

/** Group a list that is already in the order to show into [{ label, items }] runs of the same day. */
export function groupByDay(items, now = Date.now()) {
  const groups = [];
  for (const n of items) {
    const label = dayLabel(n.ts, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n); else groups.push({ label, items: [n] });
  }
  return groups;
}

/** The bell badge text: the count, or 99+ above 99, or nothing at zero. */
export const badgeText = (unread) => (unread <= 0 ? '' : unread > 99 ? '99+' : String(unread));
