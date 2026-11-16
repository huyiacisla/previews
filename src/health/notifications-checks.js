// Notifications (every portal): is the data sound? For Admin's System health. Pure logic, no DOM, so node --test can run it.
// Same shape as the other checks: { id, label, severity, found: [{ where, detail }], fix, ok }. Only reads.

import { PERSONAS } from '../messaging/personas.js';
import { buildAll } from '../notifications/store.js';

const ROLES = ['client', 'staff', 'resident', 'admin'];
const PREF_KEYS = ['eso-notif', 'client:eso-notif', 'resident:eso-proto', 'admin:eso-proto'];

const parse = (storage, key) => { let t; try { t = storage.getItem(key); } catch { return { state: 'bad' }; } if (t == null) return { state: 'none' }; try { return { state: 'ok', value: JSON.parse(t) }; } catch { return { state: 'bad' }; } };

export function checkNotifications(storage, now = Date.now()) {
  const checks = [];
  const add = (id, label, severity, found, fix) => checks.push({ id, label, severity, found, fix, ok: found.length === 0 });

  const maps = [];
  for (const p of PERSONAS) {
    const key = `eso-notif-read:${p.id}`;
    const r = parse(storage, key);
    if (r.state === 'bad') maps.push({ where: `Storage key "${key}"`, detail: `${p.name}'s read marks cannot be read, so everything shows as unread again.` });
    else if (r.state === 'ok') {
      if (!r.value || typeof r.value !== 'object' || Array.isArray(r.value)) maps.push({ where: `Storage key "${key}"`, detail: `It is not a list of { id: read or unread }.` });
      else { const bad = Object.entries(r.value).filter(([, v]) => typeof v !== 'boolean'); if (bad.length) maps.push({ where: `Storage key "${key}"`, detail: `${bad.length} mark(s) are not read or unread (first: "${bad[0][0]}").` }); }
    }
  }
  add('notif-read-marks', 'What each person has read can be read', 'warning', maps.slice(0, 30), 'Remove the named key: the person sees every notification as new once. Find the code that wrote it (marks are only ever true or false).');

  const prefs = [];
  for (const key of PREF_KEYS) { const r = parse(storage, key); if (r.state === 'bad') prefs.push({ where: `Storage key "${key}"`, detail: 'The notification switches cannot be read, so every category is shown.' }); }
  add('notif-switches', 'The notification switches can be read', 'warning', prefs, 'Remove the named key; the person\'s switches go back to their defaults.');

  const items = [];
  for (const role of ROLES) {
    let list = [];
    try { list = buildAll(now, role, [], storage); } catch (e) { items.push({ where: `The ${role} list`, detail: `It could not be built: ${e && e.message}` }); continue; }
    const seen = new Set();
    for (const n of list) {
      if (seen.has(n.id)) items.push({ where: `${role}: notification ${n.id}`, detail: 'Two notifications have this id: marking one as read marks both.' });
      seen.add(n.id);
      if (!Number.isFinite(n.ts) || n.ts > now + 3600000) items.push({ where: `${role}: notification ${n.id}`, detail: 'It has no usable time.' });
      if (!n.title && !n.detail) items.push({ where: `${role}: notification ${n.id}`, detail: 'It has no words.' });
    }
  }
  add('notif-items', 'Every notification has its own id, words and time', 'error', items.slice(0, 30), 'An id must be unique within a list (read marks are kept by id); build ids from the source (a chat id, a post id), never from a counter that restarts.');
  return checks;
}
