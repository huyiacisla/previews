// Moderating comments: what Staff may do to a comment, the reasons and rules for a violation, and what a resident is told. Pure logic, no DOM.
//
// Where it is kept (the Resident app only READS what Staff keep, and Staff only read what residents keep):
//   eso-feed   removed: { commentId: { t, reason?, vid?, quote } }       a comment Staff took out for everyone
//              vio:     [{ id, post, comment, who, name, reason, note, rule, kind, t, until?, quote }]   violations Staff recorded
//              hid:     [commentId]                                      comments the Staff person hid for themselves
//   eso-res-social:<id>   hidden: [commentId]                            comments this resident hid for themselves
//   a person's own comments: `ed` (edited at) and `del` (deleted at) on the comment itself
//
// A violation is for a RESIDENT's comment, has one reason from the list, and is either a warning or a pause: until the given date and time the resident
// can read Social but not comment, reply, react or share. The reason is tied to a block of the community guidelines, so the resident is told which rule.

export const REASONS = [
  { id: 'hate', label: 'Hate speech', rule: 'Be a good neighbor' },
  { id: 'harass', label: 'Harassment or bullying', rule: 'Be a good neighbor' },
  { id: 'privacy', label: 'Sharing private information', rule: 'Protect everyone’s privacy' },
  { id: 'parking', label: 'Calling out a neighbor’s parking', rule: 'Parking disputes' },
  { id: 'spam', label: 'Spam or advertising', rule: 'Marketplace & promotions' },
  { id: 'gibberish', label: 'Gibberish or repeated letters', rule: 'Be a good neighbor' },
  { id: 'other', label: 'Another reason', rule: '' },
];

/** Does this comment look like gibberish, such as “Aaaaaaaaaaaaaaaa” or “asdfasdfasdfasdf”? Staff see it as a hint: the reason is picked for them, they still decide,
 *  so it leans towards staying quiet: excitement (“Noooooo!”, “lol lol lol”, “!!!!!”, a row of emoji) is not flagged. True for:
 *   - one letter 10 or more times in a row (not punctuation, not emoji),
 *   - a word of 12 or more letters that is a short chunk (2 to 4 letters) repeated 3 or more times (“asdfasdfasdf”, “hahahahahaha”),
 *   - 20 or more letters in all that use 3 different letters or fewer. */
export function looksLikeSpam(text) {
  const s = String(text || '').toLowerCase();
  if (/(\p{L})\1{9,}/u.test(s)) return true;
  if (s.split(/\s+/).some((w) => w.length >= 12 && /^(\p{L}{2,4})\1{2,}$/u.test(w))) return true;
  const letters = s.replace(/[^\p{L}\p{N}]/gu, '');
  return letters.length >= 20 && new Set(letters).size <= 3;
}
// Three things Staff can do. `light` is a reminder with a clock: the resident can still READ, but cannot comment, reply, react or share until the date; it is not a strike.
// `pause` is the HEAVY ban: it is a strike (3 strikes close the account for review) and shuts the resident out of Social completely until the date.
export const KINDS = [
  { id: 'warning', label: 'Warning only', hint: 'The resident is told. Nothing is paused.' },
  { id: 'light', label: 'Light pause (a reminder)', hint: 'Can read, cannot write until the date. Not a strike.' },
  { id: 'pause', label: 'Heavy ban (a strike)', hint: 'One strike. Shut out of Social until the date.' },
];
/** A kind that puts a clock on the resident: the light pause and the heavy ban. */
export const isHold = (x) => !!x && (x.kind === 'pause' || x.kind === 'light');
export const MIN_PAUSE_MS = 15 * 60 * 1000; // a pause shorter than this is not a pause
export const MAX_PAUSE_DAYS = 90;
export const MAX_NOTE = 300;

// The rules Staff can set on the Violations page (kept in eso-feed `rules`; the limits below are what they can be set to). Everything that decides a strike,
// a pause or a hold reads them from the feed, so the resident app and the Staff app always apply the same ones.
//   limit: strikes before an account is closed for review | minPauseMin / maxPauseDays: how short and how long a pause may be | requireNote: a note on every
//   violation (not only "another reason") | defaults: for each reason, what the Ban / Warn window starts on ({ kind, hours }).
export const RULE_LIMITS = { limit: [2, 10], minPauseMin: [5, 1440], maxPauseDays: [1, 365] };
export const DEFAULT_RULES = {
  limit: 3, minPauseMin: 15, maxPauseDays: 90, requireNote: false,
  defaults: {
    hate: { kind: 'pause', hours: 72 }, harass: { kind: 'pause', hours: 24 }, privacy: { kind: 'pause', hours: 24 },
    parking: { kind: 'warning', hours: 0 }, spam: { kind: 'warning', hours: 0 }, gibberish: { kind: 'light', hours: 24 }, other: { kind: 'warning', hours: 0 },
  },
};
const clampInt = (n, [lo, hi], fallback) => (Number.isFinite(Number(n)) ? Math.min(hi, Math.max(lo, Math.round(Number(n)))) : fallback);

