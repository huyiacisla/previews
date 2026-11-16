// Resident Promotions page controller. <body data-portal="resident">.
// All markup and Tailwind classes live in partials/promotions-app.html; this file clones templates, fills text and
// toggles hidden / data-* / aria-*. The data comes from promotions/store.js (what Staff published).

import { initials, PORTALS, pickPersona } from "../messaging/personas.js";
import { activeClaims, allRecords, categoriesIn, claim, claimStatus, claimDecidedAt, householdClaims, HOUSEHOLD, KEY, listPromotions, lookupCode, readConfig, residentState, toggleSaved, unitMates } from "./store.js";

const $ = (sel, root = document) => root.querySelector(sel);
const tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);
const clear = (el) => {
  while (el.firstChild) el.removeChild(el.firstChild);
};

const portal = document.body.dataset.portal;
// ?as=res-4 opens the page as Jamie, who lives in Alex's unit (a promotion limited per unit counts them once)
const asParam = new URLSearchParams(location.search).get("as");
const me = (portal === "resident" && HOUSEHOLD.find((p) => p.id === asParam)) || pickPersona(portal, asParam);
const info = PORTALS[portal];
const storage = window.localStorage;
// What Staff can target a promotion at: this resident's building and segments.
const viewer = me.unit ? { block: me.unit.block, segments: me.unit.segments } : undefined;

const ui = { query: "", category: "all", savedOnly: false, openId: null, tags: new Set(), sort: "rec", panel: false };

// The quick filters in the panel next to the search box.
const TAGS = [
  ["new", "New", (p) => p.isNew],
  ["hot", "Hot", (p, hot) => hot.has(p.id)],
  ["limited", "Limited", (p) => p.isLimited],
  ["ending", "Ending soon", (p) => p.daysLeft != null && p.daysLeft <= 7 && !p.full],
  ["free", "Free", (p) => p.isFree],
  ["open", "Still available", (p) => !p.full],
];
// Hot = the top quarter by how many claimed it (and at least 20).
function hotSet(list) {
  const top = [...list].sort((a, b) => b.claimed - a.claimed).slice(0, Math.max(1, Math.ceil(list.length / 4)));
  return new Set(top.filter((p) => p.claimed >= 20).map((p) => p.id));
}
const SORTS = {
  rec: null,
  end: (a, b) => (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9),
  claimed: (a, b) => b.claimed - a.claimed,
  az: (a, b) => a.title.localeCompare(b.title),
};

/* ------------------------------------------------------------------ header */

