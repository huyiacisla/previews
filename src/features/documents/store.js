// Documents (Client): the rules, with no page in them, so they can be tested.
// A document is metadata only in this preview (name, category, property, who may see it, dates, size): no file is stored or sent.

export const CATEGORIES = [
  ["contract", "Contracts"],
  ["insurance", "Insurance"],
  ["policy", "Policies"],
  ["template", "Templates"],
  ["plan", "Maps and plans"],
  ["tax", "Tax forms"],
  ["other", "Other"],
];
/** The business W-9 is the one document a B2B account needs first (to link properties and vendors and to pay or be paid), so it has a place of its own
 *  and is kept apart from the list. Its tax ID is on the form itself: it is never typed into, or shown by, this page. */
export const W9_CLASSES = [
  ["sole", "Individual or sole proprietor"],
  ["c-corp", "C corporation"],
  ["s-corp", "S corporation"],
  ["partnership", "Partnership"],
  ["llc", "LLC"],
  ["trust", "Trust or estate"],
  ["other", "Other"],
];
export const W9_ACCEPT = ["pdf", "png", "jpg", "jpeg"];
export const W9_REVIEW_YEARS = 3;
export const SHARES = [
  ["admins", "Admins only"], // owners and Client Admins
  ["team", "Whole team"], // everyone with access to the company's workspace
]; // Documents belong to the company: people from the property's staff or its residents never see them.
export const PROPERTIES = [
  ["all", "All properties"],
  ["riverbend", "Mallard Pointe at Riverbend"],
];
export const ACCEPT = ["pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg"];
export const MAX_BYTES = 10 * 1024 * 1024;
export const SOON_DAYS = 30;
/** How many days before an end date a document counts as "expiring soon" (Workspace settings > Documents). */
export const SOON_CHOICES = [7, 14, 30, 60, 90];

/** The Documents preferences set in Workspace settings (key "docs-prefs:client"). Anything missing or odd falls back to the default. */
export function normalizeDocPrefs(v) {
  const p = v && typeof v === "object" ? v : {};
  return {
    soonDays: SOON_CHOICES.includes(Number(p.soonDays)) ? Number(p.soonDays) : SOON_DAYS,
    share: SHARES.some(([id]) => id === p.share) ? p.share : "admins",
    storageWarn: p.storageWarn === false ? false : true,
  };
}

const DAY = 86400000;
// The calendar day of the person's own clock (not UTC): in the evening in Los Angeles "today" is still today, not tomorrow.
const iso = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const label = (list, id) => (list.find(([k]) => k === id) || [id, id])[1];
export const categoryLabel = (id) => label(CATEGORIES, id);
export const shareLabel = (id) => label(SHARES, id);
export const propertyLabel = (id) => label(PROPERTIES, id);

/** The documents a company starts with, dated from `now` so expiry is always on show. Names and values are samples. */
export function seed(now = Date.now()) {
  const d = (n) => iso(now + n * DAY);
  const rows = [
    { id: "d1", name: "EasySpotOps service agreement.pdf", category: "contract", property: "all", share: "admins", updated: d(-92), expires: null, size: 412000 },
    { id: "d2", name: "Certificate of insurance.pdf", category: "insurance", property: "riverbend", share: "staff", updated: d(-340), expires: d(21), size: 188000 },
    { id: "d3", name: "Towing services agreement.pdf", category: "contract", property: "riverbend", share: "staff", updated: d(-400), expires: d(-5), size: 301000 },
    { id: "d4", name: "Parking rules and regulations.pdf", category: "policy", property: "all", share: "residents", updated: d(-30), expires: null, size: 256000 },
    { id: "d5", name: "Violation notice template.docx", category: "template", property: "all", share: "staff", updated: d(-58), expires: null, size: 38000 },
    { id: "d6", name: "Fire lane and visitor parking map.png", category: "plan", property: "riverbend", share: "staff", updated: d(-210), expires: null, size: 934000 },
    { id: "d7", name: "Resident welcome letter.docx", category: "template", property: "all", share: "residents", updated: d(-14), expires: null, size: 44000 },
  ];
  // Each one also has the moment it was uploaded (date and time, in the viewer's time zone), so a list can be sorted and narrowed by it.
  return migrateDocs(rows);
}
const SAMPLE_TIMES = { d1: [10, 15], d2: [14, 32], d3: [9, 5], d4: [16, 48], d5: [11, 20], d6: [13, 10], d7: [15, 40] };
/** A list saved by an older version: the sample documents get their time of day (anything else keeps its date only), and a document that was shared
 *  with property staff or residents is now for the whole team, since only the company's own people open Documents. */
