/* Client Workspace settings.
   A Client is a company (AMC LLC) that runs a portfolio of properties and pays for the plan. So its workspace is not a property's:
   it is organised around the company, the portfolio and its properties, the rules every property starts from, the team, and the plan.
     Company ........ who the company is
     Portfolio ...... the properties, and each property's own settings (branding, hours, emergency contact, amenities, parking rules, team)
     Defaults ....... parking and resident rules set once; a property keeps them or, if the portfolio allows, changes them
     Team ........... roles and who can do what across properties
     Plan & billing . what the plan covers, how much is used, who is invoiced
     Reports, security, data
   Built with the prototype's own helpers (pzCard, pzT, pzR, pzSeg) so it looks and saves like its other pages: every value lives in S ("eso-proto";
   the Client copy keeps its own, the page shim prefixes the key). Demo only: nothing is sent anywhere. */

import { ITEMS, limitFor, normalizePurchased, propertiesCount } from "../features/capacity/store.js";
import { dockeyDesc, dockeyLeaf, installDockey } from "./dockey-settings.js";

export const PROP = "Mallard Pointe at Riverbend";
const COMPANY = "AMC LLC";

/* What the plan covers and what the company uses: the figures Billing & Plan shows (Starter). More is added in Usage > Capacity. */
const plan = (id) => ITEMS.find((i) => i.id === id); // the plan's limits live in capacity/store.js only
// What was added in Capacity is kept under "capacity-state:client" (a copy without "eso-", which this page's storage shim would rename; see portal-frame.js and usage/app.js).
const bought = () => {
  try {
    return normalizePurchased(JSON.parse(localStorage.getItem("capacity-state:client")));
  } catch {
    return normalizePurchased(null);
  }
};
/** Properties in the portfolio, parking spaces and staff seats against the plan AS IT IS NOW (what was bought in Capacity counts). */
export const usage = () => {
  const p = bought();
  return [
    { k: "Properties", used: propertiesCount(p), names: p.properties.map((x) => x.name) },
    { k: "Parking spots", used: plan("parking").used, cap: limitFor("parking", p) },
    { k: "Staff seats", used: plan("staff").used, cap: limitFor("staff", p) },
  ];
};

