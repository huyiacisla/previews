/* Staff account settings, joined to the real Staff dashboard. Loaded as <script type="module"> after the prototype's own scripts.
   NOTE: BRIEF.md allows no JS besides preview.js; like account-settings.quality.js this is a deliberate exception for this page only.
   Does not edit the prototype's code. It:
   1. sends "Dashboard" and "Messages" (sidebar, top bar, breadcrumb) to the real portal pages,
   2. adds the settings the prototype lacked: Messages, Accessibility, and Resident promotions,
   3. keeps the values in the prototype's own store (S, key "eso-proto"), which /resident/promotions.html also reads.
   Demo only: nothing is sent to a server. Everything else in Settings (Notifications, Security, Support...) is the prototype's own. */

import { normalizePurchased, propertiesCount } from "../features/capacity/store.js";
import { initials as initialsOf, pickPersona } from "../features/messaging/personas.js";
import { CONTACTS, demoEmail, phoneError, readPrefs, savePrefs } from "../features/settings/prefs.js";
import { residentState, setShow } from "../features/social/store.js";
import { backTarget } from "../shared/js/back-target.js";
import { companyPrefs } from "../shared/js/company-prefs.js";
import { pathForHash as routePath } from "../shared/js/staff-routes.js";

// How many properties the company has now: the one it started with and each one added in Capacity (kept under a name without "eso-", see portal-frame.js).
const propCount = () => {
  try {
    return propertiesCount(normalizePurchased(JSON.parse(localStorage.getItem("capacity-state:client"))));
  } catch {
    return 1;
  }
};
const companyMgmt = () => companyPrefs(globalThis.localStorage); // what the company decided for its residents (Show "Managed by …", and the rest)
// "Require 2-step verification for everyone" (the company's): the personal 2-step page says so while the person has not turned it on. Staff and Client people only.
const mfaNote = () =>
  companyPrefs(globalThis.localStorage).mfa
    ? [["Your account is protected by your password only.", "Your company requires 2-step verification. Until you turn it on, your account is protected by your password only."]]
    : [];
// The page's own 2-step code asks this: when the company requires 2-step verification, the person cannot turn it off (Staff and Client people only; the company's
// switch is "Require 2-step verification for everyone" in Workspace settings). Asked each time, so a change of the company's switch is seen at once.
globalThis._companyMfa = () => /^\/(staff|client)\//.test(globalThis.location.pathname) && companyPrefs(globalThis.localStorage).mfa === true;

import { ITEMS as PLAN_ITEMS } from "../features/capacity/store.js";
import { CW_DEFAULTS, PROP as CW_PROP, clientWorkspaceTree, installClientWorkspace } from "./client-workspace.js";

