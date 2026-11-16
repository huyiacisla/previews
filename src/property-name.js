// The property's own name: the "Display name" the Staff person saved in the property profile (Settings > Workspace > Property profile, kept in "eso-prop").
// Pure logic, no DOM. Everything that names the property (the dashboards, Messages, a resident's My property) reads it from here.

export const DEFAULT_PROPERTY = 'Mallard Pointe at Riverbend';

/** The name to show: the saved display name (trimmed, at most 80 characters), else the property's own default. Broken storage means the default. */
export function propertyName(storage = globalThis.localStorage) {
  try {
    const d = JSON.parse(storage.getItem('eso-prop'))?.display;
    const s = typeof d === 'string' ? d.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
    return s || DEFAULT_PROPERTY;
  } catch {
    return DEFAULT_PROPERTY;
  }
}
