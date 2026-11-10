// Resident Settings page controller. <body data-portal="resident">.
// Profile (own contact details), Personalize (theme) and My property (the unit and the Social timeline, with an on/off switch).
// There is no workspace here: a resident has a property, not a workspace to run. Markup lives in partials/settings-app.html.

import { PORTALS, pickPersona, initials } from '../messaging/personas.js';
import { readPrefs, savePrefs, phoneError, isDark, demoEmail } from './prefs.js';
import { socialOn, needsGuidelines, residentState, setShow, timeline } from '../social/store.js';

const $ = (sel, root = document) => root.querySelector(sel);
const tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);
const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };

const portal = document.body.dataset.portal;
const me = pickPersona(portal, new URLSearchParams(location.search).get('as'));
const info = PORTALS[portal];
const storage = window.localStorage;
const withAs = (path) => path + location.search;
const root = document.documentElement;

$('#portal-label').textContent = `· ${info.label}`;

$('#btn-back').addEventListener('click', () => {
  let sameSite = false;
  try {
    const ref = new URL(document.referrer);
    sameSite = ref.origin === location.origin && !ref.pathname.endsWith('/settings.html');
  } catch { /* no referrer */ }
  if (sameSite && history.length > 1) history.back();
  else location.assign(info.home);
});

function toast(text) {
  const el = tpl('t-toast');
  $('[data-text]', el).textContent = text;
  const box = $('#toasts');
  box.appendChild(el);
  try { if (box.matches(':popover-open')) box.hidePopover(); box.showPopover(); } catch { /* older browsers */ }
  setTimeout(() => { el.remove(); if (!box.children.length) try { box.hidePopover(); } catch { /* already hidden */ } }, 3500);
}

/* -------------------------------------------------------------------- tabs */

const TABS = [['profile', 'Profile'], ['personalize', 'Personalize'], ['property', 'My property']];
let current = (location.hash.match(/^#\/(\w+)/) || [])[1];
if (!TABS.some((t) => t[0] === current)) current = 'profile';

function renderTabs() {
  const bar = $('#tabs');
  clear(bar);
  for (const [id, label] of TABS) {
    const b = tpl('t-tab');
    b.id = `tab-${id}`;
    b.textContent = label;
    b.setAttribute('aria-controls', `panel-${id}`);
    b.setAttribute('aria-selected', String(id === current));
    b.tabIndex = id === current ? 0 : -1;
    b.addEventListener('click', () => go(id));
    b.addEventListener('keydown', (e) => {
      const i = TABS.findIndex((t) => t[0] === id);
      const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1;
      if (n < 0) return;
      e.preventDefault();
      go(TABS[(n + TABS.length) % TABS.length][0], true);
    });
    bar.appendChild(b);
  }
  for (const [id] of TABS) $(`#panel-${id}`).hidden = id !== current;
}

function go(id, focus) {
  current = id;
  history.replaceState(null, '', `#/${id}`);
  renderTabs();
  if (id === 'property') renderProperty();
  if (focus) $(`#tab-${id}`).focus();
}

/* ----------------------------------------------------------------- profile */

function renderProfile() {
  const p = readPrefs(storage, me.id);
  $('#p-avatar').textContent = initials(me.name);
  $('#p-name').textContent = me.name;
  $('#p-unit').textContent = `${me.title} · ${me.org}`;
  $('#f-email').value = demoEmail(me.name);
  $('#f-phone').value = p.phone;
  $('#f-contact').value = p.contact;
}
$('#profile-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const phone = $('#f-phone').value;
  const err = phoneError(phone);
  $('#f-phone-err').textContent = err;
  $('#f-phone').setAttribute('aria-invalid', String(!!err));
  if (err) { $('#f-phone').focus(); return; }
  if (savePrefs(storage, me.id, { phone, contact: $('#f-contact').value })) toast('Saved');
  else toast('Could not save. Try again.');
});

/* -------------------------------------------------------------- personalize */

const systemDark = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const dark = isDark(readPrefs(storage, me.id).theme, systemDark.matches);
  root.classList.toggle('dark', dark);
  root.classList.toggle('light', !dark);
}
systemDark.addEventListener('change', applyTheme);

