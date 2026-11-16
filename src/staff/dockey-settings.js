/* Client Workspace settings > Security and data > Document secret key.
   The business W-9 in Documents is locked. This page says how it is opened and sets what the company controls:
     1. the way in: a secret key made new for each opening (works once, never made again), sent to the admin's email or shown in the authenticator app;
     2. where that key goes;
     3. an extra layer the company can add: a PIN or a password, needed together with the key;
     4. who opened the W-9, and when.
   The key itself is made by the Documents page when someone unlocks the W-9. Both pages share the "docs-secret:" storage keys (they do not start with "eso-",
   so the Client settings page's storage shim leaves them alone). Demo only: nothing is sent; no email is sent. */
import {
  makePending, checkPending, isLive, keyWaitMs, clock, maskEmail, generateUnused, rememberIssued, validateGuard, makeGuard, verifyGuard, canTryGuard, failGuard, guardTriesLeft, guardLabel,
  GUARD_PAUSE_MS, KEY_TTL_MS, UNLOCK_MS, PIN_LENGTH, PASSWORD_MIN,
} from '../features/documents/store.js';

const ME = { email: 'dana.whitfield@amcllc.example', company: 'AMC LLC' };
const K = { log: 'docs-secret:log', issued: 'docs-secret:issued', via: 'docs-secret:via', guard: 'docs-secret:guard', tries: 'docs-secret:tries', pending: 'docs-secret:pending', window: 'docs-secret:window' };
const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); if (v !== null && v !== undefined) return v; } catch { /* nothing yet */ } return d; };
const write = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dateFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const whenFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });
const minutes = (ms) => Math.round(ms / 60000);
const triesWord = (n) => `${n} ${n === 1 ? 'try' : 'tries'}`;
const toast = (m) => { try { window.toast(m); } catch { /* the prototype's toast */ } };
const redraw = () => { try { window.render(); } catch { /* the page draws on its next change */ } };

/* What the page is doing now: which part of the extra-protection card is open, and until when this section stays open. It lives here, not in the
   prototype's settings, because it is never saved: a reload, or leaving the section, locks it again. */
const OPEN_MS = 10 * 60 * 1000;
const ui = { mode: null, type: 'pin', verified: false, demo: '', open: 0, fresh: null }; // fresh: the live key made on this page, { key, digest }; memory only
const guardOf = () => read(K.guard, null);
/** With a PIN or password set, the section is shut until it is entered. Without one it is open. */
const isOpen = () => !guardOf() || ui.open > Date.now();
/** The line under "Document secret key" in the list of settings. */
export const dockeyDesc = () => (isOpen() ? 'The one-time key that opens the business W-9.' : 'Locked. Enter your PIN or password to open it.');

const row = (t, s, v) => `<div class="prow"><div><b>${t}</b><small>${s}</small></div>${v ? `<span class="pill">${v}</span>` : ''}</div>`;
const card = (t, s, body) => `<div class="pscard"><div class="hd"><div><h3>${t}</h3><p>${s}</p></div></div>${body}</div>`;
const field = (id, label, o = {}) =>
  `<div class="dk-f"><label for="${id}">${label}</label><input class="ix-in" id="${id}" name="${id}" type="${o.type || 'password'}" autocomplete="${o.auto || 'off'}"${o.inputmode ? ` inputmode="${o.inputmode}"` : ''} maxlength="${o.max || 64}" spellcheck="false"${o.upper ? ' autocapitalize="characters"' : ''}${o.ph ? ` placeholder="${o.ph}"` : ''} aria-describedby="${id}-e"><small class="cw-err" id="${id}-e" role="alert" hidden></small></div>`;
const btn = (label, attrs, kind = '') => `<button type="submit" class="stbtn sm ${kind}" ${attrs}>${label}</button>`;
const act = (label, a, kind = '') => `<button type="button" class="stbtn sm ${kind}" data-dk="${a}">${label}</button>`;

