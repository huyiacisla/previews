// Client account settings. Pure logic, no DOM, so node --test can run it.
// A Client is one role that manages several properties; there is no Social and no Promotions here.
// Everything is saved under one key. The sidebar choices are also handed to the real pages as "ui-prefs:client"
// (preview.js applies them), so choosing a look and opening the dashboard shows the same look.

export const KEY = 'eso-client-settings';
export const UI_KEY = 'ui-prefs:client';

// Sidebar colors: [background, text, hover/open item, accent]. "default" keeps the portal's own look (no override).
export const SIDEBAR_PRESETS = [
  ['default', 'Default', null],
  ['navy', 'Navy', ['#0f172a', '#ffffff', '#16243d', '#94afff']],
  ['graphite', 'Graphite', ['#1d1e21', '#e5e5e5', '#2d2e33', '#a3a3a3']],
  ['forest', 'Forest', ['#0f2a1f', '#dcfce7', '#174232', '#22c55e']],
  ['ocean', 'Ocean', ['#0b2540', '#e0f2fe', '#12395f', '#38bdf8']],
  ['plum', 'Plum', ['#26122f', '#f3e8ff', '#3d1c4b', '#c084fc']],
  ['sunset', 'Sunset', ['#3a1414', '#ffedd5', '#5a1f1a', '#fb923c']],
  ['contrast', 'High contrast', ['#000000', '#ffffff', '#222222', '#ffd400']],
];

export const THEMES = ['light', 'dark', 'system'];
export const CONTACTS = ['app', 'email', 'text'];
export const QUIET = ['off', 'night', 'early'];
export const DIGESTS = ['off', 'daily', 'weekly'];

export const DEFAULTS = {
  phone: '',
  contact: 'app',
  billingEmail: 'dana.whitfield@mallardpointe.example',
  notify: { inapp: true, email: true, push: true, requests: true, violations: true, escalations: true, messages: true, reports: true },
  quiet: 'off',
  digest: 'off',
  messages: { enter: true, receipts: true, typing: true, away: false, emergencySms: true },
  reports: { weekly: true, monthly: false, alerts: true },
  security: { twoStep: false, devicesOut: [] },
  look: { sidebar: 'default', icons: true, counts: true, overview: true, theme: 'light' },
  comfort: { contrast: false, motion: false },
};

// Signed-in devices shown on the Security tab (demo data).
export const DEVICES = [
  { id: 'd1', name: 'Chrome on Windows', where: 'Sacramento, CA', when: 'This device', current: true },
  { id: 'd2', name: 'Safari on iPhone', where: 'Sacramento, CA', when: '2 hours ago' },
  { id: 'd3', name: 'Chrome on macOS', where: 'San Jose, CA', when: 'Yesterday' },
];

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const pick = (v, list, d) => (list.includes(v) ? v : d);

function readRaw(storage) {
  try { const v = JSON.parse(storage.getItem(KEY)); return isObj(v) ? v : {}; } catch { return {}; }
}

/** What is saved, with anything that does not belong replaced by the default. */
export function readSettings(storage) {
  const r = readRaw(storage);
  const group = (name) => {
    const src = isObj(r[name]) ? r[name] : {};
    const out = {};
    for (const [k, d] of Object.entries(DEFAULTS[name])) out[k] = bool(src[k], d);
    return out;
  };
  const sec = isObj(r.security) ? r.security : {};
  const look = isObj(r.look) ? r.look : {};
  return {
    phone: typeof r.phone === 'string' ? r.phone : DEFAULTS.phone,
    contact: pick(r.contact, CONTACTS, DEFAULTS.contact),
    billingEmail: typeof r.billingEmail === 'string' && !emailError(r.billingEmail) ? r.billingEmail : DEFAULTS.billingEmail,
    notify: group('notify'),
    quiet: pick(r.quiet, QUIET, DEFAULTS.quiet),
    digest: pick(r.digest, DIGESTS, DEFAULTS.digest),
    messages: group('messages'),
    reports: group('reports'),
    security: { twoStep: bool(sec.twoStep, false), devicesOut: Array.isArray(sec.devicesOut) ? sec.devicesOut.filter((id) => DEVICES.some((d) => d.id === id && !d.current)) : [] },
    look: {
      sidebar: pick(look.sidebar, SIDEBAR_PRESETS.map((p) => p[0]), 'default'),
      icons: bool(look.icons, true), counts: bool(look.counts, true), overview: bool(look.overview, true),
      theme: pick(look.theme, THEMES, 'light'),
    },
    comfort: (() => { const c = isObj(r.comfort) ? r.comfort : {}; return { contrast: bool(c.contrast, false), motion: bool(c.motion, false) }; })(),
  };
}

/** Phone is optional; when given, 7 to 15 digits and the usual punctuation. */
export function phoneError(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (!/^[+\d][\d\s().-]*$/.test(v)) return 'Use digits, spaces and + ( ) - only.';
  const n = v.replace(/\D/g, '').length;
  return n >= 7 && n <= 15 ? '' : 'Enter 7 to 15 digits.';
}

