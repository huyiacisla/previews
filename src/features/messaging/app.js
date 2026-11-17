// DOM controller for the Messages pages. All markup and Tailwind classes come from
// partials/messages-app.html templates; this file only clones them, fills text and toggles data-* / hidden.

import { companyPrefs } from "../../shared/js/company-prefs.js";
import { exitTarget } from "../../shared/js/exit-target.js";
import { readPrefs } from "../settings/prefs.js";
import { EMOJI_CATEGORIES, QUICK_REACTIONS, searchEmoji } from "./emoji.js";
import { duration, formatBytes, formatFull, formatTime, groupByDay, listTime } from "./format.js";
import { initials, PERSONAS, PORTALS, pickPersona } from "./personas.js";
import { describeFilters, FILTER_KEYS, isEmptyQuery, matchFilters, matchText, parseQuery, withoutFilter } from "./query.js";
import { decideClaim, decisionText } from "../promotions/decide.js";
import { allRecords, claimStatus, claimSteps, historyFor, householdClaims, listPromotions, maskCode, residentState, rewardGroup, rewardInfo, unitBlocks, unitHistory, unitMates } from "../promotions/store.js";
import { fold } from "./fold.js";
import { createStore, notifies, STAGE_LABEL, STAGES, ticketNo } from "./store.js";
import { clearSideData, createTransport } from "./transport.js";

/* ----------------------------------------------------------------- helpers */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);
const clear = (el) => {
  while (el.firstChild) el.removeChild(el.firstChild);
};
const setIcon = (svg, name) => svg.querySelector("use").setAttribute("href", `#i-${name}`);

const REASONS = {
  empty: "Write a message first.",
  too_long: "That message is too long. Please shorten it.",
  not_found: "This conversation is no longer available.",
  closed: "This conversation is closed.",
  not_member: "You do not have access to this conversation.",
  not_allowed: "Your role cannot do that.",
  not_claimed: "Take this conversation first.",
  one_way: "This is a one-way message. To reply, contact the property team.",
  awaiting_reply: "You can write again once they reply.",
  emergency_open: "An open emergency stays with the property team. Acknowledge it first.",
  role: "Your role cannot do that. Ask a Property Manager.",
  rate_limited: "This resident already has recent messages from the team. Try again later.",
  use_assistant: "Residents start with the assistant.",
  already_taken: "Someone else already took this conversation.",
  not_queued: "This conversation is no longer waiting in the queue.",
  read_only: "Announcements are one-way.",
  storage: "Could not save. Browser storage may be full or blocked.",
  subject_required: "Add a subject.",
  title_required: "Add a title.",
  audience_required: "Choose who should receive it.",
  invalid_emoji: "That is not an emoji.",
  too_late: "You can only edit or remove a message for a few minutes after sending it.",
  too_many_attachments: "Too many attachments for one message.",
  bad_attachment: "That file could not be attached.",
  attachment_too_large: "That file is too large to attach.",
  invalid_reply: "That message can no longer be replied to.",
  same_conversation: "Choose a different conversation.",
  name_required: "Give the group a name.",
  group_too_small: "A group needs at least three people, including you.",
  group_too_large: "A group can have up to 12 people.",
};
REASONS.invalid_flag = "That option is not available.";
const reasonText = (r) => REASONS[r] || "Something went wrong. Please try again.";

const TABS = {
  // "Hidden" ends every list: what a person has put away, with a way to restore it. It only shows when something is hidden.
  resident: [
    ["all", "All"],
    ["announcements", "Announcements"],
    ["hidden", "Hidden"],
  ],
  staff: [
    ["queue", "Queue"],
    ["mine", "Mine"],
    ["clients", "Clients"],
    ["groups", "Groups"],
    ["support", "Support"],
    ["all", "All"],
    ["hidden", "Hidden"],
  ],
  client: [
    ["all", "All"],
    ["staff", "Staff"],
    ["groups", "Groups"],
    ["support", "Support"],
    ["announcements", "Announcements"],
    ["hidden", "Hidden"],
  ],
  admin: [
    ["queue", "Queue"],
    ["mine", "Mine"],
    ["all", "All"],
    ["direct", "Direct"],
    ["resolved", "Resolved"],
    ["announcements", "Sent"],
    ["hidden", "Hidden"],
  ],
};
const DEFAULT_TAB = { resident: "all", staff: "queue", client: "all", admin: "queue" };

const CANNED = {
  staff: [
    "Thanks for reaching out. I am looking into this now.",
    "Could you send your plate number and space number?",
    "I have updated this and it should show shortly.",
    "Thanks for your patience. Is there anything else I can help with?",
  ],
  admin: [
    "Thanks for flagging this. I am taking a look now.",
    "Could you share the property name and a screenshot if possible?",
    "Which page were you on when this happened, and what did you see?",
    "I made a change on our side. Please try again and let me know.",
    "This is fixed. Please reload the page and try again.",
    "Marking this resolved. Reply here any time to reopen it.",
  ],
};

const ROLE_LABEL = { resident: "Resident", staff: "Staff", client: "Client", admin: "Admin", bot: "Assistant" };

/* ------------------------------------------------------------------- mount */

// What the person chose in Settings > Messages (kept with the settings prototype, one copy for each portal). Every switch starts on.
const PROTO_KEY = { staff: "eso-proto", client: "client:eso-proto", resident: "resident:eso-proto", admin: "admin:eso-proto" };
export function messagePref(portal, key, fallback = true) {
  try {
    const s = JSON.parse(localStorage.getItem(PROTO_KEY[portal]));
    return s && s[key] !== undefined ? !!s[key] : fallback;
  } catch {
    return fallback;
  }
}

