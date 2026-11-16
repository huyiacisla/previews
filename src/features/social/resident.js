// Social page controller for the Resident and the Staff edition. <body data-portal="resident"> or "staff".
// All markup and Tailwind classes live in partials/social-app.html; this file clones templates, fills text and toggles
// hidden / data-* / aria-*. A resident reads and interacts (like, reply); there is no composer and no store function that posts for them.
// Staff see the whole timeline, can post, and answer the comments that wait for a reply (staff-store.js); they have no guidelines gate.

import { exitTarget } from "../../shared/js/exit-target.js";
import { initials, PORTALS, pickPersona } from "../messaging/personas.js";
import { clip, socialAlerts } from "./alerts.js";
import { fitSize, MAX_DATA_CHARS, MAX_IMAGES, MAX_SIDE, photoBg, TYPES } from "./images.js";
import { clockParts, isHold, looksLikeSpam, MAX_NOTE, pauseMessage, REASONS, RULE_LIMITS, ruleFor, shutsOut, strikesOf, KINDS as VIO_KINDS } from "./moderation.js";
import { staffSocialPrefs } from "./prefs.js";
import { canon, describe as describeReactions, iconOf, KINDS, labelOf, topKinds } from "./reactions.js";
import { closeReports, hasReported, openReports, REASONS as REPORT_REASONS, reportPost, reasonLabel as reportReasonLabel } from "./reports.js";
import { followersOf, whoIs } from "./residents.js";
import { allowed } from "./roles.js";
import { ensureFeed } from "./seed.js";
import * as staffStore from "./staff-store.js";
import {
  acceptGuidelines,
  ackNotice,
  canReply,
  foldersOf,
  guidelines,
  hiddenByMute,
  MAX_REPLY,
  needsGuidelines,
  noticesOf,
  pauseOf,
  deleteReply as residentDelete,
  editReply as residentEdit,
  follow as residentFollow,
  hideComment as residentHide,
  mutePerson as residentMutePerson,
  react as residentReact,
  addReply as residentReply,
  share as residentShare,
  residentState,
  timeline as residentTimeline,
  unmuteAll as residentUnmuteAll,
  resumePause,
  setShow,
  socialOn,
  staffSwitchedOff,
  strikeLimit,
} from "./store.js";

const $ = (sel, root = document) => root.querySelector(sel);
const tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);
const clear = (el) => {
  while (el.firstChild) el.removeChild(el.firstChild);
};

const portal = document.body.dataset.portal;
const me = pickPersona(portal, new URLSearchParams(location.search).get("as"));
const info = PORTALS[portal];
const storage = window.localStorage;
// Links keep ?as= and ?dark but not "embed": that one only says this page sits inside the frame.
const withAs = (path) => {
  const q = new URLSearchParams(location.search);
  q.delete("embed");
  return q.toString() ? `${path}?${q}` : path;
};
// A post can be opened on its own: "#/post/<id>" (a double click on a post, "Open post" in its menu, or the link Copy link gives). `focus` is that post's id.
const postRoute = () => (location.hash.match(/^#\/post\/([\w-]+)/) || [])[1] || null;
const ui = { tab: "foryou", q: "", focus: postRoute() };
const staff = portal === "staff";
const ownPost = {}; // what Staff can do with a post of their own (edit, remove): set where the dialogs are, used by each post's menu
ensureFeed(storage); // the same sample timeline the Staff prototype starts with, so this page is not empty in a browser that never opened it

// One timeline and one set of actions for both editions.
const getTimeline = () => (staff ? staffStore.timeline(storage, me.name) : residentTimeline(storage, me.id));
const doReact = (id, kind) => (staff ? staffStore.react(storage, id, kind) : residentReact(storage, me.id, id, kind));
const doShare = (id) => (staff ? staffStore.share(storage, id) : residentShare(storage, me.id, id));
const doReply = (id, text, to) => (staff ? staffStore.addReply(storage, id, text, { to }) : residentReply(storage, me.id, id, text, Date.now(), to));
// Follow: people are named by a key ("dana", "res:res-1"); the person using the app is "me" (Staff) or "res:<id>" (a resident) and cannot follow themselves.
const viewerKey = staff ? "me" : `res:${me.id}`;
const followingKeys = () => new Set((staff ? staffStore.following(storage) : residentState(storage, me.id).following).map(canon));
const doFollow = (key) => (staff ? staffStore.follow(storage, key) : residentFollow(storage, me.id, key));
for (const el of document.querySelectorAll("[data-staff-only]")) el.hidden = !staff;
for (const el of document.querySelectorAll("[data-resident-only]")) el.hidden = staff;

/* ------------------------------------------------------------------ header */

// The picture this person saved in Settings (one record for each portal): it replaces their initials wherever they appear here. Only a small image data address is used.
const ownPhoto = (() => {
  try {
    const v = localStorage.getItem(staff ? "eso-avatar" : `${portal}:eso-avatar`);
    return typeof v === "string" && /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ? v : "";
  } catch {
    return "";
  }
})();
/** Initials in an avatar, or the person's own picture when it is them (`mine`) and they have one. */
const paintAvatar = (el, name, mine = false) => {
  if (!el) return;
  if (mine && ownPhoto) {
    el.textContent = "";
    el.style.backgroundImage = `url("${ownPhoto}")`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", name);
  } else el.textContent = initials(name);
};

$("#subtitle").textContent = me.org; // under "Feed": the property's name, for Staff and residents alike
if (staff) paintAvatar($("#composer-avatar"), me.name, true);
paintAvatar($("#me-avatar"), me.name, true);
$("#me-name").textContent = me.name;
// The avatar opens the person's Social profile (inside Social); the name is not repeated beside it. A resident's Settings are in the menu and in the left menu.
$("#me-link").href = "#/me";
$("#me-name").parentElement.hidden = true;
if (!staff) $("#nav-settings").href = withAs("/resident/settings.html");
// Exit leaves Social, always (see exit-target.js). Back is the other button: one step inside Social, from a page of the menu to the feed (see showView).
$("#btn-exit").href = exitTarget("/social.html", info.home);
$("#btn-back").addEventListener("click", () => (ui.focus ? leavePost() : toFeed()));

$("#me-settings").href = withAs("/resident/settings/property.html");
// The avatar opens this menu at every width (it used to be a plain link on a desktop, which looked like a button that did nothing).
const meMenu = $("#social-menu");
{
  const a = $("#me-link");
  a.setAttribute("aria-haspopup", "menu");
  a.setAttribute("aria-controls", "social-menu");
  a.setAttribute("aria-expanded", "false");
  a.setAttribute("aria-label", `${me.name}, Social menu`);
  $("#menu-name").textContent = me.name;
  $("#menu-sub").textContent = staff ? me.title : me.title || "Resident";
}
$("#me-link").addEventListener("click", (e) => {
  e.preventDefault();
  const was = !meMenu.hidden;
  closeMenus();
  meMenu.hidden = was;
  $("#me-link").setAttribute("aria-expanded", String(!was));
  if (!was) meMenu.querySelector("a:not([hidden]), button:not([hidden])")?.focus();
});
meMenu.addEventListener("click", (e) => {
  if (e.target.closest("a, button")) closeMenus();
});
// The keys of a menu: arrows, Home and End move between the items; Esc closes it and gives the focus back to the avatar that opened it.
meMenu.addEventListener("keydown", (e) => {
  const list = [...meMenu.querySelectorAll('[role="menuitem"]:not([hidden])')];
  const at = list.indexOf(document.activeElement);
  const to = { ArrowDown: (at + 1) % list.length, ArrowUp: (at + list.length - 1) % list.length, Home: 0, End: list.length - 1 }[e.key];
  if (to !== undefined) {
    e.preventDefault();
    list[to].focus();
  } else if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    closeMenus();
    $("#me-link").focus();
  }
});

// Search: the magnifier in the header opens a field that narrows the feed by words in the post or the author's name.
const searchBtn = $("#btn-search");
function setSearch(openIt) {
  $("#search-row").hidden = !openIt;
  searchBtn.setAttribute("aria-expanded", String(openIt));
  if (openIt) $("#q").focus();
  else if (ui.q) {
    ui.q = "";
    $("#q").value = "";
    render();
  }
}
// On a page of the menu (profile…) the search still sits beside the shield: it takes you to the feed with the search open.
searchBtn.addEventListener("click", () => {
  if (view !== "feed") {
    toFeed();
    setSearch(true);
    return;
  }
  if (ui.focus) {
    clearFocus();
    render();
  }
  setSearch($("#search-row").hidden);
});
$("#q").addEventListener("input", (e) => {
  ui.q = e.target.value.trim().toLowerCase();
  render();
});
$("#q").addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.stopPropagation();
    setSearch(false);
    searchBtn.focus();
  }
});

function toast(text) {
  const el = tpl("t-toast");
  $("[data-text]", el).textContent = text;
  const box = $("#toasts");
  box.appendChild(el);
  try {
    if (box.matches(":popover-open")) box.hidePopover();
    box.showPopover();
  } catch {
    /* older browsers */
  }
  setTimeout(() => {
    el.remove();
    if (!box.children.length)
      try {
        box.hidePopover();
      } catch {
        /* already hidden */
      }
  }, 3500);
}

function badge(text, tone = "neutral") {
  const el = tpl("t-badge");
  el.dataset.tone = tone;
  el.textContent = text;
  return el;
}

const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
// "now", "5m", "2h", "3d", then the date: the same short times the Staff feed shows.
const when = (t) => {
  if (!t) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return fmt.format(new Date(t));
};
const iso = (t) => (t ? new Date(t).toISOString() : "");

/* --------------------------------------------------------------------- feed */

function render() {
  const feed = $("#feed");
  const empty = $("#empty");
  clear(feed);
  clear(empty);
  const slot = $("#gate-slot");
  clear(slot);
  // Staff always see Social (the switch and the hide option belong to residents) and have no guidelines gate.
  const offByStaff = !staff && staffSwitchedOff(storage, me.id); // Staff closed Social for this resident
  const on = staff || (socialOn(storage) && !offByStaff);
  const shown = staff || residentState(storage, me.id).show;
  if (!staff) for (const b of document.querySelectorAll("[data-act]")) b.hidden = b.dataset.act === "hide" ? !shown : !on;
  // Under a pause the person sees the pause first (the clock), not the guidelines gate, and nothing of Social: the gate waits until the pause is over.
  // A BAN (or 3 strikes) shuts the resident out: no feed, no post, no profile, until the clock reaches zero. An ordinary pause (from a comment) only stops writing: the feed stays readable under the clock.
  const locked = !staff && on && shown && !!lockedNow();
  const gated = !staff && on && shown && !locked && needsGuidelines(storage, me.id);
  // Paused: the header keeps only Exit and the clock fills the page; everything else (title, search, Privacy, Pulse, bell, theme, avatar, tabs, menus) is shut.
  for (const el of document.querySelectorAll("[data-lock-hide]")) el.style.display = locked ? "none" : "";
  for (const el of document.querySelectorAll("[data-lock-show]")) el.style.display = locked ? "inline-flex" : ""; // the theme switch stays, in the corner, on a phone too
  $("#main-content > div").toggleAttribute("data-locked", locked); // the left menu is gone: the one column is the clock, not the narrow menu column
  if (locked) {
    if (ui.focus || location.hash) {
      ui.focus = null;
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    } // a link to a post leads nowhere now
    if (threadDlg.open) threadDlg.close();
    if (view !== "feed") {
      showView("feed");
      return;
    }
  }
  const all = on && shown && !gated && !locked ? getTimeline() : [];
  applyPrivacyUi();
  renderNotices();
  if (!locked) showNextNotice(); // before the guidelines gate: what happened first, then the guidelines
  renderTabs(all);
  renderRail(all);
  renderNotifs(all);
  if (view !== "feed") renderPage(); // a card of the profile page was used: draw the page again
  const follows = followingKeys();
  // Staff: the mute settings hold some posts back; the bar says how many, and where to change that.
  const muteBar = $("#mute-bar");
  let visible = all;
  if (staff) {
    const m = staffStore.applyMute(storage, all);
    visible = m.shown;
    muteBar.hidden = m.hidden === 0;
    $("#mute-count").textContent = `${m.hidden} ${m.hidden === 1 ? "post" : "posts"} hidden by your mute settings`;
  } else {
    // A resident who muted a neighbor is told how many posts that holds back, and can bring them all back.
    const n = on && shown && !locked && !gated ? hiddenByMute(storage, me.id) : 0;
    muteBar.hidden = n === 0;
    $("#mute-count").textContent = `${n} ${n === 1 ? "post" : "posts"} hidden because you muted a neighbor`;
    const manage = $("#mute-manage");
    manage.textContent = "Unmute all";
    manage.setAttribute("href", "#");
    manage.onclick = (e) => {
      e.preventDefault();
      if (tell(residentUnmuteAll(storage, me.id)).ok) {
        toast("Neighbors unmuted.");
        render();
      }
    };
  }
  const inTab = visible.filter((p) => {
    if (ui.tab === "following") return follows.has(canon(p.by)) || p.mine;
    if (staff) return ui.tab === "announcements" ? p.kind !== "Staff discussion" : ui.tab === "discussions" ? p.kind === "Staff discussion" : true;
    return ui.tab === "announcements" ? p.announcement : ui.tab === "discussions" ? !p.announcement : true;
  });
  // One post on its own: only it (the tabs, the composer and the mute bar are for the whole feed, so they step aside).
  const posts = ui.focus ? all.filter((p) => p.id === ui.focus) : ui.q ? inTab.filter((p) => `${p.name} ${p.text}`.toLowerCase().includes(ui.q)) : inTab;
  if (ui.focus) $("#tabs").hidden = true;
  $("#composer").hidden = !staff || !!ui.focus;
  if (staff && ui.focus) muteBar.hidden = true;
  // REQUIRED: until the guidelines are confirmed nothing of Social is reachable (no posts, and the header tools and the page are inert).
  const gateDlg = $("#gate");
  for (const el of [...document.querySelectorAll("[data-social-only]"), $("#main-content")]) el.inert = gated;
  if (locked && !$("#search-row").hidden) setSearch(false);
  if (gated) {
    slot.appendChild(buildGate());
    syncGate();
    if (!gateDlg.open && !noticeDlg.open) gateDlg.showModal(); // the notice ("Your pause has ended") comes first; the guidelines open when it is closed
  } else if (gateDlg.open) gateDlg.close();
  // The feed draws a page at a time (20 posts, then "Show more"): a long feed opens at once instead of drawing every post and every comment. A post opened on its own always draws.
  const PAGE = 20;
  const pageKey = `${ui.tab}|${ui.q}|${ui.focus || ""}`;
  if (ui.pageKey !== pageKey) {
    ui.pageKey = pageKey;
    ui.shown = PAGE;
  }
  const drawn = ui.focus ? posts : posts.slice(0, ui.shown || PAGE);
  for (const p of drawn) feed.appendChild(card(p));
  if (posts.length > drawn.length) {
    const more = document.createElement("li");
    more.className = "flex justify-center py-step-md";
    more.appendChild(
      button(`Show ${Math.min(PAGE, posts.length - drawn.length)} more posts`, () => {
        ui.shown = (ui.shown || PAGE) + PAGE;
        render();
      }),
    );
    feed.appendChild(more);
  }
  empty.hidden = posts.length > 0;
  seen = signature();
  if (posts.length) return;
  const e = tpl("t-empty");
  const actions = $("[data-actions]", e);
  let title;
  let text;
  if (!on) {
    title = "Social is off";
    text = offByStaff ? "The property team turned Social off for you. Messages still work." : "The property team has turned Social off for now.";
  } else if (!shown) {
    title = "Social is hidden";
    text = "You chose to hide Social. Nothing from it shows in the app until you turn it back on.";
    actions.appendChild(
      button(
        "Show Social",
        () => {
          setShow(storage, me.id, true);
          toast("Social is on");
          render();
        },
        true,
      ),
    );
  } else if (locked) {
    title = "Social is closed for you";
    text = pausedNow() && pausedNow().review ? "It opens when the property team reopens your account." : "The clock above says when it opens again.";
  } else if (gated) {
    title = "Read the guidelines first";
    text = "Social opens once you have read the community guidelines to the end and confirmed them.";
  } else if (ui.focus) {
    title = "This post is not available";
    text = "It may have been deleted, or it is not shown to you.";
    actions.appendChild(button("Back to the feed", leavePost, true));
  } else if (ui.q && inTab.length) {
    title = "No posts match";
    text = "Try a different word, or clear the search to see every post.";
  } else if (ui.tab === "following" && all.length) {
    title = "No posts from people you follow";
    text = "Follow people from the list of who reacted to a post. Their posts show here.";
  } else if (all.length) {
    title = "Nothing here yet";
    text = "Try another tab to see more posts.";
  } else {
    title = "No posts yet";
    text = "Updates from your property and neighbors will show up here.";
  }
  $("[data-title]", e).textContent = title;
  $("[data-text]", e).textContent = text;
  empty.appendChild(e);
}

const TABS = staff
  ? [
      ["foryou", "For you"],
      ["following", "Following"],
      ["discussions", "Discussions"],
      ["announcements", "Community & Announcements"],
    ]
  : [
      ["foryou", "For you"],
      ["following", "Following"],
      ["discussions", "Discussions"],
      ["announcements", "Community & Announcements"],
    ];

// The right-hand column: the newest announcements, each one opens its post in the feed. Staff also get what waits for an answer and how their own announcements do.
function renderRail(all) {
  const list = $("#rail-list");
  clear(list);
  const items = (staff ? all.filter((p) => p.kind !== "Staff discussion" && p.aud !== "staff") : all.filter((p) => p.announcement)).slice(0, 4);
  $("#rail").hidden = items.length === 0 && !staff;
  if (staff) {
    const own = staffStore.ownAnnouncements(storage, me.name);
    const ownList = $("#rail-own-list");
    clear(ownList);
    $("#rail-own").hidden = own.length === 0;
    for (const a of own.slice(0, 3)) {
      const li = tpl("t-rail-item");
      $("[data-kind]", li).textContent = "";
      $("[data-pinned]", li).hidden = true;
      $("[data-time]", li).textContent = "";
      fillText($("[data-text]", li), a.text);
      $("[data-meta]", li).textContent = `${a.reactions} ${a.reactions === 1 ? "reaction" : "reactions"} · ${a.comments} ${a.comments === 1 ? "comment" : "comments"}`;
      $("button", li).addEventListener("click", () => goToPost(a.id));
      ownList.appendChild(li);
    }
  }
  for (const p of items) {
    const li = tpl("t-rail-item");
    $("[data-kind]", li).textContent = staff ? p.kind : "Announcement";
    $("[data-pinned]", li).hidden = !p.pinned;
    $("[data-time]", li).textContent = when(p.t);
    fillText($("[data-text]", li), p.text);
    $("[data-meta]", li).textContent = `${p.name} · ${liveCount(p)} ${liveCount(p) === 1 ? "comment" : "comments"}`;
    $("button", li).addEventListener("click", () => goToPost(p.id));
    list.appendChild(li);
  }
}

for (const b of document.querySelectorAll("[data-view]"))
  b.addEventListener("click", () => {
    clearFocus();
    ui.tab = b.dataset.view;
    render();
  });

