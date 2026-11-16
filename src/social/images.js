// The pictures of a post. Pure rules, no DOM (the composer in resident.js does the reading and shrinking; this file says what may be kept and shown).
//
// A post keeps its pictures as `img: [[background, alt]]`. A background is either a gradient (the sample posts) or a photo Staff attached: a small JPEG, PNG or
// WebP as a data URL, written as the CSS `background` the page sets on a box. Anything else is dropped when the post is read, so what is stored can never put a
// remote address or a script into the page.

export const MAX_IMAGES = 4;
export const MAX_ALT = 120;
export const MAX_SIDE = 1280; // a photo is shrunk to at most this many pixels on its long side
export const MAX_DATA_CHARS = 420000; // of its data URL (about 310 KB of picture): the preview keeps everything in the browser's small storage
export const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const GRADIENT = /^linear-gradient\([#0-9a-z%,.() -]+\)$/i;
const PHOTO = /^url\("data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}"\) center\/cover no-repeat$/;

/** The CSS background for a data URL of a photo. */
export const photoBg = (dataUrl) => `url("${dataUrl}") center/cover no-repeat`;

/** A background that may be shown: a gradient, or a photo of the kind and size allowed. Anything else is ''. */
export function safeBg(v) {
  if (typeof v !== 'string') return '';
  if (GRADIENT.test(v)) return v;
  return v.length <= MAX_DATA_CHARS + 64 && PHOTO.test(v) ? v : '';
}

/** The size a picture of w × h is shrunk to: its long side at most `max`, the shape kept, never larger than it was. */
export function fitSize(w, h, max = MAX_SIDE) {
  const long = Math.max(w, h);
  if (!(long > 0)) return { w: 0, h: 0 };
  const k = Math.min(1, max / long);
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/** Is this list of pictures allowed on a post? `list` is [[background, alt]]. Returns { ok, images: [[background, alt]] } (alt trimmed, never empty) or { ok: false, reason }. */
export function checkImages(list) {
  const items = Array.isArray(list) ? list : [];
  if (items.length > MAX_IMAGES) return { ok: false, reason: `A post can have up to ${MAX_IMAGES} photos.` };
  const images = [];
  for (const it of items) {
    const bg = safeBg(it && it[0]);
    if (!bg) return { ok: false, reason: 'One of the photos cannot be used. Remove it and add it again.' };
    const alt = String((it && it[1]) || '').trim();
    if (alt.length > MAX_ALT) return { ok: false, reason: `Keep a photo’s description under ${MAX_ALT} characters.` };
    images.push([bg, alt || 'Photo']);
  }
  return { ok: true, images };
}
