// Demo people for the preview. All names are made up; no real data.
// A real deployment replaces this with the signed-in user from the app.

export const PORTALS = {
  resident: { label: 'Resident', home: '/resident/home.html' },
  staff: { label: 'Staff', home: '/staff/dashboard.html' },
  client: { label: 'Client', home: '/client/dashboard.html' },
  admin: { label: 'Admin', home: '/admin/dashboard.html' },
};

export const PERSONAS = [
  { id: 'res-1', role: 'resident', name: 'Alex Rivera', title: 'Unit 02-291', org: 'Mallard Pointe at Riverbend' },
  { id: 'res-2', role: 'resident', name: 'Priya Nair', title: 'Unit 05-114', org: 'Mallard Pointe at Riverbend' },
  { id: 'res-3', role: 'resident', name: 'Morgan Ellis', title: 'Unit 08-033', org: 'Mallard Pointe at Riverbend' },
  { id: 'stf-1', role: 'staff', name: 'Jordan Lee', title: 'Property Manager', org: 'Mallard Pointe at Riverbend' },
  { id: 'stf-2', role: 'staff', name: 'Sam Okafor', title: 'Parking Coordinator', org: 'Mallard Pointe at Riverbend' },
  { id: 'cli-1', role: 'client', name: 'Dana Whitfield', title: 'Regional Director', org: 'Mallard Pointe Management' },
  { id: 'cli-2', role: 'client', name: 'Marcus Cole', title: 'Asset Manager', org: 'Mallard Pointe Management' },
  { id: 'adm-1', role: 'admin', name: 'Taylor Brooks', title: 'Support Lead', org: 'EasySpotOps Support' },
  { id: 'adm-2', role: 'admin', name: 'Casey Ng', title: 'Support Agent', org: 'EasySpotOps Support' },
];

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
