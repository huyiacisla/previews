// Our own emoji set: a hand-picked selection of Unicode characters with our own search keywords.
// Characters are plain text (the browser/OS draws them), so there are no image assets or third-party artwork to license.

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const EMOJI_CATEGORIES = [
  { id: 'smileys', label: 'Smileys', items: [
    ['😀', 'grin happy'], ['😃', 'smile happy'], ['😄', 'smile laugh'], ['😁', 'beam grin'], ['😆', 'laugh'], ['😅', 'sweat smile relief'],
    ['😂', 'joy laugh tears'], ['🙂', 'smile slight'], ['😉', 'wink'], ['😊', 'blush smile'], ['😍', 'love heart eyes'], ['😘', 'kiss'],
    ['😋', 'yum tasty'], ['😎', 'cool sunglasses'], ['🤔', 'think hmm'], ['😐', 'neutral'], ['😴', 'sleep tired'], ['😮', 'wow surprise'],
    ['😢', 'sad cry'], ['😭', 'sob cry'], ['😤', 'frustrated'], ['😡', 'angry'], ['🥳', 'party celebrate'], ['😬', 'awkward grimace'],
    ['🤯', 'mind blown'], ['😇', 'angel innocent'], ['🥲', 'tear smile'], ['🙃', 'upside down'],
  ] },
  { id: 'gestures', label: 'Gestures', items: [
    ['👍', 'thumbs up yes good'], ['👎', 'thumbs down no bad'], ['👌', 'ok perfect'], ['✌️', 'peace victory'], ['🤞', 'fingers crossed luck'], ['🙏', 'thanks please pray'],
    ['👏', 'clap applause'], ['🙌', 'hooray hands'], ['🤝', 'handshake deal'], ['💪', 'strong muscle'], ['👋', 'wave hello bye'], ['🤷', 'shrug unsure'],
    ['🙋', 'raise hand question'], ['👀', 'eyes look'], ['🫡', 'salute'], ['👉', 'point right'], ['👈', 'point left'], ['☝️', 'point up'],
  ] },
  { id: 'hearts', label: 'Hearts', items: [
    ['❤️', 'red heart love'], ['🧡', 'orange heart'], ['💛', 'yellow heart'], ['💚', 'green heart'], ['💙', 'blue heart'], ['💜', 'purple heart'],
    ['🖤', 'black heart'], ['🤍', 'white heart'], ['💔', 'broken heart'], ['💕', 'two hearts'], ['💖', 'sparkling heart'], ['💯', 'hundred perfect'],
  ] },
  { id: 'parking', label: 'Parking & travel', items: [
    ['🚗', 'car vehicle'], ['🚙', 'suv vehicle'], ['🚕', 'taxi cab'], ['🚌', 'bus'], ['🏍️', 'motorcycle bike'], ['🚲', 'bicycle'],
    ['🚛', 'truck delivery'], ['🚨', 'alert siren police'], ['🚧', 'construction barrier'], ['🚦', 'traffic light'], ['🛑', 'stop'], ['🅿️', 'parking'],
    ['⛽', 'fuel gas'], ['🔑', 'key'], ['🪪', 'id card permit'], ['🎫', 'ticket pass'], ['🧾', 'receipt invoice'], ['🔧', 'wrench repair'],
    ['🛠️', 'tools fix'], ['🏢', 'building office'], ['🏠', 'home house'], ['📍', 'pin location'], ['🗺️', 'map'], ['🧭', 'compass direction'],
  ] },
  { id: 'symbols', label: 'Symbols', items: [
    ['✅', 'check done yes'], ['❌', 'cross no wrong'], ['⚠️', 'warning caution'], ['❗', 'exclamation important'], ['❓', 'question'], ['ℹ️', 'info'],
    ['🔥', 'fire hot'], ['✨', 'sparkles new'], ['🎉', 'party tada'], ['⭐', 'star'], ['⏰', 'alarm clock time'], ['📅', 'calendar date'],
    ['📎', 'paperclip attach'], ['📷', 'camera photo'], ['📞', 'phone call'], ['💬', 'chat message'], ['🔔', 'bell notify'], ['🔒', 'lock secure'],
  ] },
];

/** A single emoji (with optional variation selector, skin tone or ZWJ sequence). Anything else is rejected. */
export const isEmoji = (s) =>
  typeof s === 'string' && s.length > 0 && s.length <= 16 &&
  /^\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic}️?)*$/u.test(s);

export function searchEmoji(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out = [];
  for (const c of EMOJI_CATEGORIES) for (const [ch, kw] of c.items) if (kw.includes(q)) out.push(ch);
  return out;
}