export function migrateDocs(docs) {
  // A saved list can hold anything (a hand-edited or damaged value): only entries that are documents are kept.
  const valid = (r) => r && typeof r === "object" && typeof r.id === "string" && typeof r.name === "string" && r.name !== "";
  return docs.filter(valid).map((r) => {
    const share = SHARES.some(([id]) => id === r.share) ? r.share : "team";
    let at = r.uploadedAt;
    if (!Number.isFinite(at) && SAMPLE_TIMES[r.id]) {
      const t = new Date(`${r.updated}T00:00:00`);
      t.setHours(...SAMPLE_TIMES[r.id], 0, 0);
      at = t.getTime();
    }
    return share === r.share && at === r.uploadedAt ? r : { ...r, share, ...(Number.isFinite(at) ? { uploadedAt: at } : {}) };
  });
}

/** When a document was uploaded, in ms: its own time, or midnight of its date when it was saved before times were kept. */
export const uploadedMs = (d) => (Number.isFinite(d.uploadedAt) ? d.uploadedAt : Date.parse(`${d.updated}T00:00:00`));
/** Whether the time of day is known (a list saved before times were kept has dates only). */
export const hasUploadTime = (d) => Number.isFinite(d.uploadedAt);

/** Narrow by when it was uploaded, and the ways a list can be put in order. */
export const RANGES = [
  ["any", "Any time"],
  ["7", "Last 7 days"],
  ["30", "Last 30 days"],
  ["90", "Last 90 days"],
  ["365", "Last 12 months"],
];
export const SORTS = [
  ["attention", "Needs attention first"],
  ["newest", "Newest upload"],
  ["oldest", "Oldest upload"],
  ["name", "Name, A to Z"],
  ["expiry", "Expires soonest"],
];
export const rangeLabel = (id) => label(RANGES, id);
export const sortLabel = (id) => label(SORTS, id);

/** none (no date) · ok · soon (within SOON_DAYS) · expired */
export function expiryState(expires, now = Date.now(), soonDays = SOON_DAYS) {
  if (!expires) return "none";
  const today = Date.parse(iso(now));
  const days = Math.round((Date.parse(expires) - today) / DAY);
  if (days < 0) return "expired";
  return days <= soonDays ? "soon" : "ok";
}
export const daysLeft = (expires, now = Date.now()) => Math.round((Date.parse(expires) - Date.parse(iso(now))) / DAY);

const RANK = { expired: 0, soon: 1, ok: 2, none: 2 };
/** Needs attention first (expired, then soon, soonest first), then the most recently updated. */
export function sortDocs(docs, now = Date.now(), soonDays = SOON_DAYS, mode = "attention") {
  const byNewest = (a, b) => uploadedMs(b) - uploadedMs(a);
  if (mode === "newest") return docs.slice().sort(byNewest);
  if (mode === "oldest") return docs.slice().sort((a, b) => -byNewest(a, b));
  if (mode === "name") return docs.slice().sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  if (mode === "expiry") {
    // the nearest end date first (expired ones lead); no end date goes last
    return docs.slice().sort((a, b) => (a.expires && b.expires ? (a.expires < b.expires ? -1 : a.expires > b.expires ? 1 : byNewest(a, b)) : a.expires ? -1 : b.expires ? 1 : byNewest(a, b)));
  }
  return docs.slice().sort((a, b) => {
    const sa = expiryState(a.expires, now, soonDays);
    const sb = expiryState(b.expires, now, soonDays);
    if (RANK[sa] !== RANK[sb]) return RANK[sa] - RANK[sb];
    if (RANK[sa] < 2 && a.expires !== b.expires) return a.expires < b.expires ? -1 : 1;
    return byNewest(a, b);
  });
}

/** `f`: { q, category ('all' or an id), property ('all' or an id; a document for all properties shows under every property), range ('any' or a number of days back from `now`) }. */
export function filterDocs(docs, f = {}, now = Date.now()) {
  const q = String(f.q || "")
    .trim()
    .toLowerCase();
  const days = f.range && f.range !== "any" ? Number(f.range) : 0;
  return docs.filter((d) => {
    if (days && uploadedMs(d) < now - days * DAY) return false;
    if (f.category && f.category !== "all" && d.category !== f.category) return false;
    if (f.property && f.property !== "all" && d.property !== "all" && d.property !== f.property) return false;
    return !q || `${d.name} ${categoryLabel(d.category)} ${propertyLabel(d.property)} ${shareLabel(d.share)}`.toLowerCase().includes(q);
  });
}

