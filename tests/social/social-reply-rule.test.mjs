// "Who can reply" in the Staff's Social settings decides who may answer the posts the property team wrote.

import assert from "node:assert/strict";
import test from "node:test";
import { PERSONAS } from "../../src/features/messaging/personas.js";
import { ensureFeed } from "../../src/features/social/seed.js";
import { addReply, replyBlockedBy, timeline } from "../../src/features/social/store.js";

const mem = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const NOW = Date.UTC(2026, 10, 9, 10, 0, 0);

test("Everyone: a resident replies to a post of the property team; Staff in my workspace: not; Mentioned only: only when named", () => {
  const s = mem();
  ensureFeed(s, Date.UTC(2026, 10, 9, 9, 0, 0));
  const ours = timeline(s, "res-1", { now: NOW }).find((p) => p.by === "me");
  assert.ok(ours, "a post of the property team");
  const res = PERSONAS.find((p) => p.id === "res-1");

  s.setItem("eso-social", JSON.stringify({ posts: { reply: "everyone" } }));
  assert.equal(addReply(s, "res-1", ours.id, "Thanks!", NOW).ok, true);

  s.setItem("eso-social", JSON.stringify({ posts: { reply: "workspace" } }));
  const w = addReply(s, "res-1", ours.id, "Hello", NOW + 1);
  assert.equal(w.ok, false);
  assert.match(w.reason, /property team/);

  s.setItem("eso-social", JSON.stringify({ posts: { reply: "mentioned" } }));
  assert.match(replyBlockedBy(s, "res-1", { by: "me", text: "Hello everyone" }), /mentioned/);
  assert.equal(replyBlockedBy(s, "res-1", { by: "me", text: `Please see @${res.name.split(" ")[0]} about this` }), "");
  assert.equal(replyBlockedBy(s, "res-1", { by: "priya", text: "no rule on neighbors" }), "", "the rule is about the posts of the property team only");
});
