// What a Staff person chose in Settings > Social (kept in "eso-social"), as the code that tells them about Social needs it. Pure logic, no DOM.
// Shared by the bell of the portal pages (notifications/live.js) and the bell of the Social page itself, so both say the same thing.

const readJson = (storage, key) => {
  try {
    return JSON.parse(storage.getItem(key)) || {};
  } catch {
    return {};
  }
};
const minutesOf = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/**
 * Pause Social (dnd.until), scheduled quiet hours (dnd.quiet, from, to, days; 0 is Sunday) and the Replies / Community switches (notif.reply, notif.ca).
 * `silent` means no Social item right now; `off` names the alert kinds (`meta`: 'Replies', 'C&A') the person switched off.
 */
export function staffSocialPrefs(storage, now = Date.now()) {
  const s = readJson(storage, "eso-social");
  const dnd = s.dnd && typeof s.dnd === "object" ? s.dnd : {};
  const notif = s.notif && typeof s.notif === "object" ? s.notif : {};
  const off = new Set();
  if (notif.reply === false) off.add("Replies");
  if (notif.ca === false) off.add("C&A");
  let silent = s.on === false ? false : Number(dnd.until) > now;
  if (!silent && dnd.quiet === true) {
    const from = minutesOf(dnd.from),
      to = minutesOf(dnd.to),
      d = new Date(now),
      cur = d.getHours() * 60 + d.getMinutes();
    const days = Array.isArray(dnd.days) ? dnd.days.map(Number) : [];
    if (from !== null && to !== null && from !== to) {
      const overnight = from > to;
      const inWindow = overnight ? cur >= from || cur < to : cur >= from && cur < to;
      const startDay = overnight && cur < to ? new Date(now - 86400000).getDay() : d.getDay();
      silent = inWindow && days.includes(startDay);
    }
  }
  return { silent, off };
}
