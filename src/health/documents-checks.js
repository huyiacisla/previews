// Documents (Client): is the data sound? For Admin's System health. Pure logic, no DOM, so node --test can run it.
// Same shape as the other checks: { id, label, severity, found: [{ where, detail }], fix, ok }. Only reads.

import { CATEGORIES, PROPERTIES, SHARES, MAX_BYTES, migrateDocs } from '../documents/store.js';
import { ITEMS, limitFor, normalizePurchased, storageUsedGb } from '../capacity/store.js';

const KEY = 'eso-docs:client';
const SECRET_KEYS = ['docs-secret:log', 'docs-secret:issued', 'docs-secret:via', 'docs-secret:pending', 'docs-secret:window', 'docs-prefs:client'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const parse = (storage, key) => { const t = storage.getItem(key); if (t == null) return { state: 'none' }; try { return { state: 'ok', value: JSON.parse(t) }; } catch { return { state: 'bad' }; } };
const known = (list) => new Set(list.map(([id]) => id));

export function checkDocuments(storage) {
  const checks = [];
  const add = (id, label, severity, found, fix) => checks.push({ id, label, severity, found, fix, ok: found.length === 0 });

  let raw;
  try { raw = parse(storage, KEY); } catch { raw = { state: 'bad' }; }
  const asList = raw.state === 'ok' && Array.isArray(raw.value) ? raw.value : null;
  add('docs-readable', 'The document list can be read', 'error',
    raw.state === 'bad' || (raw.state === 'ok' && !asList) ? [{ where: `Storage key "${KEY}"`, detail: raw.state === 'bad' ? 'It is not valid JSON.' : 'It is not a list.' }] : [],
    `Remove the key "${KEY}" in the browser's storage: the sample documents are made again on the next visit (documents added since are lost). Find the code that wrote the bad value.`);

  const secret = [];
  for (const k of SECRET_KEYS) { let p; try { p = parse(storage, k); } catch { p = { state: 'bad' }; } if (p.state === 'bad') secret.push({ where: `Storage key "${k}"`, detail: 'It is not valid JSON, so the page starts it again.' }); }
  add('docs-side-data', 'The secret-key and preference data can be read', 'warning', secret, 'Remove the named key: Documents makes it again (a pending secret key is lost, so ask for a new one).');

  if (!asList) return checks;

  const notDocs = asList.map((r, i) => ({ r, i })).filter(({ r }) => !(r && typeof r === 'object' && typeof r.id === 'string' && typeof r.name === 'string' && r.name !== ''));
  add('docs-entries', 'Every entry is a document', 'warning', notDocs.map(({ i }) => ({ where: `Entry ${i + 1} of the list`, detail: 'It has no id or no name, so the page leaves it out.' })),
    'Find where the entry was written; a document must have a text id and a name. The page already ignores it, but it takes room in storage.');

  const docs = migrateDocs(asList);
  const seen = new Set(), dup = [];
  for (const d of docs) { if (seen.has(d.id)) dup.push({ where: `Document ${d.id}`, detail: `Two documents have this id ("${d.name}" is one of them).` }); seen.add(d.id); }
  add('docs-unique', 'Every document has its own id', 'error', dup, 'Give the newer one a new id where it is made: ids must not repeat (the list is drawn and removed by id).');

  const cats = known(CATEGORIES), props = known(PROPERTIES), shares = known(SHARES);
  const odd = [];
  for (const d of asList.filter((r) => r && typeof r === 'object')) {
    if (d.kind !== 'w9' && d.category != null && !cats.has(d.category)) odd.push({ where: `Document ${d.id}`, detail: `Category "${d.category}" is not one of the known categories.` });
    if (d.property != null && !props.has(d.property)) odd.push({ where: `Document ${d.id}`, detail: `Property "${d.property}" is not one of the company's properties.` });
    if (d.share != null && !shares.has(d.share)) odd.push({ where: `Document ${d.id}`, detail: `"Who can see it" is "${d.share}"; the page shows it as the whole team.` });
  }
  add('docs-known-values', 'Category, property and who can see a document are known values', 'warning', odd.slice(0, 30), 'A document with an unknown category is in no category tab. Set it to one of the known values when it is written.');

  const sizes = asList.filter((r) => r && typeof r === 'object' && r.size != null && (!Number.isFinite(r.size) || r.size < 0 || r.size > MAX_BYTES)).map((d) => ({ where: `Document ${d.id}`, detail: `Its size is ${d.size}; a document is between 0 and ${MAX_BYTES} bytes.` }));
  add('docs-size', 'Every document has a sensible size', 'warning', sizes, 'The upload form refuses a file over 10 MB; a value like this was set by script or by an import. A wrong size makes the storage total wrong.');

  const dates = [];
  for (const d of asList.filter((r) => r && typeof r === 'object')) {
    if (d.updated != null && !(ISO_DAY.test(String(d.updated)) && Number.isFinite(Date.parse(d.updated)))) dates.push({ where: `Document ${d.id}`, detail: `Its date "${d.updated}" is not a day (YYYY-MM-DD).` });
    if (d.expires != null && !(ISO_DAY.test(String(d.expires)) && Number.isFinite(Date.parse(d.expires)))) dates.push({ where: `Document ${d.id}`, detail: `Its end date "${d.expires}" is not a day (YYYY-MM-DD), so it is never called "expiring".` });
  }
  add('docs-dates', 'Every date is a real day', 'warning', dates, 'Write dates as YYYY-MM-DD; the expiry reminders and the sort by date read them.');

  let purchased;
  try { purchased = normalizePurchased(JSON.parse(storage.getItem('eso-capacity:client') || storage.getItem('capacity-state:client'))); } catch { purchased = normalizePurchased(null); }
  const used = storageUsedGb(docs), limit = limitFor('storage', purchased);
  add('docs-storage', 'Document storage is within the plan', 'error', used > limit ? [{ where: 'Document storage', detail: `${Math.round(used * 10) / 10} GB used of ${limit} GB.` }] : [],
    `Buy more storage in Capacity, or remove documents. The upload form stops at the limit (${ITEMS.find((i) => i.id === 'storage').included} GB included): a total over it means something was added without that check.`);
  return checks;
}
