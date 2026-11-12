// Social page controller for the Resident and the Staff edition. <body data-portal="resident"> or "staff".
// All markup and Tailwind classes live in partials/social-app.html; this file clones templates, fills text and toggles
// hidden / data-* / aria-*. A resident reads and interacts (like, reply); there is no composer and no store function that posts for them.
// Staff see the whole timeline, can post, and answer the comments that wait for a reply (staff-store.js); they have no guidelines gate.

import { PORTALS, pickPersona, initials } from '../messaging/personas.js';
import { socialOn, guidelines, canReply, needsGuidelines, acceptGuidelines, setShow, residentState, timeline as residentTimeline, react as residentReact, share as residentShare, follow as residentFollow, addReply as residentReply, MAX_REPLY } from './store.js';
import * as staffStore from './staff-store.js';
import { KINDS, canon, labelOf, iconOf, topKinds, describe as describeReactions } from './reactions.js';
import { followersOf, whoIs } from './residents.js';
import { ensureFeed } from './seed.js';
import { exitTarget } from '../exit-target.js';

const $ = (sel, root = document) => root.querySelector(sel);
const tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);
const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };

const portal = document.body.dataset.portal;
const me = pickPersona(portal, new URLSearchParams(location.search).get('as'));
const info = PORTALS[portal];
const storage = window.localStorage;
// Links keep ?as= and ?dark but not "embed": that one only says this page sits inside the frame.
const withAs = (path) => { const q = new URLSearchParams(location.search); q.delete('embed'); return q.toString() ? `${path}?${q}` : path; };
// A post can be opened on its own: "#/post/<id>" (a double click on a post, "Open post" in its menu, or the link Copy link gives). `focus` is that post's id.
const postRoute = () => (location.hash.match(/^#\/post\/([\w-]+)/) || [])[1] || null;
const ui = { tab: 'foryou', q: '', focus: postRoute() };
const staff = portal === 'staff';
const ownPost = {}; // what Staff can do with a post of their own (edit, remove): set where the dialogs are, used by each post's menu
ensureFeed(storage); // the same sample timeline the Staff prototype starts with, so this page is not empty in a browser that never opened it

// One timeline and one set of actions for both editions.
const getTimeline = () => (staff ? staffStore.timeline(storage, me.name) : residentTimeline(storage, me.id));
const doReact = (id, kind) => (staff ? staffStore.react(storage, id, kind) : residentReact(storage, me.id, id, kind));
const doShare = (id) => (staff ? staffStore.share(storage, id) : residentShare(storage, me.id, id));
const doReply = (id, text, to) => (staff ? staffStore.addReply(storage, id, text, { to }) : residentReply(storage, me.id, id, text, Date.now(), to));
// Follow: people are named by a key ("dana", "res:res-1"); the person using the app is "me" (Staff) or "res:<id>" (a resident) and cannot follow themselves.
const viewerKey = staff ? 'me' : `res:${me.id}`;
const followingKeys = () => new Set((staff ? staffStore.following(storage) : residentState(storage, me.id).following).map(canon));
const doFollow = (key) => (staff ? staffStore.follow(storage, key) : residentFollow(storage, me.id, key));
for (const el of document.querySelectorAll('[data-staff-only]')) el.hidden = !staff;
for (const el of document.querySelectorAll('[data-resident-only]')) el.hidden = staff;

/* ------------------------------------------------------------------ header */

$('#subtitle').textContent = staff ? 'Staff only · posts from Community & Announcements, and discussions' : `${me.org} · from your property team and neighbors`;
if (staff) $('#composer-avatar').textContent = initials(me.name);
$('#me-avatar').textContent = initials(me.name);
$('#me-name').textContent = me.name;
// The avatar opens the person's Social profile (inside Social); the name is not repeated beside it. A resident's Settings are in the menu and in the left menu.
$('#me-link').href = '#/me';
$('#me-name').parentElement.hidden = true;
if (!staff) $('#nav-settings').href = withAs('/resident/settings.html');
// Exit leaves Social, always (see exit-target.js). Back is the other button: one step inside Social, from a page of the menu to the feed (see showView).
$('#btn-exit').href = exitTarget('/social.html', info.home);
$('#btn-back').addEventListener('click', () => (ui.focus ? leavePost() : toFeed()));

// Below 1024 px the left menu is not drawn, and with it the pages that only it opened (see the partial). There the avatar opens a menu with them;
// from 1024 px it stays a plain link, as before.
$('#me-settings').href = withAs('/resident/settings/property.html');
const narrow = matchMedia('(max-width: 1023px)');
const meMenu = $('#social-menu');
const syncMe = () => {
  const a = $('#me-link');
  if (narrow.matches) {
    a.setAttribute('aria-haspopup', 'menu');
    a.setAttribute('aria-controls', 'social-menu');
    a.setAttribute('aria-expanded', String(!meMenu.hidden));
    a.setAttribute('aria-label', `${me.name}, Social menu`);
  } else {
    for (const k of ['aria-haspopup', 'aria-controls', 'aria-expanded']) a.removeAttribute(k);
    a.setAttribute('aria-label', `${me.name}, My profile`);
    meMenu.hidden = true;
  }
};
narrow.addEventListener('change', syncMe);
syncMe();
$('#me-link').addEventListener('click', (e) => {
  if (!narrow.matches) return;
  e.preventDefault();
  const was = !meMenu.hidden;
  closeMenus();
  meMenu.hidden = was;
  $('#me-link').setAttribute('aria-expanded', String(!was));
  if (!was) meMenu.querySelector('a:not([hidden]), button:not([hidden])')?.focus();
});
meMenu.addEventListener('click', (e) => { if (e.target.closest('a, button')) closeMenus(); });

// Search: the magnifier in the header opens a field that narrows the feed by words in the post or the author's name.
const searchBtn = $('#btn-search');
function setSearch(openIt) {
  $('#search-row').hidden = !openIt;
  searchBtn.setAttribute('aria-expanded', String(openIt));
  if (openIt) $('#q').focus();
  else if (ui.q) { ui.q = ''; $('#q').value = ''; render(); }
}
// On a page of the menu (profile…) the search still sits beside the shield: it takes you to the feed with the search open.
searchBtn.addEventListener('click', () => { if (view !== 'feed') { toFeed(); setSearch(true); return; } if (ui.focus) { clearFocus(); render(); } setSearch($('#search-row').hidden); });
$('#q').addEventListener('input', (e) => { ui.q = e.target.value.trim().toLowerCase(); render(); });
$('#q').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); setSearch(false); searchBtn.focus(); } });

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
  const slot = $('#gate-slot');
  clear(slot);
  // Staff always see Social (the switch and the hide option belong to residents) and have no guidelines gate.
  const on = staff || socialOn(storage);
  const shown = staff || residentState(storage, me.id).show;
  if (!staff) for (const b of document.querySelectorAll('[data-act]')) b.hidden = b.dataset.act === 'hide' ? !shown : !on;
  const gated = !staff && on && shown && needsGuidelines(storage, me.id);
  const all = on && shown && !gated ? getTimeline() : [];
  applyPrivacyUi();
  renderTabs(all);
  renderRail(all);
  renderNotifs(all);
  if (view !== 'feed') renderPage(); // a card of the profile page was used: draw the page again
  const follows = followingKeys();
  // Staff: the mute settings hold some posts back; the bar says how many, and where to change that.
  const muteBar = $('#mute-bar');
  let visible = all;
  if (staff) {
    const m = staffStore.applyMute(storage, all);
    visible = m.shown;
    muteBar.hidden = m.hidden === 0;
    $('#mute-count').textContent = `${m.hidden} ${m.hidden === 1 ? 'post' : 'posts'} hidden by your mute settings`;
  }
  const inTab = visible.filter((p) => {
    if (ui.tab === 'following') return follows.has(canon(p.by)) || p.mine;
    if (staff) return ui.tab === 'announcements' ? p.kind !== 'Staff discussion' : ui.tab === 'discussions' ? p.kind === 'Staff discussion' : true;
    return ui.tab === 'announcements' ? p.announcement : ui.tab === 'discussions' ? !p.announcement : true;
  });
  // One post on its own: only it (the tabs, the composer and the mute bar are for the whole feed, so they step aside).
  const posts = ui.focus ? all.filter((p) => p.id === ui.focus) : ui.q ? inTab.filter((p) => `${p.name} ${p.text}`.toLowerCase().includes(ui.q)) : inTab;
  if (ui.focus) $('#tabs').hidden = true;
  $('#composer').hidden = !staff || !!ui.focus;
  if (staff && ui.focus) muteBar.hidden = true;
  // REQUIRED: until the guidelines are confirmed nothing of Social is reachable (no posts, and the header tools and the page are inert).
  const gateDlg = $('#gate');
  for (const el of [...document.querySelectorAll('[data-social-only]'), $('#main-content')]) el.inert = gated;
  if (gated) {
    slot.appendChild(buildGate());
    syncGate();
    if (!gateDlg.open) gateDlg.showModal();
  } else if (gateDlg.open) gateDlg.close();
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
  } else if (gated) { title = 'Read the guidelines first'; text = 'Social opens once you have read the community guidelines to the end and confirmed them.'; }
  else if (ui.focus) {
    title = 'This post is not available';
    text = 'It may have been deleted, or it is not shown to you.';
    actions.appendChild(button('Back to the feed', leavePost, true));
  } else if (ui.q && inTab.length) { title = 'No posts match'; text = 'Try a different word, or clear the search to see every post.'; }
  else if (ui.tab === 'following' && all.length) { title = 'No posts from people you follow'; text = 'Follow people from the list of who reacted to a post. Their posts show here.'; }
  else if (all.length) { title = 'Nothing here yet'; text = 'Try another tab to see more posts.'; }
  else { title = 'No posts yet'; text = 'Updates from your property and neighbors will show up here.'; }
  $('[data-title]', e).textContent = title;
  $('[data-text]', e).textContent = text;
  empty.appendChild(e);
}

