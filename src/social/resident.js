// Resident Social page controller. <body data-portal="resident">.
// All markup and Tailwind classes live in partials/social-app.html; this file clones templates, fills text and toggles
// hidden / data-* / aria-*. A resident reads and interacts (like, reply). There is no composer and no store function that posts.

import { PORTALS, pickPersona, initials } from '../messaging/personas.js';
import { socialOn, guidelines, canReply, needsGuidelines, acceptGuidelines, setShow, residentState, timeline, toggleLike, addReply, MAX_REPLY } from './store.js';

const $ = (sel, root = document) => root.querySelector(sel);
const tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);
const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };

const portal = document.body.dataset.portal;
const me = pickPersona(portal, new URLSearchParams(location.search).get('as'));
const info = PORTALS[portal];
const storage = window.localStorage;
const withAs = (path) => path + location.search;
const open = new Set(); // posts whose replies are showing
const ui = { tab: 'foryou' };

/* ------------------------------------------------------------------ header */

$('#portal-label').textContent = `· ${info.label}`;
$('#me-avatar').textContent = initials(me.name);
$('#me-name').textContent = me.name;
$('#me-link').href = withAs('/resident/settings.html');
$('#me-link').setAttribute('aria-label', `${me.name}, settings`);

$('#btn-back').addEventListener('click', () => {
  let sameSite = false;
  try {
    const ref = new URL(document.referrer);
    sameSite = ref.origin === location.origin && !ref.pathname.endsWith('/social.html');
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

function badge(text, tone = 'neutral') {
  const el = tpl('t-badge');
  el.dataset.tone = tone;
  el.textContent = text;
  return el;
}

const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
// "now", "5m", "2h", "3d", then the date: the same short times the Staff feed shows.
const when = (t) => {
  if (!t) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return fmt.format(new Date(t));
};
const iso = (t) => (t ? new Date(t).toISOString() : '');

/* --------------------------------------------------------------------- feed */

function render() {
  const feed = $('#feed');
  const empty = $('#empty');
  clear(feed);
  clear(empty);
  const on = socialOn(storage);
  const shown = residentState(storage, me.id).show;
  $('#bar').hidden = !on;
  $('#btn-hide').hidden = !shown;
  const gated = on && needsGuidelines(storage, me.id);
  const all = on && shown && !gated ? timeline(storage, me.id) : [];
  renderTabs(all);
  const posts = all.filter((p) => (ui.tab === 'announcements' ? p.announcement : ui.tab === 'discussions' ? !p.announcement : true));
  for (const p of posts) feed.appendChild(card(p));
  empty.hidden = posts.length > 0;
  seen = signature();
  if (posts.length) return;
  const e = tpl('t-empty');
  const actions = $('[data-actions]', e);
  let title; let text;
  if (!on) { title = 'Social is off'; text = 'The property team has turned Social off for now.'; }
  else if (!shown) {
    title = 'Social is hidden';
    text = 'You chose to hide Social. Nothing from it shows in the app until you turn it back on.';
    actions.appendChild(button('Show Social', () => { setShow(storage, me.id, true); toast('Social is on'); render(); }, true));
  } else if (gated) { title = 'Read the guidelines first'; text = 'Social opens once you have read the community guidelines.'; }
  else if (all.length) { title = 'Nothing here yet'; text = 'Try another tab to see more posts.'; }
  else { title = 'No posts yet'; text = 'Updates from your property and neighbors will show up here.'; }
  $('[data-title]', e).textContent = title;
  $('[data-text]', e).textContent = text;
  empty.appendChild(e);
}

const TABS = [['foryou', 'For you'], ['discussions', 'Discussions'], ['announcements', 'Community & Announcements']];
function renderTabs(all) {
  const bar = $('#tabs');
  bar.hidden = !all.length;
  clear(bar);
  for (const [id, label] of TABS) {
    const b = tpl('t-tab');
    b.textContent = label;
    b.setAttribute('aria-selected', String(ui.tab === id));
    b.setAttribute('aria-controls', 'feed');
    b.tabIndex = ui.tab === id ? 0 : -1;
    b.addEventListener('click', () => { ui.tab = id; render(); $('#tabs [aria-selected="true"]')?.focus({ preventScroll: true }); });
    b.addEventListener('keydown', (e) => {
      const i = TABS.findIndex((t) => t[0] === id);
      const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
      if (n < 0) return;
      e.preventDefault();
      ui.tab = TABS[(n + TABS.length) % TABS.length][0];
      render();
      $('#tabs [aria-selected="true"]')?.focus({ preventScroll: true });
    });
    bar.appendChild(b);
  }
}

function button(label, onClick, primary) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.className = primary
    ? 'group/button inline-flex h-8 shrink-0 touch-manipulation items-center justify-center rounded-md border border-transparent bg-primary bg-clip-padding px-step-md control-text font-medium whitespace-nowrap text-primary-foreground transition outline-none select-none hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px pointer-coarse:h-11'
    : 'group/button inline-flex h-8 shrink-0 touch-manipulation items-center justify-center rounded-md border border-transparent bg-background bg-clip-padding px-step-md control-text font-medium whitespace-nowrap text-foreground ring-1 ring-foreground/10 transition outline-none select-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px pointer-coarse:h-11';
  b.addEventListener('click', onClick);
  return b;
}

function replyItem(r) {
  const li = tpl('t-reply');
  $('[data-avatar]', li).textContent = initials(r.name === 'You' ? me.name : r.name);
  $('[data-name]', li).textContent = r.name;
  const t = $('[data-time]', li);
  t.textContent = when(r.t);
  if (r.t) t.dateTime = iso(r.t);
  $('[data-text]', li).textContent = r.text;
  return li;
}

function card(p) {
  const li = tpl('t-post');
  li.dataset.post = p.id;
  const av = $('[data-avatar]', li);
  av.textContent = initials(p.name);
  av.dataset.role = p.role.toLowerCase();
  $('[data-name]', li).textContent = p.name;
  const chip = $('[data-role-chip]', li);
  chip.textContent = p.role === 'Staff' ? 'Property team' : p.role;
  chip.hidden = p.role !== 'Staff' || p.name === 'Property team'; // no "Property team  Property team"
  const time = $('[data-time]', li);
  time.textContent = `· ${when(p.t)}`;
  time.title = p.t ? new Date(p.t).toLocaleString('en-US') : '';
  if (p.t) time.dateTime = iso(p.t);
  $('[data-org]', li).textContent = me.org;
  const lead = $('article', li);
  lead.dataset.announcement = String(p.announcement);
  const label = $('[data-label]', li);
  label.hidden = !p.announcement;
  $('[data-label-text]', label).textContent = p.pinned ? 'Announcement · Pinned' : 'Announcement · Community & Announcements';
  const badges = $('[data-badges]', li);
  if (p.poll) badges.appendChild(badge('Poll', 'neutral'));
  $('[data-text]', li).textContent = p.text;
  const imgs = $('[data-images]', li);
  for (const im of p.images) {
    const d = tpl('t-image');
    d.style.background = im.bg;
    d.setAttribute('aria-label', im.alt);
    imgs.appendChild(d);
  }

  const like = $('[data-like]', li);
  like.setAttribute('aria-pressed', String(p.liked));
  like.setAttribute('aria-label', `${p.liked ? 'Unlike' : 'Like'}, ${p.likes} ${p.likes === 1 ? 'like' : 'likes'}`);
  $('[data-like-text]', li).textContent = String(p.likes);
  like.addEventListener('click', () => { toggleLike(storage, me.id, p.id); render(); focusPost(p.id, '[data-like]'); });

  const panel = $('[data-replies]', li);
  const toggle = $('[data-toggle-replies]', li);
  const isOpen = open.has(p.id);
  panel.hidden = !isOpen;
  toggle.setAttribute('aria-expanded', String(isOpen));
  toggle.setAttribute('aria-label', `${p.replies.length} ${p.replies.length === 1 ? 'reply' : 'replies'}`);
  $('[data-reply-text]', toggle).textContent = String(p.replies.length);
  toggle.addEventListener('click', () => { if (open.has(p.id)) open.delete(p.id); else open.add(p.id); render(); focusPost(p.id, '[data-toggle-replies]'); });
  for (const r of p.replies) $('[data-reply-list]', li).appendChild(replyItem(r));

  const form = $('[data-reply-form]', li);
  const allowed = canReply(storage);
  form.hidden = !allowed;
  $('[data-reply-off]', li).hidden = allowed;
  $('[data-reply-label]', li).textContent = `Write a reply to ${p.name}`;
  const input = $('[data-reply-input]', li);
  input.maxLength = MAX_REPLY;
  const draft = drafts.get(p.id);
  if (draft) input.value = draft;
  input.addEventListener('input', () => drafts.set(p.id, input.value));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const r = addReply(storage, me.id, p.id, input.value);
    if (!r.ok) { $('[data-reply-error]', li).textContent = r.reason; return; }
    drafts.delete(p.id);
    toast('Reply posted');
    render();
    focusPost(p.id, '[data-reply-input]');
  });
  return li;
}

