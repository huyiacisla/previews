// Alpine.js for the pages of this preview (the decision of 2026-11-13: pages move to Alpine one at a time, see docs/alpine-migration.md).
//
// The rules that stay from before:
//  - Markup and every Tailwind class live in the HTML (partials). Tailwind only scans .html files, and Alpine's directives are HTML,
//    so a page's structure is read in one place: x-for, x-text, x-show, :class, @click in the partial, no element built in JavaScript.
//  - Logic that can be tested without a browser stays in plain modules (store.js, overview.js…): a component only calls them and
//    keeps what the page shows. node --test never needs Alpine.
//  - One Alpine per document, started once, after the page has registered its components (and moved its root where it belongs).
import Alpine from 'alpinejs';

let started = false;

/** Register a component: <div x-data="name">. The factory returns the component's data, getters and methods. */
export function component(name, factory) {
  Alpine.data(name, factory);
}

/** Start Alpine for this document. Safe to call more than once. */
export function start() {
  if (started) return;
  started = true;
  window.Alpine = Alpine; // for the browser's console and Alpine devtools
  Alpine.start();
}

export { Alpine };
