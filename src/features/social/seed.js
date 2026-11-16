// The sample timeline of Social. It is the same data the Staff account-settings prototype seeds on its first visit, so the Staff and Resident
// Social pages show the same posts even when the prototype has never been opened in this browser. Times are relative to "now".
// Once "eso-feed" exists it is never replaced; a real app replaces all of this with calls to the social API.

import { isEnded } from "../../shared/js/property-lifecycle.js";

const H = 3600000;
const M = 60000;
const G = [
  "linear-gradient(135deg,#334155,#64748b)",
  "linear-gradient(135deg,#0f766e,#22d3ee)",
  "linear-gradient(135deg,#1e3a8a,#6366f1)",
  "linear-gradient(135deg,#b45309,#f59e0b)",
  "linear-gradient(135deg,#166534,#4ade80)",
  "linear-gradient(135deg,#7f1d1d,#f87171)",
];

export function seedPosts(now = Date.now()) {
  return [
    {
      id: "p1",
      a: "me",
      t: now - 2 * H,
      ann: 1,
      pin: 1,
      src: "ann",
      vw: 523,
      aud: "all",
      txt: "Garage deep-cleaning this Saturday, 7 AM – 1 PM.\nLevels 1–2 will be closed in rotation. Please move vehicles from B-row to the surface lot by 6:45 AM. Cars left in B-row may be relocated (not towed).",
      img: [
        [G[0], "Garage level B · cleaning map"],
        [G[2], "Surface lot overflow"],
      ],
      likes: 48,
      lk: 0,
      rp: 6,
      rs: [
        {
          id: "r1",
          a: "alex",
          t: now - 90 * M,
          txt: "Does this include the EV row on level 2?",
          likes: 3,
          rs: [{ id: "r1a", a: "me", t: now - 80 * M, txt: "Level 2 EV row stays open until 10 AM — it's cleaned last.", likes: 5 }],
        },
        { id: "r2", a: "priya", t: now - 40 * M, txt: "Can we get a reminder Friday night? 🙏", likes: 7, rs: [] },
        { id: "r3", a: "marcus", t: now - 12 * M, txt: "Is the surface lot gated during cleaning?", likes: 1, rs: [], nr: 1 },
      ],
    },
    {
      id: "p2",
      a: "dana",
      t: now - 5 * H,
      ann: 1,
      src: "ann",
      vw: 349,
      aud: "all",
      txt: "Updated guest pass policy (effective Nov 1): each unit gets 10 guest-nights per month, max 3 consecutive nights. Passes are now issued digitally from the resident app — no paper dash tags.",
      poll: {
        q: "Is 10 guest-nights/month enough?",
        o: [
          ["Yes", 64],
          ["Need more", 31],
          ["Don't use guest passes", 18],
        ],
        v: null,
        end: now + 2 * 864e5,
      },
      likes: 31,
      lk: 0,
      rp: 9,
      rs: [
        { id: "r4", a: "rena", t: now - 3 * H, txt: "Will unused nights roll over?", likes: 12, rs: [], nr: 1 },
        { id: "r5", a: "alex", t: now - 150 * M, txt: "Digital passes 👏 finally", likes: 4, rs: [] },
      ],
    },
    {
      id: "p3",
      a: "luis",
      t: now - 50 * M,
      aud: "staff",
      txt: "Shift note (night): 2 vehicles flagged in fire lane near Building C. Warned via windshield notice at 11:40 PM, will recheck at 6 AM before any tow request.",
      likes: 6,
      lk: 0,
      rp: 0,
      rs: [{ id: "r6", a: "kim", t: now - 30 * M, txt: "Got it, I'll take the 6 AM recheck.", likes: 2, rs: [] }],
    },
    {
      id: "p4",
      a: "me",
      t: now - 26 * H,
      ann: 1,
      src: "ann",
      vw: 239,
      aud: "all",
      txt: "Towing notice: vehicles with expired permits after Nov 3 will receive one 48-hour warning, then may be towed at owner's expense. Renew in the resident app under Parking, then Permits.",
      likes: 22,
      lk: 0,
      rp: 4,
      rs: [{ id: "r7", a: "marcus", t: now - 20 * H, txt: "Where do I check my permit expiry?", likes: 2, rs: [], nr: 1 }],
    },
    {
      id: "p5",
      a: "priya",
      t: now - 3 * H,
      src: "com",
      vw: 241,
      aud: "all",
      txt: "The new EV chargers on level 2 are great — charged to 80% in under 2 hours ⚡ Anyone know if there's a time limit?",
      img: [[G[1], "Level 2 · EV chargers A-01 to A-06"]],
      likes: 19,
      lk: 0,
      rp: 1,
      rs: [{ id: "r8", a: "kim", t: now - 2 * H, txt: "4-hour limit during the day, posted on each charger. Overnight is unlimited.", likes: 9, rs: [] }],
    },
    {
      id: "p6",
      a: "kim",
      t: now - 7 * H,
      aud: "staff",
      txt: "Gate 2 keypad is sticking on the '5' key. Ticket opened with the vendor — use gate 1 for visitor check-in until fixed.",
      likes: 4,
      lk: 0,
      rp: 0,
      rs: [],
    },
    {
      id: "p7",
      a: "rena",
      t: now - 9 * H,
      src: "com",
      aud: "all",
      txt: "Lost & found: grey umbrella left near spot G-12 (guest row). Dropped it at the front office.",
      likes: 8,
      lk: 0,
      rp: 0,
      rs: [],
    },
    {
      id: "p8",
      a: "dana",
      t: now - 30 * H,
      src: "ann",
      aud: "all",
      txt: "Q4 parking survey results are in — 72% of residents want more covered guest spots. We're scoping 6 new covered spots by the pool lot. Details next month.",
      img: [
        [G[4], "Survey · 214 responses"],
        [G[3], "Proposed covered spots"],
        [G[5], "Pool lot today"],
      ],
      likes: 56,
      lk: 0,
      rp: 12,
      rs: [{ id: "r9", a: "alex", t: now - 28 * H, txt: "Yes please! Rainy season guests have nowhere to park.", likes: 14, rs: [] }],
    },
    {
      id: "p9",
      a: "dana",
      t: now - 11 * H,
      src: "promo",
      vw: 164,
      aud: "all",
      txt: "Holiday promo: sign up for monthly valet before Dec 15 and get 20% off the first 3 months. Residents can enroll in the app under Parking, then Valet.",
      img: [[G[3], "Valet · holiday offer"]],
      likes: 14,
      lk: 0,
      rp: 2,
      rs: [{ id: "r10", a: "marcus", t: now - 8 * H, txt: "Does this stack with the 2-car discount?", likes: 2, rs: [], nr: 1 }],
    },
  ];
}