const TABS = staff
  ? [['foryou', 'For you'], ['following', 'Following'], ['discussions', 'Discussions'], ['announcements', 'Community & Announcements']]
  : [['foryou', 'For you'], ['following', 'Following'], ['discussions', 'Discussions'], ['announcements', 'Community & Announcements']];

// The right-hand column: the newest announcements, each one opens its post in the feed. Staff also get what waits for an answer and how their own announcements do.
function renderRail(all) {
  const list = $('#rail-list');
  clear(list);
  const items = (staff ? all.filter((p) => p.kind !== 'Staff discussion' && p.aud !== 'staff') : all.filter((p) => p.announcement)).slice(0, 4);
  $('#rail').hidden = items.length === 0 && !staff;
  if (staff) {
    const own = staffStore.ownAnnouncements(storage, me.name);
    const ownList = $('#rail-own-list');
    clear(ownList);
    $('#rail-own').hidden = own.length === 0;
    for (const a of own.slice(0, 3)) {
      const li = tpl('t-rail-item');
      $('[data-kind]', li).textContent = '';
      $('[data-pinned]', li).hidden = true;
      $('[data-time]', li).textContent = '';
      fillText($('[data-text]', li), a.text);
      $('[data-meta]', li).textContent = `${a.reactions} ${a.reactions === 1 ? 'reaction' : 'reactions'} · ${a.comments} ${a.comments === 1 ? 'comment' : 'comments'}`;
      $('button', li).addEventListener('click', () => goToPost(a.id));
      ownList.appendChild(li);
    }
  }
  for (const p of items) {
    const li = tpl('t-rail-item');
    $('[data-kind]', li).textContent = staff ? p.kind : 'Announcement';
    $('[data-pinned]', li).hidden = !p.pinned;
    $('[data-time]', li).textContent = when(p.t);
    fillText($('[data-text]', li), p.text);
    $('[data-meta]', li).textContent = `${p.name} · ${p.replies.length} ${p.replies.length === 1 ? 'comment' : 'comments'}`;
    $('button', li).addEventListener('click', () => goToPost(p.id));
    list.appendChild(li);
  }
}

for (const b of document.querySelectorAll('[data-view]')) b.addEventListener('click', () => { clearFocus(); ui.tab = b.dataset.view; render(); });

function renderTabs(all) {
  const bar = $('#tabs');
  bar.hidden = !all.length;
  for (const b of document.querySelectorAll('[data-view]')) { if (b.dataset.view === ui.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); b.disabled = !all.length; }
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

const SAVED = `eso-social-saved:${me.id}`;
const savedSet = () => { try { return new Set(JSON.parse(storage.getItem(SAVED)) || []); } catch { return new Set(); } };
const kindIcon = { Announcement: 'i-megaphone', 'Community post': 'i-users', Promotion: 'i-megaphone', 'Staff discussion': 'i-message' };

function closeMenus() {
  for (const p of document.querySelectorAll('[data-menu-panel]:not([hidden])')) { p.hidden = true; p.previousElementSibling?.setAttribute('aria-expanded', 'false'); }
}
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('[data-menu-panel], [data-menu]')) closeMenus(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });

function copyLink(id) {
  try { navigator.clipboard?.writeText(`${location.origin}${location.pathname}#/post/${id}`); } catch { /* the toast still tells what was meant */ }
  toast('Link copied');
}

// The guidelines gate is required, so it cannot be dismissed: Esc is cancelled, a click outside does nothing, and if a browser closes it
// anyway while the guidelines are still unconfirmed it opens again at once.
$('#gate').addEventListener('cancel', (e) => e.preventDefault());
$('#gate').addEventListener('close', () => { if (isGated()) $('#gate').showModal(); });

/* ------------------------------------------------------------------ reactions */

// Reactions, as a social feed has them. The Like button: a tap gives a Like, or takes back whatever reaction you gave; press and hold it (touch), rest the
// mouse on it, or press Arrow Up, and the five reactions appear to choose from. Beside it the count, with the reactions most given, opens who reacted.
const HOLD_MS = 450;
const HOVER_MS = 450;
const canHover = matchMedia('(hover: hover) and (pointer: fine)');

function closePickers(except) {
  for (const panel of document.querySelectorAll('[data-react-panel]:not([hidden])')) {
    if (panel === except) continue;
    panel.hidden = true;
    panel.closest('[data-react-wrap]')?.querySelector('[data-like]')?.setAttribute('aria-expanded', 'false');
  }
}
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('[data-react-wrap]')) closePickers(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePickers(); });

// `p` is a post or a comment (both carry myReaction, reactions, reactionTotal and reactors); `onChange` draws what changed and puts focus back on the Like button.
function wireReactions(li, p, onChange) {
  const like = $('[data-like]', li);
  const wrap = $('[data-react-wrap]', li);
  const picker = $('[data-react-panel]', li);
  if (!picker.children.length) picker.append(...tpl('t-react-picker').children);
  const who = $('[data-rx-who]', li);
  const mine = p.myReaction;
  const other = !!mine && mine !== 'like';
  const total = p.reactionTotal;
  // The Like button: the thumb, or the emoji you chose; its name says what a tap does.
  like.setAttribute('aria-pressed', String(!!mine));
  const noun = total === 1 ? 'reaction' : 'reactions';
  like.setAttribute('aria-label', `${mine ? `Remove your ${labelOf(mine).toLowerCase()}` : 'Like'}${total ? `, ${total} ${noun}` : ''}`);
  like.setAttribute('aria-description', 'Press and hold, or press Arrow Up, to choose another reaction');
  // The thumb is an SVG, which has no `hidden` property: the attribute is set and taken off by hand. Another reaction takes the thumb's place.
  $('[data-like-icon]', li).toggleAttribute('hidden', other);
  const emoji = $('[data-like-emoji]', li);
  emoji.hidden = !other;
  if (other) emoji.textContent = iconOf(mine);
  $('[data-like-text]', li).textContent = total ? String(total) : '';
  // At the end of the row: the reactions most given, as small round badges; it opens who gave them.
  who.hidden = total === 0;
  const sum = $('[data-rx-sum]', li);
  clear(sum);
  for (const k of topKinds(p.reactions, 3)) { const b = tpl('t-rx-badge'); b.textContent = iconOf(k); sum.appendChild(b); }
  who.setAttribute('aria-label', `${total} ${noun}: ${describeReactions(p.reactions)}. See who reacted`);
  who.title = describeReactions(p.reactions);
  who.addEventListener('click', () => openReactors(p, who));
  // The five.
  for (const b of picker.querySelectorAll('[data-react]')) {
    b.setAttribute('aria-checked', String(b.dataset.react === mine));
    b.addEventListener('click', () => { closePickers(); doReact(p.id, b.dataset.react); onChange(); });
  }
  let hold = 0; let hover = 0; let away = 0; let held = false;
  const show = (focusIt) => {
    closePickers(picker);
    picker.hidden = false;
    like.setAttribute('aria-expanded', 'true');
    if (focusIt) (picker.querySelector('[aria-checked="true"]') || picker.querySelector('[data-react]')).focus({ preventScroll: true });
  };
  const hide = () => { picker.hidden = true; like.setAttribute('aria-expanded', 'false'); };
  // Press and hold (touch, pen, or a mouse button held down): the pointer stays down for HOLD_MS.
  like.addEventListener('pointerdown', (e) => {
    held = false;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    clearTimeout(hold);
    hold = setTimeout(() => { held = true; show(false); }, HOLD_MS);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) like.addEventListener(ev, () => clearTimeout(hold));
  like.addEventListener('contextmenu', (e) => e.preventDefault()); // a long press must not open the system menu
  like.addEventListener('click', () => {
    if (held) { held = false; return; } // the press that opened the five is not a tap
    closePickers();
    doReact(p.id, mine || 'like');
    onChange();
  });
  // Keyboard: Enter and Space tap; Arrow Up opens the five, the arrows move along them, Enter chooses, Esc or Arrow Down closes.
  like.addEventListener('keydown', (e) => { held = false; if (e.key === 'ArrowUp') { e.preventDefault(); show(true); } });
  picker.addEventListener('keydown', (e) => {
    const items = [...picker.querySelectorAll('[data-react]')];
    const at = items.indexOf(document.activeElement);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); items[(at + (e.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length].focus(); }
    else if (e.key === 'Escape' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); hide(); like.focus(); }
  });
  // Mouse: resting on the button shows the five, leaving hides them after a moment, so the way from the button to the five does not close them.
  wrap.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || !canHover.matches) return;
    clearTimeout(away);
    if (picker.hidden) { clearTimeout(hover); hover = setTimeout(() => show(false), HOVER_MS); }
  });
  wrap.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(hover);
    clearTimeout(away);
    away = setTimeout(() => { if (!picker.matches(':focus-within')) hide(); }, 300);
  });
}

