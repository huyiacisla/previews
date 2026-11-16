// Capacity (Client): what the plan includes, what can be added, and what it costs. No page in here, so it can be tested.
// The ONE place the plan's limits live (every card, page and notification reads them from here). The owner's standard plan: Resident accounts 800, Staff members 10,
// Parking spaces at least 300. The "used" figures are sample data (202 residents and 261 spaces are what the dashboards already said; 7 staff seats is a sample).
// Prices: Parking spaces +$5.00/mo per unit; Resident accounts +$2.00/mo per unit; Staff members +$10.00/mo per unit; Additional property $25.00/mo; current recurring total $50.00.
// Document storage is new: 10 GB included, and +20 GB for $15.00/mo when it runs out. Demo only: nothing is charged; what is "bought" is kept in this browser.

export const BASE = { plan: 'Starter', recurring: 50 };
export const STORAGE_BLOCK_GB = 20;

/** The resources that are added by the unit. `included` is what the plan covers; `used` is what is in use now. */
export const ITEMS = [
  { id: 'parking', name: 'Parking spaces', unit: 'space', unitPlural: 'spaces', price: 5, per: 'per unit', included: 300, used: 261, max: 5000, step: 1, hint: 'Spaces your properties can hold.' },
  { id: 'residents', name: 'Resident accounts', unit: 'account', unitPlural: 'accounts', price: 2, per: 'per unit', included: 800, used: 202, max: 5000, step: 1, hint: 'Residents who sign in to their portal.' },
  { id: 'staff', name: 'Staff members', unit: 'seat', unitPlural: 'seats', price: 10, per: 'per unit', included: 10, used: 7, max: 200, step: 1, hint: 'People who work in your properties.' },
  { id: 'storage', name: 'Document storage', unit: 'GB', unitPlural: 'GB', price: 15, per: 'per 20 GB', included: 10, used: 9.4, max: 20, step: 1, block: STORAGE_BLOCK_GB, hint: 'Where contracts, insurance and the W-9 are kept.' },
];
export const PROPERTY = { id: 'property', name: 'Additional property', price: 25, inPortfolio: 1, maxUnits: 5000 };

export const emptyPurchased = () => ({ parking: 0, residents: 0, staff: 0, storage: 0, properties: [] });
const num = (v, max) => Math.min(max, Math.max(0, Math.floor(Number(v) || 0)));
/** Whatever was kept in the browser, made safe to use. */
export function normalizePurchased(raw) {
  const out = emptyPurchased();
  if (!raw || typeof raw !== 'object') return out;
  for (const it of ITEMS) out[it.id] = num(raw[it.id], it.max);
  out.properties = Array.isArray(raw.properties) ? raw.properties.filter((p) => p && typeof p.name === 'string').slice(0, 50).map((p, i) => ({
    // A property keeps one id for as long as it is in the account (a new owner of the same place is a new property with a new id). One saved
    // before ids existed is named by its place in the list, once: the next save keeps it.
    id: PROPERTY_ID.test(p.id) ? p.id : `extra-${i + 1}`,
    name: String(p.name).slice(0, 80), units: num(p.units, PROPERTY.maxUnits), address: String(p.address || '').slice(0, 120),
    ...(p.status === 'ended' ? { status: 'ended', endedAt: Number(p.endedAt) || null } : {}),
  })) : [];
  if (raw.primaryEnded === true) out.primaryEnded = true; // the property the company started with has been removed from the portfolio
  return out;
}
// A regular expression's test() turns undefined into the word "undefined", which fits this pattern: the type is checked first.
const PROPERTY_ID = { test: (v) => typeof v === 'string' && /^[a-z0-9-]{3,40}$/.test(v) };
/** A new id for a property being added: it never repeats, and never depends on what else is in the list (so removing one cannot move another's data). */
export const newPropertyId = (now = Date.now(), rand = Math.random) => `p${now.toString(36)}${Math.floor(rand() * 36 ** 4).toString(36).padStart(4, '0')}`;
export const clampQty = (id, n) => num(n, (ITEMS.find((i) => i.id === id) || { max: 0 }).max);

const item = (id) => ITEMS.find((i) => i.id === id);
/** What each unit added is worth in its own terms: a storage unit is a 20 GB block. */
export const perUnit = (id) => item(id).block || 1;
/** The limit after what has been bought. */
export const limitFor = (id, purchased) => item(id).included + (purchased[id] || 0) * perUnit(id);
/** A property that ended is no longer in the account: it is neither counted nor charged. */
export const activeProperties = (purchased) => purchased.properties.filter((p) => p.status !== 'ended');
export const propertiesCount = (purchased) => (purchased.primaryEnded ? 0 : PROPERTY.inPortfolio) + activeProperties(purchased).length;
export const addOnsTotal = (purchased) => ITEMS.reduce((s, it) => s + it.price * (purchased[it.id] || 0), 0) + PROPERTY.price * activeProperties(purchased).length;
/** What the account pays each month now. */
export const recurring = (purchased) => BASE.recurring + addOnsTotal(purchased);

