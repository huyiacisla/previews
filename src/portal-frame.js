// One header and one sidebar design for every portal page of a role.
//
// The Staff dashboard (and the account-settings prototype) carry the header and sidebar the team designed. The Client dashboard
// is a snapshot of a different frame, so a Client page and a Client Settings page used to look like two products. This module
// builds the Client's header and sidebar from the Staff design (same markup, same classes, same stylesheet) and fills them with
// the Client's own menu, name and account details. Pages call adoptStaffFrame() before anything else in preview.js touches them.
//
// Nothing here writes to Staff data; it only reads /staff/dashboard.html and copies its frame.

import { ITEMS, normalizePurchased, limitFor, propertiesCount, storageUsedGb, gbLabel } from './capacity/store.js';

/** What the company has added in Capacity, and the storage in use (Documents' list plus what is already stored), read from the browser. */
function capacityNow() {
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  return { purchased: normalizePurchased(read('eso-capacity:client')), storageUsed: storageUsedGb(read('eso-docs:client')) };
}

const SVG_BUILDING ='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"></path><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"></path><path d="M10 6h4M10 10h4M10 14h4M10 18h4"></path></svg>';

// The Client menu: [group, [[label, icon taken from this Staff item, href]]]. A null group is the unlabelled first block.
export const CLIENT_MENU = [
  [null, [['Dashboard', 'Dashboard', '/client/dashboard.html']]],
  ['Portfolio', [['Properties', null, '#'], ['Reports', 'Reports', '#']]],
  ['Operations', [['People & Access', 'Residents', '#'], ['Vehicles', 'Vehicles', '#'], ['Parking', 'Parking Inventory', '#'], ['Requests', 'Requests', '#'], ['Violations', 'Violations', '#']]],
  ['Communication', [['Messages', 'Messages', '/client/messages.html'], ['Calendar', 'Calendar', '#'], ['Activity', 'Activity', '#']]],
  // The fourth value of an item is its own icon (a Staff item has none to borrow): Documents, the company's library of contracts, insurance, policies and templates.
  ['Management', [['Staff & Access', 'Staff & Access', '#'], ['Billing & Plan', null, '#', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"></rect><line x1="2" x2="22" y1="10" y2="10"></line></svg>'], ['Documents', null, '/client/documents.html', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>']]],
  // Billing & Plan is a credit card (the gauge is Capacity's), and Recovery is a clock turning back (the Staff item it used to copy is a megaphone, for Updates).
  ['Data & Recovery', [['Recovery', null, '#', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>']]],
  ['Settings', [['Workspace Settings', 'Settings', '/client/workspace.html']]],
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

function buildHeader(staffDoc, me, initials, h = {}) {
  const portalName = h.portalName || 'Client';
  const header = document.importNode(staffDoc.querySelector('header'), true);
  header.setAttribute('data-eso-frame', ''); // styles.css sizes this header like the account-settings design on phones and tablets
  setText(header, 'Search EasySpotOps Staff', `Search EasySpotOps ${portalName}`);
  setText(header, 'Search pages in the staff portal', `Search pages in the ${portalName.toLowerCase()} portal`);
  const input = header.querySelector('input[type="search"]');
  if (input) {
    input.setAttribute('aria-label', h.searchLabel || 'Search client pages');
    if (h.search) input.placeholder = h.search; // the page's own wording ("Search within your residence")
  }
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
  // The bell keeps the page's own count (Client: 109 need attention, shown as 99+; Resident: its own), not the Staff frame's.
  const bell = header.querySelector('button[aria-label^="Open notifications"]');
  if (bell) {
    bell.setAttribute('aria-label', h.bellLabel || 'Open notifications. 109 need attention.');
    const badge = bell.querySelector('[data-slot="badge"]');
    if (badge) badge.textContent = h.bellBadge || '99+';
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

function buildSidebar(staffDoc, me) {
  const sc = document.importNode(staffDoc.querySelector('[data-slot="sidebar-container"]'), true);
  // The menu icons are read from the Staff items by their Staff names, before any text below is renamed
  // ("Residents" becomes "Properties" in the capacity card and would also rename its menu item).
  const icons = new Map();
  for (const a of sc.querySelectorAll('nav a[data-slot="sidebar-menu-button"]')) icons.set(labelOf(a), a.querySelector('span.grid svg')?.outerHTML);
  setText(sc, 'Staff Portal', 'Client Portal');
  // Only the Client page's own facts go into the Staff design: "Portfolio Overview", "Capacity summary", Properties 1 / 2,
  // Parking Spots 261 / 25 and Staff 18 / 3 (both over limit) are what the Client dashboard's sidebar already said.
  // Nothing from the Staff frame's data (its property name, its numbers) is kept; a Client page has no property list of its own.
  setText(sc, 'Selected Workspace', 'Selected Account');
  // The Client is a company (AMC LLC) that owns several properties; a property such as Mallard Pointe is one of them, not the account.
  const company = me.org || 'AMC LLC';
  setText(sc, 'Mallard Pointe', company);
  // The plan's real figures (Billing & Plan), and what the company has added in Capacity, are read from the browser's storage.
  const cap = capacityNow();
  const count = propertiesCount(cap.purchased);
  const propsText = `${count} ${count === 1 ? 'property' : 'properties'}`;
  setText(sc, 'at Riverbend', propsText);
  setText(sc, 'Property Manager', 'Client');
  setText(sc, 'Active assignment', propsText);
  for (const e of sc.querySelectorAll('[title="Mallard Pointe at Riverbend"]')) e.title = company;
  setText(sc, 'Workspace Capacity', 'Capacity summary');
  setText(sc, 'Residents', 'Properties');
  setText(sc, 'Staff Users', 'Parking Spots');
  setText(sc, 'Parking Spaces', 'Staff');
  // The three rows of the card, in the Staff design's own markup (a label and a value above a progress bar), now say the Client's figures:
  // Properties, Parking spots (261 of 500 on Starter, more if the company added some) and Staff, and a fourth row, Document storage, is added.
  const bars = [...sc.querySelectorAll('[role="progressbar"]')];
  const setRow = (bar, label, value, pct) => {
    const ps = bar.previousElementSibling?.querySelectorAll('p') || [];
    if (ps[0]) ps[0].textContent = label;
    if (ps[1]) ps[1].textContent = value;
    bar.setAttribute('aria-label', `${label} capacity`);
    bar.setAttribute('aria-valuenow', String(pct));
    bar.setAttribute('aria-valuetext', `${pct}%`);
    for (const e of [bar, ...bar.querySelectorAll('[data-complete]')]) { if (pct >= 100) e.setAttribute('data-complete', ''); else e.removeAttribute('data-complete'); }
    const fill = bar.querySelector('[data-slot="progress-indicator"]');
    if (fill) fill.style.transform = `scaleX(${pct / 100})`;
  };
  const pctOf = (used, limit) => (limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0);
  if (bars.length >= 2) {
    // The Staff design has two rows with a bar and a third row without one; the third becomes Staff (a copy of a row with a bar), and Storage is added after it.
    const rowOf = (b) => b.parentElement;
    const container = rowOf(bars[0]).parentElement;
    const third = [...container.children].find((c) => c !== rowOf(bars[0]) && c !== rowOf(bars[1]) && c.querySelector('p'));
    const staffRow = rowOf(bars[1]).cloneNode(true);
    const storageRow = rowOf(bars[1]).cloneNode(true);
    if (third) third.replaceWith(staffRow); else rowOf(bars[1]).after(staffRow);
    staffRow.after(storageRow);
    const parkingLimit = limitFor('parking', cap.purchased);
    const staffLimit = limitFor('staff', cap.purchased);
    const storageLimit = limitFor('storage', cap.purchased);
    setRow(bars[0], 'Properties', `${count} / ${count}`, 100);
    setRow(bars[1], 'Parking Spots', `${ITEMS[0].used} / ${parkingLimit}`, pctOf(ITEMS[0].used, parkingLimit));
    setRow(staffRow.querySelector('[role="progressbar"]'), 'Staff', `${ITEMS[2].used} / ${staffLimit}`, pctOf(ITEMS[2].used, staffLimit));
    setRow(storageRow.querySelector('[role="progressbar"]'), 'Storage', `${gbLabel(cap.storageUsed)} / ${gbLabel(storageLimit)}`, pctOf(cap.storageUsed, storageLimit));
  }
  // The account card shows a property list in the Staff design; a Client page has none, so there is nothing to switch between.
  sc.querySelector('button[aria-label="Show Switch Property"]')?.remove();

  const nav = sc.querySelector('nav');
  const items = [...nav.querySelectorAll('a[data-slot="sidebar-menu-button"]')];
  const plainItem = items.find((a) => labelOf(a) === 'Community & Announcements').closest('li');
  const groupTemplate = nav.querySelector('[data-slot="collapsible"][data-sidebar="group"]');
  const topGroup = nav.querySelector('[data-slot="sidebar-group"]');
  const badgeTpl = nav.querySelector('[data-slot="badge"]')?.cloneNode(true);
  const helpIcon = [...sc.querySelectorAll('button')].find((b) => /Help Center/.test(b.textContent))?.querySelector('svg')?.outerHTML;

  const makeItem = (label, iconFrom, href, ownSvg) => {
    const li = plainItem.cloneNode(true);
    li.querySelectorAll('[data-slot="sidebar-menu-action"]').forEach((x) => x.remove()); // favorites stars do nothing in a preview
    const a = li.querySelector('a[data-slot="sidebar-menu-button"]');
    a.querySelectorAll('[data-slot="badge"]').forEach((x) => x.remove());
    a.removeAttribute('aria-current');
    a.removeAttribute('data-active');
    a.setAttribute('href', href);
    a.querySelector('span.truncate').textContent = label;
    const holder = a.querySelector('span.grid');
    const svg = ownSvg || (iconFrom ? icons.get(iconFrom) : SVG_BUILDING);
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
    // The Client dashboard showed 16 unread on Communication; keep that fact in the new frame.
    if (name === 'Communication' && count && badgeTpl) {
      g.querySelector('[data-slot="badge"]')?.remove();
      const b = badgeTpl.cloneNode(true);
      b.textContent = '16';
      b.setAttribute('aria-label', '16 unread');
      count.before(b);
    }
    g.querySelector('ul[data-slot="sidebar-menu"]').replaceChildren(...entries.map(([l, i, h, s]) => makeItem(l, i, h, s)));
    groups.push(g);
  }
  // "Support" was a plain item after Settings on the Client dashboard.
  const supportGroup = topGroup.cloneNode(true);
  const supportLi = makeItem('Support', null, '/client/support.html');
  if (helpIcon) supportLi.querySelector('span.grid').innerHTML = helpIcon;
  supportGroup.querySelector('ul').replaceChildren(supportLi);
  [...nav.children].forEach((c) => { if (c !== topGroup) c.remove(); });
  nav.append(...groups, supportGroup);
  return sc;
}

/* ---- Resident: the same Staff design, filled with what the Resident page itself said ---- */

const txt = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : '');

/** Read the Resident's own sidebar (before it is replaced): the residence, the capacity rows, the menu with its icons, the footer card. */
function readResidentSidebar(old) {
  const spec = { card: { title: '', sub: '' }, capacity: { rows: [], notes: [], manage: '' }, top: [], groups: [], footer: null };
  const card = old.querySelector('[data-id$="residence.card"] button');
  const spans = card ? [...card.querySelectorAll('span.truncate')] : [];
  spec.card = { title: txt(spans[0]), sub: txt(spans[1]) };
  for (const r of old.querySelectorAll('[role="progressbar"][data-key]')) {
    spec.capacity.rows.push({ label: txt(r.querySelector('span')), value: txt(r.querySelector('b')), pct: Number(r.getAttribute('aria-valuenow')) || 0 });
  }
  const cap = old.querySelector('[data-id$="capacity.card"]');
  if (cap) {
    spec.capacity.notes = [...cap.querySelectorAll('p')].map(txt).filter(Boolean);
    const btns = [...cap.querySelectorAll('button')].map(txt).filter((t) => t && !/^(Hide|Show)$/.test(t));
    spec.capacity.manage = btns[btns.length - 1] || '';
  }
  const item = (a) => ({ label: labelOf(a), href: a.getAttribute('href') || '#', icon: a.querySelector('span.grid svg, :scope > span svg')?.outerHTML || null });
  const inGroup = new Set();
  for (const g of old.querySelectorAll('[data-slot="collapsible"][data-sidebar="group"]')) {
    const trig = g.querySelector(':scope > [data-slot="collapsible-trigger"]');
    const items = [...g.querySelectorAll('a[data-slot="sidebar-menu-button"]')];
    items.forEach((a) => inGroup.add(a));
    spec.groups.push({ name: txt(trig?.querySelector('span')), items: items.map(item) });
  }
  for (const a of old.querySelectorAll('a[data-slot="sidebar-menu-button"]')) if (!inGroup.has(a)) spec.top.push(item(a));
  spec.footer = old.querySelector('[data-slot="sidebar-footer"]');
  return spec;
}

function buildResidentSidebar(staffDoc, me, spec) {
  const sc = document.importNode(staffDoc.querySelector('[data-slot="sidebar-container"]'), true);
  const icons = new Map();
  for (const a of sc.querySelectorAll('nav a[data-slot="sidebar-menu-button"]')) icons.set(labelOf(a), a.querySelector('span.grid svg')?.outerHTML);
  setText(sc, 'Staff Portal', 'Resident Portal');
  setText(sc, 'Selected Workspace', 'Selected Residence');
  setText(sc, 'Mallard Pointe', spec.card.title || 'Mallard Pointe at Riverbend');
  setText(sc, 'at Riverbend', spec.card.sub || me.title);
  setText(sc, 'Property Manager', 'Resident');
  setText(sc, 'Active assignment', spec.card.sub || me.title);
  for (const e of sc.querySelectorAll('[title="Mallard Pointe at Riverbend"]')) e.title = spec.card.title;
  // The Staff card has a property switcher; a Resident lives in one residence.
  sc.querySelector('button[aria-label="Show Switch Property"]')?.remove();

  // Capacity: the Staff card has three rows; the Resident's own page had two (vehicle usage and parking spaces), a note and a button.
  const [r1, r2] = spec.capacity.rows;
  const staffRows = [['Residents', '202 / 3 (100%)'], ['Staff Users', '14 / 3 (100%)'], ['Parking Spaces', '261 / -']];
  const bars = [...sc.querySelectorAll('[role="progressbar"]')];
  [r1, r2].forEach((r, i) => {
    if (!r) return;
    setText(sc, staffRows[i][0], r.label);
    setText(sc, staffRows[i][1], r.value);
    const b = bars[i];
    if (b) {
      b.setAttribute('aria-valuenow', String(r.pct));
      b.setAttribute('aria-valuetext', `${r.pct}%`);
      if (r.pct < 100) { b.removeAttribute('data-complete'); b.querySelectorAll('[data-complete]').forEach((e) => e.removeAttribute('data-complete')); }
      const fill = b.querySelector('[data-slot="progress-indicator"]');
      if (fill) fill.style.transform = `scaleX(${r.pct / 100})`;
    }
  });
  const third = [...sc.querySelectorAll('p')].find((x) => !x.children.length && x.textContent.trim() === staffRows[2][0]);
  if (third) {
    let row = third;
    while (row.parentElement && row.parentElement.getAttribute('data-slot') !== 'collapsible-content') row = row.parentElement;
    row.remove();
  }
  const manage = [...sc.querySelectorAll('button')].find((b) => /Manage Capacity/.test(b.textContent));
  if (manage) {
    manage.textContent = spec.capacity.manage || 'Manage vehicles';
    const body = manage.parentElement;
    spec.capacity.notes.filter((n) => n.length > 30).forEach((n) => {
      const p = document.createElement('p');
      p.className = 'text-xs text-surface-inverted-foreground/70';
      p.textContent = n;
      manage.before(p);
    });
    void body;
  }

  // The menu: the Resident's own groups and items, with the icons the Resident page drew.
  const nav = sc.querySelector('nav');
  const plainItem = [...nav.querySelectorAll('a[data-slot="sidebar-menu-button"]')].find((a) => labelOf(a) === 'Community & Announcements').closest('li');
  const groupTemplate = nav.querySelector('[data-slot="collapsible"][data-sidebar="group"]');
  const topGroup = nav.querySelector('[data-slot="sidebar-group"]');
  const makeItem = ({ label, href, icon }) => {
    const li = plainItem.cloneNode(true);
    li.querySelectorAll('[data-slot="sidebar-menu-action"]').forEach((x) => x.remove());
    const a = li.querySelector('a[data-slot="sidebar-menu-button"]');
    a.querySelectorAll('[data-slot="badge"]').forEach((x) => x.remove());
    a.removeAttribute('aria-current');
    a.removeAttribute('data-active');
    a.setAttribute('href', href);
    a.querySelector('span.truncate').textContent = label;
    const holder = a.querySelector('span.grid');
    if (holder && icon) holder.innerHTML = icon;
    return li;
  };
  const ul = topGroup.querySelector('ul');
  const dash = [...ul.children].find((li) => labelOf(li.querySelector('a')) === 'Dashboard');
  const first = spec.top[0];
  dash.querySelectorAll('[data-slot="sidebar-menu-action"]').forEach((x) => x.remove());
  if (first) { dash.querySelector('a').setAttribute('href', first.href); dash.querySelector('a span.truncate').textContent = first.label; }
  ul.replaceChildren(dash, ...spec.top.slice(1).map(makeItem));
  const groups = spec.groups.map((g) => {
    const el = groupTemplate.cloneNode(true);
    el.querySelector('[data-slot="collapsible-trigger"] > span').textContent = g.name;
    el.querySelector('[data-slot="badge"]')?.remove();
    const count = el.querySelector('.tabular-nums');
    if (count) count.textContent = String(g.items.length);
    el.querySelector('ul[data-slot="sidebar-menu"]').replaceChildren(...g.items.map(makeItem));
    return el;
  });
  [...nav.children].forEach((c) => { if (c !== topGroup) c.remove(); });
  nav.append(...groups);

  // The footer card of the Resident page (Refer a Neighbor) stays, above the Help Center button.
  // It sits at the end of the scrolling menu, not in the fixed footer: the card is 160px tall and would leave the menu no room.
  if (spec.footer) {
    const card = spec.footer.cloneNode(true);
    card.className = 'shrink-0 p-step-sm';
    const content = nav.closest('[data-slot="sidebar-content"]') || nav.parentElement;
    content.append(card);
  }
  void icons;
  return sc;
}

/**
 * Replace this page's header and sidebar with the Staff design, filled for a Client or a Resident. Returns true when it did.
 * `me` is the persona ({ name, title }); `initials` turns a name into the avatar letters.
 */
export async function adoptStaffFrame({ me, initials, portal = 'client' }) {
  const oldHeader = document.querySelector('header');
  const oldSidebar = document.querySelector('[data-slot="sidebar-container"]');
  if (!oldHeader || !oldSidebar) return false;
  try {
    const res = await fetch('/staff/dashboard.html');
    if (!res.ok) return false;
    const staffDoc = new DOMParser().parseFromString(await res.text(), 'text/html');
    await addStylesheets(staffDoc);
    if (portal === 'resident') {
      // Read everything the Resident page says BEFORE anything is replaced.
      const spec = readResidentSidebar(oldSidebar);
      const bellOld = oldHeader.querySelector('button[aria-label^="Open notifications"]');
      const header = buildHeader(staffDoc, me, initials, {
        portalName: 'Resident', search: txt(oldHeader.querySelector('input[type="search"]')) || oldHeader.querySelector('input[type="search"]')?.placeholder || 'Search within your residence',
        searchLabel: 'Search residence pages', bellLabel: bellOld?.getAttribute('aria-label'), bellBadge: txt(bellOld?.querySelector('[data-slot="badge"]')),
      });
      const sidebar = buildResidentSidebar(staffDoc, me, spec);
      oldHeader.replaceWith(header);
      oldSidebar.replaceWith(sidebar);
      return true;
    }
    oldHeader.replaceWith(buildHeader(staffDoc, me, initials));
    oldSidebar.replaceWith(buildSidebar(staffDoc, me));
    return true;
  } catch { return false; } // the page stays as it was
}
