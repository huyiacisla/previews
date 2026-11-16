// Resident profile and personalization (src/features/settings/prefs.js). Run with: npm test

import assert from "node:assert/strict";
import test from "node:test";
import { demoEmail, isDark, phoneError, prefKey, readPrefs, savePrefs } from "../src/features/settings/prefs.js";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)) };
};

test("defaults, and values that do not belong are ignored on read", () => {
  const s = memory();
  assert.deepEqual(readPrefs(s, "res-1"), { theme: "system", phone: "", contact: "app", contrast: false, reduceMotion: false });
  s.setItem(prefKey("res-1"), JSON.stringify({ theme: "neon", contact: "pigeon", contrast: "yes", reduceMotion: 1 }));
  assert.deepEqual(readPrefs(s, "res-1"), { theme: "system", phone: "", contact: "app", contrast: false, reduceMotion: false });
  s.setItem(prefKey("res-1"), "{broken");
  assert.equal(readPrefs(s, "res-1").theme, "system");
});

test("save keeps known fields only, per resident, and rejects bad values", () => {
  const s = memory();
  assert.equal(savePrefs(s, "res-1", { theme: "dark", contrast: true, reduceMotion: true }), true);
  assert.equal(savePrefs(s, "res-1", { contact: "email", phone: "+1 (916) 555-0142" }), true);
  assert.deepEqual(readPrefs(s, "res-1"), { theme: "dark", phone: "+1 (916) 555-0142", contact: "email", contrast: true, reduceMotion: true });
  assert.equal(readPrefs(s, "res-2").theme, "system", "another resident is untouched");
  assert.equal(savePrefs(s, "res-1", { theme: "neon" }), false);
  assert.equal(savePrefs(s, "res-1", { contrast: "yes" }), false);
  assert.equal(savePrefs(s, "res-1", { phone: "abc" }), false);
  assert.equal(readPrefs(s, "res-1").theme, "dark", "a rejected save changes nothing");
  assert.equal(
    savePrefs(
      {
        getItem: () => null,
        setItem: () => {
          throw new Error("full");
        },
      },
      "res-1",
      { theme: "dark" },
    ),
    false,
  );
});

test("phone: optional, 7 to 15 digits, usual punctuation only", () => {
  assert.equal(phoneError(""), "");
  assert.equal(phoneError("+1 (916) 555-0142"), "");
  assert.match(phoneError("123"), /7 to 15/);
  assert.match(phoneError("call me"), /digits/);
  assert.match(phoneError("1".repeat(16)), /7 to 15/);
});

test("theme: system follows the device; email is made from the name", () => {
  assert.equal(isDark("dark", false), true);
  assert.equal(isDark("light", true), false);
  assert.equal(isDark("system", true), true);
  assert.equal(demoEmail("Priya Nair"), "priya.nair@mail.example");
});
