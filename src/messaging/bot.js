// Assistant triage for residents. Pure functions: (bot state, input) -> { messages, patch, outcome }.
// Content is sample copy for the preview; operations should replace it with real answers.
//
// Design intent: the resident talks to the assistant first. Staff are NOT notified during this phase.
// Only an explicit "talk to a person" (or two unanswered questions) hands the chat to staff.

export const TOPICS = [
  {
    id: 'space',
    label: 'My parking space',
    faq: [
      { id: 'find', q: 'Where is my assigned space?', keys: ['where', 'assigned', 'my space', 'spot number', 'find'], a: 'Your assigned space is shown under My Parking. If it is blank, your assignment has not been approved yet and the property team will confirm it.' },
      { id: 'occupied', q: 'Someone is in my space', keys: ['occupied', 'someone', 'taken', 'in my space', 'blocked'], a: 'Please do not confront the driver. Send the plate and space number and the team will check the vehicle and arrange a tow if needed.', handoff: true },
      { id: 'change', q: 'I need a different space', keys: ['change', 'different', 'swap', 'move', 'closer'], a: 'Space changes are reviewed by the property team and depend on availability. Tell us why you need the change and we will review it.', handoff: true },
    ],
  },
  {
    id: 'permit',
    label: 'Vehicle or permit',
    faq: [
      { id: 'add', q: 'Add or change a vehicle', keys: ['add', 'new car', 'vehicle', 'plate', 'license', 'register'], a: 'Open Vehicles, choose Add vehicle, and enter the plate. Most vehicles are approved the same business day.' },
      { id: 'status', q: 'Is my permit approved?', keys: ['approved', 'status', 'permit', 'pending', 'pass'], a: 'Permit status is listed under Access & Passes. Pending requests are usually reviewed within one business day.' },
      { id: 'lost', q: 'Lost or damaged pass', keys: ['lost', 'damaged', 'broken', 'tag', 'hangtag', 'replacement'], a: 'Replacement passes are issued by the office. Staff will confirm how to collect one.', handoff: true },
    ],
  },
  {
    id: 'guest',
    label: 'Guest parking',
    faq: [
      { id: 'request', q: 'Request a guest pass', keys: ['guest', 'visitor', 'friend', 'family', 'temporary'], a: 'Guest passes are requested from Access & Passes. Add the guest plate and the dates; most are approved automatically.' },
      { id: 'limit', q: 'How long can a guest stay?', keys: ['how long', 'limit', 'days', 'overnight', 'stay'], a: 'Guest stays are limited by property rules shown on the request form. Longer stays need approval from the property team.' },
    ],
  },
  {
    id: 'report',
    label: 'Report a vehicle',
    faq: [
      { id: 'violation', q: 'Report a parking violation', keys: ['report', 'violation', 'illegal', 'fire lane', 'abandoned', 'blocking'], a: 'Send the plate, the location and what you saw. The team reviews every report and you will be told when it is resolved.', handoff: true },
      { id: 'tow', q: 'My car was towed', keys: ['tow', 'towed', 'missing', 'gone', 'impound'], a: 'Open Violations to see whether your vehicle was towed and where it was taken. If there is no record, the team will help right away.', handoff: true },
    ],
  },
  { id: 'other', label: 'Something else', faq: [] },
];

export const HANDOFF_CHOICE = { id: 'staff:request', label: 'Talk to a person' };
export const MENU_CHOICE = { id: 'menu', label: 'Back to topics' };
const HELPED = [{ id: 'helped:yes', label: 'Yes, thanks' }, { id: 'helped:no', label: 'No, talk to a person' }];

export const initialBotState = () => ({ topic: null, attempts: 0, lastFaq: null, answered: [] });

const topicChoices = () => [...TOPICS.map((t) => ({ id: `topic:${t.id}`, label: t.label })), HANDOFF_CHOICE];
const bot = (text, choices) => ({ kind: 'bot', text, ...(choices ? { choices } : {}) });

