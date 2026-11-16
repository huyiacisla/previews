import assert from "node:assert/strict";
import { test } from "node:test";
import { applyCart, newPropertyId, normalizePurchased, propertiesCount, recurring } from "../src/features/capacity/store.js";
import { modules } from "../src/features/health/health.js";
import { channels, monitor } from "../src/features/social/monitor.js";
import { ensureFeed, ensurePropertyFeed } from "../src/features/social/seed.js";
import { endProperty, hasLostAccess, isEnded, NO_ACCESS, portfolio, removeFromPortfolio, socialKeysOf, startOver } from "../src/shared/js/property-lifecycle.js";

const store = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), keys: () => [...m.keys()] };
};
const withProps = (names) => {
  let purchased = normalizePurchased(null);
  purchased = applyCart(purchased, { properties: names.map((n) => ({ name: n, units: 10, address: "", authorized: true })) });
  const s = store({ "capacity-state:client": JSON.stringify(purchased), "eso-capacity:client": JSON.stringify(purchased) });
  purchased.properties.forEach((p) => ensurePropertyFeed(s, p.id, p.name));
  ensureFeed(s);
  s.setItem("eso-res-social:res-1", JSON.stringify({ replies: {} }));
  return { s, purchased };
};

test("a property keeps one id for good: it does not depend on its place in the list", () => {
  const a = newPropertyId(1000, () => 0.1),
    b = newPropertyId(1000, () => 0.2);
  assert.notEqual(a, b);
  const { purchased } = withProps(["Harbor Court", "Pine Ridge"]);
  const ids = purchased.properties.map((p) => p.id);
  assert.equal(new Set(ids).size, 2);
  // take the first one out of the list: the second keeps its id (so its feed is still its own)
  const without = normalizePurchased({ properties: [purchased.properties[1]] });
  assert.equal(without.properties[0].id, ids[1]);
});

test("a property saved before ids existed is named once by its place, and then keeps that", () => {
  const p = normalizePurchased({
    properties: [
      { name: "Old A", units: 1 },
      { name: "Old B", units: 1 },
    ],
  });
  assert.deepEqual(
    p.properties.map((x) => x.id),
    ["extra-1", "extra-2"],
  );
  assert.deepEqual(
    normalizePurchased(JSON.parse(JSON.stringify(p))).properties.map((x) => x.id),
    ["extra-1", "extra-2"],
  );
});

test("ending a property seals its Social and nothing of another property", () => {
  const { s, purchased } = withProps(["Harbor Court", "Pine Ridge"]);
  const [a, b] = purchased.properties;
  const r = endProperty(s, a.id, { by: "Taylor Brooks", name: a.name });
  assert.equal(r.ok, true);
  assert.equal(r.sealed, 1);
  assert.equal(s.getItem(`eso-feed:${a.id}`), null, "the apps no longer find it");
  assert.ok(s.getItem(`eso-sealed:${a.id}:eso-feed:${a.id}`), "sealed, not deleted");
  assert.ok(s.getItem(`eso-feed:${b.id}`), "the other property is untouched");
  assert.ok(s.getItem("eso-feed"), "the first property is untouched");
  assert.equal(isEnded(s, a.id), true);
  assert.equal(isEnded(s, b.id), false);
  assert.equal(endProperty(s, a.id).reason, "already_ended");
});

test("an ended property is out of the account: not counted, not charged, and Admin sees it as ended and with no data", () => {
  const { s, purchased } = withProps(["Harbor Court", "Pine Ridge"]);
  const before = { count: propertiesCount(purchased), price: recurring(purchased) };
  endProperty(s, purchased.properties[0].id, { now: 5000 });
  const p = normalizePurchased(JSON.parse(s.getItem("capacity-state:client")));
  assert.equal(propertiesCount(p), before.count - 1);
  assert.ok(recurring(p) < before.price);
  const list = channels(s).list;
  assert.equal(list.find((c) => c.id === purchased.properties[0].id).ended, true);
  assert.equal(monitor(s, purchased.properties[0].id).live, false);
  assert.ok(!modules(s).some((m) => m.id === `social-${purchased.properties[0].id}`), "System health no longer checks it");
});

test("ending the first property signs out its people: the apps ask hasLostAccess, and the data is sealed", () => {
  const { s } = withProps([]);
  assert.equal(hasLostAccess(s), false);
  assert.ok(socialKeysOf(s, "main").includes("eso-res-social:res-1"));
  assert.equal(endProperty(s, "main", { by: "Taylor Brooks" }).ok, true);
  assert.equal(hasLostAccess(s), true);
  assert.equal(s.getItem("eso-feed"), null);
  assert.equal(s.getItem("eso-res-social:res-1"), null);
  assert.match(NO_ACCESS, /no longer have access/);
});

