// Usage > Capacity (Client): add capacity to the plan. Each resource has a stepper; the summary is the calculator; confirming adds it to Billing & Plan.
// Markup is in client/usage-content.html (templates); prices and rules are in capacity/store.js. Demo only: nothing is charged;
// what is "bought" is kept in this browser (localStorage "eso-capacity:client"), and Documents and the sidebar's Capacity summary read it.
import {
  ITEMS, PROPERTY, storageUsedGb, emptyPurchased, normalizePurchased, clampQty, limitFor, propertiesCount, buildSummary, applyCart, validateProperty, perUnit, money, signed, gbLabel, resolveBudget,
} from '../capacity/store.js';

const $ = (s, r = document) => r.querySelector(s);
const tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);
import { ensurePropertyFeed } from '../social/seed.js';
import { portfolio, removeFromPortfolio } from '../../shared/js/property-lifecycle.js';
import { trapTab, restoreFocus } from '../../shared/js/dialog-trap.js';

const KEY = 'eso-capacity:client';
const BUDGET_KEY = 'eso-capacity-budget:client';
const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); if (v !== null && v !== undefined) return v; } catch { /* first visit, or storage blocked */ } return d; };
const write = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked: it lasts until the page closes */ } };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

let purchased = normalizePurchased(read(KEY, null));
let cart = emptyPurchased();
// ONE budget: the monthly add-on budget of Workspace settings > Invoices and payment and of this page are the same value, kept under PREFS_KEY.
// (An older separate amount typed on this page, BUDGET_KEY, is dropped so the two can never disagree.)
const PREFS_KEY = 'capacity-prefs:client';
write(BUDGET_KEY, null);
let budget = resolveBudget(null, read(PREFS_KEY, null)); // a number, or null for no cap
const saveBudget = (b) => { const prefs = read(PREFS_KEY, null); write(PREFS_KEY, { ...(prefs && typeof prefs === 'object' ? prefs : {}), budget: b }); };

// ---- toasts (one at a time) ----
let toastTimer;
const toast = (text) => {
  const t = document.createElement('p');
  t.className = 'pointer-events-auto rounded-md bg-surface-inverted px-step-md py-step-sm text-sm text-surface-inverted-foreground shadow-lift-md';
  t.textContent = text;
  $('#toasts').replaceChildren(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2600);
};

// ---- the resources ----
const rows = new Map();
for (const it of ITEMS) {
  const li = tpl('t-item');
  $('[data-f=icon]', li).setAttribute('href', { parking: '#i-car', residents: '#i-users', staff: '#i-staff', storage: '#i-drive' }[it.id]);
  $('[data-f=name]', li).textContent = it.name;
  $('[data-f=price]', li).textContent = `+${money(it.price)}/mo ${it.per}`;
  $('[data-f=group]', li).setAttribute('aria-label', `${it.name}: how many to add`);
  $('[data-act=minus]', li).setAttribute('aria-label', `Add fewer ${it.name.toLowerCase()}`);
  $('[data-act=plus]', li).setAttribute('aria-label', `Add more ${it.name.toLowerCase()}`);
  $('[data-f=qty]', li).setAttribute('aria-label', `${it.name} to add`);
  li.dataset.id = it.id;
  rows.set(it.id, li);
  $('#items').append(li);
}