export function counts(docs, now = Date.now(), soonDays = SOON_DAYS) {
  const c = { total: docs.length, soon: 0, expired: 0 };
  for (const d of docs) {
    const s = expiryState(d.expires, now, soonDays);
    if (s === "soon") c.soon += 1;
    if (s === "expired") c.expired += 1;
  }
  return c;
}

/** What a person typed in the upload form: returns { ok, errors: { field: text }, doc }. `file` is { name, size } or null. */
export function validateUpload(input, now = Date.now()) {
  const errors = {};
  const file = input.file;
  if (!file || !file.name) errors.file = "Choose a file to upload.";
  else {
    const ext = String(file.name).split(".").pop().toLowerCase();
    if (!ACCEPT.includes(ext)) errors.file = `That file type is not accepted. Use ${ACCEPT.join(", ")}.`;
    else if (file.size > MAX_BYTES) errors.file = "That file is over 10 MB. Choose a smaller one.";
  }
  const name = String(input.name || "").trim();
  if (!name) errors.name = "Give the document a name.";
  else if (name.length > 120) errors.name = "Use 120 characters or fewer.";
  // the name that is kept has the file type added: that whole name is what the limit counts
  if (!errors.name && !errors.file && file && file.name) {
    const kept = `${name.replace(/\.[a-z0-9]+$/i, "")}.${String(file.name).split(".").pop().toLowerCase()}`;
    if (kept.length > 120) errors.name = "Use 120 characters or fewer, counting the file type.";
  }
  if (!CATEGORIES.some(([k]) => k === input.category)) errors.category = "Choose a category.";
  if (!PROPERTIES.some(([k]) => k === input.property)) errors.property = "Choose a property.";
  if (!SHARES.some(([k]) => k === input.share)) errors.share = "Choose who can see it.";
  if (input.expires && !/^\d{4}-\d{2}-\d{2}$/.test(input.expires)) errors.expires = "Use a valid date.";
  if (Object.keys(errors).length) return { ok: false, errors };
  const ext = String(file.name).split(".").pop().toLowerCase();
  const base = name.replace(/\.[a-z0-9]+$/i, "");
  return {
    ok: true,
    errors,
    doc: {
      id: `u${now}`,
      name: `${base}.${ext}`,
      category: input.category,
      property: input.property,
      share: input.share,
      updated: iso(now),
      uploadedAt: now,
      expires: input.expires || null,
      size: file.size,
    },
  };
}

/* ---- The W-9 is kept locked. To view, download or replace it, the business uses its Document secret key. The key is not chosen and not kept: it is made new
   each time, goes to the admin's email, shows in the linked authenticator app or is generated in Workspace settings, works once, for 5 minutes, and is never made again.
   Only one key is alive at a time, and the next can be made only when the last one's time is over.
   The unlock then lasts a few minutes and closes again. In this preview nothing is sent, so the dialog shows the key ("Preview only"). ---- */
export const KEY_VIA = [
  ["email", "Send it to my email"],
  ["app", "Show it in my authenticator app"],
];
/** 31 characters: no 0, O, 1, I or L, which are mistaken for each other when a key is copied by eye. */
export const KEY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const KEY_CHARS = 16; // four groups of four: about 79 bits
export const KEY_TTL_MS = 5 * 60 * 1000; // a key lives 5 minutes, then it is another key
export const MAX_TRIES = 5;
export const UNLOCK_MS = 5 * 60 * 1000;
export const ISSUED_MAX = 500;

/** b•••••@amcllc.example */
export function maskEmail(email) {
  const [user = "", host = ""] = String(email).split("@");
  return `${user.slice(0, 1)}${"•".repeat(Math.max(user.length - 1, 3))}@${host}`;
}

