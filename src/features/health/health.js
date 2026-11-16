// System health for Admin: the checks of every module in one place. Pure logic, no DOM, so node --test can run it.
//
// A module is { id, name, area, checks }, where checks have the shape of social/diagnose.js. Social is one module for each property (a fault of one
// property is not another's). Everything only reads. To add a module, write a function that returns checks and add it to `modules`.

import { diagnose, summary } from "../social/diagnose.js";
import { channels } from "../social/monitor.js";
import { hasFeed, scoped } from "../social/scope.js";
import { checkDocuments } from "./documents-checks.js";
import { checkMessages } from "./messages-checks.js";
import { checkNotifications } from "./notifications-checks.js";

/** Every module with its checks and a one-line summary: { id, name, area, link, checks, run, failed, errors, findings }. */
export function modules(storage, now = Date.now()) {
  const out = [];
  const add = (m) => out.push({ ...m, ...summaryOf(m.checks) });

  add({ id: "messages", name: "Messages and Ticket box", area: "Messages", link: "/admin/messages.html", checks: checkMessages(storage, now) });
  add({ id: "documents", name: "Documents (Client)", area: "Documents", link: "/client/documents.html", checks: checkDocuments(storage) });
  add({ id: "notifications", name: "Notifications", area: "Notifications", link: "/admin/notifications.html", checks: checkNotifications(storage, now) });

  for (const c of channels(storage).list) {
    // The first property always has a feed (made on first look); another property that has none has not started, and there is nothing to check.
    // A property that has ended has no Social to check (its data is sealed), and neither has one that has not started.
    if (c.ended || (c.id !== "main" && !hasFeed(storage, c.id))) continue;
    add({
      id: `social-${c.id}`,
      name: `Social: ${c.name}`,
      area: "Social",
      channel: c.id,
      property: c.name,
      link: `/admin/social-monitoring.html?property=${c.id}`,
      checks: diagnose(scoped(storage, c.id), now),
    });
  }
  return out;
}

function summaryOf(checks) {
  const s = summary(checks);
  return { run: s.run, failed: s.failed, errors: s.errors, findings: s.findings };
}

/** The whole system in one number: how many modules are clear, and how many checks found something. */
export function overall(mods) {
  const failed = mods.filter((m) => m.failed > 0);
  return {
    modules: mods.length,
    clear: mods.length - failed.length,
    failedModules: failed.length,
    errors: mods.reduce((n, m) => n + m.errors, 0),
    findings: mods.reduce((n, m) => n + m.findings, 0),
    checks: mods.reduce((n, m) => n + m.run, 0),
  };
}

/** The problems as plain text for a bug report: every module that found something, with where and how to fix. */
export function healthReport(mods, now = Date.now()) {
  const o = overall(mods);
  const head = `System health, ${new Date(now).toISOString()}: ${o.failedModules === 0 ? `all ${o.checks} checks passed in ${o.modules} modules` : `${o.findings} finding(s) in ${o.failedModules} of ${o.modules} modules`}`;
  const body = mods
    .filter((m) => m.failed > 0)
    .map((m) =>
      [`== ${m.name}`, ...m.checks.filter((c) => !c.ok).map((c) => `- [${c.severity}] ${c.label}\n${c.found.map((f) => `    ${f.where}: ${f.detail}`).join("\n")}\n    Fix: ${c.fix}`)].join("\n"),
    );
  return [head, ...body].join("\n");
}