function renderTheme() {
  const box = $('#theme');
  clear(box);
  const now = readPrefs(storage, me.id).theme;
  for (const [v, label] of [['light', 'Light'], ['dark', 'Dark'], ['system', 'Same as my device']]) {
    const b = tpl('t-choice');
    b.textContent = label;
    b.setAttribute('aria-pressed', String(v === now));
    b.addEventListener('click', () => { savePrefs(storage, me.id, { theme: v }); applyTheme(); renderTheme(); toast(`Theme: ${label.toLowerCase()}`); });
    box.appendChild(b);
  }
}
// Comfort: the two switches change <html> at once and are remembered for every Resident page (preview.js applies them).
const applyComfort = () => {
  const p = readPrefs(storage, me.id);
  root.toggleAttribute('data-contrast', p.contrast);
  root.toggleAttribute('data-reduce-motion', p.reduceMotion);
  $('#sw-contrast').setAttribute('aria-checked', String(p.contrast));
  $('#sw-motion').setAttribute('aria-checked', String(p.reduceMotion));
};
for (const [id, key, on, off] of [['#sw-contrast', 'contrast', 'Higher contrast on', 'Higher contrast off'], ['#sw-motion', 'reduceMotion', 'Motion reduced', 'Motion back to normal']]) {
  $(id).addEventListener('click', () => {
    const next = !readPrefs(storage, me.id)[key];
    savePrefs(storage, me.id, { [key]: next });
    applyComfort();
    toast(next ? on : off);
  });
}
// The header sun/moon button flips the look for now; keep the saved choice in step with it.
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-theme-toggle]')) return;
  queueMicrotask(() => { savePrefs(storage, me.id, { theme: root.classList.contains('dark') ? 'dark' : 'light' }); renderTheme(); });
});

/* ------------------------------------------------------------- my property */

const fmtDate = (iso) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function renderProperty() {
  $('#prop-name').textContent = me.org;
  const meta = $('#prop-meta');
  clear(meta);
  const u = me.unit || {};
  for (const [k, v] of [['Unit', u.number], ['Building', u.building], ['Lease starts', u.leaseStart && fmtDate(u.leaseStart)], ['Lease ends', u.leaseEnd && fmtDate(u.leaseEnd)]]) {
    if (!v) continue;
    const row = tpl('t-meta');
    $('[data-k]', row).textContent = k;
    $('[data-v]', row).textContent = v;
    meta.appendChild(row);
  }

  const on = socialOn(storage);
  const shown = residentState(storage, me.id).show;
  const sw = $('#sw-social');
  sw.hidden = !on;
  sw.setAttribute('aria-checked', String(shown));
  const list = $('#timeline');
  clear(list);
  const note = $('#timeline-note');
  const link = $('#timeline-link');
  $('#open-social').href = withAs('/resident/social.html');
  note.hidden = true;
  link.hidden = true;
  if (!on) { note.hidden = false; note.textContent = 'The property team has turned Social off for now.'; return; }
  if (!shown) { note.hidden = false; note.textContent = 'Social is hidden. Turn the switch on to see the timeline again.'; return; }
  if (needsGuidelines(storage, me.id)) {
    note.hidden = false;
    note.textContent = 'Read the community guidelines to see the timeline.';
    link.hidden = false;
    $('#open-social').textContent = 'Read the guidelines';
    return;
  }
  const posts = timeline(storage, me.id, { limit: 5 });
  if (!posts.length) { note.hidden = false; note.textContent = 'No posts yet. Updates from your property will show up here.'; return; }
  for (const p of posts) {
    const li = tpl('t-entry');
    $('[data-name]', li).textContent = p.name;
    const t = $('[data-time]', li);
    t.textContent = p.t ? fmt.format(new Date(p.t)) : '';
    if (p.t) t.dateTime = new Date(p.t).toISOString();
    $('[data-text]', li).textContent = p.text.length > 160 ? `${p.text.slice(0, 157)}…` : p.text;
    $('[data-likes]', li).textContent = String(p.likes);
    $('[data-replies]', li).textContent = String(p.replies.length);
    list.appendChild(li);
  }
  link.hidden = false;
  $('#open-social').textContent = 'Open Social';
}

$('#sw-social').addEventListener('click', () => {
  const next = $('#sw-social').getAttribute('aria-checked') !== 'true';
  setShow(storage, me.id, next);
  toast(next ? 'Social is on' : 'Social is hidden');
  renderProperty();
});

addEventListener('storage', (e) => { if (!e.key || /^eso-(feed|mod|social|res-social|res-pref)/.test(e.key)) { applyTheme(); renderProperty(); renderProfile(); renderTheme(); } });

applyTheme();
applyComfort();
renderProfile();
renderTheme();
renderTabs();
renderProperty();
