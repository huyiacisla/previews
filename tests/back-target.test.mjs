// "Back goes to the page you came from": every portal, every page that links into Settings. Run alone with: npm run check:back
import test from 'node:test';
import assert from 'node:assert/strict';
import { backTarget } from '../src/back-target.js';

const ORIGIN = 'http://localhost:3590';
const PAGES = {
  staff: ['dashboard', 'messages', 'notifications', 'tickets', 'social', 'promotions', 'support', 'workspace'],
  client: ['dashboard', 'messages', 'notifications', 'tickets', 'documents', 'support', 'workspace', 'usage/capacity'],
  resident: ['home', 'messages', 'notifications', 'tickets', 'promotions', 'social'],
};
const SETTINGS = { staff: '/staff/settings/notifications.html', client: '/client/settings/notifications.html', resident: '/resident/settings/notifications.html' };
const base = (portal, over = {}) => ({ origin: ORIGIN, pathname: SETTINGS[portal], portal, entryHash: '#/settings/notifications', hash: '#/settings/notifications', referrer: '', ...over });

test('from every page that links into Settings, Back steps back to that page', () => {
  for (const [portal, pages] of Object.entries(PAGES)) {
    for (const page of pages) {
      const referrer = `${ORIGIN}/${portal}/${page}.html?as=x`;
      assert.equal(backTarget(base(portal, { referrer })), 'history', `${portal}/${page}`);
    }
  }
});

test('after moving inside Settings, Back goes up one level (the list), not out of Settings', () => {
  for (const portal of Object.keys(PAGES)) {
    const referrer = `${ORIGIN}/${portal}/notifications.html`;
    assert.equal(backTarget(base(portal, { referrer, hash: '#/settings/personalize' })), 'crumb', portal);
  }
});

test('opened directly, in a new tab, or from elsewhere: Back is the page\'s own parent', () => {
  for (const portal of Object.keys(PAGES)) {
    assert.equal(backTarget(base(portal, { referrer: '' })), 'crumb', `${portal}: no referrer`);
    assert.equal(backTarget(base(portal, { referrer: 'https://example.com/' + portal + '/dashboard.html' })), 'crumb', `${portal}: another site`);
    assert.equal(backTarget(base(portal, { referrer: 'not a url' })), 'crumb', `${portal}: broken referrer`);
    assert.equal(backTarget(base(portal, { referrer: `${ORIGIN}/` })), 'crumb', `${portal}: the start page`);
  }
});

test('coming from another portal never steps back into it', () => {
  assert.equal(backTarget(base('staff', { referrer: `${ORIGIN}/client/dashboard.html` })), 'crumb');
  assert.equal(backTarget(base('resident', { referrer: `${ORIGIN}/staff/messages.html` })), 'crumb');
});

test('a reload of the settings page itself, or the prototype\'s own page, is not a place to return to', () => {
  assert.equal(backTarget(base('staff', { referrer: `${ORIGIN}${SETTINGS.staff}` })), 'crumb');
  assert.equal(backTarget(base('staff', { referrer: `${ORIGIN}/staff/account-settings.html` })), 'crumb');
  assert.equal(backTarget(base('client', { referrer: `${ORIGIN}/client/account-settings` })), 'crumb');
});

test('settings pages reached from each other (a section page to another) behave the same as from any page', () => {
  // arriving on Availability from the Notifications settings page is a page of the portal, so Back returns there
  assert.equal(backTarget(base('staff', { pathname: '/staff/settings/availability.html', entryHash: '#/settings/availability', hash: '#/settings/availability', referrer: `${ORIGIN}/staff/settings/notifications.html` })), 'history');
});