/** The rules in force: what Staff set, each value kept inside its limits, the rest as DEFAULT_RULES. `feed` is the parsed "eso-feed" (or null). */
export function rulesOf(feed) {
  const s = feed && feed.rules && typeof feed.rules === 'object' ? feed.rules : {};
  const d = DEFAULT_RULES;
  const maxPauseDays = clampInt(s.maxPauseDays, RULE_LIMITS.maxPauseDays, d.maxPauseDays);
  const defaults = {};
  for (const r of REASONS) {
    const x = (s.defaults && s.defaults[r.id]) || d.defaults[r.id];
    const kind = x && (x.kind === 'pause' || x.kind === 'light') ? x.kind : 'warning';
    defaults[r.id] = { kind, hours: kind !== 'warning' ?Math.min(maxPauseDays * 24, Math.max(1, Math.round(Number(x.hours) || d.defaults[r.id].hours || 24))) : 0 };
  }
  return {
    limit: clampInt(s.limit, RULE_LIMITS.limit, d.limit),
    minPauseMin: clampInt(s.minPauseMin, RULE_LIMITS.minPauseMin, d.minPauseMin),
    maxPauseDays, requireNote: s.requireNote === true, defaults,
    by: typeof s.by === 'string' ? s.by : '', t: Number(s.t) || 0,
  };
}

/** Is this new set of rules allowed? `input` is the form: { limit, minPauseMin, maxPauseDays, requireNote, defaults }. Returns { ok, rules } or
 *  { ok: false, reason, field } (`field`: the value that is wrong, so the form can mark it: 'limit', 'minPauseMin', 'maxPauseDays', or 'kind:<reason id>' / 'hours:<reason id>'). */
export function checkRules(input) {
  const inRange = (n, [lo, hi]) => Number.isInteger(Number(n)) && Number(n) >= lo && Number(n) <= hi;
  const no = (reason, field) => ({ ok: false, reason, field });
  if (!inRange(input.limit, RULE_LIMITS.limit)) return no(`Strikes before review: choose ${RULE_LIMITS.limit[0]} to ${RULE_LIMITS.limit[1]}.`, 'limit');
  if (!inRange(input.minPauseMin, RULE_LIMITS.minPauseMin)) return no(`Shortest pause: ${RULE_LIMITS.minPauseMin[0]} to ${RULE_LIMITS.minPauseMin[1]} minutes.`, 'minPauseMin');
  if (!inRange(input.maxPauseDays, RULE_LIMITS.maxPauseDays)) return no(`Longest pause: ${RULE_LIMITS.maxPauseDays[0]} to ${RULE_LIMITS.maxPauseDays[1]} days.`, 'maxPauseDays');
  if (Number(input.minPauseMin) > Number(input.maxPauseDays) * 1440) return no('The shortest pause cannot be longer than the longest.', 'minPauseMin');
  for (const r of REASONS) {
    const x = (input.defaults || {})[r.id];
    if (!x || !KINDS.some((k) => k.id === x.kind)) return no(`Choose a first action for “${r.label}”.`, `kind:${r.id}`);
    if (isHold(x)) {
      const h = Number(x.hours);
      if (!Number.isInteger(h) || h * 60 < Number(input.minPauseMin) || h > Number(input.maxPauseDays) * 24) return no(`“${r.label}”: the pause must be between the shortest and the longest pause.`, `hours:${r.id}`);
    }
  }
  const rules = rulesOf({ rules: { limit: Number(input.limit), minPauseMin: Number(input.minPauseMin), maxPauseDays: Number(input.maxPauseDays), requireNote: !!input.requireNote, defaults: input.defaults } });
  return { ok: true, rules };
}

export const reasonOf = (id) => REASONS.find((r) => r.id === id) || null;
export const reasonLabel = (id) => (reasonOf(id) || { label: 'a guideline violation' }).label;

