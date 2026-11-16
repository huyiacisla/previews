// What the Admin Command Center shows. Pure logic, no DOM, so node --test can run it.
//
// Two kinds of numbers, and the page says which is which:
//  - LIVE: the Support queue and the messages waiting for this admin. They are read from the same store as the Ticket box and
//    Messages, every time they are asked for, so the dashboard, the Ticket box and Messages can never disagree.
//  - SAMPLE: the platform numbers, health alerts and recent activity. The preview has no platform service; these repeat what the
//    captured Admin dashboard said (2 clients, 2 properties, 43 people, 261 spaces, 32 warnings, 6 sign-ins).

const HOUR = 3600000;

/** Rank for the queue: emergency first, then High, Normal, Low; inside a rank the one waiting longest comes first. */
const RANK = { emergency: 0, high: 1, normal: 2, low: 3 };

/**
 * The Support queue as an admin sees it.
 * @param store a messaging store (createStore)
 * @param me    the admin persona ({ id })
 * @param now   time in ms
 */
export function supportQueue(store, me, now = Date.now()) {
  const all = store.ticketBox(me.id);
  const open = all.filter((t) => t.isOpen);
  const byStage = { open: 0, pending: 0, resolved: 0 };
  for (const t of all) if (byStage[t.stage] !== undefined) byStage[t.stage] += 1;
  const rows = [...open].sort((a, b) => (RANK[a.priority] ?? 2) - (RANK[b.priority] ?? 2) || a.openedAt - b.openedAt);
  const oldest = open.reduce((m, t) => Math.min(m, t.openedAt), Infinity);
  return {
    total: all.length,
    open: open.length,
    byStage,
    unassigned: open.filter((t) => !t.assignee).length,
    mine: open.filter((t) => t.assignee === me.name).length,
    high: open.filter((t) => t.priority === "high" || t.priority === "emergency").length,
    fromStaff: open.filter((t) => t.requester.role === "staff").length,
    fromClients: open.filter((t) => t.requester.role === "client").length,
    oldestMs: open.length ? Math.max(0, now - oldest) : 0,
    // Resolved in the last 7 days: how much the team closed recently.
    resolvedThisWeek: all.filter((t) => !t.isOpen && t.closedAt && now - t.closedAt < 7 * 24 * HOUR).length,
    rows,
  };
}

/** Conversations with something new for this admin (the same list the bell uses), unread only, newest first. */
export function messagesWaiting(store, me) {
  const items = store.alertsFor(me.id).filter((a) => a.unread > 0);
  return { unread: store.badgeCount(me.id), conversations: items.length, items };
}

/** Everything the page needs, in one object. */
export function adminOverview(store, me, now = Date.now()) {
  const queue = supportQueue(store, me, now);
  const messages = messagesWaiting(store, me);
  const emergencies = store.emergencies(me.id);
  return {
    queue,
    messages,
    emergencies,
    // One line that says how things stand, worst first.
    headline: emergencies.length
      ? `${emergencies.length} ${emergencies.length === 1 ? "emergency needs" : "emergencies need"} an answer`
      : queue.unassigned
        ? `${queue.unassigned} ${queue.unassigned === 1 ? "ticket has" : "tickets have"} no owner yet`
        : queue.open
          ? `${queue.open} open ${queue.open === 1 ? "ticket" : "tickets"}, all with an owner`
          : "The Support queue is clear",
  };
}

/** "5 min", "3 h", "2 d": how long something has waited. */
export function waited(ms) {
  if (ms < 60000) return "just now";
  if (ms < HOUR) return `${Math.round(ms / 60000)} min`;
  if (ms < 48 * HOUR) return `${Math.round(ms / HOUR)} h`;
  return `${Math.round(ms / (24 * HOUR))} d`;
}

/* ------------------------------------------------------------ what is drawn */

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const QUEUE_ROWS = 6;
export const MSG_ROWS = 5;

/**
 * Everything the page draws, as plain values: the Alpine component (admin/dashboard.js) holds this and the partial reads it.
 * No DOM here, so the wording, the order and the links are tested in Node.
 * @param o       adminOverview(...)
 * @param now     time in ms
 * @param links   { tickets, messages } with the query the page keeps (?as=…)
 * @param timeOf  (ts, now) => "5:11 PM" (messaging/format.js listTime)
 */
