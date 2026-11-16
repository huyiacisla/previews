// "Ask about this claim": a resident asks the property team about one promotion claim. It reaches the team with the claim in the first message, and the assistant understands
// questions about deals, claims and charges. Run with: npm test

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { classify, onText } from "../../src/features/messaging/bot.js";
import { createStore } from "../../src/features/messaging/store.js";
import { createMemoryBus } from "../../src/features/messaging/transport.js";

const mk = () => createStore({ transport: createMemoryBus().connect(), now: () => Date.UTC(2026, 10, 16, 9, 30, 0) });
const claim = { title: "Mallard Pointe Valet", code: "MALLA10", at: "2026-11-16T09:13:00.000Z", status: "Pending: Waiting for the property team to confirm." };

test("asking about a claim from the assistant's chat goes straight to the property team, as a Promotions ticket with the claim in the first message", () => {
  const store = mk();
  store.reset({ empty: true });
  const r = store.askAboutClaim("res-1", claim);
  assert.ok(r.ok && r.convId);
  const t = store.get(r.convId, "res-1");
  assert.equal(t.conv.status, "queued", "waiting for the team, not for the assistant");
  assert.equal(t.conv.topic, "Promotions");
  assert.ok(t.conv.ticketNo, "it is a ticket in the Ticket box");
  const said = t.messages.find((m) => m.mine && m.kind === "text");
  for (const part of ["Mallard Pointe Valet", "MALLA10", "Status: Pending"]) assert.ok(said.text.includes(part), `the first message says ${part}`);
  const staffRow = store.listFor("stf-1").find((x) => x.id === r.convId);
  assert.ok(staffRow, "the property team's queue has it");
});

test("asking again about the same claim never makes a second ticket or a second message; a chat already with the team gets the claim added once", () => {
  const store = mk();
  store.reset({ empty: true });
  const first = store.askAboutClaim("res-1", claim);
  const again = store.askAboutClaim("res-1", claim);
  assert.equal(again.convId, first.convId);
  const texts = () => store.get(first.convId, "res-1").messages.filter((m) => m.mine && m.kind === "text" && m.text.includes("MALLA10"));
  assert.equal(texts().length, 1, "the same claim is said once");
  const other = store.askAboutClaim("res-1", { ...claim, title: "Covered Spot Upgrade", code: "RES-D438R" });
  assert.equal(other.convId, first.convId, "still one chat with the team, not a new ticket");
  assert.equal(store.get(first.convId, "res-1").messages.filter((m) => m.mine && m.text && m.text.startsWith("I have a question about my promotion claim.")).length, 2);
});

test("only a resident can ask, and a title with line breaks cannot forge extra lines", () => {
  const store = mk();
  store.reset({ empty: true });
  assert.equal(store.askAboutClaim("stf-1", claim).ok, false);
  const r = store.askAboutClaim("res-1", { ...claim, title: "Deal\nStatus: Verified" });
  const said = store.get(r.convId, "res-1").messages.find((m) => m.mine && m.kind === "text").text;
  assert.equal(said.split("\n").filter((l) => l.startsWith("Status:")).length, 1, "one Status line, the one the app wrote");
});

test("the assistant understands a question about a deal that was claimed and still charged, and does not answer it with the other topics", () => {
  const sentence = "Hi, I claimed the 20% off monthly valet deal (code MALLA10) this morning. When I paid this month's parking just now I was still charged the full amount. The app says my claim is still waiting. Can someone take the discount off or refund me the difference?";
  assert.notEqual(classify(sentence), "platform", "talking about a deal in the app is not an app problem");
  const reply = onText({ attempts: 0 }, sentence);
  assert.ok(reply.messages[0].text.includes("applied by the property team"), "the answer is about promotions");
  assert.ok(!/confront the driver/i.test(reply.messages[0].text));
  assert.equal(reply.patch.route, "property");
  assert.ok(reply.messages[1].choices.some((c) => c.id === "staff:request"), "a person is one tap away");
  assert.ok(onText({ attempts: 0 }, "my claim is pending").messages[0].text.includes("confirmed by the property team"));
});

