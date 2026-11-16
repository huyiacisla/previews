// Source text is formatted by Biome: compare ignoring quote style, whitespace, trailing commas and semicolons.
const norm = (s) => s.replace(/['"`\s,;]/g, "");
export const has = (src, needle) => norm(src).includes(norm(needle));
