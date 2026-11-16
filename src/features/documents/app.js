// Documents page of the Client portal (Management > Documents): list, tabs by category, search, property filter, upload, remove with undo,
// and the locked business W-9 (a row of the list) with its unlock dialog.
// The W-9 opens with a secret key made new for each opening (works once, never made again).
// Where the key goes is set in Workspace settings > Document secret key (src/staff/dockey-settings.js), which shares the "docs-secret:" storage keys.
// That settings section can itself be locked with a PIN or password; opening the W-9 here needs only the key.
// All markup comes from client/documents-content.html (templates); this file clones them, fills text and toggles hidden / aria-*.
// Demo only: the list lives in this browser (localStorage "eso-docs:client"); no file is stored or sent, and no email is sent.
import {
  CATEGORIES, SHARES, PROPERTIES, W9_CLASSES, RANGES, SORTS, seed, sortDocs, filterDocs, counts, expiryState, daysLeft, validateUpload, categoryLabel, propertyLabel, shareLabel, sizeLabel,
  rangeLabel, sortLabel, hasUploadTime, migrateDocs, normalizeDocPrefs,
  isW9, findW9, w9State, validateW9, w9ClassLabel, MAX_TRIES,
  maskEmail, generateUnused, rememberIssued, makePending, checkPending, isLive, keyWaitMs, clock, isUnlocked, recordAccess, UNLOCK_MS,
} from './store.js';
import { ITEMS, normalizePurchased, limitFor, storageUsedGb, storageState, fits, gbLabel, money } from '../capacity/store.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);
const KEY = 'eso-docs:client';
// Shared with the settings page. They do not start with "eso-", so the Client settings page's storage shim leaves them alone.
const LOG_KEY = 'docs-secret:log';
const ISSUED_KEY = 'docs-secret:issued'; // digests of every secret key ever made, so none is made twice (the keys themselves are never kept)
const VIA_KEY = 'docs-secret:via';
const PENDING_KEY = 'docs-secret:pending'; // the one live key: its digest, how it was made, when it runs out, tries used
const WINDOW_KEY = 'docs-secret:window'; // when the last key's time is over: no new key before that
const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const when = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });
const day = (iso) => date.format(new Date(`${iso}T00:00:00Z`));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const ME = { name: 'Dana Whitfield', email: 'dana.whitfield@amcllc.example', company: 'AMC LLC' };

const read = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); if (v !== null && v !== undefined) return v; } catch { /* first visit, or storage blocked */ } return fallback; };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked: it lasts until the page closes */ } };
const stored = read(KEY, null);
let docs = Array.isArray(stored) ? migrateDocs(stored) : seed();
if (Array.isArray(stored) && stored.length && !docs.length) docs = seed(); // a saved list with nothing usable in it is the same as none
const save = () => write(KEY, docs);
// The sample documents are kept as soon as the page opens: the sidebar and Capacity read the same key, and they saw an empty list
// (0 files, 0 storage used) while this page showed seven documents.
if (!Array.isArray(stored)) save();
// What Workspace settings > Documents chose: how early an ending document is called "expiring", who sees a new document, whether to warn about storage.
const PREFS_KEY = 'docs-prefs:client';
let prefs = normalizeDocPrefs(read(PREFS_KEY, null));
const DISMISS_KEY = 'eso-docs-dismissed:client'; // how many expired / expiring documents were in view when each reminder was closed
const dismissed = (() => { const v = read(DISMISS_KEY, null); return { expired: Number(v?.expired) || 0, soon: Number(v?.soon) || 0 }; })();
const f = { q: '', category: 'all', property: 'all', range: 'any', sort: 'attention' };
let until = 0; // when the W-9's current unlock ends; in memory only, so a reload locks it again
let tick = null;

const options = (list, withAll) => (withAll ? [['all', withAll], ...list] : list).map(([v, t]) => new Option(t, v));
$('#f-property').replaceChildren(...options(PROPERTIES.filter(([k]) => k !== 'all'), 'All properties'));
$('#f-range').replaceChildren(...options(RANGES));
$('#f-sort').replaceChildren(...options(SORTS));
$('#u-category').replaceChildren(...options(CATEGORIES));
$('#u-property').replaceChildren(...options(PROPERTIES));
$('#u-share').replaceChildren(...options(SHARES));
$('#w-classification').replaceChildren(new Option('Choose…', ''), ...options(W9_CLASSES));

