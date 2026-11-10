// Client account settings (src/settings/client-store.js). Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { KEY, UI_KEY, DEFAULTS, readSettings, save, signOutDevice, devicesIn, uiPrefs, publish, phoneError, emailError, SIDEBAR_PRESETS, SECTIONS, ACCESS } from '../src/settings/client-store.js';

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), raw: m }; };

test('defaults, and anything that does not belong is replaced on read', () => {
  const s = memory();
  assert.deepEqual(readSettings(s), DEFAULTS);
  s.setItem(KEY, JSON.stringify({ phone: 5, contact: 'pigeon', quiet: 'always', notify: { email: 'yes', push: false }, look: { sidebar: 'neon', icons: 0, theme: 'blue' }, security: { devicesOut: ['d1', 'd2', 'zz'] }, billingEmail: 'nope' }));
  const r = readSettings(s);
  assert.equal(r.phone, '');
  assert.equal(r.contact, 'app');
  assert.equal(r.quiet, 'off');
  assert.deepEqual([r.notify.email, r.notify.push], [true, false]);
  assert.deepEqual([r.look.sidebar, r.look.icons, r.look.theme], ['default', true, 'light']);
  assert.deepEqual(r.security.devicesOut, ['d2'], 'only known devices other than this one');
  assert.equal(r.billingEmail, DEFAULTS.billingEmail);
  s.setItem(KEY, '{broken');
  assert.deepEqual(readSettings(s), DEFAULTS);
});

test('save: valid paths persist, invalid ones are refused and change nothing', () => {
  const s = memory();
  assert.equal(save(s, 'notify.email', false).ok, true);
  assert.equal(save(s, 'look.sidebar', 'ocean').ok, true);
  assert.equal(save(s, 'phone', '+1 (916) 555-0142').ok, true);
  assert.equal(save(s, 'digest', 'weekly').ok, true);
  const r = readSettings(s);
  assert.deepEqual([r.notify.email, r.look.sidebar, r.phone, r.digest], [false, 'ocean', '+1 (916) 555-0142', 'weekly']);
  const before = s.getItem(KEY);
  for (const [p, v] of [['notify.email', 'yes'], ['look.sidebar', 'neon'], ['look.theme', 'blue'], ['phone', 'abc'], ['billingEmail', 'x'], ['contact', 'pigeon'], ['nope', 1], ['notify.nope', true], ['security.devicesOut', 'd2']]) {
    assert.equal(save(s, p, v).ok, false, `${p}=${v}`);
  }
  assert.equal(s.getItem(KEY), before, 'refused saves write nothing');
  assert.equal(save({ getItem: () => null, setItem: () => { throw new Error('full'); } }, 'notify.email', false).reason, 'storage');
});

test('validation helpers', () => {
  assert.equal(phoneError(''), '');
  assert.match(phoneError('12'), /7 to 15/);
  assert.match(phoneError('call'), /digits/);
  assert.equal(emailError('dana@mallardpointe.example'), '');
  assert.match(emailError(''), /Enter/);
  assert.match(emailError('dana@'), /valid/);
});

test('signing out a device: others only, once, and the current one stays', () => {
  const s = memory();
  assert.equal(devicesIn(readSettings(s)).length, 3);
  assert.equal(signOutDevice(s, 'd1').ok, false, 'this device');
  assert.equal(signOutDevice(s, 'zz').ok, false);
  assert.equal(signOutDevice(s, 'd2').ok, true);
  assert.equal(signOutDevice(s, 'd2').ok, true, 'twice is harmless');
  assert.deepEqual(devicesIn(readSettings(s)).map((d) => d.id), ['d1', 'd3']);
});

test('what the real pages get: colors only when a preset is chosen; sidebar options and theme always', () => {
  const s = memory();
  assert.equal('sb' in uiPrefs(readSettings(s)), false, 'default look: no color override');
  save(s, 'look.sidebar', 'plum');
  save(s, 'look.icons', false);
  save(s, 'look.theme', 'dark');
  const u = uiPrefs(readSettings(s));
  assert.deepEqual(u.sb, ['#26122f', '#f3e8ff', '#3d1c4b', '#c084fc']);
  assert.deepEqual([u.icons, u.counts, u.cap, u.theme], [false, true, true, 'dark']);
  assert.equal(publish(s, readSettings(s)), true);
  assert.deepEqual(JSON.parse(s.getItem(UI_KEY)).sb, u.sb);
  for (const p of SIDEBAR_PRESETS) if (p[2]) assert.ok(p[2].every((c) => /^#[0-9a-f]{6}$/i.test(c)), p[0]);
});

test('the page has no Social or Promotions anywhere', () => {
  const text = JSON.stringify([SECTIONS, ACCESS.filter((a) => a[2] === 'ok')]);
  assert.equal(/social|promotion/i.test(text), false);
  assert.ok(ACCESS.some((a) => a[2] === 'no' && /Social and Promotions/.test(a[0])), 'and the access table says so');
});
