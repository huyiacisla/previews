// Assistant triage for residents. Pure functions: (bot state, input) -> { messages, patch, outcome, route }.
// Content is sample copy for the preview; operations should replace it with real answers.
//
// Design intent: the resident talks to the assistant first. Nobody is notified during this phase.
// Only an explicit "talk to a person" (or two unanswered questions) hands the chat to a team, and the assistant knows WHICH team:
//   Property team        the building's own staff: parking space, vehicles, permits, guests, violations, tows, emergencies.
//   EasySpotOps Support  the platform's own support: a problem with the app itself (log in, notifications, a blank page, a message that will not send).
// The goal is the right person, in the right place, with the right help: it asks when it cannot tell, and never guesses between the two.

export const ROUTES = {
  property: { id: "property", label: "Property team", scope: "parking, vehicles, permits, guests and violations", handler: "staff" },
  platform: { id: "platform", label: "EasySpotOps Support", scope: "problems with the app itself", handler: "admin" },
};

export const TOPICS = [
  {
    id: "space",
    label: "My parking space",
    route: "property",
    faq: [
      {
        id: "find",
        q: "Where is my assigned space?",
        keys: ["where", "assigned", "my space", "spot number", "find"],
        a: "Your assigned space is shown under My Parking. If it is blank, your assignment has not been approved yet and the property team will confirm it.",
      },
      {
        id: "occupied",
        q: "Someone is in my space",
        keys: ["occupied", "someone", "taken", "in my space", "blocked"],
        a: "Please do not confront the driver. Send the plate and space number and the team will check the vehicle and arrange a tow if needed.",
        handoff: true,
      },
      {
        id: "change",
        q: "I need a different space",
        keys: ["change", "different", "swap", "move", "closer"],
        a: "Space changes are reviewed by the property team and depend on availability. Tell us why you need the change and we will review it.",
        handoff: true,
      },
    ],
  },
  {
    id: "permit",
    label: "Vehicle or permit",
    route: "property",
    faq: [
      {
        id: "add",
        q: "Add or change a vehicle",
        keys: ["add", "new car", "vehicle", "plate", "license", "register"],
        a: "Open Vehicles, choose Add vehicle, and enter the plate. Most vehicles are approved the same business day.",
      },
      {
        id: "status",
        q: "Is my permit approved?",
        keys: ["approved", "status", "permit", "pending", "pass"],
        a: "Permit status is listed under Access & Passes. Pending requests are usually reviewed within one business day.",
      },
      {
        id: "lost",
        q: "Lost or damaged pass",
        keys: ["lost", "damaged", "broken", "tag", "hangtag", "replacement"],
        a: "Replacement passes are issued by the office. Staff will confirm how to collect one.",
        handoff: true,
      },
    ],
  },
  {
    id: "guest",
    label: "Guest parking",
    route: "property",
    faq: [
      {
        id: "request",
        q: "Request a guest pass",
        keys: ["guest", "visitor", "friend", "family", "temporary"],
        a: "Guest passes are requested from Access & Passes. Add the guest plate and the dates; most are approved automatically.",
      },
      {
        id: "limit",
        q: "How long can a guest stay?",
        keys: ["how long", "limit", "days", "overnight", "stay"],
        a: "Guest stays are limited by property rules shown on the request form. Longer stays need approval from the property team.",
      },
    ],
  },
  {
    id: "report",
    label: "Report a vehicle",
    route: "property",
    faq: [
      {
        id: "violation",
        q: "Report a parking violation",
        keys: ["report", "violation", "illegal", "fire lane", "abandoned", "blocking"],
        a: "Send the plate, the location and what you saw. The team reviews every report and you will be told when it is resolved.",
        handoff: true,
      },
      {
        id: "tow",
        q: "My car was towed",
        keys: ["tow", "towed", "missing", "gone", "impound"],
        a: "Open Violations to see whether your vehicle was towed and where it was taken. If there is no record, the team will help right away.",
        handoff: true,
      },
    ],
  },
  {
    id: "app",
    label: "A problem with the app",
    route: "platform",
    faq: [
      {
        id: "login",
        q: "I cannot log in",
        keys: ["log in", "login", "sign in", "password", "locked out", "verification code"],
        a: "Try resetting your password from the sign-in page. If the code or the email never arrives, EasySpotOps Support can look at your account.",
        route: "platform",
        handoff: true,
      },
      {
        id: "notify",
        q: "Notifications do not arrive",
        keys: ["notification", "notifications", "not receiving", "never arrives", "no alerts"],
        a: "Check Settings > Notifications and your phone settings first. If both are on and nothing arrives, EasySpotOps Support can check what is sent to you.",
        route: "platform",
        handoff: true,
      },
      {
        id: "blank",
        q: "A page is blank or shows an error",
        keys: ["blank", "not loading", "error", "crash", "crashes", "crashed", "freezes", "frozen", "bug", "glitch", "broken page"],
        a: "Reload the page once. If it is still blank or shows an error, EasySpotOps Support will fix it. Tell us which page it was.",
        route: "platform",
        handoff: true,
      },
      {
        id: "send",
        q: "My message will not send",
        keys: ["cannot send", "can t send", "cant send", "not sending", "will not send", "won t send", "messages not"],
        a: "Your text is kept so nothing is lost. Try again in a moment. If it keeps failing, EasySpotOps Support can look into it.",
        route: "platform",
        handoff: true,
      },
    ],
  },
  { id: "other", label: "Something else", route: null, faq: [] },
];