export function adminView(o, now, links, timeOf = (ts) => new Date(ts).toISOString()) {
  const { queue: q, messages: m, emergencies: em } = o;
  const alerts = HEALTH.critical + HEALTH.warning;
  const tiles = [
    {
      label: "Open tickets",
      value: String(q.open),
      icon: "ad-ticket",
      href: links.tickets,
      tone: q.unassigned ? "warning" : q.open ? "info" : "success",
      note: !q.open ? "Nothing is waiting" : q.unassigned ? `${q.unassigned} without an owner · oldest ${waited(q.oldestMs)}` : `All have an owner · oldest ${waited(q.oldestMs)}`,
    },
    {
      label: "Unread messages",
      value: String(m.unread),
      icon: "ad-message",
      href: links.messages,
      tone: m.unread ? "info" : "success",
      note: m.unread ? `In ${plural(m.conversations, "conversation")}` : "Everything is read",
    },
    {
      label: "Emergencies",
      value: String(em.length),
      icon: "ad-siren",
      href: em.length ? `${links.messages}#/c/${em[0].convId}` : links.messages,
      tone: em.length ? "danger" : "success",
      note: em.length ? "Not acknowledged yet" : "None open",
    },
    {
      label: "Platform alerts",
      value: String(alerts),
      icon: "ad-alert",
      href: "#adm-health-h",
      scroll: true,
      tone: HEALTH.critical ? "danger" : HEALTH.warning ? "warning" : "success",
      note: `${HEALTH.critical} critical · ${HEALTH.warning} warnings`,
    },
  ];
  const queueRows = q.rows.slice(0, QUEUE_ROWS).map((t) => {
    const badges = [];
    if (t.priority === "emergency") badges.push({ text: "Emergency", tone: "danger" });
    else if (t.priority === "high") badges.push({ text: "High", tone: "danger" });
    else if (t.priority === "low") badges.push({ text: "Low", tone: "neutral" });
    badges.push({ text: t.stageLabel, tone: t.stage === "pending" ? "warning" : "info" });
    badges.push({ text: t.assignee || "Unassigned", tone: t.assignee ? "neutral" : "warning" });
    const wait = waited(now - t.openedAt);
    return {
      id: t.id,
      no: t.no,
      subject: t.subject,
      href: `${links.tickets}#/t/${t.id}`,
      badges,
      wait,
      who: [t.requester.name, t.requester.role === "client" ? "Client" : "Staff", t.category].filter(Boolean).join(" · "),
      aria: `${t.no}, ${t.subject}, from ${t.requester.name}. ${t.stageLabel}, ${t.assignee ? `owner ${t.assignee}` : "no owner"}, waiting ${wait}.`,
    };
  });
  return {
    tiles,
    stages: [
      { label: "Open", n: q.byStage.open },
      { label: "Pending", n: q.byStage.pending },
      { label: "Resolved", n: q.byStage.resolved },
    ],
    queueRows,
    queueSub: q.open ? `${q.fromClients} from Clients · ${q.fromStaff} from Staff · ${q.resolvedThisWeek} resolved this week` : `${q.resolvedThisWeek} resolved this week`,
    queueMore: q.open > QUEUE_ROWS ? `Showing ${QUEUE_ROWS} of ${q.open} open, most urgent first` : q.open ? "Most urgent first, then longest waiting" : "",
    msgRows: m.items.slice(0, MSG_ROWS).map((x) => ({ id: x.id, title: x.title, detail: x.detail, time: timeOf(x.ts, now), href: `${links.messages}#/c/${x.convId}` })),
    msgSub: m.unread ? `${plural(m.unread, "message")} in ${plural(m.conversations, "conversation")}` : "You are all caught up",
    emergencyHref: em.length ? `${links.messages}#/c/${em[0].convId}` : links.messages,
    emergencyTitle: em.length === 1 ? "An emergency is waiting for an answer" : `${em.length} emergencies are waiting for an answer`,
    emergencyText: em.length ? `${em[0].title} · raised ${waited(now - em[0].at)} ago` : "",
  };
}

/* ---------------------------------------------------------------- sample */

/** Platform numbers of the captured dashboard. `to` is a page of this preview, or null when that page is not part of it. */
export const PLATFORM = [
  { key: "clients", label: "Client accounts", value: "2", note: "0 pending setup · 0 archived" },
  { key: "properties", label: "Properties", value: "2", note: "2 active locations" },
  { key: "people", label: "People", value: "43", note: "Profiles with platform access" },
  { key: "spaces", label: "Active spaces", value: "261", note: "Across both properties" },
  { key: "requests", label: "Open requests", value: "0", note: "Review queues are clear" },
  { key: "billing", label: "Billing issues", value: "0", note: "No account waits on payment" },
  { key: "revenue", label: "Monthly revenue", value: "$19", note: "From active plans" },
];

export const HEALTH = {
  critical: 0,
  warning: 32,
  info: 0,
  groups: [
    {
      title: "People needing space assignment",
      what: "Approved parker has no assigned space",
      next: "Assign a space only after the client approves it.",
      items: ["Morgan Ellis", "Priya Nair", "Casey Nguyen", "Alex Rivera", "Jordan Lee", "Riley Chen", "Sam Okafor", "Dana Whitfield"].map((who) => ({ who, where: "Mallard Pointe at Riverbend" })),
    },
  ],
};

export const ACTIVITY = [
  { what: "User login", who: "user@example.com", when: "Nov 9, 3:55 PM" },
  { what: "User login", who: "user@example.com", when: "Nov 9, 3:55 PM" },
  { what: "User login", who: "user@example.com", when: "Nov 9, 3:55 PM" },
  { what: "User login", who: "user@example.com", when: "Nov 9, 3:55 PM" },
  { what: "User login", who: "user@example.com", when: "Nov 8, 4:08 PM" },
  { what: "User login", who: "user@example.com", when: "Nov 8, 3:56 PM" },
];
