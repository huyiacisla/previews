// "Report to the property team": Admin tells the people who run a property about something found in System health or Social monitoring.
// Pure logic, no DOM, so node --test can run it. Admin does not change the property's data; it sends one message through the Messages that already
// exist (a direct thread from the Admin to a member of the property's team), with the finding, where it is and how to fix it, so the team can act.

import { PERSONAS } from "../messaging/personas.js";

export const MAX_TEXT = 2000; // the most one message can hold (messaging/store.js CONFIG.maxLen)

/** The person to tell for a property: its Property Manager. Only the first property has people in this preview; another property has no team yet. */
export function teamContact(channelId) {
  if (channelId && channelId !== "main") return null;
  return PERSONAS.find((p) => p.role === "staff" && /manager/i.test(p.title)) || PERSONAS.find((p) => p.role === "staff") || null;
}

/** The text of the message: who, which property, the note, then the finding. It is cut to fit one message and says so when it was cut. */
export function composeReport({ property, from, note = "", body = "", link = "" }) {
  const parts = [
    `${from || "EasySpotOps Admin"} from EasySpotOps writes about the Social of ${property}.`,
    String(note).trim() ? `Note: ${String(note).trim()}` : "",
    String(body).trim(),
    link ? `Details: ${link}` : "",
  ].filter(Boolean);
  const text = parts.join("\n\n");
  if (text.length <= MAX_TEXT) return { text, cut: false };
  const tail = "\n\n[Cut to fit one message. The full report is in System health.]";
  return { text: text.slice(0, MAX_TEXT - tail.length).trimEnd() + tail, cut: true };
}

/** A post as a finding: what it is, where, and who wrote it. */
export function postFinding(post) {
  const t = String(post.text || "")
    .replace(/\s+/g, " ")
    .trim();
  return `Post ${post.id} by ${post.author}: "${t.length > 160 ? `${t.slice(0, 159)}…` : t}"`;
}

/**
 * Send it. `store` is a Messages store (createStore); `admin` is the Admin person; `channelId` is the property.
 * Returns { ok, convId } or { ok: false, reason } with a reason a person can read in `message`.
 */
export function reportToTeam(store, { admin, channelId, property, note, body, link }) {
  if (!admin || admin.role !== "admin") return { ok: false, reason: "not_admin", message: "Only an Admin can report to a property team." };
  const to = teamContact(channelId);
  if (!to) return { ok: false, reason: "no_team", message: `${property} has no team in Messages yet, so there is nobody to tell. Copy the report and send it another way.` };
  const { text, cut } = composeReport({ property, from: admin.name, note, body, link });
  const r = store.startDirect(admin.id, to.id, text);
  if (!r.ok) return { ...r, message: "The message could not be sent. Try again, or copy the report and send it another way." };
  return { ok: true, convId: r.convId, to: to.name, cut };
}
