import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreFocus, trapTab } from '../src/shared/js/dialog-trap.js';

// A page element with just what the helpers read.
const el = (id, { hidden = false, disabled = false, connected = true, visible = true } = {}) => ({ id, hidden, disabled, isConnected: connected, getClientRects: () => (visible ? [{}] : []), focused: false, focus() { this.focused = true; } });
const withDoc = (elements, fn) => { const prev = globalThis.document; globalThis.document = { getElementById: (id) => elements.find((e) => e.id === id) || null, activeElement: null, }; try { fn(); } finally { globalThis.document = prev; } };

test('focus goes back to the element the dialog was opened from, named by element or by id', () => {
  const a = el('more-a');
  withDoc([a], () => { assert.equal(restoreFocus('more-a'), true); });
  assert.equal(a.focused, true);
  const b = el('more-b');
  withDoc([], () => { assert.equal(restoreFocus(b), true); });
  assert.equal(b.focused, true);
});

test('an opener that is gone, hidden, disabled or not on screen is skipped for the next one, so the keyboard user is never left on the page itself', () => {
  const gone = el('x', { connected: false }), hid = el('y', { hidden: true }), off = el('z', { visible: false }), dis = el('w', { disabled: true }), ok = el('search');
  withDoc([gone, hid, off, dis, ok], () => { assert.equal(restoreFocus('x', ['y', 'z', 'w', 'search']), true); });
  assert.deepEqual([gone, hid, off, dis].map((e) => e.focused), [false, false, false, false]);
  assert.equal(ok.focused, true);
  withDoc([], () => { assert.equal(restoreFocus('nothing', ['nope']), false); });
});

test('Tab wraps from the last control to the first and Shift+Tab from the first to the last; other keys are left alone', () => {
  const c = (id) => ({ id, disabled: false, hidden: false, getClientRects: () => [{}], focus() { prevFocus.at = id; } });
  const prevFocus = { at: null };
  const list = [c('first'), c('mid'), c('last')];
  const dlg = { querySelectorAll: () => list };
  const run = (key, shift, active) => { let prevented = false; const prev = globalThis.document; globalThis.document = { activeElement: active }; try { trapTab(dlg, { key, shiftKey: shift, preventDefault() { prevented = true; } }); } finally { globalThis.document = prev; } return prevented; };
  assert.equal(run('Tab', false, list[2]), true); assert.equal(prevFocus.at, 'first');
  assert.equal(run('Tab', true, list[0]), true); assert.equal(prevFocus.at, 'last');
  assert.equal(run('Tab', false, list[1]), false, 'in the middle the browser moves the focus itself');
  assert.equal(run('Enter', false, list[2]), false);
});