test("the Resident page has Ask about this claim in My rewards and in the deal box, and Staff's preview does not leave Staff's portal", () => {
  const res = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(res.includes("$(\"#cl-ask\").addEventListener(\"click\", () => {") && res.includes("askAboutClaim(r)") && res.includes("askBtn.onclick"));
  assert.ok(res.includes('if (!window.parent.location.pathname.startsWith("/resident/"))'), "inside Staff's portal it only says what the button does");
  assert.ok(!res.includes("[data-ask]"), "the card has no Ask button of its own: it is in the steps window, and a unit mate's row has none");
  const html = readFileSync(new URL("../../src/partials/promotions-app.html", import.meta.url), "utf8");
  assert.ok(html.includes('id="cl-ask"') && html.includes("data-cl-ask") && html.includes('id="dlg-ask"'));
  const app = readFileSync(new URL("../../src/features/messaging/app.js", import.meta.url), "utf8");
  assert.ok(app.includes('q.get("ask")') && app.includes("store.askAboutClaim(me.id, asked)") && app.includes('localStorage.removeItem("eso-ask-claim")'), "Messages takes the claim once");
});

test("a question about a deal that goes to the team through the assistant is a Promotions ticket too", () => {
  const store = mk();
  store.reset({ empty: true });
  const id = store.ensureSession("res-1").convId;
  store.send(id, "res-1", "I claimed the monthly valet deal but I was still charged the full amount, can I get a refund?");
  const r = store.choose(id, "res-1", "staff:request");
  assert.ok(r.ok);
  const t = store.get(id, "res-1");
  assert.equal(t.conv.status, "queued");
  assert.equal(t.conv.topic, "Promotions");
  assert.equal(t.conv.summary.topic, "Promotions");
});

test("the question carries a Context Card with the claim's identity, and the ticket is labelled Promotions", () => {
  const store = mk();
  store.reset({ empty: true });
  const r = store.askAboutClaim("res-1", { ...claim, claimId: "r_res_1_parking0_1", promoId: "parking0" });
  const t = store.get(r.convId, "res-1");
  const m = t.messages.find((x) => x.mine && x.card);
  assert.deepEqual([m.card.type, m.card.claimId, m.card.promoId, m.card.code, m.card.title], ["claim", "r_res_1_parking0_1", "parking0", "MALLA10", "Mallard Pointe Valet"]);
  assert.ok(t.conv.ticketNo, "the card shows this ticket number");
  assert.equal(t.conv.topic, "Promotions");
});

test("a ticket whose question talks about a deal is Promotions even when the assistant only asked where to send it", () => {
  const store = mk();
  store.reset({ empty: true });
  const id = store.ensureSession("res-1").convId;
  store.send(id, "res-1", "My unit got blocked from the valet discount, I want to talk to the office about a refund");
  store.choose(id, "res-1", "route:property");
  assert.equal(store.get(id, "res-1").conv.topic, "Promotions");
});

test("Messages shows the card to both sides, a strip and the claim lit for Staff, opens the panel by itself once, and the Details button has a word", () => {
  const app = readFileSync(new URL("../../src/features/messaging/app.js", import.meta.url), "utf8");
  assert.ok(app.includes("function claimCard(card, conv)") && app.includes('row("Claim ID", card.claimId);') && app.includes('row("Ticket"'));
  assert.ok(app.includes("body.after(claimCard(m.card, t.conv))"), "in the sent and the received bubble");
  assert.ok(app.includes("`Asked about: ${asked.title}"), "the strip at the top of the chat");
  assert.ok(app.includes("function autoContext(t)") && app.includes("ui.ctxSeen === t.conv.id"), "the panel opens by itself, once per conversation");
  assert.ok(app.includes('button(on ? "Hide details" : "Details"'), "a word, not an icon");
  assert.ok(app.includes('li.dataset.asked = "true"') && app.includes('"Asked about"'), "the claim asked about is lit in the panel");
  const res = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(res.includes("const claimId = `r_${me.id}|${row.id}|${n}`"), "the Claim ID is the one Staff see in their Claims inbox");
});