// ---- toasts (one at a time) ----
let toastTimer;
const toast = (text, undo) => {
  const box = $('#toasts');
  const t = tpl('t-toast');
  $('[data-f=text]', t).textContent = text;
  const u = $('[data-f=undo]', t);
  if (undo) { u.hidden = false; u.addEventListener('click', () => { undo(); t.remove(); }); }
  box.replaceChildren(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), undo ? 7000 : 2600);
};

// ---- render: tabs, alerts, list ----
function renderTabs() {
  const base = filterDocs(docs, { q: f.q, property: f.property, range: f.range });
  const tabs = [['all', 'All'], ...CATEGORIES].map(([id, label]) => {
    const b = tpl('t-tab');
    $('[data-f=label]', b).textContent = label;
    $('[data-f=count]', b).textContent = String(id === 'all' ? base.length : base.filter((d) => d.category === id).length);
    b.dataset.cat = id;
    const on = f.category === id;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
    return b;
  });
  $('#tabs').replaceChildren(...tabs);
  $('#tabs [aria-selected=true]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); // the tab bar scrolls sideways on a narrow screen: keep the open tab in view
}

/** The two reminders (expired, expiring soon). One that was dismissed stays closed until more documents are in that state than when it was closed. */
function renderAlerts() {
  const c = countsNow();
  for (const k of ['expired', 'soon']) if (!c[k] && dismissed[k]) { dismissed[k] = 0; write(DISMISS_KEY, dismissed); } // none left: the next one shows again
  const showExpired = c.expired > dismissed.expired;
  const showSoon = c.soon > dismissed.soon;
  $('#alert-expired').hidden = !showExpired;
  $('#alert-soon').hidden = !showSoon;
  $('#reminders').hidden = !(showExpired || showSoon);
  if (c.expired) $('#alert-expired-text').textContent = `${plural(c.expired, 'document')} expired`;
  if (c.soon) $('#alert-soon-text').textContent = `${plural(c.soon, 'document')} ${c.soon === 1 ? 'expires' : 'expire'} within ${prefs.soonDays} days`;
}
const countsNow = () => counts(docs, Date.now(), prefs.soonDays);

const show = (li, sel, on) => { const e = $(sel, li); if (e) e.hidden = !on; };
const showBadge = (li, name, on) => show(li, `[data-badge=${name}]`, on);

/** The documents in view. The business W-9 goes first. When none is on file, a "Needed" row stands in its place, in All and in Tax forms. */
function visibleRows() {
  const shown = sortDocs(filterDocs(docs, f), Date.now(), prefs.soonDays, f.sort).filter((d) => !isW9(d));
  const w9 = findW9(docs);
  const w9Shown = w9 && filterDocs([w9], f).length ? [w9] : [];
  const q = f.q.trim().toLowerCase();
  const needed = !w9 && f.range === 'any' && (f.category === 'all' || f.category === 'tax') && (!q || 'business w-9 tax form'.includes(q));
  return [...(needed ? [{ needed: true }] : []), ...w9Shown, ...shown];
}

/** "Uploaded Oct 7, 2026, 2:32 PM" (a list saved before times were kept shows the date only). */
function setUploaded(li, d) {
  const p = $('[data-f=uploaded]', li);
  p.hidden = false;
  p.textContent = `Uploaded ${hasUploadTime(d) ? when.format(new Date(d.uploadedAt)) : day(d.updated)}`;
}

function fillRow(li, d) {
  const state = d.needed ? 'needed' : isW9(d) ? 'w9' : 'doc';
  const open = state === 'w9' && isUnlocked(until);
  show(li, '[data-act=download]', state === 'doc' || open);
  show(li, '[data-act=remove]', state === 'doc');
  show(li, '[data-act=addw9]', state === 'needed');
  show(li, '[data-act=unlock]', state === 'w9' && !open);
  show(li, '[data-act=replace]', open);
  show(li, '[data-act=lock]', open);

  if (state === 'needed') {
    li.dataset.id = 'w9-needed';
    $('[data-f=name]', li).textContent = 'Business W-9';
    $('[data-f=meta]', li).textContent = 'Tax forms · All properties · Required for vendors and payments';
    $('[data-f=share]', li).textContent = 'Secure document'; // the W-9 is always kept for admins and behind the secret key
    showBadge(li, 'needed', true);
    return;
  }
  li.dataset.id = d.id;
  $('[data-f=share]', li).textContent = state === 'w9' ? 'Secure document' : shareLabel(d.share);
  if (state === 'w9') {
    // Locked: nothing from the form is shown, only that it is there and when it was last opened. Unlocked: the form's details.
    $('[data-f=name]', li).textContent = 'Business W-9';
    const last = read(LOG_KEY, [])[0];
    $('[data-f=meta]', li).textContent = open
      ? `${categoryLabel(d.category)} · ${propertyLabel(d.property)} · ${d.legalName} · ${w9ClassLabel(d.classification)} · Signed ${day(d.signed)} · ${d.name} · ${sizeLabel(d.size)}`
      : `${categoryLabel(d.category)} · ${propertyLabel(d.property)}${last ? ` · Last opened ${when.format(new Date(last.at))} by ${last.by}` : ''}`;
    setUploaded(li, d);
    showBadge(li, 'review', w9State(d) === 'review');
    showBadge(li, 'locked', !open);
    showBadge(li, 'unlocked', open);
    show(li, '[data-f=timer]', open);
    $('[data-act=download]', li).setAttribute('aria-label', 'Download the business W-9');
    $('[data-act=unlock]', li).setAttribute('aria-label', 'Unlock the business W-9 to view it');
    return;
  }
  $('[data-f=name]', li).textContent = d.name;
  $('[data-f=name]', li).title = d.name;
  $('[data-f=meta]', li).textContent = `${categoryLabel(d.category)} · ${propertyLabel(d.property)} · ${sizeLabel(d.size)}`;
  setUploaded(li, d);
  const ex = expiryState(d.expires, Date.now(), prefs.soonDays);
  if (ex === 'expired') { showBadge(li, 'expired', true); $('[data-badge=expired]', li).textContent = `Expired ${plural(Math.abs(daysLeft(d.expires)), 'day')} ago`; }
  if (ex === 'soon') { showBadge(li, 'soon', true); $('[data-badge=soon]', li).textContent = daysLeft(d.expires) === 0 ? 'Expires today' : `Expires in ${plural(daysLeft(d.expires), 'day')}`; }
  if (d.expires) { const e = $('[data-f=expires]', li); e.hidden = false; e.textContent = `${ex === 'expired' ? 'Ended' : 'Ends'} ${day(d.expires)}`; }
  $('[data-act=download]', li).setAttribute('aria-label', `Download ${d.name}`);
  $('[data-act=remove]', li).setAttribute('aria-label', `Remove ${d.name}`);
}

function renderList() {
  const rows = visibleRows();
  $('#list').replaceChildren(...rows.map((d) => { const li = tpl('t-row'); fillRow(li, d); return li; }));
  const none = !docs.length && !rows.length;
  $('#empty-filter').hidden = none || rows.length > 0;
  $('#empty-none').hidden = !none;
  paintTimer();
}

// ---- document storage: 10 GB are included; more is added in Usage > Capacity (which adds it to Billing & Plan) ----
const STORAGE = ITEMS.find((i) => i.id === 'storage');
const storageNow = () => ({ used: storageUsedGb(docs), limit: limitFor('storage', normalizePurchased(read('eso-capacity:client', null))) });
const addStorageText = `+${STORAGE.block} GB for ${money(STORAGE.price)}/mo`;
function renderStorage() {
  const { used, limit } = storageNow();
  let state = storageState(used, limit);
  if (state === 'near' && !prefs.storageWarn) state = 'ok'; // Workspace settings > Documents: no "almost full" notice (a full store is still said)
  const text = $('#storage-text');
  text.textContent = `${gbLabel(used)} of ${gbLabel(limit)} used${state === 'full' ? ' · Full' : state === 'near' ? ' · Almost full' : ''}`;
  const fill = $('#storage-fill');
  fill.style.width = `${Math.min(100, (used / limit) * 100)}%`;
  for (const el of [fill, text]) for (const s of ['near', 'full']) { if (state === s) el.setAttribute(`data-${s}`, ''); else el.removeAttribute(`data-${s}`); }
  $('#storage-bar').setAttribute('aria-label', `Document storage: ${gbLabel(used)} of ${gbLabel(limit)} used${state === 'full' ? ', full' : state === 'near' ? ', almost full' : ''}`);
}
/** Whether a file still fits; the message says what to do when it does not. */
function storageError(bytes) {
  const { used, limit } = storageNow();
  return fits(used, limit, bytes) ? '' : `Your document storage (${gbLabel(limit)}) has no room for this file. Add storage in Capacity (${addStorageText}), then upload it again.`;
}

function render() { renderStorage(); renderAlerts(); renderFilters(); renderTabs(); renderList(); }

// ---- the W-9's lock ----
function paintTimer() {
  const left = until - Date.now();
  if (until && left <= 0) { lock(true); return; }
  const s = Math.max(0, Math.ceil(left / 1000));
  for (const t of $$('[data-f=timer]')) t.textContent = `Locks again in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function lock(announce) {
  until = 0;
  clearInterval(tick); tick = null;
  render();
  if (announce) toast('W-9 locked');
}
function startTimer() {
  clearInterval(tick);
  tick = setInterval(paintTimer, 1000);
  paintTimer();
}

// ---- filters and tabs ----
// Search stays in view. Property, when it was uploaded and the order sit behind one Filters button; each one in use is a chip (click to remove).
const DEFAULT_F = { property: 'all', range: 'any', sort: 'attention' };
const SELECT_OF = { property: '#f-property', range: '#f-range', sort: '#f-sort' };
const filtersInUse = () => [
  ...(f.property !== 'all' ? [['property', propertyLabel(f.property)]] : []),
  ...(f.range !== 'any' ? [['range', `Uploaded: ${rangeLabel(f.range)}`]] : []),
  ...(f.sort !== 'attention' ? [['sort', `Sort: ${sortLabel(f.sort)}`]] : []),
];
function renderFilters() {
  const active = filtersInUse();
  $('#chips').replaceChildren(...active.map(([key, text]) => {
    const c = tpl('t-chip');
    $('[data-label]', c).textContent = text;
    c.setAttribute('aria-label', `Remove filter: ${text}`);
    c.dataset.key = key;
    return c;
  }));
  const badge = $('#filters-count');
  badge.hidden = active.length === 0;
  badge.textContent = String(active.length);
  $('#filters-btn').setAttribute('aria-label', active.length ? `Filters, ${active.length} in use` : 'Filters');
  $('#filters-clear').hidden = active.length === 0;
  for (const [k, sel] of Object.entries(SELECT_OF)) $(sel).value = f[k];
}
const fbtn = $('#filters-btn');
const fpanel = $('#filters-panel');
const closeFilters = (back = true) => {
  if (fpanel.hidden) return;
  fpanel.hidden = true;
  fbtn.setAttribute('aria-expanded', 'false');
  if (back) fbtn.focus();
};
fbtn.addEventListener('click', () => {
  if (!fpanel.hidden) { closeFilters(); return; }
  fpanel.hidden = false;
  fbtn.setAttribute('aria-expanded', 'true');
  $('#f-property').focus();
});
document.addEventListener('pointerdown', (e) => { if (!fpanel.hidden && !fpanel.contains(e.target) && !fbtn.contains(e.target)) closeFilters(false); });
fpanel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFilters(); } });
$('#search').addEventListener('input', (e) => { f.q = e.target.value; renderTabs(); renderList(); });
for (const [key, sel] of Object.entries(SELECT_OF)) $(sel).addEventListener('change', (e) => { f[key] = e.target.value; render(); });
$('#chips').addEventListener('click', (e) => {
  const key = e.target.closest('[data-key]')?.dataset.key;
  if (!key) return;
  f[key] = DEFAULT_F[key];
  render();
  fbtn.focus();
});
const resetFilters = () => {
  Object.assign(f, { q: '', category: 'all' }, DEFAULT_F);
  $('#search').value = '';
  render();
};
$('#filters-clear').addEventListener('click', () => { resetFilters(); closeFilters(); });
$('#clear').addEventListener('click', resetFilters);
$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[role=tab]');
  if (!b) return;
  f.category = b.dataset.cat;
  render();
  $('#tabs [aria-selected=true]')?.focus();
});
$('#tabs').addEventListener('keydown', (e) => {
  const tabs = $$('#tabs [role=tab]');
  const i = tabs.indexOf(document.activeElement);
  if (i < 0) return;
  const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
  if (to === undefined) return;
  e.preventDefault();
  tabs[(to + tabs.length) % tabs.length].click();
});

// ---- row actions ----
$('#list').addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  const li = e.target.closest('li[data-id]');
  if (!act || !li) return;
  if (act === 'addw9' || act === 'replace') { openW9Form(); return; }
  if (act === 'unlock') { openUnlock(); return; }
  if (act === 'lock') { lock(true); return; }
  if (act === 'download') { toast('Downloads are not part of this preview.'); return; }
  const i = docs.findIndex((d) => d.id === li.dataset.id);
  if (i < 0 || isW9(docs[i])) return; // the W-9 is replaced, never removed from the list
  const doc = docs[i];
  docs = docs.filter((d) => d.id !== doc.id);
  save(); render();
  $('#main-content').focus();
  toast(`Removed ${doc.name}`, () => { docs.splice(Math.min(i, docs.length), 0, doc); save(); render(); });
});

// ---- the business W-9: add or replace ----
const wdlg = $('#dlg-w9');
const wform = $('#w9-form');
const WFIELDS = ['file', 'legalName', 'classification', 'signed'];
const showW9Errors = (errors) => {
  for (const k of WFIELDS) {
    const p = $(`#w-${k}-err`); const input = $(`#w-${k}`);
    p.hidden = !errors[k]; p.textContent = errors[k] || '';
    input.setAttribute('aria-invalid', errors[k] ? 'true' : 'false');
  }
};
function openW9Form() {
  const doc = findW9(docs);
  wform.reset(); showW9Errors({});
  $('#w-legalName').value = doc ? doc.legalName : ME.company;
  if (doc) $('#w-classification').value = doc.classification;
  wdlg.showModal(); $('#w-file').focus();
}
$('#w9-cancel').addEventListener('click', () => wdlg.close());
wform.addEventListener('submit', (e) => {
  e.preventDefault();
  const file = $('#w-file').files[0];
  const r = validateW9({
    file: file ? { name: file.name, size: file.size } : null,
    legalName: $('#w-legalName').value, classification: $('#w-classification').value, signed: $('#w-signed').value,
  });
  if (r.ok) { const full = storageError(file.size - (findW9(docs)?.size || 0)); if (full) { r.ok = false; r.errors = { file: full }; } } // a replaced W-9 gives its space back
  showW9Errors(r.errors);
  if (!r.ok) { const first = WFIELDS.find((k) => r.errors[k]); if (first) $(`#w-${first}`).focus(); return; }
  const replaced = !!findW9(docs);
  docs = [r.doc, ...docs.filter((d) => !isW9(d))]; // one W-9 on file: the new one replaces the old
  save();
  wdlg.close();
  until = 0; clearInterval(tick); tick = null; // a new W-9 goes straight into the lock
  render();
  toast(replaced ? 'W-9 replaced and locked' : 'W-9 added and locked');
  $('#list [data-act=unlock]')?.focus();
});