// A Follow button, Facebook-style but with Follow and not Add friend: it says what is true now, and it is not there for yourself.
function followButton(fb, key, name, after) {
  if (!key || canon(key) === canon(viewerKey)) { fb.hidden = true; return; }
  const on = followingKeys().has(canon(key));
  fb.hidden = false;
  fb.textContent = on ? 'Following' : 'Follow';
  fb.setAttribute('aria-pressed', String(on));
  fb.setAttribute('aria-label', `${on ? 'Unfollow' : 'Follow'} ${name}`);
  fb.addEventListener('click', () => {
    const res = doFollow(key);
    if (res.ok) toast(res.following ? `Following ${name}` : `Unfollowed ${name}`);
    after();
  });
}

// Who reacted: a list in a window, with a tab for everyone and one for each reaction in use. People the feed does not name are counted at the end.
function openReactors(p, opener) {
  const dlg = $('#rx');
  const tabs = $('#rx-tabs');
  const list = $('#rx-list');
  const more = $('#rx-more');
  const inUse = KINDS.filter((k) => p.reactions[k] > 0);
  let current = 'all';
  const draw = () => {
    clear(list);
    const people = current === 'all' ? p.reactors : p.reactors.filter((r) => r.kind === current);
    for (const r of people) {
      const row = tpl('t-rx-row');
      $('[data-avatar]', row).textContent = initials(r.you ? me.name : r.name);
      $('[data-name]', row).textContent = r.you ? `${me.name} (You)` : r.name;
      $('[data-role]', row).textContent = r.role;
      $('[data-emoji]', row).textContent = iconOf(r.kind);
      $('[data-kind]', row).textContent = labelOf(r.kind);
      // Follow, not Add friend: shown for everyone but yourself, and it says what is true now.
      followButton($('[data-follow]', row), r.you ? null : r.key, r.name, () => {
        draw();
        for (const b of list.querySelectorAll('[data-follow]')) if (b.getAttribute('aria-label').endsWith(` ${r.name}`)) { b.focus({ preventScroll: true }); break; }
        render();
      });
      list.appendChild(row);
    }
    more.hidden = true; // every reaction is a named person: the list is the count
    for (const t of tabs.children) { const on = t.dataset.k === current; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; }
  };
  clear(tabs);
  for (const k of ['all', ...inUse]) {
    const t = tpl('t-rx-tab');
    t.dataset.k = k;
    $('[data-emoji]', t).textContent = k === 'all' ? '' : iconOf(k);
    $('[data-label]', t).textContent = k === 'all' ? 'All' : labelOf(k);
    $('[data-count]', t).textContent = String(k === 'all' ? p.reactionTotal : p.reactions[k]);
    t.addEventListener('click', () => { current = k; draw(); });
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const all = [...tabs.children];
      const next = all[(all.indexOf(t) + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
      current = next.dataset.k;
      draw();
      next.focus();
    });
    tabs.appendChild(t);
  }
  draw();
  $('#rx-title').textContent = `Reactions · ${p.reactionTotal}`;
  dlg.showModal();
  tabs.querySelector('[aria-selected="true"]').focus();
  dlg.addEventListener('close', () => { if (opener && opener.isConnected) opener.focus(); else focusPost(p.id, '[data-rx-who]'); }, { once: true });
}
$('#rx-close').addEventListener('click', () => $('#rx').close());
$('#rx').addEventListener('click', (e) => { if (e.target === $('#rx')) $('#rx').close(); });

/* ------------------------------------------------------------------ replies window */

// The replies of a post, in a window: opened by the comment button or "View N replies". The post, then its comments as a thread: each has Like (press and
// hold for the other reactions), Reply, Share, the reactions it got (they open who reacted), and "View N replies" for the answers under it. A box at the
// bottom answers the post, or the comment chosen with Reply.
const thread = { id: null, to: null, back: '[data-toggle-replies]', expanded: new Set() };
const drafts = new Map(); // unsent replies survive closing the window
const threadDlg = $('#thread');
const threadInput = $('#thread-input');
const threadPostNow = () => getTimeline().find((x) => x.id === thread.id);

function syncThreadTo() {
  $('#thread-to').hidden = !thread.to;
  if (thread.to) $('#thread-to-text').textContent = `Replying to ${thread.to.name}`;
  threadInput.placeholder = thread.to ? `Reply to ${thread.to.name}…` : 'Write a reply…';
}

function focusComment(id, sel) {
  threadDlg.querySelector(`[data-comment="${id}"] ${sel}`)?.focus({ preventScroll: true });
}

function commentItem(r, p) {
  const li = tpl('t-comment');
  li.dataset.comment = r.id;
  if (r.depth) li.style.marginLeft = `${Math.min(r.depth, 2) * 1.5}rem`; // an answer sits under the comment it answers
  $('[data-avatar]', li).textContent = initials(r.name === 'You' ? me.name : r.name);
  $('[data-name]', li).textContent = r.name;
  const t = $('[data-time]', li);
  t.textContent = when(r.t);
  if (r.t) t.dateTime = iso(r.t);
  fillText($('[data-text]', li), r.text);
  wireReactions(li, r, () => { drawThread(); render(); focusComment(r.id, '[data-like]'); });
  const reply = $('[data-c-reply]', li);
  reply.hidden = !(staff || canReply(storage));
  reply.setAttribute('aria-label', `Reply to ${r.name}`);
  reply.addEventListener('click', () => { thread.to = { id: r.id, name: r.name }; syncThreadTo(); threadInput.focus(); });
  const share = $('[data-c-share]', li);
  share.setAttribute('aria-label', `Share ${r.name}'s comment`);
  share.addEventListener('click', () => copyLink(p.id)); // a comment's link is its post's link
  const tg = $('[data-c-toggle]', li);
  if (r.replyCount > 0) {
    const on = thread.expanded.has(r.id);
    tg.hidden = false;
    tg.setAttribute('aria-expanded', String(on));
    $('[data-c-toggle-text]', tg).textContent = on ? 'Hide replies' : `View ${r.replyCount} ${r.replyCount === 1 ? 'reply' : 'replies'}`;
    tg.addEventListener('click', () => { if (on) thread.expanded.delete(r.id); else thread.expanded.add(r.id); drawThread(); focusComment(r.id, '[data-c-toggle]'); });
  }
  return li;
}

function drawThread() {
  const p = threadPostNow();
  if (!p) { if (threadDlg.open) threadDlg.close(); return; }
  const n = p.replies.length;
  $('#thread-title').textContent = `${n} ${n === 1 ? 'reply' : 'replies'}`;
  $('#thread-post-by').textContent = p.name;
  fillText($('#thread-post-text'), p.text);
  const list = $('#thread-list');
  clear(list);
  let skip = null; // while the answers under a closed comment pass by
  for (const r of p.replies) {
    if (skip !== null) { if (r.depth > skip) continue; skip = null; }
    list.appendChild(commentItem(r, p));
    if (r.replyCount > 0 && !thread.expanded.has(r.id)) skip = r.depth;
  }
  $('#thread-empty').hidden = n > 0;
  const allowed = staff || canReply(storage);
  $('#thread-form').hidden = !allowed;
  $('#thread-off').hidden = allowed;
  syncThreadTo();
}

function openThread(id, back) {
  thread.id = id;
  thread.back = back;
  thread.to = null;
  thread.expanded = new Set();
  threadInput.maxLength = MAX_REPLY;
  threadInput.value = drafts.get(id) || '';
  $('#thread-error').textContent = '';
  closeMenus();
  drawThread();
  threadDlg.showModal();
  threadInput.dispatchEvent(new Event('input')); // size the box to the draft
  $('#thread-title').focus({ preventScroll: true });
}

$('#thread-close').addEventListener('click', () => threadDlg.close());
threadDlg.addEventListener('click', (e) => { if (e.target === threadDlg) threadDlg.close(); });
threadDlg.addEventListener('close', () => { const id = thread.id; thread.id = null; if (id) focusPost(id, thread.back); });
$('#thread-to-clear').addEventListener('click', () => { thread.to = null; syncThreadTo(); threadInput.focus(); });
threadInput.addEventListener('input', () => {
  if (thread.id) drafts.set(thread.id, threadInput.value);
  $('#thread-error').textContent = '';
  threadInput.style.height = 'auto';
  threadInput.style.height = `${Math.min(threadInput.scrollHeight, 128)}px`;
});
// Enter sends, Shift+Enter starts a new line.
threadInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#thread-form').requestSubmit(); } });
$('#thread-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const p = threadPostNow();
  if (!p) return;
  const r = doReply(p.id, threadInput.value, thread.to?.id);
  if (!r.ok) { $('#thread-error').textContent = r.reason; return; }
  // Show the answer where it sits: open the comment it answers, and the ones above that.
  const parents = new Map(p.replies.map((x) => [x.id, x.parentId]));
  for (let c = thread.to?.id; c; c = parents.get(c)) thread.expanded.add(c);
  drafts.delete(p.id);
  thread.to = null;
  threadInput.value = '';
  threadInput.dispatchEvent(new Event('input'));
  toast('Reply posted');
  drawThread();
  render();
  const mine = r.reply && threadDlg.querySelector(`[data-comment="${r.reply.id}"]`);
  mine?.scrollIntoView({ block: 'nearest' });
  threadInput.focus({ preventScroll: true });
});