export function emailError(value) {
  const v = String(value || '').trim();
  if (!v) return 'Enter an email address.';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 120 ? '' : 'Enter a valid email address.';
}

/**
 * Save a change given as a path and a value, e.g. save(storage, 'notify.email', false) or save(storage, 'phone', '+1 ...').
 * Returns { ok, reason? }. Unknown paths and wrong types are refused, so a bad call never corrupts what is saved.
 */
export function save(storage, path, value) {
  const s = readSettings(storage);
  const [a, b] = String(path).split('.');
  if (!(a in DEFAULTS)) return { ok: false, reason: 'unknown' };
  if (b === undefined) {
    if (a === 'phone') { const e = phoneError(value); if (e) return { ok: false, reason: e }; s.phone = String(value).trim(); }
    else if (a === 'billingEmail') { const e = emailError(value); if (e) return { ok: false, reason: e }; s.billingEmail = String(value).trim(); }
    else if (a === 'contact') { if (!CONTACTS.includes(value)) return { ok: false, reason: 'invalid' }; s.contact = value; }
    else if (a === 'quiet') { if (!QUIET.includes(value)) return { ok: false, reason: 'invalid' }; s.quiet = value; }
    else if (a === 'digest') { if (!DIGESTS.includes(value)) return { ok: false, reason: 'invalid' }; s.digest = value; }
    else return { ok: false, reason: 'unknown' };
  } else {
    if (!isObj(DEFAULTS[a]) || !(b in DEFAULTS[a])) return { ok: false, reason: 'unknown' };
    if (a === 'look' && b === 'sidebar') { if (!SIDEBAR_PRESETS.some((p) => p[0] === value)) return { ok: false, reason: 'invalid' }; }
    else if (a === 'look' && b === 'theme') { if (!THEMES.includes(value)) return { ok: false, reason: 'invalid' }; }
    else if (a === 'security' && b === 'devicesOut') { if (!Array.isArray(value)) return { ok: false, reason: 'invalid' }; }
    else if (typeof value !== 'boolean') return { ok: false, reason: 'invalid' };
    s[a][b] = value;
  }
  try { storage.setItem(KEY, JSON.stringify(s)); } catch { return { ok: false, reason: 'storage' }; }
  return { ok: true, settings: s };
}

/** Put a device away (sign it out). The device you are using cannot be signed out from here. */
export function signOutDevice(storage, id) {
  const d = DEVICES.find((x) => x.id === id);
  if (!d || d.current) return { ok: false, reason: 'invalid' };
  const s = readSettings(storage);
  if (s.security.devicesOut.includes(id)) return { ok: true, settings: s };
  return save(storage, 'security.devicesOut', [...s.security.devicesOut, id]);
}

export const devicesIn = (settings) => DEVICES.filter((d) => !settings.security.devicesOut.includes(d.id));

/** What the real pages read ("ui-prefs:client"): sidebar colors, theme, and the sidebar options that act on the real sidebar. */
export function uiPrefs(settings) {
  const preset = SIDEBAR_PRESETS.find((p) => p[0] === settings.look.sidebar);
  const out = { theme: settings.look.theme, accent: '#2b55f2', icons: settings.look.icons, counts: settings.look.counts, cap: settings.look.overview, contrast: settings.comfort.contrast, motion: settings.comfort.motion };
  if (preset && preset[2]) out.sb = preset[2];
  return out;
}

/** Write the hand-over key. Returns false when storage is blocked. */
export function publish(storage, settings) {
  try { storage.setItem(UI_KEY, JSON.stringify(uiPrefs(settings))); return true; } catch { return false; }
}

/** Sections of the page, in order. `permissions` is read only. */
export const SECTIONS = [
  ['profile', 'Profile'], ['properties', 'Properties'], ['notifications', 'Notifications'], ['messages', 'Messages'],
  ['reports', 'Reports and digests'], ['billing', 'Billing contact'], ['security', 'Sign-in and security'],
  ['appearance', 'Appearance'], ['accessibility', 'Accessibility'], ['permissions', 'Access'],
];

/** What a Client can do (read only). Social and Promotions are not part of the Client portal. */
export const ACCESS = [
  ['Portfolio performance', 'View', 'ok'], ['Reports', 'View and export', 'ok'], ['Properties', 'Manage the properties on your plan', 'ok'],
  ['Staff and access', 'Add, change and remove staff access', 'ok'], ['Billing and plan', 'Manage', 'ok'],
  ['Requests, vehicles, parking, violations', 'View', 'ok'], ['Messages', 'Message Staff and Support', 'ok'],
  ['Social and Promotions', 'Not part of the Client portal', 'no'],
];

/** The properties this Client manages (demo data) and how much of the plan is used. */
export const PROPERTIES = { used: 1, limit: 2, list: [{ name: 'Mallard Pointe at Riverbend', address: '2150 Riverbend Pkwy, Sacramento, CA 95833', status: 'Active' }] };