/** The rule a reason points at, as the guidelines now say it: { title, text } (`blocks` is [[title, text]]), or null when the reason names no rule. */
export function ruleFor(reasonId, blocks) {
  const r = reasonOf(reasonId);
  if (!r || !r.rule) return null;
  const hit = (blocks || []).find((b) => b[0] === r.rule);
  return hit ? { title: hit[0], text: hit[1] } : { title: r.rule, text: '' };
}

/** Is this violation allowed? `{ reason, note, kind, until }`, `until` in ms. Returns { ok } or { ok: false, reason }. */
export function checkViolation(v, now = Date.now(), rules = DEFAULT_RULES) {
  if (!reasonOf(v.reason)) return { ok: false, reason: 'Choose a reason.' };
  const note = String(v.note || '').trim();
  if (v.reason === 'other' && note.length < 3) return { ok: false, reason: 'Say what the other reason is.' };
  if (rules.requireNote && note.length < 3) return { ok: false, reason: 'Add a short note: every violation needs one.' };
  if (note.length > MAX_NOTE) return { ok: false, reason: `Keep the note under ${MAX_NOTE} characters.` };
  if (!KINDS.some((k) => k.id === v.kind)) return { ok: false, reason: 'Choose a warning, a light pause or a heavy ban.' };
  if (isHold(v)) {
    const until = Number(v.until);
    if (!Number.isFinite(until)) return { ok: false, reason: 'Set the date and time the pause ends.' };
    const min = rules.minPauseMin === 15 ? '15 minutes' : rules.minPauseMin % 60 === 0 ? `${rules.minPauseMin / 60} hour${rules.minPauseMin === 60 ? '' : 's'}` : `${rules.minPauseMin} minutes`;
    if (until < now + rules.minPauseMin * 60000) return { ok: false, reason: `The pause must end at least ${min} from now.` };
    if (until > now + rules.maxPauseDays * 86400000) return { ok: false, reason: `A pause can last at most ${rules.maxPauseDays} day${rules.maxPauseDays === 1 ? '' : 's'}.` };
  }
  return { ok: true };
}

/** What a comment turns into when it is not shown as written. `removed` is the feed's { commentId: {…} }.
 *  Nodes are { id, parent, txt, del, key } (key: whose comment it is). Each kept node gets `state`: 'ok', 'deleted' (its author took it out) or 'removed' (Staff did).
 *  A deleted or removed comment with nothing under it disappears; one with answers under it stays as a placeholder so the thread still reads. The author of a
 *  removed comment keeps seeing it, with the reason (a removed comment of yours is never silently gone). */
export function settle(nodes, { removed = {}, viewer = '' } = {}) {
  const map = new Map();
  for (const n of nodes) {
    const rm = removed[n.id];
    n.state = rm ? 'removed' : n.del ? 'deleted' : 'ok';
    n.removal = rm || null;
    map.set(String(n.id), n);
  }
  let alive = [...nodes];
  for (;;) {
    const parents = new Set(alive.map((n) => (n.parent != null ? String(n.parent) : null)).filter(Boolean));
    const keep = alive.filter((n) => n.state === 'ok' || parents.has(String(n.id)) || (n.state === 'removed' && viewer && n.key === viewer));
    if (keep.length === alive.length) break;
    alive = keep;
  }
  return alive;
}

/** In a thread already in reading order (threads.js `nest`), make each comment's `replyCount` the answers under it that are really there, not placeholders. */
export function liveCounts(items) {
  for (let i = 0; i < items.length; i += 1) {
    let n = 0;
    for (let j = i + 1; j < items.length && items[j].depth > items[i].depth; j += 1) if (items[j].state === 'ok') n += 1;
    items[i].replyCount = n;
  }
  return items;
}

// Strikes: a violation that pauses a resident is a strike. A warning is on the record but is not a strike. Strikes are counted in threes: at STRIKE_LIMIT the account
// is closed for review until Staff open it again, and then those strikes are sealed into a FOLDER (kept in the resident's history, with when and by whom it was
// opened) and the count starts again from none. Nothing is ever deleted: a reset empties the three marks, not the record.
//   eso-feed   folders: [{ id, who, name, t (opened), strikes: [violation id × STRIKE_LIMIT] }]
export const STRIKE_LIMIT = 3;

/** A resident's standing from the violations on them (newest first, as `noticesOf` gives them) and the folders Staff opened for them:
 *  { count (strikes not yet in a folder), limit, atLimit,
 *    items:   [{ ...violation, strike: its number (in its folder, or in the current run) | 0 for a warning, counting: it is in the current run, folder: id | null }],
 *    folders: [{ ...folder, number: 1 for the first one opened, items: its strikes }]  (newest first) }. */