/* ---- the page ---- */
function pathCard() {
  const step = (n, t, s) => `<li><span class="dk-n" aria-hidden="true">${n}</span><div><b>${t}</b><small>${s}</small></div></li>`;
  return `<div class="pscard dk-pathcard"><ol class="dk-path">` +
    step(1, 'An admin asks to open it', 'On the locked W-9 in Documents, choose Unlock to view. The W-9 never shows its details while locked.') +
    step(2, 'A new secret key is made', `Sent to your email, shown in your authenticator app, or generated on this page. It works once for ${minutes(KEY_TTL_MS)} minutes and is never made again. Only one key is alive at a time, and the next can be made only when its time is over.`) +
    step(3, 'The W-9 opens, then locks again', `With the key, it opens for ${minutes(UNLOCK_MS)} minutes and locks by itself.`) +
    `</ol></div>`;
}

function viaCard() {
  const via = read(K.via, 'email') === 'app' ? 'app' : 'email';
  const opt = (v, t, s) => `<label class="dk-opt"><input type="radio" name="dk-via" value="${v}"${via === v ? ' checked' : ''}><span><b>${t}</b><small>${s}</small></span></label>`;
  return `<div class="pscard"><div class="hd"><div><h3>Where the key goes</h3><p>Only an admin of the company receives it.</p></div></div><div class="dk-opts" role="radiogroup" aria-label="Where the key goes">` +
    opt('email', 'Email', `A new key goes to ${esc(maskEmail(ME.email))}.`) +
    opt('app', 'Authenticator app', 'The key appears in the app linked to your account.') +
    `</div></div>`;
}

/* ---- the live key ----
   One secret key is alive at a time, for 5 minutes (a record of its digest in "docs-secret:pending"). While it is alive, and until its time is over, no other key
   can be made: neither here nor in Documents ("docs-secret:window"), so keys are not made by the dozen. The key itself is shown only in the "Open key" modal and only
   from this page's memory; a reload keeps the live key working but cannot show it again. */
const live = () => { const p = read(K.pending, null); return isLive(p) ? p : null; };
const waitMs = () => keyWaitMs(read(K.window, 0));
const onSection = () => /^#\/workspace\/dockey/.test(location.hash);
/** The key that can be shown now: the one just made here, if it is still the live one. */
const shown = () => { const p = live(); return p && ui.fresh && ui.fresh.digest === p.digest ? ui.fresh : null; };
const viaLabel = (v) => (v === 'settings' ? 'Made here' : v === 'app' ? 'Sent to your authenticator app' : `Sent to ${maskEmail(ME.email)}`);

/** One line: what it is on the left, what can be done on the right. */
const line = (left, right = '') => `<div class="dk-line"><div class="dk-lt">${left}</div>${right ? `<div class="dk-la">${right}</div>` : ''}</div>`;

function keyCard() {
  const p = live();
  const wait = waitMs();
  let body;
  if (p) {
    body = line(`<span class="dk-dot on" aria-hidden="true"></span><div><b>Active</b><small><span data-dk-count>${clock(p.expiresAt - Date.now())} left</span> · ${esc(viaLabel(p.via))}</small></div>`,
      shown() ? act('Open key', 'openkey', 'p') : '<small class="dk-quiet">Cannot be shown again</small>') +
      '<p class="dk-foot">A new key can be made when this one ends.</p>';
  } else if (wait > 0) {
    body = line(`<span class="dk-dot" aria-hidden="true"></span><div><b>No key active</b><small>A new key can be made in <span data-dk-wait>${clock(wait)}</span></small></div>`);
  } else {
    body = line('<span class="dk-dot" aria-hidden="true"></span><div><b>No key active</b></div>', act('Generate key', 'generate', 'p'));
  }
  return `<div class="pscard"><div class="hd"><div><h3>Secret key</h3><p>Opens the business W-9. Works once, for ${minutes(KEY_TTL_MS)} minutes.</p></div></div>${body}</div>`;
}