export const CW_DEFAULTS = {
  cwName: COMPANY,
  cwLegal: COMPANY,
  cwWeb: "https://amcllc.example",
  cwHq: "",
  cwTz: "America/Los_Angeles",
  cwCur: "USD",
  cwMgmt: true,
  cwGrace: "15",
  cwGuest: "72",
  cwVeh: "2",
  cwPermit: "manual",
  cwRenew: "30",
  cwWarn: true,
  cwTow: "48",
  cwTowNote: true,
  cwOverride: true,
  cwPropDefaults: true,
  cwPropGrace: "15",
  cwPropTow: "48",
  cwSocial: true,
  cwPromos: true,
  cwBotFirst: true,
  cwTickets: true,
  cwApprove: true,
  cwBillView: false,
  cwInvite: "admins",
  cwInvEmail: "billing@amcllc.example",
  cwBillName: COMPANY,
  cwPO: "",
  cwTax: "",
  cwDelivery: "email",
  cwSplit: false,
  cwCycle: "monthly",
  cwRecip: "admins",
  cwAlLimit: true,
  cwAlViol: true,
  cwAlLeak: true,
  cwAlDue: true,
  cwMfa: true,
  cwSession: "30",
  cwDomain: "amcllc.example",
  cwRetain: "7",
  cwRestore: "30",
  cwDocShare: "admins",
  cwDocSoon: "30",
  cwAlStorage: true,
  cwBudget: "",
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const keep = (s) => `<span data-keep>${esc(s)}</span>`;
const val = (k) => (typeof S !== "undefined" && S[k] !== undefined ? S[k] : CW_DEFAULTS[k]);

/* ---- small pieces ---- */
const row = (t, s, v) => `<div class="prow"><div><b>${t}</b><small>${s}</small></div>${v != null && v !== "" ? `<span class="pill">${v}</span>` : ""}</div>`;
const card = (t, s, body, note) => `<div class="pscard"><div class="hd"><div><h3>${t}</h3><p>${s}</p></div></div>${note ? `<div class="pro">${note}</div>` : ""}${body}</div>`;
const field = (k, label, sub, o = {}) =>
  pzR(
    `<label for="cw-${k}">${label}</label>`,
    `<input class="ix-in" id="cw-${k}" data-pzs="${k}" data-cwv="${o.kind || "text"}"${o.req ? " data-cwreq" : ""} type="${o.type || "text"}" value="${esc(val(k) ?? "")}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ""} autocomplete="off" aria-describedby="cw-${k}-e"><small class="cw-err" id="cw-${k}-e" role="alert" hidden></small>`,
    sub,
  );
const pick = (k, label, sub, opts) =>
  pzR(
    `<label for="cw-${k}">${label}</label>`,
    `<select id="cw-${k}" data-pzs="${k}">${opts.map(([v, t]) => `<option value="${v}"${String(val(k)) === String(v) ? " selected" : ""}>${t}</option>`).join("")}</select>`,
    sub,
  );
const tog = (k, t, s) => pzT(k, t, s);
const seg = (k, t, s, opts, def) => pzR(t, pzSeg(k, opts, def), s);

const wrap = (html) => `<div class="cw">${html}</div>`;

/* ---- sections ---- */
/* Three groups, each a heading over one card, the way Parking and enforcement is laid out (the first card used to be a titled card whose fields sat
   a second indent in from the other two). */
const company = () =>
  wrap(
    `<h3 class="pzsec">Company details</h3>` +
      pzCard(
        field("cwName", "Company name", "Shown in the portal header and on messages to residents.") +
          field("cwLegal", "Legal name", "Your registered business name.") +
          field("cwWeb", "Website", "Optional.", { kind: "url", ph: "https://" }) +
          field("cwHq", "Head office address", "Optional. Used on invoices.", { ph: "Street, city, state" }),
      ) +
      `<h3 class="pzsec">Time zone and currency</h3>` +
      pzCard(
        pick(
          "cwTz",
          "Default time zone",
          "A property uses this unless it has its own.",
          (typeof TZS !== "undefined" ? TZS : [["America/Los_Angeles", "Pacific Time — Los Angeles"]]).map((z) => [z[0], z[1]]),
        ) +
          pick("cwCur", "Currency", "For plans, invoices and revenue reports.", [
            ["USD", "US dollar (USD)"],
            ["CAD", "Canadian dollar (CAD)"],
          ]),
      ) +
      `<h3 class="pzsec">What residents see</h3>` +
      pzCard(
        tog("cwMgmt", 'Show "Managed by ' + COMPANY + '" to residents', "Residents see your company under the property name in their portal."),
        "Each property keeps its own name, logo and colors. Set them in the property’s settings.",
      ),
  );

const portfolio = () =>
  wrap(
    // the properties in the portfolio: the one the company started with, and each one added in Capacity (the same count the sidebar and the profile show)
    card(
      "Properties",
      `${usage()[0].used} in your portfolio.`,
      `<div class="prow cw-prop"><div><b>${keep(PROP)}</b><small>${usage()[1].used} parking spots · Active</small></div><button type="button" class="stbtn sm" data-go="workspace/property">Open settings</button></div>` +
        bought()
          .properties.map(
            (p) =>
              `<div class="prow cw-prop"><div><b>${keep(p.name)}</b><small>${p.units} ${p.units === 1 ? "unit" : "units"}${p.address ? " · " + esc(p.address) : ""} · Added in Capacity</small></div></div>`,
          )
          .join(""),
    ) +
      card(
        "Add a property",
        "Each additional property is $25.00/mo, prorated for the rest of the billing period.",
        `<div class="cw-act"><a class="stbtn sm p" href="/client/usage/capacity.html#property" target="_top">Add a property in Capacity</a></div>`,
        "You name it, say how many apartment units it has, and authorize the charge. It is added to Billing & Plan.",
      ) +
      pzCard(
        tog(
          "cwOverride",
          "Let each property change the portfolio defaults",
          "On: a property manager can set their own parking rules in the property’s settings. Off: every property follows the defaults.",
        ),
        "Defaults live in Parking and enforcement and Resident experience.",
      ),
  );

const parking = () =>
  wrap(
    `<h3 class="pzsec">Grace and guests</h3>` +
      pzCard(
        pick("cwGrace", "Grace period", "How long a vehicle can be in the wrong place before it is a violation.", [
          ["0", "None"],
          ["10", "10 minutes"],
          ["15", "15 minutes"],
          ["30", "30 minutes"],
        ]) +
          pick("cwGuest", "Guest parking limit", "How long a guest vehicle may stay.", [
            ["24", "24 hours"],
            ["48", "48 hours"],
            ["72", "3 days"],
            ["168", "7 days"],
          ]) +
          pick("cwVeh", "Vehicles per unit", "How many vehicles a unit can register.", [
            ["1", "1"],
            ["2", "2"],
            ["3", "3"],
            ["4", "4"],
          ]),
      ) +
      `<h3 class="pzsec">Permits</h3>` +
      pzCard(
        seg(
          "cwPermit",
          "Resident permits",
          "Who approves a new permit request.",
          [
            ["auto", "Approve automatically"],
            ["manual", "Staff review"],
          ],
          "manual",
        ) +
          pick("cwRenew", "Renewal reminder", "When residents are reminded that a permit is ending.", [
            ["14", "14 days before"],
            ["30", "30 days before"],
          ]),
      ) +
      `<h3 class="pzsec">Violations and towing</h3>` +
      pzCard(
        tog("cwWarn", "Warn before fining", "The first violation is a warning, then a fine.") +
          pick("cwTow", "Tow", "When a vehicle in violation can be towed.", [
            ["24", "After 24 hours"],
            ["48", "After 48 hours"],
            ["72", "After 72 hours"],
            ["0", "Never"],
          ]) +
          tog("cwTowNote", "Tell the resident before towing", "A message and a notification go out first."),
        val("cwOverride")
          ? "Properties may change these. A property that does will say so in its own settings."
          : "Every property follows these. Turn on property overrides in Portfolio to change that.",
      ),
  );

const residents = () =>
  wrap(
    `<h3 class="pzsec">What residents can use</h3>` +
      pzCard(
        tog("cwSocial", "Social timeline", "Residents see Social for their property. Staff at each property run it.") +
          tog("cwPromos", "Promotions", "Residents see and can save promotions their property publishes.") +
          tog("cwTickets", "Ticket box", "Residents can open a ticket with the property team."),
      ) +
      `<h3 class="pzsec">Messages</h3>` +
      pzCard(
        tog("cwBotFirst", "Assistant answers first", "A resident who writes to the property talks to the assistant first. Staff are asked only when it cannot help."),
        "Each property can still turn a feature off for its own residents.",
      ),
  );

const access = () =>
  wrap(
    card(
      "Your role",
      "Client Admin in " + COMPANY + ".",
      row("Properties", "Add, change and remove.", "Yes") + row("Team", "Invite people and set their roles.", "Yes") + row("Plan and billing", "Change the plan and the billing contact.", "Yes"),
    ) +
      card(
        "Roles",
        "What each role can do across the portfolio.",
        row("Owner", "Everything, including plan and billing.", "All properties") +
          row("Client Admin", "Properties, team, defaults and reports.", "All properties") +
          row("Property manager", "Day-to-day work: requests, vehicles, violations, messages.", "Assigned properties") +
          row("Viewer", "Reports and dashboards only.", "Assigned properties"),
      ) +
      pzCard(
        pick("cwInvite", "Who can invite people", "Everyone invited gets a role and a set of properties.", [
          ["owners", "Owners only"],
          ["admins", "Owners and Client Admins"],
        ]) +
          tog("cwApprove", "Approve new people before they get access", "An owner or Client Admin confirms each invitation.") +
          tog("cwBillView", "Property managers can see billing", "Off: only owners and Client Admins see plans and invoices."),
      ) +
      card(
        "Seats",
        "Staff members across all properties.",
        row("Staff members", "Using what the plan covers. Add more seats in Usage, Capacity ($10.00/mo each).", `${usage()[2].used} of ${usage()[2].cap}`),
        "Add or remove people in Staff & Access, in the sidebar.",
      ),
  );

/* Invoices and payment: who is invoiced and how. The plan's limits are not here: they are Usage > Capacity in the sidebar. The plan itself is Billing & Plan. */
const billing = () =>
  wrap(
    `<h3 class="pzsec">Invoices</h3>` +
      pzCard(
        field("cwInvEmail", "Invoice email", "Plan invoices are sent here.", { kind: "email", type: "email", req: 1 }) +
          field("cwBillName", "Billing name", "Printed on invoices.") +
          field("cwPO", "PO number", "Optional. Printed on every invoice.") +
          field("cwTax", "Tax ID", "Optional.") +
          pick("cwDelivery", "Invoice delivery", "How you receive each invoice.", [
            ["email", "Email a PDF"],
            ["portal", "Download from the portal"],
          ]) +
          pick("cwCycle", "Billing cycle", "How often you are billed.", [
            ["monthly", "Monthly"],
            ["annual", "Yearly"],
          ]),
      ) +
      `<h3 class="pzsec">Add-ons</h3>` +
      pzCard(
        field("cwBudget", "Monthly add-on budget", "Optional. Capacity warns you before add-ons pass this amount. Leave empty for no limit.", { kind: "money", ph: "150" }),
        "Extra capacity is bought in Usage, Capacity.",
      ) +
      `<h3 class="pzsec">Property invoices</h3>` +
      pzCard(
        tog("cwSplit", "Invoice each property separately", "Each property gets its own invoice, so an owner can pay for their own property.") +
          row("Bill to", keep(PROP), val("cwSplit") ? "Own invoice" : COMPANY),
        "Turn this on when properties belong to different owners.",
      ) +
      `<h3 class="pzsec">Payment method</h3>` +
      pzCard(row("Card on file", "Demo card. Real cards are never stored in this preview.", "Visa ending 4242"), "Charged each billing cycle."),
  );

const reports = () =>
  wrap(
    `<h3 class="pzsec">Email reports</h3>` +
      pzCard(
        tog("rpWeekly", "Weekly portfolio summary", "Every Monday at 8 AM.") +
          tog("rpMonthly", "Monthly performance report", "A PDF with revenue, occupancy, violations and requests for each property.") +
          pick("cwRecip", "Send to", "Who gets the reports.", [
            ["me", "Only me"],
            ["admins", "Owners and Client Admins"],
            ["team", "Everyone with access"],
          ]),
        "Build or export a report in Reports.",
      ) +
      `<h3 class="pzsec">Tell me when</h3>` +
      pzCard(
        tog("cwAlLimit", "The portfolio reaches its plan limit", "Properties, parking spots or staff seats.") +
          tog("cwAlViol", "Open violations rise at a property", "A property that needs attention.") +
          tog("cwAlLeak", "Revenue leakage grows", "Paid spots that stay open.") +
          tog("cwAlDue", "An invoice is past due", "Billing notices for the plan."),
        "Alerts also show in the bell at the top of every page.",
      ),
  );

/* Documents: what a new upload starts as, and when to be reminded. The Documents page reads these from "docs-prefs:client" (see mirrorPrefs). */
const docs = () =>
  wrap(
    `<h3 class="pzsec">New documents</h3>` +
      pzCard(
        pick("cwDocShare", "Who can see a new document", "You can change it for each upload.", [
          ["admins", "Admins only"],
          ["team", "Whole team"],
        ]),
        "Admins are owners and Client Admins. Documents are only for people in your company: property staff and residents never see them.",
      ) +
      `<h3 class="pzsec">Reminders</h3>` +
      pzCard(
        pick("cwDocSoon", "Remind me before a document expires", "Shown at the top of Documents.", [
          ["7", "7 days before"],
          ["14", "14 days before"],
          ["30", "30 days before"],
          ["60", "60 days before"],
          ["90", "90 days before"],
        ]) + tog("cwAlStorage", "Warn when document storage is almost full", "At 90% of your storage. More is added in Usage, Capacity."),
      ),
  );

const security = () =>
  wrap(
    pzCard(
      tog("cwMfa", "Require 2-step verification for everyone", "Every person in the workspace must set it up the next time they sign in.") +
        pick("cwSession", "Sign out after being idle", "People are signed out after this long with no activity.", [
          ["15", "15 minutes"],
          ["30", "30 minutes"],
          ["60", "1 hour"],
          ["480", "8 hours"],
        ]) +
        field("cwDomain", "Allowed email domain", "Only people with this domain can be invited. Leave empty to allow any.", { kind: "domain", ph: "company.com" }),
      "Your own sign-in, passkeys and devices are in Sign-in & security.",
    ) +
      card("Single sign-on", "Let people sign in with your company account.", row("Identity provider", "Not connected yet.", "Not set up")) +
      card(
        "Recent activity",
        "Sample activity for this preview.",
        row("Billing contact changed", "Dana Whitfield", "Today") + row("Person invited", "Dana Whitfield", "Yesterday") + row("Weekly summary turned on", "Dana Whitfield", "Last week"),
      ),
  );

const data = () =>
  wrap(
    pzCard(
      pick("cwRetain", "Keep records for", "Vehicles, violations and requests are kept this long, then removed.", [
        ["1", "1 year"],
        ["3", "3 years"],
        ["7", "7 years"],
      ]) +
        pick("cwRestore", "Restore removed records for", "How long a removed record can be brought back.", [
          ["30", "30 days"],
          ["60", "60 days"],
          ["90", "90 days"],
        ]),
      "Recovery, in the sidebar, brings removed records back.",
    ) +
      card(
        "Export",
        "Everything for all properties, as files.",
        row("Last export", "Nothing exported yet.", "Never") + `<div class="cw-act"><button type="button" class="stbtn sm" data-cw-act="export">Export portfolio data</button></div>`,
      ),
  );

/* ---- the property's own two extra pages (the rest are the prototype's property pages) ---- */
const propParking = () => {
  const own = !val("cwPropDefaults") && val("cwOverride");
  const grace = (v) => (v === "0" ? "None" : `${v} minutes`);
  const tow = (v) => (v === "0" ? "Never" : `After ${v} hours`);
  return wrap(
    pzCard(
      val("cwOverride")
        ? tog("cwPropDefaults", "Use the portfolio defaults", "On: this property follows the rules set for the portfolio. Off: it sets its own below.")
        : row("Use the portfolio defaults", "Property overrides are off for the portfolio.", "Always"),
    ) +
      (own
        ? pzCard(
            pick("cwPropGrace", "Grace period", "For this property only.", [
              ["0", "None"],
              ["10", "10 minutes"],
              ["15", "15 minutes"],
              ["30", "30 minutes"],
            ]) +
              pick("cwPropTow", "Tow", "For this property only.", [
                ["24", "After 24 hours"],
                ["48", "After 48 hours"],
                ["72", "After 72 hours"],
                ["0", "Never"],
              ]),
          )
        : card(
            "Rules in force",
            "Set for the portfolio in Parking and enforcement.",
            row("Grace period", "Before a violation.", grace(String(val("cwGrace")))) +
              row("Guest parking", "How long a guest may stay.", `${val("cwGuest")} hours`) +
              row("Vehicles per unit", "Registered at once.", String(val("cwVeh"))) +
              row("Tow", "For a vehicle in violation.", tow(String(val("cwTow")))),
          )),
  );
};
const propTeam = () =>
  wrap(
    card(
      "Team",
      "People who work at this property.",
      row("People with access", "Property managers, staff and viewers.", `${usage()[2].used}`) + row("Primary contact", "Receives escalations.", "Dana Whitfield"),
    ) +
      card(
        "Who can manage it",
        "Set by role.",
        row("Owners and Client Admins", "All properties.", "Always") + row("Property managers", "Only the properties assigned to them.", "Assigned"),
        "Assign people to properties in Staff & Access, in the sidebar.",
      ),
  );

/** The Client's Workspace tree: replaces the Staff one. `prop` is the prototype's own property node (branding, details, hours, emergency, amenities). */
export function clientWorkspaceTree(prop) {
  const kids = prop && prop.kids ? prop.kids.slice() : [];
  const property = Object.assign({}, prop, {
    id: "property",
    t: PROP,
    g: undefined,
    pic: "bld",
    get desc() {
      return `${usage()[1].used} spots · Active`;
    },
    kids: kids.concat([
      {
        id: "parkrules",
        t: "Parking rules",
        ic: "🅿️",
        c: "#0ea5e9",
        g: "Operations",
        sum: () => (val("cwPropDefaults") || !val("cwOverride") ? "Portfolio defaults" : "Its own"),
        leaf: propParking,
        kw: "parking rules grace tow override defaults property",
      },
      { id: "team", t: "Team", ic: "👥", c: "#64748b", g: "People", sum: () => `${usage()[2].used} people`, leaf: propTeam, kw: "team people staff managers access assigned property" },
    ]),
  });
  // `pic` is the icon of the page's own icon table; `g` is the heading the section starts under.
  return [
    {
      id: "company",
      t: "Company",
      ic: "🏢",
      c: "#2563eb",
      pic: "bld",
      g: "Company",
      desc: "Name, legal details, time zone and currency.",
      leaf: company,
      kw: "company name legal website address time zone currency managed by",
    },
    {
      id: "portfolio",
      t: "Properties",
      ic: "🗂",
      c: "#f97316",
      pic: "map",
      g: "Portfolio",
      get desc() {
        return `${usage()[0].used} in your portfolio. Add one, open one.`;
      },
      leaf: portfolio,
      kw: "properties portfolio add property override defaults",
    },
    property,
    {
      id: "parking",
      t: "Parking and enforcement",
      ic: "🅿️",
      c: "#0ea5e9",
      pic: "park",
      g: "Defaults for every property",
      desc: "Grace, guests, permits, violations and towing.",
      leaf: parking,
      kw: "parking enforcement grace period guest permit violation fine tow towing defaults vehicles per unit",
    },
    {
      id: "residents",
      t: "Resident experience",
      ic: "🏠",
      c: "#22c55e",
      pic: "people",
      desc: "Social, promotions, tickets and messages.",
      leaf: residents,
      kw: "residents social promotions tickets messages assistant bot defaults",
    },
    {
      id: "access",
      t: "Team and roles",
      ic: "🛡",
      c: "#7c3aed",
      pic: "shield",
      g: "Team",
      desc: "Roles, invitations and seats.",
      leaf: access,
      kw: "team roles permissions invite people seats staff access approve billing",
    },
    {
      id: "billing",
      t: "Invoices and payment",
      ic: "🧾",
      c: "#7c3aed",
      pic: "lock",
      g: "Invoices",
      desc: "Who is invoiced, PO and tax ID, and the card on file.",
      leaf: billing,
      kw: "invoices invoice email billing name po tax id payment card cycle split property",
    },
    {
      id: "reports",
      t: "Reports and alerts",
      ic: "📊",
      c: "#2563eb",
      pic: "chart",
      g: "Reports",
      desc: "Email reports and when to be told.",
      leaf: reports,
      kw: "reports digest weekly monthly alerts recipients leakage violations",
    },
    {
      id: "wsec",
      t: "Security",
      ic: "🔐",
      c: "#475569",
      pic: "lock",
      g: "Security and data",
      desc: "2-step, idle sign-out and allowed domain.",
      leaf: security,
      kw: "security 2-step mfa session idle domain sso single sign-on activity",
    },
    {
      id: "docs",
      t: "Documents",
      ic: "📄",
      c: "#475569",
      pic: "clip",
      desc: "Who sees new files, and expiry and storage reminders.",
      leaf: docs,
      kw: "documents files upload share who can see default reminder expire expiring expiry storage almost full warn",
    },
    {
      id: "dockey",
      t: "Document secret key",
      ic: "🔑",
      c: "#475569",
      pic: "key",
      get desc() {
        return dockeyDesc();
      },
      leaf: dockeyLeaf,
      kw: "document secret key w9 w-9 locked unlock one time key authenticator email tax form pin password extra security layer",
    },
    { id: "data", t: "Data and recovery", ic: "💾", c: "#64748b", pic: "refresh", desc: "How long records are kept, and export.", leaf: data, kw: "data recovery retention restore export" },
  ];
}

/* ---- behavior ---- */
const FIELD_ERRORS = {
  email: (v, req) => (!v ? (req ? "Enter an invoice email." : "") : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Enter an email like name@company.com."),
  domain: (v) => (!v || /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(v) ? "" : "Enter a domain like company.com."),
  url: (v) => (!v || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v) ? "" : "Start with https://, like https://company.com."),
  money: (v) => (!v || /^\d{1,5}(\.\d{1,2})?$/.test(v) ? "" : "Enter an amount like 150 or 150.50."),
};

/** The Documents and Capacity pages are separate pages, so what they need from these settings is copied to keys of their own
 *  (not starting with "eso-", which this page's storage shim would rename), every time the page saves. */
export function mirrorPrefs() {
  const put = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* storage blocked: the pages use their defaults */
    }
  };
  put("docs-prefs:client", { soonDays: Number(val("cwDocSoon")), share: val("cwDocShare"), storageWarn: !!val("cwAlStorage") });
  // The box as it is now (an emptied box means "no limit"); the saved value when the box is not on screen.
  const box = typeof document !== "undefined" ? document.getElementById("cw-cwBudget") : null;
  const b = String(box ? box.value : (val("cwBudget") ?? "")).trim();
  put("capacity-prefs:client", { budget: /^\d{1,5}(\.\d{1,2})?$/.test(b) ? Number(b) : null });
}
const ACTIONS = {
  export: "Export started. A link will be emailed when it is ready.",
};

