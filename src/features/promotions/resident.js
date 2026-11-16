// Resident Promotions page controller. <body data-portal="resident">.
// All markup and Tailwind classes live in partials/promotions-app.html; this file clones templates, fills text and
// toggles hidden / data-* / aria-*. The data comes from promotions/store.js (what Staff published).

import { exitTarget } from "../../shared/js/exit-target.js";
import { initials, PORTALS, pickPersona } from "../messaging/personas.js";
import { activeClaims, categoriesIn, claim, claimStatus, KEY, listPromotions, readConfig, residentState, toggleSaved } from "./store.js";

const $ = (sel, root = document) => root.querySelector(sel);
const tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);
const clear = (el) => {
  while (el.firstChild) el.removeChild(el.firstChild);
};

const portal = document.body.dataset.portal;
const me = pickPersona(portal, new URLSearchParams(location.search).get("as"));
const info = PORTALS[portal];
const storage = window.localStorage;
// What Staff can target a promotion at: this resident's building and segments.
const viewer = me.unit ? { block: me.unit.block, segments: me.unit.segments } : undefined;

const ui = { query: "", category: "all", savedOnly: false, openId: null };

/* ------------------------------------------------------------------ header */

$("#portal-label").textContent = `· ${info.label}`;
$("#me-avatar").textContent = initials(me.name);
$("#me-name").textContent = me.name;
$("#me-role").textContent = me.title;

// Exit leaves the page (see exit-target.js); the page has no inner steps, so there is no Back.
$("#btn-exit").href = exitTarget("/promotions.html", info.home);