/**
 * The Social of a property added in Capacity ("extra-1"…): its own feed, with one welcome announcement from the property team, made when the
 * property is bought. It never replaces a feed that exists. The first property uses ensureFeed() above. Returns true when it made one.
 */
export function ensurePropertyFeed(storage, id, name, now = Date.now()) {
  const key = `eso-feed:${id}`;
  try {
    if (!id || id === "main" || storage.getItem(key) || isEnded(storage, id)) return false;
    const text = `Welcome to ${String(name || "the property").slice(0, 80)}. News from the property team will appear here.`;
    storage.setItem(
      key,
      JSON.stringify({ posts: [{ id: "w1", a: "me", t: now, ann: 1, pin: 1, src: "ann", aud: "all", txt: text, likes: 0, lk: 0, rp: 0, rs: [] }], follow: [], seen: 0, rpv: 1, myRp: [] }),
    );
    return true;
  } catch {
    return false;
  }
}

/** Make sure the timeline exists in this browser. Returns true when it had to be created. Never replaces an existing one. */
export function ensureFeed(storage, now = Date.now()) {
  try {
    // A property that has ended has no feed, and nothing may make one: a page that only reads (the bell, a count) would bring back what was cut off.
    if (isEnded(storage, "main")) return false;
    if (storage.getItem("eso-feed")) return false;
    storage.setItem("eso-feed", JSON.stringify({ posts: seedPosts(now), follow: ["dana", "kim"], seen: 0, rpv: 1, myRp: [] }));
    return true;
  } catch {
    return false;
  }
}