// ---- unlock: the one live secret key (sent from here, or generated in Workspace settings) ----
// One key is alive at a time, for 5 minutes. No other key can be made until that time is over, so keys are not made by the dozen.
const udlg = $('#dlg-unlock');
const uform = $('#unlock-form');
let demo = null; // the key sent from here, kept only in memory so the "Preview only" line can show it again; the live record keeps just its digest
let windowTick = null;
const method = () => uform.elements.method.value;
const live = () => { const p = read(PENDING_KEY, null); return isLive(p) ? p : null; };
const waitMs = () => keyWaitMs(read(WINDOW_KEY, 0));
const setCodeErr = (msg) => { const p = $('#unlock-err'); p.hidden = !msg; p.textContent = msg || ''; $('#unlock-code').setAttribute('aria-invalid', msg ? 'true' : 'false'); };

/** What the modal says now: whether a key is waiting, and when the next one can be made. Runs every second while the modal is open. */
function paintUnlock() {
  const p = live();
  const wait = waitMs();
  const send = $('#unlock-send');
  send.disabled = wait > 0;
  send.textContent = wait > 0 ? `New key in ${clock(wait)}` : 'Send key';
  const code = $('#unlock-code');
  code.disabled = !p;
  const sent = $('#unlock-sent'); const hint = $('#unlock-demo');
  sent.hidden = !p; hint.hidden = !(p && demo && demo.digest === p.digest);
  // The preview's key is written into the page only while it is shown, and taken out again as soon as it is not (Cancel, a used or an expired key).
  hint.textContent = hint.hidden ? '' : (p.via === 'email' ? `Preview only: no email is sent. Your key is ${demo.key}.` : `Preview only: your authenticator app shows ${demo.key}.`);
  if (p) {
    sent.textContent = p.via === 'settings' ? 'A key made in Workspace settings is ready.' : p.via === 'app' ? 'Shown in your authenticator app.' : `Sent to ${maskEmail(ME.email)}.`;
    sent.textContent += ` It works once, and for ${clock(p.expiresAt - Date.now())} more.`;
    $('#unlock-code-help').textContent = 'Enter it here. Capitals and dashes do not matter.';
  } else {
    $('#unlock-code-help').textContent = wait > 0 ? 'The last key was used or has run out. A new one can be made when the time on the button is over.' : 'Send a key first, or generate one in Workspace settings. Capitals and dashes do not matter.';
  }
}