/* The page draws each section's icon from its own small table, and a name that is not in it falls back to a person: Properties, Parking, Resident
   experience, Reports, Documents and Data and recovery all showed one. These are the Client's own icons for them (lucide paths, as the sidebar uses),
   put on the list and on the page's heading whenever either is drawn. */
const SECTION_ICONS = {
  portfolio:
    '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>',
  parking: '<circle cx="12" cy="12" r="10"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
  residents: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  reports: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  docs: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  data: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
};
// On a phone the sections are rows with a coloured tile, and every one but Property and Team and roles showed a dot: the same icons, plus these four that the list on a wide screen already draws.
const ROW_ICONS = {
  ...SECTION_ICONS,
  company: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/>',
  billing: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  wsec: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  dockey: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
};
function fixSectionIcons() {
  const put = (svg, id, table = SECTION_ICONS) => {
    if (svg && table[id] && svg.dataset.cwi !== id) {
      svg.innerHTML = table[id];
      svg.dataset.cwi = id;
    }
  };
  for (const a of document.querySelectorAll('a[href^="#/workspace/"] .t svg')) put(a, a.closest("a").getAttribute("href").slice("#/workspace/".length));
  put(document.querySelector(".psel .ib svg"), typeof route !== "undefined" && route.length ? route[0] : "");
  for (const s of document.querySelectorAll('button.srow[data-go^="workspace/"] .sic svg')) put(s, s.closest("button").dataset.go.slice("workspace/".length), ROW_ICONS);
}
function watchSectionIcons() {
  let queued = false;
  const run = () => {
    queued = false;
    fixSectionIcons();
  };
  new MutationObserver(() => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(run);
    }
  }).observe(document.body, { childList: true, subtree: true });
  fixSectionIcons();
}

