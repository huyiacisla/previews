// The sample promotions, in ONE place. Staff's Promotions page and the Resident's Promotions page both read them from here, so the two can never show
// different deals: Staff see all of them (with their status), a Resident sees the ones that are running.
//
// This file has no import and no export on purpose, so it works in two ways: Staff's page includes its text inside a <script> (the <!--include:--> of the
// build), and the Resident app (and the tests) import it for what it does, which is to define globalThis.PM_CATALOG. Do not add either keyword.
//
// What is here: the 29 sample deals, how each one is given a status (running, scheduled, draft, ended) and numbers, and how the running ones become the
// records the Resident app already reads (the same shape as what Staff publish). Staff's page then moves 2 of the ended ones to Storage and shows a
// 27-deal list: Live 16, Sold out 1, Expired 2, Saved 4 (not started), Drafts 4. The Resident sees the 17 that are running (Live 16 and Sold out 1).
((root) => {
  const gr = (a, b) => `linear-gradient(135deg,${a},${b})`;
  const CATS = [
    ["parking", "Parking", "🅿️"],
    ["moving", "Moving & Storage", "📦"],
    ["carcare", "Car care", "🚗"],
    ["ev", "EV charging", "⚡"],
    ["pets", "Pets", "🐾"],
    ["dining", "Local dining", "🍜"],
    ["services", "Services", "🧰"],
  ];

  /** A fresh copy each time: the status pass below rewrites each deal's badge text in place. A deal: [title, line, badge, price, gradient, emoji, views]. */
  function deals() {
    return {
      parking: [
        ["Mallard Pointe Valet", "20% off monthly valet for 3 months", "Ends Dec 15", "$96/mo", gr("#0f3d33", "#2f8f6f"), "🅿️", 412],
        ["Covered Spot Upgrade", "First month free on covered spots", "New", "$0 first mo", gr("#1e3a8a", "#6366f1"), "🏠", 268],
        ["Guest Pass Bundle", "10 extra guest-nights for $15", "Ends Nov 30", "$15", gr("#334155", "#94a3b8"), "🎟️", 190],
        ["Bike Locker", "Secure bike locker, half price", "Limited", "$10/mo", gr("#166534", "#4ade80"), "🚲", 88],
        ["Motorcycle Spot", "Reserved moto spot near Gate 1", "New", "$35/mo", gr("#7f1d1d", "#f87171"), "🏍️", 54],
      ],
      moving: [
        ["Riverbend Movers", "$75 off local moves", "Ends Nov 15", "from $299", gr("#9a3412", "#fb923c"), "🚚", 143],
        ["CubeSmart", "First month $1 at Riverbend storage", "Members", "$1", gr("#b91c1c", "#fca5a5"), "📦", 120],
        ["U-Haul", "Free 1-day trailer with truck", "Ends Nov 22", "Free", gr("#c2410c", "#fdba74"), "🛻", 76],
        ["PackRight", "15% off moving boxes & supplies", "Sample", "15% off", gr("#a16207", "#fde047"), "🧷", 40],
      ],
      carcare: [
        ["Sparkle Auto Spa", "Monthly unlimited washes $19.99", "Ends Nov 30", "$19.99/mo", gr("#0369a1", "#38bdf8"), "🧽", 201],
        ["QuickLube", "$25 off synthetic oil change", "New", "$25 off", gr("#1f2937", "#6b7280"), "🛢️", 98],
        ["Tire Hub", "Free rotation with any service", "Sample", "Free", gr("#111827", "#4b5563"), "🛞", 65],
        ["Glass Pro", "Windshield chip repair, on-site", "Limited", "$39", gr("#0e7490", "#67e8f9"), "🪟", 33],
      ],
      ev: [
        ["ChargePoint Home", "$100 off a Level 2 home charger", "Ends Dec 31", "$100 off", gr("#065f46", "#34d399"), "⚡", 310],
        ["Level 2 · Garage", "Overnight charging at $0.18/kWh", "Residents", "$0.18/kWh", gr("#14532d", "#86efac"), "🔌", 222],
        ["EV Rebate Help", "Free rebate paperwork check", "New", "Free", gr("#1e40af", "#93c5fd"), "🧾", 57],
        ["Tesla Service", "Mobile service visit $20 off", "Sample", "$20 off", gr("#0f172a", "#64748b"), "🔧", 44],
      ],
      pets: [
        ["Nationwide Pet Insurance", "Save more with Nationwide® pet", "Members", "Quote", gr("#7c2d12", "#fdba74"), "🐶", 188],
        ["Riverbend Pet Spa", "First grooming 30% off", "Ends Nov 20", "30% off", gr("#be185d", "#f9a8d4"), "🛁", 91],
        ["Rover", "$20 off first walk or sit", "New", "$20 off", gr("#047857", "#6ee7b7"), "🦮", 72],
        ["Chewy", "Free delivery on first order", "Sample", "Free", gr("#1d4ed8", "#a5b4fc"), "🐱", 50],
      ],
      dining: [
        ["Pho Riverbend", "Free spring rolls with 2 entrées", "Ends Nov 30", "Free", gr("#b45309", "#fcd34d"), "🍜", 154],
        ["Mallard Coffee", "Buy 5, get 1 free", "Ongoing", "BOGO", gr("#78350f", "#d6a874"), "☕", 133],
        ["Taqueria Luz", "10% off for residents", "New", "10% off", gr("#991b1b", "#fb7185"), "🌮", 60],
        ["Green Bowl", "$5 off first delivery", "Sample", "$5 off", gr("#3f6212", "#bef264"), "🥗", 39],
      ],
      services: [
        ["Handy Hero", "2 hrs handyman for $89", "Ends Dec 10", "$89", gr("#334155", "#cbd5e1"), "🛠️", 97],
        ["FreshFold Laundry", "Free pickup on first order", "New", "Free", gr("#0891b2", "#a5f3fc"), "🧺", 66],
        ["LockSmith Now", "Key fob copy $15", "Ongoing", "$15", gr("#4338ca", "#c7d2fe"), "🔑", 41],
        ["Sparkle Cleaners", "$40 off move-out cleaning", "Sample", "$40 off", gr("#0f766e", "#5eead4"), "🧹", 38],
      ],
    };
  }

  const TYPE = (o) => (/%/.test(o) ? "pct" : /\$\d+ off/i.test(o) ? "fixed" : /bundle|buy \d|get 1|\bfor \$|bogo/i.test(o) ? "bundle" : /free|first month|\$1\b/i.test(o) ? "trial" : "coupon");

  /** Where Staff's on/off choice for a sample deal is kept: { "parking3": "draft" | "active" }. A deal not in it has the status the catalog gave it. */
  const STATUS_KEY = "eso-pm-status";

  /** What Staff chose, made safe: only known ids and only the three choices (off = "draft", on = "active", later = "scheduled"). */
  function readOverrides(storage) {
    let raw = null;
    try {
      raw = JSON.parse(storage.getItem(STATUS_KEY));
    } catch {
      raw = null;
    }
    const out = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const k of Object.keys(raw)) if (/^[a-z]+\d{1,2}$/.test(k) && (raw[k] === "draft" || raw[k] === "active" || raw[k] === "scheduled")) out[k] = raw[k];
    }
    return out;
  }

  /** Where Staff's "Edit details" of a deal is kept: { "parking0": { d: [title, offer, null, price], code } }. Staff's page writes it; this only reads it, made safe. */
  const EDITS_KEY = "eso-pmedits";
  function readEdits(storage) {
    let raw = null;
    try {
      raw = JSON.parse(storage.getItem(EDITS_KEY));
    } catch {
      raw = null;
    }
    const out = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
    for (const k of Object.keys(raw)) {
      const e = raw[k];
      if (!/^[a-z]+\d{1,2}$/.test(k) || !e || typeof e !== "object") continue;
      const d = Array.isArray(e.d) ? e.d : [];
      const s = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
      const code = typeof e.code === "string" ? e.code.trim().toUpperCase() : undefined;
      const cat = typeof e.cat === 'string' && CATS.some(([v]) => v === e.cat) ? e.cat : undefined;
      out[k] = { title: s(d[0], 60), reward: s(d[1], 90), price: s(d[3], 30), code: code === undefined ? undefined : /^[A-Z0-9-]{3,20}$/.test(code) ? code : "", ...(cat ? { cat } : {}) };
    }
    return out;
  }

  /**
   * Give every deal an id ("parking0"), a status and numbers, and fix its badge text to match (one status, one label). `DEALS` is what deals() returned;
   * its deals are edited in place, as Staff's page always did. The demo clock is 30 Oct 2026 so the labels never depend on today's date.
   * `overrides` is what Staff turned on or off (readOverrides): a deal turned off becomes a draft (residents do not see it), one turned on becomes live.
   * A deal that was already running keeps its numbers when it is turned off; one that never ran starts with none when it is turned on.
   */
  function meta(DEALS, overrides) {
    const META = {};
    let gi = 0;
    const fd = (o) => new Date(2026, 9, 30 + o).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    CATS.forEach(([k]) =>
      DEALS[k].forEach((d, i) => {
        const n = gi++;
        const code =
          n % 3 !== 1
            ? d[0]
                .replace(/[^A-Za-z]/g, "")
                .slice(0, 5)
                .toUpperCase() +
              (10 + (n % 4) * 5)
            : "";
        const base = ["active", "active", "scheduled", "active", "expired", "draft", "active"][n % 7];
        const choice = overrides && overrides[k + i];
        const m = (META[k + i] = {
          id: k + i,
          k,
          i,
          d,
          st: base === "expired" ? base : choice || base, // an ended deal stays ended: it cannot be turned on again from here
          ty: code && n % 5 === 4 ? "coupon" : TYPE(d[1]),
          au: ["all", "members", "movein", "all"][n % 4],
          en: ["week", "month", "none", "month"][n % 4],
          bl: ["Building A", "Building B", "Garage"][n % 3],
          pb: ["QA Staff PM", "Dana Whitfield", "Sample"][n % 3],
          code,
          views: d[6],
          claims: Math.round(d[6] * 0.28) + n * 3,
          created: n,
          endsDays: [4, 18, 999, 25][n % 4] + (n % 3),
        });
        const ran = base === "active" || base === "expired"; // did it run in the catalog's own story? only then does it have numbers
        if (!ran) {
          m.views = 0;
          m.claims = 0;
        } else m.claims = Math.min(m.claims, Math.floor(m.views * 0.7));
        if (m.st === "expired") d[2] = "Ended " + fd(-((m.endsDays % 20) + 1));
        else if (m.st === "scheduled") d[2] = "Starts " + fd(3 + (n % 9));
        else if (m.st === "draft") d[2] = "Draft";
        else if (/^Ends /.test(d[2])) d[2] = m.endsDays >= 999 ? "Ongoing" : "Ends " + fd(m.endsDays);
      }),
    );
    return META;
  }

  /**
   * How much of each running deal is left, as Staff's stock board seeds it: the first three running deals are one with room (23 left), one low (3 left) and
   * one sold out. Returns { id: claims + left }, the limit to give each of those deals.
   */
  function limits(META) {
    const act = Object.values(META).filter((m) => m.st === "active");
    const out = {};
    [
      [act[0], 23],
      [act[1], 3],
      [act[2], 0],
    ].forEach(([m, left]) => {
      if (m) out[m.id] = m.claims + left;
    });
    return out;
  }

  /** The running deals as records of the shape Staff publish ({ id, st, x, claims }), which is what the Resident app reads. */
  function records(overrides, edits) {
    const META = meta(deals(), overrides);
    const lim = limits(META);
    return Object.values(META)
      .filter((m) => m.st === "active")
      .map((m) => {
        // what Staff changed with "Edit details" (title, offer, price, code) is what the resident reads too
        const e = (edits && edits[m.id]) || {};
        const title = e.title || m.d[0];
        const reward = e.reward || m.d[1];
        const price = e.price || m.d[3];
        const code = e.code === undefined ? m.code : e.code;
        return {
          id: m.id,
          st: "active",
          claims: m.claims,
          sample: true,
          x: {
            title,
            reward,
            desc: `${reward} (${price}).`,
            cat: e.cat || m.k,
            partner: title,
            offerText: price,
            badge: m.d[2],
            method: code ? "static" : "unique",
            code,
            prefix: "RES",
            limT: lim[m.id] || 0,
            limR: 1,
            au: "all",
            terms: "Sample offer. One per household.",
            visual: { gradient: m.d[4], emoji: m.d[5] },
          },
        };
      });
  }

  root.PM_CATALOG = { CATS, deals, meta, limits, records, readOverrides, readEdits, STATUS_KEY, EDITS_KEY };
})(globalThis);