const amount = (it, n) => (it.id === 'storage' ? gbLabel(n) : String(n));
function paintItem(it) {
  const li = rows.get(it.id);
  const q = cart[it.id];
  const limit = limitFor(it.id, purchased);
  const extra = q * perUnit(it.id);
  const whole = limit + extra || 1;
  const used = it.id === 'storage' ? storageUsedGb(read('eso-docs:client', [])) : it.used; // storage in use counts the files kept in Documents
  $('[data-f=using]', li).textContent = `Using ${amount(it, used)} of ${amount(it, limit)}${purchased[it.id] ? ` · ${amount(it, purchased[it.id] * perUnit(it.id))} added by you` : ''}`;
  $('[data-seg=used]', li).style.width = `${Math.min(100, (used / whole) * 100)}%`;
  $('[data-seg=add]', li).style.width = `${(extra / whole) * 100}%`;
  const bar = $('[data-f=bar]', li);
  bar.setAttribute('aria-label', `${it.name}: using ${amount(it, used)} of ${amount(it, limit)}${extra ? `, ${amount(it, limit + extra)} after this change` : ''}`);
  $('[data-f=after]', li).textContent = q ? `${amount(it, limit + extra)} after this change` : it.hint;
  const qty = $('[data-f=qty]', li);
  if (document.activeElement !== qty) qty.value = String(q);
  $('[data-act=minus]', li).disabled = q <= 0;
  $('[data-act=plus]', li).disabled = q >= it.max;
  const line = $('[data-f=line]', li);
  line.hidden = !q;
  line.textContent = q ? `${signed(it.price * q)}/mo` : '';
  if (q) li.setAttribute('data-added', ''); else li.removeAttribute('data-added');
}

$('#items').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  const li = e.target.closest('li[data-id]');
  if (!b || !li) return;
  const id = li.dataset.id;
  cart[id] = clampQty(id, cart[id] + (b.dataset.act === 'plus' ? 1 : -1));
  update();
});
$('#items').addEventListener('input', (e) => {
  const li = e.target.closest('li[data-id]');
  if (!li || !e.target.matches('[data-f=qty]')) return;
  const id = li.dataset.id;
  cart[id] = clampQty(id, e.target.value.replace(/\D/g, ''));
  update();
});
$('#items').addEventListener('change', (e) => { // a typed number is tidied when the field is left
  const li = e.target.closest('li[data-id]');
  if (li && e.target.matches('[data-f=qty]')) e.target.value = String(cart[li.dataset.id]);
});

// ---- the property form and its pending list ----
const PF = ['name', 'units', 'address'];
const showPropErrors = (errors) => {
  for (const k of PF) {
    const p = $(`#p-${k}-err`); const input = $(`#p-${k}`);
    p.hidden = !errors[k]; p.textContent = errors[k] || '';
    input.setAttribute('aria-invalid', errors[k] ? 'true' : 'false');
  }
  // The authorization is always part of adding a property.
  $('#p-auth-err').hidden = !errors.authorize; $('#p-auth-err').textContent = errors.authorize || '';
  $('#p-auth').setAttribute('aria-invalid', errors.authorize ? 'true' : 'false');
};
function paintProperty() {
  $('#prop-price').textContent = money(PROPERTY.price);
  const n = propertiesCount(purchased);
  $('#prop-count').textContent = `${n} in portfolio${cart.properties.length ? ` · ${cart.properties.length} to add` : ''}`;
  $('#pending').replaceChildren(...cart.properties.map((p, i) => {
    const li = tpl('t-pending');
    li.dataset.i = String(i);
    $('[data-f=name]', li).textContent = p.name;
    $('[data-f=meta]', li).textContent = `${plural(p.units, 'apartment unit')}${p.address ? ` · ${p.address}` : ''} · ${signed(PROPERTY.price)}/mo`;
    $('[data-act=remove]', li).setAttribute('aria-label', `Remove ${p.name} from the summary`);
    return li;
  }));
}
$('#prop-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const r = validateProperty({ name: $('#p-name').value, units: $('#p-units').value, address: $('#p-address').value, authorized: $('#p-auth').checked });
  showPropErrors(r.errors);
  if (!r.ok) { const first = PF.find((k) => r.errors[k]) || (r.errors.authorize ? 'auth' : null); if (first) $(first === 'auth' ? '#p-auth' : `#p-${first}`).focus(); return; }
  cart.properties = [...cart.properties, r.property];
  $('#prop-form').reset();
  update();
  toast(`${r.property.name} added to the summary`);
  $('#p-name').focus();
});
$('#pending').addEventListener('click', (e) => {
  const li = e.target.closest('li[data-i]');
  if (!li || !e.target.closest('[data-act=remove]')) return;
  cart.properties = cart.properties.filter((_, i) => i !== Number(li.dataset.i));
  update();
  $('#p-name').focus();
});

