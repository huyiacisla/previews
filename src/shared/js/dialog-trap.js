// Keep Tab inside an open native dialog. In a frame the browser lets Tab leave the box for the page behind it, so a keydown handler on the dialog wraps
// it by hand (docs/qa/09-social-admin-ghi-chu.md, lesson 8). Used by every dialog of the Admin and Client pages that is not the first of its page.
/**
 * Put the focus back where a dialog was opened from. A native dialog restores focus to whatever had it before, but a dialog opened from a menu item
 * (the menu closes first) has nothing to go back to, and the focus falls to the page: a keyboard user loses their place. `opener` is an element or
 * an id; `fallback` is tried when it is gone or hidden (a card that left the list after it was ended).
 */
export function restoreFocus(opener, fallback = []) {
  for (const o of [opener, ...fallback]) {
    const el = typeof o === 'string' ? document.getElementById(o) : o;
    if (el && el.isConnected && !el.hidden && !el.disabled && el.getClientRects().length) { el.focus(); return true; }
  }
  return false;
}

export function trapTab(dlg, e) {
  if (e.key !== 'Tab') return;
  const f = [...dlg.querySelectorAll('a[href],button,input,select,textarea,pre[tabindex]')].filter((x) => !x.disabled && !x.hidden && x.getClientRects().length);
  if (!f.length) return;
  const at = document.activeElement;
  if (e.shiftKey && at === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && at === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
}