export function greeting() {
  return [
    bot('Hi, I am the EasySpotOps assistant. I can answer common parking questions right away, or pass you to the property team.'),
    bot('What do you need help with?', topicChoices()),
  ];
}

function topicMenu(topic) {
  if (!topic.faq.length) {
    return {
      messages: [bot('Tell me what is going on in a sentence or two, or let me pass it to the property team.', [HANDOFF_CHOICE, MENU_CHOICE])],
      patch: { topic: topic.id },
    };
  }
  return {
    messages: [bot(`Common questions about ${topic.label.toLowerCase()}:`, [
      ...topic.faq.map((f) => ({ id: `faq:${topic.id}:${f.id}`, label: f.q })),
      HANDOFF_CHOICE,
      MENU_CHOICE,
    ])],
    patch: { topic: topic.id },
  };
}

function answer(topic, faq) {
  const choices = faq.handoff ? [HANDOFF_CHOICE, { id: 'helped:yes', label: 'That is enough' }] : HELPED;
  return {
    messages: [bot(faq.a), bot(faq.handoff ? 'Would you like the team to follow up?' : 'Did that answer your question?', choices)],
    patch: { lastFaq: `${topic.id}:${faq.id}` },
    answered: `${topic.id}:${faq.id}`,
  };
}

/** A tap on a quick reply. Returns { messages, patch?, answered?, outcome? } */
export function onChoice(state, choiceId) {
  const [kind, a, b] = String(choiceId).split(':');
  if (kind === 'topic') {
    const topic = TOPICS.find((t) => t.id === a);
    return topic ? topicMenu(topic) : { messages: greeting().slice(1) };
  }
  if (kind === 'faq') {
    const topic = TOPICS.find((t) => t.id === a);
    const faq = topic?.faq.find((f) => f.id === b);
    return faq ? answer(topic, faq) : { messages: [bot('Sorry, I could not find that one.', topicChoices())] };
  }
  if (choiceId === 'helped:yes') {
    return { messages: [bot('Glad that helped. I will close this chat. You can message again any time.')], outcome: 'resolved' };
  }
  if (choiceId === 'helped:no' || choiceId === 'staff:request') return { messages: [], outcome: 'handoff' };
  if (choiceId === 'menu') return { messages: [bot('Sure. What do you need help with?', topicChoices())], patch: { topic: null } };
  return { messages: [bot('What do you need help with?', topicChoices())] };
}

const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

/** Free text typed by the resident. Tries keyword matching; after two misses it offers a person. */
export function onText(state, text) {
  const t = words(text);
  let best = null;
  for (const topic of TOPICS) {
    for (const faq of topic.faq) {
      const score = faq.keys.reduce((n, k) => n + (t.includes(k) ? 1 + k.split(' ').length * 0.1 : 0), 0);
      if (score > 0 && (!best || score > best.score)) best = { topic, faq, score };
    }
  }
  if (best) return answer(best.topic, best.faq);
  const attempts = (state.attempts || 0) + 1;
  if (attempts >= 2 || String(text).length > 160) {
    return {
      messages: [bot('I am not sure I can help with that one. Would you like me to pass it to the property team?', [HANDOFF_CHOICE, MENU_CHOICE])],
      patch: { attempts },
    };
  }
  return {
    messages: [bot('I did not quite catch that. Pick a topic below, or ask in a few words.', topicChoices())],
    patch: { attempts },
  };
}

/** Summary card the staff sees, so the resident never has to repeat themselves. */
export function summarize(state, transcript) {
  const topic = TOPICS.find((t) => t.id === state.topic);
  const asked = (state.answered || []).map((k) => {
    const [tid, fid] = k.split(':');
    return TOPICS.find((t) => t.id === tid)?.faq.find((f) => f.id === fid)?.q;
  }).filter(Boolean);
  const typed = transcript.filter((m) => m.kind === 'text' && !m.viaChoice).map((m) => m.text);
  return {
    topic: topic ? topic.label : 'General question',
    asked,
    details: typed.slice(-3),
  };
}
