// Demo people for the preview. All names are made up; no real data.
// A real deployment replaces this with the signed-in user from the app.

import { propertyName, DEFAULT_PROPERTY } from '../../shared/js/property-name.js';

export const PORTALS = {
  resident: { label: 'Resident', home: '/resident/home.html' },
  staff: { label: 'Staff', home: '/staff/dashboard.html' },
  client: { label: 'Client', home: '/client/dashboard.html' },
  admin: { label: 'Admin', home: '/admin/dashboard.html' },
};

export const PERSONAS = [
  // `unit` holds made-up lease details shown in the context panel and used by unit:<number> search; `block` and `segments` are what Staff promotions can target (Building A/B/Garage, Members, New move-ins, Pet owners, EV drivers).
  { id: 'res-1', role: 'resident', name: 'Alex Rivera', title: 'Unit 02-291', org: 'Mallard Pointe at Riverbend', unit: { number: '02-291', building: 'Building 2', leaseStart: '2026-03-01', leaseEnd: '2027-02-28', block: 'Building A', segments: ['pet'], entry: 'Dog in unit. Call first.' } },
  { id: 'res-2', role: 'resident', name: 'Priya Nair', title: 'Unit 05-114', org: 'Mallard Pointe at Riverbend', unit: { number: '05-114', building: 'Building 5', leaseStart: '2026-08-15', leaseEnd: '2027-08-14', block: 'Building B', segments: ['movein', 'ev'], entry: 'Knock twice. Resident works nights.' } },
  { id: 'res-3', role: 'resident', name: 'Morgan Ellis', title: 'Unit 08-033', org: 'Mallard Pointe at Riverbend', unit: { number: '08-033', building: 'Building 8', leaseStart: '2025-12-16', leaseEnd: '2026-12-15', block: 'Building A', segments: ['members'], entry: 'Key in lockbox at the office.' } },
  { id: 'stf-1', role: 'staff', name: 'Jordan Lee', title: 'Property Manager', org: 'Mallard Pointe at Riverbend' },
  { id: 'stf-2', role: 'staff', name: 'Sam Okafor', title: 'Leasing Agent', org: 'Mallard Pointe at Riverbend' },
  { id: 'cli-1', role: 'client', name: 'Dana Whitfield', title: 'Client', org: 'AMC LLC' },
  { id: 'cli-2', role: 'client', name: 'Marcus Cole', title: 'Client', org: 'AMC LLC' },
  { id: 'adm-1', role: 'admin', name: 'Taylor Brooks', title: 'Support Lead', org: 'EasySpotOps Support' },
  { id: 'adm-2', role: 'admin', name: 'Casey Ng', title: 'Support Agent', org: 'EasySpotOps Support' },
];

// The property's own name (the Display name saved in its profile) stands wherever a person is shown with their property.
{
  const shown = propertyName();
  if (shown !== DEFAULT_PROPERTY) for (const p of PERSONAS) if (p.org === DEFAULT_PROPERTY) p.org = shown;
}

export const BOT = { id: 'bot', role: 'bot', name: 'EasySpotOps Assistant', title: 'Automated help', org: '' };

export const byId = Object.fromEntries([...PERSONAS, BOT].map((p) => [p.id, p]));

/** First persona of a role, or the one named by ?as=<id> if it matches that role. */
export function pickPersona(role, asId) {
  const wanted = asId && byId[asId];
  if (wanted && wanted.role === role) return wanted;
  return PERSONAS.find((p) => p.role === role);
}

export function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