const cryptoRand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
export const normalizeKey = (s) =>
  String(s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
/** K7Q9-M2XD-R8TA-W4HN */
export const formatKey = (s) => normalizeKey(s).replace(/(.{4})(?=.)/g, "$1-");
/** A new key. `rand` (0 up to, not including, 1) is injectable so tests are exact. */
export function randomKey(rand = cryptoRand) {
  let k = "";
  for (let i = 0; i < KEY_CHARS; i += 1) k += KEY_ALPHABET[Math.floor(rand() * KEY_ALPHABET.length)];
  return formatKey(k);
}
export async function digestKey(key) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalizeKey(key))));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
/** A key that has never been made before. `issued` is the list of digests of every key ever made (the keys themselves are not kept). */
export async function generateUnused(issued = [], rand) {
  for (let i = 0; i < 10; i += 1) {
    const key = randomKey(rand);
    const digest = await digestKey(key);
    if (!issued.includes(digest)) return { key, digest };
  }
  throw new Error("Could not make a new key");
}
export const rememberIssued = (issued, digest, max = ISSUED_MAX) => [digest, ...(issued || []).filter((d) => d !== digest)].slice(0, max);

/** The one key that is alive: made in Workspace settings ("Generate key") or sent to the admin from Documents (`via`: 'settings' | 'email' | 'app').
 *  Only its digest is kept. There is one at a time, for KEY_TTL_MS; no other key can be made until that time is over (see canMakeKey). */
export const makePending = (digest, now = Date.now(), via = "email") => ({ digest, via, madeAt: now, expiresAt: now + KEY_TTL_MS, tries: 0 });
/** A key is alive if it has time left and tries left. */
export const isLive = (p, now = Date.now()) => !!p && p.expiresAt > now && p.tries < MAX_TRIES;
/** Keys are not made by the dozen: a new one can be made only once the last one's time is over, even if it was used. `windowUntil` is when that was (0 if never). */
export const canMakeKey = (windowUntil, now = Date.now()) => !windowUntil || now >= windowUntil;
export const keyWaitMs = (windowUntil, now = Date.now()) => Math.max(0, (windowUntil || 0) - now);
/** m:ss */
export const clock = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
/** Checks what was typed against the live key. Spaces, dashes and case do not matter. Never changes the one passed in.
 *  A wrong key uses one try (five and it is dead); a right key works once: `pending` is null after it. */
export async function checkPending(p, input, now = Date.now()) {
  const typed = normalizeKey(input);
  if (!p) return { ok: false, reason: "expired", pending: p };
  if (p.tries >= MAX_TRIES) return { ok: false, reason: "locked", left: 0, pending: p };
  if (now > p.expiresAt) return { ok: false, reason: "expired", pending: p };
  if (typed.length !== KEY_CHARS) return { ok: false, reason: "format", left: MAX_TRIES - p.tries, pending: p };
  if ((await digestKey(typed)) === p.digest) return { ok: true, pending: null };
  const next = { ...p, tries: p.tries + 1 };
  return { ok: false, reason: next.tries >= MAX_TRIES ? "locked" : "wrong", left: MAX_TRIES - next.tries, pending: next };
}
export const isUnlocked = (until, now = Date.now()) => Number(until) > now;
/** The last few times the W-9 was opened, newest first. */
export const recordAccess = (log, entry, max = 5) => [entry, ...(log || [])].slice(0, max);

export const w9ClassLabel = (id) => label(W9_CLASSES, id);
export const isW9 = (d) => d && d.kind === "w9";

/* ---- An extra layer: a PIN or a password the business sets for its Document secret key. With it on, opening the W-9 needs the new one-time key AND the PIN
   or password. Only a scrambled copy (salted PBKDF2) is kept, so it cannot be read back. Too many wrong tries pause trying for a while. ---- */
export const GUARD_TYPES = [
  ["pin", "PIN"],
  ["password", "Password"],
];
export const PIN_LENGTH = 6;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;
export const GUARD_ITER = 120000;
export const GUARD_TRIES = 5;
export const GUARD_PAUSE_MS = 5 * 60 * 1000;
const EASY_PASSWORDS = ["password", "password1", "12345678", "123456789", "1234567890", "qwertyui", "qwerty123", "00000000", "11111111", "letmein1", "iloveyou"];
const sequential = (s) => "0123456789".includes(s) || "9876543210".includes(s);

