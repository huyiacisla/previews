// Client account settings page controller. Mounted by preview.js into the Client dashboard frame (its own header and sidebar).
// All markup and Tailwind classes live in partials/client-settings-app.html; this file clones templates, fills text and
// toggles hidden / aria-*. The data and the rules are in client-store.js.

import {
  SECTIONS, SIDEBAR_PRESETS, ACCESS, PROPERTIES, readSettings, save, signOutDevice, devicesIn, publish, phoneError, emailError,
} from './client-store.js';

const tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);
const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };

export function mountClientSettings(main, me) {
  const storage = window.localStorage;
  const root = tpl('cs-root');
  main.replaceChildren(root);
  const panels = root.querySelector('#cs-panels');
  const nav = root.querySelector('#cs-nav');
  const search = location.search;

  /* ------------------------------------------------------------------ small pieces */

  function toast(text) {
    const el = tpl('cs-toast');
    el.querySelector('[data-text]').textContent = text;
    const box = document.getElementById('cs-toasts');
    box.appendChild(el);
    try { if (box.matches(':popover-open')) box.hidePopover(); box.showPopover(); } catch { /* older browsers */ }
    setTimeout(() => { el.remove(); if (!box.children.length) try { box.hidePopover(); } catch { /* already hidden */ } }, 3500);
  }

  // Appearance and accessibility act on the real pages: hand the choices over and let preview.js apply them now.
  function apply() {
    const s = readSettings(storage);
    publish(storage, s);
    window.postMessage({ type: 'eso-ui-prefs' }, location.origin);
  }

  function put(path, value, message, after) {
    const r = save(storage, path, value);
    if (!r.ok) { toast(r.reason === 'storage' ? 'Could not save. Try again.' : 'That value is not allowed.'); return r; }
    if (/^(look|comfort)\./.test(path)) apply();
    toast(message || 'Saved');
    if (after) after(r.settings);
    return r;
  }

  const card = (title, note) => {
    const c = tpl('cs-card');
    if (title) { const h = c.querySelector('[data-title]'); h.hidden = false; h.textContent = title; }
    if (note) { const n = c.querySelector('[data-note]'); n.hidden = false; n.textContent = note; }
    return { el: c, rows: c.querySelector('[data-rows]') };
  };

  function switchRow(rows, label, help, path, getValue, message) {
    const r = tpl('cs-switch');
    r.querySelector('[data-label]').textContent = label;
    r.querySelector('[data-help]').textContent = help || '';
    const b = r.querySelector('button');
    const id = `sw-${path.replace('.', '-')}`;
    b.id = id;
    r.querySelector('[data-label]').id = `${id}-l`;
    b.setAttribute('aria-labelledby', `${id}-l`);
    const paint = () => b.setAttribute('aria-checked', String(!!getValue(readSettings(storage))));
    paint();
    b.addEventListener('click', () => {
      const next = b.getAttribute('aria-checked') !== 'true';
      put(path, next, message ? message(next) : 'Saved', paint);
    });
    rows.appendChild(r);
  }

  function selectRow(rows, label, help, path, options, getValue) {
    const r = tpl('cs-select');
    r.querySelector('[data-label]').textContent = label;
    r.querySelector('[data-help]').textContent = help || '';
    const sel = r.querySelector('select');
    sel.id = `sel-${path}`;
    r.querySelector('label').setAttribute('for', sel.id);
    for (const [v, t] of options) sel.appendChild(Object.assign(document.createElement('option'), { value: v, textContent: t }));
    sel.value = getValue(readSettings(storage));
    sel.addEventListener('change', () => put(path, sel.value));
    rows.appendChild(r);
  }

  function choicesRow(rows, label, help, options, current, onPick) {
    const r = tpl('cs-choices');
    r.querySelector('[data-label]').textContent = label;
    r.querySelector('[data-help]').textContent = help || '';
    const list = r.querySelector('[data-list]');
    list.setAttribute('aria-label', label);
    const paint = () => { for (const b of list.children) b.setAttribute('aria-pressed', String(b.dataset.v === current())); };
    for (const [v, t] of options) {
      const b = tpl('cs-choice');
      b.textContent = t;
      b.dataset.v = v;
      b.addEventListener('click', () => { onPick(v); paint(); });
      list.appendChild(b);
    }
    paint();
    rows.appendChild(r);
  }

  function fieldRow(rows, { label, value, help, readOnly, type, autocomplete }) {
    const r = tpl('cs-field');
    const input = r.querySelector('input');
    const l = r.querySelector('[data-label]');
    input.id = `f-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
    l.setAttribute('for', input.id);
    l.textContent = label;
    input.value = value;
    if (type) input.type = type;
    if (autocomplete) input.autocomplete = autocomplete;
    input.readOnly = !!readOnly;
    r.querySelector('[data-help]').textContent = help || '';
    rows.appendChild(r);
    return { input, error: (t) => { r.querySelector('[data-error]').textContent = t; input.setAttribute('aria-invalid', String(!!t)); } };
  }

  function info(rows, k, v) {
    const r = tpl('cs-info');
    r.querySelector('[data-k]').textContent = k;
    r.querySelector('[data-v]').textContent = v;
    rows.appendChild(r);
  }

  function saveRow(rows, run) {
    const a = tpl('cs-actions');
    a.querySelector('[data-save]').addEventListener('click', run);
    rows.appendChild(a);
  }

  /* ------------------------------------------------------------------------- sections */

  const build = {
    profile(body) {
      const s = readSettings(storage);
      const c = card();
      const email = `${me.name.toLowerCase().replace(/[^a-z]+/g, '.')}@mallardpointe.example`;
      // Who you are is read only (EasySpotOps support changes it), so it is shown as facts, not as greyed-out boxes.
      info(c.rows, 'Name', me.name);
      info(c.rows, 'Role', me.title);
      info(c.rows, 'Organization', me.org);
      info(c.rows, 'Email', email);
      const phone = fieldRow(c.rows, { label: 'Phone', value: s.phone, type: 'tel', autocomplete: 'tel', help: 'Used for emergency texts and sign-in codes.' });
      phone.input.maxLength = 24;
      selectRow(c.rows, 'Best way to reach me', '', 'contact', [['app', 'In the app'], ['email', 'Email'], ['text', 'Text message']], (x) => x.contact);
      saveRow(c.rows, () => {
        const err = phoneError(phone.input.value);
        phone.error(err);
        if (err) { phone.input.focus(); return; }
        put('phone', phone.input.value);
      });
      body.appendChild(c.el);
    },

    properties(body) {
      const c = card(null, 'Add or remove properties in Billing and plan.');
      info(c.rows, 'Plan', `${PROPERTIES.used} of ${PROPERTIES.limit} properties in use`);
      for (const p of PROPERTIES.list) info(c.rows, p.name, `${p.address} · ${p.status}`);
      body.appendChild(c.el);
    },

    notifications(body) {
      const a = card('How you hear about things');
      switchRow(a.rows, 'In-app alerts', 'The bell and the badge in the portal.', 'notify.inapp', (s) => s.notify.inapp);
      switchRow(a.rows, 'Email', '', 'notify.email', (s) => s.notify.email);
      switchRow(a.rows, 'Push on my phone', 'Needs the EasySpotOps app.', 'notify.push', (s) => s.notify.push);
      body.appendChild(a.el);
      const b = card('What alerts you', 'Emergency alerts always reach you and cannot be turned off.');
      switchRow(b.rows, 'New requests', 'Resident parking and access requests across your properties.', 'notify.requests', (s) => s.notify.requests);
      switchRow(b.rows, 'Violations', 'New violations reported at a property.', 'notify.violations', (s) => s.notify.violations);
      switchRow(b.rows, 'Escalations', 'Anything unresolved after its response time.', 'notify.escalations', (s) => s.notify.escalations);
      switchRow(b.rows, 'Messages', 'Direct messages and replies from Staff and Support.', 'notify.messages', (s) => s.notify.messages);
      switchRow(b.rows, 'Report ready', 'When a scheduled report finishes.', 'notify.reports', (s) => s.notify.reports);
      body.appendChild(b.el);
      const c = card('Quiet time');
      selectRow(c.rows, 'Quiet hours', 'Alerts wait until quiet hours end. Emergencies still come through.', 'quiet', [['off', 'Off'], ['night', '10 PM to 7 AM'], ['early', '8 PM to 8 AM']], (s) => s.quiet);
      selectRow(c.rows, 'Summary email', 'Bundle non-urgent email into one message.', 'digest', [['off', 'Off'], ['daily', 'Every day'], ['weekly', 'Every week']], (s) => s.digest);
      body.appendChild(c.el);
    },

    messages(body) {
      const a = card('Writing');
      switchRow(a.rows, 'Press Enter to send', 'Off: Enter adds a new line and the Send button sends.', 'messages.enter', (s) => s.messages.enter);
      body.appendChild(a.el);
      const b = card('What others see');
      switchRow(b.rows, 'Show when I have read a message', '', 'messages.receipts', (s) => s.messages.receipts);
      switchRow(b.rows, 'Show when I am typing', '', 'messages.typing', (s) => s.messages.typing);
      switchRow(b.rows, 'Away reply', 'When you are away, anyone who writes to you gets a short note that you will answer later.', 'messages.away', (s) => s.messages.away);
      body.appendChild(b.el);
      const c = card('Emergencies');
      switchRow(c.rows, 'Text me if I have not acknowledged within 3 minutes', 'The alert stays open until someone acknowledges it.', 'messages.emergencySms', (s) => s.messages.emergencySms);
      body.appendChild(c.el);
    },

    reports(body) {
      const c = card('Email reports', 'Reports go to your email. Build or export one in Reports.');
      switchRow(c.rows, 'Weekly portfolio summary', 'Every Monday at 8 AM, across all your properties.', 'reports.weekly', (s) => s.reports.weekly);
      switchRow(c.rows, 'Monthly performance report', 'A PDF with occupancy, violations and requests for each property.', 'reports.monthly', (s) => s.reports.monthly);
      switchRow(c.rows, 'Tell me when a number moves sharply', 'For example occupancy or open violations at one property.', 'reports.alerts', (s) => s.reports.alerts);
      body.appendChild(c.el);
    },

    billing(body) {
      const s = readSettings(storage);
      const c = card(null, 'Ask an owner of the account to change the plan.');
      const f = fieldRow(c.rows, { label: 'Invoice email', value: s.billingEmail, type: 'email', autocomplete: 'email', help: 'Plan invoices and notices are sent here.' });
      f.input.maxLength = 120;
      saveRow(c.rows, () => {
        const err = emailError(f.input.value);
        f.error(err);
        if (err) { f.input.focus(); return; }
        put('billingEmail', f.input.value);
      });
      body.appendChild(c.el);
    },

    security(body) {
      const a = card('Sign-in');
      switchRow(a.rows, '2-step verification', 'Ask for a code from your phone when you sign in on a new device.', 'security.twoStep', (s) => s.security.twoStep, (on) => (on ? '2-step verification on' : '2-step verification off'));
      body.appendChild(a.el);
      const b = card('Signed-in devices', 'To change your password, use Forgot password on the live sign-in page. It is not part of this preview.');
      const list = b.rows;
      const paint = () => {
        clear(list);
        for (const d of devicesIn(readSettings(storage))) {
          const r = tpl('cs-device');
          r.querySelector('[data-name]').textContent = d.current ? `${d.name} (this device)` : d.name;
          r.querySelector('[data-where]').textContent = `${d.where} · ${d.when}`;
          const out = r.querySelector('[data-out]');
          out.hidden = !!d.current;
          out.setAttribute('aria-label', `Sign out ${d.name}`);
          out.addEventListener('click', () => { signOutDevice(storage, d.id); toast(`Signed out ${d.name}`); paint(); });
          list.appendChild(r);
        }
      };
      paint();
      body.appendChild(b.el);
    },

    appearance(body) {
      const a = card('Theme');
      choicesRow(a.rows, 'Light or dark', 'Also changes with the sun and moon button at the top.', [['light', 'Light'], ['dark', 'Dark'], ['system', 'Same as my device']], () => readSettings(storage).look.theme, (v) => put('look.theme', v));
      body.appendChild(a.el);
      const b = card('Sidebar');
      const r = tpl('cs-swatches');
      r.querySelector('[data-label]').textContent = 'Sidebar color';
      r.querySelector('[data-help]').textContent = 'Applies to the sidebar on every Client page.';
      const list = r.querySelector('[data-list]');
      list.setAttribute('aria-label', 'Sidebar color');
      const paint = () => { for (const x of list.children) x.setAttribute('aria-pressed', String(x.dataset.v === readSettings(storage).look.sidebar)); };
      for (const [id, name, colors] of SIDEBAR_PRESETS) {
        const sw = tpl('cs-swatch');
        sw.dataset.v = id;
        sw.querySelector('[data-label]').textContent = name;
        const chips = sw.querySelector('[data-chips]');
        for (const c of colors || []) { const i = document.createElement('i'); i.className = 'block size-3 rounded-sm ring-1 ring-foreground/20'; i.style.background = c; chips.appendChild(i); }
        sw.addEventListener('click', () => { put('look.sidebar', id, `Sidebar: ${name.toLowerCase()}`); paint(); });
        list.appendChild(sw);
      }
      paint();
      b.rows.appendChild(r);
      switchRow(b.rows, 'Show icons', 'An icon beside each menu item.', 'look.icons', (s) => s.look.icons);
      switchRow(b.rows, 'Show counts', 'The number beside each menu group.', 'look.counts', (s) => s.look.counts);
      switchRow(b.rows, 'Show the portfolio overview card', 'Properties, parking spots and staff against your plan.', 'look.overview', (s) => s.look.overview);
      body.appendChild(b.el);
    },

    accessibility(body) {
      const c = card(null, 'These also follow your device setting for reduced motion.');
      switchRow(c.rows, 'Higher contrast', 'Heavier borders and text. Easier to read in bright sun.', 'comfort.contrast', (s) => s.comfort.contrast);
      switchRow(c.rows, 'Reduce motion', 'Removes slides and fades.', 'comfort.motion', (s) => s.comfort.motion);
      body.appendChild(c.el);
    },

    permissions(body) {
      const c = card(null, 'To change what you can do, ask an owner of the account.');
      for (const [k, v, tone] of ACCESS) {
        const r = tpl('cs-access');
        r.querySelector('[data-k]').textContent = k;
        r.querySelector('[data-v]').textContent = v;
        const b = r.querySelector('[data-badge]');
        b.textContent = tone === 'ok' ? 'Allowed' : 'Not available';
        b.dataset.tone = tone === 'ok' ? 'success' : 'neutral';
        c.rows.appendChild(r);
      }
      body.appendChild(c.el);
    },
  };

  /* ---------------------------------------------------------------------- routing */

  const panelEls = {};
  for (const [id, label] of SECTIONS) {
    const p = tpl('cs-panel');
    p.id = `panel-${id}`;
    p.querySelector('[data-title]').textContent = label;
    p.querySelector('[data-title]').id = `title-${id}`;
    p.setAttribute('aria-labelledby', `title-${id}`);
    build[id](p.querySelector('[data-body]'));
    p.hidden = true;
    panels.appendChild(p);
    panelEls[id] = p;
    const li = tpl('cs-nav-item');
    const a = li.querySelector('a');
    a.textContent = label;
    a.href = `${location.pathname}${search}#/${id}`;
    a.dataset.id = id;
    nav.appendChild(li);
  }

  function route(focus) {
    const id = (location.hash.match(/^#\/([a-z-]+)/) || [])[1];
    const cur = panelEls[id] ? id : 'profile';
    for (const [k, el] of Object.entries(panelEls)) el.hidden = k !== cur;
    for (const a of nav.querySelectorAll('a')) { if (a.dataset.id === cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
    document.title = `${SECTIONS.find((s) => s[0] === cur)[1]} | Account settings | Client Portal`;
    if (focus) panelEls[cur].focus({ preventScroll: true });
  }
  addEventListener('hashchange', () => { route(true); scrollTo({ top: 0 }); });
  route(false);
  apply();
}