function renderTabs(all) {
  const bar = $("#tabs");
  bar.hidden = !all.length;
  for (const b of document.querySelectorAll("[data-view]")) {
    if (b.dataset.view === ui.tab) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
    b.disabled = !all.length;
  }
  clear(bar);
  for (const [id, label] of TABS) {
    const b = tpl("t-tab");
    b.textContent = label;
    b.setAttribute("aria-selected", String(ui.tab === id));
    b.setAttribute("aria-controls", "feed");
    b.tabIndex = ui.tab === id ? 0 : -1;
    b.addEventListener("click", () => {
      ui.tab = id;
      render();
      $('#tabs [aria-selected="true"]')?.focus({ preventScroll: true });
    });
    b.addEventListener("keydown", (e) => {
      const i = TABS.findIndex((t) => t[0] === id);
      const n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : -1;
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
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.className = primary
    ? "group/button inline-flex h-8 shrink-0 touch-manipulation items-center justify-center rounded-md border border-transparent bg-primary bg-clip-padding px-step-md control-text font-medium whitespace-nowrap text-primary-foreground transition outline-none select-none hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px pointer-coarse:h-11"
    : "group/button inline-flex h-8 shrink-0 touch-manipulation items-center justify-center rounded-md border border-transparent bg-background bg-clip-padding px-step-md control-text font-medium whitespace-nowrap text-foreground ring-1 ring-foreground/10 transition outline-none select-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px pointer-coarse:h-11";
  b.addEventListener("click", onClick);
  return b;
}

const SAVED = `eso-social-saved:${me.id}`;
const savedSet = () => {
  try {
    return new Set(JSON.parse(storage.getItem(SAVED)) || []);
  } catch {
    return new Set();
  }
};
const kindIcon = { Announcement: "i-megaphone", "Community post": "i-users", Promotion: "i-megaphone", "Staff discussion": "i-message" };

function closeMenus() {
  for (const p of document.querySelectorAll("[data-menu-panel]:not([hidden])")) {
    p.hidden = true;
    p.previousElementSibling?.setAttribute("aria-expanded", "false");
  }
}
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest("[data-menu-panel], [data-menu]")) closeMenus();
});
// Every menu has the keys of a menu, and Esc gives the focus back to the button that opened it. (The avatar's and a comment's menu handle their own keys first and
// stop the event, so this is for the others, such as a post's.)
document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented) return;
  const panel = e.target.closest ? e.target.closest("[data-menu-panel]") : null;
  if (panel && ["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
    const list = [...panel.querySelectorAll('[role="menuitem"]:not([hidden])')];
    const at = list.indexOf(document.activeElement);
    if (!list.length) return;
    e.preventDefault();
    list[{ ArrowDown: (at + 1) % list.length, ArrowUp: (at + list.length - 1) % list.length, Home: 0, End: list.length - 1 }[e.key]].focus({ preventScroll: true });
  } else if (e.key === "Escape") {
    const opener = panel && !panel.hidden ? panel.previousElementSibling : null;
    closeMenus();
    if (opener) opener.focus({ preventScroll: true });
  }
});

function copyLink(id) {
  try {
    navigator.clipboard?.writeText(`${location.origin}${location.pathname}#/post/${id}`);
  } catch {
    /* the toast still tells what was meant */
  }
  toast("Link copied");
}

// The guidelines gate is required, so it cannot be dismissed: Esc is cancelled, a click outside does nothing, and if a browser closes it
// anyway while the guidelines are still unconfirmed it opens again at once.
$("#gate").addEventListener("cancel", (e) => e.preventDefault());
$("#gate").addEventListener("close", () => {
  if (isGated()) $("#gate").showModal();
});

/* ------------------------------------------------------------------ reactions */

// Reactions, as a social feed has them. The Like button: a tap gives a Like, or takes back whatever reaction you gave; press and hold it (touch), rest the
// mouse on it, or press Arrow Up, and the five reactions appear to choose from. Beside it the count, with the reactions most given, opens who reacted.
const HOLD_MS = 450;
const HOVER_MS = 450;
const canHover = matchMedia("(hover: hover) and (pointer: fine)");

function closePickers(except) {
  for (const panel of document.querySelectorAll("[data-react-panel]:not([hidden])")) {
    if (panel === except) continue;
    panel.hidden = true;
    panel.closest("[data-react-wrap]")?.querySelector("[data-like]")?.setAttribute("aria-expanded", "false");
  }
}
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest("[data-react-wrap]")) closePickers();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePickers();
});

// `p` is a post or a comment (both carry myReaction, reactions, reactionTotal and reactors); `onChange` draws what changed and puts focus back on the Like button.
function wireReactions(li, p, onChange) {
  const like = $("[data-like]", li);
  const wrap = $("[data-react-wrap]", li);
  const picker = $("[data-react-panel]", li);
  if (!picker.children.length) picker.append(...tpl("t-react-picker").children);
  const who = $("[data-rx-who]", li);
  const mine = p.myReaction;
  const other = !!mine && mine !== "like";
  const total = p.reactionTotal;
  // The Like button: the thumb, or the emoji you chose; its name says what a tap does.
  like.setAttribute("aria-pressed", String(!!mine));
  const noun = total === 1 ? "reaction" : "reactions";
  like.setAttribute("aria-label", `${mine ? `Remove your ${labelOf(mine).toLowerCase()}` : "Like"}${total ? `, ${total} ${noun}` : ""}`);
  like.setAttribute("aria-description", "Press and hold, or press Arrow Up, to choose another reaction");
  // The thumb is an SVG, which has no `hidden` property: the attribute is set and taken off by hand. Another reaction takes the thumb's place.
  $("[data-like-icon]", li).toggleAttribute("hidden", other);
  const emoji = $("[data-like-emoji]", li);
  emoji.hidden = !other;
  if (other) emoji.textContent = iconOf(mine);
  $("[data-like-text]", li).textContent = total ? String(total) : "";
  // At the end of the row: the reactions most given, as small round badges; it opens who gave them.
  who.hidden = total === 0;
  const sum = $("[data-rx-sum]", li);
  clear(sum);
  for (const k of topKinds(p.reactions, 3)) {
    const b = tpl("t-rx-badge");
    b.textContent = iconOf(k);
    sum.appendChild(b);
  }
  who.setAttribute("aria-label", `${total} ${noun}: ${describeReactions(p.reactions)}. See who reacted`);
  who.title = describeReactions(p.reactions);
  who.addEventListener("click", () => openReactors(p, who));
  // The five.
  for (const b of picker.querySelectorAll("[data-react]")) {
    b.setAttribute("aria-checked", String(b.dataset.react === mine));
    b.addEventListener("click", () => {
      closePickers();
      tell(doReact(p.id, b.dataset.react));
      onChange();
    });
  }
  let hold = 0;
  let hover = 0;
  let away = 0;
  let held = false;
  const show = (focusIt) => {
    closePickers(picker);
    picker.hidden = false;
    like.setAttribute("aria-expanded", "true");
    if (focusIt) (picker.querySelector('[aria-checked="true"]') || picker.querySelector("[data-react]")).focus({ preventScroll: true });
  };
  const hide = () => {
    picker.hidden = true;
    like.setAttribute("aria-expanded", "false");
  };
  // Press and hold (touch, pen, or a mouse button held down): the pointer stays down for HOLD_MS.
  like.addEventListener("pointerdown", (e) => {
    held = false;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    clearTimeout(hold);
    hold = setTimeout(() => {
      held = true;
      show(false);
    }, HOLD_MS);
  });
  for (const ev of ["pointerup", "pointerleave", "pointercancel"]) like.addEventListener(ev, () => clearTimeout(hold));
  like.addEventListener("contextmenu", (e) => e.preventDefault()); // a long press must not open the system menu
  like.addEventListener("click", () => {
    if (held) {
      held = false;
      return;
    } // the press that opened the five is not a tap
    closePickers();
    tell(doReact(p.id, mine || "like"));
    onChange();
  });
  // Keyboard: Enter and Space tap; Arrow Up opens the five, the arrows move along them, Enter chooses, Esc or Arrow Down closes.
  like.addEventListener("keydown", (e) => {
    held = false;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      show(true);
    }
  });
  picker.addEventListener("keydown", (e) => {
    const items = [...picker.querySelectorAll("[data-react]")];
    const at = items.indexOf(document.activeElement);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      items[(at + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length].focus();
    } else if (e.key === "Escape" || e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      hide();
      like.focus();
    }
  });
  // Mouse: resting on the button shows the five, leaving hides them after a moment, so the way from the button to the five does not close them.
  wrap.addEventListener("pointerenter", (e) => {
    if (e.pointerType !== "mouse" || !canHover.matches) return;
    clearTimeout(away);
    if (picker.hidden) {
      clearTimeout(hover);
      hover = setTimeout(() => show(false), HOVER_MS);
    }
  });
  wrap.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(hover);
    clearTimeout(away);
    away = setTimeout(() => {
      if (!picker.matches(":focus-within")) hide();
    }, 300);
  });
}

// Can the person using the app follow this key: somebody, and not themselves.
const followable = (key) => !!key && canon(key) !== canon(viewerKey);

// A Follow button, Facebook-style but with Follow and not Add friend: it says what is true now, and it is not there for yourself.
function followButton(fb, key, name, after) {
  if (!key || canon(key) === canon(viewerKey)) {
    fb.hidden = true;
    return;
  }
  const on = followingKeys().has(canon(key));
  fb.hidden = false;
  fb.textContent = on ? "Following" : "Follow";
  fb.setAttribute("aria-pressed", String(on));
  fb.setAttribute("aria-label", `${on ? "Unfollow" : "Follow"} ${name}`);
  fb.addEventListener("click", () => {
    const res = doFollow(key);
    if (res.ok) toast(res.following ? `Following ${name}` : `Unfollowed ${name}`);
    after();
  });
}

// Who reacted: a list in a window, with a tab for everyone and one for each reaction in use. People the feed does not name are counted at the end.
function openReactors(p, opener) {
  const dlg = $("#rx");
  const tabs = $("#rx-tabs");
  const list = $("#rx-list");
  const more = $("#rx-more");
  const inUse = KINDS.filter((k) => p.reactions[k] > 0);
  let current = "all";
  const draw = () => {
    clear(list);
    const people = current === "all" ? p.reactors : p.reactors.filter((r) => r.kind === current);
    for (const r of people) {
      const row = tpl("t-rx-row");
      paintAvatar($("[data-avatar]", row), r.you ? me.name : r.name, !!r.you);
      $("[data-name]", row).textContent = r.you ? `${me.name} (You)` : r.name;
      $("[data-role]", row).textContent = r.role;
      $("[data-emoji]", row).textContent = iconOf(r.kind);
      $("[data-kind]", row).textContent = labelOf(r.kind);
      // Follow, not Add friend: shown for everyone but yourself, and it says what is true now.
      followButton($("[data-follow]", row), r.you ? null : r.key, r.name, () => {
        draw();
        for (const b of list.querySelectorAll("[data-follow]"))
          if (b.getAttribute("aria-label").endsWith(` ${r.name}`)) {
            b.focus({ preventScroll: true });
            break;
          }
        render();
      });
      list.appendChild(row);
    }
    more.hidden = true; // every reaction is a named person: the list is the count
    for (const t of tabs.children) {
      const on = t.dataset.k === current;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    }
  };
  clear(tabs);
  for (const k of ["all", ...inUse]) {
    const t = tpl("t-rx-tab");
    t.dataset.k = k;
    $("[data-emoji]", t).textContent = k === "all" ? "" : iconOf(k);
    $("[data-label]", t).textContent = k === "all" ? "All" : labelOf(k);
    $("[data-count]", t).textContent = String(k === "all" ? p.reactionTotal : p.reactions[k]);
    t.addEventListener("click", () => {
      current = k;
      draw();
    });
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const all = [...tabs.children];
      const next = all[(all.indexOf(t) + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length];
      current = next.dataset.k;
      draw();
      next.focus();
    });
    tabs.appendChild(t);
  }
  draw();
  $("#rx-title").textContent = `Reactions · ${p.reactionTotal}`;
  dlg.showModal();
  tabs.querySelector('[aria-selected="true"]').focus();
  dlg.addEventListener(
    "close",
    () => {
      if (opener && opener.isConnected) opener.focus();
      else focusPost(p.id, "[data-rx-who]");
    },
    { once: true },
  );
}
$("#rx-close").addEventListener("click", () => $("#rx").close());
$("#rx").addEventListener("click", (e) => {
  if (e.target === $("#rx")) $("#rx").close();
});

/* ------------------------------------------------------------------ replies window */

// The replies of a post, in a window: opened by the comment button or "View N replies". The post, then its comments as a thread: each has Like (press and
// hold for the other reactions), Reply, Share, the reactions it got (they open who reacted), and "View N replies" for the answers under it. A box at the
// bottom answers the post, or the comment chosen with Reply.
const thread = { id: null, to: null, hit: null, back: "[data-toggle-replies]", expanded: new Set() }; // `hit`: the comment a notification pointed at
const drafts = new Map(); // unsent replies survive closing the window
const threadDlg = $("#thread");
const threadInput = $("#thread-input");
const threadPostNow = () => getTimeline().find((x) => x.id === thread.id);

function syncThreadTo() {
  $("#thread-to").hidden = !thread.to;
  if (thread.to) $("#thread-to-text").textContent = thread.to.name; // the highlighted name in front of what is typed
  // Answering a person is a reply; writing under the post itself is a comment: the box, its label and its button say which.
  const word = thread.to ? "reply" : "comment";
  threadInput.placeholder = `Write a ${word}…`;
  $("#thread-label").textContent = `Write a ${word}`;
  $("#thread-send").textContent = thread.to ? "Reply" : "Comment";
}

function focusComment(id, sel) {
  threadDlg.querySelector(`[data-comment="${id}"] ${sel}`)?.focus({ preventScroll: true });
}

/* ------------------------------------------------------------ moderating comments */

// Can this person write now? Staff always; a resident unless the property turned replies off or their activity is paused (a violation, see moderation.js).
const pausedNow = () => (staff ? null : pauseOf(storage, me.id));
const lockedNow = () => (staff ? null : ((h) => (shutsOut(h) ? h : null))(pausedNow()));
const canWrite = () => (staff || canReply(storage)) && !pausedNow();
const writeOff = () => {
  const v = pausedNow();
  return v ? pauseMessage(v) : "Replies are turned off by the property team.";
};
// What a refused action says, in words: a paused resident is told until when, not just "no".
// A refusal says why. One that has no reason (the save itself failed: storage full or blocked) must not be silent either.
const tell = (r) => {
  if (r && !r.ok) toast(r.reason || "That did not go through. The browser could not save it (storage may be full or blocked). Try again.");
  return r;
};
const longDate = (t) => new Date(t).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

// One question with a Cancel and a destructive answer. Cancel has the focus; Esc is a Cancel. Resolves true only for the answer.
const confirmDlg = $("#confirm");
function askConfirm({ title, body, quote, ok, calm = false }) {
  return new Promise((resolve) => {
    $("#confirm-ok").toggleAttribute("data-calm", calm); // an answer that undoes something (lift a ban, open an account) is not drawn in red
    $("#confirm-title").textContent = title;
    $("#confirm-body").textContent = body;
    $("#confirm-quote-wrap").hidden = !quote;
    $("#confirm-quote").textContent = quote || "";
    $("#confirm-ok").textContent = ok;
    confirmDlg.returnValue = "";
    confirmDlg.addEventListener("close", () => resolve(confirmDlg.returnValue === "ok"), { once: true });
    confirmDlg.showModal();
    $("#confirm-cancel").focus();
  });
}

// The three dots of a comment and what they hold: change or delete your own; hide somebody else's (for yourself); Staff also remove it for everyone, or
// record a violation on a resident's. `redraw(sel)` draws the thread again and puts focus on `sel` of this comment.
function wireCommentMenu(li, r, p, redraw) {
  // Follow or Unfollow the person who wrote it: for anyone but yourself (see followable).
  const followKey = r.mine ? null : r.key;
  const items = { follow: followable(followKey), edit: r.canEdit, delete: r.canDelete, hide: r.canHide, remove: r.canRemove, violate: r.canViolate };
  if (!Object.values(items).some(Boolean)) return;
  $("[data-menu-wrap]", li).hidden = false;
  for (const [k, on] of Object.entries(items)) $(`[data-cm="${k}"]`, li).hidden = !on;
  const btn = $("[data-menu]", li);
  const panel = $("[data-menu-panel]", li);
  const who = r.name === "You" ? me.name : r.name;
  if (items.follow) {
    const fi = $('[data-cm="follow"]', li);
    fi.textContent = `${followingKeys().has(canon(followKey)) ? "Unfollow" : "Follow"} ${who}`;
    fi.addEventListener("click", () => {
      closeMenus();
      const res = tell(doFollow(followKey));
      if (res.ok) toast(res.following ? `Following ${who}` : `Unfollowed ${who}`);
      render();
      redraw("[data-menu]");
    });
  }
  btn.setAttribute("aria-label", r.mine ? "Actions for your comment" : `Actions for ${who}'s comment`);
  btn.addEventListener("click", () => {
    const was = !panel.hidden;
    closeMenus();
    panel.hidden = was;
    btn.setAttribute("aria-expanded", String(!was));
    if (!was) {
      panel.scrollIntoView({ block: "nearest" });
      $('[role="menuitem"]:not([hidden])', panel).focus({ preventScroll: true });
    }
  });
  panel.addEventListener("keydown", (e) => {
    const list = [...panel.querySelectorAll('[role="menuitem"]:not([hidden])')];
    const at = list.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      list[(at + (e.key === "ArrowDown" ? 1 : list.length - 1)) % list.length].focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeMenus();
      btn.focus();
    } // Esc closes the menu, not the window behind it
  });
  const on = (k, fn) =>
    $(`[data-cm="${k}"]`, li).addEventListener("click", () => {
      closeMenus();
      fn();
    });

  // Edit: the bubble turns into a box with the words in it. Enter saves, Esc leaves it as it was.
  const form = $("[data-edit]", li);
  const input = $("[data-edit-input]", li);
  const stop = () => {
    form.hidden = true;
    $("[data-body]", li).hidden = false;
    $("[data-edit-error]", li).textContent = "";
    btn.focus({ preventScroll: true });
  };
  on("edit", () => {
    $("[data-body]", li).hidden = true;
    form.hidden = false;
    input.value = r.text;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });
  $("[data-edit-cancel]", li).addEventListener("click", stop);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      stop();
    } else if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const res = staff ? staffStore.editComment(storage, r.id, input.value) : residentEdit(storage, me.id, r.id, input.value);
    if (!res.ok) {
      $("[data-edit-error]", li).textContent = res.reason;
      return;
    }
    toast("Comment updated");
    redraw("[data-menu]");
  });

  on("delete", async () => {
    if (!(await askConfirm({ title: "Delete this comment?", body: "It is deleted for everyone. Replies under it stay.", quote: r.text, ok: "Delete comment" }))) {
      btn.focus({ preventScroll: true });
      return;
    }
    if (!tell(staff ? staffStore.deleteComment(storage, r.id) : residentDelete(storage, me.id, r.id)).ok) return;
    toast("Comment deleted");
    redraw("[data-menu]");
  });
  on("hide", () => {
    const res = staff ? staffStore.hideComment(storage, r.id) : residentHide(storage, me.id, r.id);
    if (!tell(res).ok) return;
    toast("Comment hidden. Only you stop seeing it.");
    redraw("[data-ph-action]");
  });
  on("remove", async () => {
    if (
      !(await askConfirm({
        title: "Remove this comment?",
        body: "It disappears for everyone. Replies under it stay. The person who wrote it is told it was removed.",
        quote: r.text,
        ok: "Remove comment",
      }))
    ) {
      btn.focus({ preventScroll: true });
      return;
    }
    if (!tell(staffStore.removeComment(storage, r.id, Date.now(), me.title)).ok) return;
    toast("Comment removed");
    redraw("[data-menu]");
  });
  on("violate", () => openViolation(r, () => redraw("[data-menu]"), btn));
}

// Record a violation (Staff). The reasons come from the guidelines, the outcome is a warning or a pause until a date and time, and the resident is told.
const vioDlg = $("#vio");
const vioForm = $("#vio-form");
const vioState = { r: null, done: null, opener: null, direct: null, reason: "", kind: "warning" };
const pad = (n) => String(n).padStart(2, "0");
const localParts = (t) => {
  const d = new Date(t);
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
};
const vioUntil = () => {
  const d = $("#vio-date").value;
  const t = $("#vio-time").value;
  const ms = d && t ? new Date(`${d}T${t}`).getTime() : NaN;
  return Number.isFinite(ms) ? ms : NaN;
};
const setUntil = (ms) => {
  const { date, time } = localParts(ms);
  $("#vio-date").value = date;
  $("#vio-time").value = time;
  syncVio();
};

function syncVio() {
  const g = guidelines(storage);
  const rule = ruleFor(vioState.reason, g.blocks);
  const box = $("#vio-rule");
  box.textContent = vioState.reason === "other" ? "Say what the reason is in the note: it is shown to the resident." : rule ? `Guideline “${rule.title}”${rule.text ? `: ${rule.text}` : ""}` : "";
  const need = vioState.reason === "other" || staffStore.rules(storage).requireNote;
  $("#vio-note-need").textContent = need ? "(required)" : "(optional)";
  $("#vio-pause").hidden = !isHold(vioState);
  const ms = vioUntil();
  const when = Number.isFinite(ms) ? new Date(ms).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }) : "";
  $("#vio-until").textContent = !when ? "" : vioState.kind === "light" ? `Can read, not write, until ${when}. Not a strike.` : isHold(vioState) ? `Shut out until ${when}. One strike.` : "";
  $("#vio-count").textContent = `${$("#vio-note").value.length} / ${MAX_NOTE}`;
}