function toast(text) {
  const el = tpl("t-toast");
  $("[data-text]", el).textContent = text;
  const box = $("#toasts");
  box.appendChild(el);
  // The box is a popover so a toast also shows above the open details dialog (both live in the top layer).
  try {
    if (box.matches(":popover-open")) box.hidePopover();
    box.showPopover();
  } catch {
    /* older browsers: the fixed box still shows */
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

const fmtDate = (iso) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
const endText = (p) => (p.end ? `Ends ${fmtDate(p.end)}` : "");

function setCover(img, none, cover, visual) {
  if (cover) {
    img.src = cover.src;
    img.alt = cover.alt;
    img.style.objectPosition = `${cover.x}% ${cover.y}%`;
    img.style.transform = `scale(${cover.zoom})`;
  }
  img.hidden = !cover;
  none.hidden = !!cover;
  // No picture: a sample deal shows its colour and symbol, any other the tag icon (the dialog's placeholder is reused, so it is put back each time).
  if (none._icon === undefined) none._icon = none.innerHTML;
  if (!cover && visual) {
    none.style.background = visual.gradient;
    const sym = document.createElement("span");
    sym.setAttribute("aria-hidden", "true");
    sym.style.fontSize = "2.25rem";
    sym.textContent = visual.emoji;
    none.replaceChildren(sym);
  } else {
    none.style.background = "";
    if (none.innerHTML !== none._icon) none.innerHTML = none._icon;
  }
}

/* --------------------------------------------------------------------- list */

function render() {
  const cfg = readConfig(storage);
  const mine = residentState(storage, me.id);
  const all = listPromotions(storage, { viewer });
  const cats = categoriesIn(storage, undefined, viewer);
  if (ui.category !== "all" && !cats.some((c) => c.key === ui.category)) ui.category = "all";
  if (!cfg.save) ui.savedOnly = false;
  let list = listPromotions(storage, { query: ui.query, category: ui.category, viewer });
  if (ui.savedOnly) list = list.filter((p) => mine.saved.has(p.id));

  // filter row: All, one per category, Saved
  const filters = $("#filters");
  clear(filters);
  const chip = (label, count, pressed, onClick) => {
    const b = tpl("t-filter");
    $("[data-label]", b).textContent = label;
    $("[data-count]", b).textContent = count == null ? "" : String(count);
    b.setAttribute("aria-pressed", String(pressed));
    b.addEventListener("click", onClick);
    filters.appendChild(b);
  };
  if (all.length) {
    chip("All", all.length, ui.category === "all" && !ui.savedOnly, () => {
      ui.category = "all";
      ui.savedOnly = false;
      render();
    });
    for (const c of cats)
      chip(c.name, c.count, ui.category === c.key && !ui.savedOnly, () => {
        ui.category = c.key;
        ui.savedOnly = false;
        render();
      });
    if (cfg.save)
      chip("Saved", all.filter((p) => mine.saved.has(p.id)).length, ui.savedOnly, () => {
        ui.savedOnly = !ui.savedOnly;
        ui.category = "all";
        render();
      });
  }

  const grid = $("#grid");
  clear(grid);
  for (const p of list) grid.appendChild(card(p, mine, cfg));
  $("#count").textContent = all.length ? `${list.length} of ${all.length} ${all.length === 1 ? "promotion" : "promotions"}` : "";

  const empty = $("#empty");
  empty.hidden = list.length > 0;
  clear(empty);
  if (!list.length) {
    const e = tpl("t-empty");
    const [title, text] = emptyText(cfg, all.length);
    $("[data-title]", e).textContent = title;
    $("[data-text]", e).textContent = text;
    empty.appendChild(e);
  }
  if (ui.openId) refreshDialog();
}

function emptyText(cfg, total) {
  if (!cfg.show) return ["Promotions are off", "The property team has turned promotions off for now."];
  if (!total) return ["No promotions yet", "Offers from the property team and its partners will show up here as soon as they are published."];
  if (ui.savedOnly) return ["Nothing saved yet", "Star a promotion to keep it here."];
  return ["No matches", "Try another word or pick a different category."];
}

function card(p, mine, cfg) {
  const li = tpl("t-card");
  li.dataset.promo = p.id;
  setCover($("[data-cover]", li), $("[data-nocover]", li), p.cover, p.visual);
  $("[data-partner]", li).textContent = p.partner;
  const open = $("[data-open]", li);
  open.textContent = p.title;
  open.addEventListener("click", () => openDialog(p.id));
  $("[data-stretch]", li).addEventListener("click", () => openDialog(p.id, open));
  $("[data-summary]", li).textContent = p.summary;
  const badges = $("[data-badges]", li);
  badges.appendChild(badge(p.offer, "info"));
  badges.appendChild(badge(p.category.name));
  if (p.audience) badges.appendChild(badge(p.audience, "warning"));
  if (p.full) badges.appendChild(badge("Fully claimed", "danger"));
  if (mine.claims[p.id]) {
    const own = activeClaims(storage, me.id, p.id);
    badges.appendChild(own.active > 0 ? badge("Claimed", "success") : badge(own.locked ? "Closed" : "Not approved", "warning"));
  }
  $("[data-end]", li).textContent = endText(p);
  const save = $("[data-save]", li);
  save.hidden = !cfg.save;
  save.dataset.id = p.id;
  paintSave(save, mine.saved.has(p.id), p.title);
  save.addEventListener("click", () => onSave(p));
  return li;
}

function paintSave(btn, on, title) {
  btn.setAttribute("aria-pressed", String(on));
  btn.setAttribute("aria-label", `${on ? "Remove from saved" : "Save"}: ${title}`);
}

function onSave(p) {
  const on = toggleSaved(storage, me.id, p.id);
  if (on === null) return toast("Saving is turned off.");
  toast(on ? "Saved" : "Removed from saved");
  render();
  // render() rebuilt the cards; put keyboard focus back on the star that was used (unless the dialog has focus).
  if (!dlg.open) for (const b of document.querySelectorAll("[data-save]")) if (b.dataset.id === p.id) b.focus({ preventScroll: true });
}

/* ------------------------------------------------------------------- details */

const dlg = $("#dlg");
let opener = null;

function find(id) {
  return listPromotions(storage, { viewer }).find((p) => p.id === id);
}

function openDialog(id, from) {
  const p = find(id);
  if (!p) return;
  opener = from || document.activeElement; // focus returns here when the details close
  ui.openId = id;
  ui.lastId = id;
  $("#dlg-error").textContent = "";
  refreshDialog();
  if (!dlg.open) dlg.showModal();
  $("#dlg-title").focus({ preventScroll: true });
}

function refreshDialog() {
  const p = find(ui.openId);
  if (!p) {
    closeDialog(true);
    toast("That promotion is no longer available.");
    return;
  }
  const cfg = readConfig(storage);
  const mine = residentState(storage, me.id);
  setCover($("#dlg-cover"), $("#dlg-nocover"), p.cover, p.visual);
  const partner = $("#dlg-partner");
  clear(partner);
  if (p.partnerLogo) {
    const im = Object.assign(document.createElement("img"), { src: p.partnerLogo, alt: "" });
    im.className = "size-6 rounded-md object-cover";
    partner.appendChild(im);
  }
  if (p.partner) partner.appendChild(document.createTextNode(p.partner));
  $("#dlg-title").textContent = p.title;
  const badges = $("#dlg-badges");
  clear(badges);
  badges.appendChild(badge(p.offer, "info"));
  badges.appendChild(badge(p.category.name));
  if (p.audience) badges.appendChild(badge(p.audience, "warning"));
  $("#dlg-desc").textContent = p.description || p.summary;
  const fine = [endText(p), p.perResident > 1 ? `Up to ${p.perResident} claims per resident.` : "", p.terms && `Terms: ${p.terms}`].filter(Boolean).join(" · ");
  $("#dlg-fine").textContent = fine;

  const claimed = mine.claims[p.id];
  const box = $("#dlg-claim");
  box.hidden = !(claimed && claimed.code);
  if (!box.hidden) {
    $("#dlg-claim-label").textContent = p.method === "qr" ? "Show this code at the partner" : "Your code";
    $("#dlg-code").textContent = claimed.code;
    // what the property staff decided about this claim (words, not colour alone)
    const cs = claimStatus(storage, me.id, p.id);
    const say = {
      pending: "Waiting for the property team to confirm.",
      verified: "Confirmed by the property team.",
      redeemed: "Used. Thank you.",
      rejected: `Not approved by the property team.${cs && cs.reason ? ` ${cs.reason}` : ""}`,
    };
    const line = $("#dlg-claim-status");
    line.textContent = cs ? say[cs.st] : "";
    line.dataset.tone = cs && (cs.st === "verified" || cs.st === "redeemed") ? "ok" : cs && cs.st === "rejected" ? "no" : "";
  }
  const btn = $("#dlg-claim-btn");
  // claims Staff rejected do not count: the resident can claim again, unless Staff locked it
  const own = activeClaims(storage, me.id, p.id);
  const done = claimed && own.active >= p.perResident;
  btn.disabled = p.full || own.locked || (done && p.method !== "link");
  $("#dlg-claim-text").textContent = p.full
    ? "Fully claimed"
    : own.locked
      ? "Closed"
      : p.method === "link"
        ? "Get offer"
        : done
          ? "Claimed"
          : own.rejected
            ? "Claim again"
            : p.method === "unique"
              ? "Get my code"
              : "Claim";
  $("#dlg-claim-ext").hidden = p.method !== "link" || p.full;
  const save = $("#dlg-save");
  save.hidden = !cfg.save;
  const on = mine.saved.has(p.id);
  save.setAttribute("aria-pressed", String(on));
  $("#dlg-save-text").textContent = on ? "Saved" : "Save";
}

// The cards are rebuilt after a save or a claim, so the button that opened the details may be gone: find its replacement.
function returnFocus() {
  const target = opener && opener.isConnected ? opener : document.querySelector(`#grid li[data-promo="${ui.lastId}"] [data-open]`);
  if (target) target.focus({ preventScroll: true });
}

function closeDialog(silent) {
  ui.openId = null;
  if (dlg.open) dlg.close();
  if (!silent) returnFocus();
}

$("#dlg-close").addEventListener("click", () => closeDialog());
dlg.addEventListener("click", (e) => {
  if (e.target === dlg) closeDialog();
}); // the backdrop
dlg.addEventListener("close", () => {
  ui.openId = null;
  returnFocus();
});

$("#dlg-claim-btn").addEventListener("click", () => {
  const p = find(ui.openId);
  if (!p) return;
  const r = claim(storage, me.id, p);
  $("#dlg-error").textContent = r.ok ? "" : r.reason;
  if (!r.ok) return;
  if (p.method === "link" && r.link) window.open(r.link, "_blank", "noopener,noreferrer");
  else toast(r.again ? "You already claimed this" : "Claimed. Your code is below.");
  render();
});

$("#dlg-save").addEventListener("click", () => {
  const p = find(ui.openId);
  if (p) onSave(p);
});

$("#dlg-copy").addEventListener("click", async () => {
  const text = $("#dlg-code").textContent;
  try {
    await navigator.clipboard.writeText(text);
    toast("Code copied");
  } catch {
    toast("Select the code and copy it.");
  }
});

/* ---------------------------------------------------------------- search + live */

let timer = 0;
$("#search").addEventListener("input", (e) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    ui.query = e.target.value;
    render();
  }, 120);
});

// A promotion published, edited or switched off in the Staff tab arrives here.
addEventListener("storage", (e) => {
  // (STATUS_KEY: what Staff turned on or off on a sample deal)
  if (e.key === KEY.claimState) {
    render();
    return;
  } // Staff decided a claim: the open details say so
  if (
    !e.key ||
    e.key === KEY.published ||
    e.key === KEY.cats ||
    e.key === KEY.settings ||
    e.key === KEY.mine(me.id) ||
    e.key === globalThis.PM_CATALOG.STATUS_KEY ||
    e.key === globalThis.PM_CATALOG.EDITS_KEY
  )
    render();
});
// Promotions start and end by date: look again when the tab comes back, and when the day turns while the page stays open.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) render();
});
function renderAtMidnight() {
  const n = new Date();
  const next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 5);
  // a timer longer than ~24 days overflows, and one day never does
  setTimeout(() => {
    render();
    renderAtMidnight();
  }, next - n);
}
renderAtMidnight();

render();
