// What the company (the Client) decided for its residents in Client > Workspace settings > Company and Residents. Pure logic, no DOM.
// The Client's Settings page keeps them in "client:eso-proto" (cwMgmt, cwSocial, cwPromos, cwTickets, cwBotFirst, cwName). Every switch starts on.

const KEY = 'client:eso-proto';
const DEFAULT_COMPANY = 'AMC LLC';

/** { mgmt, social, promos, tickets, botFirst, mfa, name }: (mfa: the company requires 2-step verification of everyone in its workspace) booleans (on unless the company switched it off) and the company's name. Broken storage means the defaults. */
export function companyPrefs(storage = globalThis.localStorage) {
  let s = null;
  try { s = JSON.parse(storage.getItem(KEY)); } catch { s = null; }
  s = s && typeof s === 'object' ? s : {};
  const on = (k) => s[k] === undefined ? true : !(s[k] === false || s[k] === 0 || s[k] === '0');
  const name = typeof s.cwName === 'string' && s.cwName.trim() ? s.cwName.trim().slice(0, 120) : DEFAULT_COMPANY;
  return { mgmt: on('cwMgmt'), social: on('cwSocial'), promos: on('cwPromos'), tickets: on('cwTickets'), botFirst: on('cwBotFirst'), mfa: on('cwMfa'), name };
}
