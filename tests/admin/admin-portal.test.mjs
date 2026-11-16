// Admin portal: its own Notifications (bell and page) and its own Settings addresses.

import assert from "node:assert/strict";
import test from "node:test";
import { pickPersona } from "../../src/features/messaging/personas.js";
import { createStore } from "../../src/features/messaging/store.js";
import { createMemoryBus } from "../../src/features/messaging/transport.js";
import { messengerItems, socialItems } from "../../src/features/notifications/live.js";
import { buildAll, CATEGORIES, counts, ROLE_CATEGORIES, ROLE_PROPERTIES, TONES } from "../../src/features/notifications/store.js";
import { backTarget } from "../../src/shared/js/back-target.js";
import { ADMIN_ROUTES, hashForPath, pathForHash } from "../../src/shared/js/staff-routes.js";

const NOW = Date.UTC(2026, 10, 13, 15, 0, 0);

test("the Admin has a notification list of its own: platform items as samples, no sample messages", () => {
  const list = buildAll(NOW, "admin");
  assert.ok(list.length >= 5);
  assert.ok(
    list.every((n) => ROLE_CATEGORIES.admin.includes(n.cat)),
    "only the Admin categories",
  );
  assert.ok(
    list.every((n) => CATEGORIES[n.cat] && TONES[n.cat]),
    "every category has a name and a colour",
  );
  assert.ok(
    list.some((n) => /32 platform health warnings/.test(n.title)),
    "the number the Command Center shows",
  );
  assert.equal(list.filter((n) => n.cat === "messages").length, 0, "messages come from the real Support queue, never from samples");
  assert.equal(ROLE_PROPERTIES.admin.length, 1, "no property filter");
  assert.equal(counts(list, {}).unread, 3);
});

test("a ticket a Client opens is an unread notification for every admin, and reading it clears it for that admin only", () => {
  const store = createStore({ transport: createMemoryBus().connect(), now: () => NOW });
  const a1 = pickPersona("admin", "adm-1");
  const a2 = pickPersona("admin", "adm-2");
  const r = store.startSupport("cli-1", { subject: "Cannot sign in", text: "The code never arrives." });
  for (const a of [a1, a2]) {
    const item = messengerItems(store, a).find((n) => n.convId === r.convId);
    assert.ok(item, `${a.name} is told`);
    assert.equal(item.read, false);
  }
  const all = buildAll(NOW, "admin", messengerItems(store, a1));
  assert.ok(all.some((n) => n.convId === r.convId && n.cat === "messages"));
  store.markRead(r.convId, "adm-1");
  assert.equal(messengerItems(store, a1).find((n) => n.convId === r.convId).read, true);
  assert.equal(messengerItems(store, a2).find((n) => n.convId === r.convId).read, false);
  assert.deepEqual(socialItems({ getItem: () => null }, "admin", a1), [], "an Admin has no Social");
});

test("Admin Settings addresses: the list and two sections have a path, the others stay under the page", () => {
  assert.equal(pathForHash("#/settings", "admin"), "/admin/settings.html");
  assert.equal(pathForHash("#/settings/personalize", "admin"), "/admin/settings/personalize.html");
  assert.equal(pathForHash("#/settings/general", "admin"), "/admin/settings/profile.html");
  assert.equal(pathForHash("#/settings/notifications", "admin"), null);
  assert.equal(pathForHash("#/workspace", "admin"), null, "an Admin has no workspace here");
  for (const [hash, path] of ADMIN_ROUTES) assert.equal(hashForPath(path, "admin"), hash);
});

test("Back in Admin Settings returns to the Admin page the person came from", () => {
  const base = { origin: "http://localhost:3590", pathname: "/admin/settings.html", portal: "admin", entryHash: "#/settings", hash: "#/settings" };
  for (const page of ["dashboard", "notifications", "messages", "tickets"]) assert.equal(backTarget({ ...base, referrer: `http://localhost:3590/admin/${page}.html` }), "history", page);
  assert.equal(backTarget({ ...base, referrer: "http://localhost:3590/staff/dashboard.html" }), "crumb", "never back into another portal");
  assert.equal(backTarget({ ...base, referrer: "http://localhost:3590/admin/dashboard.html", hash: "#/settings/personalize" }), "crumb");
});
