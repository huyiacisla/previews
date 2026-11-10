// One header and one sidebar design for every portal page of a role.
//
// The Staff dashboard (and the account-settings prototype) carry the header and sidebar the team designed. The Client dashboard
// is a snapshot of a different frame, so a Client page and a Client Settings page used to look like two products. This module
// builds the Client's header and sidebar from the Staff design (same markup, same classes, same stylesheet) and fills them with
// the Client's own menu, name and account details. Pages call adoptStaffFrame() before anything else in preview.js touches them.
//
// Nothing here writes to Staff data; it only reads /staff/dashboard.html and copies its frame.

const SVG_BUILDING = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"></path><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"></path><path d="M10 6h4M10 10h4M10 14h4M10 18h4"></path></svg>';

// The Client menu: [group, [[label, icon taken from this Staff item, href]]]. A null group is the unlabelled first block.
export const CLIENT_MENU = [
  [null, [['Dashboard', 'Dashboard', '/client/dashboard.html']]],
  ['Portfolio', [['Properties', null, '#'], ['Reports', 'Reports', '#']]],
  ['Operations', [['People & Access', 'Residents', '#'], ['Vehicles', 'Vehicles', '#'], ['Parking', 'Parking Inventory', '#'], ['Requests', 'Requests', '#'], ['Violations', 'Violations', '#']]],
  ['Communication', [['Messages', 'Messages', '/client/messages.html'], ['Calendar', 'Calendar', '#'], ['Activity', 'Activity', '#']]],
  ['Management', [['Staff & Access', 'Staff & Access', '#'], ['Billing & Plan', 'Plan & Capacity', '#']]],
  ['Data & Recovery', [['Recovery', 'Updates & Recovery', '#']]],
  ['Settings', [['Workspace Settings', 'Settings', '/client/account-settings.html#/workspace']]],
];

const labelOf = (a) => a.querySelector('span.truncate')?.textContent.trim();

function setText(root, from, to) {
  for (const e of root.querySelectorAll('*')) if (!e.children.length && e.textContent.trim() === from) e.textContent = to;
}