export const HANDOFF_CHOICE = { id: "staff:request", label: "Talk to a person" };
export const ROUTE_PROPERTY = { id: "route:property", label: "Property team" };
export const ROUTE_PLATFORM = { id: "route:platform", label: "EasySpotOps Support" };
export const MENU_CHOICE = { id: "menu", label: "Back to topics" };
const HELPED = [
  { id: "helped:yes", label: "Yes, thanks" },
  { id: "helped:no", label: "No, talk to a person" },
];

export const initialBotState = () => ({ topic: null, route: null, attempts: 0, lastFaq: null, answered: [] });

const topicChoices = () => [...TOPICS.map((t) => ({ id: `topic:${t.id}`, label: t.label })), HANDOFF_CHOICE];
const bot = (text, choices) => ({ kind: "bot", text, ...(choices ? { choices } : {}) });

export function greeting() {
  return [
    bot("Hi, I am the EasySpotOps assistant. I can answer common questions right away, or pass you to the property team or to EasySpotOps Support."),
    bot("What do you need help with?", topicChoices()),
  ];
}

/** Which team a sentence is about: 'emergency' | 'property' | 'platform' | 'both' | null (cannot tell). */
// Danger to people (not a parking matter): fire, smoke, gas, flood, injury, a weapon, and a blocked way out ("a truck blocks the fire exit"). "Fire lane" is a parking violation, not this.
const EMERGENCY =
  /\b(on fire|a fire|fire in|smoke|gas leak|flood\w*|injur\w*|bleeding|ambulance|medical emergency|unconscious|weapon|gun|break ?in|someone is hurt|heart attack|(fire|emergency) exit|exit (is |are )?(blocked|obstructed)|(block\w*|obstruct\w*|chain\w*) (the |an? )?(only )?(fire |emergency )?exit)\b/;
const PLATFORM =
  /\b(app|application|website|crash\w*|freez\w*|frozen|bug|glitch\w*|error|log ?in|sign ?in|password|verification code|blank|not loading|notification\w*|can t send|cant send|cannot send|not sending)\b/;
const PROPERTY =
  /\b(park\w*|space|spot|car|truck|motorcycle|vehicle|plate|permit|pass|guest|visitor|tow\w*|gate|garage|violation|neighbou?r|noise|lease|rent|office|maintenance|fire lane|blocked|blocking|building|unit)\b/;
export function classify(text) {
  const t = words(text);
  if (EMERGENCY.test(t)) return "emergency";
  const p = PROPERTY.test(t);
  const a = PLATFORM.test(t);
  return p && a ? "both" : a ? "platform" : p ? "property" : null;
}

/** "Talk to a person" in one's own words ("talk to the team", "I need a human", "can I speak with the office"). */
const wantsPerson = (t) =>
  /\b(human|representative|operator|real person|live person)\b/.test(t) ||
  /\b(talk|speak|chat|connect me|put me through)\b.{0,12}\b(someone|somebody|a person)\b/.test(t) ||
  (/\b(talk|speak|chat|contact|reach|connect|call|message|ask|need|want|get)\b/.test(t) && /\b(person|staff|team|manager|office|agent|support|leasing|front desk|easyspotops)\b/.test(t));

const askRoute = () => ({
  messages: [
    bot(`Who should I pass this to? The ${ROUTES.property.label} handles ${ROUTES.property.scope}. ${ROUTES.platform.label} handles ${ROUTES.platform.scope}.`, [
      ROUTE_PROPERTY,
      ROUTE_PLATFORM,
      MENU_CHOICE,
    ]),
  ],
});
const handoff = (route) => ({ messages: [], outcome: "handoff", route, patch: { route } });

/** When the company switched "Assistant answers first" off: the first thing a resident is asked is where to send the message. */
export function directGreeting() {
  return [
    bot(`Hi. Who should I pass your message to? The ${ROUTES.property.label} handles ${ROUTES.property.scope}. ${ROUTES.platform.label} handles ${ROUTES.platform.scope}.`, [
      ROUTE_PROPERTY,
      ROUTE_PLATFORM,
      { id: "menu", label: "Ask the assistant first" },
    ]),
  ];
}

function topicMenu(topic) {
  if (!topic.faq.length) {
    return {
      messages: [bot("Tell me what is going on in a sentence or two, or let me pass it to a person.", [HANDOFF_CHOICE, MENU_CHOICE])],
      patch: { topic: topic.id, route: null },
    };
  }
  return {
    messages: [bot(`Common questions about ${topic.label.toLowerCase()}:`, [...topic.faq.map((f) => ({ id: `faq:${topic.id}:${f.id}`, label: f.q })), HANDOFF_CHOICE, MENU_CHOICE])],
    patch: { topic: topic.id, route: topic.route || null },
  };
}

