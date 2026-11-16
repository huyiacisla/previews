// "Show when I have read a message" off: the person still reads it (their badge clears), but the sender is not told it was read.

import assert from "node:assert/strict";
import test from "node:test";
import { createStore } from "../../src/features/messaging/store.js";
import { createMemoryBus } from "../../src/features/messaging/transport.js";

const mk = () => createStore({ transport: createMemoryBus().connect(), now: () => Date.UTC(2026, 10, 9, 15, 0, 0) });

// every message somebody else wrote that this person has not read: { id (conversation), author, msgId }
function unreadFor(store, me) {
  const out = [];
  for (const row of store.listFor(me)) {
    const t = store.get(row.id, me);
    for (const m of t ? t.messages : []) if (!m.mine && m.kind !== "system" && m.from !== "bot" && !(m.readBy && m.readBy[me])) out.push({ id: row.id, author: m.from, msgId: m.id });
  }
  return out;
}
const deliveryAfter = (hit, receipt) => {
  const store = mk();
  store.markRead(hit.id, "stf-1", { receipt });
  const seen = store.get(hit.id, hit.author);
  return { delivery: seen && seen.messages.find((x) => x.id === hit.msgId).delivery, readByReader: !!store.get(hit.id, "stf-1").messages.find((x) => x.id === hit.msgId).readBy["stf-1"] };
};

test('a receipt can tell the sender "read"; with receipts off the person reads it all the same and the sender is not told', () => {
  const hits = unreadFor(mk(), "stf-1");
  assert.ok(hits.length > 0, "the sample gives the staff person something unread");
  const hit = hits.find((h) => deliveryAfter(h, true).delivery === "read");
  assert.ok(hit, 'at least one message whose sender is told "read" once the staff person reads it');
  const quiet = deliveryAfter(hit, false);
  assert.notEqual(quiet.delivery, "read");
  assert.equal(quiet.readByReader, true, "read for the reader either way (their badge goes down)");
});