/** The "Open key" modal: the live key, big, with its time. */
let keyDialog = null;
function ensureDialog() {
  if (keyDialog && keyDialog.isConnected) return keyDialog;
  keyDialog = document.createElement('dialog');
  keyDialog.className = 'dk-dlg';
  keyDialog.setAttribute('aria-labelledby', 'dk-dlg-title');
  document.body.appendChild(keyDialog);
  return keyDialog;
}
function paintDialog() {
  const d = keyDialog;
  if (!d || !d.open) return;
  const f = shown();
  const p = live();
  d.innerHTML = `<div class="dk-dlg-in"><div class="dk-dlg-hd"><h2 id="dk-dlg-title">Secret key</h2><p>Enter this key in Documents to open the business W-9.</p></div>` +
    (f && p
      ? `<div class="dk-keybox"><code aria-label="Your secret key">${esc(f.key)}</code>${act('Copy', 'copy')}</div>` +
        `<p class="dk-help"><b data-dk-dcount>${clock(p.expiresAt - Date.now())}</b> left · Works once · A new key can be made after that.</p>`
      : '<p class="dk-empty">This key has run out. It is no longer valid.</p>') +
    `<div class="dk-actions"><button type="button" class="stbtn sm p" data-dk="closekey">Close</button></div></div>`;
}
function openKeyModal() {
  const d = ensureDialog();
  if (!d.open) d.showModal();
  paintDialog();
  d.querySelector('[data-dk=copy]')?.focus();
}

/** One ticker for everything that counts down; it only runs while this section is on screen. */
let tickId = null;
let lastState = null;
const keyState = () => (live() ? 'live' : waitMs() > 0 ? 'wait' : 'idle');
function paintTicker() {
  if (!onSection()) { clearInterval(tickId); tickId = null; lastState = null; return; }
  const p = live();
  const c = document.querySelector('[data-dk-count]');
  if (c && p) c.textContent = `${clock(p.expiresAt - Date.now())} left`;
  const w = document.querySelector('[data-dk-wait]');
  if (w) w.textContent = clock(waitMs());
  const dc = document.querySelector('[data-dk-dcount]');
  if (dc && p) dc.textContent = clock(p.expiresAt - Date.now());
  // When the live key ends, or the wait ends, the card changes (the button becomes available): draw it again.
  const s = keyState();
  if (lastState !== null && s !== lastState) { lastState = s; if (keyDialog && keyDialog.open) paintDialog(); redraw(); } else lastState = s;
}
function ensureTicker() {
  if (tickId || !onSection()) return;
  lastState = keyState();
  tickId = setInterval(paintTicker, 1000);
}
/** Makes a key nobody has had before and makes it the live key. Refused while the last key's time is not over. */
async function generate(via = 'settings') {
  if (waitMs() > 0) return null;
  const { key, digest } = await generateUnused(read(K.issued, []));
  write(K.issued, rememberIssued(read(K.issued, []), digest));
  const p = makePending(digest, Date.now(), via);
  write(K.pending, p);
  write(K.window, p.expiresAt);
  return { key, digest };
}

/** A forgotten PIN or password: the live key proves who is asking, so a new one can be chosen. A key is made only if none is alive and the wait is over. */
function forgotForm(label) {
  const p = live();
  const wait = waitMs();
  return `<form class="dk-form" data-dk-form="forgot" novalidate><p class="dk-note">Confirm it is you with the secret key. Then you can choose a new ${esc(label)}.</p>` +
    (p ? `${ui.demo ? `<p class="dk-demo">${esc(ui.demo)}</p>` : '<p class="dk-note">A key is already active. Enter it below.</p>'}` + field('dk-key', 'Secret key', { type: 'text', upper: 1, ph: 'XXXX-XXXX-XXXX-XXXX', max: 24, auto: 'one-time-code' }) : '') +
    `<div class="dk-actions">${act('Cancel', 'cancel')}${p ? btn('Verify', 'data-dk-save', 'p') : wait > 0 ? `<button type="button" class="stbtn sm" disabled>New key in ${clock(wait)}</button>` : act('Send key', 'sendkey', 'p')}</div></form>`;
}