const drafts = new Map(); // unsent replies survive a re-render

function focusPost(id, sel) {
  // render() rebuilt the cards; put keyboard focus back where it was.
  const el = document.querySelector(`#feed li[data-post="${id}"] ${sel}`);
  if (el) el.focus({ preventScroll: true });
}

/* --------------------------------------------------------------- guidelines */

const gl = $('#gl');
let gate = false;

function fillGuidelines() {
  const g = guidelines(storage);
  $('#gl-meta').textContent = `Version ${g.ver} · published ${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(g.pub))} by ${g.by}`;
  const body = $('#gl-body');
  clear(body);
  for (const [title, text] of g.blocks) {
    const b = tpl('t-block');
    $('[data-title]', b).textContent = title;
    $('[data-text]', b).textContent = text;
    body.appendChild(b);
  }
}

function openGuidelines(asGate) {
  gate = asGate;
  fillGuidelines();
  $('#gl-agree').checked = false;
  $('#gl-ok').disabled = true;
  $('#gl-agree-row').hidden = !asGate;
  $('#gl-lead').hidden = !asGate;
  $('#gl-ok').hidden = !asGate;
  $('#gl-leave').textContent = asGate ? 'Not now' : 'Close';
  if (!gl.open) gl.showModal();
  $('#gl-title').focus({ preventScroll: true });
}