/** Makes a key that has never been made before (only its digest is kept), makes it the live key, and "sends" it. */
async function sendKey() {
  if (waitMs() > 0) return;
  const { key, digest } = await generateUnused(read(ISSUED_KEY, []));
  write(ISSUED_KEY, rememberIssued(read(ISSUED_KEY, []), digest));
  const p = makePending(digest, Date.now(), method());
  write(PENDING_KEY, p);
  write(WINDOW_KEY, p.expiresAt);
  demo = { key, digest };
  const mail = p.via === 'email';
  $('#unlock-demo').textContent = mail ? `Preview only: no email is sent. Your key is ${key}.` : `Preview only: your authenticator app shows ${key}.`;
  setCodeErr('');
  paintUnlock();
  $('#unlock-code').value = '';
  $('#unlock-code').focus();
}
function openUnlock() {
  uform.reset();
  const via = read(VIA_KEY, 'email');
  uform.elements.method.value = via === 'app' ? 'app' : 'email';
  $('#unlock-email').textContent = `A new key goes to ${maskEmail(ME.email)}.`;
  setCodeErr('');
  paintUnlock();
  clearInterval(windowTick);
  windowTick = setInterval(paintUnlock, 1000);
  udlg.showModal();
  $('input[name=method]:checked', uform).focus();
}
udlg.addEventListener('close', () => { clearInterval(windowTick); windowTick = null; const h = $('#unlock-demo'); if (h) { h.hidden = true; h.textContent = ''; } });
$('#unlock-cancel').addEventListener('click', () => udlg.close());
$('#unlock-send').addEventListener('click', () => sendKey());
uform.addEventListener('submit', async (e) => {
  e.preventDefault();
  setCodeErr('');
  const p = live();
  const stale = read(PENDING_KEY, null);
  if (!p && stale && Number(stale.expiresAt) <= Date.now() && stale.tries < MAX_TRIES) { setCodeErr('That key has expired. Send a new key.'); paintUnlock(); return; }
  if (!p) { setCodeErr(waitMs() > 0 ? `No key is active. A new one can be made in ${clock(waitMs())}.` : 'Send a key first, or generate one in Workspace settings.'); return; }
  const r = await checkPending(p, $('#unlock-code').value);
  write(PENDING_KEY, r.pending); // a wrong key uses a try; the right one is used up
  if (!r.ok) {
    setCodeErr({
      format: 'Enter all 16 characters of the key.',
      wrong: `That key is not right. ${r.left} ${r.left === 1 ? 'try' : 'tries'} left.`,
      locked: `Too many tries. That key is dead. A new one can be made in ${clock(waitMs())}.`,
      expired: 'That key has expired. Send a new key.',
    }[r.reason]);
    paintUnlock();
    $('#unlock-code').focus();
    return;
  }
  write(LOG_KEY, recordAccess(read(LOG_KEY, []), { at: Date.now(), by: ME.name, how: p.via === 'settings' ? 'key generated in settings' : `${p.via === 'app' ? 'authenticator app' : 'email'} key` }));
  demo = null;
  $('#unlock-demo').textContent = ''; // the preview's key must not stay in the page once it has been used
  until = Date.now() + UNLOCK_MS;
  udlg.close();
  render();
  startTimer();
  toast('W-9 unlocked for 5 minutes');
  $('#list [data-act=lock]')?.focus();
});