function card(p) {
  const li = tpl('t-post');
  li.dataset.post = p.id;
  const av = $('[data-avatar]', li);
  av.textContent = initials(p.name);
  av.dataset.role = p.role.toLowerCase();
  $('[data-name]', li).textContent = p.name;
  const chip = $('[data-role-chip]', li);
  if (staff) { chip.textContent = p.role; chip.hidden = false; } else {
    chip.textContent = p.role === 'Staff' ? 'Property team' : p.role;
    chip.hidden = p.role !== 'Staff' || p.name === 'Property team'; // no "Property team  Property team"
  }
  const time = $('[data-time]', li);
  time.textContent = when(p.t);
  time.title = p.t ? new Date(p.t).toLocaleString('en-US') : '';
  if (p.t) time.dateTime = iso(p.t);
  $('[data-org]', li).textContent = staff && p.aud === 'staff' ? `${me.org} · Staff only` : me.org;
  const label = $('[data-label]', li);
  if (staff) {
    label.hidden = false;
    $('[data-label-icon]', label).setAttribute('href', `#${kindIcon[p.kind] || 'i-message'}`);
    $('[data-label-text]', label).textContent = p.kind === 'Staff discussion' ? 'Staff discussion' : `${p.kind} · Community & Announcements`;
  } else {
    label.hidden = !p.announcement && !p.pinned;
    $('[data-label-text]', label).textContent = p.announcement ? 'Announcement · Community & Announcements' : 'Discussion';
  }
  $('[data-pinned]', label).hidden = !p.pinned;
  // the menu: copy the link, mute the thread (somebody else's, Staff only)
  const menu = $('[data-menu]', li);
  const panel2 = $('[data-menu-panel]', li);
  menu.addEventListener('click', () => { const was = !panel2.hidden; closeMenus(); panel2.hidden = was; menu.setAttribute('aria-expanded', String(!was)); if (!was) $('[role="menuitem"]', panel2).focus({ preventScroll: true }); });
  const openItem = $('[data-m="open"]', li);
  openItem.hidden = !!ui.focus; // it is already open
  openItem.addEventListener('click', () => openPost(p.id));
  $('[data-m="copy"]', li).addEventListener('click', () => { closeMenus(); copyLink(p.id); });
  const mute = $('[data-m="mute"]', li);
  mute.hidden = !staff || p.mine;
  mute.addEventListener('click', () => { closeMenus(); staffStore.muteThread(storage, p.id); toast('Thread muted. Manage it under "hidden by your mute settings".'); render(); });
  // A post of your own (Staff) can be changed or deleted; somebody else's cannot.
  const own = staff && p.mine;
  const editItem = $('[data-m="edit"]', li);
  const delItem = $('[data-m="delete"]', li);
  editItem.hidden = !own;
  delItem.hidden = !own;
  editItem.addEventListener('click', () => { closeMenus(); ownPost.edit?.(p); });
  delItem.addEventListener('click', () => { closeMenus(); ownPost.remove?.(p); });
  $('[data-edited]', li).hidden = !p.edited;
  $('[data-link]', li).addEventListener('click', () => copyLink(p.id));
  // Share: to your own profile (shown there, and in Activity). The count is the people who shared it.
  const rep = $('[data-repost]', li);
  rep.setAttribute('aria-pressed', String(p.shared));
  rep.setAttribute('aria-label', `${p.shared ? 'Remove your share' : 'Share'}${p.shares ? `, ${p.shares} ${p.shares === 1 ? 'share' : 'shares'}` : ''}`);
  rep.title = p.shares ? `Shared by ${p.sharers.slice(0, 3).map((s) => (s.you ? 'you' : s.name)).join(', ')}${p.shares > 3 ? ` and ${p.shares - 3} more` : ''}` : 'Share to your profile';
  $('[data-repost-text]', rep).textContent = p.shares ? String(p.shares) : '';
  rep.addEventListener('click', () => {
    const r = doShare(p.id);
    if (r.ok) toast(r.shared ? 'Shared to your profile' : 'Share removed');
    render();
    focusPost(p.id, '[data-repost]');
  });
  const save = $('[data-save]', li);
  const saved = savedSet().has(p.id);
  save.setAttribute('aria-pressed', String(saved));
  save.setAttribute('aria-label', saved ? 'Remove from saved' : 'Save post');
  save.addEventListener('click', () => {
    const s = savedSet();
    if (s.has(p.id)) s.delete(p.id); else s.add(p.id);
    try { storage.setItem(SAVED, JSON.stringify([...s])); } catch { /* saved until reload */ }
    toast(s.has(p.id) ? 'Saved' : 'Removed from saved');
    render();
    focusPost(p.id, '[data-save]');
  });
  const views = $('[data-views]', li);
  views.hidden = !p.views;
  if (p.views) views.textContent = `${p.views} views`;
  const badges = $('[data-badges]', li);
  if (p.poll) badges.appendChild(badge('Poll', 'neutral'));
  fillText($('[data-text]', li), p.text);
  const imgs = $('[data-images]', li);
  for (const im of p.images) {
    const d = tpl('t-image');
    d.style.background = im.bg;
    d.setAttribute('aria-label', im.alt);
    imgs.appendChild(d);
  }

  wireReactions(li, p, () => { render(); focusPost(p.id, '[data-like]'); });

  // The comment button and "View N replies" open the replies window (see openThread); both say how many replies there are.
  const n = p.replies.length;
  const word = n === 1 ? 'reply' : 'replies';
  const toggle = $('[data-toggle-replies]', li);
  toggle.setAttribute('aria-label', n ? `Reply, ${n} ${word}` : 'Reply');
  toggle.setAttribute('aria-haspopup', 'dialog');
  $('[data-reply-text]', toggle).textContent = n ? String(n) : '';
  toggle.addEventListener('click', () => openThread(p.id, '[data-toggle-replies]'));
  const rl = $('[data-replies-link]', li);
  rl.hidden = n === 0;
  rl.textContent = `View ${n} ${word}`;
  rl.addEventListener('click', () => openThread(p.id, '[data-replies-link]'));
  return li;
}