// ---- the budget ----
const budgetInput = $('#budget');
if (budget !== null) budgetInput.value = String(budget);
budgetInput.addEventListener('input', () => {
  const v = budgetInput.value.trim();
  budget = /^\d{1,5}(\.\d{1,2})?$/.test(v) ? Number(v) : null;
  budgetInput.setAttribute('aria-invalid', v && budget === null ? 'true' : 'false');
  if (v === '') saveBudget(null); else if (budget !== null) saveBudget(budget); // cleared means no limit; a half-typed amount changes nothing that is kept
  paintSummary();
});

// ---- the calculator ----
function paintSummary() {
  const s = buildSummary(purchased, cart, budget);
  $('#s-current').textContent = money(s.current);
  $('#s-add').textContent = `${signed(s.add)}/mo`;
  $('#s-next').textContent = money(s.next);
  $('#s-empty').hidden = !s.empty;
  $('#s-lines').hidden = s.empty;
  $('#s-lines').replaceChildren(...s.lines.map((l) => {
    const li = tpl('t-line');
    $('[data-f=label]', li).textContent = `${l.label} · ${l.detail}`;
    $('[data-f=amount]', li).textContent = signed(l.amount);
    return li;
  }));
  const help = $('#budget-help');
  const v = budgetInput.value.trim();
  if (v && budget === null) help.textContent = 'Enter an amount like 150 or 150.50, or leave it empty for no limit.';
  else if (budget === null) help.textContent = 'Add-ons are not limited. Set a budget to be warned before passing it.';
  else if (s.over) help.textContent = `Over budget by ${money(s.overBy)}. Remove something or raise the budget.`;
  else help.textContent = `Add-ons would be ${money(s.addOnsAfter)} of ${money(budget)}.`;
  help.className = `text-xs leading-4 ${s.over || (v && budget === null) ? 'text-danger-text' : 'text-muted-foreground'}`;
  $('#review').disabled = s.empty || s.over;
  $('#clear').hidden = s.empty;
  return s;
}
// ---- Your properties: the ones in the portfolio, and removing one (the same end as Admin's: people signed out, Social cut off, no more charge) ----
function paintPortfolio() {
  const { active, removed } = portfolio(localStorage);
  $('#pf-list').replaceChildren(...active.map((p) => {
    const li = tpl('t-pf');
    li.dataset.id = p.id;
    $('[data-f=name]', li).textContent = p.name;
    $('[data-f=meta]', li).textContent = p.main ? 'The property you started with' : `${plural(p.units, 'apartment unit')}${p.address ? ` · ${p.address}` : ''}`;
    const b = $('[data-act=remove-property]', li);
    b.setAttribute('aria-label', `Remove ${p.name} from your portfolio`);
    b.disabled = active.length <= 1; // the last one cannot go: that would close the account
    return li;
  }));
  $('#pf-last').hidden = active.length > 1;
  $('#pf-removed-wrap').hidden = !removed.length;
  $('#pf-removed').replaceChildren(...removed.map((r) => {
    const li = tpl('t-pf-removed');
    $('[data-f=name]', li).textContent = r.name;
    $('[data-f=meta]', li).textContent = ` · removed ${new Date(r.at).toLocaleDateString('en-US', { dateStyle: 'medium' })}`;
    return li;
  }));
}
let removing = null; // { id, name }
let removeOpenerId = '';
const rmDlg = $('#dlg-remove');
$('#pf-list').addEventListener('click', (e) => {
  const li = e.target.closest('li[data-id]');
  const b = e.target.closest('[data-act=remove-property]');
  if (!li || !b || b.disabled) return;
  removing = { id: li.dataset.id, name: $('[data-f=name]', li).textContent };
  removeOpenerId = li.dataset.id;
  $('#rm-name-label').textContent = removing.name;
  $('#rm-name').value = '';
  $('#rm-go').disabled = true;
  $('#rm-err').hidden = true;
  rmDlg.showModal();
  $('#rm-name').focus();
});
$('#rm-name').addEventListener('input', () => { $('#rm-go').disabled = !removing || $('#rm-name').value.trim() !== removing.name; });
$('#rm-cancel').addEventListener('click', () => rmDlg.close());
rmDlg.addEventListener('keydown', (e) => trapTab(rmDlg, e));
// The list is drawn again after a removal, so the Remove button is found again by its property; if that property is gone, the next one, or the form below.
rmDlg.addEventListener('close', () => {
  const again = [...document.querySelectorAll('#pf-list li[data-id]')].find((li) => li.dataset.id === removeOpenerId);
  restoreFocus(again && $('[data-act=remove-property]', again), [$('#pf-list [data-act=remove-property]:not(:disabled)'), $('#p-name')]);
});
$('#remove-form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!removing || $('#rm-name').value.trim() !== removing.name) return;
  const r = removeFromPortfolio(localStorage, removing.id, { by: 'Client (AMC LLC)' });
  if (!r.ok) {
    const p = $('#rm-err'); p.hidden = false;
    p.textContent = { last_property: 'This is your only property, so it cannot be removed here.', not_in_portfolio: 'It is no longer in your portfolio.', storage: 'The browser could not save this. Try again.' }[r.reason] || 'It could not be removed.';
    return;
  }
  const name = removing.name;
  removing = null;
  rmDlg.close();
  purchased = normalizePurchased(read(KEY, null)); // the plan now has one property less
  update();
  toast(`${name} removed from your portfolio`);
});