function answer(topic, faq) {
  const route = faq.route || topic.route || null;
  const person = route === "platform" ? ROUTE_PLATFORM : HANDOFF_CHOICE;
  const choices = faq.handoff ? [person, { id: "helped:yes", label: "That is enough" }] : HELPED;
  return {
    messages: [
      bot(faq.a),
      bot(faq.handoff ? (route === "platform" ? "Would you like EasySpotOps Support to follow up?" : "Would you like the team to follow up?") : "Did that answer your question?", choices),
    ],
    patch: { lastFaq: `${topic.id}:${faq.id}`, route },
    answered: `${topic.id}:${faq.id}`,
  };
}

/** A tap on a quick reply. Returns { messages, patch?, answered?, outcome?, route? } */
export function onChoice(state, choiceId) {
  const [kind, a, b] = String(choiceId).split(":");
  if (kind === "topic") {
    const topic = TOPICS.find((t) => t.id === a);
    return topic ? topicMenu(topic) : { messages: greeting().slice(1) };
  }
  if (kind === "faq") {
    const topic = TOPICS.find((t) => t.id === a);
    const faq = topic?.faq.find((f) => f.id === b);
    return faq ? answer(topic, faq) : { messages: [bot("Sorry, I could not find that one.", topicChoices())] };
  }
  if (kind === "route" && ROUTES[a]) return handoff(a);
  if (choiceId === "helped:yes") {
    return { messages: [bot("Glad that helped. I will close this chat. You can message again any time.")], outcome: "resolved" };
  }
  // "Talk to a person": when the topic already says where it belongs, go there; otherwise ask, never guess.
  if (choiceId === "helped:no" || choiceId === "staff:request") return state && state.route ? handoff(state.route) : askRoute();
  if (choiceId === "menu") return { messages: [bot("Sure. What do you need help with?", topicChoices())], patch: { topic: null, route: null } };
  return { messages: [bot("What do you need help with?", topicChoices())] };
}

const words = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");

/** Free text typed by the resident. Tries keyword matching; after two misses it offers a person. */
export function onText(state, text) {
  const t = words(text);
  const kind = classify(t);
  // Danger first: always the property team, whatever else is said.
  if (kind === "emergency") {
    return {
      messages: [bot("If anyone is in danger right now, call 911 first. I am sending this to the property team straight away.")],
      outcome: "handoff",
      route: "property",
      patch: { route: "property", urgent: true },
    };
  }
  if (wantsPerson(t)) {
    if (kind === "property" || kind === "platform") return handoff(kind);
    return state && state.route ? handoff(state.route) : askRoute();
  }
  let best = null;
  for (const topic of TOPICS) {
    for (const faq of topic.faq) {
      const score = faq.keys.reduce((n, k) => n + (t.includes(k) ? 1 + k.split(" ").length * 0.1 : 0), 0);
      if (score > 0 && (!best || score > best.score)) best = { topic, faq, score };
    }
  }
  // A sentence about the app answers from the app's own questions, even if a parking word also matched.
  if (kind === "platform") {
    const app = TOPICS.find((x) => x.id === "app");
    const hit = app.faq.map((f) => ({ f, s: f.keys.reduce((n, k) => n + (t.includes(k) ? 1 : 0), 0) })).sort((x, y) => y.s - x.s)[0];
    if (hit && hit.s > 0) return answer(app, hit.f);
    return { messages: [bot(`That sounds like a problem with the app itself. ${ROUTES.platform.label} looks after that.`, [ROUTE_PLATFORM, MENU_CHOICE])], patch: { route: "platform" } };
  }
  if (best) return answer(best.topic, best.faq);
  const attempts = (state.attempts || 0) + 1;
  if (attempts >= 2 || String(text).length > 160) {
    return {
      messages: [bot("I am not sure I can help with that one. Would you like me to pass it to a person?", [HANDOFF_CHOICE, MENU_CHOICE])],
      patch: { attempts },
    };
  }
  return {
    messages: [bot("I did not quite catch that. Pick a topic below, or ask in a few words.", topicChoices())],
    patch: { attempts },
  };
}

/** Summary card the receiving team sees, so the resident never has to repeat themselves. */
export function summarize(state, transcript) {
  const topic = TOPICS.find((t) => t.id === state.topic);
  const asked = (state.answered || [])
    .map((k) => {
      const [tid, fid] = k.split(":");
      return TOPICS.find((t) => t.id === tid)?.faq.find((f) => f.id === fid)?.q;
    })
    .filter(Boolean);
  const typed = transcript.filter((m) => m.kind === "text" && !m.viaChoice).map((m) => m.text);
  return {
    topic: topic ? topic.label : "General question",
    route: state.route || "property",
    asked,
    details: typed.slice(-3),
  };
}
