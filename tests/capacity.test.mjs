import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE, ITEMS, PROPERTY, emptyPurchased, normalizePurchased, clampQty, limitFor, propertiesCount, addOnsTotal, recurring, buildSummary, applyCart,
  validateProperty, storageState, fits, bytesToGb, storageUsedGb, gbLabel, money, signed,
} from '../src/capacity/store.js';

const cart = (o = {}) => ({ ...emptyPurchased(), ...o });

test('the prices and figures are the ones Billing & Plan shows', () => {
  const by = (id) => ITEMS.find((i) => i.id === id);
  assert.deepEqual([by('parking').price, by('parking').used, by('parking').included], [5, 261, 500]);
  assert.deepEqual([by('residents').price, by('residents').used, by('residents').included], [2, 0, 0]);
  assert.deepEqual([by('staff').price, by('staff').used, by('staff').included], [10, 0, 0]);
  assert.deepEqual([by('storage').price, by('storage').included, by('storage').block], [15, 10, 20]);
  assert.equal(PROPERTY.price, 25);
  assert.equal(BASE.recurring, 50);
});

test('nothing bought: the monthly total is the base, limits are what is included, one property', () => {
  const p = emptyPurchased();
  assert.equal(recurring(p), 50);
  assert.equal(limitFor('parking', p), 500);
  assert.equal(limitFor('storage', p), 10);
  assert.equal(propertiesCount(p), 1);
});

test('the calculator adds each line, shows what changes each month, and the new total', () => {
  const p = emptyPurchased();
  const s = buildSummary(p, cart({ parking: 20, staff: 2, storage: 1, properties: [{ name: 'Sundale', units: 120, address: '' }] }));
  assert.deepEqual(s.lines.map((l) => [l.id, l.amount]), [['parking', 100], ['staff', 20], ['storage', 15], ['property', 25]]);
  assert.equal(s.add, 160);
  assert.equal(s.current, 50);
  assert.equal(s.next, 210);
  assert.equal(s.lines.find((l) => l.id === 'storage').detail, '20 GB'); // a storage unit is a 20 GB block
  assert.equal(s.lines.find((l) => l.id === 'parking').detail, '20 spaces');
  assert.equal(buildSummary(p, cart({ staff: 1 })).lines[0].detail, '1 seat');
  assert.equal(buildSummary(p, cart()).empty, true);
  assert.equal(buildSummary(p, cart()).next, 50);
});

test('what was bought raises the limits and the monthly total, and counts toward the next calculation', () => {
  const bought = applyCart(emptyPurchased(), cart({ parking: 100, storage: 2, properties: [{ name: 'Sundale', units: 80, address: 'Elm St' }] }));
  assert.equal(limitFor('parking', bought), 600);
  assert.equal(limitFor('storage', bought), 50); // 10 included + 2 x 20
  assert.equal(propertiesCount(bought), 2);
  assert.equal(addOnsTotal(bought), 500 + 30 + 25);
  assert.equal(recurring(bought), 50 + 555);
  const next = buildSummary(bought, cart({ residents: 10 }));
  assert.equal(next.current, 605);
  assert.equal(next.next, 625);
  assert.equal(next.addOnsAfter, 575);
});

test('the budget caps the add-ons: passing it is said, and by how much', () => {
  const p = emptyPurchased();
  const s = buildSummary(p, cart({ parking: 40 }), 150);
  assert.equal(s.over, true);
  assert.equal(s.overBy, 50);
  assert.equal(buildSummary(p, cart({ parking: 30 }), 150).over, false); // exactly the budget is fine
  assert.equal(buildSummary(p, cart({ parking: 30 }), null).over, false);
  assert.equal(buildSummary(p, cart({ parking: 30 }), '').budget, null);
  assert.equal(buildSummary(applyCart(p, cart({ staff: 10 })), cart({ parking: 10 }), 140).over, true); // what is already bought counts: 100 + 50 > 140
});

test('quantities stay whole numbers inside the limits; a saved state is made safe', () => {
  assert.equal(clampQty('parking', -5), 0);
  assert.equal(clampQty('parking', 12.9), 12);
  assert.equal(clampQty('parking', 'abc'), 0);
  assert.equal(clampQty('staff', 9999), 200);
  assert.equal(clampQty('nothing', 5), 0);
  const n = normalizePurchased({ parking: '7', staff: 999, storage: -1, properties: [{ name: 'A', units: '12' }, null, { units: 3 }] });
  assert.equal(n.parking, 7);
  assert.equal(n.staff, 200);
  assert.equal(n.storage, 0);
  assert.deepEqual(n.properties, [{ name: 'A', units: 12, address: '' }]);
  assert.deepEqual(normalizePurchased('x'), emptyPurchased());
});

test('Add another property: a name and a whole number of units, the address is optional, and the charge is always authorized', () => {
  const ok = validateProperty({ name: '  Sundale Court ', units: '120', address: '', authorized: true });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.property, { name: 'Sundale Court', units: 120, address: '', authorized: true });
  assert.equal(validateProperty({ name: 'Sundale Court', units: '120' }).errors.authorize, 'Authorize the charge to add the property.'); // never without it
  assert.equal(validateProperty({ name: 'Sundale Court', units: '120', authorized: false }).ok, false);
  assert.equal(validateProperty({ name: '', units: '10', authorized: true }).errors.name, 'Enter the property name.');
  assert.ok(validateProperty({ name: 'x'.repeat(81), units: '10', authorized: true }).errors.name);
  assert.equal(validateProperty({ name: 'A', units: '', authorized: true }).errors.units, 'Enter the number of apartment units.');
  assert.ok(validateProperty({ name: 'A', units: '0', authorized: true }).errors.units);
  assert.ok(validateProperty({ name: 'A', units: '12.5', authorized: true }).errors.units);
  assert.ok(validateProperty({ name: 'A', units: '-3', authorized: true }).errors.units);
  assert.ok(validateProperty({ name: 'A', units: '5001', authorized: true }).errors.units);
  assert.ok(validateProperty({ name: 'A', units: '10', address: 'x'.repeat(121), authorized: true }).errors.address);
  assert.equal(validateProperty({ name: 'A', units: '10', address: '1 Main St', authorized: true }).ok, true);
});

test('document storage: ok, near at 90%, full when there is no room; a file must fit', () => {
  assert.equal(storageState(5, 10), 'ok');
  assert.equal(storageState(9, 10), 'near');
  assert.equal(storageState(9.4, 10), 'near');
  assert.equal(storageState(10, 10), 'full');
  assert.equal(storageState(12, 10), 'full');
  assert.equal(fits(9.4, 10, 10 * 1024 * 1024), true);
  assert.equal(fits(9.995, 10, 10 * 1024 * 1024), false);
  assert.equal(fits(29.9, 30, 50e6), true);
  assert.equal(fits(29.9, 30, 150e6), false);
  assert.equal(bytesToGb(2e9), 2);
  assert.equal(storageUsedGb([]), 9.4);
  assert.equal(storageUsedGb([{ size: 5e8 }, { size: 1e8 }, null, {}]), 10);
  assert.equal(storageUsedGb(undefined), 9.4);
  assert.equal(gbLabel(9.4), '9.4 GB');
  assert.equal(gbLabel(30), '30 GB');
});

test('money reads in dollars', () => {
  assert.equal(money(50), '$50.00');
  assert.equal(money(1234.5), '$1,234.50');
  assert.equal(signed(25), '+$25.00');
  assert.equal(signed(-5), '-$5.00');
  assert.equal(signed(0), '+$0.00');
});
