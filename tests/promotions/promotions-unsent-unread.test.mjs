// A message that was unsent (or hidden "for me") is not news: it does not count on the badge, the list or the bell. Run with: npm test

import assert from "node:assert/strict";
import test from "node:test";
import { createStore } from "../../src/features/messaging/store.js";
import { createMemoryBus } from "../../src/features/messaging/transport.js";

const setup = () => {
  let t = Date.UTC(2026, 10, 16, 9, 0, 0);
  const store = createStore({ transport: createMemoryBus().connect(), now: () => t });
  store.reset({ empty: true });
  const tick = (ms = 1000) => (t += ms);
  return { store, tick };
};
const claim = { title: "Mallard Pointe Valet", code: "MALLA10", claimId: "r_res_1_parking0_1", promoId: "parking0", status: "Pending", at: "2026-11-16T09:13:00.000Z" };

test("the other side does not see an unread count for a message that was unsent", () => {
  const { store, tick } = setup();
  const r = store.askAboutClaim("res-1", claim);
  assert.ok(r.ok);
  const id = r.convId;
  tick();
  assert.ok(store.claim(id, "stf-1").ok);
  store.markRead(id, "stf-1");
  tick();
  const sent = store.send(id, "res-1", "please look at my claim");
  assert.ok(sent.ok, JSON.stringify(sent));
  assert.equal(store.unreadCount(id, "stf-1"), 1);
  const mid = store.get(id, "res-1").messages.find((m) => m.text === "please look at my claim").id;
  tick();
  assert.ok(store.unsend(id, "res-1", mid).ok);
  assert.equal(store.unreadCount(id, "stf-1"), 0, "an unsent message is not unread");
  assert.equal(store.badgeCount("stf-1"), 0, "nor on the badge");
  assert.ok(!store.alertsFor("stf-1", { since: 0 }).some((a) => a.convId === id && a.unread > 0), "nor on the bell");
});

test("a message hidden with 'delete for me' is not unread for the person who hid it", () => {
  const { store, tick } = setup();
  const r = store.askAboutClaim("res-1", claim);
  const id = r.convId;
  tick();
  store.claim(id, "stf-1");
  store.markRead(id, "stf-1");
  tick();
  store.send(id, "res-1", "second question");
  const mid = store.get(id, "stf-1").messages.find((m) => m.text === "second question").id;
  assert.equal(store.unreadCount(id, "stf-1"), 1);
  assert.ok(store.hideMessage(id, "stf-1", mid).ok);
  assert.equal(store.unreadCount(id, "stf-1"), 0, "a message the person removed from their own view is not news");
});

test("alerts count unread like the badge, and 'mark as unread' skips a message that was unsent", () => {
  const { store, tick } = setup();
  const r = store.askAboutClaim("res-1", claim);
  const id = r.convId;
  tick();
  store.claim(id, "stf-1");
  store.markRead(id, "stf-1");
  tick();
  store.send(id, "res-1", "first");
  tick();
  store.send(id, "res-1", "second");
  const msgs = () => store.get(id, "res-1").messages;
  const second = msgs().find((m) => m.text === "second");
  tick();
  assert.ok(store.unsend(id, "res-1", second.id).ok);
  assert.equal(store.unreadCount(id, "stf-1"), 1, "only the first is news");
  const a = store.alertsFor("stf-1", { since: 0 }).find((x) => x.convId === id);
  assert.equal(a && a.unread, 1, "the bell says the same as the badge");
  store.markRead(id, "stf-1");
  store.markUnread(id, "stf-1");
  assert.equal(store.unreadCount(id, "stf-1"), 1, "mark as unread brings back the real message, not the unsent one");
});