// ---- upload ----
const dlg = $('#dlg-upload');
const form = $('#upload-form');
const FIELDS = ['file', 'name', 'expires'];
const showErrors = (errors) => {
  for (const k of FIELDS) {
    const p = $(`#u-${k}-err`); const input = $(`#u-${k}`);
    p.hidden = !errors[k]; p.textContent = errors[k] || '';
    input.setAttribute('aria-invalid', errors[k] ? 'true' : 'false');
  }
};
$('#open-upload').addEventListener('click', () => { form.reset(); $('#u-share').value = prefs.share; showErrors({}); dlg.showModal(); $('#u-file').focus(); }); // "Who can see it" starts at the default chosen in Workspace settings
$('#upload-cancel').addEventListener('click', () => dlg.close());
// Inside the portal frame a native modal does not keep Tab in the box (focus leaves to the parent page), so wrap it by hand in every open dialog.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const open = document.querySelector('dialog[open]'); if (!open) return;
  const f = [...open.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter((x) => !x.disabled && x.tabIndex >= 0 && !x.hidden && x.getClientRects().length);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1], at = document.activeElement;
  if (e.shiftKey && (at === first || !open.contains(at))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (at === last || !open.contains(at))) { e.preventDefault(); first.focus(); }
});
$('#u-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && !$('#u-name').value.trim()) $('#u-name').value = file.name.replace(/\.[a-z0-9]+$/i, '');
});
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const file = $('#u-file').files[0];
  const r = validateUpload({
    file: file ? { name: file.name, size: file.size } : null,
    name: $('#u-name').value, category: $('#u-category').value, property: $('#u-property').value, share: $('#u-share').value, expires: $('#u-expires').value,
  });
  if (r.ok) { const full = storageError(file.size); if (full) { r.ok = false; r.errors = { file: full }; } }
  showErrors(r.errors);
  if (!r.ok) { const first = FIELDS.find((k) => r.errors[k]); if (first) $(`#u-${first}`).focus(); return; }
  docs = [r.doc, ...docs];
  save();
  dlg.close();
  Object.assign(f, { q: '', category: 'all', property: 'all', range: 'any' }); // so the new document is in view; the chosen order stays
  $('#search').value = '';
  render();
  toast(`Added ${r.doc.name}`);
});