(() => {
  const w = window;
  const search = location.search;
  /* The same page serves three portals: /staff/…, /client/account-settings.html and /resident/settings…, which all include it.
     The Client and Resident copies keep their own settings (the page shim prefixes their storage keys). The Client has the Client sidebar and no
     Social and no Promotions. A Resident has no Workspace, Availability or Promotions: their settings are their profile, notifications, messages,
     sign-in, look and feel, language, date and time, accessibility and their property. The sidebar colors and personalization are shared. */
  const client = location.pathname.startsWith("/client/");
  const resident = location.pathname.startsWith("/resident/");
  // The Admin portal has the page too (/admin/settings…): like a Resident, an admin has no workspace here, only their own settings
  // (profile, availability, notifications, messages, sign-in, Personalize with gestures and the sidebar, language, date and time, accessibility).
  const admin = location.pathname.startsWith("/admin/");
  const solo = resident || admin;
  const portalKey = client ? "client" : resident ? "resident" : admin ? "admin" : "staff";
  const pathForHash = (hash) => routePath(hash, portalKey);
  const me0 = solo ? pickPersona(resident ? "resident" : "admin", new URLSearchParams(location.search).get("as")) : null;
  // The Staff person using the portal: the same one the header names (the prototype's own profile says "QA Staff PM"; see STAFF_WORDS and reskinS).
  const meS = !client && !solo ? pickPersona("staff", new URLSearchParams(location.search).get("as")) : null;

  /* 1. Real pages. The prototype is a single-page app with its own sidebar; these items have a real page in the portal. */
  const home = `/${portalKey}`;
  const real = { Dashboard: resident ? "/resident/home.html" : `${home}/dashboard.html`, Messages: `${home}/messages.html`, "Ticket box": `${home}/tickets.html` };
  document.addEventListener(
    "click",
    (e) => {
      const p = e.target.closest("[data-p]");
      const crumb = e.target.closest('a[href="#/dashboard"]');
      const to = crumb ? real.Dashboard : p && real[p.dataset.p];
      if (!to || e.defaultPrevented) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      location.href = to + search;
    },
    true,
  );

  /* 2. Defaults for the new switches. DEF feeds "Reset to defaults", so reset also restores these. */
  const NEW = {
    msgEnter: true,
    msgSound: true,
    msgReceipts: true,
    msgTyping: true,
    msgAway: false,
    emSms: true,
    a11yContrast: false,
    a11yMotion: false,
    a11yTarget: false,
    a11yFocus: false,
    promoShow: true,
    promoSave: true,
    rpWeekly: true,
    rpMonthly: false,
    rpAlerts: true,
    // Resident: what to be told about, how, and the Social timeline switch.
    rnParking: true,
    rnRequests: true,
    rnPayments: true,
    rnCommunity: true,
    rnPromos: true,
    rnMessages: true,
    rnEmail: true,
    rnSms: false,
    rnQuiet: true,
    resSocial: true,
    // Admin: every switch starts on (platform health alerts included, as the bell always showed them).
    anTickets: true,
    anReplies: true,
    anEmergency: true,
    anMessages: true,
    anAlerts: true,
  };
  // The Client's Workspace is about its company and portfolio: its own settings (see client-workspace.js).
  if (client) Object.assign(NEW, CW_DEFAULTS);
  try {
    Object.assign(DEF, NEW);
  } catch {
    /* DEF is a global const in the prototype */
  }
  try {
    for (const k of Object.keys(NEW)) if (S[k] === undefined) S[k] = NEW[k];
  } catch {
    /* S is the prototype's settings object */
  }

  /* The product is English only for now. The prototype's Language page also offered Tiếng Việt and Español, which only
     relabelled a few strings inside the prototype and nowhere else, so they are taken out (LANGS is the prototype's own array). */
  try {
    LANGS.splice(1);
    if (S.lang !== "en") S.lang = "en";
  } catch {
    /* LANGS and S are the prototype's globals */
  }

  /* 3. Accessibility switches act on <html>, so every screen of the page follows. */
  const style = document.createElement("style");
  style.textContent = `
html.a11y-motion *,html.a11y-motion *::before,html.a11y-motion *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}
html.a11y-contrast{--muted:#374151;--border:#6b7280}
html.a11y-contrast.dark{--muted:#e5e7eb;--border:#9ca3af}
html.a11y-target button,html.a11y-target select,html.a11y-target .sb a{min-height:44px}
html.a11y-focus :focus-visible{outline:3px solid var(--primary)!important;outline-offset:2px!important}`;
  document.head.appendChild(style);
  const classes = () => {
    const h = document.documentElement;
    h.classList.toggle("a11y-contrast", !!S.a11yContrast);
    h.classList.toggle("a11y-motion", !!S.a11yMotion);
    h.classList.toggle("a11y-target", !!S.a11yTarget);
    h.classList.toggle("a11y-focus", !!S.a11yFocus);
  };
  const apply0 = w.apply;
  w.apply = function () {
    const r = apply0.apply(this, arguments);
    classes();
    return r;
  };
  classes();

  /* 4. Section bodies, built with the prototype's own row helpers (pzCard, pzT) so they look and behave like its other pages. */
  const messaging = () =>
    `<h3 class="pzsec">Writing</h3>` +
    pzCard(
      pzT("msgEnter", "Press Enter to send", "Off: Enter adds a new line and the Send button sends.") + pzT("msgSound", "Sound for new messages"),
      "Quiet hours and the digest live in Notifications.",
    ) +
    `<h3 class="pzsec">What others see</h3>` +
    pzCard(
      pzT("msgReceipts", "Show when I have read a message") +
        pzT("msgTyping", "Show when I am typing") +
        pzT("msgAway", "Away reply", `When your status is Away, ${client ? "anyone" : "a resident"} who writes to you gets a short note that you will answer later.`),
    ) +
    `<h3 class="pzsec">Emergencies</h3>` +
    pzCard(
      pzT("emSms", "Text me if I have not acknowledged within 3 minutes", "Sent to " + user.phone + ". The alert stays open until someone acknowledges it."),
      "Messages keeps the record of who acknowledged and when.",
    );
  const accessibility = () =>
    `<h3 class="pzsec">Seeing</h3>` +
    pzCard(
      pzT("a11yContrast", "Higher contrast", "Darker secondary text and stronger borders, good in bright sun.") +
        pzT("a11yFocus", "Stronger focus outline", "A thick ring around the control you reach with the keyboard."),
    ) +
    `<h3 class="pzsec">Moving and tapping</h3>` +
    pzCard(pzT("a11yMotion", "Reduce motion", "Removes slides and fades.") + pzT("a11yTarget", "Larger tap targets", "Buttons grow to at least 44 px tall."), "Text size lives in Personalize.");
  const promos = () =>
    `<h3 class="pzsec">In the Resident app</h3>` +
    pzCard(
      pzT("promoShow", "Show promotions to residents", "Published promotions appear under Promotions in the Resident app. Turn off to hide them all.") +
        pzT("promoSave", "Let residents save promotions", "Residents can star a promotion and find it again under Saved."),
      "Create and publish promotions in Community and Announcements, then Promotions. Branding and templates live in Promotion design.",
    );

  /* 5. Put the sections in the tree: Messages and Accessibility under My settings, Resident promotions under Workspace. */
  const T0 = w.TREES;
  w.TREES = () => {
    const T = T0();
    const me = T.settings.kids,
      ws = T.workspace.kids;
    if (!me.find((x) => x.id === "messaging")) {
      const i = Math.max(
        me.findIndex((x) => x.id === "notifications"),
        0,
      );
      me.splice(i + 1, 0, {
        id: "messaging",
        t: "Messages",
        ic: "💬",
        c: "#22c55e",
        pic: "msg",
        desc: "Sending, read receipts, away replies and emergency texts.",
        sum: () => (S.msgEnter ? "Enter sends" : "Enter adds a line") + (S.msgAway ? " · Away reply on" : ""),
        leaf: messaging,
        kw: "messages chat enter send sound read receipts typing away reply emergency sms",
      });
    }
    if (!me.find((x) => x.id === "accessibility")) {
      const i = Math.max(
        me.findIndex((x) => x.id === "datetime"),
        0,
      );
      me.splice(i + 1, 0, {
        id: "accessibility",
        t: "Accessibility",
        ic: "♿",
        c: "#0ea5e9",
        pic: "user",
        desc: "Contrast, focus ring, motion and tap size.",
        sum: () => [S.a11yContrast && "Contrast", S.a11yMotion && "Less motion", S.a11yTarget && "Large taps", S.a11yFocus && "Focus ring"].filter(Boolean).join(" · ") || "Standard",
        leaf: accessibility,
        kw: "accessibility contrast motion reduce focus tap target large outdoor sun",
      });
    }
    if (client) {
      /* Client: the same sections as Staff, without Social and Promotions, plus two that suit a management company. */
      const drop = (kids, ids) => {
        for (const id of ids) {
          const i = kids.findIndex((x) => x.id === id);
          if (i >= 0) kids.splice(i, 1);
        }
      };
      drop(me, ["socialmaster"]);
      // The Client's sidebar is the real dashboard sidebar, not the prototype's own. Keep only the options that change it
      // (colors, icons, count badges, the overview card) and take out the rest (layout, menu style, scrollbar, collapse, favorites, search, property switcher).
      const pz = me.find((x) => x.id === "personalize");
      if (pz && pz.kids) {
        pz.kids = pz.kids.filter((k) => k.id !== "icons");
        const side = pz.kids.find((k) => k.id === "sidebar");
        if (side && side.leaf) {
          const l = side.leaf;
          side.leaf = () => trimSidebar(l());
          side.kw = "sidebar color colors preset background text active item icons count badges overview card";
        }
      }
      // Workspace: the Client is a company with a portfolio of properties that pays for the plan, so its workspace is built around that
      // (company, properties and each property's own settings, defaults, team, plan and billing), not around one property as Staff's is.
      // The prototype's property pages (branding, details, hours, emergency contact, amenities) are kept as each property's settings.
      ws.splice(0, ws.length, ...clientWorkspaceTree(ws.find((x) => x.id === "property")));
      skinKids(me);
    } else if (admin) {
      /* Admin: their own settings only. No Workspace, Social master or Promotions; Availability stays (an admin answers Support). */
      const drop = (kids, ids) => {
        for (const id of ids) {
          const i = kids.findIndex((x) => x.id === id);
          if (i >= 0) kids.splice(i, 1);
        }
      };
      drop(me, ["socialmaster"]);
      ws.splice(0, ws.length);
      const sec = me.find((x) => x.id === "security");
      if (sec && sec.kids) sec.kids = sec.kids.filter((k) => k.id !== "wssec");
      // Look and feel: the sidebar these colors change is the real Admin sidebar, so only the options that reach it stay.
      const pz = me.find((x) => x.id === "personalize");
      if (pz && pz.kids) {
        pz.kids = pz.kids.filter((k) => k.id !== "icons");
        const side = pz.kids.find((k) => k.id === "sidebar");
        if (side && side.leaf) {
          const l = side.leaf;
          side.leaf = () => trimSidebar(l(), "Platform summary card");
          side.kw = "sidebar color colors preset background text active item count badges platform summary card";
        }
      }
      const rep = (id, patch) => {
        const k = me.find((x) => x.id === id);
        if (k) Object.assign(k, patch);
      };
      const g = me.find((x) => x.id === "general");
      if (g) {
        const l0 = g.leaf;
        Object.assign(g, { t: "My profile", desc: "Your name, role and how the team reaches you.", sum: () => `${me0.name} · ${me0.title}`, leaf: () => adminProfile(l0()) });
      }
      rep("notifications", {
        desc: "Which Support and platform events reach you, and how.",
        sum: () => [S.anTickets !== false && "Tickets", S.anEmergency !== false && "Emergencies", S.anAlerts && "Platform alerts"].filter(Boolean).join(" · ") || "Off",
        leaf: adminNotifications,
        kw: "notifications alerts tickets support emergency messages platform health email digest quiet hours",
      });
      skinKids(me);
    } else if (resident) {
      /* Resident: no Workspace (it is left empty and its address goes to Settings), no Availability, Social master or Promotions. */
      const drop = (kids, ids) => {
        for (const id of ids) {
          const i = kids.findIndex((x) => x.id === id);
          if (i >= 0) kids.splice(i, 1);
        }
      };
      drop(me, ["availability", "socialmaster"]);
      ws.splice(0, ws.length);
      const sec = me.find((x) => x.id === "security");
      if (sec && sec.kids) sec.kids = sec.kids.filter((k) => k.id !== "wssec");
      // Look and feel: the sidebar of the real Resident pages is the one these colors and icons change; the rest of the sidebar options go.
      const pz = me.find((x) => x.id === "personalize");
      if (pz && pz.kids) {
        pz.kids = pz.kids.filter((k) => k.id !== "icons");
        const side = pz.kids.find((k) => k.id === "sidebar");
        if (side && side.leaf) {
          const l = side.leaf;
          side.leaf = () => trimSidebar(l(), "Vehicle allowance card");
          side.kw = "sidebar color colors preset background text active item count badges residence summary card";
        }
      }
      const rep = (id, patch) => {
        const k = me.find((x) => x.id === id);
        if (k) Object.assign(k, patch);
      };
      const g = me.find((x) => x.id === "general");
      if (g) {
        const l0 = g.leaf;
        Object.assign(g, { t: "My profile", desc: "Your name, unit and how the property team reaches you.", sum: () => `${me0.name} · ${me0.title}`, leaf: () => residentProfile(l0()) });
      }
      rep("notifications", {
        desc: "What the property tells you about, and how.",
        sum: () => [S.rnParking && "Parking", S.rnRequests && "Requests", S.rnPayments && "Payments"].filter(Boolean).join(" · ") || "Off",
        leaf: residentNotifications,
        kw: "notifications alerts parking requests payments community promotions email text quiet hours",
      });
      rep("messaging", { desc: "Sending, sounds and what others see.", sum: () => (S.msgEnter ? "Enter sends" : "Enter adds a line"), leaf: residentMessaging });
      if (!me.find((x) => x.id === "property")) {
        const i = Math.max(
          me.findIndex((x) => x.id === "general"),
          0,
        );
        me.splice(i + 1, 0, {
          id: "property",
          t: "My property",
          ic: "🏠",
          c: "#0ea5e9",
          pic: "map",
          desc: "Your unit, and the Social timeline.",
          sum: () => `${me0.title} · Social ${S.resSocial ? "on" : "hidden"}`,
          leaf: residentProperty,
          kw: "property unit building address social timeline hide show",
        });
      }
      skinKids(me);
    } else if (!ws.find((x) => x.id === "residentpromos")) {
      ws.push({
        id: "residentpromos",
        t: "Resident promotions",
        ic: "🏷️",
        c: "#e11d48",
        pic: "bell",
        desc: "Choose whether residents see and can save the promotions you publish.",
        g: "Community",
        sum: () => (S.promoShow ? "Shown to residents" : "Hidden from residents") + (S.promoSave ? " · Saving on" : ""),
        leaf: promos,
        kw: "promotions residents resident app show hide save deals offers",
      });
    }
    if (meS) {
      skinKids(me);
      skinKids(ws);
    }
    return T;
  };

  /* 6. Client only: sidebar, names and storage. */
  function trimSidebar(html, cardLabel = "Portfolio overview card") {
    const t = document.createElement("template");
    t.innerHTML = html;
    const KILL = /^(Layout|Menu style|Scrollbar|Apply scrollbar|Show Favorites|Menu search|Property switcher)/;
    t.content.querySelectorAll(".srow").forEach((r) => {
      if (KILL.test((r.querySelector(".stt") || r).textContent.trim())) r.remove();
    });
    // A card with no rows left goes, with the note under it; so does a heading with nothing under it.
    t.content.querySelectorAll(".sgroup").forEach((g) => {
      if (g.querySelector(".srow,.pzrow")) return;
      const n = g.nextElementSibling;
      if (n && n.classList.contains("helpt")) n.remove();
      g.remove();
    });
    t.content.querySelectorAll(".pzsec").forEach((h) => {
      const n = h.nextElementSibling;
      if (!n || !n.classList.contains("sgroup")) h.remove();
    });
    const card = [...t.content.querySelectorAll(".srow .stt")].find((s) => /^Workspace Capacity card/.test(s.textContent.trim()));
    if (card) card.firstChild.textContent = cardLabel;
    return t.innerHTML;
  }

  /* 6b. Resident only: the sections that are theirs. They are built with the prototype's own helpers (pzCard, pzT, pr) so they look like its other pages. */
  // The prototype's own row helper (pr) is not reachable from here: the same row, written out.
  // …and the prototype's own card (a heading, a note, then the rows).
  const pcard = (ic, t, s, body, ro) =>
    `<div class="pscard"><div class="hd"><span class="ib">${typeof PI === "function" ? PI(ic) : ""}</span><div><h3>${t}</h3><p>${s}</p></div></div>${ro ? `<div class="pro"><span class="bd">Read only</span>${ro}</div>` : ""}${body}</div>`;
  const prow = (t, s, v) => `<div class="prow"><div><b>${t}</b><small>${s}</small></div>${v ? `<span class="pill">${v}</span>` : ""}</div>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  // My profile: the prototype's photo block and "read only" note stay; its staff rows are replaced by the resident's own.
  function residentProfile(html) {
    const t = document.createElement("template");
    t.innerHTML = html;
    const card0 = t.content.querySelector(".pscard");
    if (!card0) return html;
    card0.querySelectorAll(".prow").forEach((r) => r.remove());
    const h = card0.querySelector(".hd h3");
    const d = card0.querySelector(".hd p");
    if (h) h.textContent = "My profile";
    if (d) d.textContent = "Your name, unit and how the property team reaches you.";
    const pro = card0.querySelector(".pro");
    if (pro) pro.innerHTML = '<span class="bd">Read only</span>Your name, unit and email are managed by your property team. Your photo, phone and contact choice are yours to change.';
    const p = readPrefs(localStorage, me0.id);
    const opt = (v, label) => `<option value="${v}"${p.contact === v ? " selected" : ""}>${label}</option>`;
    card0.insertAdjacentHTML(
      "beforeend",
      `<div class="prow"><div><b>Name</b><small>As the property team has it.</small></div><span class="pill">${esc(me0.name)}</span></div>` +
        `<div class="prow"><div><b>Unit</b><small>Your residence at this property.</small></div><span class="pill">${esc(me0.title)}</span></div>` +
        `<div class="prow"><div><b>Property</b><small>Where you live.</small></div><span class="pill">${esc(me0.org)}</span></div>` +
        `<div class="prow"><div><b>Email</b><small>Managed by your property team.</small></div><span class="pill">${esc(demoEmail(me0.name))}</span></div>` +
        `<div class="prow"><div><label for="rs-phone"><b>Phone</b></label><small>Optional. Only the property team sees it.</small></div><input class="ix-in" id="rs-phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(p.phone || "")}" aria-describedby="rs-err"></div>` +
        `<div class="prow"><div><label for="rs-contact"><b>Best way to reach me</b></label><small>Used for anything urgent.</small></div><select class="ix-in" id="rs-contact">${opt("app", "In the app")}${opt("email", "Email")}${opt("text", "Text message")}</select></div>` +
        `<p id="rs-err" role="alert" class="helpt" style="color:var(--danger,#b91c1c)" hidden></p>` +
        `<div class="bt" style="padding:12px 16px;display:flex;justify-content:flex-end"><button type="button" class="stbtn sm p" data-rs-save>Save changes</button></div>`,
    );
    return t.innerHTML;
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-rs-save]")) return;
    const phone = document.getElementById("rs-phone");
    const contact = document.getElementById("rs-contact");
    const err = document.getElementById("rs-err");
    if (!phone || !contact || !err) return;
    const bad = phoneError(phone.value);
    err.hidden = !bad;
    err.textContent = bad || "";
    if (bad) {
      phone.focus();
      return;
    }
    if (savePrefs(localStorage, me0.id, { phone: phone.value.trim(), contact: CONTACTS.includes(contact.value) ? contact.value : "app" })) {
      try {
        w.toast("Saved");
      } catch {
        /* the prototype's toast */
      }
    }
  });
  function residentNotifications() {
    return (
      `<h3 class="pzsec">Tell me about</h3>` +
      pzCard(
        pzT("rnParking", "Parking and passes", "Passes ready, spots assigned, guest spots and expiring access.") +
          pzT("rnRequests", "Requests and tickets", "Updates on a request or a ticket you opened.") +
          pzT("rnPayments", "Payments and statements", "A payment received, a statement ready.") +
          pzT("rnMessages", "Messages from the property team", "Replies in Messages and the assistant.") +
          pzT("rnCommunity", "Community posts", "Announcements and neighbor posts in Social.") +
          pzT("rnPromos", "Offers for residents", "Promotions published by the property."),
      ) +
      `<h3 class="pzsec">How</h3>` +
      pzCard(
        pzT("rnEmail", "Email", "To " + esc(demoEmail(me0.name)) + ".") +
          pzT("rnSms", "Text message", "Only for urgent things like a tow or a closed garage.") +
          pzT("rnQuiet", "Quiet hours", "No sounds between 10 PM and 7 AM. Urgent notices still come through."),
        "Everything also shows in the bell at the top of every page.",
      )
    );
  }
  // Admin: the same card, with what Support knows about the person. The phone and the contact choice are theirs to change (kept with the Resident's helper).
  function adminProfile(html) {
    const t = document.createElement("template");
    t.innerHTML = html;
    const card0 = t.content.querySelector(".pscard");
    if (!card0) return html;
    card0.querySelectorAll(".prow").forEach((r) => r.remove());
    const h = card0.querySelector(".hd h3");
    const d = card0.querySelector(".hd p");
    if (h) h.textContent = "My profile";
    if (d) d.textContent = "Your name, role and how the team reaches you.";
    const pro = card0.querySelector(".pro");
    if (pro) pro.innerHTML = '<span class="bd">Read only</span>Your name, role and email are managed by EasySpotOps. Your photo, phone and contact choice are yours to change.';
    const p = readPrefs(localStorage, me0.id);
    const opt = (v, label) => `<option value="${v}"${p.contact === v ? " selected" : ""}>${label}</option>`;
    card0.insertAdjacentHTML(
      "beforeend",
      `<div class="prow"><div><b>Name</b><small>As it shows in Messages and the Ticket box.</small></div><span class="pill">${esc(me0.name)}</span></div>` +
        `<div class="prow"><div><b>Role</b><small>Your role in the Admin portal.</small></div><span class="pill">${esc(me0.title)}</span></div>` +
        `<div class="prow"><div><b>Team</b><small>Who you answer for.</small></div><span class="pill">${esc(me0.org)}</span></div>` +
        `<div class="prow"><div><b>Email</b><small>Used to sign in.</small></div><span class="pill">${esc(demoEmail(me0.name))}</span></div>` +
        `<div class="prow"><div><label for="rs-phone"><b>Phone</b></label><small>Optional. Only other admins see it.</small></div><input class="ix-in" id="rs-phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(p.phone || "")}" aria-describedby="rs-err"></div>` +
        `<div class="prow"><div><label for="rs-contact"><b>Best way to reach me</b></label><small>Used when an emergency is escalated.</small></div><select class="ix-in" id="rs-contact">${opt("app", "In the app")}${opt("email", "Email")}${opt("text", "Text message")}</select></div>` +
        `<p id="rs-err" role="alert" class="helpt" style="color:var(--danger,#b91c1c)" hidden></p>` +
        `<div class="bt" style="padding:12px 16px;display:flex;justify-content:flex-end"><button type="button" class="stbtn sm p" data-rs-save>Save changes</button></div>`,
    );
    return t.innerHTML;
  }
  function adminNotifications() {
    return (
      `<h3 class="pzsec">Tell me about</h3>` +
      pzCard(
        pzT("anTickets", "New Support tickets", "A Staff person or a Client opened a ticket.") +
          pzT("anReplies", "Replies on my tickets", "The requester answered a ticket assigned to you.") +
          pzT("anEmergency", "Emergencies", "An emergency nobody has acknowledged. Always shown in the app.") +
          pzT("anMessages", "Direct messages", "Messages from Staff, Clients and other admins.") +
          pzT("anAlerts", "Platform health alerts", "Critical and warning checks across clients and properties."),
      ) +
      `<h3 class="pzsec">How</h3>` +
      pzCard(
        pzT("anEmail", "Email", "To " + esc(demoEmail(me0.name)) + ".") +
          pzT("anDigest", "Daily summary", "One email each morning with what is still open.") +
          pzT("anQuiet", "Quiet hours", "No sounds between 10 PM and 7 AM. Emergencies still come through."),
        "Everything also shows in the bell at the top of every page.",
      )
    );
  }
  function residentMessaging() {
    return (
      `<h3 class="pzsec">Writing</h3>` +
      pzCard(pzT("msgEnter", "Press Enter to send", "Off: Enter adds a new line and the Send button sends.") + pzT("msgSound", "Sound for new messages")) +
      `<h3 class="pzsec">What others see</h3>` +
      pzCard(pzT("msgReceipts", "Show when I have read a message") + pzT("msgTyping", "Show when I am typing"), "The property team sees only what you turn on here.")
    );
  }
  function residentProperty() {
    const st = residentState(localStorage, me0.id);
    // The switch is kept in the prototype's own settings (S.resSocial) and carried to Social when it changes.
    return (
      pcard(
        "user",
        "My property",
        "Where you live.",
        prow("Residence", "Unit and building.", esc(me0.title)) + prow("Property", companyMgmt().mgmt ? `Managed by ${esc(companyMgmt().name)}.` : "Your property.", esc(me0.org)),
        "",
      ) +
      `<h3 class="pzsec">Social</h3>` +
      pzCard(
        pzT("resSocial", "Show Social", "Updates from your property and neighbors. Off hides the Social timeline and its menu item for you only."),
        st.show ? "You can also hide Social from the Social page itself." : "Social is hidden for you. Turn it on to see the timeline again.",
      )
    );
  }
  // Staff wording in sections that already exist becomes Client wording.
  const WORDS = [
    ["Staff Portal", "Client Portal"],
    ["staff portal", "client portal"],
    ["QA Staff PM", "Dana Whitfield"],
    ["staff@mail.easyspotops.com", "dana.whitfield@amcllc.example"],
    ["Manager Operations", "Client Admin"],
    ["Property Manager", "Client"],
    ["EasySpotOps account", "Client account"],
    ...mfaNote(),
  ];
  WORDS.push(
    ["Staff identity, role, company, and active property.", "Your identity, role, company and the properties you manage."],
    ["Your staff identity for assigned property operations.", "Your identity for the properties you manage."],
    ["Staff name", "Your name"],
    ["Shown across staff workspace tools and operations.", "Shown across the Client portal."],
    ["Used for staff sign-in and workspace communication.", "Used for sign-in and messages from EasySpotOps."],
    ["Controls which staff tools are visible.", "Controls which Client tools are visible."],
    ["Quick messages for property staff", "Quick messages for the property team"],
    ["Residents, staff or spaces near the limit", "Properties, staff or spaces near the limit"],
    ["Search guides for staff tools", "Search guides for Client tools"],
    ["Staff support guidance", "Support guidance"],
  );
  // The Client is the company AMC LLC; Mallard Pointe, Sundale and the rest are properties it owns, so the account is never named after one of them.
  WORDS.push(
    ["Active property · Mallard Pointe Management", "Company · AMC LLC"],
    ["Mallard Pointe Management", "AMC LLC"],
    ["Sample text — Mallard Pointe has 37 open spots today.", "Sample text — AMC LLC has 37 open spots today."],
    ["Use the time zone of your property (Mallard Pointe · America/Los_Angeles).", "Use the time zone of your company (AMC LLC · America/Los_Angeles)."],
    // Social is a Staff tool; the Client's Gestures summary does not mention it.
    ["Sidebar Left · Social off", "Sidebar Left"],
    ["Sidebar Right · Social off", "Sidebar Right"],
    ["Sidebar Left · Social on", "Sidebar Left"],
    ["Sidebar Right · Social on", "Sidebar Right"],
    [
      "Mallard Pointe at Riverbend · role, permissions, assigned properties, security and property profile for this workspace.",
      "AMC LLC · your portfolio and its properties, the rules they share, your team and your plan.",
    ],
    ["Current property", "Company"],
    ["Mallard Pointe at Riverbend", "AMC LLC"],
    ["Active assignment", `${propCount()} ${propCount() === 1 ? "property" : "properties"}`], // the same count as Workspace and the sidebar
  );
  WORDS.push(
    ["EasySpotOps Help Center", "Support"],
    ["this staff profile", "your profile"],
    ["staff profile", "your profile"],
    ["Staff (read-only)", "Viewer (read-only)"],
    ["(QS)", "(DW)"],
    ["Messages, Community & Announcements, Promotions.", "Messages, Calendar and Activity."],
  );
  // Pieces of existing sections that are about Social or Promotions: the Client has neither, so they are cut out.
  const CUTS = [
    /<span><svg[^>]*>(?:(?!<\/span>)[\s\S])*?<\/svg> Social pulse: <b>[^<]*<\/b><\/span>/g,
    /<p class="gzh">Open Social pulse<\/p><div class="sgroup">(?:(?!<p class="gzh">)[\s\S])*?<\/div><\/div>(?:<div style="height:14px"><\/div>)?/g,
    /<li><b style="color:#16a34a">Social pulse<\/b>[^<]*<\/li>/g,
    /<text[^>]*>Social off<\/text>/g,
    /<div class="hs-row"><i>(?:(?!<\/i>)[\s\S])*<\/i><div><b>Promotion claims history<\/b>[\s\S]*?<\/button><\/div>/g,
    /<div class="prow"><div><b>Social<\/b>[\s\S]*?<\/div><span class="pill">[^<]*<\/span><\/div>/g,
  ];
  // Resident: the wording of the sections they share with Staff (Personalize, Security, Language…) says "you" and "your property team".
  const RWORDS = resident
    ? [
        ["Profile settings", "Settings"],
        ["Staff Portal", "Resident Portal"],
        ["staff portal", "resident portal"],
        ["QA Staff PM", me0.name],
        ["staff@mail.easyspotops.com", demoEmail(me0.name)],
        ["Property Manager", me0.title],
        ["this staff profile", "your profile"],
        ["staff profile", "your profile"],
        ["Workspace security", "Account security"],
        ["Mallard Pointe Management", me0.org],
        ["Current property", "Property"],
        ["(QS)", `(${initialsOf(me0.name)})`],
        ["Quick messages for property staff", "Quick messages for the property team"],
        ["Sidebar Left · Social off", "Sidebar Left"],
        ["Sidebar Right · Social off", "Sidebar Right"],
        ["Sidebar Left · Social on", "Sidebar Left"],
        ["Sidebar Right · Social on", "Sidebar Right"],
        ["EasySpotOps account", "Resident account"], // the page header and the profile row say whose account this is: the resident's
      ]
    : admin
      ? [
          [
            "Your personal staff profile: identity, availability, notifications and preferences. Applies across all workspaces.",
            "Your profile, availability, notifications and look. They apply to the whole Admin portal.",
          ],
          ["Profile settings", "Settings"],
          ["Staff Portal", "Admin Portal"],
          ["staff portal", "admin portal"],
          ["QA Staff PM", me0.name],
          ["staff@mail.easyspotops.com", demoEmail(me0.name)],
          ["Property Manager", me0.title],
          ["this staff profile", "your profile"],
          ["staff profile", "your profile"],
          ["Workspace security", "Account security"],
          ["Mallard Pointe Management", me0.org],
          ["(QS)", `(${initialsOf(me0.name)})`],
          ["Quick messages for property staff", "Quick messages for Staff and Clients"],
          ["Workspace presence and Messenger availability.", "Whether you show as available in Messages and Support."],
          [" edge · Social off", " edge"],
          [" edge · Social on", " edge"],
          ["off · Social off", "off"],
          ["a resident who writes to you", "anyone who writes to you"],
          ["Sidebar Left · Social off", "Sidebar Left"],
          ["Sidebar Right · Social off", "Sidebar Right"],
          ["Sidebar Left · Social on", "Sidebar Left"],
          ["Sidebar Right · Social on", "Sidebar Right"],
          ["EasySpotOps account", "Admin account"],
        ]
      : [];
  // Staff: only the person changes (name, email, role, initials), so the page, the header and the messages all name the same one.
  const STAFF_WORDS = meS
    ? [
        ["QA Staff PM", meS.name],
        ["staff@mail.easyspotops.com", demoEmail(meS.name)],
        ["Property Manager", meS.title],
        ["(QS)", `(${initialsOf(meS.name)})`],
        ["EasySpotOps account", "Staff account"],
        ...mfaNote(),
      ]
    : [];
  const WSET = client ? WORDS : solo ? RWORDS : STAFF_WORDS;
  const cuts = client || solo ? CUTS : []; // the cuts remove Social and Promotions pieces, which only the Client and the Resident lack
  const skin = (s) =>
    typeof s === "string"
      ? cuts.reduce(
          (a, re) => a.replace(re, ""),
          WSET.reduce((a, [x, y]) => (a.includes(x) ? a.split(x).join(y) : a), s),
        )
      : s;
  function skinKids(kids) {
    for (const k of kids) {
      if (k._skin) continue;
      k._skin = 1;
      if (k.kids) skinKids(k.kids);
      if (typeof k.leaf === "function") {
        const l = k.leaf;
        k.leaf = (...a) => skin(l(...a));
      }
      if (typeof k.sum === "function") {
        const s0 = k.sum;
        k.sum = (...a) => skin(s0(...a));
      }
    }
  }
  function reskin() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const v = n.nodeValue;
      if (!v || n.parentElement.closest("script,style,[data-keep]")) continue;
      // The Client's property is named in its own settings; only the company is "AMC LLC" (see WORDS), so the property's name stays as it is there.
      if (v.includes(CW_PROP) && v.trim() !== `${CW_PROP} · Property Manager` && n.parentElement.closest(".srow,.sgh,.phead,.crumbs,.pcrumbs,.pnav,.pselw,.rt,.cw")) continue;
      // "View as" control of Workspace settings: Manager / Staff becomes Admin / Viewer for a Client.
      const out = v.trim() === "QS" ? v.replace("QS", "DW") : v.trim() === "Manager" && n.parentElement.closest(".seg") ? v.replace("Manager", "Admin") : skin(v);
      if (out !== v) n.nodeValue = out;
    }
    // Sidebar, made to read like the Client dashboard's: its overview card, "Workspace Settings", and "Support" at the bottom.
    const sb = document.getElementById("sb");
    if (sb) {
      const cap = [...sb.querySelectorAll(".cap")].find((c) => !c.classList.contains("sbclkc"));
      if (cap && !cap.dataset.skin) {
        cap.dataset.skin = "1";
        const plan = (id) => PLAN_ITEMS.find((i) => i.id === id);
        cap.innerHTML = `<div class="caph"><b>Portfolio Overview</b></div><div class="capr"><span>Properties</span><b>1 / 2</b></div><div class="capr"><span>Parking Spots</span><b>${plan("parking").used} / ${plan("parking").included}</b></div><div class="capr"><span>Residents</span><b>${plan("residents").used} / ${plan("residents").included}</b></div><div class="capr"><span>Staff</span><b>${plan("staff").used} / ${plan("staff").included}</b></div>`;
      }
      // The sidebar's icons come from a table built from the Staff menu; give each Client item the icon the Client dashboard shows
      // (unless the person picked their own under Sidebar icons).
      const CI = {
        Dashboard: "grid",
        Properties: "bld",
        Reports: "chart",
        "People & Access": "people",
        Vehicles: "car",
        Parking: "park",
        Requests: "clip",
        Violations: "warn",
        Messages: "msg",
        Calendar: "cal",
        Activity: "zap",
        "Staff & Access": "user",
        "Billing & Plan": "gauge",
        Recovery: "refresh",
        "Ticket box": "ticket",
        Settings: "gear",
      };
      for (const a of sb.querySelectorAll("a[data-p]")) {
        const key = (S.icoMap || {})[a.dataset.p] || CI[a.dataset.p];
        const ic = a.querySelector(".ic");
        if (key && ic && ic.dataset.k !== key) {
          ic.innerHTML = svg(key);
          ic.dataset.k = key;
        }
      }
      const set = sb.querySelector('a[data-p="Settings"] .lbl');
      if (set && set.textContent !== "Workspace Settings") set.textContent = "Workspace Settings";
    }
    // The breadcrumb names one property; a Client is a company (AMC LLC) that works across all of its properties.
    document.querySelectorAll("#ttl b").forEach((b) => {
      b.textContent = b.textContent.replace("Workspace · Mallard Pointe at Riverbend", "Workspace · AMC LLC");
    });
    // "Company" appears twice on My profile (the management company and the active property): the second one is the property count.
    for (const row of document.querySelectorAll(".prow")) {
      const s = row.querySelector("small");
      if (s && s.textContent === "The active property scope for this workspace.") {
        const b = row.querySelector("b");
        const p = row.querySelector(".pill");
        if (b) b.textContent = "Properties";
        s.textContent = "The properties of this company in this workspace.";
        if (p) p.textContent = `${propCount()} of ${propCount()}`;
      }
    }
    // The count on "My tickets" and the "waiting on your reply" line came from the prototype's own tickets, not the Ticket box: drop them.
    document.querySelectorAll('[data-supv="tickets"] span, [data-supv="tickets"] i').forEach((s) => {
      if (/^\d+$/.test(s.textContent.trim())) s.remove();
    });
    document.querySelectorAll("[data-supnew]").forEach((b) => {
      b.removeAttribute("data-supnew");
      b.dataset.esoTicket = "new";
    });
    document.querySelectorAll('[data-supv="tickets"]').forEach((b) => {
      b.removeAttribute("data-supv");
      b.dataset.esoTicket = "list";
    });
    document.querySelectorAll(".sup-hint").forEach((p) => {
      if (/ticket is waiting/i.test(p.textContent)) p.remove();
    });
    // Summaries built at render time (Personalize > Gestures) still say "Social on/off"; Social is not a Client tool.
    const content = document.getElementById("content");
    if (content) {
      const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) if (/ · Social (on|off)/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/ · Social (on|off)/g, "");
    }
    for (const el of document.querySelectorAll("input[value],textarea")) {
      const v = skin(el.value);
      if (v !== el.value && el.readOnly) el.value = v;
    }
  }

  /* What the person picks in Personalize (sidebar colors, theme, accent) is handed to the real pages of this portal.
     The page writes "ui-prefs:<portal>" (a key without the "eso-" prefix, so the Client copy's storage shim leaves it alone)
     and preview.js reads it on the dashboard, messages and ticket pages. Nothing is written until the person changes something. */
  const portalName = portalKey;
  const publishUI = () => {
    try {
      localStorage.setItem(
        `ui-prefs:${portalName}`,
        JSON.stringify({
          sb: cols().slice(0, 4),
          theme: S.theme,
          accent: S.accent,
          icons: S.icons !== false,
          layout: S.variant || "A",
          scroll: S.scroll || "auto-hide", // Personalize > Sidebar: Rail makes the real sidebar an icon rail; Scrollbar styles the menu's scrollbar
          time: { h24: S.tfmt === "24", tz: S.tzAuto === false && S.tz ? String(S.tz) : "" }, // Date and time: the real pages (sidebar clock, Notifications) show times the way the person chose
          counts: S.showCounts !== false,
          search: S.showSearch !== false,
          cap: S.showCap !== false,
          collapse: S.sbCollapse === true,
          // Accessibility switches reach the real pages too (contrast, reduced motion, larger taps, stronger focus ring).
          a11y: { contrast: !!S.a11yContrast, motion: !!S.a11yMotion, target: !!S.a11yTarget, focus: !!S.a11yFocus },
          // Text, buttons, cards and gestures reach the real pages through look-prefs.js (preview.js applies them).
          text: { font: S.afont, size: Number(S.asize), weight: Number(S.aweight), line: Number(S.lineH), color: S.textColor || "", head: S.headColor || "" },
          buttons: { shape: S.bshape, style: S.bstyle, size: S.bsize },
          cards: { radius: Number(S.cradius || 12), density: S.density },
          gestures: {
            swipe: S.swipe !== false,
            zone: S.swZone,
            sens: S.swSens,
            close: S.swClose !== false,
            fx: S.swFx !== false,
            // The edge the menu opens from (Gestures > Menu edge). The page keeps it as the swipe's direction, `swDir`: swipe right = menu on the left edge.
            // (`S.side` is the desktop sidebar's side, a different setting: sending it left the menu edge choice with no effect on the real pages.)
            side: S.swDir === "left" ? "right" : "left",
          },
          clock: S.sbClock === true,
          favorites: S.showFav !== false,
        }),
      );
    } catch {
      /* storage full or blocked */
    }
    // Inside the Client dashboard frame the real sidebar belongs to the parent page: tell it to look again right away.
    if (embedded) {
      try {
        parent.postMessage({ type: "eso-ui-prefs" }, location.origin);
      } catch {
        /* no parent */
      }
    }
  };
  // Shown inside the portal's own frame (Client: /client/account-settings.html; Staff: /staff/settings/profile, /staff/workspace, /staff/promotions, /staff/support).
  const embedded = document.documentElement.classList.contains("embed") && parent !== window;
  const save0 = w.save;
  w.save = function () {
    const r = save0.apply(this, arguments);
    publishUI();
    if (resident) {
      try {
        setShow(localStorage, me0.id, S.resSocial !== false);
      } catch {
        /* storage blocked */
      }
    } // the Social switch of My property
    return r;
  };
  // The text-size buttons and the custom box write the settings themselves (not through save()), so the real pages never heard of the change until some other
  // control was used. Publish it the moment it is written.
  const fs0 = w.fsLive;
  if (typeof fs0 === "function")
    w.fsLive = function (v, commit) {
      const r = fs0.apply(this, arguments);
      if (commit) publishUI();
      return r;
    };
  if (resident) {
    try {
      S.resSocial = residentState(localStorage, me0.id).show;
    } catch {
      /* first visit */
    }
  }

  /* The Promotions header still told people to turn on the Resident view; that control is gone, so the sentence goes too. */
  const tidy = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode())
      if (n.nodeValue.includes(" Turn on Resident view to see the storefront.")) n.nodeValue = n.nodeValue.replace(" Turn on Resident view to see the storefront.", "");
  };
  if (!client)
    for (const name of ["render"]) {
      const f = w[name];
      w[name] = function () {
        const r = f.apply(this, arguments);
        tidy();
        return r;
      };
    }

  if (embedded) {
    // Light or dark, and the address, follow the frame around this page (the real header has the theme button).
    const pd = () => {
      try {
        return parent.document.documentElement.classList.contains("dark");
      } catch {
        return false;
      }
    };
    w.dark = pd;
    try {
      new MutationObserver(() => w.apply()).observe(parent.document.documentElement, { attributes: true, attributeFilter: ["class"] });
    } catch {
      /* no parent */
    }
    // Client: the frame's address keeps the position after "#/…". Staff: the address is a path, like the web app's (/staff/settings/profile,
    // /staff/workspace…): a position that has a path of its own replaces the whole address, any other stays under the path the frame has.
    addEventListener("hashchange", () => {
      try {
        const own = pathForHash(location.hash);
        // (a Resident's position stays in the address as a path only for the sections that have one; see staff-routes.js)
        if (own) parent.history.replaceState(null, "", own + parent.location.search);
        else if (parent.location.hash !== location.hash) parent.history.replaceState(null, "", parent.location.pathname + parent.location.search + location.hash);
      } catch {
        /* no parent */
      }
    });
    // The prototype has a placeholder "Dashboard" of its own. Inside the frame, "Back" and any link to it mean the real dashboard:
    // go back to the page the person came from when it was a page of this portal (not a settings page), otherwise open the dashboard.
    const leave = () => {
      try {
        const ref = new URL(parent.document.referrer || "about:blank");
        if (client && ref.origin === location.origin && /^\/client\/(?!account-settings)/.test(ref.pathname)) {
          parent.history.back();
          return;
        }
        if (admin && ref.origin === location.origin && /^\/admin\/(?!settings)/.test(ref.pathname)) {
          parent.location.assign(ref.href);
          return;
        }
        if (!client && !solo && ref.origin === location.origin && /^\/staff\/(?!account-settings|settings\/|workspace|promotions|support)/.test(ref.pathname)) {
          parent.location.assign(ref.href);
          return;
        }
        if (resident && ref.origin === location.origin && /^\/resident\/(?!settings)/.test(ref.pathname)) {
          parent.location.assign(ref.href);
          return;
        }
      } catch {
        /* no usable referrer */
      }
      try {
        parent.location.href = `${real.Dashboard}${parent.location.search.replace(/[?&]embed=1/, "")}`;
      } catch {
        /* no parent */
      }
    };
    const check = () => {
      if (location.hash === "#/dashboard") leave();
    };
    addEventListener("hashchange", check);
    // The Support page's own "Back" steps through the prototype's history (or its placeholder dashboard): take it out of the prototype.
    document.addEventListener(
      "click",
      (e) => {
        if (e.target.closest(".suprb")) {
          e.preventDefault();
          e.stopPropagation();
          leave();
        }
      },
      true,
    );
    // "Submit a ticket" and "My tickets" used a ticket list of the prototype's own. The Client has one Ticket box, so they open it
    // (Submit a ticket opens the Create ticket form there). The address keeps ?as=… so the same person stays signed in.
    // The prototype's own handlers listen for data-supnew / data-supv, so these two buttons are re-marked (see reskin) to get past them.
    if (client)
      document.addEventListener("click", (e) => {
        const go = e.target.closest("[data-eso-ticket]");
        if (!go) return;
        e.preventDefault();
        e.stopPropagation();
        try {
          const p = new URLSearchParams(parent.location.search);
          p.delete("embed");
          if (go.dataset.esoTicket === "new") p.set("new", "1");
          else p.delete("new");
          parent.location.href = `/client/tickets.html${p.toString() ? `?${p}` : ""}`;
        } catch {
          /* no parent */
        }
      });
    // Opened with no address: show Workspace (a Resident has none: the list of settings), not the placeholder.
    if (!location.hash || location.hash === "#/dashboard") history.replaceState(null, "", location.pathname + location.search + (solo ? "#/settings" : "#/workspace"));
    // The Back arrow of a settings page returns to the page the person came from (Notifications, Messages…), exactly where they were,
    // for as long as they have not moved inside settings; after that it goes up one level, as the page itself does (see back-target.js).
    let entryHash = location.hash;
    const t0 = Date.now();
    addEventListener("hashchange", () => {
      if (Date.now() - t0 < 500) entryHash = location.hash;
    }); // the page settles its own address first
    document.addEventListener(
      "click",
      (e) => {
        if (!e.target.closest("button.bk2")) return;
        try {
          const how = backTarget({ referrer: parent.document.referrer, origin: location.origin, pathname: parent.location.pathname, portal: portalKey, entryHash, hash: location.hash });
          if (how === "history") {
            e.preventDefault();
            e.stopPropagation();
            parent.history.back();
          }
        } catch {
          /* no parent: the page's own Back runs */
        }
      },
      true,
    );
  }

  if (!client && !solo && !embedded) {
    // Staff: the prototype page has a placeholder "Dashboard" of its own, and the Help Center's "Back" steps through the prototype's pages
    // (Settings, Promotions…). Both mean the real Staff app: go back to the Staff page the person came from (the dashboard, Messages,
    // Social…), otherwise open the Staff dashboard. The address keeps ?as=… so the same person stays signed in.
    const leaveStaff = () => {
      try {
        const ref = new URL(document.referrer || "about:blank");
        if (ref.origin === location.origin && /^\/staff\/(?!account-settings)/.test(ref.pathname)) {
          location.assign(ref.href);
          return;
        }
      } catch {
        /* no usable referrer */
      }
      location.assign(`/staff/dashboard.html${location.search}`);
    };
    addEventListener("hashchange", () => {
      if (location.hash === "#/dashboard") leaveStaff();
    });
    document.addEventListener(
      "click",
      (e) => {
        if (e.target.closest(".suprb")) {
          e.preventDefault();
          e.stopPropagation();
          leaveStaff();
        }
      },
      true,
    );
    if (location.hash === "#/dashboard") leaveStaff();
    // The prototype's own menu lists pages the real Staff app has: they open there, not as placeholders inside this page.
    const real = { Dashboard: "/staff/dashboard.html", Messages: "/staff/messages.html", Social: "/staff/social.html", "Ticket box": "/staff/tickets.html" };
    // On window, in the capture phase: the prototype's own menu handler is registered before this file runs, so this has to come first.
    window.addEventListener(
      "click",
      (e) => {
        const a = e.target.closest && e.target.closest("#sb a[data-p]");
        const dest = a && real[a.dataset.p];
        if (!dest) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        location.assign(`${dest}${location.search}`);
      },
      true,
    );
  }

  if (client) {
    document.documentElement.classList.add("client-portal");
    document.title = "EasySpotOps Client · Account settings prototype";
    installClientWorkspace();
    try {
      user.first = "Dana";
      user.last = "Whitfield";
    } catch {
      /* user is the prototype's profile object */
    }
    // The Client sidebar, the same groups as the Client dashboard. NAV is the prototype's own array, changed in place.
    NAV.splice(
      0,
      NAV.length,
      [null, [["Dashboard", "grid"]]],
      [
        "Portfolio",
        [
          ["Properties", "map"],
          ["Reports", "chart"],
        ],
      ],
      [
        "Operations",
        [
          ["People & Access", "people"],
          ["Vehicles", "car"],
          ["Parking", "park"],
          ["Requests", "clip"],
          ["Violations", "warn"],
        ],
      ],
      [
        "Communication",
        [
          ["Messages", "msg"],
          ["Calendar", "cal"],
          ["Activity", "zap"],
        ],
      ],
      [
        "Management",
        [
          ["Staff & Access", "user"],
          ["Billing & Plan", "gauge"],
        ],
      ],
      ["Data & Recovery", [["Recovery", "refresh"]]],
      ["Services", [["Ticket box", "scroll"]]],
      ["Settings", [["Settings", "gear"]]],
    );
    // Same icons as the Client dashboard's sidebar for Properties and Ticket box.
    try {
      Object.assign(P, {
        bld: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>',
        ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 11v2M13 17v2"/>',
      });
      for (const g of NAV)
        for (const it of g[1]) {
          if (it[0] === "Properties") it[1] = "bld";
          if (it[0] === "Ticket box") it[1] = "ticket";
        }
    } catch {
      /* P and NAV are the prototype's own */
    }
    // The Client dashboard's sidebar has no property switcher and no clock, and always shows the portfolio overview card.
    try {
      Object.assign(DEF, { showProp: false, sbClock: false, capOpen: true });
      if (localStorage.getItem("eso-proto") === null) Object.assign(S, { showProp: false, sbClock: false, capOpen: true });
    } catch {
      /* first visit only */
    }
    // Settings saved before the sidebar was aligned keep the old property switcher and clock once; move them to the new defaults one time.
    try {
      if (localStorage.getItem("ui-sidebar-aligned:client") === null) {
        Object.assign(S, { showProp: false, sbClock: false, capOpen: true });
        localStorage.setItem("ui-sidebar-aligned:client", "1");
        if (localStorage.getItem("eso-proto") !== null) localStorage.setItem("eso-proto", JSON.stringify(S));
      }
    } catch {
      /* storage blocked */
    }
    // The Client keeps the same default look as Staff (the prototype's Navy). Nothing is handed to the real pages until the person changes something.
    // No Social and no Promotions anywhere: a link or a saved address to one goes to Settings.
    const guard = () => {
      if (/^#\/(social|promotions)|^#\/workspace\/(social|promodesign|residentpromos)|^#\/settings\/socialmaster/.test(location.hash)) location.replace("#/settings");
    };
    addEventListener("hashchange", guard, true);
    guard();
    const dd0 = w.dd;
    w.dd = function () {
      dd0.apply(this, arguments);
      document.querySelectorAll('#dd [data-ddgo^="social"]').forEach((e) => e.remove());
      reskin();
    };
    for (const name of ["render", "renderNav"]) {
      const f = w[name];
      w[name] = function () {
        const r = f.apply(this, arguments);
        reskin();
        return r;
      };
    }
  }
  if (solo) {
    document.documentElement.classList.add("resident-portal"); // (the class hides the Profile/Workspace tabs: an Admin has no workspace here either)
    document.title = `EasySpotOps ${admin ? "Admin" : "Resident"} · Settings`;
    try {
      const [first, ...rest] = me0.name.split(" ");
      user.first = first;
      user.last = rest.join(" ");
    } catch {
      /* user is the prototype's profile object */
    }
    // No Workspace, Promotions, Social or Help Center page here: a saved address or a link to one goes to the list of settings.
    const guardR = () => {
      const h = location.hash;
      if ((admin ? /^#\/(workspace|promotions|social|support)|^#\/settings\/socialmaster/ : /^#\/(workspace|promotions|social|support)|^#\/settings\/(availability|socialmaster)/).test(h))
        location.replace("#/settings");
      // A section named without its parent ("#/personalize") is that section of Settings; any other address the page does not have shows the list (it used to
      // draw the prototype's placeholder Dashboard).
      else if (h && h !== "#/" && !/^#\/settings(\/|$)/.test(h))
        location.replace(/^#\/(personalize|security|language|datetime|accessibility|notifications|messaging|general|property|availability)(\/|$)/.test(h) ? `#/settings${h.slice(1)}` : "#/settings");
    };
    addEventListener("hashchange", guardR, true);
    guardR();
    // Staff wording that is left in sections shared with Staff becomes the resident's.
    const reskinR = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const v = n.nodeValue;
        if (!v || n.parentElement.closest("script,style")) continue;
        const out = v.trim() === "QS" ? v.replace("QS", initialsOf(me0.name)) : skin(v);
        if (out !== v) n.nodeValue = out;
      }
    };
    for (const name of ["render", "renderNav"]) {
      const f = w[name];
      if (typeof f === "function")
        w[name] = function () {
          const r = f.apply(this, arguments);
          reskinR();
          return r;
        };
    }
  }
  if (client || solo) {
    // Social pulse is a Staff tool. The line "Menu: … · Social pulse: …" is cut out when the page draws (CUTS), but the page also rewrites that line itself when the
    // person changes the menu edge: it is cut out again each time.
    const hideSocialPulse = () => {
      for (const s of document.querySelectorAll("#gzpair span")) if (/Social pulse/.test(s.textContent)) s.remove();
    };
    new MutationObserver(hideSocialPulse).observe(document.body, { childList: true, subtree: true });
    hideSocialPulse();
  }
  if (meS) {
    // Staff: the prototype's own profile ("QA Staff PM", "QS") is the person the header names, on every draw of the page.
    try {
      const [first, ...rest] = meS.name.split(" ");
      user.first = first;
      user.last = rest.join(" ");
    } catch {
      /* user is the prototype's profile object */
    }
    const reskinS = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const v = n.nodeValue;
        if (!v || n.parentElement.closest("script,style")) continue;
        const out = v.trim() === "QS" ? v.replace("QS", initialsOf(meS.name)) : skin(v);
        if (out !== v) n.nodeValue = out;
      }
    };
    for (const name of ["render", "renderNav"]) {
      const f = w[name];
      if (typeof f === "function")
        w[name] = function () {
          const r = f.apply(this, arguments);
          reskinS();
          return r;
        };
    }
  }
  // The Client's Workspace list was changed after the page drew once, so it draws again; Resident only needs its colors applied.
  try {
    if (client || solo) apply();
    if (client) render();
    if (!client && !solo) render();
  } catch {
    /* the first render happens on hashchange otherwise */
  }
  // Client, Resident and Admin: the page was kept out of sight until its sections were the portal's own (see the first script of the page).
  try {
    if (solo) render();
  } catch {
    /* drawn on the next hashchange */
  }
  document.documentElement.classList.remove("eso-skin-wait");
})();