async function addStylesheets(staffDoc) {
  const have = new Set([...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => new URL(l.getAttribute('href'), location.href).href));
  const waits = [];
  for (const l of staffDoc.querySelectorAll('link[rel="stylesheet"]')) {
    const href = new URL(l.getAttribute('href'), location.origin).href;
    if (have.has(href)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    waits.push(new Promise((r) => { link.onload = r; link.onerror = r; setTimeout(r, 2500); }));
    document.head.appendChild(link);
  }
  await Promise.all(waits);
}

function buildHeader(staffDoc, me, initials) {
  const header = document.importNode(staffDoc.querySelector('header'), true);
  setText(header, 'Search EasySpotOps Staff', 'Search EasySpotOps Client');
  setText(header, 'Search pages in the staff portal', 'Search pages in the client portal');
  const input = header.querySelector('input[type="search"]');
  if (input) input.setAttribute('aria-label', 'Search client pages');
  const profile = [...header.querySelectorAll('button')].find((b) => /QS|User/.test(b.textContent) && b.querySelector('[data-slot="avatar"]'));
  if (profile) {
    for (const s of profile.querySelectorAll('span')) {
      if (s.children.length) continue;
      const t = s.textContent.trim();
      if (t === 'QS') s.textContent = initials(me.name);
      else if (/^User \d+$/.test(t)) s.textContent = me.name;
      else if (t === 'Property Manager') s.textContent = me.title;
    }
    profile.setAttribute('aria-label', `Open profile menu for ${me.name}`);
  }
  // A longer name than the Staff design was drawn with must not push the actions onto a second row: let the search give way.
  const inner = header.firstElementChild;
  if (inner) {
    inner.style.flexWrap = 'nowrap';
    const search = [...inner.children].find((c) => c.querySelector('input[type="search"]'));
    if (search) { search.style.flex = '1 1 0'; search.style.minWidth = '0'; }
  }
  return header;
}

function buildSidebar(staffDoc) {
  const sc = document.importNode(staffDoc.querySelector('[data-slot="sidebar-container"]'), true);
  setText(sc, 'Staff Portal', 'Client Portal');
  // The account card and the capacity card say what a Client manages: an account with several properties.
  setText(sc, 'Selected Workspace', 'Selected Account');
  setText(sc, 'Mallard Pointe', 'Mallard Pointe');
  setText(sc, 'at Riverbend', 'Management');
  setText(sc, 'Active assignment', '2 properties');
  setText(sc, 'Workspace Capacity', 'Portfolio Capacity');
  setText(sc, 'Residents', 'Properties');
  setText(sc, 'Staff Users', 'Staff');
  setText(sc, 'Parking Spaces', 'Parking Spots');
  setText(sc, '202 / 3 (100%)', '1 / 2 (50%)');
  setText(sc, '14 / 3 (100%)', '18 / 3 (100%)');
  setText(sc, '261 / -', '261 / 25 (100%)');
  const manage = [...sc.querySelectorAll('button')].find((b) => /Manage Capacity/.test(b.textContent));
  if (manage) manage.textContent = 'Manage plan';

  const nav = sc.querySelector('nav');
  const icons = new Map();
  for (const a of nav.querySelectorAll('a[data-slot="sidebar-menu-button"]')) icons.set(labelOf(a), a.querySelector('span.grid svg')?.outerHTML);
  const items = [...nav.querySelectorAll('a[data-slot="sidebar-menu-button"]')];
  const plainItem = items.find((a) => labelOf(a) === 'Community & Announcements').closest('li');
  const groupTemplate = nav.querySelector('[data-slot="collapsible"][data-sidebar="group"]');
  const topGroup = nav.querySelector('[data-slot="sidebar-group"]');

  const makeItem = (label, iconFrom, href) => {
    const li = plainItem.cloneNode(true);
    li.querySelectorAll('[data-slot="sidebar-menu-action"]').forEach((x) => x.remove()); // favorites stars do nothing in a preview
    const a = li.querySelector('a[data-slot="sidebar-menu-button"]');
    a.querySelectorAll('[data-slot="badge"]').forEach((x) => x.remove());
    a.removeAttribute('aria-current');
    a.removeAttribute('data-active');
    a.setAttribute('href', href);
    a.querySelector('span.truncate').textContent = label;
    const holder = a.querySelector('span.grid');
    const svg = iconFrom ? icons.get(iconFrom) : SVG_BUILDING;
    if (holder && svg) holder.innerHTML = svg;
    return li;
  };

  const groups = [];
  for (const [name, entries] of CLIENT_MENU) {
    if (name === null) {
      // The first block keeps the staff structure (and the open-item bar on Dashboard): only Dashboard stays.
      const ul = topGroup.querySelector('ul');
      const keep = [...ul.children].find((li) => labelOf(li.querySelector('a')) === 'Dashboard');
      ul.replaceChildren(keep);
      keep.querySelectorAll('[data-slot="sidebar-menu-action"]').forEach((x) => x.remove());
      keep.querySelector('a').setAttribute('href', entries[0][2]);
      continue;
    }
    const g = groupTemplate.cloneNode(true);
    g.querySelector('[data-slot="collapsible-trigger"] > span').textContent = name;
    const count = g.querySelector('.tabular-nums');
    if (count) count.textContent = String(entries.length);
    g.querySelector('ul[data-slot="sidebar-menu"]').replaceChildren(...entries.map(([l, i, h]) => makeItem(l, i, h)));
    groups.push(g);
  }
  [...nav.children].forEach((c) => { if (c !== topGroup) c.remove(); });
  nav.append(...groups);
  return sc;
}

/**
 * Replace this page's header and sidebar with the Staff design, filled for a Client. Returns true when it did.
 * `me` is the Client persona ({ name, title }); `initials` turns a name into the avatar letters.
 */
export async function adoptStaffFrame({ me, initials }) {
  const oldHeader = document.querySelector('header');
  const oldSidebar = document.querySelector('[data-slot="sidebar-container"]');
  if (!oldHeader || !oldSidebar) return false;
  try {
    const res = await fetch('/staff/dashboard.html');
    if (!res.ok) return false;
    const staffDoc = new DOMParser().parseFromString(await res.text(), 'text/html');
    await addStylesheets(staffDoc);
    oldHeader.replaceWith(buildHeader(staffDoc, me, initials));
    oldSidebar.replaceWith(buildSidebar(staffDoc));
    return true;
  } catch { return false; } // the page stays as it was
}