/**
 * The calculator. `cart` is what is being added now (same shape as purchased). `budget` is an optional cap on the monthly total of add-ons (null for none).
 * Returns the lines to show, what this adds each month, the new monthly total, and whether the budget would be passed.
 */
export function buildSummary(purchased, cart, budget = null) {
  const lines = [];
  for (const it of ITEMS) {
    const q = cart[it.id] || 0;
    if (q > 0) lines.push({ id: it.id, label: it.name, qty: q, detail: it.block ? `${q * it.block} GB` : `${q} ${q === 1 ? it.unit : it.unitPlural}`, amount: it.price * q });
  }
  for (const p of cart.properties || []) lines.push({ id: 'property', label: p.name, qty: 1, detail: `Property, ${p.units} ${p.units === 1 ? 'unit' : 'units'}`, amount: PROPERTY.price });
  const add = lines.reduce((s, l) => s + l.amount, 0);
  const current = recurring(purchased);
  const addOnsAfter = addOnsTotal(purchased) + add;
  const cap = budget === null || budget === '' || Number.isNaN(Number(budget)) ? null : Number(budget);
  return { lines, add, current, next: current + add, addOnsAfter, budget: cap, over: cap !== null && addOnsAfter > cap, overBy: cap !== null ? Math.max(0, addOnsAfter - cap) : 0, empty: lines.length === 0 };
}

/** The cart folded into what has been bought. */
export function applyCart(purchased, cart) {
  const out = normalizePurchased(purchased);
  for (const it of ITEMS) out[it.id] = Math.min(it.max, out[it.id] + clampQty(it.id, cart[it.id]));
  out.properties = [...out.properties, ...(cart.properties || []).map((p) => ({ ...p, id: PROPERTY_ID.test(p.id) ? p.id : newPropertyId() }))];
  return out;
}

/** The "Add another property" form: a name and a number of units are needed, the address is optional, and the charge must always be authorized. */
export function validateProperty(input) {
  const errors = {};
  if (!input.authorized) errors.authorize = 'Authorize the charge to add the property.';
  const name = String(input.name || '').trim();
  const address = String(input.address || '').trim();
  const raw = String(input.units ?? '').trim();
  if (!name) errors.name = 'Enter the property name.';
  else if (name.length > 80) errors.name = 'Use 80 characters or fewer.';
  const units = /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!raw) errors.units = 'Enter the number of apartment units.';
  else if (!Number.isInteger(units) || units < 1 || units > PROPERTY.maxUnits) errors.units = `Enter a whole number from 1 to ${PROPERTY.maxUnits}.`;
  if (address.length > 120) errors.address = 'Use 120 characters or fewer.';
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, errors, property: { name, units, address, authorized: true } };
}

/* ---- Document storage ---- */
export const STORAGE_NEAR = 0.9;
/** ok · near (90% or more) · full (no room left). */
export function storageState(usedGb, limitGb) {
  if (usedGb >= limitGb) return 'full';
  return usedGb / limitGb >= STORAGE_NEAR ? 'near' : 'ok';
}
export const bytesToGb = (bytes) => bytes / 1e9;
/** Storage in use: what is already stored (a sample figure for the preview) plus the files listed in Documents. `docs` are the Documents page's entries (each has a `size` in bytes). */
export const storageUsedGb = (docs) => ITEMS.find((i) => i.id === 'storage').used + bytesToGb((docs || []).reduce((s, d) => s + (Number(d && d.size) || 0), 0));
/** Whether a file of `bytes` still fits. */
export const fits = (usedGb, limitGb, bytes) => usedGb + bytesToGb(bytes) <= limitGb;
export const gbLabel = (gb) => `${gb >= 100 ? Math.round(gb) : Math.round(gb * 10) / 10} GB`;

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
/** The add-on budget in force: the one typed on the Capacity page (a number, or "none" when it was cleared on purpose), else the default set in
 *  Workspace settings (`prefs.budget`), else no cap (null). */
export function resolveBudget(own, prefs) {
  if (typeof own === 'number' && Number.isFinite(own) && own >= 0) return own;
  if (own === 'none') return null;
  const d = prefs && typeof prefs === 'object' ? prefs.budget : null;
  return typeof d === 'number' && Number.isFinite(d) && d >= 0 ? d : null;
}
/** $50.00 */
export const money = (n) => usd.format(n);
/** +$25.00 or -$5.00 */
export const signed = (n) => `${n < 0 ? '-' : '+'}${usd.format(Math.abs(n))}`;
