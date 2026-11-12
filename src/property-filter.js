// The Property filter of the Client dashboard.
//
// The dashboard is a copy of the Staff one, and the copy kept the filter only as a picture: an input with an arrow that opened nothing.
// This gives it the behaviour of a select: it opens a list of the company's properties, the choice is kept in the field (and in the hidden
// field the form carries), Arrow keys, Enter, Space and Escape work, and the field itself cannot be typed into.
// The company has one property, so "All Properties" and that property show the same figures; nothing else on the page changes.

const OPTIONS = [
  ['all', 'All Properties'],
  ['riverbend', 'Mallard Pointe at Riverbend'], // the same name as PROP in staff/client-workspace.js
];

export function wirePropertyFilter(root = document) {
  const input = root.querySelector('main input[role="combobox"][aria-label="Property"]');
  if (!input || input.dataset.propertyFilter) return;
  input.dataset.propertyFilter = '1';
  input.readOnly = true;
  const group = input.closest('[data-slot="input-group"]') || input.parentElement;
  const carried = group.nextElementSibling && group.nextElementSibling.tagName === 'INPUT' ? group.nextElementSibling : null;
  let current = (OPTIONS.find(([v, t]) => v === (carried && carried.value) || t === input.value) || OPTIONS[0])[0];

  const list = document.createElement('div');
  list.className = 'eso-lb';
  list.id = 'eso-lb-property';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Property');
  list.hidden = true;
  document.body.append(list);
  input.setAttribute('aria-controls', list.id);

  const options = () => [...list.querySelectorAll('[role="option"]')];
  const draw = () => {
    list.replaceChildren();
    for (const [value, text] of OPTIONS) {
      const o = document.createElement('div');
      o.className = 'eso-lb-opt';
      o.setAttribute('role', 'option');
      o.setAttribute('aria-selected', String(value === current));
      o.tabIndex = -1;
      o.dataset.value = value;
      o.textContent = text;
      list.append(o);
    }
  };
  const place = () => {
    const r = group.getBoundingClientRect();
    list.style.top = `${Math.round(r.bottom + 4)}px`;
    list.style.left = `${Math.round(Math.min(r.left, innerWidth - Math.max(r.width, 224) - 8))}px`;
    list.style.minWidth = `${Math.max(Math.round(r.width), 224)}px`;
    list.style.maxHeight = `calc(100dvh - ${Math.round(r.bottom + 12)}px)`;
  };
  const close = (focusBack) => {
    if (list.hidden) return;
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    if (focusBack) input.focus();
  };
  const open = () => {
    if (!list.hidden) return;
    draw();
    place();
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    (list.querySelector('[aria-selected="true"]') || options()[0]).focus();
  };
  const choose = (value) => {
    const hit = OPTIONS.find(([v]) => v === value);
    if (!hit) return;
    current = value;
    input.value = hit[1];
    if (carried) { carried.value = value; carried.dispatchEvent(new Event('change', { bubbles: true })); }
    close(true);
  };

  input.addEventListener('click', open);
  input.addEventListener('keydown', (e) => {
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); open(); }
  });
  list.addEventListener('click', (e) => { const o = e.target.closest('[role="option"]'); if (o) choose(o.dataset.value); });
  list.addEventListener('keydown', (e) => {
    const all = options();
    const at = all.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') all[(at + 1) % all.length].focus();
    else if (e.key === 'ArrowUp') all[(at - 1 + all.length) % all.length].focus();
    else if (e.key === 'Home') all[0].focus();
    else if (e.key === 'End') all[all.length - 1].focus();
    else if (e.key === 'Enter' || e.key === ' ') { if (at >= 0) choose(all[at].dataset.value); }
    else if (e.key === 'Escape') { e.stopPropagation(); close(true); }
    else if (e.key === 'Tab') { close(true); }
    else return;
    e.preventDefault();
  });
  document.addEventListener('pointerdown', (e) => { if (!list.hidden && !list.contains(e.target) && !group.contains(e.target)) close(false); });
  addEventListener('resize', () => close(false));
}