export function installClientWorkspace() {
  // The budget is ONE value: if it was changed on the Capacity page, this page starts from that amount.
  try {
    const p = JSON.parse(localStorage.getItem("capacity-prefs:client"));
    if (p && typeof S !== "undefined") S.cwBudget = typeof p.budget === "number" && Number.isFinite(p.budget) ? String(p.budget) : "";
  } catch {
    /* nothing kept yet */
  }
  installDockey();
  watchSectionIcons();
  // Keep the other pages' copy of these settings current: after every save the prototype makes.
  const save0 = window.save;
  if (typeof save0 === "function")
    window.save = function () {
      const r = save0.apply(this, arguments);
      mirrorPrefs();
      return r;
    };
  // Wide screens: the page draws its own list with fixed headings ("Settings", "This property") and opens "Permissions" first.
  // The Client's list has its own headings (the `g` of each section), and opens Properties. The plan's limits are not part of Workspace settings:
  // they are the sidebar's "Capacity summary" card and its page, Usage > Capacity.
  const nav0 = window.navRender;
  window.navRender = function () {
    if (tree === "workspace" && innerWidth >= 1024 && (!route.length || (route[0] === "access" && !/access/.test(location.hash)))) route = ["portfolio"];
    let h = nav0.apply(this, arguments);
    if (tree !== "workspace" || !h.includes('class="pnav"')) return h;
    h = h.replace('<div class="lbl0">Settings</div>', "").replace('<div class="pgh">This property</div>', "");
    let first = true;
    for (const k of TREES().workspace.kids) {
      if (k.hide || !k.g) continue;
      h = h.replace(`<a href="#/workspace/${k.id}"`, `<div class="${first ? "lbl0" : "pgh"}">${esc(k.g)}</div><a href="#/workspace/${k.id}"`);
      first = false;
    }
    return h;
  };
  // The page has already drawn once, before this ran, and opened "Permissions"; at the Workspace root open Properties instead.
  if (/^#\/workspace\/?$/.test(location.hash)) route = [];
  // Check a typed value before the prototype saves it (the page's own handler is on document, so this one on window runs first).
  window.addEventListener(
    "change",
    (e) => {
      const t = e.target;
      const k = t && t.dataset && t.dataset.pzs;
      if (!k || !k.startsWith("cw") || !t.dataset.cwv) return;
      const check = FIELD_ERRORS[t.dataset.cwv];
      const err = document.getElementById(`${t.id}-e`);
      const msg = check ? check(t.value.trim(), "cwreq" in t.dataset) : "";
      if (err) {
        err.hidden = !msg;
        err.textContent = msg;
      }
      t.setAttribute("aria-invalid", msg ? "true" : "false");
      if (msg) {
        e.stopImmediatePropagation();
        e.stopPropagation();
      }
    },
    true,
  );
  document.addEventListener("click", (e) => {
    // A link that leaves this page for another Client page (Capacity, Documents) keeps the address's query (?dark, ?as=, the version), as the sidebar's links do.
    const out = e.target.closest('a[target="_top"][href^="/client/"]');
    if (out && !out.dataset.cwq) {
      try {
        const [path, hash = ""] = out.getAttribute("href").split("#");
        out.setAttribute("href", path + window.top.location.search + (hash ? "#" + hash : ""));
        out.dataset.cwq = "1";
      } catch {
        /* a page we cannot read the address of: the plain link still works */
      }
    }
    const b = e.target.closest("[data-cw-act]");
    if (!b) return;
    e.preventDefault();
    try {
      window.toast(ACTIONS[b.dataset.cwAct] || "Done");
    } catch {
      /* the prototype's toast */
    }
  });
}