export function mount({ portal }) {
  if (!PORTALS[portal]) throw new Error(`Unknown portal: ${portal}`);
  const q = new URLSearchParams(location.search);
  const me = pickPersona(portal, q.get("as"));
  const portalInfo = PORTALS[portal];
  const root = $("#app");

  let transport;
  let store;
  try {
    transport = createTransport();
    store = createStore({
      transport,
      config: {
        // Settings > Messages of the Staff person: the SMS after 3 unacknowledged minutes, and the note a resident gets while the status is Away.
        smsOn: () => messagePref("staff", "emSms"),
        botFirst: () => companyPrefs(localStorage).botFirst,
        awayReply: () => {
          let s = null;
          try {
            s = JSON.parse(localStorage.getItem("eso-status") || "null")?.s;
          } catch {
            /* no status: available */
          }
          return messagePref("staff", "msgAway", false) && ["away", "brb"].includes(s) ? "The property team is away right now. Someone will answer as soon as they are back." : null;
        },
      },
    });
  } catch (error) {
    return showError(error);
  }

  const ui = {
    tab: DEFAULT_TAB[portal],
    query: "",
    convId: null,
    pane: "list",
    pending: [], // optimistic outgoing messages
    gate: null, // { convId, since, until } while the assistant "types"
    anchor: null, // { convId, msgId } where "New messages" divider goes
    sigList: "",
    sigThread: "",
    sigLog: "",
    stick: true,
    newBelow: 0,
    confirm: null, // { key, timer } for two-step buttons
    cannedOpen: false,
    seen: new Set(),
    revealed: new Set(), // messages whose time and actions are showing
    quickFor: null, // message whose reaction bar is open
    flash: null,
    reply: null, // { id, who, text } being replied to
    edit: null, // { id, text, prev } while fixing one of your own messages
    menuFor: null, // message whose "more actions" menu is open
    emergency: false, // the next message is sent as an emergency
    attach: [], // files waiting to be sent
    emojiOpen: false,
    lastKind: null,
    lastStatus: null,
    lastConv: null,
  };
  const isMobile = () => matchMedia("(max-width: 1023px)").matches;
  const offline = () => sessionStorage.getItem("eso-msg-offline") === "1" || navigator.onLine === false;
  const draftKey = (id) => `eso-msg-draft:${me.id}:${id}`;

  /* ---------------------------------------------------------- small widgets */

  // The picture this person saved in Settings (one record for each portal). Only a small image data address is ever used.
  const ownPhoto = (() => {
    try {
      const v = localStorage.getItem(portal === "staff" ? "eso-avatar" : `${portal}:eso-avatar`);
      return typeof v === "string" && /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ? v : "";
    } catch {
      return "";
    }
  })();

  function avatar({ name, role, size = "md" }) {
    const el = tpl("t-avatar");
    el.dataset.role = role;
    el.dataset.size = size;
    if (ownPhoto && name === me.name && role !== "bot" && role !== "group") {
      $("[data-initials]", el).hidden = true;
      el.style.backgroundImage = `url("${ownPhoto}")`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      return el;
    }
    if (role === "bot" || role === "group") {
      $("[data-initials]", el).hidden = true;
      if (role === "group") setIcon($("[data-bot]", el), "users");
      $("[data-bot]", el).removeAttribute("hidden"); // SVG elements have no .hidden property
    } else {
      $("[data-initials]", el).textContent = initials(name);
    }
    return el;
  }

  function svgIcon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `#i-${name}`);
    svg.appendChild(use);
    return svg;
  }

  function badge(text, tone = "neutral", icon) {
    const el = tpl("t-badge");
    el.dataset.tone = tone;
    if (icon) el.appendChild(svgIcon(icon));
    el.appendChild(document.createTextNode(text));
    return el;
  }

  function button(label, { variant = "outline", icon, onClick, disabled, ariaLabel } = {}) {
    const el = tpl("t-btn");
    el.dataset.variant = variant;
    $("[data-label]", el).textContent = label;
    if (!label) {
      $("[data-label]", el).hidden = true;
      el.dataset.iconOnly = "true";
    }
    if (icon) {
      const svg = $("[data-icon]", el);
      svg.removeAttribute("hidden"); // SVG elements have no .hidden property
      setIcon(svg, icon);
    }
    if (disabled) el.disabled = true;
    if (ariaLabel) el.setAttribute("aria-label", ariaLabel);
    if (onClick) el.addEventListener("click", onClick);
    return el;
  }

  // Go to another page of the portal. Inside the portal frame (Messages sits in an iframe there) the whole window goes, not only the frame: otherwise the page
  // would be loaded inside itself, with two headers on top of each other.
  function goPage(path, hash = "") {
    const q = new URLSearchParams(location.search); // the person stays the same (?as, ?dark); "embed" only says this page sits in a frame
    q.delete("embed");
    const url = `${path}${q.toString() ? `?${q}` : ""}${hash}`;
    try {
      (window.top && window.top !== window ? window.top : window).location.assign(url);
    } catch {
      location.assign(url);
    }
  }

  function toast(text, { action, onAction, ms = 4500 } = {}) {
    const el = tpl("t-toast");
    $("[data-text]", el).textContent = text;
    if (action) {
      const b = $("[data-action]", el);
      b.hidden = false;
      b.textContent = action;
      b.addEventListener("click", () => {
        onAction && onAction();
        el.remove();
      });
    }
    const box = $("#toasts");
    // The same message twice in a row (hiding two chats one after another) replaces itself instead of piling up over the header.
    for (const old of $$("[data-text]", box)) if (old.textContent === text) old.closest("[role=status]")?.remove();
    while (box.children.length >= 2) box.firstElementChild.remove();
    box.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  const announce = (text) => {
    const a = $("#announce");
    a.textContent = "";
    setTimeout(() => {
      a.textContent = text;
    }, 30);
  };

  /* A long note is one short line plus an (i) that opens the whole text in a small window, so a note never takes the room of the conversation. */
  const NOTE_MAX = 72;
  function shortNote(text) {
    const first = text.split(/(?<=[.!?])\s/)[0];
    if (first.length <= NOTE_MAX && first.length < text.length) return first;
    if (text.length <= NOTE_MAX) return text;
    const cut = text.slice(0, NOTE_MAX - 12);
    return `${cut.slice(0, cut.lastIndexOf(" ") > 20 ? cut.lastIndexOf(" ") : cut.length)}…`;
  }
  let infoOpener = null;
  function showInfo(opener, title, text) {
    infoOpener = opener;
    $("#info-win-title").textContent = title;
    $("#info-win-text").textContent = text;
    $("#info-win").showModal();
    $("#info-win-title").focus({ preventScroll: true });
  }
  function infoButton(text, title = "About this message") {
    const b = tpl("t-info-btn");
    b.addEventListener("click", () => showInfo(b, title, text));
    return b;
  }
  function banner(tone, text, actions = []) {
    const el = tpl("t-banner");
    el.dataset.tone = tone;
    setIcon($("svg", el), tone === "warning" ? "alert" : tone === "success" ? "check" : "info");
    const long = text.length > NOTE_MAX;
    $("[data-text]", el).textContent = long ? shortNote(text) : text;
    const box = $("[data-actions]", el);
    if (long) box.appendChild(infoButton(text));
    actions.forEach((a) => box.appendChild(a));
    return el;
  }

  function empty({ icon = "message", title, text, actions = [] }) {
    const el = tpl("t-empty");
    setIcon($("[data-icon]", el), icon);
    $("[data-title]", el).textContent = title;
    $("[data-text]", el).textContent = text;
    const box = $("[data-actions]", el);
    actions.forEach((a) => box.appendChild(a));
    return el;
  }

  /** A button that asks to be pressed twice, for actions that end a conversation. */
  function confirmButton(key, label, confirmLabel, run, opts = {}) {
    const b = button(ui.confirm && ui.confirm.key === key ? confirmLabel : label, { ...opts, variant: ui.confirm && ui.confirm.key === key ? "soft" : opts.variant });
    b.addEventListener("click", () => {
      if (ui.confirm && ui.confirm.key === key) {
        clearTimeout(ui.confirm.timer);
        ui.confirm = null;
        run();
        return;
      }
      if (ui.confirm) clearTimeout(ui.confirm.timer);
      ui.confirm = {
        key,
        timer: setTimeout(() => {
          ui.confirm = null;
          renderThread(true);
        }, 4000),
      };
      renderThread(true);
      const again = $$("#thread-actions button").find((x) => x.textContent === confirmLabel);
      if (again) again.focus();
    });
    return b;
  }

  /* --------------------------------------------------------------- chrome */

  $("#portal-label").textContent = `· ${portalInfo.label}`;
  $("#me-avatar").textContent = initials(me.name);
  if (ownPhoto) {
    // the picture saved in Settings stands where the initials were
    const me$ = $("#me-avatar");
    me$.textContent = "";
    me$.style.backgroundImage = `url("${ownPhoto}")`;
    me$.style.backgroundSize = "cover";
    me$.style.backgroundPosition = "center";
    me$.setAttribute("role", "img");
    me$.setAttribute("aria-label", me.name);
  }
  $("#me-avatar").dataset.role = me.role;
  $("#me-name").textContent = me.name;
  $("#me-role").textContent = me.title;
  document.title = document.title.replace(/^\(\d+\)\s*/, "");
  const baseTitle = document.title;

  const canCompose = me.role !== "resident";
  // Everyone can start something new. A resident starts it with the assistant (who passes it to the property team when asked), never with a person directly.
  $("#btn-new").hidden = false;
  if (me.role === "resident") {
    $("#btn-new").setAttribute("aria-label", "New message to the property team");
    $("#btn-new").title = "New message to the property team";
  }
  $("#btn-announce").hidden = me.role !== "admin";
  $("#btn-dnd").hidden = me.role !== "resident";

  // On a phone the list and the thread are two screens: from a thread, Back goes to the list first, even when the page
  // was opened straight onto a thread (link, reload) and there is no history entry of ours to go back to.
  // Everyone, a resident too, has the same step back from a thread to the list from the first moment: it must not appear only after something was opened from the list.
  // Two buttons: Exit (a link, see exit-target.js) always leaves Messages; Back only steps inside it, and shows only when there is a step to take.
  const threadOverList = () => isMobile() && ui.pane === "thread";
  const stepsBack = () => ((history.state && history.state.depth) || 0) > 0 || threadOverList();
  const backLabel = () => {
    const depth = (history.state && history.state.depth) || 0;
    return depth > 0 && ui.pane !== "thread" ? "Chat" : "Messages";
  };
  let leaving = false; // a second tap before the first Back lands would walk back twice
  function leave() {
    if (leaving) return;
    const depth = (history.state && history.state.depth) || 0;
    if (depth > 0) {
      leaving = true;
      setTimeout(() => {
        leaving = false;
      }, 500);
      return history.back();
    }
    if (threadOverList()) return go({ pane: "list" });
  }
  $("#btn-back").addEventListener("click", leave);
  $("#btn-exit").href = exitTarget("/messages.html", portalInfo.home);

  /* ----------------------------------------------------------- navigation */

  const routeConv = () => (location.hash.match(/^#\/c\/(\w+)/) || [])[1] || null;

  function go({ pane, conv }, { push = false } = {}) {
    ui.pane = pane;
    if (conv !== undefined) ui.convId = conv;
    const depth = (history.state && history.state.depth) || 0;
    const state = { depth: push ? depth + 1 : depth, pane, conv: ui.convId };
    const url = ui.convId && pane === "thread" ? `#/c/${ui.convId}` : `${location.pathname}${location.search}`;
    if (push) history.pushState(state, "", url);
    else history.replaceState(state, "", url);
    renderAll(true);
  }

  window.addEventListener("popstate", (e) => {
    leaving = false;
    const s = e.state;
    if (s && s.pane) {
      ui.pane = s.pane;
      ui.convId = s.conv || null;
    } else {
      const c = routeConv();
      ui.convId = c;
      ui.pane = c ? "thread" : "list";
    }
    openSideEffects();
    renderAll(true);
  });

  function openConv(id, { fromList = true } = {}) {
    const t = store.get(id, me.id);
    if (!t.ok) return toast(reasonText(t.reason));
    ui.stick = true;
    ui.newBelow = 0;
    ui.cannedOpen = false;
    ui.confirm = null;
    const unread = t.messages.find((m) => m.from !== me.id && !m.readBy[me.id] && notifies(m, me.role));
    ui.anchor = unread ? { convId: id, msgId: unread.id } : null;
    ui.sigLog = "";
    // Only a step from the list to a thread is a new history entry; moving between threads replaces it.
    go({ pane: "thread", conv: id }, { push: fromList && isMobile() && ui.pane !== "thread" });
    openSideEffects();
    if (!isMobile())
      setTimeout(() => {
        const i = $("#msg-input");
        if (i && !i.disabled && !$("#thread").hidden) i.focus();
      }, 0);
    else setTimeout(() => $("#thread-title").focus(), 0);
  }

  /** Runs whenever a conversation becomes the visible one. */
  function openSideEffects() {
    if (!ui.convId) return;
    if (ui.lastConv !== ui.convId) {
      ui.lastConv = ui.convId;
      const input = $("#msg-input");
      input.value = localStorage.getItem(draftKey(ui.convId)) || "";
      autosize();
      ui.reply = null;
      ui.edit = null;
      ui.emergency = false;
      ui.attach = [];
      ui.emojiOpen = false;
      ui.quickFor = null;
      renderComposerExtras();
    }
    if (document.visibilityState === "visible") store.markRead(ui.convId, me.id, { receipt: messagePref(portal, "msgReceipts") });
  }

  /* ---------------------------------------------------------------- tabs */

  function renderTabs(rows) {
    const box = $("#tabs");
    if (!box.children.length) {
      TABS[portal].forEach(([id, label]) => {
        const t = tpl("t-tab");
        t.dataset.tab = id;
        $("[data-label]", t).textContent = label;
        t.addEventListener("click", () => {
          ui.tab = id;
          renderList(true);
        });
        t.addEventListener("keydown", (e) => {
          const tabs = $$("[role=tab]", box).filter((x) => !x.hidden); // the Hidden tab is absent when nothing is hidden
          const i = tabs.indexOf(t);
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
            n.focus();
            n.click();
          }
        });
        box.appendChild(t);
      });
    }
    for (const t of $$("[role=tab]", box)) {
      const id = t.dataset.tab;
      const selected = id === ui.tab;
      t.setAttribute("aria-selected", String(selected));
      t.tabIndex = selected ? 0 : -1;
      if (id === "hidden") {
        const hi = store.hiddenItems(me.id);
        const nh = hi.conversations.length + hi.messages.length;
        t.hidden = nh === 0 && !selected; // nothing put away: no tab to look at
        $("[data-label]", t).textContent = nh ? `Hidden (${nh})` : "Hidden";
        $("[data-count]", t).hidden = true;
        t.setAttribute("aria-label", nh ? `Hidden, ${nh} ${nh === 1 ? "item" : "items"}` : "Hidden");
        continue;
      }
      const inTab = rows.filter((r) => (id === "all" ? !r.hidden : r.tags.includes(id)));
      const n = id === "queue" ? inTab.length : inTab.reduce((a, r) => a + r.unread, 0);
      const c = $("[data-count]", t);
      c.hidden = n === 0 || id === "all";
      c.textContent = String(n);
      t.setAttribute("aria-label", n && id !== "all" ? `${$("[data-label]", t).textContent}, ${n} ${id === "queue" ? "waiting" : "unread"}` : $("[data-label]", t).textContent);
    }
  }

  /* ----------------------------------------------------------------- list */

  function rowChips(r) {
    const chips = [];
    if (r.emergency) chips.push(badge("Emergency", "danger", "alert"));
    if (r.kind === "resident_support") {
      if (r.stage === "waiting_on_resident") chips.push(badge("Waiting on resident", "warning", "clock"));
      else if (r.status === "queued") chips.push(badge(me.role === "resident" ? "Waiting" : `Waiting ${duration(Date.now() - r.waitingSince)}`, "warning", "clock"));
      else if (r.status === "active") chips.push(badge("Active", "success"));
      else if (r.status === "bot") chips.push(badge("Assistant", "info", "bot"));
      else chips.push(r.stage === "resolved" ? badge("Resolved", "success") : badge("Closed"));
    } else if (r.kind === "support") {
      if (r.priority === "high") chips.push(badge("High", "danger"));
      // How long a request has waited for its first answer (Support's own clock): the Admin sees it on the row.
      if (me.role === "admin" && r.status === "open" && r.waitingSince) chips.push(badge(`Waiting ${duration(Date.now() - r.waitingSince)}`, "warning", "clock"));
      chips.push(badge({ open: "Open", pending: "Pending", resolved: "Resolved" }[r.status], { open: "info", pending: "warning", resolved: "success" }[r.status]));
    } else if (r.kind === "announcement") {
      chips.push(badge("Announcement", "neutral", "megaphone"));
    }
    return chips;
  }

  function renderList(force) {
    if (ui.tab === "hidden") {
      // The last hidden thing was restored: go back to the usual list instead of an empty Hidden tab.
      const hi = store.hiddenItems(me.id);
      if (!hi.conversations.length && !hi.messages.length) {
        ui.tab = DEFAULT_TAB[portal];
        force = true;
      }
    }
    const all = store.listFor(me.id);
    renderTabs(all);
    const query = ui.query.trim().toLowerCase();
    // Structured search: unit:304 status:open priority:high assignee:jordan tag:permit after:2026-11-01 "water leak"
    const parsed = parseQuery(ui.query);
    let rows = all.filter(
      (r) => (ui.tab === "all" ? !r.hidden : r.tags.includes(ui.tab)) && matchFilters(r, parsed) && matchText([r.no, r.title, r.subtitle, r.last && r.last.text, r.unit, r.topic].join(" "), parsed),
    );
    // The queue: an emergency first, then High priority, then who has waited longest.
    const prioRank = (r) => ({ high: 2, normal: 1, low: 0 })[r.priority] ?? 1;
    if (ui.tab === "queue") rows = rows.sort((a, b) => Number(b.emergency) - Number(a.emergency) || prioRank(b) - prioRank(a) || (a.waitingSince || a.updatedAt) - (b.waitingSince || b.updatedAt));
    const minute = Math.floor(Date.now() / 60000);
    const hits = query.length >= 2 ? store.search(me.id, query) : [];
    const sig = JSON.stringify([
      ui.tab,
      query,
      ui.convId,
      minute,
      offline(),
      store.pref(me.id).dnd,
      store.badgeCount(me.id),
      rows.map((r) => [r.id, r.updatedAt, r.status, r.unread, r.priority, r.pinned, r.muted, r.important]),
      hits.map((h) => h.msgId),
      (() => {
        const hi = store.hiddenItems(me.id);
        return [hi.conversations.map((r) => r.id), hi.messages.map((m) => m.id)];
      })(),
    ]);
    if (!force && sig === ui.sigList) return;
    ui.sigList = sig;

    renderHits(hits, query);
    renderSearchUi();
    const list = $("#list");
    const hadFocus = list.contains(document.activeElement) ? document.activeElement.closest("[data-row]")?.dataset.id : null;
    clear(list);
    const emptyBox = $("#list-empty");
    clear(emptyBox);
    emptyBox.hidden = rows.length > 0 || hits.length > 0;
    list.hidden = rows.length === 0;
    if (!rows.length && !hits.length) {
      if (query) {
        emptyBox.appendChild(
          empty({
            icon: "search",
            title: `No matches for “${ui.query.trim()}”`,
            text: "Check the spelling or clear the search.",
            actions: [
              button("Clear search", {
                onClick: () => {
                  $("#list-search").value = "";
                  ui.query = "";
                  renderList(true);
                },
              }),
            ],
          }),
        );
      } else {
        const copy = {
          queue: [
            "Queue is clear",
            me.role === "admin" ? "Support requests from staff and clients appear here. Nothing is waiting right now." : "Residents who ask for a person appear here. Nothing is waiting right now.",
          ],
          mine: ["No chats assigned to you", me.role === "admin" ? "Requests you pick up from the queue show up here." : "Take a conversation from the queue and it moves here."],
          clients: ["No client conversations", "Start one with New."],
          support: ["No support requests", me.role === "admin" ? "Nothing from staff or clients right now." : "Ask Support for help with New."],
          resolved: ["Nothing resolved yet", "Resolved requests are kept here."],
          announcements: ["No announcements", me.role === "admin" ? "Use Announce to send a one-way notice." : "Notices from Support will appear here."],
          direct: ["No direct messages", "Start one with New."],
          staff: ["No messages with staff", "Start one with New."],
          hidden: ["Nothing hidden", "Hide a conversation from its menu, or delete a message for yourself. They wait here until you restore them."],
        }[ui.tab] || ["No conversations yet", canCompose ? "Start one with New." : "Press New to ask a question or reach the property team."];
        emptyBox.appendChild(empty({ title: copy[0], text: copy[1], actions: me.role === "resident" ? [button("Start a conversation", { variant: "primary", onClick: startResidentSession })] : [] }));
      }
    }
    if (ui.tab === "hidden") renderHiddenTab(list, emptyBox, rows);
    for (const r of ui.tab === "hidden" ? [] : rows) {
      const li = tpl("t-row");
      const b = $("[data-row]", li);
      b.dataset.id = r.id;
      b.dataset.unread = String(r.unread > 0);
      b.dataset.emergency = String(!!r.emergency);
      if (r.id === ui.convId) b.setAttribute("aria-current", "true");
      $("[data-avatar]", b).replaceWith(avatar({ name: r.avatar.name, role: r.avatar.role }));
      $("[data-title]", b).textContent = r.title;
      $("[data-subtitle]", b).textContent = `${r.no ? `${r.no} · ` : ""}${r.subtitle || ""}`; // the ticket's own number first, so two tickets of one person are told apart
      const t = $("[data-time]", b);
      t.textContent = listTime(r.last ? r.last.at : r.updatedAt, Date.now());
      t.dateTime = new Date(r.last ? r.last.at : r.updatedAt).toISOString();
      t.title = formatFull(r.last ? r.last.at : r.updatedAt);
      const who = r.last && r.last.from === me.id ? "You: " : "";
      $("[data-preview]", b).textContent = r.last ? `${who}${r.last.text}` : "No messages yet";
      if (r.important) $("[data-important]", b).hidden = false;
      if (r.pinned) $("[data-pin]", b).hidden = false;
      if (r.muted) $("[data-mute]", b).hidden = false;
      rowChips(r).forEach((c) => $("[data-chips]", b).appendChild(c));
      const u = $("[data-unread]", b);
      if (r.unread) {
        u.hidden = false;
        u.textContent = r.unread > 99 ? "99+" : String(r.unread);
        u.setAttribute("role", "img");
        u.setAttribute("aria-label", `${r.unread} unread`);
      }
      b.addEventListener("click", () => openConv(r.id));
      const mb = $("[data-rowmenu]", li);
      const ml = $("[data-rowmenu-list]", li);
      mb.setAttribute("aria-label", `More actions for ${r.title}`);
      mb.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = ml.hidden;
        closeRowMenus();
        if (!open) return;
        fillFlagMenu(ml, r.id, r, () => {
          closeRowMenus();
          mb.focus();
        });
        ml.hidden = false;
        mb.setAttribute("aria-expanded", "true");
        $("[role=menuitem]", ml).focus();
      });
      wireMenuKeys(ml, () => {
        closeRowMenus();
        mb.focus();
      });
      list.appendChild(li);
    }
    if (hadFocus) $(`[data-row][data-id="${hadFocus}"]`, list)?.focus();

    const dnd = $("#btn-dnd");
    if (!dnd.hidden) dnd.setAttribute("aria-pressed", String(store.pref(me.id).dnd));
    const lb = $("#list-banner");
    clear(lb);
    if (offline()) lb.appendChild(banner("warning", "You are offline. Messages will not send until the connection is back."));
    const unread = store.badgeCount(me.id);
    document.title = `${unread ? `(${unread}) ` : ""}${baseTitle}`;
  }

  /**
   * The Hidden tab: conversations put away with Hide, then single messages put away with Delete for me.
   * Restore puts one back where it was. Nothing here is gone for good.
   */
  function renderHiddenTab(list, emptyBox, rows) {
    const hi = store.hiddenItems(me.id);
    const q = ui.query.trim().toLowerCase();
    const msgs = hi.messages.filter((m) => !q || `${m.convTitle} ${m.text}`.toLowerCase().includes(q));
    list.hidden = rows.length + msgs.length === 0;
    emptyBox.hidden = !list.hidden;
    const section = (text) => {
      const s = tpl("t-section");
      $("[data-text]", s).textContent = text;
      list.appendChild(s);
    };
    const restoreRow = ({ title, when, text, label, run }) => {
      const li = tpl("t-restore-row");
      $("[data-title]", li).textContent = title;
      const t = $("[data-time]", li);
      t.textContent = listTime(when, Date.now());
      t.dateTime = new Date(when).toISOString();
      t.title = formatFull(when);
      $("[data-text]", li).textContent = text;
      const b = $("[data-restore]", li);
      b.setAttribute("aria-label", label);
      b.addEventListener("click", run);
      list.appendChild(li);
    };
    if (rows.length) {
      section("Conversations");
      for (const r of rows) {
        restoreRow({
          title: r.title,
          when: r.last ? r.last.at : r.updatedAt,
          text: r.last ? `${r.last.from === me.id ? "You: " : ""}${r.last.text}` : "No messages yet",
          label: `Restore conversation with ${r.title}`,
          run: () => {
            act(store.unhideConversation(r.id, me.id), "Restored to your list.");
          },
        });
      }
    }
    if (msgs.length) {
      section("Messages deleted for you");
      for (const m of msgs) {
        restoreRow({
          title: m.convTitle,
          when: m.at,
          text: `${m.from}: ${m.text}`,
          label: `Restore message in ${m.convTitle}`,
          run: () => {
            act(store.unhideMessage(m.convId, me.id, m.id), "Message restored in the conversation.");
          },
        });
      }
    }
  }

  /** Hide a whole conversation from your own lists (nothing is deleted); Undo or the Hidden tab brings it back. */
  function hideConv(convId) {
    const r = store.hideConversation(convId, me.id);
    if (!r.ok) {
      toast(r.reason === "emergency_open" ? "An open emergency cannot be hidden. Acknowledge it first." : reasonText(r.reason));
      return;
    }
    if (ui.convId === convId) {
      ui.convId = null;
      ui.lastConv = null;
      go({ pane: "list" });
    }
    toast("Hidden. It is under Hidden whenever you want it back.", { action: "Undo", onAction: () => act(store.unhideConversation(convId, me.id)) });
  }

  /** Chips for the filters in the search box (click to remove) and buttons that add one. */
  function renderSearchUi() {
    const chips = $("#search-chips");
    clear(chips);
    for (const f of describeFilters(parseQuery(ui.query))) {
      const c = tpl("t-fchip");
      $("[data-label]", c).textContent = `${f.label} ×`;
      c.setAttribute("aria-label", `Remove filter ${f.label}`);
      c.addEventListener("click", () => {
        ui.query = withoutFilter(ui.query, f.key);
        $("#list-search").value = ui.query;
        renderList(true);
      });
      chips.appendChild(c);
    }
    const sf = $("#search-filters");
    if (ui.query.trim()) sf.hidden = false;
    if (!sf.children.length) {
      FILTER_KEYS.forEach((k) => {
        const b = tpl("t-fchip");
        $("[data-label]", b).textContent = `+ ${k}`;
        b.setAttribute("aria-label", `Filter by ${k}`);
        b.addEventListener("click", () => {
          const inp = $("#list-search");
          inp.value = `${inp.value.trim()} ${k}:`.trim();
          ui.query = inp.value;
          inp.focus();
          renderList(true);
        });
        sf.appendChild(b);
      });
    }
  }

  /** Messages that contain the search words, across every conversation. Opening one scrolls to it. */
  function renderHits(hits, query) {
    const box = $("#hits");
    const ul = $("#hit-list");
    clear(ul);
    box.hidden = !hits.length;
    $("#hits-title").textContent = hits.length ? `Messages (${hits.length}${hits.length >= 30 ? "+" : ""})` : "Messages";
    for (const h of hits) {
      const li = tpl("t-hit");
      const [i, n] = h.match;
      $("[data-title]", li).textContent = h.title;
      const tm = $("[data-time]", li);
      tm.textContent = listTime(h.at, Date.now());
      tm.dateTime = new Date(h.at).toISOString();
      $("[data-who]", li).textContent = `${h.who}:`;
      $("[data-pre]", li).textContent = h.snippet.slice(0, i);
      $("[data-m]", li).textContent = h.snippet.slice(i, i + n);
      $("[data-post]", li).textContent = h.snippet.slice(i + n);
      $("[data-hit]", li).setAttribute("aria-label", `${h.title}, ${h.who}: ${h.snippet}`);
      $("[data-hit]", li).addEventListener("click", () => jumpTo(h.convId, h.msgId));
      ul.appendChild(li);
    }
  }

  function jumpTo(convId, msgId) {
    openConv(convId);
    ui.stick = false;
    ui.revealed.add(msgId);
    setTimeout(() => {
      renderThread(true);
      ui.stick = false;
      const target = $(`[data-msgid="${msgId}"]`, $("#log"));
      if (!target) return;
      target.scrollIntoView({ block: "center", behavior: "auto" });
      target.dataset.flash = "true";
      setTimeout(() => {
        delete target.dataset.flash;
      }, 1600);
    }, 120);
  }

  $("#list").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const rows = $$("[data-row]", $("#list"));
    const i = rows.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    rows[Math.max(0, Math.min(rows.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))].focus();
  });
  $("#list-search").addEventListener("input", (e) => {
    ui.query = e.target.value;
    renderList(true);
  });
  // The filter buttons show while the box is in use and disappear when it is empty and you leave it.
  const searchBox = $("#list-search");
  searchBox.addEventListener("focus", () => {
    $("#search-filters").hidden = false;
  });
  $("#list-pane").addEventListener("focusout", (e) => {
    if (!searchBox.value && !$("#list-pane").contains(e.relatedTarget)) $("#search-filters").hidden = true;
    else if (!searchBox.value && e.relatedTarget && e.relatedTarget.closest && !e.relatedTarget.closest("#search-filters, #list-search")) $("#search-filters").hidden = true;
  });

  /* --------------------------------------------------------------- thread */

  function threadStatusBadges(row, conv) {
    const out = [];
    if (conv.kind === "resident_support") {
      // Queued, active and closed are already shown by the progress bar under the header; only the assistant has no bar step of its own.
      if (conv.status === "bot") out.push(badge("Automated assistant", "info", "bot"));
    } else if (conv.kind === "support") {
      out.push(badge({ open: "Open", pending: "Pending", resolved: "Resolved" }[conv.status], { open: "info", pending: "warning", resolved: "success" }[conv.status]));
      if (conv.priority === "high") out.push(badge("High priority", "danger"));
    } else if (conv.kind === "announcement") {
      out.push(badge("Announcement", "neutral", "megaphone"));
    }
    const online = onlineOthers(conv);
    if (online.length && conv.status !== "closed") out.push(badge(conv.kind === "group" ? `${online.length} online` : "Online", "success"));
    // What the other person set as their status in Settings (Busy, Do not disturb, Away…), with their message as the tooltip. Only for a conversation with one other person.
    if (conv.kind !== "group" && conv.status !== "closed") {
      const peer = othersOf(conv).map(peerStatus).find(Boolean);
      if (peer) {
        const b = badge(peer.label, peer.tone);
        if (peer.msg) b.title = peer.msg;
        out.push(b);
      }
    }
    return out;
  }

  /** The people other than me in this conversation (the ones who are known). */
  function othersOf(conv) {
    let ids = [];
    if (conv.participants) ids = conv.participants.filter((p) => p !== me.id);
    else if (conv.kind === "resident_support") ids = conv.status === "active" ? [me.id === conv.residentId ? conv.assigneeId : conv.residentId] : [];
    else if (conv.kind === "support") ids = me.role === "admin" ? [conv.requesterId] : conv.assigneeId ? [conv.assigneeId] : [];
    return ids.filter(Boolean);
  }
  /** People other than me in this conversation who are online right now. */
  function onlineOthers(conv) {
    return othersOf(conv).filter((id) => store.presenceOf(id).online);
  }
  /** A status the person chose in Settings (the prototype keeps one record for each portal), unless it is Available or has run out. */
  function peerStatus(id) {
    const p = PERSONAS.find((x) => x.id === id);
    if (!p) return null;
    const key = p.role === "staff" ? "eso-status" : p.role === "client" ? "client:eso-status" : `${p.role}:eso-status`;
    let s;
    try {
      s = JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
    if (!s || !s.s || s.s === "available" || (s.until && Date.now() > s.until)) return null;
    const known = { busy: ["Busy", "danger"], dnd: ["Do not disturb", "danger"], brb: ["Be right back", "warning"], away: ["Away", "warning"], offline: ["Offline", "neutral"] }[s.s];
    return known ? { label: known[0], tone: known[1], msg: typeof s.msg === "string" && s.showMsg !== false ? s.msg : "" } : null;
  }

  /* Pin and mute live behind the three dots in the conversation header; their state shows as badges next to the title. */
  const threadMore = $("#btn-thread-more");
  const threadMenu = $("#thread-menu");
  function closeThreadMenu() {
    threadMenu.hidden = true;
    threadMore.setAttribute("aria-expanded", "false");
  }
  function toggleFlag(convId, flag) {
    const r = store.toggleFlag(convId, me.id, flag);
    if (r.ok)
      toast(
        {
          pinned: r.on ? "Pinned to the top of your list." : "Unpinned.",
          important: r.on ? "Flagged as important." : "Flag removed.",
          muted: r.on ? "Muted. It will not add to your unread count." : "Unmuted.",
        }[flag],
      );
    else act(r);
  }
  /** Small icons beside the title: a pin when pinned, a red flag when important, a bell when muted. Nothing shows when off. */
  function renderMarks(row) {
    const box = $("#thread-marks");
    clear(box);
    for (const m of [row.important && { icon: "flag", label: "Important", tone: "danger" }, row.pinned && { icon: "pin", label: "Pinned" }, row.muted && { icon: "bell-off", label: "Muted" }].filter(
      Boolean,
    )) {
      const el = tpl("t-mark");
      setIcon($("svg", el), m.icon);
      el.setAttribute("aria-label", m.label);
      el.title = m.label;
      if (m.tone) el.dataset.tone = m.tone;
      box.appendChild(el);
    }
  }
  /** Pin and mute items, shared by the header menu and the menu on each list row. */
  function fillFlagMenu(menu, convId, { pinned, muted, important }, done) {
    clear(menu);
    for (const it of [
      { flag: "pinned", icon: "pin", label: pinned ? "Unpin conversation" : "Pin conversation" },
      { flag: "important", icon: "flag", label: important ? "Remove important flag" : "Flag as important", tone: important ? "danger" : "" },
      { flag: "muted", icon: "bell-off", label: muted ? "Unmute conversation" : "Mute conversation" },
      { flag: "hide", icon: "eye-off", label: "Hide conversation" },
    ]) {
      const b = tpl("t-menu-item");
      setIcon($("svg", b), it.icon);
      $("[data-label]", b).textContent = it.label;
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        done();
        if (it.flag === "hide") hideConv(convId);
        else toggleFlag(convId, it.flag);
      });
      menu.appendChild(b);
    }
  }
  function wireMenuKeys(menu, onEscape) {
    menu.addEventListener("keydown", (e) => {
      const list = $$("[role=menuitem]", menu);
      const i = list.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length].focus();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onEscape();
      }
    });
  }
  function openThreadMenu() {
    const t = ui.convId && store.get(ui.convId, me.id);
    if (!t || !t.ok) return;
    fillFlagMenu(threadMenu, t.conv.id, t.row, () => {
      closeThreadMenu();
      threadMore.focus();
    });
    threadMenu.hidden = false;
    threadMore.setAttribute("aria-expanded", "true");
    $("[role=menuitem]", threadMenu).focus();
  }
  threadMore.addEventListener("click", (e) => {
    e.stopPropagation();
    if (threadMenu.hidden) openThreadMenu();
    else closeThreadMenu();
  });
  wireMenuKeys(threadMenu, () => {
    closeThreadMenu();
    threadMore.focus();
  });
  document.addEventListener("click", (e) => {
    if (!threadMenu.hidden && !e.target.closest("#thread-menu")) closeThreadMenu();
  });

  function closeRowMenus() {
    $$("[data-rowmenu-list]", $("#list")).forEach((m) => {
      m.hidden = true;
    });
    $$("[data-rowmenu]", $("#list")).forEach((b) => b.setAttribute("aria-expanded", "false"));
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-rowmenu], [data-rowmenu-list]")) closeRowMenus();
  });

  function headerActions(t) {
    const box = $("#thread-actions");
    clear(box);
    const { conv, actions } = t;
    closeThreadMenu();
    autoContext(t);
    // (A resident used to have a separate "Conversations" icon here because there was no Back; the Back arrow at the top is now the one way to the list.)
    $("#btn-context")?.remove();
    const ctx = ["staff", "admin"].includes(me.role) ? store.contextFor(conv.id, me.id) : null;
    if (ctx && ctx.kind === "resident") {
      // Details is the Resident information window: profile, rewards, tickets
      const cb = button("Details", { variant: "outline", ariaLabel: "Resident information", onClick: () => openResidentInfo(conv) });
      cb.id = "btn-context";
      cb.title = "Resident information";
      cb.setAttribute("aria-haspopup", "dialog");
      $("#thread-flags").insertBefore(cb, $("#thread-flags").firstChild);
    } else if (ctx) {
      const on = contextOpen();
      const cb = button(on ? "Hide details" : "Details", { variant: on ? "soft" : "outline", ariaLabel: on ? "Hide details" : "Show details", onClick: () => setContext(!contextOpen()) });
      cb.id = "btn-context";
      cb.title = on ? "Hide details" : "Show details";
      cb.setAttribute("aria-pressed", String(on));
      cb.setAttribute("aria-controls", "context-pane");
      $("#thread-flags").insertBefore(cb, $("#thread-flags").firstChild);
    }
    $("#btn-members")?.remove();
    if (conv.kind === "group") {
      const n = conv.participants.length;
      const mb = button(String(n), { variant: "ghost", icon: "users", ariaLabel: `${n} people. View members`, onClick: () => openMembers(conv.id) });
      mb.id = "btn-members";
      mb.title = "Members";
      $("#thread-flags").insertBefore(mb, threadMore);
    }
    // A Support thread of the Admin: Take, Resolve (saved in the Ticket box) and Reopen are plain buttons, not only the three lists under the header.
    if (actions.includes("take")) box.appendChild(button("Take", { variant: "primary", icon: "check", onClick: () => act(store.assignSupport(conv.id, me.id, me.id), "You took this ticket.") }));
    if (actions.includes("reopen")) box.appendChild(button("Reopen", { variant: "outline", icon: "undo", onClick: () => act(store.setSupportStatus(conv.id, me.id, "open"), "Ticket reopened.") }));
    if (["admin", "staff"].includes(me.role) && (conv.kind === "support" || conv.ticketNo)) {
      const tb = button("Ticket box", { variant: "ghost", icon: "clipboard", onClick: () => goPage(`/${portal}/tickets.html`, `#/t/${conv.id}`) });
      tb.title = "Open this ticket in the Ticket box";
      box.appendChild(tb);
    }
    if (actions.includes("claim")) box.appendChild(button("Take conversation", { variant: "primary", icon: "check", onClick: () => act(store.claim(conv.id, me.id), "You took this conversation.") }));
    for (const route of ["platform", "property"]) {
      if (!actions.includes(`move:${route}`)) continue;
      const to = route === "platform" ? "EasySpotOps Support" : "the Property team";
      const mv = confirmButton(
        `move:${conv.id}`,
        route === "platform" ? "Move to Support" : "Move to Property",
        `Confirm: move to ${route === "platform" ? "Support" : "Property"}`,
        () => {
          ui.quiet = conv.id;
          return act(store.reroute(conv.id, me.id, route), `Moved to ${to}. The summary went with it.`);
        },
        { variant: "ghost", icon: "forward" },
      );
      mv.title = `Sent to the wrong place? Move this request to ${to}. The resident is told and does not start again.`;
      box.appendChild(mv);
    }
    if (actions.includes("request_staff")) box.appendChild(button("Talk to a person", { variant: "soft", icon: "users", onClick: () => requestStaff(conv.id) }));
    if (actions.includes("ack_emergency"))
      box.appendChild(button("Acknowledge emergency", { variant: "primary", icon: "alert", onClick: () => act(store.acknowledgeEmergency(conv.id, me.id), "Emergency acknowledged.") }));
    if (actions.includes("wait"))
      box.appendChild(
        button("Waiting on resident", { variant: "outline", icon: "clock", onClick: () => act(store.setTicketState(conv.id, me.id, "waiting_on_resident"), "Marked as waiting on the resident.") }),
      );
    if (actions.includes("resume"))
      box.appendChild(button("Back to in progress", { variant: "outline", icon: "check", onClick: () => act(store.setTicketState(conv.id, me.id, "in_progress"), "Back to in progress.") }));
    // An Admin resolving a Support thread is one tap, with an Undo in the message that follows: a "Confirm" step for something this easy to take back was a second tap
    // for every thread (resolving is the last step of nearly every one). Other conversations keep the confirm step: resolving them is saved in the Ticket box for good.
    if (actions.includes("resolve") && me.role === "admin" && conv.kind === "support") {
      box.appendChild(button("Resolve", { variant: "outline", icon: "check", onClick: () => resolveWithUndo(conv) }));
    } else if (actions.includes("resolve"))
      box.appendChild(
        confirmButton(
          `resolve:${conv.id}`,
          "Resolve",
          "Confirm resolve",
          () => act(store.resolve(conv.id, me.id), conv.kind === "direct" || conv.kind === "support" || conv.ticketNo ? "Resolved. It is saved in the Ticket box." : "Conversation resolved."),
          { icon: "check" },
        ),
      );
    if (actions.includes("end"))
      box.appendChild(confirmButton(`end:${conv.id}`, "End chat", "Confirm end chat", () => act(store.endChat(conv.id, me.id), "Chat ended."), { variant: "ghost", icon: "x" }));
  }

  // Resolve a Support thread (Admin), saying "Resolved." with an Undo. Undo puts back what Resolve changed: the status and, if Resolve picked the thread up, nobody.
  function resolveWithUndo(conv) {
    const was = conv.status;
    const wasAssignee = conv.assigneeId || null;
    const r = act(store.resolve(conv.id, me.id), null);
    if (r.ok)
      toast("Resolved.", {
        action: "Undo",
        ms: 8000,
        onAction: () => {
          act(store.setSupportStatus(conv.id, me.id, was), null);
          act(store.assignSupport(conv.id, me.id, wasAssignee), `Back to ${was}.`);
        },
      });
    return r;
  }

  function act(result, okText) {
    if (!result.ok) {
      // "taken by someone else" is already explained when the conversation leaves the list
      if (result.reason !== "already_taken") toast(reasonText(result.reason));
      renderAll(true);
      return result;
    }
    if (okText) toast(okText);
    // A button that did its job leaves the page (Take, Confirm resolve) before this runs, so the keyboard is already dropped on the page.
    // For somebody using the keyboard, focus goes on to the message box (or the title when it is closed). A mouse click is left alone.
    if (usingKeyboard && !result.noop) {
      setTimeout(() => {
        const now = document.activeElement;
        if (now && now !== document.body && document.contains(now)) return;
        const box = $("#msg-input");
        const target = box && !box.disabled && box.offsetParent !== null ? box : $("#thread-title");
        target?.focus({ preventScroll: true });
      }, 150);
    }
    return result;
  }
  let usingKeyboard = false;
  document.addEventListener(
    "keydown",
    () => {
      usingKeyboard = true;
    },
    true,
  );
  document.addEventListener(
    "pointerdown",
    () => {
      usingKeyboard = false;
    },
    true,
  );

  function requestStaff(convId) {
    if (offline()) return toast("You are offline. Try again when the connection is back.");
    ui.gate = { convId, since: Date.now() - 1, until: Date.now() + 700 };
    setTimeout(() => renderThread(true), 720);
    const r = store.requestStaff(convId, me.id);
    if (!r.ok) toast(reasonText(r.reason));
    else announce("Request sent to the property team.");
  }

  function startResidentSession() {
    const r = store.ensureSession(me.id);
    if (!r.ok) return toast(reasonText(r.reason));
    openConv(r.convId, { fromList: false });
  }

  function threadTools(t) {
    const tools = $("#thread-tools");
    const show = me.role === "admin" && t.conv.kind === "support";
    tools.hidden = !show;
    if (!show) return;
    const status = $("#sel-status");
    const prio = $("#sel-priority");
    const asg = $("#sel-assignee");
    status.value = t.conv.status;
    prio.value = t.conv.priority;
    if (!asg.options.length) {
      asg.add(new Option("Unassigned", ""));
      PERSONAS.filter((p) => p.role === "admin").forEach((p) => asg.add(new Option(p.id === me.id ? `${p.name} (you)` : p.name, p.id)));
    }
    asg.value = t.conv.assigneeId || "";
    // The folded line on a phone: what the three choices are now, and one tap to change them (the choice stays open while the agent works in this conversation).
    const word = (sel) => (sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : "");
    $("#tools-summary").textContent = `${word(status)} · ${word(prio)} priority · ${word(asg)}`;
    const fields = $("#tools-fields");
    const open = ui.toolsOpenFor === t.conv.id;
    fields.dataset.collapsed = String(!open);
    $("#tools-toggle").setAttribute("aria-expanded", String(open));
    $("#tools-toggle").onclick = () => {
      ui.toolsOpenFor = ui.toolsOpenFor === t.conv.id ? null : t.conv.id;
      threadTools(t);
    };
    status.onchange = () => act(store.setSupportStatus(t.conv.id, me.id, status.value), "Status updated.");
    prio.onchange = () => act(store.setPriority(t.conv.id, me.id, prio.value), "Priority updated.");
    asg.onchange = () => act(store.assignSupport(t.conv.id, me.id, asg.value || null), "Assignment updated.");
  }

  /* Details panel (third column). Your choice is remembered; with no choice yet it is open on wide screens. */
  const CTX_KEY = "eso-msg-context";
  const readCtxPref = () => {
    try {
      const v = localStorage.getItem(CTX_KEY);
      return v === null ? null : v === "1";
    } catch {
      return null;
    }
  };
  ui.contextPref = readCtxPref();
  const contextOpen = () => (ui.ctxForce && ui.ctxForce === ui.convId ? true : ui.lastKind === "resident_support" && ["staff", "admin"].includes(me.role) ? false : ui.contextPref === null ? matchMedia("(min-width: 1280px)").matches : ui.contextPref);
  function setContext(on) {
    ui.ctxForce = null;
    ui.contextPref = on;
    try {
      localStorage.setItem(CTX_KEY, on ? "1" : "0");
    } catch {
      /* not remembered */
    }
    renderThread(true);
  }
  const fmtDate = (iso) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

  function ctxSection(heading) {
    const s = tpl("t-ctx-section");
    $("[data-heading]", s).textContent = heading;
    $("#context-body").appendChild(s);
    return $("[data-body]", s);
  }
  function ctxWho(body, p) {
    const w = tpl("t-ctx-who");
    $("[data-avatar]", w).replaceWith(avatar({ name: p.name, role: p.role || "resident" }));
    $("[data-name]", w).textContent = p.name;
    $("[data-title]", w).textContent = [p.title, p.org].filter(Boolean).join(" · ");
    body.appendChild(w);
  }
  function ctxRow(dl, k, v, tone) {
    const r = tpl("t-ctx-row");
    $("[data-k]", r).textContent = k;
    const dd = $("[data-v]", r);
    dd.textContent = v;
    if (tone) dd.dataset.tone = tone;
    dl.appendChild(r);
  }

  // What this resident did with promotions (claimed, verified, redeemed, cancelled, rejected, could not claim), newest first: what Staff need to answer "I claimed it but..."
  function promoEvents(residentId) {
    try {
      // the notes are written for the resident ("your claim"): here they are said to Staff
      const SAID = { Verified: "Confirmed by the property team", Redeemed: "The code was used", Cancelled: "Cancelled by the resident" };
      return historyFor(localStorage, residentId, (id) => {
        const r = allRecords(localStorage).find((x) => String(x.id) === String(id));
        return r ? r.x.title : "";
      })
        .slice(0, 6)
        .map((e) => ({ ...e, note: e.label === "Verified" && /^Applied/.test(e.note) ? e.note : SAID[e.label] || e.note }));
    } catch {
      return [];
    }
  }

  // The same unit: what a housemate claimed, and the claims of the unit that block this resident (the one-per-unit rule), for Staff to refuse a second claim and not pay twice
  function unitPromo(residentId) {
    try {
      const title = (id) => {
        const r = allRecords(localStorage).find((x) => String(x.id) === String(id));
        return r ? r.x.title : "";
      };
      return { blocks: unitBlocks(localStorage, residentId, title), mates: unitHistory(localStorage, residentId, title).slice(0, 4) };
    } catch {
      return { blocks: [], mates: [] };
    }
  }

  // Everything a person did about promotions, deal by deal, for the "View all" window: [{ promoId, title, claims: n, st, label, code, at, by, mates: [{ name, st, at }] }]
  const WORD = { pending: "Pending", verified: "Verified", redeemed: "Used", rejected: "Not approved" };
  function promoOverview(residentId) {
    try {
      const st = residentState(localStorage, residentId);
      const recs = allRecords(localStorage);
      const titleOf = (id) => {
        const r = recs.find((x) => String(x.id) === String(id));
        return r ? r.x.title : "Promotion";
      };
      const states = (() => {
        try {
          return JSON.parse(localStorage.getItem("eso-pm-claimstate")) || {};
        } catch {
          return {};
        }
      })();
      return Object.keys(st.claims)
        .filter((id) => st.claims[id] && st.claims[id].count)
        .map((id) => {
          const c = st.claims[id];
          const cs = claimStatus(localStorage, residentId, id);
          const d = states[`${residentId}|${id}|${c.count}`] || {};
          return {
            promoId: id,
            key: cs ? (cs.cancelled ? "cancelled" : cs.st) : "pending",
            group: rewardGroup(cs ? (cs.cancelled ? "cancelled" : cs.st) : "pending", rewardInfo(localStorage, id)).group,
            title: titleOf(id),
            claims: c.count,
            label: cs ? (cs.cancelled ? "Cancelled" : WORD[cs.st] || cs.st) : "Pending",
            code: c.code || "",
            at: c.at || "",
            by: d.by ? `${d.by}${d.byId ? ` (${d.byId})` : ""}` : "",
            reason: cs && cs.st === "rejected" && !cs.cancelled ? cs.reason || "" : "",
            mates: householdClaims(localStorage, residentId, id).map((m) => ({ name: m.name, at: m.at, count: m.count })),
          };
        })
        .sort((a, b) => String(b.at).localeCompare(String(a.at)));
    } catch {
      return [];
    }
  }
  // "Also claimed in this unit by Jamie Rivera": the link between a claim and the people who share the unit
  const sameUnitLine = (mates) => (mates && mates.length ? `Also claimed in this unit by ${mates.map((m) => m.name).join(", ")}` : "");
  // The rewards of a resident and of the people of the same unit, deal by deal (inside a window `box`)
  function fillPromos(box, conv, resident) {
    const section = (title, rows, who) => {
      const sub = document.createElement("p");
      sub.className = "text-sm font-medium";
      sub.textContent = title;
      box.appendChild(sub);
      if (!rows.length) {
        const none = document.createElement("p");
        none.className = "text-sm text-muted-foreground";
        none.textContent = who ? "Nothing claimed yet." : "No one else in this unit has claimed a promotion.";
        box.appendChild(none);
        return;
      }
      const ul = document.createElement("ul");
      ul.setAttribute("role", "list");
      ul.className = "flex flex-col gap-step-sm";
      for (const r of rows) {
        const li = document.createElement("li");
        li.className = "flex flex-col gap-step-xs rounded-lg bg-background p-step-sm ring-1 ring-foreground/10";
        const line = document.createElement("div");
        line.className = "flex items-center justify-between gap-step-sm";
        const name = document.createElement("span");
        name.className = "text-sm font-medium";
        name.textContent = r.title;
        line.append(name, badge(r.label, { Pending: "warning", Verified: "info", Used: "success", "Not approved": "danger", Cancelled: "neutral" }[r.label] || "neutral"));
        const meta = document.createElement("span");
        meta.className = "text-xs text-muted-foreground";
        meta.textContent = [r.code && `Code ${r.code}`, r.claims > 1 ? `${r.claims} claims` : "", r.at && listTime(Date.parse(r.at) || 0, Date.now()), r.by && `Decided by ${r.by}`, r.reason && `Reason: ${r.reason}`].filter(Boolean).join(" · ");
        li.append(line, meta);
        const link = sameUnitLine(r.mates);
        if (link) {
          const p = document.createElement("p");
          p.className = "text-xs font-medium text-info-text";
          p.textContent = link;
          li.appendChild(p);
        }
        ul.appendChild(li);
      }
      box.appendChild(ul);
    };
    section(`${resident.name}`, promoOverview(conv.residentId), true);
    for (const m of unitMates(conv.residentId)) {
      // a promotion this person holds that the resident also holds is linked to the resident's own row above
      section(`Same unit: ${m.name}`, promoOverview(m.id).map((r) => ({ ...r, mates: [] })), true);
    }
    if (!unitMates(conv.residentId).length) section("Same unit", [], false);
    if (portal === "staff") box.appendChild(button("Open Claims inbox", { variant: "outline", icon: "forward", onClick: () => goPage("/staff/promotions.html", "#/promotions/claims") }));
  }
  // Press the resident's picture in the chat: one window, "Resident information", with three tabs. Profile: who and where they live. Resident reward: what they claimed
  // (Current claim, with the steps it is at; History claimed) and what the others in the unit did. Ticket: their tickets with number and stage (Current ticket, History ticket).
  let tabSeq = 0; // makes the ids of the tabs and their panels unique
  function tabset(label, items, { sub = false, start = 0, onSelect } = {}) {
    const wrap = document.createElement("div");
    wrap.className = "flex flex-col gap-step-md";
    const bar = document.createElement("div");
    bar.setAttribute("role", "tablist");
    bar.setAttribute("aria-label", label);
    bar.className = "flex flex-wrap gap-step-xs" + (sub ? "" : " border-b border-border pb-step-sm");
    const panels = [];
    const tabs = items.map((it, n) => {
      const tab = tpl("t-tab");
      $("[data-label]", tab).textContent = it.label;
      if (it.count != null) {
        const c = $("[data-count]", tab);
        c.hidden = false;
        c.textContent = String(it.count);
      }
      const base = `${sub ? "rsub" : "rtab"}-${it.id}-${++tabSeq}`;
      tab.id = `${base}-t`;
      const panel = document.createElement("div");
      panel.id = `${base}-p`;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      panel.className = "flex flex-col gap-step-md";
      tab.setAttribute("aria-controls", panel.id);
      it.build(panel);
      panels.push(panel);
      bar.appendChild(tab);
      return tab;
    });
    const select = (n, focus) => {
      tabs.forEach((t, k) => {
        t.setAttribute("aria-selected", String(k === n));
        t.tabIndex = k === n ? 0 : -1;
        panels[k].hidden = k !== n;
      });
      if (onSelect) onSelect(n);
      if (focus) tabs[n].focus();
    };
    tabs.forEach((t, n) => {
      t.addEventListener("click", () => select(n, false));
      t.addEventListener("keydown", (e) => {
        const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (k) {
          e.preventDefault();
          select((n + k + tabs.length) % tabs.length, true);
        }
        if (e.key === "Home") {
          e.preventDefault();
          select(0, true);
        }
        if (e.key === "End") {
          e.preventDefault();
          select(tabs.length - 1, true);
        }
      });
    });
    select(Math.min(start, tabs.length - 1), false);
    wrap.append(bar, ...panels);
    return wrap;
  }
  const paragraph = (text, cls = "text-sm text-muted-foreground") => {
    const p = document.createElement("p");
    p.className = cls;
    p.textContent = text;
    return p;
  };
  // a person's claim events, read once each time the window is drawn (the steps of every card and the History list come from it)
  function timelineOf(residentId) {
    if (!ui.infoCache) ui.infoCache = new Map();
    if (!ui.infoCache.has(residentId)) {
      const recs = allRecords(localStorage);
      const titleOf = (id) => (recs.find((x) => String(x.id) === String(id)) || { x: {} }).x.title || "";
      ui.infoCache.set(residentId, historyFor(localStorage, residentId, titleOf));
    }
    return ui.infoCache.get(residentId);
  }
  // A list of the window, folded: the first two rows and how many there are; "Show all N" opens the rest (in a box that scrolls, at most FOLD_MAX rows), "Show fewer" folds it again.
  // Only the rows on show are drawn. Whether a list is open is kept in ui.infoState, so it stays open when the window is redrawn after a decision.
  function foldedList(panel, key, rows, make, { gap = "gap-step-sm", empty = "" } = {}) {
    if (!rows.length) return empty && panel.appendChild(paragraph(empty));
    const state = ui.infoState || { open: {} };
    state.open = state.open || {};
    const wrap = document.createElement("div");
    wrap.className = "flex flex-col items-start gap-step-sm";
    const scroller = document.createElement("div");
    scroller.className = "w-full";
    const ul = document.createElement("ul");
    ul.setAttribute("role", "list");
    ul.className = `flex flex-col ${gap}`;
    scroller.appendChild(ul);
    const more = document.createElement("div");
    more.className = "flex flex-col items-start gap-step-xs";
    wrap.append(scroller, more);
    const draw = () => {
      const f = fold(rows, { open: !!state.open[key] });
      ul.replaceChildren(...f.visible.map(make));
      // an open list scrolls inside its own box (the stylesheet only knows classes written in HTML, so the size is set here)
      scroller.style.maxHeight = f.open ? "360px" : "";
      scroller.style.overflowY = f.open ? "auto" : "";
      scroller.style.padding = f.open ? "2px" : ""; // room for the rows' rings at the edge of the box
      if (f.open) {
        scroller.tabIndex = 0;
        scroller.setAttribute("role", "group");
        scroller.setAttribute("aria-label", `${f.total} items`);
      } else {
        scroller.removeAttribute("tabindex");
        scroller.removeAttribute("role");
        scroller.removeAttribute("aria-label");
      }
      more.replaceChildren();
      if (f.open && f.hidden > 0) more.appendChild(paragraph(`Showing the newest ${f.visible.length} of ${f.total}. ${f.hidden} older ones are left out.`, "text-xs text-muted-foreground"));
      if (f.canFold) {
        const b = button(f.label, { variant: "ghost", onClick: () => {
          state.open[key] = !state.open[key];
          draw();
        } });
        b.setAttribute("aria-expanded", String(f.open));
        if (!f.open) b.setAttribute("aria-label", `Show all ${f.total}, ${f.total - f.visible.length} more`);
        more.prepend(b);
      }
    };
    draw();
    panel.appendChild(wrap);
  }
  // the steps of a claim, as Staff read them ("Claimed, Reviewed, Approved ..."): done, now, next, stopped
  function stepList(residentId, row) {
    const timeline = timelineOf(residentId).filter((e) => e.promoId === row.promoId);
    const WORDS = { "Cancelled by you": "Cancelled by the resident", "Approved: your code is ready": "Approved: the code is ready", "Awaiting staff approval": "Waiting for Staff to approve", "Staff approval": "Staff approval" };
    const ol = document.createElement("ol");
    ol.setAttribute("role", "list");
    ol.className = "flex flex-col gap-step-xs";
    for (const st of claimSteps(row.key, timeline)) {
      const li = document.createElement("li");
      li.className = "flex items-start gap-step-sm text-xs";
      const mark = document.createElement("span");
      mark.setAttribute("aria-hidden", "true");
      mark.className = { done: "text-success-text", current: "text-warning-text", stop: "text-danger-text", todo: "text-muted-foreground" }[st.state] + " w-4 shrink-0 text-center font-medium";
      mark.textContent = { done: "\u2713", current: "\u25CF", stop: "\u2715", todo: "\u25CB" }[st.state];
      const state = document.createElement("span");
      state.className = "sr-only";
      state.textContent = { done: "Done: ", current: "Now: ", stop: "Stopped: ", todo: "Next: " }[st.state];
      const text = document.createElement("span");
      text.className = st.state === "todo" ? "text-muted-foreground" : "text-foreground";
      text.textContent = [WORDS[st.label] || st.label, st.at && formatFull(Date.parse(st.at) || 0), st.state === "current" && row.at ? `waiting since ${listTime(Date.parse(row.at) || 0, Date.now())}` : "", st.note && `(${st.note})`].filter(Boolean).join(" \u00b7 ");
      li.append(mark, state, text);
      ol.appendChild(li);
    }
    return ol;
  }
  // "Checks before you decide": the facts behind the reasons Staff can give (not a current resident, already claimed in the unit, claim limit, expired), read from the real records.
  // Returns [{ ok: true | false, text }]: a check that passes (true), one that does not (false).
  function claimChecks(residentId, row, unit) {
    const out = [];
    if (unit && Number.isFinite(unit.daysLeft)) {
      out.push(unit.daysLeft >= 0 ? { ok: true, text: `Lease active: ends ${fmtDate(unit.leaseEnd)} (${unit.daysLeft} days left)` } : { ok: false, text: `Lease ended ${-unit.daysLeft} days ago` });
    }
    let live = null;
    try {
      live = listPromotions(localStorage, { viewer: residentId }).find((p) => String(p.id) === String(row.promoId)) || null;
    } catch {
      live = null;
    }
    if (!live) out.push({ ok: false, text: "The deal is not running now (it ended, was paused or removed)" });
    else {
      const ends = live.endsAt ? `, ends ${formatFull(live.endsAt)}` : "";
      const left = live.left != null ? `, ${live.left} of ${live.total} left` : "";
      out.push({ ok: true, text: `The deal is running${ends}${left}` });
    }
    const mates = householdClaims(localStorage, residentId, row.promoId);
    out.push(mates.length ? { ok: false, text: `${mates.map((m) => m.name).join(", ")} (same unit) also claimed this deal` } : { ok: true, text: "No one else in this unit has claimed this deal" });
    return out;
  }
  function checkList(residentId, row, unit) {
    const box = document.createElement("div");
    box.className = "flex flex-col gap-step-xs";
    box.appendChild(paragraph("Checks before you decide", "text-xs font-medium text-foreground-secondary"));
    const ul = document.createElement("ul");
    ul.setAttribute("role", "list");
    ul.className = "flex flex-col gap-step-xs";
    for (const c of claimChecks(residentId, row, unit)) {
      const li = document.createElement("li");
      li.className = "flex items-start gap-step-sm text-xs";
      const mark = document.createElement("span");
      mark.setAttribute("aria-hidden", "true");
      mark.className = (c.ok ? "text-success-text" : "text-danger-text") + " w-4 shrink-0 text-center font-medium";
      mark.textContent = c.ok ? "\u2713" : "\u2715";
      const word = document.createElement("span");
      word.className = "sr-only";
      word.textContent = c.ok ? "Passed: " : "Needs attention: ";
      const text = document.createElement("span");
      text.className = c.ok ? "text-foreground" : "font-medium text-danger-text";
      text.textContent = c.text;
      li.append(mark, word, text);
      ul.appendChild(li);
    }
    box.appendChild(ul);
    return box;
  }
  // one claim: its deal, the state it is in, the code, who decided, who else in the unit has it, and its steps
  function rewardCard(residentId, r, { withSteps = true } = {}) {
    const li = document.createElement("li");
    li.className = "flex flex-col gap-step-sm rounded-lg bg-background p-step-sm ring-1 ring-foreground/10";
    const line = document.createElement("div");
    line.className = "flex items-center justify-between gap-step-sm";
    const name = document.createElement("span");
    name.className = "min-w-0 flex-1 text-sm font-medium wrap-anywhere";
    name.textContent = r.title;
    line.append(name, badge(r.label, { Pending: "warning", Verified: "info", Used: "success", "Not approved": "danger", Cancelled: "neutral" }[r.label] || "neutral"));
    li.appendChild(line);
    li.appendChild(paragraph([r.code && `Code ${r.code}`, r.claims > 1 ? `${r.claims} claims` : "", r.at && `Claimed ${formatFull(Date.parse(r.at) || 0)}`, r.by && `Decided by ${r.by}`, r.reason && `Reason: ${r.reason}`].filter(Boolean).join(" \u00b7 "), "text-xs text-muted-foreground"));
    const link = sameUnitLine(r.mates);
    if (link) li.appendChild(paragraph(link, "text-xs font-medium text-info-text"));
    if (withSteps) li.appendChild(stepList(residentId, r));
    return li;
  }
  function claimList(panel, key, residentId, rows, empty, extra) {
    foldedList(
      panel,
      key,
      rows,
      (r) => {
        const li = rewardCard(residentId, r);
        if (extra) extra(r, li);
        return li;
      },
      { empty },
    );
  }
  // what happened to a resident's claims, newest first (claimed, approved, used, not approved, cancelled, could not claim)
  function eventList(panel, key, residentId, empty) {
    foldedList(
      panel,
      key,
      timelineOf(residentId),
      (e) => {
        const li = document.createElement("li");
        li.className = "flex flex-col gap-step-xs rounded-lg bg-background p-step-sm ring-1 ring-foreground/10";
        const line = document.createElement("div");
        line.className = "flex items-center justify-between gap-step-sm";
        const name = document.createElement("span");
        name.className = "min-w-0 flex-1 text-sm font-medium wrap-anywhere";
        name.textContent = e.title;
        line.append(name, badge(e.label, { Claimed: "warning", Verified: "info", Redeemed: "success", Rejected: "danger", Cancelled: "neutral", "Could not claim": "danger" }[e.label] || "neutral"));
        li.append(line, paragraph([e.at && formatFull(Date.parse(e.at) || 0), e.note].filter(Boolean).join(" \u00b7 "), "text-xs text-muted-foreground"));
        return li;
      },
      { gap: "gap-step-xs", empty },
    );
  }
  const STAGE_TONE = { open: "info", in_progress: "success", waiting_on_resident: "warning", resolved: "neutral", closed: "neutral" };
  function ticketRows(panel, key, dlg, rows, empty) {
    foldedList(
      panel,
      key,
      rows,
      (k) => {
        const li = tpl("t-ctx-ticket");
        $("[data-topic]", li).textContent = `${k.no} \u00b7 ${k.topic}`;
        $("[data-stage]", li).appendChild(badge(STAGE_LABEL[k.stage], STAGE_TONE[k.stage]));
        $("[data-meta]", li).textContent = [k.current ? "This chat" : "", `Updated ${listTime(k.at, Date.now())}`, k.assignee && `Handled by ${k.assignee}`].filter(Boolean).join(" \u00b7 ");
        const b = $("[data-open]", li);
        if (k.current) b.addEventListener("click", () => dlg.close());
        else if (k.open)
          b.addEventListener("click", () => {
            dlg.close();
            openConv(k.id);
          });
        else b.disabled = true;
        return li;
      },
      { gap: "gap-0", empty },
    );
  }
  function openResidentInfo(conv, keep) {
    const data = store.contextFor(conv.id, me.id);
    if (!data || data.kind !== "resident" || !data.person) return;
    const st = keep || { main: 0, reward: 0, ticket: 0, open: {} };
    st.open = st.open || {};
    ui.infoState = st;
    ui.infoCache = new Map(); // read again each time the window is drawn
    let dlg = document.getElementById("res-info");
    const scroll = dlg ? dlg.scrollTop : 0; // a rebuilt window stays where it was
    if (dlg) dlg.remove();
    const rebuild = () => openResidentInfo(conv, st);
    ui.infoRefresh = rebuild;
    dlg = document.createElement("dialog");
    dlg.id = "res-info";
    dlg.setAttribute("aria-labelledby", "res-info-title");
    dlg.className = "m-auto max-h-dvh w-full max-w-lg overflow-y-auto rounded-xl bg-card p-0 text-foreground shadow-lift-md backdrop:bg-foreground/40";
    const box = document.createElement("div");
    box.className = "flex flex-col gap-step-md p-step-lg";
    const head = document.createElement("div");
    head.className = "flex items-start justify-between gap-step-md";
    const who = document.createElement("div");
    who.className = "flex min-w-0 items-center gap-step-md";
    const nm = document.createElement("div");
    nm.className = "min-w-0";
    const h = document.createElement("h2");
    h.id = "res-info-title";
    h.className = "text-lg leading-6 font-semibold";
    h.textContent = "Resident information";
    nm.append(h, paragraph(`${data.person.name} \u00b7 Unit ${data.unit.number}`));
    who.append(avatar({ name: data.person.name, role: "resident" }), nm);
    head.append(who, button("Close", { variant: "outline", onClick: () => dlg.close() }));
    box.appendChild(head);

    const rid = data.person.id;
    const mine = promoOverview(rid);
    const mates = unitMates(rid);
    const decidingNow = ["staff", "admin"].includes(me.role) && conv.kind === "resident_support" ? decidable(rid) : [];
    const current = mine.filter((r) => r.group === "active" || decidingNow.some((c) => c.promoId === r.promoId)); // a claim Staff can still decide is always in Current
    const matesCurrent = mates.map((m) => ({ m, rows: promoOverview(m.id).filter((r) => r.group === "active").map((r) => ({ ...r, mates: [] })) }));
    const tickets = data.ticketList || [];
    const isCurrentTicket = (k) => ["open", "in_progress", "waiting_on_resident"].includes(k.stage);

    box.appendChild(
      tabset("Resident information", [
        {
          id: "profile",
          label: "Profile",
          build: (panel) => {
            const u = data.unit;
            const dl = document.createElement("dl");
            dl.className = "flex flex-col gap-step-sm";
            ctxRow(dl, "Apartment", u.number);
            ctxRow(dl, "Location", u.building);
            const reach = readPrefs(localStorage, data.person.id);
            if (reach.phone) ctxRow(dl, "Phone", reach.phone);
            ctxRow(dl, "Prefers", { app: "In the app", email: "Email", text: "Text message" }[reach.contact] || "In the app");
            ctxRow(dl, "Lease", `${fmtDate(u.leaseStart)} to ${fmtDate(u.leaseEnd)}`);
            const left = u.daysLeft;
            ctxRow(dl, "Lease status", left < 0 ? `Ended ${-left} days ago` : left <= 60 ? `Ends in ${left} days` : `${left} days left`, left < 0 ? "danger" : left <= 60 ? "warning" : "success");
            panel.appendChild(dl);
            panel.appendChild(paragraph(`Unit entry notes: ${u.entry || "No notes."}`, "text-sm text-foreground-secondary"));
            if (mates.length) panel.appendChild(paragraph(`Same unit: ${mates.map((m) => m.name).join(", ")}`, "text-sm text-foreground-secondary"));
          },
        },
        {
          id: "reward",
          label: "Resident reward",
          build: (panel) => {
            panel.appendChild(
              tabset(
                "Resident reward",
                [
                  {
                    id: "current",
                    label: "Current claim",
                    count: current.length + matesCurrent.reduce((n, x) => n + x.rows.length, 0),
                    build: (p) => {
                      // the one-per-unit rule: said first and in red, with whose account and when
                      for (const b of unitPromo(rid).blocks) {
                        const al = document.createElement("p");
                        al.setAttribute("role", "alert");
                        al.className = "rounded-md border border-danger-text bg-danger-bg p-step-sm text-sm font-medium text-danger-text";
                        const when = b.at ? new Date(b.at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
                        al.textContent = `This unit already got "${b.title}" through ${b.by}'s account${when ? ` on ${when}` : ""}. One per unit: a second claim is blocked. Do not pay it twice.`;
                        p.appendChild(al);
                      }
                      p.appendChild(paragraph(data.person.name, "text-sm font-medium"));
                      const toDecide = ["staff", "admin"].includes(me.role) && conv.kind === "resident_support" ? decidable(rid) : [];
                      claimList(p, "cur", rid, current, "No claim in progress.", (r, li) => {
                        const d = toDecide.find((x) => x.promoId === r.promoId);
                        if (d) {
                          if (r.key === "pending") li.appendChild(checkList(rid, r, data.unit));
                          li.appendChild(decisionBox(conv, d, rebuild));
                        }
                      });
                      for (const { m, rows } of matesCurrent) {
                        p.appendChild(paragraph(`Same unit: ${m.name}`, "text-sm font-medium"));
                        claimList(p, `cur-${m.id}`, m.id, rows, "No claim in progress.");
                      }
                      if (portal === "staff") p.appendChild(button("Open Claims inbox", { variant: "outline", icon: "forward", onClick: () => goPage("/staff/promotions.html", "#/promotions/claims") }));
                    },
                  },
                  {
                    id: "history",
                    label: "History claimed",
                    count: timelineOf(rid).length + mates.reduce((n, m) => n + timelineOf(m.id).length, 0),
                    build: (p) => {
                      p.appendChild(paragraph(data.person.name, "text-sm font-medium"));
                      eventList(p, "hist", rid, "Nothing claimed yet.");
                      for (const m of mates) {
                        p.appendChild(paragraph(`Same unit: ${m.name}`, "text-sm font-medium"));
                        eventList(p, `hist-${m.id}`, m.id, "Nothing claimed yet.");
                      }
                    },
                  },
                ],
                { sub: true, start: st.reward, onSelect: (n) => (st.reward = n) },
              ),
            );
          },
        },
        {
          id: "ticket",
          label: "Ticket",
          build: (panel) => {
            const now = tickets.filter(isCurrentTicket);
            const past = tickets.filter((k) => !isCurrentTicket(k));
            panel.appendChild(
              tabset(
                "Tickets",
                [
                  { id: "current", label: "Current ticket", count: now.length, build: (p) => ticketRows(p, "tk-now", dlg, now, "No ticket in progress.") },
                  { id: "history", label: "History ticket", count: past.length, build: (p) => ticketRows(p, "tk-past", dlg, past, "No earlier tickets.") },
                ],
                { sub: true, start: st.ticket, onSelect: (n) => (st.ticket = n) },
              ),
            );
          },
        },
      ], { start: st.main, onSelect: (n) => (st.main = n) }),
    );
    dlg.appendChild(box);
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });
    dlg.addEventListener("close", () => {
      ui.dlgClosedAt = Date.now(); // the Escape that closed this window must not also close the Details panel
      if (ui.infoRefresh === rebuild) ui.infoRefresh = null;
      dlg.remove();
    });
    document.body.appendChild(dlg);
    dlg.showModal();
    dlg.scrollTop = scroll;
  }
  function openAllPromos(conv, resident) {
    let dlg = document.getElementById("promos-all");
    if (dlg) dlg.remove();
    dlg = document.createElement("dialog");
    dlg.id = "promos-all";
    dlg.setAttribute("aria-labelledby", "promos-all-title");
    dlg.className = "m-auto max-h-dvh w-full max-w-lg overflow-y-auto rounded-xl bg-card p-0 text-foreground shadow-lift-md backdrop:bg-foreground/40";
    const box = document.createElement("div");
    box.className = "flex flex-col gap-step-md p-step-lg";
    const head = document.createElement("div");
    head.className = "flex items-start justify-between gap-step-md";
    const h = document.createElement("h2");
    h.id = "promos-all-title";
    h.className = "text-lg leading-6 font-semibold";
    h.textContent = `Promotions of ${resident.name}`;
    const close = button("Close", { variant: "outline", onClick: () => dlg.close() });
    head.append(h, close);
    box.appendChild(head);
    const rule = document.createElement("p");
    rule.className = "text-sm text-muted-foreground";
    rule.textContent = "A promotion that is one per unit can be claimed once for the whole unit. What the others in the unit claimed is listed below, so you see who already has it.";
    box.appendChild(rule);
    fillPromos(box, conv, resident);
    dlg.appendChild(box);
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });
    dlg.addEventListener("close", () => {
      ui.dlgClosedAt = Date.now(); // the Escape that closed this window must not also close the Details panel
      dlg.remove();
    });
    document.body.appendChild(dlg);
    dlg.showModal();
  }

  // The claims of this resident that wait for Staff (or are confirmed and can still be applied by hand): [{ promoId, title, st, manual, n }]
  function decidable(residentId) {
    try {
      const st = residentState(localStorage, residentId);
      return Object.keys(st.claims)
        .filter((id) => st.claims[id] && st.claims[id].code)
        .map((id) => {
          const cs = claimStatus(localStorage, residentId, id);
          const r = allRecords(localStorage).find((x) => String(x.id) === id);
          return { promoId: id, title: r ? r.x.title : "Promotion", st: cs ? cs.st : "pending", manual: cs && cs.manual ? cs.manual : "", cancelled: !!(cs && cs.cancelled), n: st.claims[id].count };
        })
        .filter((c) => !c.cancelled && (c.st === "pending" || c.st === "verified"));
    } catch {
      return [];
    }
  }

  // Confirm, Apply by hand and Reject without leaving the chat: one click opens the reasons, the second picks one (or types another and presses Apply or Reject)
  const APPLY_WHY = ["Discount credited to this month's invoice", "Difference refunded to the resident", "Deal added to the resident's account", "Checked: the deal was already applied"];
  const REJECT_WHY = ["Not a current resident at this unit", "Already claimed on another account in this unit", "Claim limit reached", "Promotion expired before the claim"];
  function decide(conv, c, action, reason) {
    const r = decideClaim(localStorage, { rid: conv.residentId, promoId: c.promoId, action, reason, by: me.name, byId: me.id });
    if (!r.ok) {
      toast(r.reason);
      return;
    }
    ui.decide = null;
    if (r.noop) toast("Already done.");
    else {
      const text = decisionText(action, c.title, reason);
      if (text) store.noteClaimDecision(conv.id, me.id, text);
      toast(action === "verify" ? "Claim confirmed." : action === "apply" ? "Applied. The resident was told in the chat." : "Claim rejected. The resident was told in the chat.");
    }
    ui.sigCtx = "";
    renderAll(true);
    if (ui.infoRefresh) ui.infoRefresh();
  }
  function decisionBox(conv, c, onChange) {
    const redraw = onChange || (() => renderContext(store.get(conv.id, me.id)));
    const box = document.createElement("div");
    box.className = "mt-step-xs flex flex-col gap-step-xs rounded-md bg-muted p-step-sm";
    const mine = ui.decide && ui.decide.promoId === c.promoId ? ui.decide.kind : null;
    const row = document.createElement("div");
    row.className = "flex flex-wrap gap-step-xs";
    if (c.st === "pending") row.appendChild(button("Confirm claim", { variant: "primary", onClick: () => decide(conv, c, "verify", "") }));
    if (!c.manual) {
      row.appendChild(button("Apply by hand", { variant: mine === "apply" ? "soft" : "outline", onClick: () => { ui.decide = mine === "apply" ? null : { promoId: c.promoId, kind: "apply" }; ui.sigCtx = ""; redraw(); } }));
    }
    row.appendChild(button("Reject", { variant: mine === "reject" ? "soft" : "outline", onClick: () => { ui.decide = mine === "reject" ? null : { promoId: c.promoId, kind: "reject" }; ui.sigCtx = ""; redraw(); } }));
    box.appendChild(row);
    if (mine) {
      const label = document.createElement("p");
      label.className = "text-xs text-muted-foreground";
      label.textContent = mine === "apply" ? "What you did (the resident is told in the chat):" : "Why (the resident is told in the chat):";
      box.appendChild(label);
      for (const why of mine === "apply" ? APPLY_WHY : REJECT_WHY) box.appendChild(button(why, { variant: "outline", onClick: () => decide(conv, c, mine, why) }));
      const other = document.createElement("input");
      other.type = "text";
      other.maxLength = 200;
      other.placeholder = "Another reason…";
      other.setAttribute("aria-label", "Another reason");
      other.className = "h-8 w-full rounded-md border border-input bg-card px-step-sm text-sm";
      const go = button(mine === "apply" ? "Apply" : "Reject", { variant: "primary", onClick: () => decide(conv, c, mine, other.value) });
      other.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          go.click();
        }
      });
      box.append(other, go);
    }
    return box;
  }

  function hideContext() {
    $("#context-pane").hidden = true;
    $("#view-app").dataset.context = "closed";
    ui.sigCtx = "";
  }

  function renderContext(t) {
    const data = ["staff", "admin"].includes(me.role) ? store.contextFor(t.conv.id, me.id) : null;
    if (!data || data.kind === "resident" || !contextOpen()) return hideContext(); // a resident's details are the Resident information window
    $("#context-pane").hidden = false;
    $("#view-app").dataset.context = "open";
    const promoEv = data && data.kind === "resident" && data.person ? promoEvents(data.person.id) : [];
    const unitEv = data && data.kind === "resident" && data.person ? unitPromo(data.person.id) : { blocks: [], mates: [] };
    const asked = askedCard(t);
    const toDecide = data && data.kind === "resident" && data.person && ["staff", "admin"].includes(me.role) && t.conv.kind === "resident_support" ? decidable(data.person.id) : [];
    const sig = JSON.stringify([t.conv.id, data, promoEv, unitEv, asked && asked.promoId, toDecide, ui.decide, t.actions, t.row.pinned, t.row.important, t.row.muted, Math.floor(Date.now() / 3600000)]);
    if (sig === ui.sigCtx) return;
    ui.sigCtx = sig;
    clear($("#context-body"));
    $("#context-title").textContent = data.kind === "resident" ? "Resident and unit" : "People";
    if (data.kind === "resident") {
      const u = data.unit;
      const who = ctxSection("Resident");
      ctxWho(who, { ...data.person, role: "resident" });
      const dl = document.createElement("dl");
      dl.className = "flex flex-col gap-step-sm";
      who.appendChild(dl);
      ctxRow(dl, "Unit", u.number);
      ctxRow(dl, "Location", u.building);
      // How the resident chose to be reached (Settings > My profile): their phone, if they gave one, and the way they prefer to hear from the property team.
      const reach = readPrefs(localStorage, data.person && data.person.id);
      if (reach.phone) ctxRow(dl, "Phone", reach.phone);
      ctxRow(dl, "Prefers", { app: "In the app", email: "Email", text: "Text message" }[reach.contact] || "In the app");
      ctxRow(dl, "Lease", `${fmtDate(u.leaseStart)} to ${fmtDate(u.leaseEnd)}`);
      const left = u.daysLeft;
      ctxRow(dl, "Lease status", left < 0 ? `Ended ${-left} days ago` : left <= 60 ? `Ends in ${left} days` : `${left} days left`, left < 0 ? "danger" : left <= 60 ? "warning" : "success");
      const entry = ctxSection("Unit entry notes");
      const p = document.createElement("p");
      p.className = "text-sm text-foreground-secondary";
      p.textContent = u.entry || "No notes.";
      entry.appendChild(p);
      const hist = ctxSection("Recent tickets");
      if (!data.tickets.length) {
        const none = document.createElement("p");
        none.className = "text-sm text-muted-foreground";
        none.textContent = "No other tickets from this resident.";
        hist.appendChild(none);
      } else {
        const ul = document.createElement("ul");
        ul.setAttribute("role", "list");
        ul.className = "flex flex-col";
        hist.appendChild(ul);
        for (const k of data.tickets) {
          const li = tpl("t-ctx-ticket");
          $("[data-topic]", li).textContent = k.topic;
          $("[data-stage]", li).appendChild(badge(STAGE_LABEL[k.stage], { open: "info", in_progress: "success", waiting_on_resident: "warning", resolved: "neutral", closed: "neutral" }[k.stage]));
          $("[data-meta]", li).textContent = [listTime(k.at, Date.now()), k.assignee].filter(Boolean).join(" · ");
          const b = $("[data-open]", li);
          if (k.open) b.addEventListener("click", () => openConv(k.id));
          else b.disabled = true;
          ul.appendChild(li);
        }
      }
      const promo = ctxSection("Promotions");
      // "View all": a window with every promotion this resident claimed and what the others in the unit claimed, linked deal by deal
      const hdr = promo.closest("section") && promo.closest("section").querySelector("[data-heading]");
      if (hdr) {
        // the heading and the button share one row: the button sits at the right end of the "Promotions" line
        const row = document.createElement("div");
        row.className = "flex items-center justify-between gap-step-sm";
        hdr.replaceWith(row);
        row.appendChild(hdr);
        const all = button("View all", { variant: "outline", ariaLabel: "View all promotions of this resident and their unit", onClick: () => openAllPromos(t.conv, data.person || { name: "this resident" }) });
        row.appendChild(all);
      }
      // the one-per-unit rule: said first and in red, with whose account and when
      for (const b of unitEv.blocks) {
        const al = document.createElement("p");
        al.setAttribute("role", "alert");
        al.className = "rounded-md border border-danger-text bg-danger-bg p-step-sm text-sm font-medium text-danger-text";
        const when = b.at ? new Date(b.at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
        al.textContent = `This unit already got "${b.title}" through ${b.by}'s account${when ? ` on ${when}` : ""}. One per unit: a second claim is blocked. Do not pay it twice.`;
        promo.appendChild(al);
      }
      if (!promoEv.length) {
        const none = document.createElement("p");
        none.className = "text-sm text-muted-foreground";
        none.textContent = "No promotion claims from this resident.";
        promo.appendChild(none);
      } else {
        const ul = document.createElement("ul");
        ul.setAttribute("role", "list");
        ul.className = "flex flex-col gap-step-sm";
        promo.appendChild(ul);
        const TONE = { Claimed: "warning", Verified: "info", Redeemed: "success", Rejected: "danger", "Could not claim": "danger", Cancelled: "neutral" };
        for (const e of promoEv) {
          const li = document.createElement("li");
          const lit = !!asked && !!asked.promoId && e.promoId === asked.promoId;
          li.className = `flex flex-col gap-step-xs${lit ? " rounded-md bg-info-bg p-step-sm ring-1" : ""}`;
          if (lit) li.dataset.asked = "true";
          const head = document.createElement("div");
          head.className = "flex items-center justify-between gap-step-sm";
          const name = document.createElement("span");
          name.className = "text-sm font-medium text-foreground";
          name.textContent = e.title;
          head.append(name, badge(e.label, TONE[e.label] || "neutral"));
          const meta = document.createElement("span");
          meta.className = "text-xs text-muted-foreground";
          meta.textContent = [lit ? "Asked about" : "", listTime(Date.parse(e.at) || 0, Date.now()), e.note].filter(Boolean).join(" · ");
          li.append(head, meta);
          const link = sameUnitLine(householdClaims(localStorage, t.conv.residentId, e.promoId).map((m) => ({ name: m.name })));
          if (link) {
            const p = document.createElement("p");
            p.className = "text-xs font-medium text-info-text";
            p.textContent = link;
            li.appendChild(p);
          }
          ul.appendChild(li);
        }
      }
      if (toDecide.length) {
        const sub = document.createElement("p");
        sub.className = "mt-step-sm text-xs font-medium text-muted-foreground";
        sub.textContent = "Decide";
        promo.appendChild(sub);
        const decideList = document.createElement("div");
        decideList.className = "flex flex-col gap-step-sm overflow-y-auto";
        decideList.style.maxHeight = "320px"; // many claims scroll inside their own box (the page's stylesheet only knows classes written in HTML)
        decideList.tabIndex = 0;
        decideList.setAttribute("role", "group");
        decideList.setAttribute("aria-label", "Claims to decide");
        promo.appendChild(decideList);
        for (const c of toDecide) {
          const wrap = document.createElement("div");
          wrap.className = "flex flex-col gap-step-xs";
          const head = document.createElement("div");
          head.className = "flex items-center justify-between gap-step-sm";
          const name = document.createElement("span");
          name.className = "text-sm font-medium text-foreground";
          name.textContent = c.title;
          head.append(name, badge(c.manual ? "Applied by hand" : c.st === "verified" ? "Confirmed" : "Waiting", c.manual || c.st === "verified" ? "success" : "warning"));
          wrap.append(head, decisionBox(t.conv, c));
          decideList.appendChild(wrap);
        }
      }
      if (unitEv.mates.length) {
        const sub = document.createElement("p");
        sub.className = "mt-step-sm text-xs font-medium text-muted-foreground";
        sub.textContent = `Same unit (${u.number})`;
        promo.appendChild(sub);
        const ul2 = document.createElement("ul");
        ul2.setAttribute("role", "list");
        ul2.className = "flex flex-col gap-step-sm";
        for (const e of unitEv.mates) {
          const li = document.createElement("li");
          li.className = "flex flex-col gap-step-xs";
          const head = document.createElement("div");
          head.className = "flex items-center justify-between gap-step-sm";
          const name = document.createElement("span");
          name.className = "text-sm text-foreground";
          name.textContent = `${e.name}: ${e.title}`;
          head.append(name, badge(e.label, { Claimed: "warning", Verified: "info", Redeemed: "success", Rejected: "danger", "Could not claim": "danger", Cancelled: "neutral" }[e.label] || "neutral"));
          const meta = document.createElement("span");
          meta.className = "text-xs text-muted-foreground";
          meta.textContent = listTime(Date.parse(e.at) || 0, Date.now());
          li.append(head, meta);
          ul2.appendChild(li);
        }
        promo.appendChild(ul2);
      }
      if (portal === "staff") promo.appendChild(button("Open Claims inbox", { variant: "outline", icon: "forward", onClick: () => goPage("/staff/promotions.html", "#/promotions/claims") }));
    } else {
      const ppl = ctxSection("In this conversation");
      data.people.forEach((p) => ctxWho(ppl, p));
    }
    const qa = ctxSection("Quick actions");
    qa.className += " items-start";
    const add = (label, icon, run) => qa.appendChild(button(label, { variant: "outline", icon, onClick: run }));
    if (t.actions.includes("claim")) add("Take conversation", "check", () => act(store.claim(t.conv.id, me.id), "You took this conversation."));
    for (const route of ["platform", "property"]) {
      if (t.actions.includes(`move:${route}`))
        add(route === "platform" ? "Move to EasySpotOps Support" : "Move to Property team", "forward", () => {
          ui.quiet = t.conv.id;
          return act(store.reroute(t.conv.id, me.id, route), "Moved. The summary went with it.");
        });
    }
    if (t.actions.includes("ack_emergency")) add("Acknowledge emergency", "alert", () => act(store.acknowledgeEmergency(t.conv.id, me.id), "Emergency acknowledged."));
    if (t.actions.includes("wait")) add("Waiting on resident", "clock", () => act(store.setTicketState(t.conv.id, me.id, "waiting_on_resident"), "Marked as waiting on the resident."));
    if (t.actions.includes("resume")) add("Back to in progress", "check", () => act(store.setTicketState(t.conv.id, me.id, "in_progress"), "Back to in progress."));
    add(t.row.important ? "Remove important flag" : "Flag as important", "flag", () => toggleFlag(t.conv.id, "important"));
    add(t.row.pinned ? "Unpin conversation" : "Pin conversation", "pin", () => toggleFlag(t.conv.id, "pinned"));
    add(t.row.muted ? "Unmute conversation" : "Mute conversation", "bell-off", () => toggleFlag(t.conv.id, "muted"));
    add("Hide conversation", "eye-off", () => hideConv(t.conv.id));
  }

  $("#ctx-close").addEventListener("click", () => {
    setContext(false);
    $("#btn-context")?.focus();
  });

  /** Unacknowledged emergencies, pinned above everything for Staff and Admin until someone acknowledges them. */
  function renderEmergencyBanner() {
    const list = store.emergencies(me.id);
    const sig = JSON.stringify([list.map((e) => [e.convId, e.smsAt]), Math.floor(Date.now() / 60000)]);
    if (sig === ui.sigBanner) return;
    ui.sigBanner = sig;
    const ul = $("#emergency-list");
    clear(ul);
    $("#emergency-banner").hidden = !list.length;
    for (const e of list) {
      const li = tpl("t-emergency-row");
      $("[data-text]", li).textContent = `Emergency: ${e.title}, ${duration(Date.now() - e.at)} ago${e.smsAt ? ". SMS and critical alert sent (simulated)" : ""}`;
      const box = $("[data-actions]", li);
      box.appendChild(button("Open chat", { variant: "outline", onClick: () => openConv(e.convId) }));
      box.appendChild(button("Acknowledge", { variant: "primary", icon: "check", onClick: () => act(store.acknowledgeEmergency(e.convId, me.id), "Emergency acknowledged.") }));
      ul.appendChild(li);
    }
  }

  /** Open -> In progress -> Waiting on resident -> Resolved -> Closed, with the current step marked. */
  function renderStage(t) {
    const box = $("#thread-stage");
    const ol = $("#stage-list");
    clear(ol);
    box.hidden = !t.stage;
    if (!t.stage) return;
    const at = STAGES.indexOf(t.stage);
    STAGES.forEach((s, i) => {
      const li = tpl("t-stage");
      $("[data-label]", li).textContent = STAGE_LABEL[s];
      li.dataset.state = i < at ? "done" : i === at ? "current" : "todo";
      if (i === at) li.setAttribute("aria-current", "step");
      if (i < at) $("[data-check]", li).removeAttribute("hidden"); // SVG elements have no .hidden property
      if (i === STAGES.length - 1) $("[data-arrow]", li).hidden = true;
      ol.appendChild(li);
    });
  }

  // The details panel opens by itself, once, for a conversation that carries a promotion claim; the person can still close it.
  // A screen with room for it (the strip at the top of the chat and the Details button serve the narrower ones).
  function autoContext(t) {
    if (!["staff", "admin"].includes(me.role) || ui.ctxSeen === t.conv.id || !askedCard(t)) return;
    ui.ctxSeen = t.conv.id;
    if (matchMedia("(min-width: 1024px)").matches) ui.ctxForce = t.conv.id;
  }

  function threadBanner(t) {
    const box = $("#thread-banner");
    clear(box);
    const { conv } = t;
    autoContext(t);
    if (t.emergency && me.role === "resident") box.appendChild(banner("warning", "Your emergency report was sent. The property team has been alerted and will respond as soon as they see it."));
    // A closed ticket is kept in the Ticket box with its whole conversation.
    const closedTicket = (conv.kind === "resident_support" && conv.status === "closed" && conv.queuedAt) || (conv.kind === "support" && conv.status === "resolved");
    if (closedTicket)
      box.appendChild(
        banner("neutral", `Saved as ${ticketNo(conv)} in the Ticket box.`, [
          button("Open Ticket box", { variant: "outline", icon: "ticket", onClick: () => goPage(`/${portal}/tickets.html`, `#/t/${conv.id}`) }),
        ]),
      );
    if (conv.kind === "announcement" && t.ack) {
      const names = t.ack.unread.length ? ` Not yet read: ${t.ack.unread.join(", ")}.` : " Everyone has read it.";
      box.appendChild(banner("info", `${t.ack.pct}% read (${t.ack.read} of ${t.ack.total}).${names}`));
    }
    const asked = ["staff", "admin"].includes(me.role) ? askedCard(t) : null;
    if (asked) box.appendChild(banner("info", `Asked about: ${asked.title}${asked.code ? ` · ${asked.code}` : ""}`, [button("Details", { variant: "outline", onClick: () => openResidentInfo(t.conv, { main: 1, reward: 0, ticket: 0, open: {} }) })]));
    if (offline()) box.appendChild(banner("warning", "You are offline. Messages will not send until the connection is back."));
    if (conv.kind === "resident_support" && me.role === "resident") {
      if (conv.status === "bot") box.appendChild(banner("neutral", "You are chatting with an automated assistant. The property team is only contacted if you ask for a person."));
      if (conv.status === "queued")
        box.appendChild(
          banner(
            "info",
            `Sent to the property team ${duration(Date.now() - (conv.queuedAt || Date.now()))} ago. A team member will reply here, and you will only be notified when someone does. You can add details below.`,
          ),
        );
    }
    if (conv.kind === "resident_support" && me.role === "staff" && conv.status === "queued")
      box.appendChild(banner("info", "The resident is waiting. Reply below, or press Take conversation. Either way they will see that you joined."));
    if (conv.kind === "support" && t.conv.status === "resolved")
      box.appendChild(banner("success", me.role === "admin" ? "A reply from the requester reopens it." : "Still need help? Reply here and it will reopen."));
  }

  function composerNote(t) {
    const note = $("#composer-note");
    const form = $("#composer");
    clear(note);
    const ok = t.canPost.ok;
    form.hidden = !ok;
    note.hidden = ok;
    if (ok) return;
    const reason = t.canPost.reason;
    let text = reasonText(reason);
    const actions = [];
    if (reason === "closed") {
      text = me.role === "resident" ? "This conversation has ended." : "Read only. A finished ticket cannot be changed.";
      if (me.role === "resident") actions.push(button("Start a new conversation", { variant: "primary", icon: "message", onClick: startResidentSession }));
    }
    if (reason === "not_claimed") text = "Take this conversation to reply. Until then the resident only sees that someone will answer.";
    if (reason === "awaiting_reply") text = "You have sent a note. You can write again once they reply, so they are not bothered.";
    if (reason === "one_way") {
      text = "This is a one-way message from Support. To reply, ask the property team.";
      actions.push(button("Ask the property team", { variant: "soft", icon: "users", onClick: startResidentSession }));
    }
    if (reason === "read_only") text = "Announcements are one-way. Replies are not collected here.";
    note.appendChild(banner("neutral", text, actions));
  }

  function composerState(t) {
    const input = $("#msg-input");
    const ph = (() => {
      const c = t.conv;
      if (c.kind === "resident_support" && me.role === "resident") return c.status === "bot" ? "Ask a question" : c.status === "queued" ? "Add details for the team" : "Write a message";
      if (c.kind === "resident_support" && t.canPost.takes) return "Reply to the resident…";
      if (c.kind === "support") return me.role === "admin" ? "Reply to the requester" : "Reply to Support";
      return "Write a message";
    })();
    input.placeholder = ph;
    const canEmergency = t.canPost.ok && ["resident", "staff", "admin"].includes(me.role) && ["resident_support", "direct"].includes(t.conv.kind) && !ui.edit;
    $("#btn-emergency").hidden = !canEmergency;
    if (!canEmergency && ui.emergency) {
      ui.emergency = false;
      renderComposerExtras();
    }
    const showCanned = t.canPost.ok && (me.role === "staff" || me.role === "admin");
    $("#btn-canned").hidden = !showCanned;
    $("#btn-send-resolve").hidden = !(t.canPost.ok && me.role === "admin" && t.conv.kind === "support" && t.conv.status !== "resolved" && !ui.edit);
    $("#canned-menu").hidden = !(showCanned && ui.cannedOpen);
    $("#btn-canned").setAttribute("aria-expanded", String(showCanned && ui.cannedOpen));
    if (showCanned && !$("#canned-menu").children.length) {
      CANNED[me.role].forEach((text) => {
        const b = tpl("t-canned");
        b.textContent = text;
        b.addEventListener("click", () => {
          insertText(text);
          ui.cannedOpen = false;
          renderThread(true);
          input.focus();
        });
        $("#canned-menu").appendChild(b);
      });
    }
    composerNote(t);
    updateCount();
  }

  function renderThread(force) {
    const none = $("#thread-none");
    const thread = $("#thread");
    if (!ui.convId) {
      none.hidden = false;
      thread.hidden = true;
      hideContext();
      return;
    }
    const t = store.get(ui.convId, me.id);
    if (!t.ok) {
      const lostId = ui.convId;
      ui.convId = null;
      ui.lastConv = null;
      none.hidden = false;
      thread.hidden = true;
      hideContext();
      if (isMobile() && ui.pane === "thread") {
        ui.pane = "list";
        root.dataset.pane = "list";
      }
      // (a request this person just passed to the other team is not "taken by someone": the move already said what happened)
      if (ui.quiet !== lostId) toast(me.role === "staff" ? "That conversation was taken by another team member." : reasonText(t.reason));
      ui.quiet = null;
      renderList(true);
      return;
    }
    none.hidden = true;
    thread.hidden = false;
    ui.lastKind = t.conv.kind;
    ui.lastStatus = t.conv.status;
    const sig = JSON.stringify([
      t.conv.id,
      t.conv.status,
      t.conv.assigneeId,
      t.conv.priority,
      t.actions,
      t.canPost,
      ui.confirm && ui.confirm.key,
      offline(),
      ui.cannedOpen,
      Math.floor(Date.now() / 60000),
      onlineOthers(t.conv),
      t.conv.participants || 0,
      t.row.pinned,
      t.row.muted,
      t.row.important,
      t.stage,
      !!t.emergency,
      t.ack ? t.ack.read : -1,
      contextOpen(),
    ]);
    if (force || sig !== ui.sigThread) {
      ui.sigThread = sig;
      const row = t.row;
      const av = $("#thread-avatar");
      av.dataset.role = row.avatar.role;
      clear(av);
      // the picture at the top of a resident's chat is the way in to "Resident information" (Staff and Admin)
      const info = ["staff", "admin"].includes(me.role) && t.conv.kind === "resident_support";
      av.dataset.action = String(info);
      if (info) {
        av.setAttribute("role", "button");
        av.tabIndex = 0;
        av.setAttribute("aria-label", `Resident information: ${row.avatar.name}`);
        av.title = "Resident information";
      } else {
        av.removeAttribute("role");
        av.removeAttribute("tabindex");
        av.removeAttribute("aria-label");
        av.removeAttribute("title");
      }
      if (row.avatar.role === "bot") {
        const icon = svgIcon("bot");
        icon.setAttribute("class", "size-5");
        av.appendChild(icon);
      } else {
        av.textContent = initials(row.avatar.name);
      }
      $("#thread-title").textContent = row.title;
      renderMarks(row);
      renderStage(t);
      // The ticket's number leads and stands out (it is how two tickets of one person are told apart); the rest of the line follows quietly.
      const subEl = $("#thread-sub");
      subEl.textContent = "";
      if (row.no) {
        const id = document.createElement("span");
        id.className = "font-medium tabular-nums text-foreground";
        id.textContent = row.no;
        subEl.append(id, " · ");
      }
      subEl.append(row.kind === "group" ? (row.subtitle || "").replace(/^\d+ people · /, "") : row.subtitle || "");
      const bx = $("#thread-badges");
      clear(bx);
      threadStatusBadges(row, t.conv).forEach((b) => bx.appendChild(b));
      headerActions(t);
      threadTools(t);
      threadBanner(t);
      composerState(t);
    }
    renderContext(t);
    renderLog(t);
    renderTyping();
  }

  /* ------------------------------------------------------------------ log */

  function visibleMessages(t) {
    const g = ui.gate && ui.gate.convId === t.conv.id && Date.now() < ui.gate.until ? ui.gate : null;
    return t.messages.filter((m) => !(g && !m.mine && m.at >= g.since && (m.from === "bot" || m.from === "system")));
  }

  function renderLog(t) {
    const g = ui.gate && ui.gate.convId === t.conv.id && Date.now() < ui.gate.until;
    const msgs = visibleMessages(t);
    const pending = ui.pending.filter((p) => p.convId === t.conv.id && !p.done);
    const latestChoices = [...msgs].reverse().find((m) => m.choices && !m.chosen);
    const sig = JSON.stringify([
      msgs.map((m) => [m.id, m.delivery, m.chosen || "", m.deleted ? 1 : 0, m.reactions || 0, (m.seenBy || []).length, (m.attachments || []).length, m.editedAt || 0]),
      ui.quickFor,
      ui.flash,
      pending.map((p) => [p.cid, p.state]),
      !!g,
      ui.anchor && ui.anchor.msgId,
      t.actions.includes("rate"),
      t.conv.status,
      latestChoices && latestChoices.id,
      t.emergency ? t.emergency.msgId : 0,
      msgs.some((m) => m.card) ? localStorage.getItem("eso-pm-claimstate") : 0, // a claim card follows the claim: it is drawn again when Staff decide
    ]);
    if (sig === ui.sigLog) return;
    ui.sigLog = sig;

    const log = $("#log");
    const prevTop = log.scrollTop;
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    const wasStick = ui.stick || nearBottom;
    const prevCount = log.dataset.count ? Number(log.dataset.count) : 0;
    clear(log);

    if (["staff", "admin"].includes(me.role) && t.conv.kind === "resident_support" && t.conv.summary) {
      const s = tpl("t-summary");
      // the topic, and where the resident chose to send it (the team that does not have it is never shown it)
      $("[data-topic]", s).textContent = `${t.conv.summary.topic} · Sent to ${t.conv.route === "platform" ? "EasySpotOps Support" : "Property team"}`;
      const asked = t.conv.summary.asked || [];
      $("[data-asked-row]", s).hidden = !asked.length;
      $("[data-asked]", s).textContent = asked.join(" · ");
      const details = t.conv.summary.details || [];
      $("[data-details-row]", s).hidden = !details.length;
      $("[data-details]", s).textContent = details.join("\n");
      log.appendChild(s);
    }

    const groups = groupByDay(msgs, Date.now());
    let lastOutId = null;
    for (const m of msgs) if (m.mine) lastOutId = m.id;
    const sameRun = (a, b) => a && b && a.kind !== "system" && b.kind !== "system" && a.from === b.from && b.at - a.at < 5 * 60000;
    for (const grp of groups) {
      const d = tpl("t-day");
      const tm = $("[data-day]", d);
      tm.textContent = grp.label;
      tm.dateTime = new Date(grp.items[0].at).toISOString().slice(0, 10);
      log.appendChild(d);
      grp.items.forEach((m, i) => {
        const prev = grp.items[i - 1];
        const next = grp.items[i + 1];
        // a quiet time marker when the conversation paused for a while (like Messenger)
        if (prev && m.at - prev.at > 30 * 60000) {
          const tt = tpl("t-time");
          $("[data-t]", tt).textContent = formatTime(m.at);
          $("[data-t]", tt).dateTime = new Date(m.at).toISOString();
          log.appendChild(tt);
        }
        if (ui.anchor && ui.anchor.convId === t.conv.id && ui.anchor.msgId === m.id) log.appendChild(tpl("t-new-divider"));
        if (m.audit) {
          // Immutable audit card: what changed, who did it (id and name), when (ISO, UTC).
          const a = tpl("t-audit");
          $("[data-change]", a).textContent = `${m.audit.field}: ${m.audit.from} → ${m.audit.to}`;
          // Staff and Admin read the full record (id, ISO time in UTC). A resident or a client reads it as a sentence: the name and the time.
          const full = me.role === "staff" || me.role === "admin";
          $("[data-actor]", a).textContent = m.audit.actorId === "system" ? "System" : full ? `${m.audit.actorName} (${m.audit.actorId})` : m.audit.actorName;
          const tm = $("[data-time]", a);
          // A date and time people can read; Staff and Admin still get the exact record (ISO, UTC) on hover and for assistive tech, and in the element's datetime.
          tm.textContent = formatFull(new Date(m.audit.at).getTime());
          if (full) {
            tm.title = `Recorded ${m.audit.at} (UTC)`;
            tm.setAttribute("aria-label", `${tm.textContent}, recorded ${m.audit.at} UTC`);
          }
          tm.dateTime = m.audit.at;
          log.appendChild(a);
          return;
        }
        if (m.kind === "system") {
          const s = tpl("t-sys");
          $("[data-text]", s).textContent = m.text;
          log.appendChild(s);
          return;
        }
        const offer = !!(latestChoices && m.id === latestChoices.id && t.conv.status === "bot" && me.role === "resident" && !g);
        log.appendChild(bubble(m, { first: !sameRun(prev, m), last: !sameRun(m, next), isLastOut: m.id === lastOutId, offerChoices: offer, t }));
      });
    }
    for (const p of pending) log.appendChild(pendingBubble(p));
    if (g) {
      const ty = tpl("t-typing");
      $("[data-avatar]", ty).replaceWith(avatar({ name: "Assistant", role: "bot", size: "sm" }));
      log.appendChild(ty);
    }
    if (t.actions.includes("rate")) {
      const r = tpl("t-rate");
      const box = $("[data-actions]", r);
      box.appendChild(
        button("Helpful", {
          icon: "thumbs-up",
          onClick: () => {
            act(store.rate(t.conv.id, me.id, true));
            toast("Thanks for the feedback.");
          },
        }),
      );
      box.appendChild(
        button("Not helpful", {
          icon: "thumbs-down",
          onClick: () => {
            act(store.rate(t.conv.id, me.id, false));
            toast("Thanks for the feedback.");
          },
        }),
      );
      log.appendChild(r);
    }

    log.dataset.count = String(msgs.length + pending.length);
    const incoming = msgs.filter((m) => !m.mine && m.kind !== "system" && !ui.seen.has(m.id));
    const grew = msgs.length + pending.length > prevCount;
    if (wasStick) {
      const div = $("[role=separator]", log);
      if (ui.anchor && div && ui.sigThreadOpen !== t.conv.id) {
        div.scrollIntoView({ block: "center" });
        ui.sigThreadOpen = t.conv.id;
      } else log.scrollTop = log.scrollHeight;
      ui.newBelow = 0;
    } else {
      log.scrollTop = prevTop;
      if (grew && incoming.length) ui.newBelow += incoming.length;
    }
    for (const m of msgs) ui.seen.add(m.id);
    const jump = $("#jump-new");
    jump.hidden = ui.newBelow === 0;
    $("#jump-new-label").textContent = ui.newBelow === 1 ? "1 new message" : `${ui.newBelow} new messages`;
    ui.stick = wasStick && true;
  }

  $("#log").addEventListener("scroll", () => {
    const log = $("#log");
    const near = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    ui.stick = near;
    if (near && ui.newBelow) {
      ui.newBelow = 0;
      $("#jump-new").hidden = true;
    }
  });
  $("#jump-new").addEventListener("click", () => {
    const log = $("#log");
    log.scrollTop = log.scrollHeight;
    ui.newBelow = 0;
    $("#jump-new").hidden = true;
    $("#msg-input").focus();
  });

  /* ---- message pieces ---- */

  const URL_RE = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)]/gi;

  /** Text with safe, clickable links (http/https only). Everything else stays plain text. */
  function renderText(el, text) {
    el.textContent = "";
    let last = 0;
    for (const match of text.matchAll(URL_RE)) {
      if (match.index > last) el.appendChild(document.createTextNode(text.slice(last, match.index)));
      const a = tpl("t-a");
      a.href = match[0];
      a.textContent = match[0];
      el.appendChild(a);
      last = match.index + match[0].length;
    }
    if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
  }

  function attachmentsEl(box, list) {
    if (!list || !list.length) return;
    box.hidden = false;
    for (const a of list) {
      if (a.kind === "image") {
        const b = tpl("t-att-img");
        const img = $("[data-img]", b);
        img.src = a.data;
        img.alt = a.name;
        b.setAttribute("aria-label", `Open photo ${a.name}`);
        b.addEventListener("click", () => openLightbox(a));
        box.appendChild(b);
      } else {
        const f = tpl("t-att-file");
        f.href = a.data;
        f.download = a.name;
        $("[data-name]", f).textContent = a.name;
        $("[data-size]", f).textContent = formatBytes(a.size);
        f.setAttribute("aria-label", `Download ${a.name}, ${formatBytes(a.size)}`);
        box.appendChild(f);
      }
    }
  }

  function openLightbox(a) {
    $("#lightbox-img").src = a.data;
    $("#lightbox-img").alt = a.name;
    $("#lightbox-name").textContent = a.name;
    const dl = $("#lightbox-download");
    dl.href = a.data;
    dl.download = a.name;
    $("#dlg-image").showModal();
  }

  function reactionsEl(box, m, convId) {
    const entries = Object.entries(m.reactions || {});
    if (!entries.length) return;
    box.hidden = false;
    box.closest("[data-msg]").dataset.react = "true"; // leaves room under the bubble for the chips hanging off its corner
    for (const [emoji, ids] of entries) {
      const c = tpl("t-chip");
      $("[data-emoji]", c).textContent = emoji;
      $("[data-count]", c).textContent = ids.length > 1 ? String(ids.length) : "";
      const mine = ids.includes(me.id);
      c.dataset.mine = String(mine);
      const names = ids
        .map((id) => (id === me.id ? "You" : (store.user(id) || {}).name))
        .filter(Boolean)
        .join(", ");
      c.setAttribute("aria-label", `${emoji} ${names}. ${mine ? "Tap to remove your reaction." : "Tap to react the same."}`);
      c.title = names;
      c.addEventListener("click", () => act(store.react(convId, me.id, m.id, emoji)));
      box.appendChild(c);
    }
  }

  function actionBtn(label, icon, onClick) {
    const b = tpl("t-act");
    setIcon($("svg", b), icon);
    b.setAttribute("aria-label", label);
    b.title = label;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick(b, e);
    });
    return b;
  }

  function copyText(text) {
    const done = () => toast("Copied.");
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => toast("Could not copy."));
    else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        done();
      } catch {
        toast("Could not copy.");
      }
      ta.remove();
    }
  }

  /** Tap or click the bubble to show its time and actions; the avatar and time stay out of the way otherwise. */
  function wireReveal(el, m) {
    const body = $("[data-body]", el);
    el.dataset.msgid = m.id;
    const set = (on) => {
      el.dataset.reveal = String(on);
      body.setAttribute("aria-expanded", String(on));
      if (on) ui.revealed.add(m.id);
      else ui.revealed.delete(m.id);
      if (!on && ui.quickFor === m.id) {
        ui.quickFor = null;
        $("[data-quick]", el).hidden = true;
      }
    };
    set(ui.revealed.has(m.id));
    const toggle = () => {
      if (window.getSelection && String(window.getSelection())) return;
      set(el.dataset.reveal !== "true");
    };
    body.addEventListener("click", toggle);
    body.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape") set(false);
    });
  }

  function quoteEl(el, m) {
    const q = $("[data-quote]", el);
    if (!m.replyPreview) return;
    q.hidden = false;
    $("[data-who]", q).textContent = m.replyPreview.who;
    $("[data-qtext]", q).textContent = m.replyPreview.text;
    const jump = () => {
      const target = $(`[data-msgid="${m.replyPreview.id}"]`, $("#log"));
      if (!target) return toast("That message is no longer in view.");
      target.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      ui.flash = m.replyPreview.id;
      target.dataset.flash = "true";
      setTimeout(() => {
        delete target.dataset.flash;
        ui.flash = null;
      }, 1200);
    };
    q.setAttribute("aria-label", `Replying to ${m.replyPreview.who}: ${m.replyPreview.text}. Go to message.`);
    q.addEventListener("click", jump);
    q.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        jump();
      }
    });
  }

  function messageActions(el, m, t) {
    const box = $("[data-actions]", el);
    const quick = $("[data-quick]", el);
    const react = actionBtn("React", "smile", (btn) => {
      const open = quick.hidden;
      quick.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      ui.quickFor = open ? m.id : null;
      if (open && !quick.children.length) {
        for (const emoji of QUICK_REACTIONS) {
          const e = tpl("t-emoji");
          e.textContent = emoji;
          const mine = ((m.reactions && m.reactions[emoji]) || []).includes(me.id);
          e.dataset.mine = String(mine);
          e.setAttribute("aria-label", `React with ${emoji}`);
          e.addEventListener("click", (ev) => {
            ev.stopPropagation();
            quick.hidden = true;
            ui.quickFor = null;
            act(store.react(t.conv.id, me.id, m.id, emoji));
          });
          quick.appendChild(e);
        }
      }
    });
    box.appendChild(react);
    if (t.canPost.ok) box.appendChild(actionBtn("Reply", "reply", () => setReply(m)));
    const hasContent = !!m.text || !!(m.attachments && m.attachments.length);
    if (me.role !== "resident" && hasContent) box.appendChild(actionBtn("Forward", "forward", () => openForward(t.conv.id, m)));

    // Everything else lives behind the three dots so the bar stays short.
    const items = [];
    // Edit and Unsend stay in the menu after the time limit, greyed out with the reason, so nobody wonders where they went.
    const age = Date.now() - m.at;
    const mins = (ms) => `${Math.round(ms / 60000)} minutes`;
    if (m.text) items.push({ label: "Copy text", icon: "copy", run: () => copyText(m.text) });
    if (m.mine && m.text && !m.viaChoice && t.canPost.ok) {
      const ok = age < store.config.editMs;
      items.push({ label: "Edit message", icon: "pencil", disabled: !ok, hint: ok ? "" : `Only within ${mins(store.config.editMs)} of sending`, run: () => startEdit(m) });
    }
    if (m.mine) {
      const open = t.canPost.ok; // a closed chat is a record: nothing in it is taken back
      const ok = open && age < store.config.unsendMs;
      items.push({
        label: "Unsend for everyone",
        icon: "undo",
        disabled: !ok,
        hint: ok ? "" : open ? `Only within ${mins(store.config.unsendMs)} of sending` : "This conversation is closed",
        confirm: ok,
        tone: "danger",
        run: () => {
          act(store.unsend(t.conv.id, me.id, m.id), "Message unsent.");
        },
      });
    }
    items.push({
      label: "Delete for me",
      icon: "trash",
      tone: "danger",
      run: () => {
        const r = store.hideMessage(t.conv.id, me.id, m.id);
        if (r.ok) toast("Deleted for you. Others can still see it.", { action: "Undo", onAction: () => act(store.unhideMessage(t.conv.id, me.id, m.id)) });
        else act(r);
      },
    });
    let more = null;
    if (items.length) {
      const menu = $("[data-menu]", el);
      more = actionBtn("More actions", "more", (btn) => {
        const open = menu.hidden;
        if (open) {
          quick.hidden = true;
          ui.quickFor = null;
          $('button[aria-label="React"]', box)?.setAttribute("aria-expanded", "false");
        }
        menu.hidden = !open;
        btn.setAttribute("aria-expanded", String(open));
        ui.menuFor = open ? m.id : null;
        if (!open) return;
        // The menu hangs off the dots button; flip it above the button when there is no room below it.
        delete menu.dataset.flip;
        const log = $("#log").getBoundingClientRect();
        const wr = btn.parentElement.getBoundingClientRect();
        const mw = menu.offsetWidth;
        // Sideways: grow towards the inside of the thread (your own messages to the right of the dots, others to the left),
        // then clamp so the menu never leaves the message area, whatever the screen width.
        const left = Math.min(Math.max(m.mine ? wr.left : wr.right - mw, log.left + 8), log.right - mw - 8);
        menu.style.left = `${left - wr.left}px`;
        const mr = menu.getBoundingClientRect();
        const br = btn.getBoundingClientRect();
        if (mr.bottom > log.bottom && br.top - mr.height - 4 > log.top) menu.dataset.flip = "true";
        if (!menu.children.length) {
          for (const it of items) {
            const b = tpl("t-menu-item");
            setIcon($("svg", b), it.icon);
            $("[data-label]", b).textContent = it.label;
            if (it.tone) b.dataset.tone = it.tone;
            if (it.disabled) {
              b.setAttribute("aria-disabled", "true");
              b.title = it.hint;
            }
            let armed = null;
            b.addEventListener("click", (ev) => {
              ev.stopPropagation();
              if (it.disabled) return;
              // Unsend cannot be undone, so it asks once more.
              if (it.confirm && !armed) {
                $("[data-label]", b).textContent = "Tap again to unsend";
                armed = setTimeout(() => {
                  armed = null;
                  $("[data-label]", b).textContent = it.label;
                }, 4000);
                return;
              }
              clearTimeout(armed);
              closeMenu();
              it.run();
            });
            menu.appendChild(b);
          }
          menu.addEventListener("keydown", (ev) => {
            const list = $$("[role=menuitem]", menu);
            const i = list.indexOf(document.activeElement);
            if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
              ev.preventDefault();
              list[(i + (ev.key === "ArrowDown" ? 1 : -1) + list.length) % list.length].focus();
            }
            if (ev.key === "Escape") {
              ev.preventDefault();
              ev.stopPropagation();
              closeMenu();
              btn.focus();
            }
          });
        }
        $("[role=menuitem]", menu).focus();
      });
      more.setAttribute("aria-haspopup", "menu");
      more.setAttribute("aria-expanded", "false");
      const wrap = tpl("t-more-wrap");
      wrap.appendChild(more);
      wrap.appendChild(menu); // the menu belongs to the dots button, so it opens right under it
      box.appendChild(wrap);
    }
    if (ui.quickFor === m.id) {
      react.click();
    }
    if (more && ui.menuFor === m.id) {
      more.click();
    }
  }

  function closeMenu() {
    const id = ui.menuFor;
    ui.menuFor = null;
    if (!id) return;
    const el = $(`[data-msgid="${id}"]`, $("#log"));
    if (!el) return;
    $("[data-menu]", el).hidden = true;
    $('button[aria-label="More actions"]', el)?.setAttribute("aria-expanded", "false");
  }
  document.addEventListener("click", (e) => {
    if (ui.menuFor && !e.target.closest('[data-menu], button[aria-label="More actions"]')) closeMenu();
  });

  /* forward: pick another conversation you can post in */
  function openForward(convId, m) {
    const d = dlg("dlg-forward");
    d._src = { convId, msgId: m.id };
    $("#forward-preview").textContent = m.text || (m.attachments[0].kind === "image" ? "Photo" : m.attachments[0].name);
    $("#forward-search").value = "";
    renderForwardList();
    d.showModal();
    $("#forward-search").focus();
  }
  function renderForwardList() {
    const d = dlg("dlg-forward");
    const q = $("#forward-search").value.trim().toLowerCase();
    const rows = store.forwardTargets(me.id, d._src.convId).filter((r) => !q || `${r.title} ${r.subtitle || ""}`.toLowerCase().includes(q));
    const ul = $("#forward-list");
    clear(ul);
    $("#forward-empty").hidden = rows.length > 0;
    $("#forward-empty").textContent = q ? "No conversation matches." : "No other conversation to forward to.";
    for (const r of rows) {
      const li = tpl("t-fwd-row");
      $("[data-avatar]", li).replaceWith(avatar({ name: r.avatar.name, role: r.avatar.role, size: "md" }));
      $("[data-title]", li).textContent = r.title;
      $("[data-subtitle]", li).textContent = r.subtitle || "";
      $("[data-pick]", li).addEventListener("click", () => {
        const res = store.forward(d._src.convId, me.id, d._src.msgId, r.id);
        d.close();
        if (res.ok) toast(`Forwarded to ${r.title}.`, { action: "View", onAction: () => openConv(r.id) });
        else toast(reasonText(res.reason));
      });
      ul.appendChild(li);
    }
  }
  $("#forward-search").addEventListener("input", renderForwardList);

  // The Context Card of a message about a promotion claim: the claim's identity, in the chat, for both sides (no icon to open it)
  function claimCard(card, conv) {
    const el = document.createElement("section");
    el.setAttribute("aria-label", "Promotion claim");
    el.className = "mt-step-sm flex flex-col gap-step-xs rounded-lg border border-border bg-background p-step-sm text-sm text-foreground";
    const h = document.createElement("p");
    h.className = "text-xs font-medium tracking-wide text-muted-foreground uppercase";
    h.textContent = "Promotion claim";
    el.appendChild(h);
    const dl = document.createElement("div");
    dl.className = "flex flex-col gap-step-xs";
    const row = (k, v) => {
      if (!v) return;
      const line = document.createElement("p");
      line.className = "flex flex-wrap gap-x-step-sm";
      const dt = document.createElement("span");
      dt.className = "w-20 shrink-0 text-muted-foreground";
      dt.textContent = k;
      const dd = document.createElement("span");
      dd.className = "min-w-0 flex-1 font-medium wrap-anywhere";
      dd.textContent = v;
      line.append(dt, dd);
      dl.appendChild(line);
    };
    // The card was made when the resident asked; what it says about the claim follows the claim now (Staff confirmed it, the resident cancelled it...), and a resident does not see
    // the code of a claim that is not approved yet in clear (mask until approved), as everywhere else. Staff see the code: they find the claim by it.
    const n = /_(\d+)$/.exec(card.claimId || "");
    const rid = conv && conv.residentId;
    const live = !card.unit && card.promoId && rid && n && Number(n[1]) === (Number(residentState(localStorage, rid).claims[card.promoId]?.count) || 0) ? claimStatus(localStorage, rid, card.promoId) : null;
    const WORD = { pending: "Pending", verified: "Verified", redeemed: "Used", rejected: "Not approved" };
    const status = live ? (live.cancelled ? "Cancelled" : WORD[live.st] || card.status) : card.status;
    const approved = !!live && (live.st === "verified" || live.st === "redeemed");
    const code = me.role === "resident" && card.code && !approved ? maskCode(card.code) : card.code;
    row("Promotion", card.title);
    row("Code", code);
    row("Claim ID", card.claimId);
    row("Status", status);
    row("Reason", live && live.st === "rejected" && !live.cancelled ? live.reason : "");
    row("Claimed", card.at && Number.isFinite(Date.parse(card.at)) ? formatFull(Date.parse(card.at)) : "");
    row("Ticket", conv && conv.ticketNo ? ticketNo(conv) : "");
    el.appendChild(dl);
    return el;
  }
  const askedCard = (t) => {
    const m = [...t.messages].reverse().find((x) => x.card && x.card.type === "claim" && !x.deleted);
    return m ? m.card : null;
  };

  function bubble(m, ctx) {
    const { first, last, isLastOut, offerChoices, t } = ctx;
    const when = formatTime(m.at);
    const iso = new Date(m.at).toISOString();
    const interactive = m.kind !== "bot";
    if (m.mine) {
      const el = tpl("t-out");
      const body = $("[data-body]", el);
      if (m.deleted) {
        body.textContent = "You removed a message";
        body.dataset.state = "deleted";
      } else if (m.text) renderText(body, m.card ? m.text.split("\n")[0] : m.text);
      else body.hidden = true;
      if (m.card && !m.deleted) body.after(claimCard(m.card, t.conv));
      const tm = $("[data-time]", el);
      tm.textContent = when;
      tm.dateTime = iso;
      tm.title = formatFull(m.at);
      if (!m.deleted) {
        quoteEl(el, m);
        attachmentsEl($("[data-attachments]", el), m.attachments);
        reactionsEl($("[data-reactions]", el), m, t.conv.id);
      }
      if (m.editedAt && !m.deleted) $("[data-edited]", el).hidden = false;
      if (m.forwarded && !m.deleted) $("[data-forwarded]", el).hidden = false;
      markEmergency(el, body, m, t);
      wireReveal(el, m);
      if (!m.deleted) messageActions(el, m, t);
      if (isLastOut) {
        const group = t.conv.kind === "group";
        const ind = m.delivery === "read" ? "read" : m.delivery === "partial" ? "partial" : "sent";
        const span = $(`[data-ind="${ind}"]`, el);
        span.hidden = false;
        if (ind === "read" && group) $("[data-label]", span).textContent = "Seen by everyone";
        if (ind === "partial") $("[data-label]", span).textContent = `Seen by ${m.seenBy.join(", ")}`;
      }
      return el;
    }
    const el = tpl("t-in");
    const body = $("[data-body]", el);
    body.dataset.kind = m.kind === "bot" ? "bot" : "text";
    if (m.deleted) {
      body.textContent = "This message was removed";
      body.dataset.state = "deleted";
    } else if (m.text) renderText(body, m.card ? m.text.split("\n")[0] : m.text);
    else body.hidden = true;
    if (m.card && !m.deleted) body.after(claimCard(m.card, t.conv));
    const a = m.author || { name: "Assistant", role: "bot" };
    const who = m.kind === "bot" ? "EasySpotOps Assistant" : `${a.name}${a.role && a.role !== "bot" && !(me.role === "resident" && a.role === "admin") ? ` · ${ROLE_LABEL[a.role]}` : ""}`; // (a resident reads "EasySpotOps Support", not "… · Admin")
    if (first) $("[data-author]", el).textContent = who;
    else $("[data-author]", el).hidden = true;
    if (last) $("[data-avatar]", el).replaceWith(avatar({ name: a.name, role: a.role === "bot" ? "bot" : a.role, size: "sm" }));
    const tm = $("[data-time]", el);
    tm.textContent = when;
    tm.dateTime = iso;
    tm.title = formatFull(m.at);
    if (!m.deleted) {
      quoteEl(el, m);
      attachmentsEl($("[data-attachments]", el), m.attachments);
      reactionsEl($("[data-reactions]", el), m, t.conv.id);
    }
    if (m.editedAt && !m.deleted) $("[data-edited]", el).hidden = false;
    if (m.forwarded && !m.deleted) $("[data-forwarded]", el).hidden = false;
    markEmergency(el, body, m, t);
    if (interactive) {
      wireReveal(el, m);
      if (!m.deleted) messageActions(el, m, t);
    } else {
      body.removeAttribute("role");
      body.removeAttribute("tabindex");
      body.removeAttribute("aria-expanded");
      body.classList.remove("cursor-pointer");
      el.dataset.msgid = m.id;
    }
    // Quick replies are only shown while they can be used. Once one is tapped (or the chat moves on), the
    // person's choice already appears as their own message, so the options collapse like in any chat app.
    if (m.choices && offerChoices) {
      const box = $("[data-choices]", el);
      box.hidden = false;
      for (const c of m.choices) {
        const b = tpl("t-choice");
        b.textContent = c.label;
        b.dataset.state = "open";
        b.addEventListener("click", () => choose(t.conv.id, c.id));
        box.appendChild(b);
      }
    }
    return el;
  }

  /** Red border and tint for an emergency message; it pulses (not under reduced motion) until someone acknowledges it. */
  function markEmergency(el, body, m, t) {
    if (!m.emergency || m.deleted) return;
    body.dataset.emergency = "true";
    $("[data-emergency-label]", el).hidden = false;
    if (t.emergency && t.emergency.msgId === m.id) body.dataset.pulse = "true";
  }

  function pendingBubble(p) {
    const el = tpl("t-out");
    const body = $("[data-body]", el);
    if (p.text) body.textContent = p.text;
    else body.hidden = true;
    body.dataset.state = p.state;
    if (p.emergency) body.dataset.emergency = "true";
    body.removeAttribute("role");
    body.removeAttribute("tabindex");
    body.removeAttribute("aria-expanded");
    attachmentsEl($("[data-attachments]", el), p.attachments);
    $("[data-time]", el).textContent = formatTime(p.at);
    $(`[data-ind="${p.state}"]`, el).hidden = false;
    if (p.state === "failed") {
      const box = $("[data-failed-actions]", el);
      box.hidden = false;
      const err = document.createElement("p");
      err.className = "text-xs text-danger-text";
      err.textContent = p.error || "Message not sent.";
      box.appendChild(err);
      box.appendChild(button("Retry", { variant: "soft", onClick: () => deliver(p) }));
      if (me.role === "resident") {
        // Messages itself may be what is broken: a way to reach people that does not go through it. The text stays here to be copied.
        const help = document.createElement("a");
        help.className = "text-xs text-primary underline underline-offset-2";
        help.href = `mailto:support@easyspotops.example?subject=${encodeURIComponent("My message will not send")}`;
        help.textContent = "Still not sending? Email EasySpotOps Support";
        help.dataset.contactSupport = "";
        box.appendChild(help);
      }
      box.appendChild(
        button("Discard", {
          variant: "ghost",
          onClick: () => {
            ui.pending = ui.pending.filter((x) => x !== p);
            renderThread(true);
          },
        }),
      );
    }
    return el;
  }

  /* -------------------------------------------------------- sending, bot */

  function choose(convId, choiceId) {
    if (offline()) return toast("You are offline. Try again when the connection is back.");
    ui.gate = { convId, since: Date.now() - 1, until: Date.now() + 650 + Math.random() * 450 };
    setTimeout(() => renderThread(true), ui.gate.until - Date.now() + 20);
    ui.stick = true;
    const r = store.choose(convId, me.id, choiceId);
    if (!r.ok) {
      ui.gate = null;
      toast(reasonText(r.reason));
    } else announce("Assistant is typing");
  }

  function fail(p, error) {
    p.state = "failed";
    p.error = error;
    ui.sigLog = "";
    renderThread(true);
  }

  /* Offline queue. A message sent without a connection stays in the thread dimmed with a clock, is kept in this browser
     (localStorage stands in for IndexedDB in the preview) and is retried with exponential backoff: 1, 2, 4, 8, 16, then every 30 s.
     When the connection returns everything queued goes out at once. */
  const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];
  const outboxKey = () => `eso-msg-outbox:${me.id}`;
  function saveOutbox() {
    try {
      // A message still going out is kept too, not only one waiting for the connection: leaving the page in that moment must not lose it (the store never
      // keeps the same clientId twice, so sending it again on the next visit is safe).
      const items = ui.pending
        .filter((p) => p.state === "queued" || p.state === "sending")
        .map(({ cid, convId, text, at, attachments, replyTo, emergency }) => ({ cid, convId, text, at, attachments, replyTo, emergency }));
      if (items.length) localStorage.setItem(outboxKey(), JSON.stringify(items));
      else localStorage.removeItem(outboxKey());
    } catch {
      /* storage full: the message stays queued in memory for this visit */
    }
  }
  function holdForConnection(p) {
    clearTimeout(p.timer);
    p.state = "queued";
    p.tries = p.tries || 0;
    const wait = BACKOFF_MS[Math.min(p.tries, BACKOFF_MS.length - 1)];
    p.tries += 1;
    p.timer = setTimeout(() => {
      if (ui.pending.includes(p)) offline() ? holdForConnection(p) : deliver(p);
    }, wait);
    saveOutbox();
    ui.sigLog = "";
    renderThread(true);
  }
  function flushOutbox() {
    for (const p of ui.pending.filter((x) => x.state === "queued")) {
      clearTimeout(p.timer);
      p.tries = 0;
      deliver(p);
    }
  }
  function restoreOutbox() {
    try {
      for (const p of JSON.parse(localStorage.getItem(outboxKey()) || "[]")) if (!ui.pending.some((x) => x.cid === p.cid)) ui.pending.push({ ...p, state: "queued", tries: 0 });
    } catch {
      /* unreadable: drop it */
    }
    if (ui.pending.length) offline() ? ui.pending.forEach(holdForConnection) : flushOutbox();
  }

  function deliver(p) {
    clearTimeout(p.timer);
    if (offline()) return holdForConnection(p);
    p.state = "sending";
    p.error = null;
    ui.sigLog = "";
    renderThread(true);
    setTimeout(
      () => {
        if (!ui.pending.includes(p)) return;
        if (offline()) return holdForConnection(p);
        const conv = store.get(p.convId, me.id);
        if (conv.ok && conv.conv.kind === "resident_support" && conv.conv.status === "bot") {
          ui.gate = { convId: p.convId, since: Date.now() - 1, until: Date.now() + 750 + Math.random() * 400 };
          setTimeout(() => renderThread(true), ui.gate.until - Date.now() + 20);
        }
        p.done = true;
        const r = store.send(p.convId, me.id, p.text, { clientId: p.cid, attachments: p.attachments, replyTo: p.replyTo, emergency: p.emergency });
        if (!r.ok) {
          p.done = false;
          ui.gate = null;
          saveOutbox();
          return fail(p, reasonText(r.reason));
        }
        ui.pending = ui.pending.filter((x) => x !== p);
        saveOutbox();
        localStorage.removeItem(draftKey(p.convId));
        renderThread(true);
      },
      160 + Math.random() * 260,
    );
  }

  /** Edit mode reuses the composer: the old text is loaded, Send saves it, Esc or the cross puts your draft back. */
  function startEdit(m) {
    const input = $("#msg-input");
    if (!ui.edit) ui.edit = { prev: input.value };
    ui.edit.id = m.id;
    ui.edit.text = m.text;
    ui.reply = null;
    ui.attach = [];
    ui.emojiOpen = false;
    input.value = m.text;
    autosize();
    renderComposerExtras();
    updateCount();
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function endEdit({ restore = true } = {}) {
    if (!ui.edit) return;
    const prev = ui.edit.prev;
    ui.edit = null;
    if (restore) $("#msg-input").value = prev;
    autosize();
    renderComposerExtras();
    updateCount();
  }

  function saveEdit() {
    const input = $("#msg-input");
    const text = input.value.trim();
    if (!text) return toast(reasonText("empty"));
    if (text === ui.edit.text) return endEdit();
    const r = store.edit(ui.convId, me.id, ui.edit.id, text);
    if (!r.ok) {
      toast(reasonText(r.reason));
      if (r.reason === "too_late" || r.reason === "not_allowed") endEdit();
      return;
    }
    toast("Message updated.");
    endEdit();
    renderThread(true);
  }

  function send() {
    const input = $("#msg-input");
    if (ui.edit) return saveEdit();
    const text = input.value.trim();
    const ready = ui.attach.filter((a) => a.state === "ready");
    if (ui.attach.some((a) => a.state === "processing")) return toast("Wait for the photo to finish preparing.");
    if ((!text && !ready.length) || !ui.convId) return;
    const t = store.get(ui.convId, me.id);
    if (!t.ok || !t.canPost.ok) return toast(reasonText(t.ok ? t.canPost.reason : t.reason));
    if (text.length > 2000) return toast(reasonText("too_long"));
    input.value = "";
    localStorage.removeItem(draftKey(ui.convId));
    autosize();
    const p = {
      cid: `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      convId: ui.convId,
      text,
      at: Date.now(),
      state: "sending",
      attachments: ready.map(({ kind, name, mime, size, data }) => ({ kind, name, mime, size, data })),
      replyTo: ui.reply ? ui.reply.id : undefined,
      emergency: ui.emergency || undefined,
    };
    ui.attach = [];
    ui.reply = null;
    ui.emergency = false;
    ui.emojiOpen = false;
    renderComposerExtras();
    updateCount();
    store.setTyping(ui.convId, me.id, false);
    ui.pending.push(p);
    saveOutbox();
    ui.stick = true;
    deliver(p);
    input.focus();
  }

  const form = $("#composer");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    send();
  });
  const headAvatar = $("#thread-avatar");
  const openInfo = () => {
    if (headAvatar.dataset.action !== "true" || !ui.convId) return;
    const t = store.get(ui.convId, me.id);
    if (t.ok) openResidentInfo(t.conv);
  };
  headAvatar.addEventListener("click", openInfo);
  headAvatar.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openInfo();
    }
  });
  const input = $("#msg-input");
  input.addEventListener("keydown", (e) => {
    // "Press Enter to send" (Settings > Messages): on, Enter sends and Shift+Enter adds a line; off, Enter adds a line and Ctrl or Cmd + Enter (or the Send button) sends.
    const enterSends = messagePref(portal, "msgEnter");
    if (e.key === "Enter" && !e.isComposing && !matchMedia("(pointer: coarse)").matches && (enterSends ? !e.shiftKey : e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
    if (e.key === "Escape" && ui.edit) {
      e.preventDefault();
      endEdit();
      return;
    }
    if (e.key === "Escape" && isMobile() && ui.pane === "thread") leave();
  });
  let draftTimer;
  let typingSent = 0;
  input.addEventListener("input", () => {
    autosize();
    updateCount();
    if (ui.edit) return; // an edit is not a draft and is not "typing a new message"
    const t = ui.convId && Date.now() - typingSent > 2000 && input.value.trim();
    if (t && messagePref(portal, "msgTyping") && !(ui.lastKind === "resident_support" && ui.lastStatus === "bot")) {
      typingSent = Date.now();
      store.setTyping(ui.convId, me.id, true);
    }
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      if (ui.convId) {
        if (input.value) localStorage.setItem(draftKey(ui.convId), input.value);
        else localStorage.removeItem(draftKey(ui.convId));
      }
    }, 250);
  });
  function autosize() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight + 2, 160)}px`;
  }
  function updateCount() {
    const n = input.value.length;
    $("#composer-count").textContent = n > 1600 ? `${n} / 2000` : "";
    const ready = ui.attach.some((a) => a.state === "ready");
    const busy = ui.attach.some((a) => a.state === "processing");
    $("#btn-send").disabled = busy || (!input.value.trim() && !ready);
    $("#btn-send-resolve").disabled = $("#btn-send").disabled;
  }
  // Send & resolve (Admin, Support thread): the message goes first; when it has been delivered the thread is resolved, with the same Undo as Resolve.
  $("#btn-send-resolve").addEventListener("click", () => {
    const t = ui.convId && store.get(ui.convId, me.id);
    if (!t || !t.ok || ui.edit) return;
    const conv = t.conv;
    const before = ui.pending.length;
    send();
    if (ui.pending.length === before) return; // nothing was sent (a message too long, a photo still preparing): do not resolve
    const started = Date.now();
    const timer = setInterval(() => {
      const waiting = ui.pending.some((p) => p.convId === conv.id);
      if (waiting && Date.now() - started < 5000) return;
      clearInterval(timer);
      if (waiting) return toast("The message is still sending, so the thread was not resolved.");
      const now = store.get(conv.id, me.id);
      if (now.ok && now.conv.status !== "resolved") resolveWithUndo({ ...now.conv, status: conv.status, assigneeId: conv.assigneeId });
    }, 120);
  });
  function insertText(text) {
    const s = input.selectionStart ?? input.value.length;
    input.value = `${input.value.slice(0, s)}${input.value && !/\s$/.test(input.value.slice(0, s)) ? " " : ""}${text}${input.value.slice(input.selectionEnd ?? s)}`;
    autosize();
    updateCount();
    input.dispatchEvent(new Event("input"));
  }
  $("#btn-emergency").addEventListener("click", () => {
    ui.emergency = !ui.emergency;
    renderComposerExtras();
    $("#msg-input").focus();
  });
  $("#btn-canned").addEventListener("click", () => {
    ui.cannedOpen = !ui.cannedOpen;
    renderThread(true);
  });

  /* ------------------------------------------- reply, attachments, emoji */

  function setReply(m) {
    ui.reply = {
      id: m.id,
      who: m.mine ? "yourself" : m.author ? m.author.name : "Assistant",
      text: m.text || (m.attachments && m.attachments[0] ? (m.attachments[0].kind === "image" ? "Photo" : m.attachments[0].name) : ""),
    };
    renderComposerExtras();
    $("#msg-input").focus();
  }
  $("#reply-cancel").addEventListener("click", () => {
    if (ui.edit) endEdit();
    else {
      ui.reply = null;
      renderComposerExtras();
    }
    $("#msg-input").focus();
  });

  function renderComposerExtras() {
    const bar = $("#reply-bar");
    bar.hidden = !ui.reply && !ui.edit;
    $("#reply-cancel").setAttribute("aria-label", ui.edit ? "Cancel editing" : "Cancel reply");
    $("#btn-send").lastChild.textContent = ui.edit ? "Save" : "Send";
    if (ui.edit) {
      $("#reply-who").textContent = "Editing message";
      $("#reply-text").textContent = ui.edit.text;
    } else if (ui.reply) {
      $("#reply-who").textContent = `Replying to ${ui.reply.who}`;
      $("#reply-text").textContent = ui.reply.text;
    }
    const tray = $("#tray");
    clear(tray);
    tray.hidden = !ui.attach.length;
    for (const a of ui.attach) {
      const el = tpl("t-tray");
      $("[data-name]", el).textContent = a.name;
      $("[data-size]", el).textContent = a.state === "processing" ? "Preparing…" : formatBytes(a.size);
      if (a.kind === "image" && a.data) {
        const img = $("[data-img]", el);
        img.hidden = false;
        img.src = a.data;
        $("[data-icon]", el).hidden = true;
      }
      if (a.state === "processing") {
        $("[data-spin]", el).removeAttribute("hidden");
        $("[data-icon]", el).hidden = true;
      }
      $("[data-remove]", el).setAttribute("aria-label", `Remove ${a.name}`);
      $("[data-remove]", el).addEventListener("click", () => {
        ui.attach = ui.attach.filter((x) => x !== a);
        renderComposerExtras();
        updateCount();
      });
      tray.appendChild(el);
    }
    $("#btn-emergency").setAttribute("aria-pressed", String(ui.emergency));
    $("#emergency-hint").hidden = !ui.emergency;
    $("#btn-emoji").setAttribute("aria-expanded", String(ui.emojiOpen));
    $("#emoji-pop").hidden = !ui.emojiOpen;
    $("#btn-attach").disabled = ui.attach.length >= store.config.maxAttachments;
    updateCount();
  }

  const MAX_SIDE = 1920; // longest side after compression
  const TARGET_BYTES = 300 * 1024; // aim for about 300 KB; anything under the hard limit is still accepted
  const fileToDataUrl = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  const loadImage = (url) =>
    new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });

  /** Photos are downsized in the browser so they fit in storage; other files must already be small. */
  async function prepareFile(file) {
    const max = store.config.maxAttachmentBytes;
    if (file.type.startsWith("image/") && file.type !== "image/svg+xml" && file.type !== "image/gif") {
      const img = await loadImage(await fileToDataUrl(file));
      // Re-drawing on a canvas drops all EXIF, including GPS; the picture is already upright, so orientation is kept.
      let scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      let best = null;
      for (let attempt = 0; attempt < 7; attempt++) {
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const quality = [0.82, 0.7, 0.6][Math.min(attempt, 2)];
        let data = c.toDataURL("image/webp", quality);
        let mime = "image/webp";
        if (!data.startsWith("data:image/webp")) {
          data = c.toDataURL("image/jpeg", quality);
          mime = "image/jpeg";
        } // browsers without WebP encoding
        const size = Math.round((data.length * 3) / 4);
        best = { kind: "image", name: file.name.replace(/\.[^.]+$/, "") + (mime === "image/webp" ? ".webp" : ".jpg"), mime, size, data };
        if (size <= TARGET_BYTES) return best;
        if (attempt >= 2) scale *= 0.8;
      }
      if (best && best.size <= max) return best;
      throw new Error("That photo is too large even after shrinking it.");
    }
    if (file.type.startsWith("image/")) {
      if (file.size > max) throw new Error(`${file.name} is larger than ${formatBytes(max)}.`);
      return { kind: "image", name: file.name, mime: file.type, size: file.size, data: await fileToDataUrl(file) };
    }
    if (!/\.(pdf|docx|txt|csv)$/i.test(file.name)) throw new Error(`${file.name}: only photos, PDF, DOCX, TXT and CSV files can be attached.`);
    if (file.size > max) throw new Error(`${file.name} is larger than ${formatBytes(max)}.`);
    return { kind: "file", name: file.name, mime: file.type || "application/octet-stream", size: file.size, data: await fileToDataUrl(file) };
  }

  async function addFiles(files) {
    const err = $("#attach-error");
    err.hidden = true;
    const list = [...files];
    const room = store.config.maxAttachments - ui.attach.length;
    if (list.length > room) {
      err.hidden = false;
      err.textContent = `You can attach up to ${store.config.maxAttachments} files to one message.`;
    }
    for (const file of list.slice(0, Math.max(0, room))) {
      const item = { kind: file.type.startsWith("image/") ? "image" : "file", name: file.name, size: file.size, state: "processing" };
      ui.attach.push(item);
      renderComposerExtras();
      try {
        Object.assign(item, await prepareFile(file), { state: "ready" });
      } catch (e) {
        ui.attach = ui.attach.filter((x) => x !== item);
        err.hidden = false;
        err.textContent = e && e.message ? e.message : "That file could not be attached.";
      }
      renderComposerExtras();
    }
  }
  window.__eso_addFiles = addFiles; // used by the preview checks

  $("#btn-attach").addEventListener("click", () => $("#file-input").click());
  $("#file-input").addEventListener("change", (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  });
  input.addEventListener("paste", (e) => {
    const files = [...(e.clipboardData ? e.clipboardData.files : [])];
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  });
  const pane = $("#thread-pane");
  let dragDepth = 0;
  pane.addEventListener("dragenter", (e) => {
    if ([...(e.dataTransfer?.types || [])].includes("Files")) {
      dragDepth++;
      pane.dataset.drop = "true";
    }
  });
  pane.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) pane.dataset.drop = "false";
  });
  pane.addEventListener("dragover", (e) => {
    if ([...(e.dataTransfer?.types || [])].includes("Files")) e.preventDefault();
  });
  pane.addEventListener("drop", (e) => {
    e.preventDefault();
    dragDepth = 0;
    pane.dataset.drop = "false";
    if (!$("#composer").hidden && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });

  /* emoji picker: our own selection of Unicode characters (see emoji.js), with a "recent" row */
  const RECENT_KEY = "eso-msg-recent-emoji";
  const recent = () => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    } catch {
      return [];
    }
  };
  let emojiCat = "recent";
  function renderEmoji() {
    const q = $("#emoji-search").value;
    const grid = $("#emoji-grid");
    clear(grid);
    const tabs = $("#emoji-tabs");
    if (!tabs.children.length) {
      [{ id: "recent", label: "Recent", icon: "🕘" }, ...EMOJI_CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: c.items[0][0] }))].forEach((c) => {
        const b = tpl("t-emoji");
        b.textContent = c.icon;
        b.dataset.cat = c.id;
        b.setAttribute("aria-label", c.label);
        b.title = c.label;
        b.addEventListener("click", () => {
          emojiCat = c.id;
          $("#emoji-search").value = "";
          renderEmoji();
        });
        tabs.appendChild(b);
      });
    }
    $$("[data-cat]", tabs).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === emojiCat && !q)));
    let list;
    if (q.trim()) list = searchEmoji(q);
    else if (emojiCat === "recent") list = recent().length ? recent() : EMOJI_CATEGORIES[0].items.slice(0, 16).map((x) => x[0]);
    else list = EMOJI_CATEGORIES.find((c) => c.id === emojiCat).items.map((x) => x[0]);
    $("#emoji-empty").hidden = list.length > 0;
    for (const ch of list) {
      const b = tpl("t-emoji");
      b.textContent = ch;
      b.setAttribute("aria-label", `Insert ${ch}`);
      b.addEventListener("click", () => {
        insertEmoji(ch);
        localStorage.setItem(RECENT_KEY, JSON.stringify([ch, ...recent().filter((x) => x !== ch)].slice(0, 16)));
      });
      grid.appendChild(b);
    }
  }
  function insertEmoji(ch) {
    const s = input.selectionStart ?? input.value.length;
    const e = input.selectionEnd ?? s;
    input.value = input.value.slice(0, s) + ch + input.value.slice(e);
    input.selectionStart = input.selectionEnd = s + ch.length;
    autosize();
    updateCount();
    input.dispatchEvent(new Event("input"));
    input.focus();
  }
  $("#btn-emoji").addEventListener("click", () => {
    ui.emojiOpen = !ui.emojiOpen;
    renderComposerExtras();
    if (ui.emojiOpen) {
      renderEmoji();
      $("#emoji-search").focus();
    }
  });
  $("#emoji-search").addEventListener("input", renderEmoji);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && ui.emojiOpen) {
      ui.emojiOpen = false;
      renderComposerExtras();
      $("#btn-emoji").focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (ui.emojiOpen && !e.target.closest("#emoji-pop, #btn-emoji")) {
      ui.emojiOpen = false;
      renderComposerExtras();
    }
  });

  /* typing line and presence */
  function typingText(people) {
    if (!people.length) return "";
    const n = people.map((p) => p.name.split(" ")[0]);
    if (n.length === 1) return `${n[0]} is typing`;
    if (n.length === 2) return `${n[0]} and ${n[1]} are typing`;
    return `${n.length} people are typing`;
  }
  let typingTimer;
  function renderTyping() {
    const line = $("#typing-line");
    const people = ui.convId ? store.typingIn(ui.convId, me.id) : [];
    const text = typingText(people);
    line.hidden = !text;
    if (text && line.dataset.text !== text) {
      line.textContent = `${text}…`;
      line.dataset.text = text;
    }
    if (!text) line.dataset.text = "";
    // The same three dots the assistant has, at the end of the conversation, with the face of the person who is typing. The line above says who (for a screen reader
    // it is the status; the dots are only for the eye).
    const log = $("#log");
    let dots = log && log.querySelector("[data-typing-person]");
    if (log && people.length && !log.querySelector("[data-typing]:not([data-typing-person])")) {
      const stick = log.scrollHeight - log.scrollTop - log.clientHeight < 48;
      if (!dots) {
        dots = tpl("t-typing");
        dots.setAttribute("data-typing-person", "");
        $("[data-avatar]", dots).replaceWith(avatar({ name: people[0].name, role: people[0].role, size: "sm" }));
        log.appendChild(dots);
        if (stick) log.scrollTop = log.scrollHeight;
      }
      $("[role=status]", dots).setAttribute("aria-label", `${text}`);
    } else if (dots) dots.remove();
    clearTimeout(typingTimer);
    if (text) typingTimer = setTimeout(renderTyping, store.config.typingMs + 200);
  }
  window.addEventListener("pagehide", () => {
    store.goOffline(me.id);
    if (ui.convId) store.setTyping(ui.convId, me.id, false);
  });
  input.addEventListener("blur", () => {
    if (ui.convId) store.setTyping(ui.convId, me.id, false);
  });

  /* -------------------------------------------------------------- the (i) window */
  $("#info-win-ok").addEventListener("click", () => $("#info-win").close());
  $("#info-win").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) e.currentTarget.close();
  }); // the backdrop
  $("#info-win").addEventListener("close", () => {
    // the banner that held the (i) may have been drawn again meanwhile: go back to the conversation then
    if (infoOpener && infoOpener.isConnected) infoOpener.focus({ preventScroll: true });
    else ($("#thread-title") || $("#msg-input")).focus({ preventScroll: true });
    infoOpener = null;
  });
  $("#emergency-info").addEventListener("click", (e) => showInfo(e.currentTarget, "Emergency", "Managers are alerted right away, and it gets through Do Not Disturb. Use it for water, fire or gas."));

  /* -------------------------------------------------------------- dialogs */

  const dlg = (id) => document.getElementById(id);
  const wireDialog = (d) => {
    d.addEventListener("click", (e) => {
      if (e.target === d) d.close();
    });
    $$("[data-close]", d).forEach((b) => b.addEventListener("click", () => d.close()));
  };
  ["dlg-new", "dlg-announce", "dlg-preview", "dlg-image", "dlg-members", "dlg-forward"].forEach((id) => wireDialog(dlg(id)));

  /* new conversation: one to one, or a group of three or more (Staff and Admin start groups) */
  function setNewMode(mode) {
    const d = dlg("dlg-new");
    d._mode = mode;
    $$("[data-mode]", d).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    $("#new-direct-wrap").hidden = mode === "group";
    $("#new-group-wrap").hidden = mode !== "group";
    $("#new-subject-wrap").hidden = mode === "group" || !$("input[name=recipient]:checked", d) || d._recipients[Number($("input[name=recipient]:checked", d).value)].type !== "support";
    $("#dlg-new-title").textContent = mode === "group" ? "New group" : "New conversation";
    $("#new-text").previousElementSibling.textContent = mode === "group" ? "First message (optional)" : "Message";
  }
  $$("#new-mode [data-mode]").forEach((b) => b.addEventListener("click", () => setNewMode(b.dataset.mode)));

  function openNew() {
    if (me.role === "resident") return startResidentSession();
    const d = dlg("dlg-new");
    const box = $("#new-recipients");
    clear(box);
    const canGroup = store.groupCandidates(me.id).length > 0;
    $("#new-mode").hidden = !canGroup;
    const members = $("#new-members");
    clear(members);
    $("#new-group-name").value = "";
    const countEl = $("#new-group-count");
    const syncCount = () => {
      const n = $$("input:checked", members).length + 1;
      countEl.textContent = `(${n} including you, 3 to 12)`;
    };
    for (const p of store.groupCandidates(me.id)) {
      const el = tpl("t-audience");
      const cb = $("input", el);
      cb.value = p.id;
      cb.addEventListener("change", syncCount);
      $("[data-label]", el).textContent = `${p.name} · ${p.title}`;
      members.appendChild(el);
    }
    syncCount();
    const recipients = store.recipients(me.id);
    recipients.forEach((r, i) => {
      const el = tpl("t-recipient");
      const radio = $("input", el);
      radio.value = String(i);
      radio.addEventListener("change", () => {
        $("#new-subject-wrap").hidden = r.type !== "support";
      });
      $("[data-avatar]", el).replaceWith(avatar({ name: r.label, role: r.type === "support" ? "admin" : r.role, size: "md" }));
      $("[data-name]", el).textContent = r.label;
      $("[data-hint]", el).textContent = r.hint;
      box.appendChild(el);
    });
    $("#new-subject").value = "";
    $("#new-text").value = "";
    $("#new-error").hidden = true;
    $("#new-subject-wrap").hidden = true;
    d._recipients = recipients;
    setNewMode("direct");
    d.showModal();
    $("input[name=recipient]", d)?.focus();
  }
  $("#btn-new").addEventListener("click", openNew);
  $("#form-new").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = dlg("dlg-new");
    const err = $("#new-error");
    const picked = $("input[name=recipient]:checked", d);
    const fail = (msg) => {
      err.hidden = false;
      err.textContent = msg;
    };
    if (d._mode === "group") {
      if (offline()) return fail("You are offline. Try again when the connection is back.");
      const ids = $$("#new-members input:checked").map((c) => c.value);
      const res = store.createGroup(me.id, { name: $("#new-group-name").value, memberIds: ids, text: $("#new-text").value });
      if (!res.ok) return fail(reasonText(res.reason));
      d.close();
      toast("Group created.");
      ui.tab = me.role === "admin" ? "direct" : "groups";
      return openConv(res.convId);
    }
    if (!picked) return fail("Choose who to message.");
    const r = d._recipients[Number(picked.value)];
    const text = $("#new-text").value;
    if (offline()) return fail("You are offline. Try again when the connection is back.");
    const res = r.type === "support" ? store.startSupport(me.id, { subject: $("#new-subject").value, text }) : store.startDirect(me.id, r.userId, text);
    if (!res.ok) return fail(reasonText(res.reason));
    d.close();
    toast("Message sent.");
    ui.tab = "all";
    openConv(res.convId);
  });

  /* group members: who is in it, who is online, add a person, leave */
  function openMembers(convId) {
    const t = store.get(convId, me.id);
    if (!t.ok) return;
    const d = dlg("dlg-members");
    d._conv = convId;
    const members = t.row.members;
    $("#dlg-members-title").textContent = t.conv.name;
    $("#members-sub").textContent = `${members.length} people. Everyone in the group sees every message.`;
    const list = $("#members-list");
    clear(list);
    for (const m of members) {
      const li = tpl("t-member");
      $("[data-avatar]", li).replaceWith(avatar({ name: m.name, role: m.role, size: "md" }));
      $("[data-name]", li).textContent = m.id === me.id ? `${m.name} (you)` : m.name;
      $("[data-title]", li).textContent = `${ROLE_LABEL[m.role]} · ${m.title}`;
      if (m.id !== me.id && store.presenceOf(m.id).online) $("[data-presence]", li).appendChild(badge("Online", "success"));
      list.appendChild(li);
    }
    const canAdd = ["staff", "admin"].includes(me.role);
    const left = store.groupCandidates(me.id).filter((p) => !members.some((m) => m.id === p.id));
    $("#members-add").hidden = !canAdd || !left.length || members.length >= 12;
    const sel = $("#members-select");
    clear(sel);
    left.forEach((p) => sel.add(new Option(`${p.name} · ${ROLE_LABEL[p.role]}`, p.id)));
    $("#members-error").hidden = true;
    $("#members-leave").disabled = members.length <= 2;
    d.showModal();
  }
  $("#members-add-btn").addEventListener("click", () => {
    const d = dlg("dlg-members");
    const r = store.addMember(d._conv, me.id, $("#members-select").value);
    if (!r.ok) {
      $("#members-error").hidden = false;
      $("#members-error").textContent = reasonText(r.reason);
      return;
    }
    toast("Person added.");
    openMembers(d._conv);
  });
  $("#members-leave").addEventListener("click", () => {
    const d = dlg("dlg-members");
    const r = store.leaveGroup(d._conv, me.id);
    if (!r.ok) {
      $("#members-error").hidden = false;
      $("#members-error").textContent = reasonText(r.reason);
      return;
    }
    d.close();
    toast("You left the group.");
    renderAll(true);
  });

  function audienceCount(sel) {
    const roles = sel === "everyone" ? ["resident", "staff", "client", "admin"] : sel;
    return PERSONAS.filter((p) => roles.includes(p.role)).length;
  }
  function openAnnounce() {
    const d = dlg("dlg-announce");
    const box = $("#ann-audience");
    clear(box);
    const mk = (value, label, checked) => {
      const el = tpl("t-audience");
      const cb = $("input", el);
      cb.value = value;
      cb.checked = checked;
      $("[data-label]", el).textContent = label;
      cb.addEventListener("change", sync);
      box.appendChild(el);
      return cb;
    };
    const every = mk("everyone", "Everyone", true);
    const roles = [
      ["resident", "Residents"],
      ["staff", "Staff"],
      ["client", "Clients"],
      ["admin", "Admins"],
    ].map(([v, l]) => mk(v, l, false));
    function sync() {
      roles.forEach((cb) => {
        cb.disabled = every.checked;
        if (every.checked) cb.checked = false;
      });
      const sel = every.checked ? "everyone" : roles.filter((c) => c.checked).map((c) => c.value);
      $("#ann-count").textContent = sel === "everyone" || sel.length ? `Reaches about ${audienceCount(sel)} people in this preview.` : "Choose at least one group.";
    }
    sync();
    $("#ann-title").value = "";
    $("#ann-text").value = "";
    $("#ann-error").hidden = true;
    d.showModal();
    $("#ann-title").focus();
  }
  $("#btn-announce").addEventListener("click", openAnnounce);
  $("#form-announce").addEventListener("submit", (e) => {
    e.preventDefault();
    const err = $("#ann-error");
    const boxes = $$("#ann-audience input");
    const every = boxes.find((b) => b.value === "everyone").checked;
    const audience = every ? "everyone" : boxes.filter((b) => b.checked && b.value !== "everyone").map((b) => b.value);
    const res = store.broadcast(me.id, { title: $("#ann-title").value, text: $("#ann-text").value, audience });
    if (!res.ok) {
      err.hidden = false;
      err.textContent = reasonText(res.reason);
      return;
    }
    dlg("dlg-announce").close();
    toast("Announcement sent.");
    ui.tab = "announcements";
    openConv(res.convId);
  });

  function openPreview() {
    const d = dlg("dlg-preview");
    const sel = $("#pv-persona");
    clear(sel);
    PERSONAS.filter((p) => p.role === portal).forEach((p) => sel.add(new Option(`${p.name} · ${p.title}`, p.id)));
    sel.value = me.id;
    // Inside the Client frame the person is chosen for the whole frame (header, sidebar and this page), so the frame reloads.
    sel.onchange = () => {
      const embedded = q.has("embed") && parent !== window;
      const win = embedded ? parent : window;
      win.location.href = `${win.location.pathname.replace("-content.html", ".html")}?as=${sel.value}${q.has("dark") ? "&dark" : ""}`;
    };
    const box = $("#pv-portals");
    clear(box);
    Object.entries(PORTALS).forEach(([key, p]) => {
      const a = tpl("t-link");
      a.href = `/${key}/messages.html${q.has("dark") ? "?dark" : ""}`;
      a.textContent = p.label;
      if (key === portal) a.setAttribute("aria-current", "page");
      box.appendChild(a);
    });
    $("#pv-offline").checked = sessionStorage.getItem("eso-msg-offline") === "1";
    $("#pv-contrast").checked = document.documentElement.hasAttribute("data-contrast");
    const mode = transport.info().mode;
    $("#pv-conn").textContent = { broadcast: "Live sync between tabs", storage: "Saved in this browser", memory: "Not saved (storage is blocked)" }[mode];
    d.showModal();
  }
  $("#btn-preview").addEventListener("click", openPreview);
  $("#btn-preview-icon").addEventListener("click", openPreview);
  $("#pv-offline").addEventListener("change", (e) => {
    sessionStorage.setItem("eso-msg-offline", e.target.checked ? "1" : "0");
    renderAll(true);
    if (!e.target.checked) flushOutbox(); // the connection "came back"
  });
  // High-contrast outdoor mode: a device setting, remembered, also reachable with ?contrast.
  const CONTRAST_KEY = "eso-msg-contrast";
  const setContrast = (on) => {
    document.documentElement.toggleAttribute("data-contrast", on);
    try {
      localStorage.setItem(CONTRAST_KEY, on ? "1" : "0");
    } catch {
      /* not remembered */
    }
  };
  try {
    if (q.has("contrast") || localStorage.getItem(CONTRAST_KEY) === "1") setContrast(true);
  } catch {
    /* ignore */
  }
  $("#pv-contrast").addEventListener("change", (e) => setContrast(e.target.checked));
  const twoStep = (btn, label, run) => {
    let armed = false;
    let timer;
    btn.addEventListener("click", () => {
      if (!armed) {
        armed = true;
        btn.textContent = "Click again to confirm";
        timer = setTimeout(() => {
          armed = false;
          btn.textContent = label;
        }, 3500);
        return;
      }
      clearTimeout(timer);
      armed = false;
      btn.textContent = label;
      run();
    });
  };
  const afterReset = () => {
    ui.convId = null;
    ui.lastConv = null;
    ui.pending = [];
    ui.seen.clear();
    dlg("dlg-preview").close();
    boot();
    toast("Demo data reset.");
  };
  twoStep($("#pv-reset"), "Reset demo data", () => {
    store.reset();
    clearSideData();
    afterReset();
  });
  twoStep($("#pv-empty"), "Start empty", () => {
    store.reset({ empty: true });
    clearSideData();
    afterReset();
  });

  $("#btn-dnd").addEventListener("click", () => {
    const on = !store.pref(me.id).dnd;
    store.setPref(me.id, { dnd: on });
    toast(on ? "Do not disturb is on. Notes and announcements stay quiet; chats with staff still notify you." : "Do not disturb is off.");
  });

  /* --------------------------------------------------------------- render */

  function renderAll(force) {
    root.dataset.pane = ui.pane;
    const label = backLabel();
    $("#back-label").textContent = label;
    $("#btn-back").hidden = !stepsBack();
    renderEmergencyBanner();
    renderList(force);
    renderThread(force);
  }

  let audio = null;
  /** One short, quiet tone (no sound file). Browsers may refuse until the page has been used: then it stays silent. */
  function ping() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audio = audio || new Ctx();
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.22);
      o.connect(g).connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + 0.25);
      window.__esoPings = (window.__esoPings || 0) + 1; // lets a check see that it was asked to play
    } catch {
      /* no audio available: silent */
    }
  }

  function onStore(source) {
    if (source === "live") {
      renderThread(false);
      renderList(false);
      return;
    } // presence or typing only
    // "Sound for new messages" (Settings > Messages): a short soft tone when something new arrives for this person from elsewhere (another tab or document).
    const unreadNow = store.badgeCount(me.id);
    if (source === "remote" && ui.lastBadge !== undefined && unreadNow > ui.lastBadge && messagePref(portal, "msgSound")) ping();
    ui.lastBadge = unreadNow;
    if (ui.convId && document.visibilityState === "visible" && (!isMobile() || ui.pane === "thread")) {
      const before = store.unreadCount(ui.convId, me.id);
      if (before > 0) {
        const t = store.get(ui.convId, me.id);
        const last = t.ok && [...t.messages].reverse().find((m) => !m.mine && notifies(m, me.role));
        if (last && !ui.seen.has(last.id) && source === "remote")
          announce(`${last.author ? last.author.name : "Assistant"}: ${last.text || (last.attachments && last.attachments.length ? "sent an attachment" : "")}`);
        // keep unread dividers visible while the person is scrolled up
        if (ui.stick) store.markRead(ui.convId, me.id, { receipt: messagePref(portal, "msgReceipts") });
        else if (source === "remote") {
          /* leave unread until they scroll down */
        }
      }
    }
    renderAll(false);
  }

  /* ----------------------------------------------------------------- boot */

  function showError(error) {
    console.error(error);
    $("#view-boot").hidden = true;
    $("#view-app").hidden = true;
    $("#view-error").hidden = false;
    $("#error-text").textContent = "Your messages could not be opened. They are safe. Try again, or reach EasySpotOps Support below.";
    $("#btn-retry").onclick = () => location.reload();
    // The reference is the kind of error and the time, so Support can find it; it carries nothing about the person.
    const ref = `${(error && error.name) || "Error"} at ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`;
    const refEl = $("#error-ref");
    if (refEl) refEl.textContent = `Reference: ${ref}`;
    const mail = $("#error-mail");
    if (mail) mail.href = `mailto:support@easyspotops.example?subject=${encodeURIComponent("Messages could not load")}&body=${encodeURIComponent(`Reference: ${ref}\nWhat I was doing: `)}`;
  }

  // "Ask about this claim" in Promotions leaves the claim here for one visit: it opens a chat with the property team that already says which claim it is about.
  function takeAskedClaim() {
    try {
      const raw = localStorage.getItem("eso-ask-claim");
      localStorage.removeItem("eso-ask-claim");
      const a = JSON.parse(raw || "null");
      if (!a || a.rid !== me.id || typeof a.title !== "string") return null;
      return { title: a.title, code: a.code, at: a.at, status: a.status, claimId: a.claimId, promoId: a.promoId, unit: !!a.unit };
    } catch {
      return null;
    }
  }

  function boot() {
    try {
      const bootList = $("#boot-list");
      if (bootList && !bootList.children.length) for (let i = 0; i < 5; i++) bootList.appendChild(tpl("t-skel-row"));
      $("#view-boot").hidden = true;
      $("#view-app").hidden = false;
      store.tick();
      ui.lastBadge = store.badgeCount(me.id); // what is already unread when the page opens is not "new"
      let conv = routeConv();
      if (conv && !store.get(conv, me.id).ok) conv = null;
      if (me.role === "resident" && q.get("ask")) {
        const asked = takeAskedClaim();
        const r = asked ? store.askAboutClaim(me.id, asked) : null;
        if (r && r.ok) conv = r.convId;
      }
      if (me.role === "resident" && !conv) {
        const r = store.ensureSession(me.id);
        if (!r.ok) throw new Error(r.reason);
        conv = r.convId;
      }
      ui.convId = conv;
      ui.pane = conv ? "thread" : "list";
      const unread = conv ? store.get(conv, me.id).messages.find((m) => m.from !== me.id && !m.readBy[me.id] && notifies(m, me.role)) : null;
      ui.anchor = unread ? { convId: conv, msgId: unread.id } : null;
      history.replaceState({ depth: (history.state && history.state.depth) || 0, pane: ui.pane, conv }, "", conv ? `#/c/${conv}` : location.pathname + location.search);
      ui.sigLog = "";
      openSideEffects();
      renderAll(true);
      restoreOutbox(); // messages written without a connection on an earlier visit
    } catch (error) {
      showError(error);
    }
  }

  /* Keyboard shortcuts for power users: Ctrl/Cmd+K quick search, Alt+N next unread priority thread, Esc closes menus. */
  function nextUnread() {
    const rows = store.listFor(me.id).filter((r) => r.unread > 0 && r.id !== ui.convId && !r.muted);
    rows.sort((a, b) => Number(b.emergency) - Number(a.emergency) || Number(b.important) - Number(a.important) || b.updatedAt - a.updatedAt);
    if (!rows.length) return toast("No other unread conversations.");
    openConv(rows[0].id);
  }
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (isMobile() && ui.pane === "thread") go({ pane: "list" }, { push: true });
      searchBox.focus();
      searchBox.select();
    } else if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "n") {
      e.preventDefault();
      nextUnread();
    } else if (e.key === "Escape") {
      closeThreadMenu();
      closeRowMenus();
      closeMenu();
      // Esc closes the details panel when you are inside it, or when it covers the screen (narrower than 1280px).
      const pane = $("#context-pane");
      if (!pane.hidden && !document.querySelector("dialog[open]") && Date.now() - (ui.dlgClosedAt || 0) > 400 && (pane.contains(document.activeElement) || !matchMedia("(min-width: 1280px)").matches)) {
        setContext(false);
        $("#btn-context")?.focus();
      }
    }
  });

  // A promotion claim changed in another tab (the resident claimed or cancelled, Staff verified or rejected): the Promotions list in the details panel follows.
  window.addEventListener("storage", (e) => {
    if (!e.key || !(e.key.startsWith("eso-res-promo:") || e.key === "eso-pm-claimstate" || e.key === "eso-pmclaims")) return;
    if (!ui.convId) return;
    const t = store.get(ui.convId, me.id);
    if (t.ok) {
      renderContext(t);
      renderThread(true); // the claim card in the chat shows the claim as it is now
    }
  });
  store.subscribe(onStore);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      openSideEffects();
      renderAll(true);
    }
  });
  window.addEventListener("online", () => {
    renderAll(true);
    flushOutbox();
  });
  window.addEventListener("offline", () => renderAll(true));
  matchMedia("(max-width: 1023px)").addEventListener("change", () => renderAll(true));
  setInterval(() => {
    store.tick();
    renderAll(false);
  }, 30000);
  store.touchPresence(me.id);
  setInterval(() => {
    if (document.visibilityState === "visible") store.touchPresence(me.id);
  }, 20000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") store.touchPresence(me.id);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.querySelector("dialog[open]")) {
      e.preventDefault();
      if (isMobile() && ui.pane === "thread") return;
      $("#list-search").focus();
    }
  });
  boot();
}