// Choosing a reason starts the window on what the rules say for it (Violations → Rules): a warning, or a pause of so many hours. Staff can still change both.
function applyDefault(reasonId) {
  const d = staffStore.rules(storage).defaults[reasonId];
  if (!d) return;
  if (!vioState.direct) {
    vioState.kind = d.kind;
    for (const i of document.querySelectorAll("#vio-kinds input")) i.checked = i.value === d.kind;
  }
  if (isHold(vioState) && d.hours) {
    const t = new Date(Date.now() + d.hours * 3600000);
    t.setMinutes(Math.ceil(t.getMinutes() / 15) * 15, 0, 0);
    setUntil(t.getTime());
  }
}

// `r` is the comment (a violation on a comment) or, with `direct` ({ who, name, kind: 'pause' | 'warning' }), nothing: a ban or warning given straight to a resident
// from the Violations page, with no comment attached.
function openViolation(r, done, opener, direct = null) {
  const g = guidelines(storage);
  Object.assign(vioState, { r, done, opener, direct, reason: "", kind: direct ? direct.kind : "warning" });
  $("#vio-rules").textContent = "The resident is told the reason, your note and the end date.";
  $("#vio-who").textContent = direct ? direct.name : `${r.name} wrote`;
  $("#vio-quote").textContent = direct ? "" : r.text;
  // A ban or a warning given straight to a resident has no comment to show and its kind is already chosen (the title says Ban or Warn): the window is shorter.
  $("#vio-quote-wrap").hidden = !!direct;
  $("#vio-kinds-set").hidden = !!direct && direct.kind !== "pause"; // a Ban asks which kind (light or heavy); a Warn has nothing to choose
  $("#vio-title").textContent = direct ? (direct.kind === "pause" ? `Ban ${direct.name}` : `Warn ${direct.name}`) : "Record a violation";
  $("#vio-save").textContent = direct ? (direct.kind === "pause" ? "Ban resident" : "Send warning") : "Record violation";
  $("#vio-remove").closest("label").hidden = !!direct; // there is no comment to remove
  const reasons = $("#vio-reasons");
  clear(reasons);
  for (const x of REASONS) {
    const row = tpl("t-vio-choice");
    const input = $("input", row);
    input.name = "vio-reason";
    input.value = x.id;
    $("[data-label]", row).textContent = x.label;
    $("[data-hint]", row).textContent = x.rule ? `Guideline: ${x.rule}` : "Describe it in the note";
    input.addEventListener("change", () => {
      vioState.reason = x.id;
      applyDefault(x.id);
      syncVio();
    });
    reasons.appendChild(row);
  }
  const kinds = $("#vio-kinds");
  clear(kinds);
  for (const k of VIO_KINDS) {
    if (direct && k.id === "warning") continue; // a ban is light or heavy; a warning has its own button
    const row = tpl("t-vio-choice");
    const input = $("input", row);
    input.name = "vio-kind";
    input.value = k.id;
    input.checked = k.id === vioState.kind;
    $("[data-label]", row).textContent = k.label;
    $("[data-hint]", row).textContent = k.hint;
    input.addEventListener("change", () => {
      vioState.kind = k.id;
      syncVio();
    });
    kinds.appendChild(row);
  }
  $("#vio-note").value = "";
  $("#vio-remove").checked = true;
  $("#vio-error").textContent = "";
  const soon = new Date(Date.now() + 86400000);
  soon.setMinutes(Math.ceil(soon.getMinutes() / 15) * 15, 0, 0); // tomorrow, on the next quarter hour
  $("#vio-date").min = localParts(Date.now()).date;
  setUntil(soon.getTime());
  // A comment that looks like gibberish (“Aaaaaaaaaaaa”) starts on that reason, with the first action the rules give it. Staff can change it.
  if (!direct && looksLikeSpam(r.text)) {
    const pick = reasons.querySelector('input[value="gibberish"]');
    if (pick) {
      pick.checked = true;
      vioState.reason = "gibberish";
      applyDefault("gibberish");
      syncVio();
    }
  }
  vioDlg.showModal();
  $("#vio-title").focus({ preventScroll: true });
}
for (const b of document.querySelectorAll("#vio-presets [data-days]"))
  b.addEventListener("click", () => {
    const d = new Date(Date.now() + Number(b.dataset.days) * 86400000);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    setUntil(d.getTime());
  });
for (const id of ["#vio-date", "#vio-time", "#vio-note"]) $(id).addEventListener("input", syncVio);
$("#vio-close").addEventListener("click", () => vioDlg.close());
$("#vio-cancel").addEventListener("click", () => vioDlg.close());
vioDlg.addEventListener("close", () => {
  if (vioState.opener && vioState.opener.isConnected) vioState.opener.focus({ preventScroll: true });
});
vioForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const r = vioState.r;
  const input = { reason: vioState.reason, note: $("#vio-note").value, until: isHold(vioState) ? vioUntil() : undefined, byTitle: me.title };
  const res = vioState.direct
    ? (isHold(vioState) ? staffStore.banResident : staffStore.warnResident)(storage, { ...input, light: vioState.kind === "light", who: vioState.direct.who }, Date.now(), me.name)
    : staffStore.addViolation(storage, { ...input, comment: r.id, kind: vioState.kind, alsoRemove: $("#vio-remove").checked });
  if (!res.ok) {
    $("#vio-error").textContent = res.reason;
    return;
  }
  const done = vioState.done;
  vioState.opener = null;
  vioDlg.close();
  toast(
    res.violation.kind === "light"
      ? `Light pause recorded. ${res.violation.name} can still read, but not write, until ${longDate(res.violation.until)}.`
      : res.violation.kind === "pause"
        ? `${vioState.direct ? "Banned" : "Violation recorded"}. ${res.violation.name} is shut out of Social until ${longDate(res.violation.until)}. This is a strike.`
        : `${vioState.direct ? "Warning sent" : "Violation recorded"}. The resident is told.`,
  );
  render();
  done?.();
});

// A post opened on its own lists its comments in the page itself; which comments are open there is kept apart from the window's.
const inlineExpanded = new Set();

// How many comments a post really has: the ones still there, not the placeholders of deleted and removed ones.
const liveCount = (p) => p.replies.filter((r) => r.state === "ok").length;

// The comments in reading order, leaving out the answers under a comment that is closed.
function visibleComments(p, expanded) {
  const out = [];
  let skip = null;
  for (const r of p.replies) {
    if (skip !== null) {
      if (r.depth > skip) continue;
      skip = null;
    }
    out.push(r);
    if (r.replyCount > 0 && !expanded.has(r.id)) skip = r.depth;
  }
  return out;
}

// One comment. `inline`: it sits in the post's own page and not in the window, so what it does (react, open its answers) draws the page, and Reply opens the
// window aimed at it.
function commentItem(r, p, inline = false) {
  const expanded = inline ? inlineExpanded : thread.expanded;
  const li = tpl("t-comment");
  li.dataset.comment = r.id;
  if (r.id === thread.hit) li.dataset.hit = "";
  if (r.depth) li.style.marginLeft = `${Math.min(r.depth, 2) * 1.5}rem`; // an answer sits under the comment it answers
  paintAvatar($("[data-avatar]", li), r.name === "You" ? me.name : r.name, r.name === "You" || !!r.mine);
  $("[data-name]", li).textContent = r.name;
  const t = $("[data-time]", li);
  t.textContent = when(r.t);
  if (r.t) t.dateTime = iso(r.t);
  fillText($("[data-text]", li), r.text);
  $("[data-edited]", li).hidden = !r.edited;
  // An answer to a comment starts with the name of the person it answers.
  const parent = r.parentId ? p.replies.find((x) => x.id === r.parentId) : null;
  if (parent) {
    const m = $("[data-mention]", li);
    m.hidden = false;
    m.textContent = parent.name === "You" ? me.name : parent.name;
  } // a tag names the person, so my own comment is tagged with my name
  const who = r.name === "You" ? me.name : r.name; // a name in a tag or a label is the person's name, also when the comment is mine
  const ok = r.state === "ok";
  const hiddenByMe = ok && r.hidden;
  // Where the thread is drawn again after something changed here, and where focus goes back to.
  const redraw = (sel) => {
    if (inline) {
      render();
      const at = document.querySelector(`#feed li[data-post="${p.id}"]`);
      (at?.querySelector(`[data-comment="${r.id}"] ${sel}`) || at?.querySelector("[data-like]"))?.focus({ preventScroll: true }); // the comment may be gone now
    } else {
      drawThread();
      render();
      (threadDlg.querySelector(`[data-comment="${r.id}"] ${sel}`) || threadInput).focus({ preventScroll: true });
    }
  };

  // A comment that is gone (deleted, removed), or that I chose not to see, is a short line in place of the bubble.
  if (!ok || hiddenByMe) {
    $("[data-bubble]", li).hidden = true;
    $("[data-actions]", li).hidden = true;
    $("[data-placeholder]", li).hidden = false;
    $("[data-ph-text]", li).textContent = hiddenByMe
      ? "You hid this comment."
      : r.state === "deleted"
        ? "This comment was deleted."
        : r.mine
          ? `Your comment was removed by the property team.${r.removedReason ? ` Reason: ${r.removedReason}.` : ""}`
          : "This comment was removed.";
    if (hiddenByMe) {
      const show = $("[data-ph-action]", li);
      show.hidden = false;
      show.setAttribute("aria-label", `Show ${who}'s comment`);
      show.addEventListener("click", () => {
        staff ? staffStore.hideComment(storage, r.id) : residentHide(storage, me.id, r.id);
        redraw("[data-ph-action]");
      });
    }
  } else {
    wireReactions(
      li,
      r,
      inline
        ? () => {
            render();
            focusPost(p.id, `[data-comment="${r.id}"] [data-like]`);
          }
        : () => {
            drawThread();
            render();
            focusComment(r.id, "[data-like]");
          },
    );
    wireCommentMenu(li, r, p, redraw);
    // Staff: gibberish is flagged on the comment itself, with the two kinds of ban one tap away: Light pause (can still read, no strike) or Heavy ban (a strike).
    // The length is the one the Rules give "Gibberish" (24 h unless Staff set another). Review opens the full form.
    if (staff && r.canViolate && looksLikeSpam(r.text)) {
      const d = staffStore.rules(storage).defaults.gibberish;
      const hours = d.hours || 24;
      $("[data-flag]", li).hidden = false;
      for (const [sel, kind, label] of [
        ["[data-flag-light]", "light", "Light pause"],
        ["[data-flag-heavy]", "pause", "Heavy ban"],
      ]) {
        const b = $(sel, li);
        b.textContent = `${label} ${hours} h`;
        b.addEventListener("click", async () => {
          // A heavy ban is a strike that stays on the record even if it is lifted, so it asks once. A light pause is one tap.
          if (
            kind === "pause" &&
            !(await askConfirm({
              title: `Heavy ban for ${r.name}?`,
              body: `One strike, and they cannot use Social for ${hours} hours. Light pause lets them read and is not a strike.`,
              quote: r.text,
              ok: "Heavy ban",
              calm: true,
            }))
          ) {
            b.focus({ preventScroll: true });
            return;
          }
          const res = staffStore.addViolation(storage, { comment: r.id, reason: "gibberish", note: "", kind, until: Date.now() + hours * 3600000, alsoRemove: false, byTitle: me.title });
          if (!tell(res).ok) return;
          toast(kind === "light" ? `${r.name} is paused until ${longDate(res.violation.until)}. They can still read.` : `${r.name} is banned until ${longDate(res.violation.until)}. One strike.`);
          render();
          if (!inline) drawThread();
        });
      }
      $("[data-flag-review]", li).addEventListener("click", (e) => openViolation(r, () => redraw("[data-menu]"), e.currentTarget));
    }
  }
  const reply = $("[data-c-reply]", li);
  reply.hidden = !canWrite();
  reply.setAttribute("aria-label", `Reply to ${who}`);
  reply.addEventListener("click", () => {
    if (inline) openThread(p.id, `[data-comment="${r.id}"] [data-c-reply]`, true);
    thread.to = { id: r.id, name: who };
    syncThreadTo();
    threadInput.focus();
  });
  const share = $("[data-c-share]", li);
  share.setAttribute("aria-label", `Share ${r.name}'s comment`);
  share.addEventListener("click", () => copyLink(p.id)); // a comment's link is its post's link
  // Pointing at a comment, or pressing it, brings up its three dots (on a touch screen they are always there).
  markWriteOff(li);
  $("[data-bubble]", li).addEventListener("click", (e) => {
    if (e.target.closest("button, a, textarea")) return;
    const was = li.dataset.sel !== undefined;
    for (const x of document.querySelectorAll("[data-comment][data-sel]")) delete x.dataset.sel;
    if (!was) li.dataset.sel = "";
  });
  const tg = $("[data-c-toggle]", li);
  if (r.replyCount > 0) {
    const on = expanded.has(r.id);
    tg.hidden = false;
    tg.setAttribute("aria-expanded", String(on));
    $("[data-c-toggle-text]", tg).textContent = on ? "Hide replies" : `View ${r.replyCount} ${r.replyCount === 1 ? "reply" : "replies"}`;
    tg.addEventListener("click", () => {
      if (on) expanded.delete(r.id);
      else expanded.add(r.id);
      if (inline) {
        render();
        focusPost(p.id, `[data-comment="${r.id}"] [data-c-toggle]`);
      } else {
        drawThread();
        focusComment(r.id, "[data-c-toggle]");
      }
    });
  }
  return li;
}

function drawThread() {
  const p = threadPostNow();
  if (!p) {
    if (threadDlg.open) {
      threadDlg.close();
      toast("This post is no longer available.");
    }
    return;
  }
  const n = liveCount(p);
  $("#thread-title").textContent = `${n} ${n === 1 ? "reply" : "replies"}`;
  $("#thread-post-by").textContent = p.name;
  fillText($("#thread-post-text"), p.text);
  const pics = $("#thread-images");
  clear(pics);
  pics.classList.toggle("grid-cols-2", p.images.length > 1); // one picture fills the width, two sit side by side
  p.images.forEach((im, i) => {
    const d = tpl("t-image"); // the same picture as in the feed and on the post's own page
    d.style.background = im.bg;
    d.setAttribute("aria-label", im.alt);
    if (p.images.length === 3 && i === 0) d.style.gridColumn = "1 / -1"; // three: the first across, the other two beside each other
    pics.appendChild(d);
  });
  const list = $("#thread-list");
  clear(list);
  // A post with very many comments draws 40 at a time ("Show more"); the one a link points at is always drawn.
  const everyComment = visibleComments(p, thread.expanded);
  const CAP = 40;
  if (thread.shownFor !== p.id) {
    thread.shownFor = p.id;
    thread.shown = CAP;
  }
  const hitAt = thread.hit ? everyComment.findIndex((r) => r.id === thread.hit) : -1;
  const upTo = Math.max(thread.shown || CAP, hitAt + 1);
  for (const r of everyComment.slice(0, upTo)) list.appendChild(commentItem(r, p));
  if (everyComment.length > upTo) {
    const more = document.createElement("li");
    more.className = "flex justify-center py-step-sm";
    more.appendChild(
      button(`Show ${Math.min(CAP, everyComment.length - upTo)} more comments`, () => {
        thread.shown = upTo + CAP;
        drawThread();
      }),
    );
    list.appendChild(more);
  }
  $("#thread-empty").hidden = n > 0;
  const allowed = canWrite();
  $("#thread-form").hidden = !allowed;
  $("#thread-off").hidden = allowed;
  if (!allowed) $("#thread-off").textContent = writeOff();
  syncThreadTo();
}

// `write`: opened by the comment button, so the box is ready to type in (opened by "View N replies", the window starts at its title, to read).
function openThread(id, back, write = false) {
  thread.id = id;
  thread.back = back;
  thread.to = null;
  thread.hit = null;
  thread.expanded = new Set();
  threadInput.maxLength = MAX_REPLY;
  threadInput.value = drafts.get(id) || "";
  $("#thread-error").textContent = "";
  closeMenus();
  drawThread();
  threadDlg.showModal();
  threadInput.dispatchEvent(new Event("input")); // size the box to the draft
  if (write && !$("#thread-form").hidden) threadInput.focus({ preventScroll: true });
  else $("#thread-title").focus({ preventScroll: true });
}

$("#thread-close").addEventListener("click", () => threadDlg.close());
threadDlg.addEventListener("click", (e) => {
  if (e.target === threadDlg) threadDlg.close();
});
threadDlg.addEventListener("close", () => {
  const id = thread.id;
  thread.id = null;
  if (id) focusPost(id, thread.back);
});
$("#thread-to-clear").addEventListener("click", () => {
  thread.to = null;
  syncThreadTo();
  threadInput.focus();
});
threadInput.addEventListener("input", () => {
  if (thread.id) drafts.set(thread.id, threadInput.value);
  $("#thread-error").textContent = "";
  threadInput.style.height = "auto";
  threadInput.style.height = `${Math.min(threadInput.scrollHeight, 128)}px`;
});
// Enter sends, Shift+Enter starts a new line.
threadInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    $("#thread-form").requestSubmit();
  }
  // Backspace on an empty box takes the name off, like deleting it: the reply then goes to the post, not to that comment.
  else if (e.key === "Backspace" && !threadInput.value && thread.to) {
    e.preventDefault();
    thread.to = null;
    syncThreadTo();
  }
});
$("#thread-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const p = threadPostNow();
  if (!p) return;
  const r = doReply(p.id, threadInput.value, thread.to?.id);
  if (!r.ok && thread.to && /no longer available/.test(r.reason)) {
    thread.to = null;
    syncThreadTo();
  } // the comment was removed: the next try goes to the post
  if (!r.ok) {
    $("#thread-error").textContent = r.reason;
    return;
  }
  // Show the answer where it sits: open the comment it answers, and the ones above that.
  const parents = new Map(p.replies.map((x) => [x.id, x.parentId]));
  for (let c = thread.to?.id; c; c = parents.get(c)) thread.expanded.add(c);
  drafts.delete(p.id);
  const wasReply = !!thread.to;
  thread.to = null;
  thread.hit = null;
  threadInput.value = "";
  threadInput.dispatchEvent(new Event("input"));
  toast(wasReply ? "Reply posted" : "Comment posted");
  drawThread();
  render();
  const mine = r.reply && threadDlg.querySelector(`[data-comment="${r.reply.id}"]`);
  mine?.scrollIntoView({ block: "nearest" });
  threadInput.focus({ preventScroll: true });
});