// ---- reminders: each one has its own X ----
$('#reminders').addEventListener('click', (e) => {
  const k = e.target.closest('[data-dismiss]')?.dataset.dismiss;
  if (!k) return;
  const before = dismissed[k];
  dismissed[k] = countsNow()[k];
  write(DISMISS_KEY, dismissed);
  renderAlerts();
  (($$('#reminders > section').find((s) => !s.hidden)?.querySelector('[data-dismiss]')) || $('#main-content')).focus(); // the X that is left, else the page
  toast('Reminder dismissed', () => { dismissed[k] = before; write(DISMISS_KEY, dismissed); renderAlerts(); });
});

// Workspace settings changed in another tab or window: take the new Documents preferences without a reload.
addEventListener('storage', (e) => { if (e.key === PREFS_KEY) { prefs = normalizeDocPrefs(read(PREFS_KEY, null)); render(); } });

// ---- the (i) next to a title: a short explanation ----
const idlg = $('#dlg-info');
const INFO = { documents: 'About Documents', storage: 'About document storage' };
document.addEventListener('click', (e) => {
  const topic = e.target.closest('[data-info]')?.dataset.info;
  if (!topic) return;
  $('#dlg-info-title').textContent = INFO[topic];
  for (const body of $$('[data-info-body]', idlg)) body.hidden = body.dataset.infoBody !== topic;
  $('[data-f=included]', idlg).textContent = gbLabel(STORAGE.included);
  $('[data-f=add]', idlg).textContent = `Add ${STORAGE.block} GB for ${money(STORAGE.price)}/mo`;
  idlg.showModal();
  $('#info-close').focus();
});
$('#info-close').addEventListener('click', () => idlg.close());
idlg.addEventListener('click', (e) => { if (e.target === idlg) idlg.close(); }); // a click on the dimmed area closes it

render();