// While the gate is up the dialog cannot be dismissed with Esc: the resident reads and continues, or leaves.
gl.addEventListener('cancel', (e) => { if (gate) { e.preventDefault(); } });
gl.addEventListener('click', (e) => { if (e.target === gl && !gate) gl.close(); });
$('#gl-agree').addEventListener('change', (e) => { $('#gl-ok').disabled = !e.target.checked; });
$('#gl-leave').addEventListener('click', () => {
  if (gate) location.assign(withAs(info.home));
  else gl.close();
});
$('#gl-form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!$('#gl-agree').checked) return;
  acceptGuidelines(storage, me.id);
  gate = false;
  gl.close();
  toast('Thanks for reading. Welcome to Social.');
  render();
});
$('#btn-guidelines').addEventListener('click', () => openGuidelines(false));

$('#btn-hide').addEventListener('click', () => {
  setShow(storage, me.id, false);
  toast('Social is hidden. Turn it back on here or in Settings.');
  render();
});

/* ------------------------------------------------------------------- live */

// Staff publish, change the guidelines or switch Social in another tab: look again.
addEventListener('storage', (e) => {
  if (e.key && !/^eso-(feed|mod|social|res-social)/.test(e.key)) return;
  start();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });

// Look again only when something that shows on the page has changed, so coming back to the tab never rebuilds the cards
// under someone who is typing a reply, and the guidelines box keeps its tick while it is being read.
let seen = '';
const isGated = () => socialOn(storage) && residentState(storage, me.id).show && needsGuidelines(storage, me.id);
const signature = () => JSON.stringify([socialOn(storage), canReply(storage), isGated(), guidelines(storage), timeline(storage, me.id), residentState(storage, me.id).show]);
function start() {
  const gated = isGated();
  if (signature() === seen) return;
  render(); // render() also records what it showed, so a re-render it caused itself is never repeated
  if (gated) { if (!gl.open) openGuidelines(true); else fillGuidelines(); } else if (gl.open && gate) { gate = false; gl.close(); }
}
start();