function card(p) {
  const li = tpl("t-post");
  li.dataset.post = p.id;
  const av = $("[data-avatar]", li);
  paintAvatar(av, p.name, staff && p.by === "me"); // a post of the property team written by this Staff person carries their picture
  av.dataset.role = p.role.toLowerCase();
  $("[data-name]", li).textContent = p.name;
  const chip = $("[data-role-chip]", li);
  if (staff) {
    chip.textContent = p.role;
    chip.hidden = false;
  } else {
    chip.textContent = p.role === "Staff" ? "Property team" : p.role;
    chip.hidden = p.role !== "Staff" || p.name === "Property team"; // no "Property team  Property team"
  }
  const time = $("[data-time]", li);
  time.textContent = when(p.t);
  time.title = p.t ? new Date(p.t).toLocaleString("en-US") : "";
  if (p.t) time.dateTime = iso(p.t);
  $("[data-org]", li).textContent = staff && p.aud === "staff" ? `${me.org} · Staff only` : me.org;
  const label = $("[data-label]", li);
  if (staff) {
    label.hidden = false;
    $("[data-label-icon]", label).setAttribute("href", `#${kindIcon[p.kind] || "i-message"}`);
    $("[data-label-text]", label).textContent = p.kind === "Staff discussion" ? "Staff discussion" : `${p.kind} · Community & Announcements`;
  } else {
    label.hidden = !p.announcement && !p.pinned;
    $("[data-label-text]", label).textContent = p.announcement ? "Announcement · Community & Announcements" : "Discussion";
  }
  $("[data-pinned]", label).hidden = !p.pinned;
  // the menu: copy the link, mute the thread (somebody else's, Staff only)
  const menu = $("[data-menu]", li);
  const panel2 = $("[data-menu-panel]", li);
  menu.addEventListener("click", () => {
    const was = !panel2.hidden;
    closeMenus();
    panel2.hidden = was;
    menu.setAttribute("aria-expanded", String(!was));
    if (!was) $('[role="menuitem"]', panel2).focus({ preventScroll: true });
  });
  // Follow or Unfollow whoever wrote the post (not for your own): the label says what is true now and names the person.
  const followItem = $('[data-m="follow"]', li);
  const author = followable(p.by) ? p.by : null;
  followItem.hidden = !author;
  if (author) {
    followItem.textContent = `${followingKeys().has(canon(author)) ? "Unfollow" : "Follow"} ${p.name}`;
    followItem.addEventListener("click", () => {
      closeMenus();
      const res = tell(doFollow(author));
      if (res.ok) toast(res.following ? `Following ${p.name}` : `Unfollowed ${p.name}`);
      render();
      focusPost(p.id, "[data-menu]");
    });
  }
  const openItem = $('[data-m="open"]', li);
  openItem.hidden = !!ui.focus; // it is already open
  openItem.addEventListener("click", () => openPost(p.id));
  $('[data-m="copy"]', li).addEventListener("click", () => {
    closeMenus();
    copyLink(p.id);
  });
  const mute = $('[data-m="mute"]', li);
  mute.hidden = !staff || p.mine;
  mute.addEventListener("click", () => {
    closeMenus();
    staffStore.muteThread(storage, p.id);
    toast('Thread muted. Manage it under "hidden by your mute settings".');
    render();
  });
  // Mute the person who wrote it: all their posts are held back (Settings > Muted lists them, and Unmute brings them back).
  const mutePerson = $('[data-m="mute-person"]', li);
  // A neighbor can be muted by a resident (their posts leave only that resident's feed) and by Staff; the property team cannot be muted by a resident.
  mutePerson.hidden = p.mine || !p.by || (!staff && p.role !== "Resident");
  mutePerson.textContent = `Mute ${p.name}`;
  mutePerson.addEventListener("click", () => {
    closeMenus();
    const ok = staff ? staffStore.mutePerson(storage, p.by) : tell(residentMutePerson(storage, me.id, p.by)).ok;
    if (ok) toast(`${p.name} muted. ${staff ? 'Manage it under "hidden by your mute settings".' : "Their posts are hidden for you only."}`);
    render();
  });
  // Report: any post that is not your own. When you already reported it the item says so and does nothing.
  const reportItem = $('[data-m="report"]', li);
  reportItem.hidden = !!p.mine;
  const reported = hasReported(storage, p.id, me.id);
  reportItem.textContent = reported ? "Reported" : "Report post";
  reportItem.setAttribute("aria-disabled", String(reported));
  reportItem.addEventListener("click", () => {
    closeMenus();
    if (!reported) openReport(p);
  });
  // A post of your own (Staff) can be changed or deleted; somebody else's cannot.
  const own = staff && p.mine;
  const editItem = $('[data-m="edit"]', li);
  const delItem = $('[data-m="delete"]', li);
  editItem.hidden = !own;
  delItem.hidden = !own;
  // Pin to the top, or take it down again: the label says which; a fourth pinned post is refused (at most MAX_PINNED), with the reason.
  const pinItem = $('[data-m="pin"]', li);
  pinItem.hidden = !own;
  pinItem.textContent = p.pinned ? "Unpin from top" : "Pin to top";
  pinItem.addEventListener("click", () => {
    closeMenus();
    const r = tell(staffStore.pinPost(storage, p.id, !p.pinned));
    if (!r.ok) {
      $("[data-menu]", li).focus({ preventScroll: true });
      return;
    }
    toast(r.pinned ? "Pinned to the top" : "Unpinned");
    if (view === "feed") render();
    else renderPage();
    focusPost(p.id, "[data-menu]");
  });
  editItem.addEventListener("click", () => {
    closeMenus();
    ownPost.edit?.(p);
  });
  delItem.addEventListener("click", () => {
    closeMenus();
    ownPost.remove?.(p);
  });
  $("[data-edited]", li).hidden = !p.edited;
  $("[data-link]", li).addEventListener("click", () => copyLink(p.id));
  // Share: to your own profile (shown there, and in Activity). The count is the people who shared it.
  const rep = $("[data-repost]", li);
  rep.setAttribute("aria-pressed", String(p.shared));
  rep.setAttribute("aria-label", `${p.shared ? "Remove your share" : "Share"}${p.shares ? `, ${p.shares} ${p.shares === 1 ? "share" : "shares"}` : ""}`);
  rep.title = p.shares
    ? `Shared by ${p.sharers
        .slice(0, 3)
        .map((s) => (s.you ? "you" : s.name))
        .join(", ")}${p.shares > 3 ? ` and ${p.shares - 3} more` : ""}`
    : "Share to your profile";
  $("[data-repost-text]", rep).textContent = p.shares ? String(p.shares) : "";
  rep.addEventListener("click", () => {
    const r = tell(doShare(p.id));
    if (r.ok) toast(r.shared ? "Shared to your profile" : "Share removed");
    render();
    focusPost(p.id, "[data-repost]");
  });
  const save = $("[data-save]", li);
  const saved = savedSet().has(p.id);
  save.setAttribute("aria-pressed", String(saved));
  save.setAttribute("aria-label", saved ? "Remove from saved" : "Save post");
  save.addEventListener("click", () => {
    const s = savedSet();
    if (s.has(p.id)) s.delete(p.id);
    else s.add(p.id);
    try {
      storage.setItem(SAVED, JSON.stringify([...s]));
    } catch {
      /* saved until reload */
    }
    toast(s.has(p.id) ? "Saved" : "Removed from saved");
    render();
    focusPost(p.id, "[data-save]");
  });
  const views = $("[data-views]", li);
  views.hidden = !p.views;
  if (p.views) views.textContent = `${p.views} views`;
  const badges = $("[data-badges]", li);
  if (p.poll) badges.appendChild(badge("Poll", "neutral"));
  fillText($("[data-text]", li), p.text);
  const imgs = $("[data-images]", li);
  imgs.classList.toggle("sm:grid-cols-2", p.images.length > 1); // one picture fills the width, two sit side by side
  p.images.forEach((im, i) => {
    const d = tpl("t-image");
    d.style.background = im.bg;
    d.setAttribute("aria-label", im.alt);
    if (p.images.length === 3 && i === 0) d.style.gridColumn = "1 / -1"; // three: the first across, the other two beside each other
    imgs.appendChild(d);
  });

  wireReactions(li, p, () => {
    render();
    focusPost(p.id, "[data-like]");
  });

  // The comment button and "View N replies" open the replies window (see openThread); both say how many replies there are.
  const n = liveCount(p);
  const word = n === 1 ? "reply" : "replies";
  const toggle = $("[data-toggle-replies]", li);
  toggle.setAttribute("aria-label", n ? `Reply, ${n} ${word}` : "Reply");
  toggle.setAttribute("aria-haspopup", "dialog");
  $("[data-reply-text]", toggle).textContent = n ? String(n) : "";
  toggle.addEventListener("click", () => openThread(p.id, "[data-toggle-replies]", true));
  const rl = $("[data-replies-link]", li);
  const alone = ui.focus === p.id; // a post opened on its own lists its comments below it instead of "View N replies"
  rl.hidden = n === 0 || alone;
  rl.textContent = `View ${n} ${word}`;
  rl.addEventListener("click", () => openThread(p.id, "[data-replies-link]"));
  $("[data-comments-wrap]", li).hidden = !alone;
  if (alone) {
    for (const r of visibleComments(p, inlineExpanded)) $("[data-comments]", li).appendChild(commentItem(r, p, true));
    const w = $("[data-write]", li);
    w.hidden = !canWrite();
    w.addEventListener("click", () => openThread(p.id, "[data-write]", true));
  }
  markWriteOff(li);
  return li;
}

// While a resident is paused (or replies are off) the buttons that write say so: aria-disabled and the reason as the tooltip. A press still answers with the reason.
function markWriteOff(root) {
  if (staff || canWrite()) return;
  const why = writeOff();
  for (const b of root.querySelectorAll("[data-like],[data-share],[data-c-reply],[data-c-share],[data-write]")) {
    b.setAttribute("aria-disabled", "true");
    b.title = why;
  }
}

function focusPost(id, sel) {
  // render() rebuilt the cards; put keyboard focus back where it was.
  const el = document.querySelector(`li[data-post="${id}"] ${sel}`);
  if (el) el.focus({ preventScroll: true });
}

/* --------------------------------------------------------------- guidelines */

const gl = $("#gl");
let gate = false;

function fillGuidelines() {
  const g = guidelines(storage);
  $("#gl-meta").textContent = `Version ${g.ver} · published ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(g.pub))} by ${g.by}`;
  const body = $("#gl-body");
  clear(body);
  for (const [title, text] of g.blocks) {
    const b = tpl("t-block");
    $("[data-title]", b).textContent = title;
    $("[data-text]", b).textContent = text;
    body.appendChild(b);
  }
}

// The policy opens in the dialog (it is long); the page only holds a short card with "Read policy", the tick box and Confirm (buildGate).
// The tick box stays locked until the policy has been scrolled to its end, and Confirm stays locked until the box is ticked.
const progress = { ver: null, read: false, agreed: false };

const atEnd = (el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 4;

function syncGate() {
  const card = $("#gate-slot [data-gate]");
  if (card) {
    const agree = $("[data-agree]", card);
    agree.disabled = !progress.read;
    agree.checked = progress.read && progress.agreed;
    $("[data-confirm]", card).disabled = !agree.checked;
    $("[data-note]", card).textContent = progress.read
      ? agree.checked
        ? "Thank you. Confirm to open Social."
        : "You agreed in the policy window. Tick the box, then confirm."
      : "Open the policy, read it to the end and press Agree to unlock this.";
  }
  // In the dialog: Agree is the only thing that counts as "read". It unlocks at the end of the policy, and it is not there on a plain re-read.
  const hint = $("#gl-hint");
  const agreeBtn = $("#gl-agree");
  agreeBtn.hidden = !gate || progress.read;
  agreeBtn.disabled = !reachedEnd;
  if (!gate) hint.textContent = "";
  else if (progress.read) hint.textContent = "You have agreed. Close this window to continue.";
  else hint.textContent = reachedEnd ? "You reached the end. Press Agree to continue." : "Scroll to the end of the policy to enable Agree.";
}

// The end of the policy is reached by scrolling to it (a policy that fits on the screen has no scrolling to do).
let reachedEnd = false;
function checkEnd() {
  if (!gate || reachedEnd || !gl.open) return;
  if (atEnd($("#gl-body"))) {
    reachedEnd = true;
    syncGate();
  }
}

// `asGate`: opened from the gate card (reading counts); otherwise it is just a re-read from the Guidelines button.
function openGuidelines(asGate) {
  gate = asGate;
  reachedEnd = false;
  fillGuidelines();
  syncGate();
  if (!gl.open) gl.showModal();
  $("#gl-body").scrollTop = 0;
  $("#gl-title").focus({ preventScroll: true });
  requestAnimationFrame(checkEnd); // a short policy that needs no scrolling counts as read at once
}

$("#gl-body").addEventListener("scroll", checkEnd);
$("#gl-close").addEventListener("click", () => gl.close());
$("#gl-agree").addEventListener("click", () => {
  if (!reachedEnd) return;
  progress.read = true;
  gl.close(); // the close handler redraws the card: its tick box is now unlocked
});
gl.addEventListener("click", (e) => {
  if (e.target === gl) gl.close();
});
gl.addEventListener("close", () => {
  gate = false;
  syncGate();
});
for (const b of document.querySelectorAll('[data-act="guidelines"]')) b.addEventListener("click", () => openGuidelines(false));

/** The card shown in place of the feed until the resident has accepted the current guidelines. */
function buildGate() {
  const g = guidelines(storage);
  if (progress.ver !== g.ver) Object.assign(progress, { ver: g.ver, read: false, agreed: false }); // a new version has to be read again
  const card = tpl("t-gate");
  card.dataset.gate = "";
  $("[data-meta]", card).textContent = `Version ${g.ver} · published ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(g.pub))} by ${g.by}`;
  $("[data-read]", card).addEventListener("click", () => openGuidelines(true));
  $("[data-later]", card).addEventListener("click", () => location.assign(exitTarget("/social.html", info.home))); // the only other way out: the same as Exit
  $("[data-agree]", card).addEventListener("change", (e) => {
    progress.agreed = e.target.checked;
    syncGate();
  });
  $("[data-confirm]", card).addEventListener("click", () => {
    if (!progress.read || !progress.agreed) return;
    acceptGuidelines(storage, me.id);
    Object.assign(progress, { read: false, agreed: false });
    $("#gate").close();
    toast("Thanks for reading. Welcome to Social.");
    render();
  });
  return card;
}

for (const b of document.querySelectorAll('[data-act="hide"]'))
  b.addEventListener("click", () => {
    setShow(storage, me.id, false);
    toast("Social is hidden. Turn it back on here or in Settings.");
    render();
  });

/* ------------------------------------------------------------ privacy mode */

// Privacy mode (on by default): phone numbers, emails, units and plates in posts and replies show as dots. Pressing a hidden value shows it for
// 10 seconds, then hides it again; every reveal is written to a small log kept in this browser ("logged").
const PRIV = `eso-res-privacy:${me.id}`;
const PRIV_LOG = `eso-res-privacy-log:${me.id}`;
const privacyOn = () => {
  try {
    return storage.getItem(PRIV) !== "0";
  } catch {
    return true;
  }
};
const SECRETS = [
  ["email", /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/],
  ["phone", /\(?\b\d{3}\)?[ .-]?\d{3}[ .-]\d{4}\b/],
  ["unit", /\bUnit \d[\w-]*/],
  ["plate", /\b\d[A-Z]{3}\d{3}\b/],
];
const SECRET_RE = new RegExp(SECRETS.map(([k, r]) => `(?<${k}>${r.source})`).join("|"), "g");
const MASK = { email: "•••@•••", phone: "(•••) •••-••••", unit: "Unit ••••", plate: "•••••••" };

function logReveal(kind) {
  try {
    const log = JSON.parse(storage.getItem(PRIV_LOG)) || [];
    log.push({ t: Date.now(), kind });
    storage.setItem(PRIV_LOG, JSON.stringify(log.slice(-50)));
  } catch {
    /* the reveal still works without the log */
  }
}

function secret(value, kind) {
  const b = tpl("t-secret");
  const hide = () => {
    delete b.dataset.shown;
    b.textContent = MASK[kind];
    b.setAttribute("aria-label", `Hidden ${kind}. Press to show it for 10 seconds.`);
  };
  hide();
  let timer;
  b.addEventListener("click", () => {
    if (b.dataset.shown) return;
    b.dataset.shown = "1";
    b.textContent = value;
    b.removeAttribute("aria-label");
    logReveal(kind);
    clearTimeout(timer);
    timer = setTimeout(hide, 10000);
  });
  return b;
}

/** Put `text` in `el`, with hidden values replaced by buttons while Privacy mode is on. */
function fillText(el, text) {
  clear(el);
  if (!privacyOn()) {
    el.textContent = text;
    return;
  }
  let last = 0;
  for (const m of text.matchAll(SECRET_RE)) {
    if (m.index > last) el.append(text.slice(last, m.index));
    el.append(
      secret(
        m[0],
        Object.keys(m.groups).find((k) => m.groups[k] !== undefined),
      ),
    );
    last = m.index + m[0].length;
  }
  el.append(text.slice(last));
}

function applyPrivacyUi() {
  const on = privacyOn();
  $("#privacy").hidden = !on;
  const b = $("#btn-privacy");
  b.setAttribute("aria-pressed", String(on));
  b.setAttribute("aria-label", on ? "Privacy mode is on. Turn it off" : "Privacy mode is off. Turn it on");
  b.title = on ? "Privacy mode: on" : "Privacy mode: off";
}

function setPrivacy(on) {
  try {
    storage.setItem(PRIV, on ? "1" : "0");
  } catch {
    /* lasts until reload */
  }
  toast(on ? "Privacy mode on. Phone, email, unit and plates are masked." : "Privacy mode off. Values show in full.");
  render();
  $("#btn-privacy").focus({ preventScroll: true });
}
$("#btn-privacy").addEventListener("click", () => setPrivacy(!privacyOn()));
$("#privacy-off").addEventListener("click", () => setPrivacy(false));

/* ------------------------------------------------------------------ go to a post */

function goToPost(id) {
  toFeed();
  clearFocus();
  ui.tab = "foryou";
  ui.q = "";
  $("#q").value = "";
  if ($("#pulse").open) $("#pulse").close();
  render();
  const post = document.querySelector(`#feed li[data-post="${id}"]`);
  post?.scrollIntoView({ block: "start" });
  post?.querySelector("[data-toggle-replies]")?.focus({ preventScroll: true });
}

// A notification about a comment: the feed scrolls to its post, the replies window opens with the comment shown (its answers open above it) and marked, and
// the reply box is aimed at it, ready to answer.
function goToComment(postId, commentId) {
  goToPost(postId);
  openThread(postId, "[data-replies-link]");
  const p = threadPostNow();
  const target = p && p.replies.find((x) => x.id === commentId);
  if (!target) {
    toast("That reply is no longer there.");
    return;
  } // the comment is gone: the window still shows the post's replies
  const parents = new Map(p.replies.map((x) => [x.id, x.parentId]));
  for (let c = target.parentId; c; c = parents.get(c)) thread.expanded.add(c);
  thread.hit = commentId;
  if (canWrite() && target.state === "ok") thread.to = { id: target.id, name: target.name === "You" ? me.name : target.name };
  drawThread();
  threadDlg.querySelector(`[data-comment="${commentId}"]`)?.scrollIntoView({ block: "center" });
  if (thread.to) threadInput.focus({ preventScroll: true });
}

/* ------------------------------------------------------------ notifications (bell) */

// What is new for this resident in Social: announcements, and replies from others on posts they liked or replied to.
// Which ones were seen is kept per resident in this browser.
const SEEN = `eso-res-social-seen:${me.id}`;
const seenMap = () => {
  try {
    return JSON.parse(storage.getItem(SEEN)) || {};
  } catch {
    return {};
  }
};
const markSeen = (ids) => {
  const m = seenMap();
  for (const id of ids) m[id] = true;
  try {
    storage.setItem(SEEN, JSON.stringify(m));
  } catch {
    /* seen until reload */
  }
};
// A violation Staff recorded on this resident's comment is news too: the bell says so, and takes them to the notice at the top of the feed.
const noticeAlerts = () =>
  staff
    ? []
    : noticesOf(storage, me.id).map((v) => ({
        id: `v-${v.id}`,
        t: v.t,
        who: "Property team",
        name: "Property team",
        meta: "Violation",
        icon: "i-shield",
        notice: true,
        what: `recorded a violation on your ${v.manual ? "account" : "comment"}: ${v.label}${v.active ? `. Your activity is paused until ${longDate(v.until)}` : v.kind === "warning" ? " (warning)" : ""}`,
      }));
// A Staff person's Pause Social, quiet hours and Replies / Community switches (Settings > Social) decide what their bell here says, as on every other page.
const socialNotifs = (all) => {
  const prefs = staff ? staffSocialPrefs(storage) : null;
  if (prefs && prefs.silent) return [];
  // The same news as the Notifications page lists: from the last week, the newest eight (notifications/live.js), so the two never disagree.
  const recent = socialAlerts(all, { staff })
    .filter((a) => !prefs || !prefs.off.has(a.meta))
    .filter((a) => a.t && Date.now() - a.t < 7 * 86400000)
    .slice(0, 8);
  return [...recent, ...noticeAlerts()].sort((a, b) => b.t - a.t);
};

// The notices at the top of the feed (a resident): each violation until it is read, and every pause while it runs. A pause cannot be dismissed.
// The clock of a running pause: days, hours, minutes and seconds left, one tick a second. The screen reader is told once a minute, not every second. At zero the
// page looks again (start), and Social opens by itself.
let pauseTimer = 0;
const two = (n) => String(n).padStart(2, "0");
function startClock(el, until, atZero) {
  const n = Object.fromEntries(["d", "h", "m", "s"].map((k) => [k, $(`[data-n="${k}"]`, el)]));
  const sr = $("[data-sr]", el);
  let said = "";
  const tick = () => {
    const left = Math.max(0, until - Date.now());
    const { d, h, m, s } = clockParts(left);
    n.d.textContent = two(d);
    n.h.textContent = two(h);
    n.m.textContent = two(m);
    n.s.textContent = two(s);
    const words = `${d} ${d === 1 ? "day" : "days"}, ${h} ${h === 1 ? "hour" : "hours"}, ${m} ${m === 1 ? "minute" : "minutes"} left`;
    if (words !== said) {
      sr.textContent = words;
      said = words;
    }
    if (left <= 0) {
      clearInterval(pauseTimer);
      atZero();
    }
  };
  tick();
  pauseTimer = setInterval(tick, 1000);
}

// "Hate speech" with a chevron: press it and the comment that was flagged opens (its words as they were when Staff recorded the violation, so it shows even
// when the comment was removed), with the post it was on and a way to that post.
// The words a violation shows for the comment, or (a ban or warning the property team gave directly) that there was no comment.
const quoteLine = (v) => (v.manual ? "Recorded by the property team. It is not about one comment." : `“${v.quote}”`);

function whyBlock(v, canOpenPost) {
  const el = tpl("t-why");
  const btn = $("[data-why]", el);
  const panel = $("[data-panel]", el);
  $("[data-label]", btn).textContent = `${v.label} · ${v.manual ? "see the details" : "see the comment"}`;
  $("[data-quote]", el).textContent = quoteLine(v);
  // The post is described from the record (a paused resident cannot open the feed); the link to it is there only when the feed is open to them.
  const post = getTimeline().find((x) => x.id === v.post);
  const by = post ? post.name : v.postBy;
  $("[data-where]", el).textContent = by ? `On ${by}’s post “${clip(post ? post.text : v.postText || "", 70)}” · ${longDate(v.t)}` : `On a post · ${longDate(v.t)}`;
  const open = $("[data-open]", el);
  open.hidden = !post || !canOpenPost;
  open.addEventListener("click", () => goToPost(v.post));
  btn.addEventListener("click", () => {
    const on = panel.hidden;
    panel.hidden = !on;
    btn.setAttribute("aria-expanded", String(on));
  });
  return el;
}

function renderNotices() {
  const box = $("#notices");
  clear(box);
  clearInterval(pauseTimer);
  if (staff) return;
  const hold = pausedNow(); // a pause that runs, or one whose clock reached zero and has not been resumed from
  if (!hold) return;
  const all = noticesOf(storage, me.id);
  const v = all.find((x) => x.id === hold.id) || hold;
  const g = guidelines(storage);
  const p = tpl("t-pause");
  p.dataset.notice = v.id;
  // A ban given straight to the resident (no comment) does not say a comment broke the guidelines.
  $("[data-reason]", p).textContent = v.manual ? "The property team paused your activity because of the community guidelines." : "A comment of yours broke the community guidelines.";
  $("[data-until]", p).textContent = `Back on ${new Date(v.until).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}`;
  const rule = ruleFor(v.reason, g.blocks);
  $("[data-rule]", p).textContent = rule ? `Guideline “${rule.title}”${rule.text ? `: ${rule.text}` : ""}` : "";
  $("[data-note]", p).textContent = v.note ? `Note from the property team: “${v.note}”` : "";
  $("[data-guidelines]", p).addEventListener("click", () => openGuidelines(false));
  // A light pause is a reminder on top of a feed they can still read: the banner stays short (the clock, the reason, the note). The rule text, the strike meter and the guidelines button are for a ban.
  const compact = !shutsOut(hold) && v.kind === "light";
  if (compact) {
    $("[data-rule]", p).hidden = true;
    $("[data-guidelines]", p).hidden = true;
  }
  $("[data-why-slot]", p).appendChild(whyBlock(v, !shutsOut(hold))); // a ban has no feed to go to while the clock runs; an ordinary pause does
  const sk = standing();
  const here = sk.items.find((x) => x.id === v.id);
  if (!compact)
    $("[data-strikes-slot]", p).appendChild(
      strikeMeter(
        Math.min(sk.count, sk.limit),
        sk.limit,
        hold.review ? `${sk.limit} of ${sk.limit} strikes · under review` : here && here.counting ? `Strike ${here.strike} of ${sk.limit}` : `${sk.count} of ${sk.limit} strikes`,
      ),
    );
  // At zero nothing opens by itself: the clock stops on 00:00:00:00 and "Resume Social" appears. Pressing it shows what happened (the notice), then the guidelines to read again.
  const atZero = () => {
    $("[data-title]", p).textContent = "The clock has reached zero";
    $("[data-body]", p).textContent = "Your pause is over. Press Resume Social to come back.";
    $("[data-resume]", p).hidden = false;
  };
  $("[data-body]", p).textContent = shutsOut(hold)
    ? "Social is closed to you until the clock reaches zero. Messages still work."
    : "You can still read Social. Until the clock reaches zero you cannot comment, reply, react or share. Messages still work.";
  $("[data-resume]", p).addEventListener("click", () => {
    if (tell(resumePause(storage, me.id)).ok) render();
  });
  box.appendChild(p);
  if (hold.review) {
    // Three strikes: no clock and no way to press through. The account is closed until Staff open it, so the frame says that, and what happens then.
    $("[data-clockbox]", p).hidden = true;
    $("[data-until]", p).hidden = true;
    $("[data-title]", p).textContent = "Your account is under review";
    $("[data-reason]", p).textContent = `You have reached ${sk.limit} strikes.`;
    $("[data-body]", p).textContent = "Social is closed until the property team reopens your account. Messages still work: write to them if you think this is a mistake.";
    return;
  }
  startClock(p, v.until, atZero);
}

// A resident's standing: the strikes not yet in a folder, the folders Staff have opened, and every record.
const standing = () => strikesOf(noticesOf(storage, me.id), foldersOf(storage, me.id), strikeLimit(storage));

// The strike meter: a segment for each strike the limit allows, filled for the ones that count, with the count in words beside it.
function strikeMeter(count, limit, words) {
  const el = tpl("t-strikes");
  for (let i = 0; i < limit; i += 1) {
    const seg = tpl("t-seg");
    if (i < count) seg.dataset.on = "";
    $("[data-bar]", el).appendChild(seg);
  }
  $("[data-text]", el).textContent = words ?? `${count} of ${limit} strikes`;
  return el;
}
// "Strike 2 of 3", and which folder it was sealed into once Staff opened the account.
const strikeWords = (item, limit, folderNumber) => `Strike ${item.strike} of ${limit}${item.folder && folderNumber ? ` · kept in Folder ${folderNumber}` : ""}`;
// "3-day", "2-hour" or "20-minute": how long a pause was, in the unit that fits (a 20-minute pause is not a 1-day one).
const dayWord = (ms) => {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m >= 1440) return `${Math.round(m / 1440)}-day`;
  if (m >= 60) return `${Math.round(m / 60)}-hour`;
  return `${m}-minute`;
};
const shortDate = (t) => new Date(t).toLocaleDateString("en-US", { dateStyle: "medium" });

