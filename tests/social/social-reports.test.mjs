import assert from "node:assert/strict";
import test from "node:test";
import { closeReports, hasReported, openReports, REASONS, reasonLabel, reportPost } from "../../src/features/social/reports.js";

const store = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

test("a report needs a post, a person and one of the listed reasons; a person reports a post once while it is open", () => {
  const s = store();
  assert.equal(reportPost(s, { postId: "p1", by: "res-1", byName: "Alex", reason: "nope" }).reason, "no_reason");
  assert.equal(reportPost(s, { postId: "", by: "res-1", reason: "spam" }).reason, "invalid");
  assert.equal(reportPost(s, { postId: "p1", by: "", reason: "spam" }).reason, "invalid");
  const r = reportPost(s, { postId: "p1", by: "res-1", byName: "Alex", reason: "spam", note: "  ads again  ", now: 1000 });
  assert.equal(r.ok, true);
  assert.equal(r.report.note, "ads again");
  assert.equal(reportPost(s, { postId: "p1", by: "res-1", reason: "rude" }).reason, "already");
  assert.equal(hasReported(s, "p1", "res-1"), true);
  assert.equal(hasReported(s, "p1", "res-2"), false);
  assert.equal(REASONS.length, 5);
  assert.equal(reasonLabel("privacy"), "Shares private details");
  assert.equal(reasonLabel("zzz"), "Something else");
});

test("Staff see one entry for each reported post, with how many people reported it, newest first", () => {
  const s = store();
  reportPost(s, { postId: "p1", by: "res-1", byName: "Alex", reason: "spam", now: 1000 });
  reportPost(s, { postId: "p2", by: "res-2", byName: "Priya", reason: "rude", now: 2000 });
  reportPost(s, { postId: "p1", by: "res-2", byName: "Priya", reason: "spam", now: 3000 });
  const open = openReports(s);
  assert.deepEqual(
    open.map((g) => [g.postId, g.count]),
    [
      ["p1", 2],
      ["p2", 1],
    ],
  );
  assert.equal(open[0].latest.byName, "Priya");
});

test("closing a post's reports: dismissed or removed, once; the entry leaves the open list and the reporter may report it again", () => {
  const s = store();
  reportPost(s, { postId: "p1", by: "res-1", reason: "spam", now: 1 });
  reportPost(s, { postId: "p1", by: "res-2", reason: "spam", now: 2 });
  assert.equal(closeReports(s, "p1", "nonsense", "Jordan").reason, "invalid");
  assert.deepEqual(closeReports(s, "p1", "dismissed", "Jordan", 9), { ok: true, closed: 2 });
  assert.deepEqual(openReports(s), []);
  assert.equal(closeReports(s, "p1", "removed", "Jordan").reason, "none_open");
  assert.equal(reportPost(s, { postId: "p1", by: "res-1", reason: "spam" }).ok, true, "a closed report does not block a new one");
});

test("broken storage means no reports, never a crash; the list is capped", () => {
  const bad = {
    getItem: () => "not json",
    setItem: () => {
      throw new Error("full");
    },
  };
  assert.deepEqual(openReports(bad), []);
  assert.equal(reportPost(bad, { postId: "p", by: "u", reason: "spam" }).reason, "save_failed");
  const s = store();
  for (let i = 0; i < 520; i += 1) reportPost(s, { postId: `p${i}`, by: "u", reason: "spam", now: i });
  assert.ok(JSON.parse(s.getItem("eso-social-reports")).length <= 500);
});

import { readFileSync } from "node:fs";
import { has } from "../has.mjs";

test('Social has a way to report a post and a place where Staff act on it (it had a "Reported posts" card that nothing could ever fill)', () => {
  const html = readFileSync(new URL("../../src/partials/social-app.html", import.meta.url), "utf8");
  const js = readFileSync(new URL("../../src/features/social/resident.js", import.meta.url), "utf8");
  assert.ok(has(html, 'data-m="report"') && has(html, 'id="report-dlg"') && has(html, 'id="report-reasons"'));
  assert.ok(has(js, "reportItem.hidden = !!p.mine;"), "any post that is not your own");
  assert.ok(has(js, "textContent = reported ? 'Reported' : 'Report post'"), "a post you reported says so");
  assert.ok(has(js, "$('#report-error').textContent = 'Pick a reason.'"), "a reason is required");
  assert.ok(
    has(js, "openReports(storage)") && has(js, "closeReports(storage, g.postId, 'dismissed'") && has(js, "closeReports(storage, g.postId, 'removed'"),
    "Moderation lists, dismisses and removes",
  );
  assert.ok(has(js, "deletePost(storage, g.postId, { any: true })"), "only Moderation may take down somebody else's post");
  assert.ok(has(js, "remove.textContent = 'Confirm remove'"), "removing is asked twice");
  const store = readFileSync(new URL("../../src/features/social/staff-store.js", import.meta.url), "utf8");
  assert.ok(has(store, "if (p.a !== 'me' && !any) return { ok: false, reason: 'You can only delete your own posts.' };"), "everywhere else only your own");
});
