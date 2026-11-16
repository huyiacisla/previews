// Resident profile and personalization. Pure logic, no DOM. A resident edits only their own contact details and look;
// name, unit and email come from the property team (personas.js here, the property system in a real app).

export const prefKey = (residentId) => `eso-res-pref:${residentId}`;

export const THEMES = ["light", "dark", "system"];
export const CONTACTS = ["app", "email", "text"];

const read = (storage, key) => {
  try {
    const v = JSON.parse(storage.getItem(key));
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
};

export function readPrefs(storage, residentId) {
  const p = read(storage, prefKey(residentId));
  return {
    theme: THEMES.includes(p.theme) ? p.theme : "system",
    phone: typeof p.phone === "string" ? p.phone : "",
    contact: CONTACTS.includes(p.contact) ? p.contact : "app",
    contrast: p.contrast === true, // html[data-contrast]: heavier borders and text, for bright sun
    reduceMotion: p.reduceMotion === true, // html[data-reduce-motion]: no slides or fades, on top of the device setting
  };
}

/** Phone is optional; when given it needs 7 to 15 digits and only the usual punctuation. */
export function phoneError(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  if (!/^[+\d][\d\s().-]*$/.test(v)) return "Use digits, spaces and + ( ) - only.";
  const digits = v.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15 ? "" : "Enter 7 to 15 digits.";
}

/** Save a change. Only known fields are kept. Returns false when the value is invalid or storage is full. */
export function savePrefs(storage, residentId, patch) {
  const next = { ...readPrefs(storage, residentId) };
  if ("theme" in patch) {
    if (!THEMES.includes(patch.theme)) return false;
    next.theme = patch.theme;
  }
  if ("contact" in patch) {
    if (!CONTACTS.includes(patch.contact)) return false;
    next.contact = patch.contact;
  }
  for (const k of ["contrast", "reduceMotion"])
    if (k in patch) {
      if (typeof patch[k] !== "boolean") return false;
      next[k] = patch[k];
    }
  if ("phone" in patch) {
    if (phoneError(patch.phone)) return false;
    next.phone = String(patch.phone || "").trim();
  }
  try {
    storage.setItem(prefKey(residentId), JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/** Should the dark theme be on? `system` follows the device. */
export const isDark = (theme, systemDark) => (theme === "dark" ? true : theme === "light" ? false : !!systemDark);

/** A demo address from the name (the real one comes from the property system). */
export const demoEmail = (name) =>
  `${String(name)
    .toLowerCase()
    .replace(/[^a-z]+/g, ".")
    .replace(/^\.|\.$/g, "")}@mail.example`;