// Once, when a pause has ended or a warning has come: a calm window with what happened, the rule, the strike, and what is open again. Closing it counts as read
// (the record stays under Violations). Not while the guidelines gate is up, and one at a time.
const noticeDlg = $("#notice-dlg");
const noticeShown = new Set(); // shown this visit, so a storage that cannot save "read" never makes it open again and again
let noticeNow = null;
let noticeGo = false;
function showNextNotice() {
  if (staff || noticeDlg.open || pausedNow() || view !== "feed" || routeOf() !== "feed") return; // (not on the record page: a link to it is drawn before `view` is set)
  const acked = residentState(storage, me.id).acked;
  const list = noticesOf(storage, me.id);
  const v = list.find((x) => !x.active && !acked.has(x.id) && !noticeShown.has(x.id));
  if (!v) return;
  noticeShown.add(v.id);
  noticeNow = v;
  const st = standing();
  const mine = st.items.find((x) => x.id === v.id);
  const ended = isHold(v);
  $("#notice-icon").dataset.tone = ended ? "success" : "warning";
  $("#notice-icon use").setAttribute("href", ended ? "#i-check" : "#i-shield");
  $("#notice-title").textContent = ended ? "Your pause has ended" : "A warning from the property team";
  $("#notice-sub").textContent = ended ? "You can comment, reply, react and share again." : "Nothing is paused. Please keep the community guidelines in mind.";
  $("#notice-reason").textContent = v.label;
  const kind = $("#notice-kind");
  clear(kind);
  // A ban the property team lifted early is not described by how long it ran ("1-minute pause" for a ban of two hours).
  kind.appendChild(badge(ended ? (v.lifted ? "Lifted early" : `${dayWord(v.until - v.t)} pause`) : "Warning", ended ? "neutral" : "warning"));
  $("#notice-quote").textContent = quoteLine(v);
  $("#notice-where").textContent = v.postBy ? `On ${v.postBy}’s post “${clip(v.postText || "", 70)}” · ${longDate(v.t)}` : longDate(v.t);
  const rule = ruleFor(v.reason, guidelines(storage).blocks);
  $("#notice-rule").textContent = rule ? `Guideline “${rule.title}”${rule.text ? `: ${rule.text}` : ""}` : "";
  $("#notice-note").textContent = v.note ? `Note from the property team: “${v.note}”` : "";
  const box = $("#notice-strikes");
  clear(box);
  box.appendChild(
    strikeMeter(
      Math.min(st.count, st.limit),
      st.limit,
      v.kind === "warning" ? `A warning is not a strike · ${st.count} of ${st.limit} strikes` : mine ? strikeWords(mine, st.limit) : `${st.count} of ${st.limit} strikes`,
    ),
  );
  noticeGo = false;
  noticeDlg.showModal();
  $("#notice-title").focus({ preventScroll: true });
}
$("#notice-ok").addEventListener("click", () => noticeDlg.close());
$("#notice-more").addEventListener("click", () => {
  noticeGo = true;
  noticeDlg.close();
});
noticeDlg.addEventListener("close", () => {
  if (noticeNow) {
    ackNotice(storage, me.id, noticeNow.id);
    noticeNow = null;
  }
  const go = noticeGo;
  noticeGo = false;
  if (go) {
    location.hash = "#/violations";
    return;
  } // the page lists them all, and reading it counts as reading them
  render(); // (this also shows the next unread one)
});

// A violation on the bell takes the person to the page of their record; while the clock runs there is only the clock.
function goToNotice() {
  if (pausedNow()) {
    render();
    $("#notices [data-notice]")?.focus({ preventScroll: true });
    return;
  }
  location.hash = "#/violations";
}

const notif = $("#notif");
function renderNotifs(all) {
  const items = socialNotifs(all);
  const seenIds = seenMap();
  const unread = items.filter((n) => !seenIds[n.id]).length;
  const count = $("#bell-count");
  count.hidden = unread === 0;
  count.textContent = unread > 99 ? "99+" : String(unread);
  $("#btn-bell").setAttribute("aria-label", unread ? `Notifications, ${unread} new` : "Notifications");
  const chip = $("#notif-new");
  chip.hidden = unread === 0;
  chip.textContent = `${unread} new`;
  $("#notif-all").disabled = unread === 0;
  const list = $("#notif-list");
  clear(list);
  $("#notif-empty").hidden = items.length > 0;
  for (const n of items.slice(0, 5)) list.appendChild(notifRow(n, !seenIds[n.id]));

  // The sheet behind "View all": every notification, All or Unread. It stays inside Social.
  const shown = notifView === "unread" ? items.filter((n) => !seenIds[n.id]) : items;
  $("#notif-sheet-sub").textContent = unread ? `${unread} new · ${items.length} in all` : `${items.length} in all, all read`;
  $("#notif-sheet-all").disabled = unread === 0;
  for (const b of document.querySelectorAll("#notif-sheet-chips [data-nf]")) b.setAttribute("aria-pressed", String(b.dataset.nf === notifView));
  const sheet = $("#notif-sheet-list");
  clear(sheet);
  const emptyMsg = $("#notif-sheet-empty");
  emptyMsg.hidden = shown.length > 0;
  emptyMsg.textContent = items.length ? "Nothing unread. You are all caught up." : "Nothing new yet. Announcements and replies show up here.";
  for (const n of shown) sheet.appendChild(notifRow(n, !seenIds[n.id]));
}

let notifView = "all";
let leavingSheet = false; // the sheet closes because a post was chosen: focus goes to the post, not back to the bell
function notifRow(n, isNew) {
  const li = tpl("t-notif");
  $("[data-avatar]", li).textContent = initials(n.name);
  $("[data-icon]", li).setAttribute("href", `#${n.icon}`);
  $("[data-who]", li).textContent = n.who;
  fillText($("[data-what]", li), n.what);
  $("[data-meta]", li).textContent = `${when(n.t)} · ${n.meta}`;
  $("[data-dot]", li).hidden = !isNew;
  $("button", li).addEventListener("click", () => {
    markSeen([n.id]);
    closeNotifs(false);
    if ($("#notif-sheet").open) {
      leavingSheet = true;
      $("#notif-sheet").close();
    }
    if (n.notice) goToNotice();
    else if (n.comment) goToComment(n.post, n.comment);
    else goToPost(n.post);
  });
  return li;
}

function closeNotifs(restoreFocus = true) {
  if (notif.hidden) return;
  notif.hidden = true;
  $("#btn-bell").setAttribute("aria-expanded", "false");
  if (restoreFocus) $("#btn-bell").focus({ preventScroll: true });
}
$("#btn-bell").addEventListener("click", () => {
  if (!notif.hidden) {
    closeNotifs();
    return;
  }
  notif.hidden = false;
  $("#btn-bell").setAttribute("aria-expanded", "true");
  $("#notif-list button")?.focus({ preventScroll: true });
});
$("#notif-all").addEventListener("click", () => {
  markSeen(socialNotifs(getTimeline()).map((n) => n.id));
  render();
  $("#btn-bell").focus({ preventScroll: true });
});
$("#notif-view").addEventListener("click", () => {
  closeNotifs(false);
  notifView = "all";
  renderNotifs(getTimeline());
  $("#notif-sheet").showModal();
});
$("#notif-sheet-close").addEventListener("click", () => $("#notif-sheet").close());
$("#notif-sheet").addEventListener("click", (e) => {
  if (e.target === $("#notif-sheet")) $("#notif-sheet").close();
});
$("#notif-sheet").addEventListener("close", () => {
  if (!leavingSheet) $("#btn-bell").focus({ preventScroll: true });
  leavingSheet = false;
});
$("#notif-sheet-all").addEventListener("click", () => {
  markSeen(socialNotifs(getTimeline()).map((n) => n.id));
  renderNotifs(getTimeline());
});
for (const b of document.querySelectorAll("#notif-sheet-chips [data-nf]"))
  b.addEventListener("click", () => {
    notifView = b.dataset.nf;
    renderNotifs(getTimeline());
  });
document.addEventListener("pointerdown", (e) => {
  if (!notif.hidden && !notif.contains(e.target) && !$("#btn-bell").contains(e.target)) closeNotifs(false);
});
notif.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.stopPropagation();
    closeNotifs();
  }
});

/* ------------------------------------------------------------------ Social pulse */

const pulse = $("#pulse");
function renderPulse() {
  const all = getTimeline();
  const week = Date.now() - 7 * 86400000;
  const recent = all.filter((p) => p.t >= week);
  $("#ps-posts").textContent = String(recent.length);
  $("#ps-comments").textContent = String(all.reduce((n, p) => n + p.replies.filter((r) => r.state === "ok" && r.t >= week).length, 0));
  $("#ps-reactions").textContent = String(recent.reduce((n, p) => n + p.reactionTotal, 0));
  const ann = $("#pulse-ann-list");
  clear(ann);
  for (const p of all.filter((x) => x.announcement).slice(0, 4)) {
    const li = tpl("t-rail-item");
    $("[data-kind]", li).textContent = "Announcement";
    $("[data-pinned]", li).hidden = !p.pinned;
    $("[data-time]", li).textContent = when(p.t);
    fillText($("[data-text]", li), p.text);
    $("[data-meta]", li).textContent = `${p.name} · ${liveCount(p)} ${liveCount(p) === 1 ? "comment" : "comments"}`;
    $("button", li).addEventListener("click", () => goToPost(p.id));
    ann.appendChild(li);
  }
}
$("#btn-pulse").addEventListener("click", () => {
  renderPulse();
  pulse.showModal();
});
$("#pulse-close").addEventListener("click", () => pulse.close());
pulse.addEventListener("click", (e) => {
  if (e.target === pulse) pulse.close();
});

/* ------------------------------------------------------------------ Staff: new post, header */

if (staff) {
  const dlg = $("#compose");
  const text = $("#compose-text");
  const count = () => {
    $("#compose-count").textContent = `${text.value.length} / ${staffStore.MAX_POST}`;
  };
  // The error sits under the field and is tied to it (aria-describedby), the field is marked invalid until the person types again, and focus goes back to it.
  text.setAttribute("aria-describedby", "compose-error");
  const clearError = () => {
    $("#compose-error").textContent = "";
    text.removeAttribute("aria-invalid");
  };
  // The same dialog writes a new post and changes one of your own: `editing` is the post being changed, or null.
  let editing = null;
  const setMode = (p) => {
    editing = p;
    $("#compose-title").textContent = p ? "Edit post" : "Start a discussion";
    $("#compose-send").textContent = p ? "Save" : "Post";
  };
  // The photos on the post being written: { bg, alt } each. They are shrunk when chosen (a long side of MAX_SIDE, JPEG), shown here with a box for what they
  // show, and kept with the post. Up to MAX_IMAGES; the button is off when they are all used.
  const photos = [];
  const photoList = $("#compose-photos");
  const addPhoto = $("#compose-add-photo");
  const files = $("#compose-files");
  const drawPhotos = () => {
    clear(photoList);
    photos.forEach((ph, i) => {
      const li = tpl("t-compose-photo");
      const th = $("[data-thumb]", li);
      th.style.background = ph.bg;
      th.setAttribute("aria-label", ph.alt || `Photo ${i + 1}`);
      const alt = $("[data-alt]", li);
      alt.value = ph.alt;
      alt.setAttribute("aria-label", `Description of photo ${i + 1}`);
      alt.addEventListener("input", () => {
        ph.alt = alt.value;
        th.setAttribute("aria-label", ph.alt || `Photo ${i + 1}`);
      });
      const rm = $("[data-remove]", li);
      rm.setAttribute("aria-label", `Remove photo ${i + 1}`);
      rm.addEventListener("click", () => {
        photos.splice(i, 1);
        drawPhotos();
        (photoList.querySelector("[data-remove]") || addPhoto).focus({ preventScroll: true });
      });
      photoList.appendChild(li);
    });
    addPhoto.disabled = photos.length >= MAX_IMAGES;
    $("#compose-photo-hint").textContent = photos.length ? `${photos.length} of ${MAX_IMAGES} photos` : `Up to ${MAX_IMAGES} photos`;
  };
  // A photo as a small JPEG: drawn on white (a PNG with clear parts would turn black), then saved at a lower quality until it fits what a post may hold.
  async function shrinkPhoto(file) {
    if (!TYPES.includes(file.type)) throw new Error(`“${file.name}” is not a JPEG, PNG or WebP photo.`);
    let bmp;
    try {
      bmp = await createImageBitmap(file);
    } catch {
      throw new Error(`“${file.name}” could not be read as a photo.`);
    }
    for (const side of [MAX_SIDE, 960, 720]) {
      const { w, h } = fitSize(bmp.width, bmp.height, side);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      g.fillStyle = "#fff";
      g.fillRect(0, 0, w, h);
      g.drawImage(bmp, 0, 0, w, h);
      for (const q of [0.82, 0.7, 0.58]) {
        const url = c.toDataURL("image/jpeg", q);
        if (url.length <= MAX_DATA_CHARS) {
          bmp.close?.();
          return photoBg(url);
        }
      }
    }
    bmp.close?.();
    throw new Error(`“${file.name}” is too large to keep. Choose a smaller photo.`);
  }
  addPhoto.addEventListener("click", () => files.click());
  files.addEventListener("change", async () => {
    const chosen = [...files.files];
    files.value = "";
    clearError();
    const room = MAX_IMAGES - photos.length;
    const problems = chosen.length > room ? [`Only ${MAX_IMAGES} photos fit on a post.`] : [];
    addPhoto.disabled = true;
    for (const f of chosen.slice(0, room)) {
      try {
        photos.push({ bg: await shrinkPhoto(f), alt: "" });
      } catch (err) {
        problems.push(err.message);
      }
    }
    drawPhotos();
    if (problems.length) $("#compose-error").textContent = problems.join(" ");
  });
  const openCompose = () => {
    clearError();
    setMode(null);
    dlg.showModal();
    text.focus();
    count();
    drawPhotos();
  };
  ownPost.edit = (p) => {
    clearError();
    setMode(p);
    text.value = p.text;
    $("#compose-aud").value = p.aud;
    $("#compose-ann").checked = p.announcement;
    photos.length = 0;
    for (const im of p.images) photos.push({ bg: im.bg, alt: im.alt === "Photo" ? "" : im.alt });
    drawPhotos();
    dlg.showModal();
    text.focus();
    count();
  };
  // Closed without saving (Cancel, Esc): the next new post starts empty, not with the words (or photos) of the one that was being changed.
  dlg.addEventListener("close", () => {
    if (editing) {
      text.value = "";
      $("#compose-ann").checked = false;
      $("#compose-aud").value = "all";
      photos.length = 0;
      drawPhotos();
      setMode(null);
    }
  });
  $("#composer-open").addEventListener("click", openCompose);
  $("#composer-post").addEventListener("click", openCompose);
  text.addEventListener("input", () => {
    count();
    if (text.hasAttribute("aria-invalid")) clearError();
  });
  // An announcement is for residents: the two choices cannot disagree.
  $("#compose-ann").addEventListener("change", (e) => {
    if (e.target.checked && $("#compose-aud").value === "staff") $("#compose-aud").value = "all";
  });
  $("#compose-aud").addEventListener("change", (e) => {
    if (e.target.value === "staff") $("#compose-ann").checked = false;
  });
  $("#compose-cancel").addEventListener("click", () => dlg.close());
  $("#compose-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fields = { text: text.value, aud: $("#compose-aud").value, announcement: $("#compose-ann").checked, images: photos.map((ph) => [ph.bg, ph.alt]) };
    const wasEdit = !!editing;
    const r = wasEdit ? staffStore.editPost(storage, editing.id, fields) : staffStore.addPost(storage, fields);
    if (!r.ok) {
      $("#compose-error").textContent = r.reason;
      text.setAttribute("aria-invalid", "true");
      text.focus();
      return;
    }
    text.value = "";
    photos.length = 0;
    drawPhotos();
    $("#compose-ann").checked = false;
    $("#compose-aud").value = "all";
    dlg.close();
    toast(wasEdit ? "Post updated" : "Posted");
    if (wasEdit) {
      if (view === "feed") render();
      else renderPage();
      return;
    } // where the person was stays where it was
    ui.tab = "foryou";
    ui.q = "";
    render();
    document.querySelector(`#feed li[data-post="${r.post.id}"]`)?.scrollIntoView({ block: "start" });
  });

  // Delete a post of your own: it asks first (Cancel has the focus), then the post, its replies and likes go.
  const del = $("#del");
  let doomed = null;
  ownPost.remove = (p) => {
    doomed = p;
    $("#del-quote").textContent = p.text;
    del.showModal();
    $("#del-cancel").focus();
  };
  $("#del-cancel").addEventListener("click", () => del.close());
  $("#del-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const r = doomed && staffStore.deletePost(storage, doomed.id);
    del.close();
    if (!r || !r.ok) {
      toast(r ? r.reason : "This post is no longer available.");
      return;
    }
    doomed = null;
    toast("Post deleted");
    clearFocus(); // a post opened on its own is gone: back to the feed
    if (view === "feed") render();
    else renderPage();
    $("#composer-open")?.focus();
  });
}

