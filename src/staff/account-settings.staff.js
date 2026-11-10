/* Staff account settings, joined to the real Staff dashboard. Loaded as <script type="module"> after the prototype's own scripts.
   NOTE: BRIEF.md allows no JS besides preview.js; like account-settings.quality.js this is a deliberate exception for this page only.
   Does not edit the prototype's code. It:
   1. sends "Dashboard" and "Messages" (sidebar, top bar, breadcrumb) to the real portal pages,
   2. adds the settings the prototype lacked: Messages, Accessibility, and Resident promotions,
   3. keeps the values in the prototype's own store (S, key "eso-proto"), which /resident/promotions.html also reads.
   Demo only: nothing is sent to a server. Everything else in Settings (Notifications, Security, Support...) is the prototype's own. */
(function () {
  const w = window;
  const search = location.search;
  /* The same page serves two portals: /staff/account-settings.html and /client/account-settings.html (which includes it).
     The Client copy keeps its own settings (the page shim prefixes its storage keys), has the Client sidebar, and has no
     Social and no Promotions. Everything else, including the sidebar colors and personalization, is shared. */
  const client = location.pathname.startsWith('/client/');

  /* 1. Real pages. The prototype is a single-page app with its own sidebar; these items have a real page in the portal. */
  const home = client ? '/client' : '/staff';
  const real = { Dashboard: `${home}/dashboard.html`, Messages: `${home}/messages.html`, 'Ticket box': `${home}/tickets.html` };
  document.addEventListener('click', (e) => {
    const p = e.target.closest('[data-p]');
    const crumb = e.target.closest('a[href="#/dashboard"]');
    const to = crumb ? real.Dashboard : p && real[p.dataset.p];
    if (!to || e.defaultPrevented) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    location.href = to + search;
  }, true);

  /* 2. Defaults for the new switches. DEF feeds "Reset to defaults", so reset also restores these. */
  const NEW = {
    msgEnter: true, msgSound: true, msgReceipts: true, msgTyping: true, msgAway: false, emSms: true,
    a11yContrast: false, a11yMotion: false, a11yTarget: false, a11yFocus: false,
    promoShow: true, promoSave: true,
    rpWeekly: true, rpMonthly: false, rpAlerts: true,
  };
  try { Object.assign(DEF, NEW); } catch { /* DEF is a global const in the prototype */ }
  try { for (const k of Object.keys(NEW)) if (S[k] === undefined) S[k] = NEW[k]; } catch { /* S is the prototype's settings object */ }

  /* The product is English only for now. The prototype's Language page also offered Tiếng Việt and Español, which only
     relabelled a few strings inside the prototype and nowhere else, so they are taken out (LANGS is the prototype's own array). */
  try {
    LANGS.splice(1);
    if (S.lang !== 'en') S.lang = 'en';
  } catch { /* LANGS and S are the prototype's globals */ }

  /* 3. Accessibility switches act on <html>, so every screen of the page follows. */
  const style = document.createElement('style');
  style.textContent = `
html.a11y-motion *,html.a11y-motion *::before,html.a11y-motion *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}
html.a11y-contrast{--muted:#374151;--border:#6b7280}
html.a11y-contrast.dark{--muted:#e5e7eb;--border:#9ca3af}
html.a11y-target button,html.a11y-target select,html.a11y-target .sb a{min-height:44px}
html.a11y-focus :focus-visible{outline:3px solid var(--primary)!important;outline-offset:2px!important}`;
  document.head.appendChild(style);
  const classes = () => {
    const h = document.documentElement;
    h.classList.toggle('a11y-contrast', !!S.a11yContrast);
    h.classList.toggle('a11y-motion', !!S.a11yMotion);
    h.classList.toggle('a11y-target', !!S.a11yTarget);
    h.classList.toggle('a11y-focus', !!S.a11yFocus);
  };
  const apply0 = w.apply;
  w.apply = function () { const r = apply0.apply(this, arguments); classes(); return r; };
  classes();

  /* 4. Section bodies, built with the prototype's own row helpers (pzCard, pzT) so they look and behave like its other pages. */
  const messaging = () =>
    `<h3 class="pzsec">Writing</h3>` +
    pzCard(pzT('msgEnter', 'Press Enter to send', 'Off: Enter adds a new line and the Send button sends.') + pzT('msgSound', 'Sound for new messages'), 'Quiet hours and the digest live in Notifications.') +
    `<h3 class="pzsec">What others see</h3>` +
    pzCard(pzT('msgReceipts', 'Show when I have read a message') + pzT('msgTyping', 'Show when I am typing') + pzT('msgAway', 'Away reply', `When your status is Away, ${client ? 'anyone' : 'a resident'} who writes to you gets a short note that you will answer later.`)) +
    `<h3 class="pzsec">Emergencies</h3>` +
    pzCard(pzT('emSms', 'Text me if I have not acknowledged within 3 minutes', 'Sent to ' + user.phone + '. The alert stays open until someone acknowledges it.'), 'Messages keeps the record of who acknowledged and when.');
  const accessibility = () =>
    `<h3 class="pzsec">Seeing</h3>` +
    pzCard(pzT('a11yContrast', 'Higher contrast', 'Darker secondary text and stronger borders, good in bright sun.') + pzT('a11yFocus', 'Stronger focus outline', 'A thick ring around the control you reach with the keyboard.')) +
    `<h3 class="pzsec">Moving and tapping</h3>` +
    pzCard(pzT('a11yMotion', 'Reduce motion', 'Removes slides and fades.') + pzT('a11yTarget', 'Larger tap targets', 'Buttons grow to at least 44 px tall.'), 'Text size lives in Personalize.');
  const promos = () =>
    `<h3 class="pzsec">In the Resident app</h3>` +
    pzCard(pzT('promoShow', 'Show promotions to residents', 'Published promotions appear under Promotions in the Resident app. Turn off to hide them all.') + pzT('promoSave', 'Let residents save promotions', 'Residents can star a promotion and find it again under Saved.'), 'Create and publish promotions in Community and Announcements, then Promotions. Branding and templates live in Promotion design.');

  /* 5. Put the sections in the tree: Messages and Accessibility under My settings, Resident promotions under Workspace. */
  const T0 = w.TREES;
  w.TREES = function () {
    const T = T0();
    const me = T.settings.kids, ws = T.workspace.kids;
    if (!me.find((x) => x.id === 'messaging')) {
      const i = Math.max(me.findIndex((x) => x.id === 'notifications'), 0);
      me.splice(i + 1, 0, { id: 'messaging', t: 'Messages', ic: '💬', c: '#22c55e', pic: 'msg', desc: 'Sending, read receipts, away replies and emergency texts.', sum: () => (S.msgEnter ? 'Enter sends' : 'Enter adds a line') + (S.msgAway ? ' · Away reply on' : ''), leaf: messaging, kw: 'messages chat enter send sound read receipts typing away reply emergency sms' });
    }
    if (!me.find((x) => x.id === 'accessibility')) {
      const i = Math.max(me.findIndex((x) => x.id === 'datetime'), 0);
      me.splice(i + 1, 0, { id: 'accessibility', t: 'Accessibility', ic: '♿', c: '#0ea5e9', pic: 'user', desc: 'Contrast, focus ring, motion and tap size.', sum: () => [S.a11yContrast && 'Contrast', S.a11yMotion && 'Less motion', S.a11yTarget && 'Large taps', S.a11yFocus && 'Focus ring'].filter(Boolean).join(' · ') || 'Standard', leaf: accessibility, kw: 'accessibility contrast motion reduce focus tap target large outdoor sun' });
    }
    if (client) {
      /* Client: the same sections as Staff, without Social and Promotions, plus two that suit a management company. */
      const drop = (kids, ids) => { for (const id of ids) { const i = kids.findIndex((x) => x.id === id); if (i >= 0) kids.splice(i, 1); } };
      drop(me, ['socialmaster']);
      drop(ws, ['social', 'promodesign', 'residentpromos']);
      if (!ws.find((x) => x.id === 'reports')) ws.push({ id: 'reports', t: 'Reports and digests', ic: '📊', c: '#2563eb', pic: 'bell', desc: 'Which portfolio reports reach your inbox, and when.', g: 'Portfolio', sum: () => [S.rpWeekly && 'Weekly', S.rpMonthly && 'Monthly', S.rpAlerts && 'Alerts'].filter(Boolean).join(' · ') || 'Off', leaf: reports, kw: 'reports digest weekly monthly summary email kpi alert portfolio' });
      if (!ws.find((x) => x.id === 'billing')) ws.push({ id: 'billing', t: 'Billing contact', ic: '🧾', c: '#7c3aed', pic: 'lock', desc: 'Who receives invoices and plan notices for this account.', sum: () => 'dana.whitfield@mallardpointe.example', leaf: billing, kw: 'billing invoice plan contact email payment' });
      const prop = ws.find((x) => x.id === 'property');
      if (prop) { prop.g = 'Properties'; prop.t = 'Property profiles'; prop.desc = 'Branding, details, office hours, emergency contact and amenities of each property you manage.'; }
      skinKids(me); skinKids(ws);
    } else if (!ws.find((x) => x.id === 'residentpromos')) {
      ws.push({ id: 'residentpromos', t: 'Resident promotions', ic: '🏷️', c: '#e11d48', pic: 'bell', desc: 'Choose whether residents see and can save the promotions you publish.', g: 'Community', sum: () => (S.promoShow ? 'Shown to residents' : 'Hidden from residents') + (S.promoSave ? ' · Saving on' : ''), leaf: promos, kw: 'promotions residents resident app show hide save deals offers' });
    }
    return T;
  };

  /* 6. Client only: sidebar, names and storage. */
  function reports() {
    return `<h3 class="pzsec">Email reports</h3>` +
      pzCard(pzT('rpWeekly', 'Weekly portfolio summary', 'Every Monday at 8 AM.') + pzT('rpMonthly', 'Monthly performance report', 'A PDF with occupancy, violations and requests.') + pzT('rpAlerts', 'Tell me when a number moves sharply', 'For example occupancy or open violations.'), 'Reports go to your email. Build or export one in Reports.');
  }
  function billing() {
    return card('lock', 'Billing contact', 'Who receives invoices and plan notices for this account.',
      pr('Invoice email', 'Plan invoices are sent here.', 'dana.whitfield@mallardpointe.example') + pr('Plan', 'Change it in Billing and Plan.', 'Open'),
      'Ask an owner of the account to change the billing contact.');
  }
  // Staff wording in sections that already exist becomes Client wording.
  const WORDS = [['Staff Portal', 'Client Portal'], ['staff portal', 'client portal'], ['QA Staff PM', 'Dana Whitfield'], ['staff@mail.easyspotops.com', 'dana.whitfield@mallardpointe.example'], ['Manager Operations', 'Client Admin'], ['Property Manager', 'Regional Director']];
  WORDS.push(['this staff profile', 'your profile'], ['staff profile', 'your profile'], ['Staff (read-only)', 'Viewer (read-only)'], ['(QS)', '(DW)'], ['Messages, Community & Announcements, Promotions.', 'Messages, Calendar and Activity.']);
  // Pieces of existing sections that are about Social or Promotions: the Client has neither, so they are cut out.
  const CUTS = [
    /<span><svg[^>]*>(?:(?!<\/span>)[\s\S])*?<\/svg> Social pulse: <b>[^<]*<\/b><\/span>/g,
    /<p class="gzh">Open Social pulse<\/p><div class="sgroup">(?:(?!<p class="gzh">)[\s\S])*?<\/div><\/div>(?:<div style="height:14px"><\/div>)?/g,
    /<li><b style="color:#16a34a">Social pulse<\/b>[^<]*<\/li>/g,
    /<text[^>]*>Social off<\/text>/g,
    /<div class="hs-row"><i>(?:(?!<\/i>)[\s\S])*<\/i><div><b>Promotion claims history<\/b>[\s\S]*?<\/button><\/div>/g,
    /<div class="prow"><div><b>Social<\/b>[\s\S]*?<\/div><span class="pill">[^<]*<\/span><\/div>/g,
  ];
  const skin = (s) => (typeof s === 'string' ? CUTS.reduce((a, re) => a.replace(re, ''), WORDS.reduce((a, [x, y]) => (a.includes(x) ? a.split(x).join(y) : a), s)) : s);
  function skinKids(kids) {
    for (const k of kids) {
      if (k._skin) continue;
      k._skin = 1;
      if (k.kids) skinKids(k.kids);
      if (typeof k.leaf === 'function') { const l = k.leaf; k.leaf = (...a) => skin(l(...a)); }
      if (typeof k.sum === 'function') { const s0 = k.sum; k.sum = (...a) => skin(s0(...a)); }
    }
  }
  function reskin() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const v = n.nodeValue;
      if (!v || n.parentElement.closest('script,style')) continue;
      // "View as" control of Workspace settings: Manager / Staff becomes Admin / Viewer for a Client.
      const out = v.trim() === 'QS' ? v.replace('QS', 'DW') : v.trim() === 'Manager' && n.parentElement.closest('.seg') ? v.replace('Manager', 'Admin') : skin(v);
      if (out !== v) n.nodeValue = out;
    }
    // The breadcrumb names one property; a Client works across all of them.
    document.querySelectorAll('#ttl b').forEach((b) => { b.textContent = b.textContent.replace('Workspace · Mallard Pointe at Riverbend', 'Workspace · All properties'); });
    for (const el of document.querySelectorAll('input[value],textarea')) { const v = skin(el.value); if (v !== el.value && el.readOnly) el.value = v; }
  }

  /* What the person picks in Personalize (sidebar colors, theme, accent) is handed to the real pages of this portal.
     The page writes "ui-prefs:<portal>" (a key without the "eso-" prefix, so the Client copy's storage shim leaves it alone)
     and preview.js reads it on the dashboard, messages and ticket pages. Nothing is written until the person changes something. */
  const portalName = client ? 'client' : 'staff';
  const publishUI = () => {
    try { localStorage.setItem(`ui-prefs:${portalName}`, JSON.stringify({ sb: cols().slice(0, 4), theme: S.theme, accent: S.accent })); } catch { /* storage full or blocked */ }
  };
  const save0 = w.save;
  w.save = function () { const r = save0.apply(this, arguments); publishUI(); return r; };

  /* The Promotions header still told people to turn on the Resident view; that control is gone, so the sentence goes too. */
  const tidy = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.nodeValue.includes(' Turn on Resident view to see the storefront.')) n.nodeValue = n.nodeValue.replace(' Turn on Resident view to see the storefront.', '');
  };
  if (!client) for (const name of ['render']) { const f = w[name]; w[name] = function () { const r = f.apply(this, arguments); tidy(); return r; }; }

  if (client) {
    document.documentElement.classList.add('client-portal');
    document.title = 'EasySpotOps Client · Account settings prototype';
    try { user.first = 'Dana'; user.last = 'Whitfield'; } catch { /* user is the prototype's profile object */ }
    // The Client sidebar, the same groups as the Client dashboard. NAV is the prototype's own array, changed in place.
    NAV.splice(0, NAV.length,
      [null, [['Dashboard', 'grid']]],
      ['Portfolio', [['Properties', 'map'], ['Reports', 'chart']]],
      ['Operations', [['People & Access', 'people'], ['Vehicles', 'car'], ['Parking', 'park'], ['Requests', 'clip'], ['Violations', 'warn']]],
      ['Communication', [['Messages', 'msg'], ['Calendar', 'cal'], ['Activity', 'zap']]],
      ['Management', [['Staff & Access', 'user'], ['Billing & Plan', 'gauge']]],
      ['Data & Recovery', [['Recovery', 'refresh']]],
      ['Services', [['Ticket box', 'scroll']]],
      ['Settings', [['Settings', 'gear']]]);
    try { DEF.sbTheme = 'forest'; if (localStorage.getItem('eso-proto') === null) S.sbTheme = 'forest'; } catch { /* first visit only */ }
    publishUI(); // the Client's own default look (green sidebar) also applies on its real pages
    // No Social and no Promotions anywhere: a link or a saved address to one goes to Settings.
    const guard = () => { if (/^#\/(social|promotions)|^#\/workspace\/(social|promodesign|residentpromos)|^#\/settings\/socialmaster/.test(location.hash)) location.replace('#/settings'); };
    addEventListener('hashchange', guard, true);
    guard();
    const dd0 = w.dd;
    w.dd = function () { dd0.apply(this, arguments); document.querySelectorAll('#dd [data-ddgo^="social"]').forEach((e) => e.remove()); reskin(); };
    for (const name of ['render', 'renderNav']) { const f = w[name]; w[name] = function () { const r = f.apply(this, arguments); reskin(); return r; }; }
  }
  try { if (client) apply(); else render(); } catch { /* the first render happens on hashchange otherwise */ }
})();