/** What the section shows while it is locked: only the way in. */
function gateCard() {
  const g = guardOf();
  const label = guardLabel(g.type);
  const pin = g.type === 'pin';
  const body = ui.mode === 'forgot'
    ? forgotForm(label)
    : `<form class="dk-form" data-dk-form="gate" novalidate>${field('dk-gate', label, { inputmode: pin ? 'numeric' : '', max: pin ? PIN_LENGTH : 64 })}` +
      `<div class="dk-actions">${act('Forgot it?', 'forgot')}${btn('Open', 'data-dk-save', 'p')}</div></form>`;
  return `<div class="cw dk"><div class="pscard dk-gate"><div class="hd"><div><h3>This section is locked</h3><p>Enter your ${esc(label)} to see and change the Document secret key settings.</p></div><span class="dk-chip">Locked</span></div>${body}</div></div>`;
}

function guardCard() {
  const g = read(K.guard, null);
  const label = g ? guardLabel(g.type) : '';
  const head = (state) => `<div class="hd"><div><h3>Lock this section</h3><p>Ask for a PIN or password before it opens.</p></div><span class="dk-chip${g ? ' on' : ''}">${state}</span></div>`;
  let body = '';
  if (ui.mode === 'set') {
    const pin = ui.type === 'pin';
    body = (ui.verified ? '<p class="dk-note">You are verified. Choose a new one. The old one stops working.</p>' : '') +
      `<form class="dk-form" data-dk-form="set" novalidate>` +
      `<fieldset class="dk-seg"><legend class="sr-only">Type</legend>` +
      `<label><input type="radio" name="dk-type" value="pin"${pin ? ' checked' : ''}><span>PIN</span></label><label><input type="radio" name="dk-type" value="password"${pin ? '' : ' checked'}><span>Password</span></label></fieldset>` +
      `<p class="dk-help">${pin ? `${PIN_LENGTH} digits. Not a repeat or a run like 123456.` : `${PASSWORD_MIN} to 64 characters. A few words work well. Not your company name.`}</p>` +
      field('dk-new', pin ? 'New PIN' : 'New password', { inputmode: pin ? 'numeric' : '', max: pin ? PIN_LENGTH : 64, auto: 'new-password' }) +
      field('dk-confirm', 'Type it again', { inputmode: pin ? 'numeric' : '', max: pin ? PIN_LENGTH : 64, auto: 'new-password' }) +
      `<div class="dk-actions">${act('Cancel', 'cancel')}${btn(`Save ${pin ? 'PIN' : 'password'}`, 'data-dk-save', 'p')}</div></form>`;
  } else if (ui.mode === 'change') {
    const pin = g.type === 'pin';
    body = `<form class="dk-form" data-dk-form="change" novalidate>` +
      field('dk-current', `Current ${label}`, { inputmode: pin ? 'numeric' : '', max: pin ? PIN_LENGTH : 64 }) +
      field('dk-new', `New ${label}`, { inputmode: pin ? 'numeric' : '', max: pin ? PIN_LENGTH : 64, auto: 'new-password' }) +
      field('dk-confirm', 'Type it again', { inputmode: pin ? 'numeric' : '', max: pin ? PIN_LENGTH : 64, auto: 'new-password' }) +
      `<div class="dk-actions">${act('Cancel', 'cancel')}${btn(`Change ${label}`, 'data-dk-save', 'p')}</div></form>`;
  } else if (ui.mode === 'remove') {
    const pin = g.type === 'pin';
    body = `<form class="dk-form" data-dk-form="remove" novalidate>` +
      '<p class="dk-note">Without it, the secret key alone opens the W-9.</p>' +
      field('dk-current', `Current ${label}`, { inputmode: pin ? 'numeric' : '', max: pin ? PIN_LENGTH : 64 }) +
      `<div class="dk-actions">${act('Cancel', 'cancel')}${btn(`Remove ${label}`, 'data-dk-save', 'd')}</div></form>`;
  } else if (ui.mode === 'forgot') {
    body = forgotForm(label);
  } else if (g) {
    const link = (t, a) => `<button type="button" class="dk-link" data-dk="${a}">${t}</button>`;
    body = line(`<span class="dk-dot on" aria-hidden="true"></span><div><b>${label} is on</b><small>Set ${dateFmt.format(new Date(`${g.set}T00:00:00Z`))}. Asked each time this section opens.</small></div>`, act('Lock now', 'lock')) +
      `<div class="dk-links">${link(`Change ${label}`, 'change')}${link(`Remove ${label}`, 'remove')}${link('Forgot it?', 'forgot')}</div>`;
  } else {
    body = line('<span class="dk-dot" aria-hidden="true"></span><div><b>Not set</b><small>Anyone who can open Workspace settings can open this section.</small></div>', act('Add PIN or password', 'add'));
  }
  return `<div class="pscard">${head(g ? 'On' : 'Off')}${body}</div>`;
}