/* ------------------------------------------------------------ Staff: pages of the left menu */

// My profile, Activity, Guidelines and Moderation open inside Social, under its own header (Back goes to the feed), never in the Staff shell.
const ROUTES = { me: "My profile", activity: "Activity", violations: "Violations", guidelines: "Guidelines", moderation: "Moderation" };
let view = "feed";
let profileTab = staff ? "posts" : "replies";
let activityTab = "all";
let staffCardOpen = false;
// A resident has My profile, Activity and Violations (their own record); Guidelines is a window for them, and Moderation is for Staff. Staff have all five: their
// Violations is the page for managing residents' strikes, bans and folders.
const routeOf = () => {
  const m = location.hash.match(/^#\/(me|activity|violations|guidelines|moderation)\b/);
  return m && (staff || ["me", "activity", "violations"].includes(m[1])) ? m[1] : "feed";
};

function showView(name) {
  // A paused resident has no page of Social to go to (profile, activity, a post): only the clock.
  // The same until the guidelines have been read and accepted: nothing of Social is open before that.
  if (!staff && name !== "feed" && (lockedNow() || isGated())) {
    name = "feed";
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  }
  view = name;
  $("#view-feed").hidden = name !== "feed";
  $("#view-page").hidden = name === "feed";
  if (name !== "feed") ui.focus = null; // a page of the menu replaces whatever post was open
  for (const a of document.querySelectorAll("[data-route]")) {
    if (a.dataset.route === name) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  syncChrome();
  if (name !== "feed" && !$("#search-row").hidden) setSearch(false);
  closeMenus();
  if (name === "feed") render();
  else {
    renderPage();
    $("#main-content").scrollTop = 0;
  }
}
// The header follows what is open: its title, and whether Back shows.
function syncChrome() {
  const focused = view === "feed" && !!ui.focus;
  $("header h1").textContent = view === "feed" ? (focused ? "Post" : "Feed") : ROUTES[view];
  // Back shows for a post opened on its own, and for a page of the menu (Staff) except My profile, which has its own Back arrow at the top of its cover.
  // On the feed itself there is no step back: Exit is the way out.
  $("#btn-back").hidden = focused ? false : view === "feed" || view === "me";
  $("#btn-back").setAttribute("aria-label", "Back to the feed");
  // On a phone the page repeats its own title under the header, and Exit and Back need the room: the header's title is kept for screen readers only.
  for (const el of [$("header h1"), $("#subtitle")]) el.classList.toggle("max-sm:sr-only", view !== "feed" || focused);
}
function toFeed() {
  if (view === "feed") return;
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  showView("feed");
}

// One post on its own, easier to read than inside the feed: a double click on it, "Open post" in its menu, or the link Copy link gives.
function openPost(id) {
  closeMenus();
  if (!$("#search-row").hidden) setSearch(false);
  history.pushState({ post: id }, "", `${location.pathname}${location.search}#/post/${id}`);
  ui.focus = id;
  if (view !== "feed")
    showView("feed"); // opened from a card on My profile: the post is shown by the feed's view; Back returns to that page
  else {
    render();
    syncChrome();
  }
  $("#main-content").scrollTop = 0;
}
function leavePost() {
  if (!ui.focus) return;
  if (history.state && history.state.post) {
    history.back();
    return;
  } // the address changes back, and syncRoute draws the feed again
  const was = ui.focus;
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  ui.focus = null;
  render();
  syncChrome();
  whereItWas(was);
}
// Back from a post lands on that post in the feed, not at the top of it.
function whereItWas(id) {
  document.querySelector(`#feed li[data-post="${id}"]`)?.scrollIntoView({ block: "center" });
}
// Another way into the feed (a notification, a tab, search) drops the single post without a step in the history.
function clearFocus() {
  if (!ui.focus) return;
  ui.focus = null;
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  syncChrome();
}
// The address says what is open: a post, a page of the menu, or the feed. It is read on a typed link and on the browser's Back and Forward.
function syncRoute() {
  const was = ui.focus;
  ui.focus = postRoute();
  showView(routeOf());
  syncChrome();
  if (was && !ui.focus && view === "feed") whereItWas(was);
}
addEventListener("hashchange", syncRoute);
addEventListener("popstate", syncRoute);
// A double click on a post (not on a button, a link, a field or a masked value) opens it on its own, and a double click again, on the post or around it,
// goes back to the feed. A double click also selects a word, so the selection is cleared.
$("#main-content").addEventListener("dblclick", (e) => {
  if (e.target.closest("button, a, input, textarea, select, label, summary, [data-menu-panel]")) return; // (a hidden value is a button)
  if (view === "feed" && ui.focus) {
    window.getSelection()?.removeAllRanges();
    leavePost();
    return;
  }
  // The posts of the feed, and the ones listed on My profile (Staff).
  const li = e.target.closest(view === "feed" ? "#feed > li[data-post]" : view === "me" ? "#view-page li[data-post]" : "none");
  if (!li) return;
  window.getSelection()?.removeAllRanges();
  openPost(li.dataset.post);
});

function pageHead(title, sub) {
  const h = tpl("t-pagehead");
  $("[data-title]", h).textContent = title;
  $("[data-sub]", h).textContent = sub;
  return h;
}
function infoCard(title, actions = []) {
  const c = tpl("t-card");
  $("[data-title]", c).textContent = title;
  for (const a of actions) $("[data-actions]", c).appendChild(a);
  return c;
}
function line(k, v) {
  const l = tpl("t-line");
  $("[data-k]", l).textContent = k;
  $("[data-v]", l).textContent = v;
  return l;
}
function note(text) {
  const n = tpl("t-empty-line");
  n.textContent = text;
  return n;
}

function renderPage() {
  const host = $("#view-page");
  clear(host);
  const all = getTimeline();
  if (view === "me") pageProfile(host, all);
  else if (view === "activity") pageActivity(host, all);
  else if (view === "violations") (staff ? pageViolationsStaff : pageViolations)(host);
  else if (view === "guidelines") pageGuidelines(host);
  else if (view === "moderation") pageModeration(host, all);
  // A page with tabs: what comes under them is their panel, named by the tab that is selected.
  const list = host.querySelector('[role="tablist"]');
  if (list) {
    const panel = document.createElement("div");
    panel.id = "view-tabpanel";
    panel.setAttribute("role", "tabpanel");
    panel.className = "flex min-w-0 flex-col gap-step-md";
    const on = list.querySelector('[aria-selected="true"]');
    if (on) panel.setAttribute("aria-labelledby", on.id);
    let anchor = list; // the row the tabs sit in (on the Violations page the search button shares it)
    while (anchor.parentElement !== host) anchor = anchor.parentElement;
    while (anchor.nextSibling) panel.appendChild(anchor.nextSibling);
    host.appendChild(panel);
  }
}

// The people behind the Followers and Following counts, each with Follow.
const peopleDlg = $("#people");
function openPeople(kind, opener) {
  const keys = kind === "followers" ? followersOf(storage, viewerKey) : [...followingKeys()];
  const list = $("#people-list");
  const draw = () => {
    clear(list);
    for (const key of keys) {
      const w = whoIs(key, staff ? me.name : "Property team");
      const row = tpl("t-rx-row");
      $("[data-avatar]", row).textContent = initials(w.name);
      $("[data-name]", row).textContent = w.name;
      $("[data-role]", row).textContent = w.role;
      $("[data-emoji]", row).hidden = true;
      followButton($("[data-follow]", row), key, w.name, () => {
        draw();
        renderPage();
      });
      list.appendChild(row);
    }
  };
  draw();
  $("#people-title").textContent = `${kind === "followers" ? "Followers" : "Following"} · ${keys.length}`;
  $("#people-empty").hidden = keys.length > 0;
  $("#people-empty").textContent = kind === "followers" ? "Nobody follows you yet." : "You are not following anyone yet. Follow people from the list of who reacted to a post.";
  peopleDlg.showModal();
  $("#people-title").focus({ preventScroll: true });
  peopleDlg.addEventListener(
    "close",
    () => {
      const b = document.querySelector(`#view-page [data-p-${kind}-btn]`) || opener;
      if (b && b.isConnected) b.focus({ preventScroll: true });
    },
    { once: true },
  );
}
$("#people-close").addEventListener("click", () => peopleDlg.close());
peopleDlg.addEventListener("click", (e) => {
  if (e.target === peopleDlg) peopleDlg.close();
});

// A row of tabs; picking one calls `pick` (which draws the page again) and keeps focus on the tab.
function tabBar(items, current, pick) {
  const tabs = document.createElement("div");
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Show");
  tabs.className = "flex gap-step-xs overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
  for (const [id, label] of items) {
    const t = tpl("t-tab");
    t.textContent = label;
    t.dataset.id = id;
    t.id = `view-tab-${id}`;
    t.setAttribute("aria-controls", "view-tabpanel"); // the panel is put together in renderPage: everything under the tabs
    t.setAttribute("aria-selected", String(current === id));
    t.tabIndex = current === id ? 0 : -1;
    t.addEventListener("click", () => {
      pick(id);
      document.querySelector(`#view-page [role="tab"][data-id="${id}"]`)?.focus({ preventScroll: true });
    });
    t.addEventListener("keydown", (e) => {
      const i = items.findIndex((x) => x[0] === id);
      const n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : -1;
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
  const li = tpl("t-notif");
  paintAvatar($("[data-avatar]", li), me.name, true);
  $("[data-icon]", li).setAttribute("href", `#${n.icon}`);
  $("[data-who]", li).textContent = "You";
  fillText($("[data-what]", li), n.what);
  $("[data-meta]", li).textContent = [n.t ? when(n.t) : "", n.meta].filter(Boolean).join(" · ");
  $("[data-dot]", li).hidden = true;
  const b = $("button", li);
  b.addEventListener("click", () => (n.post ? goToPost(n.post) : n.onOpen?.(b)));
  return li;
}

// What this person wrote as replies, with the comment or post each one answers (the same for Staff and a resident).
function myReplies(all) {
  const out = [];
  for (const p of all) {
    for (const r of p.replies) {
      if (r.key !== viewerKey || r.state !== "ok") continue;
      const to = r.parentId ? p.replies.find((x) => x.id === r.parentId) : null;
      out.push({
        id: `r-${p.id}-${r.id}`,
        t: r.t,
        what: `replied to ${to ? (to.key === viewerKey ? "your own comment" : to.name) : p.name}: “${clip(r.text)}”`,
        meta: "Replies",
        icon: "i-message",
        post: p.id,
      });
    }
  }
  return out.sort((a, b) => b.t - a.t);
}

function pageProfile(host, all) {
  const followers = followersOf(storage, viewerKey);
  const followingNow = [...followingKeys()];
  const mine = all.filter((x) => x.mine);
  const replies = myReplies(all);
  const p = tpl("t-profile");
  paintAvatar($("[data-p-avatar]", p), me.name, true);
  $("[data-p-name]", p).textContent = me.name;
  $("[data-p-role]", p).textContent = staff ? `${me.title} · ${me.org}` : `Resident · ${me.org}`;
  if (staff) $("[data-p-bio]", p).textContent = `${me.title} at ${me.org.split(" at ")[0]} · parking ops & resident services`;
  else $("[data-p-bio]", p).hidden = true;
  $("[data-p-followers]", p).textContent = String(followers.length);
  $("[data-p-followers-label]", p).textContent = followers.length === 1 ? "follower" : "followers";
  $("[data-p-following]", p).textContent = String(followingNow.length);
  $("[data-p-posts]", p).textContent = String(staff ? mine.length : replies.length);
  $("[data-p-posts-label]", p).textContent = staff ? (mine.length === 1 ? "post" : "posts") : replies.length === 1 ? "reply" : "replies";
  const fb = $("[data-p-followers-btn]", p);
  fb.setAttribute("aria-haspopup", "dialog");
  fb.addEventListener("click", () => openPeople("followers", fb));
  const gb = $("[data-p-following-btn]", p);
  gb.setAttribute("aria-haspopup", "dialog");
  gb.addEventListener("click", () => openPeople("following", gb));
  $("[data-p-back]", p).addEventListener("click", toFeed);
  // A resident's profile details are in their Settings: Edit profile goes there instead of only saying so.
  if (!staff) {
    const ed = $("[data-p-edit]", p);
    ed.removeAttribute("data-p-toast");
    ed.addEventListener("click", () => location.assign(withAs("/resident/settings.html")));
  }
  for (const b of p.querySelectorAll("[data-p-toast]")) b.addEventListener("click", () => toast(b.dataset.pToast));
  $("[data-p-share]", p).addEventListener("click", () => {
    try {
      navigator.clipboard?.writeText(`${location.origin}${location.pathname}#/me`);
    } catch {
      /* the toast still tells what was meant */
    }
    toast("Link copied");
  });
  host.appendChild(p);

  if (staff) {
    // Staff card: what residents see about this person, hidden or shown.
    const edit = button("Edit", () => toast("Editing your Staff card is part of Settings in this preview."));
    const toggle = button(staffCardOpen ? "Hide" : "Show", () => {
      staffCardOpen = !staffCardOpen;
      renderPage();
    });
    toggle.setAttribute("aria-expanded", String(staffCardOpen));
    const sc = infoCard("Staff card", [edit, toggle]);
    if (staffCardOpen) {
      $("[data-body]", sc).append(line("Name", me.name), line("Role", me.title), line("Property", me.org));
    } else $("[data-body]", sc).hidden = true;
    host.appendChild(sc);
  }
  const about = infoCard("About");
  if (staff) $("[data-body]", about).append(line("Role", me.title), line("Property", me.org));
  else $("[data-body]", about).append(line("Property", me.org));
  host.appendChild(about);

  if (staff) {
    const photos = infoCard("Photos");
    const imgs = mine.flatMap((x) => x.images);
    if (!imgs.length) $("[data-body]", photos).appendChild(note("No photos yet."));
    else {
      const grid = document.createElement("div");
      grid.className = "grid grid-cols-3 gap-step-sm";
      for (const im of imgs.slice(0, 6)) {
        const d = tpl("t-photo");
        d.style.background = im.bg;
        d.setAttribute("aria-label", im.alt);
        grid.appendChild(d);
      }
      $("[data-body]", photos).appendChild(grid);
    }
    host.appendChild(photos);

    // The composer again ("What's on your mind?"), then this person's posts.
    const c = $("#composer").cloneNode(true);
    for (const el of [c, ...c.querySelectorAll("[id]")]) el.removeAttribute("id");
    c.hidden = false;
    $("button.flex-1", c).textContent = "What's on your mind?";
    for (const b of c.querySelectorAll("button")) b.addEventListener("click", () => $("#composer-open").click());
    host.appendChild(c);
  }
  // The tabs: what this person posted (Staff) or replied (a resident), what they shared, and what they saved. Shares and saved are lists of posts.
  const saved = savedSet();
  const sets = {
    posts: { label: "Posts", posts: mine, empty: "You have not posted yet. Start a discussion to get this feed going." },
    replies: { label: "Replies", rows: replies, empty: "You have not replied yet. Open a post and press Reply." },
    shares: { label: "Shares", posts: all.filter((x) => x.shared), empty: "You have not shared anything yet. Press Share on a post to show it here." },
    saved: { label: "Saved", posts: all.filter((x) => saved.has(x.id)), empty: "Nothing saved yet. Press the bookmark on a post." },
  };
  const ids = staff ? ["posts", "shares", "saved"] : ["replies", "shares", "saved"];
  if (!ids.includes(profileTab)) profileTab = ids[0];
  host.appendChild(
    tabBar(
      ids.map((id) => [id, `${sets[id].label} · ${(sets[id].posts || sets[id].rows).length}`]),
      profileTab,
      (id) => {
        profileTab = id;
        renderPage();
      },
    ),
  );
  const cur = sets[profileTab];
  const list = document.createElement("ul");
  list.setAttribute("role", "list");
  if (cur.rows) {
    list.className = "flex flex-col divide-y divide-border rounded-xl bg-card shadow-lift-xs";
    for (const n of cur.rows) list.appendChild(activityRow(n));
  } else {
    list.className = "flex flex-col gap-step-md";
    for (const x of cur.posts) list.appendChild(card(x));
  }
  if (!(cur.posts || cur.rows).length) host.appendChild(note(cur.empty));
  host.appendChild(list);
}

// Everything this person did in Social, newest first: posts, replies, reactions (to posts and to comments), shares, and the people they follow. A reaction
// or a share has no time of its own, so those come after the ones that do.
function pageActivity(host, all) {
  host.appendChild(pageHead("Activity", "What you did in Social"));
  const kinds = { posts: [], replies: myReplies(all), reactions: [], shares: [], follows: [] };
  for (const p of all) {
    if (p.mine) kinds.posts.push({ t: p.t, what: `posted: “${clip(p.text)}”`, meta: "Posts", icon: p.announcement ? "i-megaphone" : "i-message", post: p.id });
    if (p.myReaction)
      kinds.reactions.push({ t: 0, what: `${p.myReaction === "like" ? "liked" : `reacted ${iconOf(p.myReaction)} to`} ${p.name}'s post`, meta: "Reactions", icon: "i-thumb", post: p.id });
    for (const r of p.replies)
      if (r.myReaction && r.state === "ok")
        kinds.reactions.push({
          t: 0,
          what: `${r.myReaction === "like" ? "liked" : `reacted ${iconOf(r.myReaction)} to`} ${r.key === viewerKey ? "your own" : `${r.name}'s`} comment`,
          meta: "Reactions",
          icon: "i-thumb",
          post: p.id,
        });
    if (p.shared) kinds.shares.push({ t: 0, what: `shared ${p.name}'s post to your profile`, meta: "Shares", icon: "i-repeat", post: p.id });
  }
  for (const key of followingKeys())
    kinds.follows.push({ t: 0, what: `follow ${whoIs(key, staff ? me.name : "Property team").name}`, meta: "Following", icon: "i-user", post: null, onOpen: (b) => openPeople("following", b) });
  const tabs = ["all", ...(staff ? ["posts"] : []), "replies", "reactions", "shares", "follows"];
  if (!tabs.includes(activityTab)) activityTab = "all";
  const label = { all: "All", posts: "Posts", replies: "Replies", reactions: "Reactions", shares: "Shares", follows: "Following" };
  const of = (id) => (id === "all" ? Object.values(kinds).flat() : kinds[id]);
  host.appendChild(
    tabBar(
      tabs.map((id) => [id, `${label[id]} · ${of(id).length}`]),
      activityTab,
      (id) => {
        activityTab = id;
        renderPage();
      },
    ),
  );
  const items = of(activityTab).sort((a, b) => b.t - a.t);
  const c = infoCard(label[activityTab]);
  if (!items.length) $("[data-body]", c).appendChild(note("Nothing yet. Your replies, reactions and shares show up here."));
  else {
    const ul = document.createElement("ul");
    ul.setAttribute("role", "list");
    ul.className = "-mx-step-lg flex flex-col divide-y divide-border";
    for (const n of items.slice(0, 40)) ul.appendChild(activityRow(n));
    $("[data-body]", c).appendChild(ul);
  }
  host.appendChild(c);
}

// Report a post: pick a reason, say more if you like, send. The report goes to Moderation (Staff see who and why); nothing happens to the post until Staff decide.
const reportDlg = $("#report-dlg");
let reportPostId = null;
function openReport(p) {
  reportPostId = p.id;
  const box = $("#report-reasons");
  if (!box.children.length) {
    for (const [key, label] of REPORT_REASONS) {
      const row = tpl("t-report-reason");
      $("input", row).value = key;
      $("[data-label]", row).textContent = label;
      box.appendChild(row);
    }
  }
  for (const i of box.querySelectorAll("input")) i.checked = false;
  $("#report-note").value = "";
  $("#report-error").textContent = "";
  reportDlg.showModal();
  box.querySelector("input").focus({ preventScroll: true });
}
const closeReport = () => {
  reportDlg.close();
  const id = reportPostId;
  reportPostId = null;
  if (id) focusPost(id, "[data-menu]");
};
$("#report-cancel")?.addEventListener("click", closeReport);
reportDlg?.addEventListener("click", (e) => {
  if (e.target === reportDlg) closeReport();
}); // the backdrop
reportDlg?.addEventListener("cancel", (e) => {
  e.preventDefault();
  closeReport();
}); // Esc
$("#report-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const reason = $("#report-reasons input:checked")?.value;
  if (!reason) {
    $("#report-error").textContent = "Pick a reason.";
    return;
  }
  const r = reportPost(storage, { postId: reportPostId, by: me.id, byName: me.name, reason, note: $("#report-note").value });
  if (!r.ok && r.reason !== "already") {
    $("#report-error").textContent = r.reason === "save_failed" ? "Could not save your report. Try again." : "That report could not be sent.";
    return;
  }
  toast(r.ok ? "Thanks. The property team will review it." : "You already reported this post.");
  render(); // the menu item now says "Reported"
  closeReport();
});
// The (i) beside "Privacy mode on": the long sentence lives in the window, the banner stays one short line.
$("#privacy-info")?.addEventListener("click", (e) =>
  openInfo(e.currentTarget, "Privacy mode", ["Phone, email, unit and plates are masked.", "Tap a masked value to reveal it for 10 seconds. Each reveal is logged."]),
);
// The (i) beside "Your standing": the rules of strikes in a window, so a resident can learn them before they ever need them.
const strikesInfo = $("#strikes-info");
let strikesInfoOpener = null;
// The (i) window: a title and a short list. One window for every (i) of Social (strikes on a resident's record, the Rules form).
function openInfo(opener, title, lines, { guidelines = false } = {}) {
  strikesInfoOpener = opener;
  $("#strikes-info-title").textContent = title;
  $("#strikes-info-guidelines").hidden = !guidelines;
  const ul = $("#strikes-info-list");
  clear(ul);
  for (const text of lines) {
    const li = document.createElement("li");
    li.textContent = text;
    ul.appendChild(li);
  }
  strikesInfo.showModal();
  $("#strikes-info-title").focus({ preventScroll: true });
}
function openStrikesInfo(opener, limit) {
  return openInfo(
    opener,
    "How strikes work",
    [
      "A heavy ban from the property team is one strike. During it you cannot use Social at all.",
      "A light pause is a reminder: you can still read Social, with the clock shown, but you cannot comment, reply, react or share. It is not a strike.",
      "A warning is recorded too, but it is not a strike and pauses nothing.",
      "When the clock reaches zero you press Resume Social, and read the guidelines again.",
      `At ${limit} strikes your account is closed for review. It stays closed until the property team reopens it.`,
      "When they reopen it, those strikes are kept as a folder under History and your count starts again from none. Nothing is deleted.",
    ],
    { guidelines: true },
  );
}
$("#strikes-info-close").addEventListener("click", () => strikesInfo.close());
$("#strikes-info-ok").addEventListener("click", () => strikesInfo.close());
$("#strikes-info-guidelines").addEventListener("click", () => {
  strikesInfoOpener = null;
  strikesInfo.close();
  openGuidelines(false);
});
strikesInfo.addEventListener("click", (e) => {
  if (e.target === strikesInfo) strikesInfo.close();
});
strikesInfo.addEventListener("close", () => {
  if (strikesInfoOpener && strikesInfoOpener.isConnected) strikesInfoOpener.focus({ preventScroll: true });
});

// One violation as a card: why, when, the comment, the rule, the note, what it did, and which strike it was (and which folder it was kept in).
function vioCard(v, limit, blocks, folderNumber, staffView = false) {
  const li = tpl("t-vio-card");
  if (staffView) {
    // Inside a resident's row on the Staff page the record is a section of that row, not a card of its own (a card inside a card), and its title is one level
    // under the resident's name.
    li.dataset.flat = "";
    const old = $("[data-title]", li);
    const h = document.createElement("h4");
    h.className = old.className;
    h.setAttribute("data-title", "");
    old.replaceWith(h);
  }
  $("[data-title]", li).textContent = v.label;
  $("[data-status]", li).appendChild(
    v.active
      ? badge(v.kind === "light" ? "Light pause now" : "Banned now", "danger")
      : isHold(v)
        ? badge(v.lifted ? "Lifted early" : `${dayWord(v.until - v.t)} pause · ended`, "neutral")
        : badge("Warning", "warning"),
  );
  const t = $("[data-time]", li);
  t.textContent = longDate(v.t);
  t.dateTime = iso(v.t);
  $("[data-quote]", li).textContent = staffView && !v.manual ? `“${v.quote}”` : quoteLine(v);
  $("[data-where]", li).textContent = v.postBy ? `On ${v.postBy}’s post “${clip(v.postText || "", 70)}”` : "";
  const rule = ruleFor(v.reason, blocks);
  $("[data-rule]", li).textContent = rule ? `Guideline “${rule.title}”${rule.text ? `: ${rule.text}` : ""}` : "";
  $("[data-note]", li).textContent = v.note ? `${staffView ? "Note" : "Note from the property team"}: “${v.note}”` : "";
  const lifted = v.lifted ? ` Lifted early on ${longDate(v.lifted.t)}${staffView && v.lifted.by ? ` by ${v.lifted.by}` : ""}.` : "";
  $("[data-outcome]", li).textContent =
    v.kind === "light"
      ? staffView
        ? `Light pause until ${longDate(v.until)}: can read, cannot write.${lifted}`
        : `You can read Social but not write until ${longDate(v.until)}.${lifted}`
      : isHold(v)
        ? staffView
          ? v.active
            ? `Banned until ${longDate(v.until)}.`
            : `Banned until ${longDate(v.until)}.${lifted}`
          : v.active
            ? `Your activity is paused until ${longDate(v.until)}.`
            : `Your activity was paused until ${longDate(v.until)}.${lifted}`
        : staffView
          ? "A warning: nothing was paused."
          : "This was a warning: nothing was paused.";
  $("[data-strike]", li).textContent = v.kind === "warning" ? "A warning is not a strike." : v.kind === "light" ? "A light pause is not a strike." : strikeWords(v, limit, folderNumber);
  return li;
}

let violationsTab = "strikes";
let violationsQuery = "";
// A resident's record, in two tabs: Strikes (the run they are on: up to three strikes, and the warnings since) and History (a folder for every three strikes Staff
// have sealed when they reopened the account, and the warnings from before). A search button filters whichever tab is open. Reading it counts as reading the
// notices. Nothing is ever dropped: when Staff reopen the account the three marks empty, and the folder keeps the records.
function pageViolations(host) {
  host.appendChild(pageHead("Violations", "Your record in Social"));
  for (const v of noticesOf(storage, me.id)) if (!v.active) ackNotice(storage, me.id, v.id); // reading the record is reading the notices
  const st = standing();
  const g = guidelines(storage);
  const lastOpened = st.folders.length ? st.folders[0].t : 0; // warnings from before the last reopening are history
  const run = st.items.filter((v) => v.counting || (v.kind !== "pause" && v.t > lastOpened));
  const earlierWarnings = st.items.filter((v) => v.kind !== "pause" && v.t <= lastOpened);

  // How they stand: one card. With nothing recorded it says so plainly (a full meter of empty segments says nothing).
  const info = tpl("t-info-btn");
  info.setAttribute("aria-label", "How strikes work");
  info.addEventListener("click", () => openStrikesInfo(info, st.limit));
  const stand = infoCard("Your standing", [info]);
  const body = $("[data-body]", stand);
  if (st.count || st.folders.length || st.items.length) body.appendChild(strikeMeter(Math.min(st.count, st.limit), st.limit));
  const words = st.atLimit
    ? `You have reached ${st.limit} strikes. The property team reviews your account.`
    : st.count
      ? `${st.limit - st.count} more and your account is closed for review.`
      : st.folders.length
        ? `Your count started again from none. Your earlier strikes are kept under History (${st.folders.length} ${st.folders.length === 1 ? "folder" : "folders"}).`
        : st.items.length
          ? "No strike counts right now."
          : "You are in good standing. Nothing has been recorded on your account.";
  const p = document.createElement("p");
  p.className = "text-sm text-muted-foreground";
  p.textContent = words;
  body.appendChild(p);
  host.appendChild(stand);

  // The tabs [Strikes] [History], and at their end the search button.
  const bar = document.createElement("div");
  bar.className = "flex items-center gap-step-sm";
  const tabs = tabBar(
    [
      ["strikes", `Strikes · ${st.count}`],
      ["history", `History · ${st.folders.length}`],
    ],
    violationsTab,
    (id) => {
      violationsTab = id;
      renderPage();
    },
  );
  tabs.classList.add("min-w-0", "flex-1");
  bar.appendChild(tabs);
  const sbtn = tpl("t-search-btn");
  sbtn.setAttribute("aria-label", "Search your violations");
  sbtn.setAttribute("aria-expanded", String(!!violationsQuery));
  bar.appendChild(sbtn);
  host.appendChild(bar);
  const row = tpl("t-vsearch");
  const input = $("input", row);
  input.value = violationsQuery;
  row.hidden = !violationsQuery;
  host.appendChild(row);
  sbtn.addEventListener("click", () => {
    const open = row.hidden;
    row.hidden = !open;
    sbtn.setAttribute("aria-expanded", String(open));
    if (open) input.focus();
    else {
      input.value = "";
      violationsQuery = "";
      drawList();
    }
  });

  const box = document.createElement("div");
  box.className = "flex flex-col gap-step-md";
  host.appendChild(box);
  const hay = (v, extra = "") => `${v.label} ${v.kind} ${v.quote} ${v.note || ""} ${v.rule || ""} ${v.postBy || ""} ${v.postText || ""} ${extra}`.toLowerCase();
  function drawList() {
    clear(box);
    const q = violationsQuery.trim().toLowerCase();
    const cards = (items, number) => {
      const ul = document.createElement("ul");
      ul.setAttribute("role", "list");
      ul.className = "flex flex-col gap-step-md";
      for (const v of items) ul.appendChild(vioCard(v, st.limit, g.blocks, number));
      return ul;
    };
    let shown = 0;
    if (violationsTab === "strikes") {
      const items = run.filter((v) => !q || hay(v).includes(q));
      shown = items.length;
      if (items.length) box.appendChild(cards(items));
      else if (!q) box.appendChild(note(st.items.length || st.folders.length ? "Nothing in your current count." : "Nothing recorded. Comments you write follow the community guidelines."));
    } else {
      const folders = st.folders
        .map((f) => ({ f, items: f.items.filter((v) => !q || hay(v, `folder ${f.number}`).includes(q)) }))
        .filter((x) => !q || x.items.length || `folder ${x.f.number}`.includes(q));
      const ul = document.createElement("ul");
      ul.setAttribute("role", "list");
      ul.className = "flex flex-col gap-step-md";
      for (const { f, items } of folders) {
        const li = tpl("t-folder");
        const toggle = $("[data-toggle]", li);
        const panel = $("[data-panel]", li);
        $("[data-title]", li).textContent = `Folder ${f.number}`;
        $("[data-sub]", li).textContent = `${f.items.length} strikes · reopened ${shortDate(f.t)}`;
        $("[data-note]", li).textContent = `Reopened on ${longDate(f.t)}. These ${f.items.length} strikes are kept here.`;
        $("[data-cards]", li).appendChild(cards(q ? items : f.items, f.number));
        const open = !!q; // a search opens the folders it found something in
        panel.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", `Folder ${f.number}, ${f.items.length} strikes, reopened ${shortDate(f.t)}`);
        toggle.addEventListener("click", () => {
          const on = panel.hidden;
          panel.hidden = !on;
          toggle.setAttribute("aria-expanded", String(on));
        });
        ul.appendChild(li);
        shown += 1;
      }
      if (folders.length) box.appendChild(ul);
      const warns = earlierWarnings.filter((v) => !q || hay(v).includes(q));
      if (warns.length) {
        const h = document.createElement("h3");
        h.className = "pt-step-sm text-sm font-medium text-foreground-secondary";
        h.textContent = "Earlier warnings";
        box.appendChild(h);
        box.appendChild(cards(warns));
        shown += warns.length;
      }
      if (!folders.length && !warns.length && !q)
        box.appendChild(note(`No folders yet. When the property team reopens your account after ${st.limit} strikes, those strikes are kept here as a folder.`));
    }
    if (q && !shown) box.appendChild(note(`Nothing matches “${violationsQuery.trim()}”.`));
  }
  input.addEventListener("input", () => {
    violationsQuery = input.value;
    drawList();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      input.value = "";
      violationsQuery = "";
      row.hidden = true;
      sbtn.setAttribute("aria-expanded", "false");
      drawList();
      sbtn.focus();
    }
  });
  drawList();
}

/* ---------------------------------------------------- Violations, as Staff see it: the people, the strike monitor, and the rules */

// What the page remembers while Staff work in it: the tab, the search and the filter, and which residents are open.
const sv = { tab: "residents", q: "", status: "all", reason: "all", sort: "strikes", open: new Set() };
const SV_STATUS = [
  ["all", "All residents"],
  ["review", "Under review"],
  ["paused", "Paused now"],
  ["awaiting", "Awaiting Resume"],
  ["strikes", "With strikes"],
  ["clear", "In good standing"],
];
const SV_SORT = [
  ["strikes", "Most strikes"],
  ["recent", "Most recent record"],
  ["name", "Name"],
];
const svFilters = () => (sv.status !== "all") + (sv.reason !== "all") + (sv.sort !== "strikes");

// The filter window: status, reason, sort. Each change applies at once (`svChanged`), so there is nothing to confirm; Done only closes it.
const svDlg = $("#sv-filter");
let svChanged = () => {};
let svOpener = null;
function fillSvFilter() {
  const radios = (host, name, items, key) => {
    clear(host);
    for (const [id, label] of items) {
      const row = tpl("t-vio-choice");
      const input = $("input", row);
      input.name = name;
      input.value = id;
      input.checked = sv[key] === id;
      $("[data-label]", row).textContent = label;
      input.addEventListener("change", () => {
        sv[key] = id;
        svChanged();
      });
      host.appendChild(row);
    }
  };
  radios($("#sv-status"), "sv-status", SV_STATUS, "status");
  radios($("#sv-sort"), "sv-sort", SV_SORT, "sort");
  const sel = $("#sv-reason");
  clear(sel);
  for (const [id, label] of [["all", "All reasons"], ...REASONS.map((r) => [r.id, r.label])]) {
    const o = document.createElement("option");
    o.value = id;
    o.textContent = label;
    sel.appendChild(o);
  }
  sel.value = sv.reason;
}
$("#sv-reason").addEventListener("change", (e) => {
  sv.reason = e.target.value;
  svChanged();
});
$("#sv-filter-reset").addEventListener("click", () => {
  Object.assign(sv, { status: "all", reason: "all", sort: "strikes" });
  fillSvFilter();
  svChanged();
});
$("#sv-filter-close").addEventListener("click", () => svDlg.close());
$("#sv-filter-ok").addEventListener("click", () => svDlg.close());
svDlg.addEventListener("click", (e) => {
  if (e.target === svDlg) svDlg.close();
});
svDlg.addEventListener("close", () => {
  if (svOpener && svOpener.isConnected) svOpener.focus({ preventScroll: true });
});

function pageViolationsStaff(host) {
  host.appendChild(pageHead("Violations", "Residents’ record, strikes and the rules"));
  host.appendChild(
    tabBar(
      [
        ["residents", "Residents"],
        ["rules", "Rules"],
      ],
      sv.tab,
      (id) => {
        sv.tab = id;
        renderPage();
      },
    ),
  );
  if (sv.tab === "rules") {
    host.appendChild(rulesForm());
    return;
  }

  const now = Date.now();
  const people = staffStore.standings(storage, now);
  const g = guidelines(storage);
  const root = tpl("t-sv-layout");
  host.appendChild(root);
  const tiles = $("[data-tiles]", root);
  const list = $("[data-list]", root);
  const empty = $("[data-empty]", root);
  const summary = $("[data-summary]", root);
  const q = $("[data-q]", root);
  q.value = sv.q;
  const count = { review: 0, paused: 0, awaiting: 0, strikes: 0 };
  for (const p of people) {
    if (count[p.status] !== undefined) count[p.status] += 1;
    if (p.count > 0) count.strikes += 1;
  }

  // The strike monitor: four tiles, each a number and a button that filters the list to it.
  function drawTiles() {
    clear(tiles);
    for (const [id, label] of [
      ["review", "Under review"],
      ["paused", "Paused now"],
      ["awaiting", "Awaiting Resume"],
      ["strikes", "With strikes"],
    ]) {
      const b = tpl("t-sv-tile");
      $("[data-n]", b).textContent = String(count[id]);
      $("[data-label]", b).textContent = label;
      if (!count[id]) b.dataset.zero = ""; // a tile with nothing in it is quieter than one with work for you
      b.setAttribute("aria-pressed", String(sv.status === id));
      b.setAttribute("aria-label", `${label}: ${count[id]}`);
      b.addEventListener("click", () => {
        sv.status = sv.status === id ? "all" : id;
        drawTiles();
        drawFilter();
        drawList();
      });
      tiles.appendChild(b);
    }
  }

  // The filter button, with how many filters are on.
  const slot = $("[data-filter-slot]", root);
  function drawFilter() {
    clear(slot);
    const b = tpl("t-filter-btn");
    const n = svFilters();
    b.setAttribute("aria-label", n ? `Filter residents, ${n} on` : "Filter residents");
    const badgeEl = $("[data-count]", b);
    badgeEl.hidden = !n;
    badgeEl.textContent = String(n);
    b.addEventListener("click", () => {
      svOpener = b;
      svChanged = () => {
        drawTiles();
        drawFilter();
        drawList();
      };
      fillSvFilter();
      svDlg.showModal();
      $("#sv-filter-title").focus({ preventScroll: true });
    });
    slot.appendChild(b);
  }

  const action = (box, label, tone, fn) => {
    const b = tpl("t-sv-act");
    b.textContent = label;
    if (tone) b.dataset.tone = tone;
    b.addEventListener("click", () => fn(b));
    box.appendChild(b);
  };
  const folderItem = (f, p) => {
    const li = tpl("t-folder");
    li.dataset.flat = ""; // outlined, not a card inside the resident's card
    const toggle = $("[data-toggle]", li);
    const panel = $("[data-panel]", li);
    panel.id = `sv-folder-${f.id}`;
    toggle.setAttribute("aria-controls", panel.id);
    $("[data-title]", li).textContent = `Folder ${f.number}`;
    $("[data-sub]", li).textContent = `${f.items.length} strikes · opened ${shortDate(f.t)}`;
    $("[data-note]", li).textContent = `Opened on ${longDate(f.t)}. These ${f.items.length} strikes are kept here.`;
    for (const v of f.items) $("[data-cards]", li).appendChild(vioCard(v, p.limit, g.blocks, f.number, true));
    toggle.setAttribute("aria-label", `Folder ${f.number}, ${f.items.length} strikes, opened ${shortDate(f.t)}`);
    toggle.addEventListener("click", () => {
      const on = panel.hidden;
      panel.hidden = !on;
      toggle.setAttribute("aria-expanded", String(on));
    });
    return li;
  };

  function row(p) {
    const li = tpl("t-sv-row");
    const toggle = $("[data-toggle]", li);
    const panel = $("[data-panel]", li);
    $("[data-avatar]", li).textContent = initials(p.name);
    $("[data-name]", li).textContent = p.name;
    const [stText, stTone] = { review: ["Under review", "danger"], paused: ["Paused", "danger"], awaiting: ["Awaiting Resume", "warning"], clear: ["Good standing", "neutral"] }[p.status];
    $("[data-status]", li).appendChild(badge(stText, stTone));
    $("[data-sub]", li).textContent = [p.unit, p.latest ? `Last: ${p.latest.label}, ${shortDate(p.latest.t)}` : "No record"].filter(Boolean).join(" · ");
    const words = `${p.count} of ${p.limit} strikes`;
    $("[data-meter]", li).appendChild(strikeMeter(Math.min(p.count, p.limit), p.limit, words));
    const open = sv.open.has(p.who);
    panel.hidden = !open;
    panel.id = `sv-panel-${p.who.replace(/[^a-z0-9]/gi, "-")}`;
    toggle.setAttribute("aria-controls", panel.id);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", `${p.name}, ${stText}, ${words}`);
    toggle.addEventListener("click", () => {
      const on = panel.hidden;
      panel.hidden = !on;
      toggle.setAttribute("aria-expanded", String(on));
      if (on) sv.open.add(p.who);
      else sv.open.delete(p.who);
    });

    const lastOpened = p.folders.length ? p.folders[0].t : 0;
    const run = p.items.filter((v) => v.counting || (v.kind !== "pause" && v.t > lastOpened));
    const earlier = p.items.filter((v) => v.kind !== "pause" && v.t <= lastOpened);
    $("[data-note]", li).textContent = {
      review: `${p.count} strikes. The account is closed until you open it.`,
      paused: `Banned until ${longDate(p.until)}.`,
      awaiting: `The ban is over. Waiting for ${p.name} to press Resume.`,
      clear: p.count ? `${p.limit - p.count} more and the account closes for review.` : p.items.length ? "No strike counts right now." : "Nothing recorded.",
    }[p.status];
    const actions = $("[data-actions]", li);
    if (p.status !== "review" && allowed(me.title, "pause")) action(actions, "Ban", "", (b) => openViolation(null, renderPage, b, { who: p.who, name: p.name, kind: "pause" }));
    if (allowed(me.title, "warn")) action(actions, "Warn", "", (b) => openViolation(null, renderPage, b, { who: p.who, name: p.name, kind: "warning" }));
    // A plain switch for one resident, not a violation and not a strike: Social is closed for them (they keep Messages) until it is turned back on.
    const socialOff = staffStore.residentSocialOff(storage, p.who);
    if (allowed(me.title, "switchOff"))
      action(actions, socialOff ? "Turn on Social" : "Turn off Social", "", () => {
        if (tell(staffStore.setResidentSocial(storage, p.who, socialOff, me.title)).ok) {
          toast(socialOff ? `${p.name} can use Social again.` : `Social is off for ${p.name}. Messages still work.`);
          renderPage();
        }
      });
    if (p.status === "paused") {
      action(actions, "Unban", "", async (b) => {
        const yes = await askConfirm({
          title: `Unban ${p.name}?`,
          body: `The ban stops now and the strike stays on the record. ${p.name} presses Resume and reads the guidelines again before coming back.`,
          ok: "Unban",
          calm: true,
        });
        if (!yes) {
          b.focus({ preventScroll: true });
          return;
        }
        if (tell(staffStore.unbanResident(storage, p.who, Date.now(), me.name)).ok) {
          toast(`${p.name} is unbanned. They press Resume to come back.`);
          renderPage();
        }
      });
    }
    if (p.status === "review") {
      action(actions, "Open account", "primary", async (b) => {
        const yes = await askConfirm({
          title: `Open ${p.name}’s account?`,
          body: `Their ${p.count} strikes are kept as a folder in their history, their count starts again from none, and nothing is deleted. They read the guidelines again before they come back.`,
          ok: "Open account",
          calm: true,
        });
        if (!yes) {
          b.focus({ preventScroll: true });
          return;
        }
        if (tell(staffStore.openAccount(storage, p.who)).ok) {
          toast(`${p.name}’s account is open. Their ${p.count} strikes are in a folder.`);
          renderPage();
        }
      });
    }
    for (const v of [...run, ...earlier]) $("[data-cards]", li).appendChild(vioCard(v, p.limit, g.blocks, undefined, true));
    for (const f of p.folders) $("[data-folders]", li).appendChild(folderItem(f, p));
    return li;
  }

  function drawList() {
    clear(list);
    clear(empty);
    const shown = staffStore.filterStandings(people, { q: sv.q, status: sv.status, reason: sv.reason, sort: sv.sort });
    for (const p of shown) list.appendChild(row(p));
    const narrowed = sv.q.trim() || sv.status !== "all" || sv.reason !== "all";
    summary.textContent = narrowed ? `${shown.length} of ${people.length} residents` : "";
    if (!shown.length) empty.appendChild(note(narrowed ? "No resident matches. Clear the search or the filter." : "No residents yet."));
  }
  q.addEventListener("input", () => {
    sv.q = q.value;
    drawList();
  });
  q.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && q.value) {
      e.preventDefault();
      e.stopPropagation();
      q.value = "";
      sv.q = "";
      drawList();
    }
  });
  drawTiles();
  drawFilter();
  drawList();
}

