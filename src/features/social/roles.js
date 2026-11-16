// Who on the staff may do what in Social, by job title. Pure logic, no DOM. A resident sees one name, "Property team", whoever answers;
// the staff are told apart INSIDE, by title:
//   Property Manager ....... everything: bans, light pauses, turning Social off for a resident, the Rules, removing comments
//   Leasing Agent, Front Desk  ordinary requests and questions: they can warn a resident and remove a comment, but not pause, ban, switch Social off or change Rules
//   Maintenance Staff ...... repairs and equipment: no moderation of Social
// A call that carries no title (older code, tests) is not limited. The store checks it, so hiding a button is not the only guard.

export const STAFF_TITLES = ["Property Manager", "Leasing Agent", "Front Desk", "Maintenance Staff"];

const PERMISSIONS = {
  "Property Manager": { warn: true, pause: true, switchOff: true, rules: true, remove: true },
  "Leasing Agent": { warn: true, pause: false, switchOff: false, rules: false, remove: true },
  "Front Desk": { warn: true, pause: false, switchOff: false, rules: false, remove: true },
  "Maintenance Staff": { warn: false, pause: false, switchOff: false, rules: false, remove: false },
};

/** May a person with this title do this? `action`: warn | pause | switchOff | rules | remove. No title means no limit; an unknown title gets the Leasing Agent's rights. */
export function allowed(title, action) {
  if (title === undefined || title === null || title === "") return true;
  const p = PERMISSIONS[title] || PERMISSIONS["Leasing Agent"];
  return p[action] === true;
}

/** The sentence a person is told when they may not. */
export const notAllowed = (action) =>
  ({
    pause: "Only a Property Manager can pause or ban a resident.",
    switchOff: "Only a Property Manager can turn Social off for a resident.",
    rules: "Only a Property Manager can change the rules.",
    warn: "Your role cannot send warnings.",
    remove: "Your role cannot remove comments.",
  })[action] || "Your role cannot do that.";

/** Which action a violation of this kind is: a warning, or a pause (light pause and heavy ban). */
export const actionOfKind = (kind) => (kind === "warning" ? "warn" : "pause");
