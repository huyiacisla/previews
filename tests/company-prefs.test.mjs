// What the company decided for its residents (Client > Workspace settings > Residents) reaches Social, Promotions and Messages.

import "./promotions/_clock.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { createStore } from "../src/features/messaging/store.js";
import { createMemoryBus } from "../src/features/messaging/transport.js";
import { readConfig } from "../src/features/promotions/store.js";
import { socialOn } from "../src/features/social/store.js";
import { companyPrefs } from "../src/shared/js/company-prefs.js";

const mem = (o = {}) => {
  const m = new Map(Object.entries(o).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};

test("every switch starts on, off means off, and broken storage means the defaults", () => {
  assert.deepEqual(companyPrefs(mem()), { mgmt: true, social: true, promos: true, tickets: true, botFirst: true, mfa: true, name: "AMC LLC" });
  const off = companyPrefs(mem({ "client:eso-proto": { cwMgmt: false, cwSocial: 0, cwPromos: "0", cwTickets: false, cwBotFirst: false, cwMfa: false, cwName: " Riverbend Group " } }));
  assert.deepEqual(off, { mgmt: false, social: false, promos: false, tickets: false, botFirst: false, mfa: false, name: "Riverbend Group" });
  assert.equal(companyPrefs({ getItem: () => "{not json" }).social, true);
});

test("Social and Promotions are off for the residents when the company turns them off", () => {
  assert.equal(socialOn(mem()), true);
  assert.equal(socialOn(mem({ "client:eso-proto": { cwSocial: false } })), false);
  assert.equal(socialOn(mem({ "eso-social": { on: false } })), false, "the property's own switch still works");
  assert.equal(readConfig(mem()).show, true);
  assert.equal(readConfig(mem({ "client:eso-proto": { cwPromos: false } })).show, false);
  assert.equal(readConfig(mem({ "eso-proto": { promoShow: false } })).show, false);
});

test('"Assistant answers first" off: a new chat starts by asking where to send the message', () => {
  for (const [first, expected] of [
    [true, /EasySpotOps assistant/],
    [false, /Who should I pass your message to/],
  ]) {
    const store = createStore({ transport: createMemoryBus().connect(), now: () => Date.UTC(2026, 10, 9, 15, 0, 0), config: { botFirst: () => first } });
    const id = store.ensureSession("res-1").convId;
    const bots = store.get(id, "res-1").messages.filter((m) => m.kind === "bot");
    assert.match(bots[0].text, expected, `botFirst=${first}`);
    if (!first) assert.deepEqual(bots[bots.length - 1].choices.map((c) => c.id).slice(0, 2), ["route:property", "route:platform"]);
  }
});

test("a company that requires 2-step verification: the person cannot turn it off, and the page says why (Staff and Client only)", async () => {
  const { readFileSync } = await import("node:fs");
  const js = readFileSync(new URL("../src/staff/account-settings.staff.js", import.meta.url), "utf8");
  assert.ok(
    js.includes("/^\\/(staff|client)\\//.test(globalThis.location.pathname) && companyPrefs(globalThis.localStorage).mfa === true"),
    "only Staff and Client people, and only when the company requires it",
  );
  const html = readFileSync(new URL("../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(
    html.includes('if(window._companyMfa&&_companyMfa()){toast("Your company requires 2-step verification, so it cannot be turned off here.");return}'),
    "the off action is refused even if the button were reached",
  );
  assert.ok(html.includes('${window._companyMfa&&_companyMfa()?"":`<button class="btn out2 dg" data-sec2off>Turn off 2-step</button>`}'), "the button is not drawn");
  assert.ok(html.includes("Your company requires 2-step verification for everyone, so it cannot be turned off here."));
});