test("the client removes a property from its portfolio: the same end as Admin's, counted and charged no more, and the others stay", () => {
  const { s, purchased } = withProps(["Harbor Court", "Pine Ridge"]);
  assert.deepEqual(
    portfolio(s).active.map((x) => x.name),
    ["Mallard Pointe at Riverbend", "Harbor Court", "Pine Ridge"],
  );
  const r = removeFromPortfolio(s, purchased.properties[0].id, { by: "AMC LLC" });
  assert.equal(r.ok, true);
  const pf = portfolio(s);
  assert.deepEqual(
    pf.active.map((x) => x.name),
    ["Mallard Pointe at Riverbend", "Pine Ridge"],
  );
  assert.equal(pf.removed.length, 1);
  assert.equal(pf.removed[0].by, "AMC LLC");
  assert.equal(isEnded(s, purchased.properties[0].id), true);
  assert.equal(propertiesCount(normalizePurchased(JSON.parse(s.getItem("capacity-state:client")))), 2);
  assert.equal(removeFromPortfolio(s, purchased.properties[0].id).reason, "not_in_portfolio");
});

test("removing the first property takes it out of the count, locks its people out, and the last property cannot be removed", () => {
  const { s, purchased } = withProps(["Harbor Court"]);
  assert.equal(removeFromPortfolio(s, "main").ok, true);
  assert.equal(hasLostAccess(s), true);
  assert.equal(propertiesCount(normalizePurchased(JSON.parse(s.getItem("eso-capacity:client")))), 1, "only Harbor Court is left");
  const last = removeFromPortfolio(s, purchased.properties[0].id);
  assert.equal(last.ok, false);
  assert.equal(last.reason, "last_property");
  assert.equal(isEnded(s, purchased.properties[0].id), false);
  // a new owner takes the first one over: it is counted again
  startOver(s, "main");
  assert.equal(propertiesCount(normalizePurchased(JSON.parse(s.getItem("eso-capacity:client")))), 2);
});

test("nothing makes a feed for an ended property again: a page that only reads must not bring back what was cut off", () => {
  const { s, purchased } = withProps(["Harbor Court"]);
  endProperty(s, "main");
  endProperty(s, purchased.properties[0].id);
  assert.equal(ensureFeed(s), false);
  assert.equal(ensurePropertyFeed(s, purchased.properties[0].id, "Harbor Court"), false);
  assert.equal(s.getItem("eso-feed"), null);
  assert.equal(s.getItem(`eso-feed:${purchased.properties[0].id}`), null);
  monitor(s, "main");
  channels(s);
  modules(s); // the Admin pages read too
  assert.equal(s.getItem("eso-feed"), null);
});

test("ending the first property also seals its promotions and what each Resident chose and saw; Messages and Documents are left alone", () => {
  const { s } = withProps([]);
  const keys = ["eso-pmc-saved", "eso-pmc-cats", "eso-res-promo:res-1", "eso-res-social-seen:res-1", "eso-res-privacy:res-1", "eso-res-privacy-log:res-1", "eso-res-pref:res-1"];
  for (const k of keys) s.setItem(k, '{"x":1}');
  s.setItem("eso-msg-v1", '{"convs":{},"msgs":{}}');
  s.setItem("eso-docs:client", "[]");
  s.setItem("eso-notif-read:res-1", "{}");
  const r = endProperty(s, "main");
  assert.equal(r.ok, true);
  for (const k of keys) {
    assert.equal(s.getItem(k), null, `${k} is cut off`);
    assert.ok(s.getItem(`eso-sealed:main:${k}`), `${k} is sealed, not deleted`);
  }
  assert.ok(s.getItem("eso-msg-v1"), "Messages is one shared document: not touched");
  assert.ok(s.getItem("eso-docs:client"), "Documents belong to the company: not touched");
  assert.ok(s.getItem("eso-notif-read:res-1"));
});

test("another property has only its Social to seal; the first property's promotions and residents are not its", () => {
  const { s, purchased } = withProps(["Harbor Court"]);
  s.setItem("eso-pmc-saved", "[]");
  s.setItem("eso-res-promo:res-1", "{}");
  endProperty(s, purchased.properties[0].id);
  assert.ok(s.getItem("eso-pmc-saved"));
  assert.ok(s.getItem("eso-res-promo:res-1"));
});

test("a new owner starts from nothing: the old posts do not come back", () => {
  const { s } = withProps([]);
  const old = JSON.parse(s.getItem("eso-feed")).posts.length;
  assert.ok(old > 0);
  endProperty(s, "main");
  assert.equal(startOver(s, "main").ok, true);
  assert.equal(hasLostAccess(s), false);
  assert.equal(s.getItem("eso-feed"), null, "nothing is restored");
  ensureFeed(s); // what the apps do on their first visit: a feed of their own
  assert.equal(startOver(s, "main").reason, "not_ended");
});

test("another property is not started over: its place is taken by a new property with a new id", () => {
  const { s, purchased } = withProps(["Harbor Court"]);
  endProperty(s, purchased.properties[0].id);
  assert.equal(startOver(s, purchased.properties[0].id).reason, "new_property");
  const again = applyCart(normalizePurchased(JSON.parse(s.getItem("capacity-state:client"))), { properties: [{ name: "Harbor Court", units: 10, address: "", authorized: true }] });
  const ids = again.properties.map((p) => p.id);
  assert.equal(new Set(ids).size, 2, "the new owner of the same place has a different id");
});