function focusPost(id, sel) {
  // render() rebuilt the cards; put keyboard focus back where it was.
  const el = document.querySelector(`li[data-post="${id}"] ${sel}`);
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

// The policy opens in the dialog (it is long); the page only holds a short card with "Read policy", the tick box and Confirm (buildGate).
// The tick box stays locked until the policy has been scrolled to its end, and Confirm stays locked until the box is ticked.
const progress = { ver: null, read: false, agreed: false };

const atEnd = (el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 4;

function syncGate() {
  const card = $('#gate-slot [data-gate]');
  if (card) {
    const agree = $('[data-agree]', card);
    agree.disabled = !progress.read;
    agree.checked = progress.read && progress.agreed;
    $('[data-confirm]', card).disabled = !agree.checked;
    $('[data-note]', card).textContent = progress.read
      ? (agree.checked ? 'Thank you. Confirm to open Social.' : 'You agreed in the policy window. Tick the box, then confirm.')
      : 'Open the policy, read it to the end and press Agree to unlock this.';
  }
  // In the dialog: Agree is the only thing that counts as "read". It unlocks at the end of the policy, and it is not there on a plain re-read.
  const hint = $('#gl-hint');
  const agreeBtn = $('#gl-agree');
  agreeBtn.hidden = !gate || progress.read;
  agreeBtn.disabled = !reachedEnd;
  if (!gate) hint.textContent = '';
  else if (progress.read) hint.textContent = 'You have agreed. Close this window to continue.';
  else hint.textContent = reachedEnd ? 'You reached the end. Press Agree to continue.' : 'Scroll to the end of the policy to enable Agree.';
}

// The end of the policy is reached by scrolling to it (a policy that fits on the screen has no scrolling to do).
let reachedEnd = false;
function checkEnd() {
  if (!gate || reachedEnd || !gl.open) return;
  if (atEnd($('#gl-body'))) { reachedEnd = true; syncGate(); }
}

// `asGate`: opened from the gate card (reading counts); otherwise it is just a re-read from the Guidelines button.
function openGuidelines(asGate) {
  gate = asGate;
  reachedEnd = false;
  fillGuidelines();
  syncGate();
  if (!gl.open) gl.showModal();
  $('#gl-body').scrollTop = 0;
  $('#gl-title').focus({ preventScroll: true });
  requestAnimationFrame(checkEnd); // a short policy that needs no scrolling counts as read at once
}

$('#gl-body').addEventListener('scroll', checkEnd);
$('#gl-close').addEventListener('click', () => gl.close());
$('#gl-agree').addEventListener('click', () => {
  if (!reachedEnd) return;
  progress.read = true;
  gl.close(); // the close handler redraws the card: its tick box is now unlocked
});
gl.addEventListener('click', (e) => { if (e.target === gl) gl.close(); });
gl.addEventListener('close', () => { gate = false; syncGate(); });
for (const b of document.querySelectorAll('[data-act="guidelines"]')) b.addEventListener('click', () => openGuidelines(false));

/** The card shown in place of the feed until the resident has accepted the current guidelines. */
function buildGate() {
  const g = guidelines(storage);
  if (progress.ver !== g.ver) Object.assign(progress, { ver: g.ver, read: false, agreed: false }); // a new version has to be read again
  const card = tpl('t-gate');
  card.dataset.gate = '';
  $('[data-meta]', card).textContent = `Version ${g.ver} · published ${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(g.pub))} by ${g.by}`;
  $('[data-read]', card).addEventListener('click', () => openGuidelines(true));
  $('[data-later]', card).addEventListener('click', () => location.assign(exitTarget('/social.html', info.home))); // the only other way out: the same as Exit
  $('[data-agree]', card).addEventListener('change', (e) => { progress.agreed = e.target.checked; syncGate(); });
  $('[data-confirm]', card).addEventListener('click', () => {
    if (!progress.read || !progress.agreed) return;
    acceptGuidelines(storage, me.id);
    Object.assign(progress, { read: false, agreed: false });
    $('#gate').close();
    toast('Thanks for reading. Welcome to Social.');
    render();
  });
  return card;
}

for (const b of document.querySelectorAll('[data-act="hide"]')) b.addEventListener('click', () => {
  setShow(storage, me.id, false);
  toast('Social is hidden. Turn it back on here or in Settings.');
  render();
});

/* ------------------------------------------------------------ privacy mode */

// Privacy mode (on by default): phone numbers, emails, units and plates in posts and replies show as dots. Pressing a hidden value shows it for
// 10 seconds, then hides it again; every reveal is written to a small log kept in this browser ("logged").
const PRIV = `eso-res-privacy:${me.id}`;
const PRIV_LOG = `eso-res-privacy-log:${me.id}`;
const privacyOn = () => { try { return storage.getItem(PRIV) !== '0'; } catch { return true; } };
const SECRETS = [
  ['email', /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/],
  ['phone', /\(?\b\d{3}\)?[ .-]?\d{3}[ .-]\d{4}\b/],
  ['unit', /\bUnit \d[\w-]*/],
  ['plate', /\b\d[A-Z]{3}\d{3}\b/],
];
const SECRET_RE = new RegExp(SECRETS.map(([k, r]) => `(?<${k}>${r.source})`).join('|'), 'g');
const MASK = { email: '•••@•••', phone: '(•••) •••-••••', unit: 'Unit ••••', plate: '•••••••' };

function logReveal(kind) {
  try {
    const log = JSON.parse(storage.getItem(PRIV_LOG)) || [];
    log.push({ t: Date.now(), kind });
    storage.setItem(PRIV_LOG, JSON.stringify(log.slice(-50)));
  } catch { /* the reveal still works without the log */ }
}

function secret(value, kind) {
  const b = tpl('t-secret');
  const hide = () => { delete b.dataset.shown; b.textContent = MASK[kind]; b.setAttribute('aria-label', `Hidden ${kind}. Press to show it for 10 seconds.`); };
  hide();
  let timer;
  b.addEventListener('click', () => {
    if (b.dataset.shown) return;
    b.dataset.shown = '1';
    b.textContent = value;
    b.removeAttribute('aria-label');
    logReveal(kind);
    clearTimeout(timer);
    timer = setTimeout(hide, 10000);
  });
  return b;
}

/** Put `text` in `el`, with hidden values replaced by buttons while Privacy mode is on. */
function fillText(el, text) {
  clear(el);
  if (!privacyOn()) { el.textContent = text; return; }
  let last = 0;
  for (const m of text.matchAll(SECRET_RE)) {
    if (m.index > last) el.append(text.slice(last, m.index));
    el.append(secret(m[0], Object.keys(m.groups).find((k) => m.groups[k] !== undefined)));
    last = m.index + m[0].length;
  }
  el.append(text.slice(last));
}

function applyPrivacyUi() {
  const on = privacyOn();
  $('#privacy').hidden = !on;
  const b = $('#btn-privacy');
  b.setAttribute('aria-pressed', String(on));
  b.setAttribute('aria-label', on ? 'Privacy mode is on. Turn it off' : 'Privacy mode is off. Turn it on');
  b.title = on ? 'Privacy mode: on' : 'Privacy mode: off';
}

function setPrivacy(on) {
  try { storage.setItem(PRIV, on ? '1' : '0'); } catch { /* lasts until reload */ }
  toast(on ? 'Privacy mode on. Phone, email, unit and plates are masked.' : 'Privacy mode off. Values show in full.');
  render();
  $('#btn-privacy').focus({ preventScroll: true });
}
$('#btn-privacy').addEventListener('click', () => setPrivacy(!privacyOn()));
$('#privacy-off').addEventListener('click', () => setPrivacy(false));

/* ------------------------------------------------------------------ go to a post */

function goToPost(id) {
  toFeed();
  clearFocus();
  ui.tab = 'foryou'; ui.q = ''; $('#q').value = '';
  if ($('#pulse').open) $('#pulse').close();
  render();
  const post = document.querySelector(`#feed li[data-post="${id}"]`);
  post?.scrollIntoView({ block: 'start' });
  post?.querySelector('[data-toggle-replies]')?.focus({ preventScroll: true });
}

/* ------------------------------------------------------------ notifications (bell) */

// What is new for this resident in Social: announcements, and replies from others on posts they liked or replied to.
// Which ones were seen is kept per resident in this browser.
const SEEN = `eso-res-social-seen:${me.id}`;
const seenMap = () => { try { return JSON.parse(storage.getItem(SEEN)) || {}; } catch { return {}; } };
const markSeen = (ids) => {
  const m = seenMap();
  for (const id of ids) m[id] = true;
  try { storage.setItem(SEEN, JSON.stringify(m)); } catch { /* seen until reload */ }
};
const clip = (s, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function socialNotifs(all) {
  const out = [];
  if (staff) {
    // Staff: residents' comments on their posts, and what neighbors posted for everyone.
    for (const p of all) {
      if (p.mine) for (const r of p.replies) if (r.role === 'Resident') out.push({ id: `r-${p.id}-${r.id}`, t: r.t, who: r.name, what: `replied: “${clip(r.text)}”`, meta: 'Replies', icon: 'i-message', post: p.id, name: r.name });
      if (!p.mine && p.role === 'Resident' && p.aud !== 'staff') out.push({ id: `c-${p.id}`, t: p.t, who: p.name, what: 'posted in Community', meta: 'C&A', icon: 'i-users', post: p.id, name: p.name });
    }
    return out.sort((a, b) => b.t - a.t);
  }
  for (const p of all) {
    if (p.announcement) out.push({ id: `a-${p.id}`, t: p.t, who: p.name, what: 'posted a new announcement', meta: 'C&A', icon: 'i-megaphone', post: p.id, name: p.name });
    if (p.myReaction || p.replies.some((r) => r.mine)) {
      for (const r of p.replies) if (!r.mine && r.t) out.push({ id: `r-${p.id}-${r.id}`, t: r.t, who: r.name, what: `replied: “${clip(r.text)}”`, meta: 'Replies', icon: 'i-message', post: p.id, name: r.name });
    }
  }
  return out.sort((a, b) => b.t - a.t);
}

const notif = $('#notif');
function renderNotifs(all) {
  const items = socialNotifs(all);
  const seenIds = seenMap();
  const unread = items.filter((n) => !seenIds[n.id]).length;
  const count = $('#bell-count');
  count.hidden = unread === 0;
  count.textContent = unread > 99 ? '99+' : String(unread);
  $('#btn-bell').setAttribute('aria-label', unread ? `Notifications, ${unread} new` : 'Notifications');
  const chip = $('#notif-new');
  chip.hidden = unread === 0;
  chip.textContent = `${unread} new`;
  $('#notif-all').disabled = unread === 0;
  const list = $('#notif-list');
  clear(list);
  $('#notif-empty').hidden = items.length > 0;
  for (const n of items.slice(0, 5)) list.appendChild(notifRow(n, !seenIds[n.id]));

  // The sheet behind "View all": every notification, All or Unread. It stays inside Social.
  const shown = notifView === 'unread' ? items.filter((n) => !seenIds[n.id]) : items;
  $('#notif-sheet-sub').textContent = unread ? `${unread} new · ${items.length} in all` : `${items.length} in all, all read`;
  $('#notif-sheet-all').disabled = unread === 0;
  for (const b of document.querySelectorAll('#notif-sheet-chips [data-nf]')) b.setAttribute('aria-pressed', String(b.dataset.nf === notifView));
  const sheet = $('#notif-sheet-list');
  clear(sheet);
  const emptyMsg = $('#notif-sheet-empty');
  emptyMsg.hidden = shown.length > 0;
  emptyMsg.textContent = items.length ? 'Nothing unread. You are all caught up.' : 'Nothing new yet. Announcements and replies show up here.';
  for (const n of shown) sheet.appendChild(notifRow(n, !seenIds[n.id]));
}

let notifView = 'all';
let leavingSheet = false; // the sheet closes because a post was chosen: focus goes to the post, not back to the bell
function notifRow(n, isNew) {
  const li = tpl('t-notif');
  $('[data-avatar]', li).textContent = initials(n.name);
  $('[data-icon]', li).setAttribute('href', `#${n.icon}`);
  $('[data-who]', li).textContent = n.who;
  fillText($('[data-what]', li), n.what);
  $('[data-meta]', li).textContent = `${when(n.t)} · ${n.meta}`;
  $('[data-dot]', li).hidden = !isNew;
  $('button', li).addEventListener('click', () => {
    markSeen([n.id]);
    closeNotifs(false);
    if ($('#notif-sheet').open) { leavingSheet = true; $('#notif-sheet').close(); }
    goToPost(n.post);
  });
  return li;
}

function closeNotifs(restoreFocus = true) {
  if (notif.hidden) return;
  notif.hidden = true;
  $('#btn-bell').setAttribute('aria-expanded', 'false');
  if (restoreFocus) $('#btn-bell').focus({ preventScroll: true });
}
$('#btn-bell').addEventListener('click', () => {
  if (!notif.hidden) { closeNotifs(); return; }
  notif.hidden = false;
  $('#btn-bell').setAttribute('aria-expanded', 'true');
  $('#notif-list button')?.focus({ preventScroll: true });
});
$('#notif-all').addEventListener('click', () => { markSeen(socialNotifs(getTimeline()).map((n) => n.id)); render(); $('#btn-bell').focus({ preventScroll: true }); });
$('#notif-view').addEventListener('click', () => { closeNotifs(false); notifView = 'all'; renderNotifs(getTimeline()); $('#notif-sheet').showModal(); });
$('#notif-sheet-close').addEventListener('click', () => $('#notif-sheet').close());
$('#notif-sheet').addEventListener('click', (e) => { if (e.target === $('#notif-sheet')) $('#notif-sheet').close(); });
$('#notif-sheet').addEventListener('close', () => { if (!leavingSheet) $('#btn-bell').focus({ preventScroll: true }); leavingSheet = false; });
$('#notif-sheet-all').addEventListener('click', () => { markSeen(socialNotifs(getTimeline()).map((n) => n.id)); renderNotifs(getTimeline()); });
for (const b of document.querySelectorAll('#notif-sheet-chips [data-nf]')) b.addEventListener('click', () => { notifView = b.dataset.nf; renderNotifs(getTimeline()); });
document.addEventListener('pointerdown', (e) => { if (!notif.hidden && !notif.contains(e.target) && !$('#btn-bell').contains(e.target)) closeNotifs(false); });
notif.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeNotifs(); } });