/** What a person typed when choosing a PIN or a password: { ok, errors: { value, confirm } }. */
export function validateGuard(type, value, confirm, company = "") {
  const errors = {};
  const v = String(value || "");
  if (type === "pin") {
    if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(v)) errors.value = `A PIN is ${PIN_LENGTH} digits.`;
    else if (new Set(v).size === 1 || sequential(v)) errors.value = "That PIN is too easy to guess. Avoid repeats and runs like 123456.";
  } else if (type === "password") {
    if (v.length < PASSWORD_MIN) errors.value = `Use at least ${PASSWORD_MIN} characters.`;
    else if (v.length > PASSWORD_MAX) errors.value = `Use ${PASSWORD_MAX} characters or fewer.`;
    else if (new Set(v).size < 4) errors.value = "Use a password with more different characters.";
    else if (EASY_PASSWORDS.includes(v.toLowerCase())) errors.value = "That password is too easy to guess.";
    else if (company && v.toLowerCase().includes(String(company).toLowerCase().replace(/\s+/g, ""))) errors.value = "Do not use your company name in the password.";
  } else errors.value = "Choose PIN or password.";
  if (!errors.value && v !== String(confirm || "")) errors.confirm = "The two entries are not the same.";
  return { ok: !Object.keys(errors).length, errors };
}
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function derive(value, salt, iter) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(value), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, base, 256));
}
/** The record that is kept: the kind, a salt and the scrambled value, never the value. */
export async function makeGuard(type, value, now = Date.now()) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { v: 1, type, iter: GUARD_ITER, salt: b64(salt), hash: b64(await derive(String(value), salt, GUARD_ITER)), set: iso(now) };
}
export async function verifyGuard(record, value) {
  if (!record || !record.hash) return false;
  const got = await derive(String(value), unb64(record.salt), record.iter);
  const want = unb64(record.hash);
  let diff = got.length ^ want.length;
  for (let i = 0; i < got.length; i += 1) diff |= got[i] ^ want[i % want.length];
  return diff === 0;
}
/** `att`: { n, lockUntil }. A wrong entry adds one; at GUARD_TRIES the next try waits GUARD_PAUSE_MS. */
export const canTryGuard = (att, now = Date.now()) => !att || !att.lockUntil || now >= att.lockUntil;
export function failGuard(att, now = Date.now()) {
  const base = att && (!att.lockUntil || now < att.lockUntil) ? att : { n: 0, lockUntil: 0 };
  const n = base.n + 1;
  return n >= GUARD_TRIES ? { n: 0, lockUntil: now + GUARD_PAUSE_MS } : { n, lockUntil: 0 };
}
export const guardTriesLeft = (att) => GUARD_TRIES - ((att && att.n) || 0);
export const guardLabel = (type) => (GUARD_TYPES.find(([k]) => k === type) || ["", "PIN or password"])[1];

/** The W-9 on file (the newest one), or null. */
export const findW9 = (docs) => docs.filter(isW9).sort((a, b) => (a.updated < b.updated ? 1 : -1))[0] || null;
/** missing (none on file) · ok · review (signed more than W9_REVIEW_YEARS years ago: ask whether it is still current) */
export function w9State(doc, now = Date.now()) {
  if (!doc) return "missing";
  const limit = new Date(now);
  limit.setUTCFullYear(limit.getUTCFullYear() - W9_REVIEW_YEARS);
  return doc.signed < iso(limit) ? "review" : "ok";
}

/** The W-9 form: a file (PDF or an image), the legal name, the tax classification and the date it was signed. No tax ID is asked for. */
export function validateW9(input, now = Date.now()) {
  const errors = {};
  const file = input.file;
  if (!file || !file.name) errors.file = "Choose the signed W-9.";
  else {
    const ext = String(file.name).split(".").pop().toLowerCase();
    if (!W9_ACCEPT.includes(ext)) errors.file = `Use a ${W9_ACCEPT.join(", ")} file.`;
    else if (file.size > MAX_BYTES) errors.file = "That file is over 10 MB. Choose a smaller one.";
  }
  const legal = String(input.legalName || "").trim();
  if (!legal) errors.legalName = "Enter the business name exactly as it is on the form.";
  else if (legal.length > 120) errors.legalName = "Use 120 characters or fewer.";
  if (!W9_CLASSES.some(([k]) => k === input.classification)) errors.classification = "Choose the tax classification from the form.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.signed || "")) errors.signed = "Enter the date it was signed.";
  else if (input.signed > iso(now)) errors.signed = "The signing date cannot be in the future.";
  if (Object.keys(errors).length) return { ok: false, errors };
  const ext = String(file.name).split(".").pop().toLowerCase();
  return {
    ok: true,
    errors,
    doc: {
      id: `w9-${now}`,
      kind: "w9",
      name: `Business W-9.${ext}`,
      category: "tax",
      property: "all",
      share: "admins",
      updated: iso(now),
      uploadedAt: now,
      expires: null,
      size: file.size,
      legalName: legal,
      classification: input.classification,
      signed: input.signed,
    },
  };
}

export const sizeLabel = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
