// The property's display name (F367): saved in the property profile, read everywhere the property is named.
import test from 'node:test';
import assert from 'node:assert/strict';
import { propertyName, DEFAULT_PROPERTY } from '../src/property-name.js';

const mem = (o = {}) => ({ getItem: (k) => (k in o ? (typeof o[k] === 'string' ? o[k] : JSON.stringify(o[k])) : null) });

test('the saved display name is used; nothing, blanks or broken storage mean the default; it is cleaned and cut', () => {
  assert.equal(propertyName(mem()), DEFAULT_PROPERTY);
  assert.equal(propertyName(mem({ 'eso-prop': { display: '  River   Court  ' } })), 'River Court');
  assert.equal(propertyName(mem({ 'eso-prop': { display: '   ' } })), DEFAULT_PROPERTY);
  assert.equal(propertyName(mem({ 'eso-prop': { display: 42 } })), DEFAULT_PROPERTY);
  assert.equal(propertyName({ getItem: () => '{not json' }), DEFAULT_PROPERTY);
  assert.equal(propertyName(mem({ 'eso-prop': { display: 'x'.repeat(200) } })).length, 80);
});