function update() { for (const it of ITEMS) paintItem(it); paintProperty(); paintPortfolio(); paintSummary(); }
$('#clear').addEventListener('click', () => { cart = emptyPurchased(); update(); $('#items [data-act=plus]').focus(); });

// ---- review and confirm ----
const dlg = $('#dlg-review');
const auth = $('#r-auth');
let needAuth = true;
$('#review').addEventListener('click', () => {
  const s = buildSummary(purchased, cart, budget);
  if (s.empty || s.over) return;
  $('#r-lines').replaceChildren(...s.lines.map((l) => {
    const li = tpl('t-line');
    $('[data-f=label]', li).textContent = `${l.label} · ${l.detail}`;
    $('[data-f=amount]', li).textContent = `${signed(l.amount)}/mo`;
    return li;
  }));
  $('#r-current').textContent = money(s.current);
  $('#r-add').textContent = `${signed(s.add)}/mo`;
  $('#r-next').textContent = money(s.next);
  // A property is authorized in its own form (always). The other add-ons are authorized here; a cart of properties only needs nothing more.
  needAuth = s.lines.some((l) => l.id !== 'property');
  $('#r-auth-wrap').hidden = !needAuth;
  auth.checked = false;
  $('#r-err').hidden = true;
  dlg.showModal();
  (needAuth ? auth : $('#r-go')).focus();
});
$('#r-cancel').addEventListener('click', () => dlg.close());
$('#review-form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (needAuth && !auth.checked) { const p = $('#r-err'); p.hidden = false; p.textContent = 'Authorize the charge to continue.'; auth.focus(); return; }
  const s = buildSummary(purchased, cart, budget);
  const had = purchased.properties.length;
  purchased = applyCart(purchased, cart);
  // A property of its own has a Social of its own, from the day it is added (Admin > Social management lists it).
  purchased.properties.slice(had).forEach((p) => ensurePropertyFeed(localStorage, p.id, p.name));
  write(KEY, purchased);
  write('capacity-state:client', purchased); // the copy the Client's Settings page reads (it cannot read "eso-" keys)
  cart = emptyPurchased();
  dlg.close();
  update();
  $('#done').hidden = false;
  $('#done-text').textContent = `Added to Billing & Plan. Your monthly total is now ${money(s.next)}, up ${money(s.add)}. It applies from your next billing period.`;
  $('#done').scrollIntoView({ block: 'nearest' });
  toast('Added to Billing & Plan');
});

update();
// Links from Documents (#storage) and from Workspace settings (#property) land on the part they are about.
{
  const target = { '#storage': rows.get('storage'), '#property': $('#property') }[location.hash];
  if (target) { target.scrollIntoView({ block: 'center' }); target.querySelector('[data-act=plus], #p-name')?.focus({ preventScroll: true }); }
}
