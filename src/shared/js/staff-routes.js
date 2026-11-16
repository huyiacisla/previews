// The addresses of the pages that live inside the account-settings page: Staff (Settings, Workspace, Promotions, Support) and Resident (Settings).
//
// The page itself (staff/account-settings-content.html) keeps its position in the address after "#/…". The browser address a person sees and shares
// is a path, like the web app's: /staff/settings/profile, /staff/workspace, /staff/promotions, /staff/support, /resident/settings/personalize.
// Each of those paths is a small page (src/staff/…, src/resident/…) that shows the portal's header and sidebar and puts the settings page inside;
// this table turns one into the other. Longer positions come first so "#/settings/general" is not taken for "#/settings".

export const STAFF_ROUTES = [
  ["#/settings/availability", "/staff/settings/availability.html"],
  ["#/settings/notifications", "/staff/settings/notifications.html"],
  ["#/settings", "/staff/settings/profile.html"],
  ["#/workspace/access", "/staff/workspace/access.html"],
  ["#/workspace", "/staff/workspace.html"],
  ["#/promotions", "/staff/promotions.html"],
  ["#/support", "/staff/support.html"],
];

// A resident has no workspace: the list of settings is the page, and a few of its sections have a path of their own.
export const RESIDENT_ROUTES = [
  ["#/settings/general", "/resident/settings/profile.html"],
  ["#/settings/notifications", "/resident/settings/notifications.html"],
  ["#/settings/personalize", "/resident/settings/personalize.html"],
  ["#/settings/property", "/resident/settings/property.html"],
  ["#/settings", "/resident/settings.html"],
];

// The Client has a workspace and a Support page, but no Promotions.
export const CLIENT_ROUTES = [
  ["#/settings/availability", "/client/settings/availability.html"],
  ["#/settings/notifications", "/client/settings/notifications.html"],
  ["#/settings", "/client/settings/profile.html"],
  ["#/workspace/company", "/client/workspace/company.html"],
  ["#/workspace/portfolio", "/client/workspace/properties.html"],
  ["#/workspace/property", "/client/workspace/property.html"],
  ["#/workspace/parking", "/client/workspace/parking.html"],
  ["#/workspace/residents", "/client/workspace/residents.html"],
  ["#/workspace/access", "/client/workspace/access.html"],
  ["#/workspace/billing", "/client/workspace/billing.html"],
  ["#/workspace/reports", "/client/workspace/reports.html"],
  ["#/workspace/wsec", "/client/workspace/security.html"],
  ["#/workspace/docs", "/client/workspace/docs.html"],
  ["#/workspace/dockey", "/client/workspace/dockey.html"],
  ["#/workspace/data", "/client/workspace/data.html"],
  ["#/workspace", "/client/workspace.html"],
  ["#/support", "/client/support.html"],
];

// The Admin has their own settings only (no workspace): the list, and two sections with a path of their own.
export const ADMIN_ROUTES = [
  ["#/settings/general", "/admin/settings/profile.html"],
  ["#/settings/personalize", "/admin/settings/personalize.html"],
  ["#/settings", "/admin/settings.html"],
];

const table = (portal) => (portal === "resident" ? RESIDENT_ROUTES : portal === "client" ? CLIENT_ROUTES : portal === "admin" ? ADMIN_ROUTES : STAFF_ROUTES);

/** The path for a position of the settings page, or null when that position has no path of its own (it then stays under the page's own path). */
export function pathForHash(hash, portal = "staff") {
  const h = String(hash || "").replace(/[?].*$/, "");
  const hit = table(portal).find(([k]) => h === k);
  return hit ? hit[1] : null;
}

/** The position of the settings page for a path, or null. */
export function hashForPath(pathname, portal = "staff") {
  const clean = String(pathname || "").replace(/\.html$/, "");
  const hit = table(portal).find(([, p]) => p.replace(/\.html$/, "") === clean);
  return hit ? hit[0] : null;
}