/* ------------------------------------------------------------------ Social pulse */

const pulse = $('#pulse');
function renderPulse() {
  const all = getTimeline();
  const week = Date.now() - 7 * 86400000;
  const recent = all.filter((p) => p.t >= week);
  $('#ps-posts').textContent = String(recent.length);
  $('#ps-comments').textContent = String(all.reduce((n, p) => n + p.replies.filter((r) => r.t >= week).length, 0));
  $('#ps-reactions').textContent = String(recent.reduce((n, p) => n + p.reactionTotal, 0));
  const ann = $('#pulse-ann-list');
  clear(ann);
  for (const p of all.filter((x) => x.announcement).slice(0, 4)) {
    const li = tpl('t-rail-item');
    $('[data-kind]', li).textContent = 'Announcement';
    $('[data-pinned]', li).hidden = !p.pinned;
    $('[data-time]', li).textContent = when(p.t);
    fillText($('[data-text]', li), p.text);
    $('[data-meta]', li).textContent = `${p.name} · ${p.replies.length} ${p.replies.length === 1 ? 'comment' : 'comments'}`;
    $('button', li).addEventListener('click', () => goToPost(p.id));
    ann.appendChild(li);
  }
}
$('#btn-pulse').addEventListener('click', () => { renderPulse(); pulse.showModal(); });
$('#pulse-close').addEventListener('click', () => pulse.close());
pulse.addEventListener('click', (e) => { if (e.target === pulse) pulse.close(); });

/* ------------------------------------------------------------------ Staff: new post, header */

if (staff) {
  const dlg = $('#compose');
  const text = $('#compose-text');
  const count = () => { $('#compose-count').textContent = `${text.value.length} / ${staffStore.MAX_POST}`; };
  // The error sits under the field and is tied to it (aria-describedby), the field is marked invalid until the person types again, and focus goes back to it.
  text.setAttribute('aria-describedby', 'compose-error');
  const clearError = () => { $('#compose-error').textContent = ''; text.removeAttribute('aria-invalid'); };
  // The same dialog writes a new post and changes one of your own: `editing` is the post being changed, or null.
  let editing = null;
  const setMode = (p) => {
    editing = p;
    $('#compose-title').textContent = p ? 'Edit post' : 'Start a discussion';
    $('#compose-send').textContent = p ? 'Save' : 'Post';
  };
  const openCompose = () => { clearError(); setMode(null); dlg.showModal(); text.focus(); count(); };
  ownPost.edit = (p) => {
    clearError();
    setMode(p);
    text.value = p.text;
    $('#compose-aud').value = p.aud;
    $('#compose-ann').checked = p.announcement;
    dlg.showModal();
    text.focus();
    count();
  };
  // Closed without saving (Cancel, Esc): the next new post starts empty, not with the words of the one that was being changed.
  dlg.addEventListener('close', () => { if (editing) { text.value = ''; $('#compose-ann').checked = false; $('#compose-aud').value = 'all'; setMode(null); } });
  $('#composer-open').addEventListener('click', openCompose);
  $('#composer-post').addEventListener('click', openCompose);
  text.addEventListener('input', () => { count(); if (text.hasAttribute('aria-invalid')) clearError(); });
  // An announcement is for residents: the two choices cannot disagree.
  $('#compose-ann').addEventListener('change', (e) => { if (e.target.checked && $('#compose-aud').value === 'staff') $('#compose-aud').value = 'all'; });
  $('#compose-aud').addEventListener('change', (e) => { if (e.target.value === 'staff') $('#compose-ann').checked = false; });
  $('#compose-cancel').addEventListener('click', () => dlg.close());
  $('#compose-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = { text: text.value, aud: $('#compose-aud').value, announcement: $('#compose-ann').checked };
    const wasEdit = !!editing;
    const r = wasEdit ? staffStore.editPost(storage, editing.id, fields) : staffStore.addPost(storage, fields);
    if (!r.ok) { $('#compose-error').textContent = r.reason; text.setAttribute('aria-invalid', 'true'); text.focus(); return; }
    text.value = '';
    $('#compose-ann').checked = false;
    $('#compose-aud').value = 'all';
    dlg.close();
    toast(wasEdit ? 'Post updated' : 'Posted');
    if (wasEdit) { if (view === 'feed') render(); else renderPage(); return; } // where the person was stays where it was
    ui.tab = 'foryou'; ui.q = '';
    render();
    document.querySelector(`#feed li[data-post="${r.post.id}"]`)?.scrollIntoView({ block: 'start' });
  });

  // Delete a post of your own: it asks first (Cancel has the focus), then the post, its replies and likes go.
  const del = $('#del');
  let doomed = null;
  ownPost.remove = (p) => { doomed = p; $('#del-quote').textContent = p.text; del.showModal(); $('#del-cancel').focus(); };
  $('#del-cancel').addEventListener('click', () => del.close());
  $('#del-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const r = doomed && staffStore.deletePost(storage, doomed.id);
    del.close();
    if (!r || !r.ok) { toast(r ? r.reason : 'This post is no longer available.'); return; }
    doomed = null;
    toast('Post deleted');
    clearFocus(); // a post opened on its own is gone: back to the feed
    if (view === 'feed') render(); else renderPage();
    $('#composer-open')?.focus();
  });
}

/* ------------------------------------------------------------ Staff: pages of the left menu */