function logCard() {
  const log = read(K.log, []);
  const made = read(K.issued, []).length;
  return `<div class="pscard"><div class="hd"><div><h3>Recent openings</h3><p>${made} ${made === 1 ? 'key' : 'keys'} made so far. None is ever made twice.</p></div></div>` +
    (log.length
      ? log.map((e) => row(esc(e.by), esc(e.how), whenFmt.format(new Date(e.at)).replace(', ', ' · '))).join('')
      : '<p class="dk-empty">The W-9 has not been opened yet.</p>') +
    `<div class="dk-actions dk-row"><a class="stbtn sm" href="/client/documents.html" target="_top">Open Documents</a></div></div>`;
}

export function dockeyLeaf() {
  if (!isOpen()) return gateCard();
  ensureTicker();
  // No group headings: each card names itself. The path is the one thing that stands out; the rest is quiet.
  return `<div class="cw dk">${pathCard()}${keyCard()}${viaCard()}${guardCard()}${logCard()}</div>`;
}

/* ---- behavior ---- */
const err = (id, msg) => { const e = document.getElementById(`${id}-e`); const i = document.getElementById(id); if (!e || !i) return; e.hidden = !msg; e.textContent = msg || ''; i.setAttribute('aria-invalid', msg ? 'true' : 'false'); };
const val = (id) => (document.getElementById(id) ? document.getElementById(id).value : '');
const open = (mode) => { ui.mode = mode; ui.verified = mode === 'set' ? ui.verified : false; if (mode !== 'forgot') ui.demo = ''; redraw(); setTimeout(() => document.querySelector('.dk-form input:not([type=radio])')?.focus(), 30); };
const close = () => { ui.mode = null; ui.verified = false; ui.demo = ''; redraw(); };
const pause = (att) => `Too many tries. Try again in ${Math.max(1, Math.ceil((att.lockUntil - Date.now()) / 60000))} min.`;

async function verifyCurrent(g, id = 'dk-current') {
  const att = read(K.tries, null);
  if (!canTryGuard(att)) { err(id, pause(att)); return false; }
  if (await verifyGuard(g, val(id))) { write(K.tries, null); err(id, ''); return true; }
  const next = failGuard(att); write(K.tries, next);
  err(id, canTryGuard(next) ? `That ${guardLabel(g.type)} is not right. ${triesWord(guardTriesLeft(next))} left.` : `Too many tries. Try again in ${minutes(GUARD_PAUSE_MS)} min.`);
  return false;
}
/** The section opens for a while (and shuts by itself), once the PIN or password is right. */
let shutTimer = null;
function openSection() {
  ui.open = Date.now() + OPEN_MS;
  clearTimeout(shutTimer);
  shutTimer = setTimeout(() => { if (!isOpen()) redraw(); }, OPEN_MS + 200);
}
function shutSection() { ui.open = 0; clearTimeout(shutTimer); if (keyDialog && keyDialog.open) keyDialog.close(); } // shut means the key cannot be seen; the live key itself keeps working until its time is over

