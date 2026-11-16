// A property that has ended takes its people's access with it (property-lifecycle.js). Every Staff and Resident page asks first: if the property has
// ended, the page shows one message and nothing else, so there is nothing to click and no data to read. Admin and Client are not tied to one property.
import { hasLostAccess, NO_ACCESS } from './property-lifecycle.js';

const PORTALS = ['staff', 'resident'];

/** The words of the screen, for the person and for the tests. */
export const accessScreen = {
  title: NO_ACCESS,
  text: 'Your property is no longer part of EasySpotOps, so your account has been signed out. If you think this is a mistake, please contact your property office.',
};

export const portalOf = (pathname) => (String(pathname).match(/^\/(staff|client|resident|admin)\//) || [])[1] || null;

/** True when the page was replaced by the message. Call it before anything else on the page is built. */
export function guardAccess({ pathname = location.pathname, storage = globalThis.localStorage, doc = globalThis.document } = {}) {
  if (!PORTALS.includes(portalOf(pathname))) return false;
  let lost = false;
  try { lost = hasLostAccess(storage); } catch { lost = false; }
  if (!lost) return false;
  doc.title = 'Signed out';
  const root = doc.documentElement;
  root.removeAttribute('data-eso-wait'); // the page was held back until its frame was ready: there is no frame to wait for now
  doc.body.replaceChildren();
  const main = doc.createElement('main');
  main.setAttribute('role', 'alert');
  main.style.cssText = 'display:grid;min-height:100dvh;place-items:center;padding:24px;text-align:center;background:var(--background);color:var(--foreground);font-family:inherit';
  const box = doc.createElement('div');
  box.style.cssText = 'max-width:28rem';
  const h = doc.createElement('h1');
  h.textContent = accessScreen.title;
  h.style.cssText = 'font-size:1.5rem;line-height:2rem;font-weight:600;margin:0 0 .5rem';
  const p = doc.createElement('p');
  p.textContent = accessScreen.text;
  p.style.cssText = 'margin:0;color:var(--muted-foreground);font-size:.875rem;line-height:1.25rem';
  box.append(h, p);
  main.append(box);
  doc.body.append(main);
  return true;
}
