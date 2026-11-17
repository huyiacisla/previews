// A long list shown short. The Resident information window can hold a lot (a resident with dozens of claims, a unit with several people, years of tickets): each list shows its
// first two rows with their number ("Show all 37"), and opens to the rest only when asked. Pure, so it is tested without a page.

export const FOLD_SHOWN = 2; // rows shown while folded
export const FOLD_MAX = 100; // rows drawn when open: a longer list says how many are left out

/**
 * What to draw for a list. `rows` is any list (a broken value counts as empty). Returns:
 *  - visible: the rows to draw now
 *  - total: how many rows there are
 *  - canFold: the list is longer than `shown`, so it has a Show all / Show fewer button
 *  - open: the list is open (only when it can fold)
 *  - hidden: how many rows are not drawn now (rows behind the fold, or beyond the cap when open)
 *  - label: the button's words ("Show all 37", "Show fewer"), "" when there is no button
 */
export function fold(rows, { shown = FOLD_SHOWN, open = false, max = FOLD_MAX } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const total = list.length;
  const n = Math.floor(Number(shown));
  const limit = n >= 1 ? n : FOLD_SHOWN; // a count that makes no sense (zero, negative, text) is the default
  const canFold = total > limit;
  const isOpen = canFold && !!open;
  const m = Math.floor(Number(max));
  const cap = Math.max(limit, m >= 1 ? m : FOLD_MAX);
  const visible = !canFold ? list : isOpen ? list.slice(0, cap) : list.slice(0, limit);
  return { visible, total, canFold, open: isOpen, hidden: total - visible.length, label: !canFold ? "" : isOpen ? "Show fewer" : `Show all ${total}` };
}