export function strikesOf(list, folders = [], limit = STRIKE_LIMIT) {
  const placed = new Map();
  for (const f of folders) (f.strikes || []).forEach((id, i) => placed.set(String(id), { folder: f.id, n: i + 1 }));
  const current = list.filter((v) => v.kind === 'pause' && !placed.has(String(v.id))).sort((a, b) => Number(a.t) - Number(b.t));
  const run = new Map(current.map((v, i) => [String(v.id), i + 1]));
  const items = list.map((v) => {
    const p = placed.get(String(v.id));
    return { ...v, folder: p ? p.folder : null, strike: v.kind !== 'pause' ? 0 : p ? p.n : run.get(String(v.id)), counting: v.kind === 'pause' && !p };
  });
  const byId = new Map(items.map((v) => [String(v.id), v]));
  const oldestFirst = [...folders].sort((a, b) => Number(a.t) - Number(b.t));
  const sealed = oldestFirst.map((f, i) => ({ ...f, number: i + 1, items: (f.strikes || []).map((id) => byId.get(String(id))).filter(Boolean) })).reverse();
  return { count: current.length, limit, atLimit: current.length >= limit, items, folders: sealed };
}

/** The folders Staff opened for a person, oldest first. */
export function foldersIn(feed, key) {
  const list = feed && Array.isArray(feed.folders) ? feed.folders : [];
  return list.filter((f) => f && f.who === key && Array.isArray(f.strikes)).sort((a, b) => Number(a.t) - Number(b.t));
}

/** The strikes of a person that are not in a folder yet, oldest first (violation records). */
export function currentStrikesIn(feed, key) {
  const placed = new Set(foldersIn(feed, key).flatMap((f) => f.strikes.map(String)));
  const list = feed && Array.isArray(feed.vio) ? feed.vio : [];
  return list.filter((v) => v && v.who === key && v.kind === 'pause' && !placed.has(String(v.id))).sort((a, b) => Number(a.t) - Number(b.t));
}

/** The hold a person is under right now: { id, until, reason, note, rule, ended, review } or null. `feed` is the parsed "eso-feed"; `key` is "res:<id>"; `resumed`
 *  is the ids of the pauses the person already came back from.
 *   - `review: true`: they are at STRIKE_LIMIT strikes. There is no clock: the account stays closed until Staff open it (folders), whatever the pauses say.
 *   - otherwise a pause does not end by itself: when its clock reaches zero the person is still held (`ended: true`) until they press Resume, so coming back is a
 *     step they take, with the guidelines read again. While any pause still runs, `ended` is false. */
export function holdIn(feed, key, resumed = new Set(), now = Date.now()) {
  const list = feed && Array.isArray(feed.vio) ? feed.vio : [];
  const current = currentStrikesIn(feed, key);
  const { limit } = rulesOf(feed);
  if (current.length >= limit) return { ...current[current.length - 1], review: true, ended: false, until: null, limit };
  const open = list.filter((v) => v && v.who === key && isHold(v) && !resumed.has(String(v.id)));
  if (!open.length) return null;
  open.sort((a, b) => Number(b.until) - Number(a.until)); // the one that lasts longest is the one that counts
  // `block`: a HEAVY ban (kind 'pause', a strike) shuts the person out completely. A light pause only stops writing: they can still read.
  // Any open heavy ban counts, even if a light pause lasts longer.
  return { ...open[0], ended: Number(open[0].until) <= now, limit, block: open.some((v) => v.kind === 'pause') };
}

/** Is this hold a complete shut-out? A heavy ban and three strikes (review) are; a light pause is not: the person can still read the feed. */
export const shutsOut = (hold) => !!hold && (hold.review === true || hold.block === true);

/** Every violation recorded against a person, newest first. */
export function violationsIn(feed, key) {
  const list = feed && Array.isArray(feed.vio) ? feed.vio : [];
  return list.filter((v) => v && v.who === key).sort((a, b) => Number(b.t) - Number(a.t));
}

/** The time left, split into days, hours, minutes and seconds for the clock. Never negative; a part rolls over exactly when it fills (23:59:59 → 1 day). */
export function clockParts(ms) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  return { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

/** The sentence a resident reads when their activity is paused. */
export function pauseMessage(v, fmt = (t) => new Date(t).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })) {
  if (v.review) return `You have reached ${v.limit || STRIKE_LIMIT} strikes. Your account is under review by the property team. Social opens when they reopen it.`;
  return v.ended ? 'Your pause is over. Press “Resume Social” to come back.' : `Your Social activity is paused until ${fmt(v.until)} (${reasonLabel(v.reason)}).`;
}
