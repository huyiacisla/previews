// A resident is never told which member of the staff they are talking to: the staff are one "Property team".
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/messaging/store.js';
import { createMemoryBus } from '../src/messaging/transport.js';

const STAFF_NAMES = ['Jordan Lee', 'Sam Okafor'];
const STAFF_TITLES = ['Property Manager', 'Leasing Agent'];

test('lists, thread titles, bubbles and system notes show the staff as "Property team" to a resident, and by name to the staff', () => {
  const bus = createMemoryBus();
  const store = createStore({ transport: bus.connect(), now: () => Date.UTC(2026, 10, 9, 15, 0, 0) });
  const list = store.listFor('res-3');
  assert.ok(list.length > 0, 'the sample has chats for this resident');
  for (const row of list) {
    for (const n of STAFF_NAMES) assert.ok(!String(row.title).includes(n) && !String(row.subtitle).includes(n) && !(row.avatar && String(row.avatar.name).includes(n)), `${n} in a row of the list`);
    for (const t of STAFF_TITLES) assert.ok(!String(row.subtitle).includes(t), `${t} in a row of the list`);
  }
  for (const row of list) {
    const t = store.get(row.id, 'res-3');
    if (!t) continue;
    for (const m of t.messages) {
      const label = `${m.author ? m.author.name : ''} ${m.kind === 'system' ? m.text : ''} ${m.replyPreview ? m.replyPreview.who : ''}`;
      for (const n of STAFF_NAMES) assert.ok(!label.includes(n), `${n} in a message of ${row.id}`);
    }
  }
  // a resolve line and the Ticket box, for every resident of the sample
  for (const rid of ['res-1', 'res-2', 'res-3']) {
    for (const r of store.listFor(rid)) {
      const t = store.get(r.id, rid);
      for (const m of (t ? t.messages : [])) for (const n of STAFF_NAMES) assert.ok(!(m.kind === 'system' && String(m.text).includes(n)), `${n} in a system line for ${rid}`);
    }
    for (const row of store.ticketBox(rid)) for (const n of STAFF_NAMES) assert.ok(!String(row.assignee).includes(n) && !String(row.assigneeName).includes(n), `${n} in the Ticket box of ${rid}`);
  }
  // inside the staff the names stay
  const staffList = store.listFor('stf-1');
  assert.ok(staffList.some((r) => /Morgan Ellis|Priya Nair|Alex Rivera/.test(r.title)), 'staff see the residents by name');
});