// My profile, Activity, Guidelines and Moderation open inside Social, under its own header (Back goes to the feed), never in the Staff shell.
const ROUTES = { me: 'My profile', activity: 'Activity', guidelines: 'Guidelines', moderation: 'Moderation' };
let view = 'feed';
let profileTab = staff ? 'posts' : 'replies';
let activityTab = 'all';
let staffCardOpen = false;
// A resident has My profile and Activity (Guidelines is a window for them, and Moderation is for Staff).
const routeOf = () => { const m = location.hash.match(/^#\/(me|activity|guidelines|moderation)\b/); return m && (staff || m[1] === 'me' || m[1] === 'activity') ? m[1] : 'feed'; };

function showView(name) {
  view = name;
  $('#view-feed').hidden = name !== 'feed';
  $('#view-page').hidden = name === 'feed';
  if (name !== 'feed') ui.focus = null; // a page of the menu replaces whatever post was open
  for (const a of document.querySelectorAll('[data-route]')) { if (a.dataset.route === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
  syncChrome();
  if (name !== 'feed' && !$('#search-row').hidden) setSearch(false);
  closeMenus();
  if (name === 'feed') render(); else { renderPage(); $('#main-content').scrollTop = 0; }
}
// The header follows what is open: its title, and whether Back shows.
function syncChrome() {
  const focused = view === 'feed' && !!ui.focus;
  $('header h1').textContent = view === 'feed' ? (focused ? 'Post' : 'Feed') : ROUTES[view];
  // Back shows for a post opened on its own, and for a page of the menu (Staff) except My profile, which has its own Back arrow at the top of its cover.
  // On the feed itself there is no step back: Exit is the way out.
  $('#btn-back').hidden = focused ? false : view === 'feed' || view === 'me';
  $('#btn-back').setAttribute('aria-label', 'Back to the feed');
  // On a phone the page repeats its own title under the header, and Exit and Back need the room: the header's title is kept for screen readers only.
  for (const el of [$('header h1'), $('#subtitle')]) el.classList.toggle('max-sm:sr-only', view !== 'feed' || focused);
}
function toFeed() {
  if (view === 'feed') return;
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  showView('feed');
}

// One post on its own, easier to read than inside the feed: a double click on it, "Open post" in its menu, or the link Copy link gives.
function openPost(id) {
  closeMenus();
  if (!$('#search-row').hidden) setSearch(false);
  history.pushState({ post: id }, '', `${location.pathname}${location.search}#/post/${id}`);
  ui.focus = id;
  if (view !== 'feed') showView('feed'); // opened from a card on My profile: the post is shown by the feed's view; Back returns to that page
  else { render(); syncChrome(); }
  $('#main-content').scrollTop = 0;
}
function leavePost() {
  if (!ui.focus) return;
  if (history.state && history.state.post) { history.back(); return; } // the address changes back, and syncRoute draws the feed again
  const was = ui.focus;
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  ui.focus = null;
  render();
  syncChrome();
  whereItWas(was);
}
// Back from a post lands on that post in the feed, not at the top of it.
function whereItWas(id) {
  document.querySelector(`#feed li[data-post="${id}"]`)?.scrollIntoView({ block: 'center' });
}
// Another way into the feed (a notification, a tab, search) drops the single post without a step in the history.
function clearFocus() {
  if (!ui.focus) return;
  ui.focus = null;
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  syncChrome();
}
// The address says what is open: a post, a page of the menu, or the feed. It is read on a typed link and on the browser's Back and Forward.
function syncRoute() {
  const was = ui.focus;
  ui.focus = postRoute();
  showView(routeOf());
  syncChrome();
  if (was && !ui.focus && view === 'feed') whereItWas(was);
}
addEventListener('hashchange', syncRoute);
addEventListener('popstate', syncRoute);
// A double click on a post (not on a button, a link, a field or a masked value) opens it on its own, and a double click again, on the post or around it,
// goes back to the feed. A double click also selects a word, so the selection is cleared.
$('#main-content').addEventListener('dblclick', (e) => {
  if (e.target.closest('button, a, input, textarea, select, label, summary, [data-menu-panel]')) return; // (a hidden value is a button)
  if (view === 'feed' && ui.focus) { window.getSelection()?.removeAllRanges(); leavePost(); return; }
  // The posts of the feed, and the ones listed on My profile (Staff).
  const li = e.target.closest(view === 'feed' ? '#feed > li[data-post]' : view === 'me' ? '#view-page li[data-post]' : 'none');
  if (!li) return;
  window.getSelection()?.removeAllRanges();
  openPost(li.dataset.post);
});

function pageHead(title, sub) {
  const h = tpl('t-pagehead');
  $('[data-title]', h).textContent = title;
  $('[data-sub]', h).textContent = sub;
  return h;
}
function infoCard(title, actions = []) {
  const c = tpl('t-card');
  $('[data-title]', c).textContent = title;
  for (const a of actions) $('[data-actions]', c).appendChild(a);
  return c;
}
function line(k, v) {
  const l = tpl('t-line');
  $('[data-k]', l).textContent = k;
  $('[data-v]', l).textContent = v;
  return l;
}
function note(text) { const n = tpl('t-empty-line'); n.textContent = text; return n; }

function renderPage() {
  const host = $('#view-page');
  clear(host);
  const all = getTimeline();
  if (view === 'me') pageProfile(host, all);
  else if (view === 'activity') pageActivity(host, all);
  else if (view === 'guidelines') pageGuidelines(host);
  else if (view === 'moderation') pageModeration(host, all);
}

// The people behind the Followers and Following counts, each with Follow.
const peopleDlg = $('#people');
function openPeople(kind, opener) {
  const keys = kind === 'followers' ? followersOf(storage, viewerKey) : [...followingKeys()];
  const list = $('#people-list');
  const draw = () => {
    clear(list);
    for (const key of keys) {
      const w = whoIs(key, staff ? me.name : 'Property team');
      const row = tpl('t-rx-row');
      $('[data-avatar]', row).textContent = initials(w.name);
      $('[data-name]', row).textContent = w.name;
      $('[data-role]', row).textContent = w.role;
      $('[data-emoji]', row).hidden = true;
      followButton($('[data-follow]', row), key, w.name, () => { draw(); renderPage(); });
      list.appendChild(row);
    }
  };
  draw();
  $('#people-title').textContent = `${kind === 'followers' ? 'Followers' : 'Following'} · ${keys.length}`;
  $('#people-empty').hidden = keys.length > 0;
  $('#people-empty').textContent = kind === 'followers' ? 'Nobody follows you yet.' : 'You are not following anyone yet. Follow people from the list of who reacted to a post.';
  peopleDlg.showModal();
  $('#people-title').focus({ preventScroll: true });
  peopleDlg.addEventListener('close', () => { const b = document.querySelector(`#view-page [data-p-${kind}-btn]`) || opener; if (b && b.isConnected) b.focus({ preventScroll: true }); }, { once: true });
}
$('#people-close').addEventListener('click', () => peopleDlg.close());
peopleDlg.addEventListener('click', (e) => { if (e.target === peopleDlg) peopleDlg.close(); });

// A row of tabs; picking one calls `pick` (which draws the page again) and keeps focus on the tab.
function tabBar(items, current, pick) {
  const tabs = document.createElement('div');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Show');
  tabs.className = 'flex gap-step-xs overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';
  for (const [id, label] of items) {
    const t = tpl('t-tab');
    t.textContent = label;
    t.dataset.id = id;
    t.setAttribute('aria-selected', String(current === id));
    t.tabIndex = current === id ? 0 : -1;
    t.addEventListener('click', () => { pick(id); document.querySelector(`#view-page [role="tab"][data-id="${id}"]`)?.focus({ preventScroll: true }); });
    t.addEventListener('keydown', (e) => {
      const i = items.findIndex((x) => x[0] === id);
      const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
      if (n < 0) return;
      e.preventDefault();
      const next = items[(n + items.length) % items.length][0];
      pick(next);
      document.querySelector(`#view-page [role="tab"][data-id="${next}"]`)?.focus({ preventScroll: true });
    });
    tabs.appendChild(t);
  }
  return tabs;
}

// One line of what the person did, in the notification row's layout; it opens the post (or, with no post, `onOpen`).
function activityRow(n) {
  const li = tpl('t-notif');
  $('[data-avatar]', li).textContent = initials(me.name);
  $('[data-icon]', li).setAttribute('href', `#${n.icon}`);
  $('[data-who]', li).textContent = 'You';
  fillText($('[data-what]', li), n.what);
  $('[data-meta]', li).textContent = [n.t ? when(n.t) : '', n.meta].filter(Boolean).join(' · ');
  $('[data-dot]', li).hidden = true;
  const b = $('button', li);
  b.addEventListener('click', () => (n.post ? goToPost(n.post) : n.onOpen?.(b)));
  return li;
}

// What this person wrote as replies, with the comment or post each one answers (the same for Staff and a resident).
function myReplies(all) {
  const out = [];
  for (const p of all) {
    for (const r of p.replies) {
      if (r.key !== viewerKey) continue;
      const to = r.parentId ? p.replies.find((x) => x.id === r.parentId) : null;
      out.push({ id: `r-${p.id}-${r.id}`, t: r.t, what: `replied to ${to ? (to.key === viewerKey ? 'your own comment' : to.name) : p.name}: “${clip(r.text)}”`, meta: 'Replies', icon: 'i-message', post: p.id });
    }
  }
  return out.sort((a, b) => b.t - a.t);
}

function pageProfile(host, all) {
  const followers = followersOf(storage, viewerKey);
  const followingNow = [...followingKeys()];
  const mine = all.filter((x) => x.mine);
  const replies = myReplies(all);
  const p = tpl('t-profile');
  $('[data-p-avatar]', p).textContent = initials(me.name);
  $('[data-p-name]', p).textContent = me.name;
  $('[data-p-role]', p).textContent = staff ? `${me.title} · ${me.org}` : `Resident · ${me.org}`;
  if (staff) $('[data-p-bio]', p).textContent = `${me.title} at ${me.org.split(' at ')[0]} · parking ops & resident services`;
  else $('[data-p-bio]', p).hidden = true;
  $('[data-p-followers]', p).textContent = String(followers.length);
  $('[data-p-following]', p).textContent = String(followingNow.length);
  $('[data-p-posts]', p).textContent = String(staff ? mine.length : replies.length);
  $('[data-p-posts-label]', p).textContent = staff ? (mine.length === 1 ? 'post' : 'posts') : (replies.length === 1 ? 'reply' : 'replies');
  const fb = $('[data-p-followers-btn]', p);
  fb.setAttribute('aria-haspopup', 'dialog');
  fb.addEventListener('click', () => openPeople('followers', fb));
  const gb = $('[data-p-following-btn]', p);
  gb.setAttribute('aria-haspopup', 'dialog');
  gb.addEventListener('click', () => openPeople('following', gb));
  $('[data-p-back]', p).addEventListener('click', toFeed);
  // A resident's profile details are in their Settings: Edit profile goes there instead of only saying so.
  if (!staff) { const ed = $('[data-p-edit]', p); ed.removeAttribute('data-p-toast'); ed.addEventListener('click', () => location.assign(withAs('/resident/settings.html'))); }
  for (const b of p.querySelectorAll('[data-p-toast]')) b.addEventListener('click', () => toast(b.dataset.pToast));
  $('[data-p-share]', p).addEventListener('click', () => { try { navigator.clipboard?.writeText(`${location.origin}${location.pathname}#/me`); } catch { /* the toast still tells what was meant */ } toast('Link copied'); });
  host.appendChild(p);

  if (staff) {
    // Staff card: what residents see about this person, hidden or shown.
    const edit = button('Edit', () => toast('Editing your Staff card is part of Settings in this preview.'));
    const toggle = button(staffCardOpen ? 'Hide' : 'Show', () => { staffCardOpen = !staffCardOpen; renderPage(); });
    toggle.setAttribute('aria-expanded', String(staffCardOpen));
    const sc = infoCard('Staff card', [edit, toggle]);
    if (staffCardOpen) { $('[data-body]', sc).append(line('Name', me.name), line('Role', me.title), line('Property', me.org)); } else $('[data-body]', sc).hidden = true;
    host.appendChild(sc);
  }
  const about = infoCard('About');
  if (staff) $('[data-body]', about).append(line('Role', me.title), line('Property', me.org));
  else $('[data-body]', about).append(line('Property', me.org));
  host.appendChild(about);

  if (staff) {
    const photos = infoCard('Photos');
    const imgs = mine.flatMap((x) => x.images);
    if (!imgs.length) $('[data-body]', photos).appendChild(note('No photos yet.'));
    else {
      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-3 gap-step-sm';
      for (const im of imgs.slice(0, 6)) { const d = tpl('t-photo'); d.style.background = im.bg; d.setAttribute('aria-label', im.alt); grid.appendChild(d); }
      $('[data-body]', photos).appendChild(grid);
    }
    host.appendChild(photos);

    // The composer again ("What's on your mind?"), then this person's posts.
    const c = $('#composer').cloneNode(true);
    for (const el of [c, ...c.querySelectorAll('[id]')]) el.removeAttribute('id');
    c.hidden = false;
    $('button.flex-1', c).textContent = "What's on your mind?";
    for (const b of c.querySelectorAll('button')) b.addEventListener('click', () => $('#composer-open').click());
    host.appendChild(c);
  }
  // The tabs: what this person posted (Staff) or replied (a resident), what they shared, and what they saved. Shares and saved are lists of posts.
  const saved = savedSet();
  const sets = {
    posts: { label: 'Posts', posts: mine, empty: 'You have not posted yet. Start a discussion to get this feed going.' },
    replies: { label: 'Replies', rows: replies, empty: 'You have not replied yet. Open a post and press Reply.' },
    shares: { label: 'Shares', posts: all.filter((x) => x.shared), empty: 'You have not shared anything yet. Press Share on a post to show it here.' },
    saved: { label: 'Saved', posts: all.filter((x) => saved.has(x.id)), empty: 'Nothing saved yet. Press the bookmark on a post.' },
  };
  const ids = staff ? ['posts', 'shares', 'saved'] : ['replies', 'shares', 'saved'];
  if (!ids.includes(profileTab)) profileTab = ids[0];
  host.appendChild(tabBar(ids.map((id) => [id, `${sets[id].label} · ${(sets[id].posts || sets[id].rows).length}`]), profileTab, (id) => { profileTab = id; renderPage(); }));
  const cur = sets[profileTab];
  const list = document.createElement('ul');
  list.setAttribute('role', 'list');
  if (cur.rows) {
    list.className = 'flex flex-col divide-y divide-border rounded-xl bg-card shadow-lift-xs';
    for (const n of cur.rows) list.appendChild(activityRow(n));
  } else {
    list.className = 'flex flex-col gap-step-md';
    for (const x of cur.posts) list.appendChild(card(x));
  }
  if (!(cur.posts || cur.rows).length) host.appendChild(note(cur.empty));
  host.appendChild(list);
}

// Everything this person did in Social, newest first: posts, replies, reactions (to posts and to comments), shares, and the people they follow. A reaction
// or a share has no time of its own, so those come after the ones that do.
function pageActivity(host, all) {
  host.appendChild(pageHead('Activity', 'What you did in Social'));
  const kinds = { posts: [], replies: myReplies(all), reactions: [], shares: [], follows: [] };
  for (const p of all) {
    if (p.mine) kinds.posts.push({ t: p.t, what: `posted: “${clip(p.text)}”`, meta: 'Posts', icon: p.announcement ? 'i-megaphone' : 'i-message', post: p.id });
    if (p.myReaction) kinds.reactions.push({ t: 0, what: `${p.myReaction === 'like' ? 'liked' : `reacted ${iconOf(p.myReaction)} to`} ${p.name}'s post`, meta: 'Reactions', icon: 'i-thumb', post: p.id });
    for (const r of p.replies) if (r.myReaction) kinds.reactions.push({ t: 0, what: `${r.myReaction === 'like' ? 'liked' : `reacted ${iconOf(r.myReaction)} to`} ${r.key === viewerKey ? 'your own' : `${r.name}'s`} comment`, meta: 'Reactions', icon: 'i-thumb', post: p.id });
    if (p.shared) kinds.shares.push({ t: 0, what: `shared ${p.name}'s post to your profile`, meta: 'Shares', icon: 'i-repeat', post: p.id });
  }
  for (const key of followingKeys()) kinds.follows.push({ t: 0, what: `follow ${whoIs(key, staff ? me.name : 'Property team').name}`, meta: 'Following', icon: 'i-user', post: null, onOpen: (b) => openPeople('following', b) });
  const tabs = ['all', ...(staff ? ['posts'] : []), 'replies', 'reactions', 'shares', 'follows'];
  if (!tabs.includes(activityTab)) activityTab = 'all';
  const label = { all: 'All', posts: 'Posts', replies: 'Replies', reactions: 'Reactions', shares: 'Shares', follows: 'Following' };
  const of = (id) => (id === 'all' ? Object.values(kinds).flat() : kinds[id]);
  host.appendChild(tabBar(tabs.map((id) => [id, `${label[id]} · ${of(id).length}`]), activityTab, (id) => { activityTab = id; renderPage(); }));
  const items = of(activityTab).sort((a, b) => b.t - a.t);
  const c = infoCard(label[activityTab]);
  if (!items.length) $('[data-body]', c).appendChild(note('Nothing yet. Your replies, reactions and shares show up here.'));
  else {
    const ul = document.createElement('ul');
    ul.setAttribute('role', 'list');
    ul.className = '-mx-step-lg flex flex-col divide-y divide-border';
    for (const n of items.slice(0, 40)) ul.appendChild(activityRow(n));
    $('[data-body]', c).appendChild(ul);
  }
  host.appendChild(c);
}

function pageGuidelines(host) {
  const g = guidelines(storage);
  host.appendChild(pageHead('Community guidelines', `Version ${g.ver} · published ${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(g.pub))} by ${g.by}`));
  const c = infoCard('What residents and staff agree to');
  for (const [title, text] of g.blocks) {
    const b = tpl('t-block');
    $('[data-title]', b).textContent = title;
    $('[data-text]', b).textContent = text;
    $('[data-body]', c).appendChild(b);
  }
  host.appendChild(c);
}

function pageModeration(host, all) {
  host.appendChild(pageHead('Moderation', 'Keep Social friendly for residents and staff.'));
  const rep = infoCard('Reported posts');
  $('[data-body]', rep).appendChild(note('Nothing to review right now.'));
  host.appendChild(rep);
  const m = staffStore.muted(storage);
  const nameOf = (key) => all.find((x) => x.by === key)?.name || key;
  const rows = [
    ...m.people.map((v) => ({ kind: 'people', value: v, label: nameOf(v), what: 'Person' })),
    ...m.kw.map((v) => ({ kind: 'kw', value: v, label: `“${v}”`, what: 'Word' })),
    ...m.threads.map((v) => ({ kind: 'threads', value: v, label: clip(all.find((x) => x.id === v)?.text || v, 70), what: 'Thread' })),
  ];
  const c = infoCard('Muted by you');
  if (!rows.length) $('[data-body]', c).appendChild(note('You have not muted anything. Posts from muted people, words and threads are held back from your feed.'));
  else {
    const ul = document.createElement('ul');
    ul.setAttribute('role', 'list');
    ul.className = 'flex flex-col divide-y divide-border';
    for (const r of rows) {
      const li = tpl('t-muted-row');
      $('[data-label]', li).textContent = r.label;
      $('[data-kind]', li).textContent = r.what;
      const b = $('[data-unmute]', li);
      b.setAttribute('aria-label', `Unmute ${r.label}`);
      b.addEventListener('click', () => { staffStore.unmute(storage, r.kind, r.value); toast('Unmuted'); renderPage(); });
      ul.appendChild(li);
    }
    $('[data-body]', c).appendChild(ul);
  }
  host.appendChild(c);
}

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
const isGated = () => !staff && socialOn(storage) && residentState(storage, me.id).show && needsGuidelines(storage, me.id);
const signature = () => JSON.stringify([socialOn(storage), canReply(storage), isGated(), guidelines(storage), getTimeline(), residentState(storage, me.id).show]);
function start() {
  const gated = isGated();
  if (signature() === seen) return;
  render(); // render() also records what it showed, so a re-render it caused itself is never repeated
  if (threadDlg.open) drawThread(); // somebody answered while the replies window is open
  if (gl.open) { if (gated) fillGuidelines(); else { gate = false; gl.close(); } } // the policy changed or was accepted elsewhere while it was open
}
start();
if (routeOf() !== "feed") showView(routeOf()); // opened on a page of the menu (a link or a reload)
syncChrome(); // opened on a single post (a link or a reload): the header says "Post" and shows Back