$("#me-avatar").textContent = initials(me.name);
$("#me-name").textContent = me.name;
$("#me-role").textContent = me.title;


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
// The card footer, bottom right: "Exp: Nov 3, 2026" (a deal with no end date says so)
const expText = (p) => {
  const d = p.end || p.endShow;
  return d ? `Exp: ${fmtDate(d)}` : "No expiry";
};
const initialsOf = (t) =>
  String(t || "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase() || "?";

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

// The filter button, its count and the panel (chips for New, Hot, Limited, Ending soon, Free, Still available).
function paintRewardsBadge() {
  const mine = residentState(storage, me.id);
  const n = Object.keys(mine.claims).filter((id) => mine.claims[id] && mine.claims[id].code && activeClaims(storage, me.id, id).active > 0).length;
  const c = $("#rewards-count");
  c.hidden = n === 0;
  c.textContent = String(n);
}

function paintFilterPanel(counts) {
  const n = ui.tags.size + (ui.sort !== "rec" ? 1 : 0);
  const btn = $("#btn-filter");
  btn.setAttribute("aria-expanded", String(ui.panel));
  btn.setAttribute("aria-label", n ? `Filters, ${n} active` : "Filters");
  const badgeEl = $("#filter-count");
  badgeEl.hidden = !n;
  badgeEl.textContent = String(n);
  $("#filter-panel").hidden = !ui.panel;
  $("#sort").value = ui.sort;
  $("#filter-clear").hidden = !n;
  const box = $("#tag-filters");
  clear(box);
  for (const [k, label] of TAGS) {
    const b = tpl("t-filter");
    $("[data-label]", b).textContent = label;
    $("[data-count]", b).textContent = String(counts[k]);
    b.setAttribute("aria-pressed", String(ui.tags.has(k)));
    b.addEventListener("click", () => {
      if (ui.tags.has(k)) ui.tags.delete(k);
      else ui.tags.add(k);
      render();
    });
    box.appendChild(b);
  }
}

function render() {
  const cfg = readConfig(storage);
  const mine = residentState(storage, me.id);
  const all = listPromotions(storage, { viewer });
  const cats = categoriesIn(storage, undefined, viewer);
  if (ui.category !== "all" && !cats.some((c) => c.key === ui.category)) ui.category = "all";
  if (!cfg.save) ui.savedOnly = false;
  let list = listPromotions(storage, { query: ui.query, category: ui.category, viewer });
  if (ui.savedOnly) list = list.filter((p) => mine.saved.has(p.id));
  const hot = hotSet(all);
  const counts = Object.fromEntries(TAGS.map(([k, , test]) => [k, list.filter((p) => test(p, hot)).length]));
  for (const k of ui.tags) {
    const test = TAGS.find((t) => t[0] === k)[2];
    list = list.filter((p) => test(p, hot));
  }
  if (SORTS[ui.sort]) list = [...list].sort(SORTS[ui.sort]);
  paintFilterPanel(counts);
  paintRewardsBadge();

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
  for (const p of list) grid.appendChild(card(p, mine, cfg, hot));
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

// How many are left (only for a promotion with a total limit): words and a bar, never colour alone. The classes live in the t-stock template.
function stockEl(p) {
  if (!(p.total > 0)) return null;
  const left = p.left ?? Math.max(0, p.total - p.claimed);
  const pct = Math.max(0, Math.min(100, Math.round((left / p.total) * 100)));
  const low = left > 0 && (pct <= 10 || left <= 5);
  const el = tpl("t-stock");
  el.dataset.tone = left === 0 ? "out" : low ? "low" : "ok";
  $("[data-text]", el).textContent = left === 0 ? "Sold out" : low ? `Only ${left} left` : `${left} of ${p.total} left`;
  $("[data-fill]", el).style.width = `${pct}%`;
  return el;
}

// The one tag a card carries on its cover, most important first.
function tagOf(p, hot) {
  if (p.full) return ["Sold out", "danger"];
  if (p.daysLeft != null && p.daysLeft <= 7) return ["Ending soon", "warning"];
  if (hot.has(p.id)) return ["Hot", "danger"];
  if (p.isLimited) return ["Limited", "info"];
  if (p.isNew) return ["New", "success"];
  return null;
}

// "2d 5h left", then "5h 12m left", then "12m 30s left" in the last hour. At zero the list is drawn again (the promotion is gone).
function leftText(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m ${s % 60}s left`;
}
function paintCount(el) {
  const ms = Number(el.dataset.ends) - Date.now();
  if (ms <= 0) {
    el.hidden = true;
    return true;
  }
  $("[data-count-text]", el).textContent = leftText(ms);
  return false;
}
let counting = 0;
function startTicker() {
  if (counting) return;
  counting = setInterval(() => {
    let done = false;
    for (const el of document.querySelectorAll("[data-count]:not([hidden])")) done = paintCount(el) || done;
    if (done) render();
  }, 1000);
}

function card(p, mine, cfg, hot = new Set()) {
  const li = tpl("t-card");
  li.dataset.promo = p.id;
  setCover($("[data-cover]", li), $("[data-nocover]", li), p.cover, p.visual);
  $("[data-partner]", li).textContent = p.partner && p.partner !== p.title ? p.partner : "";
  const av = $("[data-avatar]", li);
  if (p.partnerLogo) {
    const im = Object.assign(document.createElement("img"), { src: p.partnerLogo, alt: "", className: "size-full bg-white object-contain p-1" });
    av.appendChild(im);
    av.classList.add("bg-white");
  } else {
    av.textContent = initialsOf(p.partner || p.title);
  }
  const open = $("[data-open]", li);
  open.textContent = p.title;
  open.addEventListener("click", () => openDialog(p.id));
  $("[data-stretch]", li).addEventListener("click", () => openDialog(p.id, open));
  $("[data-summary]", li).textContent = p.summary;
  const badges = $("[data-badges]", li);
  badges.appendChild(badge(p.offer, "info"));
  badges.appendChild(badge(p.category.name));
  if (p.audience) badges.appendChild(badge(p.audience, "warning"));
  if (p.full) badges.appendChild(badge("Sold out", "danger"));
  const stock = stockEl(p);
  if (stock) $("[data-stock]", li).appendChild(stock);
  const cnt = $("[data-count]", li);
  if (p.endsAt && p.daysLeft != null && p.daysLeft <= 7 && !p.full) {
    cnt.dataset.ends = String(p.endsAt);
    cnt.hidden = false;
    paintCount(cnt);
    startTicker();
  }
  const tag = tagOf(p, hot);
  const tagEl = $("[data-tag]", li);
  tagEl.hidden = !tag;
  if (tag) {
    tagEl.textContent = tag[0];
    tagEl.dataset.tone = tag[1];
  }
  $("[data-coverwrap]", li).dataset.soldout = String(p.full);
  const mateOnCard = p.scope === "unit" && !(mine.claims[p.id] && activeClaims(storage, me.id, p.id).active > 0) ? householdClaims(storage, me.id, p.id)[0] : null;
  if (mateOnCard) badges.appendChild(badge("Claimed by your unit", "success"));
  if (mine.claims[p.id]) {
    const own = activeClaims(storage, me.id, p.id);
    badges.appendChild(own.active > 0 ? badge("Claimed", "success") : badge(own.locked ? "Closed" : "Not approved", "warning"));
  }
  $("[data-end]", li).textContent = expText(p);
  $("[data-foot-left]", li).textContent = p.claimed > 0 ? `${p.claimed} claimed` : "";
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
  const stockBox = $("#dlg-stock");
  clear(stockBox);
  const stockLine = stockEl(p);
  if (stockLine) stockBox.appendChild(stockLine);
  $("#dlg-desc").textContent = p.description || p.summary;
  const fine = [endText(p), p.perResident > 1 ? `Up to ${p.perResident} claims per resident.` : "", p.terms && `Terms: ${p.terms}`].filter(Boolean).join(" · ");
  $("#dlg-fine").textContent = fine;

  const claimed = mine.claims[p.id];
  const ownNow = activeClaims(storage, me.id, p.id);
  // a promotion limited per unit: what someone who lives with you claimed is the unit's claim
  const mate = p.scope === "unit" && !(claimed && ownNow.active > 0) ? householdClaims(storage, me.id, p.id)[0] : null;
  const shown = mate ? { code: mate.code } : claimed;
  const box = $("#dlg-claim");
  box.hidden = !(shown && shown.code);
  if (!box.hidden) {
    $("#dlg-claim-label").textContent = mate ? `Your unit's code, claimed by ${mate.name}` : p.method === "qr" ? "Show this code at the partner" : "Your code";
    $("#dlg-code").textContent = shown.code;
    // what the property staff decided about this claim (words, not colour alone)
    const cs = mate ? null : claimStatus(storage, me.id, p.id);
    const say = {
      pending: "Waiting for the property team to confirm.",
      verified: "Confirmed by the property team.",
      redeemed: "Used. Thank you.",
      rejected: `Not approved by the property team.${cs && cs.reason ? ` ${cs.reason}` : ""}`,
    };
    const line = $("#dlg-claim-status");
    line.textContent = mate ? `One claim per unit: ${mate.name} already claimed this${mate.at ? ` on ${new Date(mate.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}.` : cs ? say[cs.st] : "";
    line.dataset.tone = cs && (cs.st === "verified" || cs.st === "redeemed") ? "ok" : cs && cs.st === "rejected" ? "no" : "";
  }
  const btn = $("#dlg-claim-btn");
  // claims Staff rejected do not count: the resident can claim again, unless Staff locked it
  const own = activeClaims(storage, me.id, p.id);
  const done = claimed && own.active >= p.perResident;
  btn.disabled = p.full || own.locked || !!mate || (done && p.method !== "link");
  $("#dlg-claim-text").textContent = p.full
    ? "Sold out"
    : mate
      ? "Claimed by your unit"
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

// The three-dot menu: Saved promotions and Filters.
const moreBtn = $("#btn-more");
const moreMenu = $("#more-menu");
function closeMore(focusBtn = false) {
  if (moreMenu.hidden) return;
  moreMenu.hidden = true;
  moreBtn.setAttribute("aria-expanded", "false");
  if (focusBtn) moreBtn.focus();
}
moreBtn.addEventListener("click", () => {
  const open = moreMenu.hidden;
  moreMenu.hidden = !open;
  moreBtn.setAttribute("aria-expanded", String(open));
  if (open) $("[role=menuitem]", moreMenu).focus();
});
moreMenu.addEventListener("click", (e) => {
  const b = e.target.closest("[data-more]");
  if (!b) return;
  if (b.dataset.more === "saved") {
    ui.savedOnly = true;
    ui.category = "all";
  }
  if (b.dataset.more === "filters") ui.panel = true;
  closeMore();
  render();
  if (b.dataset.more === "filters") $("#tag-filters button")?.focus();
});
moreMenu.addEventListener("keydown", (e) => {
  const items = [...moreMenu.querySelectorAll("[role=menuitem]")];
  const i = items.indexOf(document.activeElement);
  if (e.key === "ArrowDown") items[(i + 1) % items.length].focus();
  else if (e.key === "ArrowUp") items[(i - 1 + items.length) % items.length].focus();
  else if (e.key === "Escape") closeMore(true);
  else return;
  e.preventDefault();
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("#btn-more, #more-menu")) closeMore();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !moreMenu.hidden) closeMore(true);
});

// ---- Redeem a code and My rewards ----
const rdDlg = $("#dlg-redeem");
const rwDlg = $("#dlg-rewards");
for (const d of [rdDlg, rwDlg]) {
  $("[data-close]", d).addEventListener("click", () => d.close());
  d.addEventListener("click", (e) => {
    if (e.target === d) d.close(); // the backdrop
  });
}
const longDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function redeemOut(title, text, openId) {
  const out = $("#rd-out");
  clear(out);
  const el = tpl("t-redeem-hit");
  $("[data-title]", el).textContent = title;
  $("[data-text]", el).textContent = text;
  const open = $("[data-open]", el);
  open.hidden = !openId;
  open.addEventListener("click", () => {
    rdDlg.close();
    openDialog(openId);
  });
  out.appendChild(el);
}

function checkCode(raw) {
  const code = String(raw).trim().toUpperCase();
  if (!code) return redeemOut("Type a code first", "Codes are letters and numbers, like VALET20.", null);
  // a code the resident already holds (a unique code from a claim)
  const mine = residentState(storage, me.id);
  const own = Object.entries(mine.claims).find(([, c]) => String(c.code || "").toUpperCase() === code);
  if (own) {
    const rec = allRecords(storage).find((r) => String(r.id) === own[0]);
    const cs = claimStatus(storage, me.id, own[0]);
    const say = { pending: "Waiting for the property team.", verified: "Confirmed by the property team.", redeemed: "Already used.", rejected: "Not approved." };
    return redeemOut("This is your own code", `${rec ? rec.x.title : "A promotion"}. ${cs ? say[cs.st] : ""} It is in My rewards.`, rec ? own[0] : null);
  }
  const r = lookupCode(storage, code, { viewer });
  const t = r.promo ? r.promo.title : "";
  if (r.state === "none") return redeemOut("We could not find that code", "Check the spelling and try again, or ask the partner for the code.", null);
  if (r.state === "ended") return redeemOut(t, "This promotion has ended.", null);
  if (r.state === "soon") return redeemOut(t, "This promotion has not started yet.", null);
  if (r.state === "audience") return redeemOut(t, "This promotion is not open to your unit.", null);
  if (r.state === "full") return redeemOut(t, "Sold out: every offer has been claimed.", r.promo.id);
  return redeemOut(t, "Valid. Open the promotion to claim your offer.", r.promo.id);
}

$("#btn-redeem").addEventListener("click", () => {
  clear($("#rd-out"));
  $("#rd-input").value = "";
  rdDlg.showModal();
  $("#rd-input").focus();
});
$("#rd-form").addEventListener("submit", (e) => {
  e.preventDefault();
  checkCode($("#rd-input").value);
});

const STATUS = {
  pending: ["Waiting", "wait", "Waiting for the property team to confirm."],
  verified: ["Confirmed", "ok", "Confirmed by the property team."],
  redeemed: ["Used", "ok", "Used. Thank you."],
  rejected: ["Not approved", "no", ""],
};
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
function paintRewards() {
  const mine = residentState(storage, me.id);
  const list = $("#rw-list");
  clear(list);
  // this resident's claims, and (for a promotion limited per unit) what the people of the unit claimed
  const rows = Object.keys(mine.claims)
    .filter((id) => mine.claims[id] && mine.claims[id].code)
    .map((id) => ({ id, code: mine.claims[id].code, at: mine.claims[id].at, by: "", cs: claimStatus(storage, me.id, id), decided: claimDecidedAt(storage, me.id, id) }));
  for (const m of unitMates(me.id)) {
    const theirs = residentState(storage, m.id).claims;
    for (const id of Object.keys(theirs)) {
      const rec = allRecords(storage).find((r) => String(r.id) === id);
      if (!rec || rec.x.limS !== "unit" || rows.some((r) => r.id === id) || activeClaims(storage, m.id, id).active < 1) continue;
      rows.push({ id, code: theirs[id].code, at: theirs[id].at, by: m.name, cs: claimStatus(storage, m.id, id), decided: claimDecidedAt(storage, m.id, id) });
    }
  }
  rows.sort((x, y) => String(y.at || "").localeCompare(String(x.at || "")));
  $("#rw-empty").hidden = rows.length > 0;
  for (const r of rows) {
    const rec = allRecords(storage).find((x) => String(x.id) === r.id);
    const st = STATUS[r.cs ? r.cs.st : "pending"];
    const li = tpl("t-reward");
    $("[data-title]", li).textContent = rec ? rec.x.title : "Promotion";
    const badge = $("[data-status]", li);
    badge.textContent = st[0];
    badge.dataset.tone = st[1];
    // the history of this claim: who claimed, when, and when Staff decided
    const note = [r.by ? `Claimed by ${r.by} (your unit)` : "Claimed by you", r.at ? when(r.at) : ""].filter(Boolean).join(" · ");
    const decision = r.cs && r.cs.st === "rejected" && r.cs.reason ? r.cs.reason : st[2];
    $("[data-note]", li).textContent = [note, r.decided && r.cs && r.cs.st !== "pending" ? `${st[0]} ${when(r.decided)}` : "", decision].filter(Boolean).join(". ");
    $("[data-code]", li).textContent = r.code;
    $("[data-copy]", li).addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(r.code);
        toast("Code copied");
      } catch {
        toast("Could not copy. Select the code and copy it.");
      }
    });
    const view = $("[data-view]", li);
    view.hidden = !rec || !find(r.id);
    view.addEventListener("click", () => {
      rwDlg.close();
      openDialog(r.id);
    });
    list.appendChild(li);
  }
  const n = rows.filter((r) => !r.by && activeClaims(storage, me.id, r.id).active > 0).length;
  const c = $("#rewards-count");
  c.hidden = n === 0;
  c.textContent = String(n);
}
$("#btn-rewards").addEventListener("click", () => {
  paintRewards();
  rwDlg.showModal();
  $("#rw-title").focus({ preventScroll: true });
});

$("#btn-filter").addEventListener("click", () => {
  ui.panel = !ui.panel;
  render();
});
$("#sort").addEventListener("change", (e) => {
  ui.sort = e.target.value;
  render();
});
$("#filter-clear").addEventListener("click", () => {
  ui.tags.clear();
  ui.sort = "rec";
  render();
});
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
