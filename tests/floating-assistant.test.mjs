// The floating assistant button: only an icon while its chat is closed, and out of the way of an open dialog. These are CSS and a small script in a
// page that runs in a browser, so the test pins the rules by reading the sources (the reasons are in docs/qa/09-social-admin-ghi-chu.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const quality = readFileSync(new URL('../src/staff/account-settings.quality.js', import.meta.url), 'utf8');

test('while its chat is closed the assistant is an icon: no label, 44px, no padding', () => {
  assert.match(css, /\.easyspotops-floating-closed-shell \.easyspotops-floating-label \{ display: none !important; \}/);
  assert.match(css, /\.easyspotops-floating-closed-shell \.easyspotops-floating-button \{[^}]*width: 2\.75rem !important;[^}]*height: 2\.75rem !important;[^}]*padding: 0 !important;/);
});

test('the rule is for the closed state only, so the name shows again when the chat is open', () => {
  assert.ok(!/\n\.easyspotops-floating-support-shell \.easyspotops-floating-label \{ display: none/.test(css));
});

test('the frame hides the assistant while a dialog of the page inside it is open, so it never covers the dialog\'s main button', () => {
  assert.match(css, /html\[data-eso-modal\] \.easyspotops-floating-support-shell \{ display: none; \}/);
  assert.match(quality, /toggleAttribute\('data-eso-modal',open\)/);
  assert.match(quality, /\[aria-modal="true"\],dialog\[open\]/);
});