// The Rules tab: how strikes, pauses and notes work. Saving checks the values again (moderation.js `checkRules`) and every window and clock reads them afterwards.
function rulesForm() {
  const rs = staffStore.rules(storage);
  const form = tpl("t-rules");
  const field = (n) => $(`[data-field="${n}"]`, form);
  // Long explanations live behind an (i): the page keeps one short line.
  const INFO = {
    strikes: [
      "About strikes",
      [
        "Only a heavy ban is a strike. A light pause and a warning are not.",
        "At this many strikes the account closes until you open it. Choose 3, 5, 7 or your own number from 2 to 10.",
        "Raising the number reopens an account that was only at the old limit; lowering it closes one that already has that many.",
      ],
    ],
    pause: [
      "About pause time",
      [
        "Every light pause and heavy ban must last between the shortest and the longest time set here.",
        "A ban never ends by itself: when the clock reaches zero the resident presses Resume and reads the guidelines again.",
      ],
    ],
    first: [
      "About the first action",
      [
        "This is what the Ban or Warn window starts on when you choose a reason. You can still change it each time.",
        "Heavy ban: one strike, and the resident cannot use Social until the clock ends.",
        "Light pause: the resident can still read, but cannot comment, reply, react or share. Not a strike.",
        "Warning only: the resident is told. Nothing is paused.",
      ],
    ],
  };
  for (const slot of form.querySelectorAll("[data-info]")) {
    const [title, lines] = INFO[slot.dataset.info];
    const b = tpl("t-info-btn");
    b.setAttribute("aria-label", title);
    b.addEventListener("click", () => openInfo(b, title, lines));
    slot.appendChild(b);
  }
  const limit = field("limit");
  // Strikes before review: 3, 5 or 7 in one click, or a number of their own (2 to 10).
  const limitCustom = field("limitCustom");
  const presets = [3, 5, 7];
  for (const n of presets) {
    const o = document.createElement("option");
    o.value = String(n);
    o.textContent = `${n} strikes`;
    limit.appendChild(o);
  }
  {
    const o = document.createElement("option");
    o.value = "custom";
    o.textContent = "Custom…";
    limit.appendChild(o);
  }
  limitCustom.min = String(RULE_LIMITS.limit[0]);
  limitCustom.max = String(RULE_LIMITS.limit[1]);
  limitCustom.setAttribute("aria-label", `Custom number of strikes, ${RULE_LIMITS.limit[0]} to ${RULE_LIMITS.limit[1]}`);
  const syncLimit = () => {
    limitCustom.hidden = limit.value !== "custom";
    if (!limitCustom.hidden && !limitCustom.value) limitCustom.value = String(rs.limit);
  };
  if (presets.includes(rs.limit)) limit.value = String(rs.limit);
  else {
    limit.value = "custom";
    limitCustom.value = String(rs.limit);
  }
  syncLimit();
  limit.addEventListener("change", () => {
    syncLimit();
    if (!limitCustom.hidden) limitCustom.focus();
  });
  const limitValue = () => Number(limit.value === "custom" ? limitCustom.value : limit.value);
  field("minPauseMin").value = String(rs.minPauseMin);
  field("maxPauseDays").value = String(rs.maxPauseDays);
  field("requireNote").checked = rs.requireNote;
  const rows = [];
  for (const r of REASONS) {
    const li = tpl("t-rule-row");
    $("[data-label]", li).textContent = r.label;
    const kind = $("[data-kind]", li);
    for (const k of VIO_KINDS) {
      const o = document.createElement("option");
      o.value = k.id;
      o.textContent = k.id === "pause" ? "Heavy ban" : k.id === "light" ? "Light pause" : "Warning only";
      kind.appendChild(o);
    }
    const d = rs.defaults[r.id];
    const hours = $("[data-hours]", li);
    // Each field says which reason it is for: six identical "First action" fields cannot be told apart by a screen reader.
    kind.setAttribute("aria-label", `First action for ${r.label}`);
    hours.setAttribute("aria-label", `Pause length in hours for ${r.label}`);
    kind.value = d.kind;
    hours.value = String(d.hours || 24);
    // A warning has no length: the box is not shown (a greyed "24" would read as a pause of 24 hours).
    const syncHours = () => {
      hours.closest("label").hidden = kind.value === "warning";
    };
    syncHours();
    kind.addEventListener("change", syncHours);
    $("[data-rows]", form).appendChild(li);
    rows.push([r.id, kind, hours]);
  }
  $("[data-by]", form).textContent = rs.t ? `Last changed by ${rs.by || "Staff"} on ${longDate(rs.t)}.` : "These are the default rules.";
  // A wrong value is marked on its own field, described by the message, and takes the focus; it clears when the field is changed.
  const err = $("[data-error]", form);
  const fieldOf = (key) => {
    const [what, id] = key.split(":");
    const row = rows.find((x) => x[0] === id);
    return row ? (what === "kind" ? row[1] : row[2]) : what === "limit" && !limitCustom.hidden ? limitCustom : field(what);
  };
  const clearInvalid = () => {
    for (const el of form.querySelectorAll("[aria-invalid]")) {
      el.removeAttribute("aria-invalid");
      el.removeAttribute("aria-describedby");
    }
    err.textContent = "";
  };
  form.addEventListener("input", clearInvalid);
  form.addEventListener("change", clearInvalid);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearInvalid();
    const defaults = {};
    for (const [id, kind, hours] of rows) defaults[id] = { kind: kind.value, hours: kind.value !== "warning" ? Number(hours.value) : 0 };
    const res = staffStore.saveRules(
      storage,
      {
        limit: limitValue(),
        minPauseMin: Number(field("minPauseMin").value),
        maxPauseDays: Number(field("maxPauseDays").value),
        requireNote: field("requireNote").checked,
        defaults,
        byTitle: me.title,
      },
      me.name,
    );
    if (!res.ok) {
      err.textContent = res.reason;
      const bad = res.field && fieldOf(res.field);
      if (bad) {
        bad.setAttribute("aria-invalid", "true");
        bad.setAttribute("aria-describedby", "rules-error");
        bad.focus();
        bad.scrollIntoView({ block: "center" });
      }
      return;
    }
    toast("Rules saved. They apply from now on.");
    renderPage();
  });
  $("[data-reset]", form).addEventListener("click", async (e) => {
    const b = e.currentTarget;
    const yes = await askConfirm({
      title: "Reset to the default rules?",
      body: "Three strikes, pauses from 15 minutes to 90 days, and the usual first action for each reason. Records already made are not changed.",
      ok: "Reset rules",
      calm: true,
    });
    if (!yes) {
      b.focus({ preventScroll: true });
      return;
    }
    if (tell(staffStore.resetRules(storage)).ok) {
      toast("Rules are back to the defaults.");
      renderPage();
    }
  });
  return form;
}