async function submit(kind) {
  const g = read(K.guard, null);
  if (kind === 'gate') {
    if (!(await verifyCurrent(g, 'dk-gate'))) { document.getElementById('dk-gate')?.select(); return; }
    openSection(); ui.mode = null; redraw();
    return;
  }
  if (kind === 'remove') {
    if (!(await verifyCurrent(g))) return;
    write(K.guard, null); write(K.tries, null);
    toast(`${guardLabel(g.type)} removed`); close();
    return;
  }
  if (kind === 'forgot') {
    const r = await checkPending(live(), val('dk-key'));
    write(K.pending, r.pending); // a wrong key uses a try; the right one is used up
    if (!r.ok) {
      err('dk-key', { format: 'Enter all 16 characters of the key.', wrong: `That key is not right. ${triesWord(r.left)} left.`, locked: `Too many tries. That key is dead. A new one can be made in ${clock(waitMs())}.`, expired: 'That key has expired. Cancel and send a new key.' }[r.reason]);
      return;
    }
    ui.demo = ''; ui.verified = true; ui.type = g ? g.type : 'pin'; write(K.tries, null);
    openSection(); // proving who is asking opens the section too, so a new PIN or password can be chosen
    open('set');
    return;
  }
  // set or change
  if (kind === 'change' && !(await verifyCurrent(g))) return;
  const type = kind === 'change' ? g.type : (document.querySelector('input[name=dk-type]:checked') || { value: ui.type }).value;
  const v = validateGuard(type, val('dk-new'), val('dk-confirm'), ME.company);
  err('dk-new', v.errors.value || ''); err('dk-confirm', v.errors.confirm || '');
  if (!v.ok) { document.getElementById(v.errors.value ? 'dk-new' : 'dk-confirm')?.focus(); return; }
  const rec = await makeGuard(type, val('dk-new'));
  write(K.guard, rec); write(K.tries, null);
  openSection(); // the person who just chose it is not shut out of their own page
  toast(kind === 'change' ? `${guardLabel(type)} changed` : `${guardLabel(type)} added`);
  close();
}

export function installDockey() {
  // Leaving the section shuts it: the next visit asks for the PIN or password again.
  window.addEventListener('hashchange', () => { if (!/^#\/workspace\/dockey/.test(location.hash)) { shutSection(); ui.mode = null; ui.demo = ''; } });
  window.addEventListener('click', async (e) => {
    const b = e.target.closest && e.target.closest('[data-dk]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const a = b.dataset.dk;
    if (a === 'cancel') close();
    else if (a === 'lock') { shutSection(); close(); toast('Section locked'); }
    else if (a === 'generate') {
      const made = await generate('settings');
      if (!made) { toast(`A new key can be made in ${clock(waitMs())}`); return; }
      ui.fresh = made;
      redraw();
      openKeyModal();
    } else if (a === 'openkey') openKeyModal();
    else if (a === 'closekey') keyDialog?.close();
    else if (a === 'copy') {
      try { await navigator.clipboard.writeText(ui.fresh.key); toast('Copied'); } catch { toast('Select the key and copy it'); }
    } else if (a === 'sendkey') {
      const via = read(K.via, 'email') === 'app' ? 'app' : 'email';
      const made = await generate(via);
      if (!made) { toast(`A new key can be made in ${clock(waitMs())}`); return; }
      ui.fresh = made;
      ui.demo = via === 'email' ? `Preview only: no email is sent. Your key is ${made.key}.` : `Preview only: your authenticator app shows ${made.key}.`;
      redraw();
      setTimeout(() => document.getElementById('dk-key')?.focus(), 30);
    } else open(a === 'add' ? 'set' : a);
  }, true);
  window.addEventListener('submit', (e) => {
    const f = e.target.closest && e.target.closest('[data-dk-form]');
    if (!f) return;
    e.preventDefault(); e.stopPropagation();
    submit(f.dataset.dkForm);
  }, true);
  window.addEventListener('change', (e) => {
    const t = e.target;
    if (t && t.name === 'dk-via') { write(K.via, t.value); toast(t.value === 'email' ? 'New keys go to your email' : 'New keys show in your authenticator app'); e.stopImmediatePropagation(); }
    else if (t && t.name === 'dk-type') { ui.type = t.value; redraw(); setTimeout(() => document.getElementById('dk-new')?.focus(), 30); e.stopImmediatePropagation(); }
  }, true);
}
