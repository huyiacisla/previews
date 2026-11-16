import assert from "node:assert/strict";
import { test } from "node:test";
import { accessScreen, guardAccess, portalOf } from "../src/shared/js/access-guard.js";
import { endProperty } from "../src/shared/js/property-lifecycle.js";

const store = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), keys: () => [...m.keys()] };
};
// a document with just enough of the DOM for the guard
const fakeDoc = () => {
  const el = (tag) => ({
    tag,
    children: [],
    style: {},
    attrs: {},
    textContent: "",
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    append(...c) {
      this.children.push(...c);
    },
    replaceChildren(...c) {
      this.children = c;
    },
  });
  const root = {
    attrs: { "data-eso-wait": "" },
    removeAttribute(k) {
      delete this.attrs[k];
    },
  };
  return { title: "", documentElement: root, body: el("body"), createElement: el };
};

test("the wording is the one the project owner asked for", () => {
  assert.equal(accessScreen.title, "Sorry, you no longer have access.");
  assert.match(accessScreen.text, /signed out/);
});

test("which portal a page belongs to", () => {
  assert.equal(portalOf("/resident/home.html"), "resident");
  assert.equal(portalOf("/admin/health.html"), "admin");
  assert.equal(portalOf("/"), null);
});

test("when the property has not ended, the page is left alone", () => {
  const d = fakeDoc();
  assert.equal(guardAccess({ pathname: "/resident/home.html", storage: store(), doc: d }), false);
  assert.equal(d.body.children.length, 0);
});

test("when the property has ended, Resident and Staff pages show the message and nothing else; Admin and Client are not touched", () => {
  const s = store({ "eso-feed": "{}" });
  endProperty(s, "main", { by: "Taylor Brooks" });
  for (const path of ["/resident/home.html", "/staff/dashboard.html", "/resident/messages-content.html"]) {
    const d = fakeDoc();
    assert.equal(guardAccess({ pathname: path, storage: s, doc: d }), true, path);
    assert.equal(d.body.children.length, 1, "one thing on the page");
    const text = JSON.stringify(d.body.children);
    assert.match(text, /Sorry, you no longer have access\./);
    assert.ok(!("data-eso-wait" in d.documentElement.attrs), "the page is shown, not held back");
  }
  for (const path of ["/admin/health.html", "/client/dashboard.html", "/index.html"]) {
    const d = fakeDoc();
    assert.equal(guardAccess({ pathname: path, storage: s, doc: d }), false, path);
  }
});

test("unreadable storage does not lock anybody out", () => {
  const broken = {
    getItem() {
      throw new Error("blocked");
    },
    keys() {
      return [];
    },
  };
  assert.equal(guardAccess({ pathname: "/resident/home.html", storage: broken, doc: fakeDoc() }), false);
});
