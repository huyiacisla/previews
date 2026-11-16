// Where the Back arrow of a settings page goes. Pure logic, so node --test can check every portal and every page (npm run check:back).
//
// The rule: Back returns to the page the person came from (Notifications, Messages, the dashboard…), as long as they have not
// moved inside settings since arriving. Once they have (list -> a section), Back is the page's own parent, the settings list.
//  - 'history': step back one page (the browser also restores the place on the page)
//  - 'crumb':   do what the page itself does (go up to its parent)

/**
 * @param {object} p
 * @param {string} p.referrer  document.referrer of the page that holds the frame ('' when opened directly, in a new tab, or from another site)
 * @param {string} p.origin    this site's origin
 * @param {string} p.pathname  path of the page that holds the frame, e.g. /staff/settings/notifications.html
 * @param {string} p.portal    'staff' | 'client' | 'resident'
 * @param {string} p.entryHash the position inside the page when it opened (e.g. #/settings/notifications)
 * @param {string} p.hash      the position now
 * @returns {'history'|'crumb'}
 */
export function backTarget({ referrer, origin, pathname, portal, entryHash, hash }) {
  if (hash !== entryHash) return 'crumb'; // they moved inside settings: Back goes up one level
  let ref;
  try { ref = new URL(referrer || 'about:blank'); } catch { return 'crumb'; }
  if (ref.origin !== origin) return 'crumb';
  if (!ref.pathname.startsWith(`/${portal}/`)) return 'crumb'; // another portal, or the site's start page
  if (ref.pathname === pathname) return 'crumb'; // a reload of this very page
  if (/\/account-settings(\.html)?$/.test(ref.pathname)) return 'crumb'; // the prototype's own page, not a place to return to
  return 'history';
}