function pageGuidelines(host) {
  const g = guidelines(storage);
  host.appendChild(pageHead("Community guidelines", `Version ${g.ver} · published ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(g.pub))} by ${g.by}`));
  const c = infoCard("What residents and staff agree to");
  for (const [title, text] of g.blocks) {
    const b = tpl("t-block");
    $("[data-title]", b).textContent = title;
    $("[data-text]", b).textContent = text;
    $("[data-body]", c).appendChild(b);
  }
  host.appendChild(c);
}

function pageModeration(host, all) {
  host.appendChild(pageHead("Moderation", "Keep Social friendly for residents and staff."));
  const groups = openReports(storage);
  const rep = infoCard(groups.length ? `Reported posts · ${groups.length}` : "Reported posts");
  if (!groups.length) $("[data-body]", rep).appendChild(note("Nothing to review right now."));
  else {
    const ul = document.createElement("ul");
    ul.setAttribute("role", "list");
    for (const g of groups) {
      const post = all.find((x) => String(x.id) === String(g.postId));
      const row = tpl("t-report-row");
      $("[data-title]", row).textContent = post ? `${post.name}${post.kind ? ` · ${post.kind}` : ""}` : "A post that is no longer available";
      $("[data-excerpt]", row).textContent = post ? clip(post.text || "", 160) : "";
      const latest = g.latest;
      $("[data-meta]", row).textContent =
        `${reportReasonLabel(latest.reason)} · ${g.count === 1 ? `reported by ${latest.byName}` : `${g.count} people reported it, latest ${latest.byName}`}${latest.note ? ` · “${latest.note}”` : ""}`;
      const acts = $("[data-actions]", row);
      const dismiss = tpl("t-sv-act");
      dismiss.textContent = "Dismiss";
      dismiss.setAttribute("aria-label", `Dismiss the report${g.count === 1 ? "" : "s"} on this post`);
      dismiss.addEventListener("click", () => {
        closeReports(storage, g.postId, "dismissed", me.name);
        toast("Report dismissed. The post stays.");
        renderPage();
      });
      acts.appendChild(dismiss);
      if (post) {
        const remove = tpl("t-sv-act");
        remove.textContent = "Remove post";
        let armed = 0;
        remove.addEventListener("click", () => {
          // taking a neighbor's post down is not undone: the first press asks, the second does it
          if (!armed) {
            armed = setTimeout(() => {
              armed = 0;
              remove.textContent = "Remove post";
            }, 4000);
            remove.textContent = "Confirm remove";
            return;
          }
          clearTimeout(armed);
          const res = staffStore.deletePost(storage, g.postId, { any: true });
          if (res.ok) {
            closeReports(storage, g.postId, "removed", me.name);
            toast("Post removed.");
          } else toast(res.reason || "Could not remove the post.");
          renderPage();
        });
        acts.appendChild(remove);
      }
      ul.appendChild(row);
    }
    $("[data-body]", rep).appendChild(ul);
  }
  host.appendChild(rep);
  // Moderation is for what is reported and what is muted. People (strikes, bans, accounts under review) are on the Violations page; a line here points there
  // while an account waits.
  const review = staffStore.accountsUnderReview(storage);
  if (review.length) {
    const rc = infoCard(`Accounts waiting for you · ${review.length}`, []);
    const p = document.createElement("p");
    p.className = "text-sm text-muted-foreground";
    p.textContent = `${review.map((a) => a.name).join(", ")} ${review.length === 1 ? "has" : "have"} reached the strike limit. Open ${review.length === 1 ? "the account" : "the accounts"} on the Violations page.`;
    $("[data-body]", rc).appendChild(p);
    const go = tpl("t-sv-act");
    go.textContent = "Go to Violations";
    go.dataset.tone = "primary";
    go.classList.add("self-start");
    go.addEventListener("click", () => {
      sv.tab = "residents";
      sv.status = "review";
      location.hash = "#/violations";
    });
    $("[data-body]", rc).appendChild(go);
    host.appendChild(rc);
  }
  const m = staffStore.muted(storage);
  const nameOf = (key) => all.find((x) => x.by === key)?.name || key;
  const rows = [
    ...m.people.map((v) => ({ kind: "people", value: v, label: nameOf(v), what: "Person" })),
    ...m.kw.map((v) => ({ kind: "kw", value: v, label: `“${v}”`, what: "Word" })),
    ...m.threads.map((v) => ({ kind: "threads", value: v, label: clip(all.find((x) => x.id === v)?.text || v, 70), what: "Thread" })),
  ];
  const c = infoCard("Muted by you");
  if (!rows.length) $("[data-body]", c).appendChild(note("You have not muted anything. Posts from muted people, words and threads are held back from your feed."));
  else {
    const ul = document.createElement("ul");
    ul.setAttribute("role", "list");
    ul.className = "flex flex-col divide-y divide-border";
    for (const r of rows) {
      const li = tpl("t-muted-row");
      $("[data-label]", li).textContent = r.label;
      $("[data-kind]", li).textContent = r.what;
      const b = $("[data-unmute]", li);
      b.setAttribute("aria-label", `Unmute ${r.label}`);
      b.addEventListener("click", () => {
        staffStore.unmute(storage, r.kind, r.value);
        toast("Unmuted");
        renderPage();
      });
      ul.appendChild(li);
    }
    $("[data-body]", c).appendChild(ul);
  }
  host.appendChild(c);
}

/* ------------------------------------------------------------------- live */

// Staff publish, change the guidelines or switch Social in another tab: look again.
addEventListener("storage", (e) => {
  if (e.key && !/^eso-(feed|mod|social|res-social)/.test(e.key)) return;
  start();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) start();
});

// Look again only when something that shows on the page has changed, so coming back to the tab never rebuilds the cards
// under someone who is typing a reply, and the guidelines box keeps its tick while it is being read.
let seen = "";
const isGated = () => !staff && socialOn(storage) && residentState(storage, me.id).show && needsGuidelines(storage, me.id) && !pausedNow();
const signature = () =>
  JSON.stringify([
    socialOn(storage),
    canReply(storage),
    pausedNow() ? [pausedNow().until, pausedNow().ended] : 0,
    staff ? 0 : noticesOf(storage, me.id),
    isGated(),
    guidelines(storage),
    getTimeline(),
    residentState(storage, me.id).show,
    strikeLimit(storage),
  ]);
function start() {
  const gated = isGated();
  if (signature() === seen) return;
  render(); // render() also records what it showed, so a re-render it caused itself is never repeated
  if (threadDlg.open) drawThread(); // somebody answered while the replies window is open
  if (gl.open) {
    if (gated) fillGuidelines();
    else {
      gate = false;
      gl.close();
    }
  } // the policy changed or was accepted elsewhere while it was open
}
start();
if (routeOf() !== "feed") showView(routeOf()); // opened on a page of the menu (a link or a reload)
syncChrome(); // opened on a single post (a link or a reload): the header says "Post" and shows Back
