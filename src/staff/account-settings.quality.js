/* EasySpotOps staff account-settings: quality pass, runtime fixes. Loaded as <script type="module"> by account-settings.html.
   NOTE: BRIEF.md says no JS besides preview.js; this file is a deliberate exception requested for this page only.
   Does not edit the app's render code: it patches the DOM after each render via a debounced MutationObserver.
   Selectors are specific to this prototype (#content, #toast, .dd h6, nav.crumb, .pzst, .srow/.row/.prow/.pzrow). */
(() => {
  function init() {
    var b = document.body;
    if (!b) return;

    /* 1. Skip link. Uses a click handler, not href="#content", because the app routes on location.hash. */
    if (!document.querySelector(".qa-skip")) {
      var a = document.createElement("a");
      a.className = "qa-skip";
      a.href = "#content";
      a.textContent = "Skip to main content";
      a.addEventListener("click", (e) => {
        e.preventDefault();
        var c = (b.classList.contains("fdon") && document.getElementById("feedroot")) || document.getElementById("content");
        if (c) {
          c.setAttribute("tabindex", "-1");
          c.focus();
        }
      });
      b.insertBefore(a, b.firstChild);
    }

    /* 1b. Social sidebar item follows Settings > Social, always.
   The app's apply() rewrites document.body.className, wiping .soc-nosb / .soc-off, and applySocial() (private closure)
   only reruns on a few events. With "Show Social in sidebar" OFF the item therefore flipped back to visible after the next
   navigation (it reappeared after clicking Community & Announcements). Re-apply the same two classes from the saved
   setting (localStorage "eso-social") after every class rewrite. Same rule as applySocial(): soc-off = !on; soc-nosb = !sidebar || !on. */
    function soc() {
      var s = {};
      try {
        s = JSON.parse(localStorage.getItem("eso-social") || "{}") || {};
      } catch (e) {}
      var on = s.on !== false,
        sb = s.sidebar !== false;
      b.classList.toggle("soc-off", !on);
      b.classList.toggle("soc-nosb", !sb || !on);
    }
    new MutationObserver(soc).observe(b, { attributes: true, attributeFilter: ["class"] });
    soc();

    function fix() {
      var c = document.getElementById("content");
      /* 2. Landmarks and live regions (the Social feed renders into #feedroot and hides #content) */
      if (c && c.getAttribute("role") !== "main") c.setAttribute("role", "main");
      var fr = document.getElementById("feedroot");
      if (fr && fr.getAttribute("role") !== "main") fr.setAttribute("role", "main");
      var t = document.getElementById("toast");
      if (t && !t.getAttribute("aria-live")) {
        t.setAttribute("role", "status");
        t.setAttribute("aria-live", "polite");
      }
      /* 3. Heading order: menu group labels are not part of the page outline; never skip a level inside #content */
      document.querySelectorAll(".dd h6").forEach((h) => {
        if (h.getAttribute("role") !== "presentation") h.setAttribute("role", "presentation");
      });
      if (c) {
        var prev = 0;
        c.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((h) => {
          var l = +h.tagName[1];
          if (prev && l > prev + 1) {
            l = prev + 1;
            h.setAttribute("aria-level", l);
          } else if (h.getAttribute("aria-level") && +h.getAttribute("aria-level") !== l && !(prev && l > prev + 1)) {
            h.removeAttribute("aria-level");
          }
          prev = l;
        });
      }
      if (c) {
        /* 4. Unlabelled form controls: take the row title, else the placeholder */
        c.querySelectorAll("select:not([aria-label]),input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([aria-label])").forEach((f) => {
          if ((f.id && document.querySelector('label[for="' + f.id + '"]')) || f.closest("label")) return;
          var row = f.closest(".srow,.row,.prow,.pzrow");
          var t = row && row.querySelector(".stt,b,strong,h4,h5");
          var txt = (t && t.textContent.trim()) || f.getAttribute("placeholder") || "";
          if (txt) f.setAttribute("aria-label", txt);
        });
        /* 5. Controls under 24px tall get a larger hit area (switches excluded: spaced apart, pass by spacing exception) */
        c.querySelectorAll("a[href]:not(.qa-tap),button:not(.sw):not([role=switch]):not(.qa-tap)").forEach((bt) => {
          if (bt.offsetHeight && bt.offsetHeight < 24) bt.classList.add("qa-tap");
        });
      }
      /* 5b. A row of choice buttons (accent and sidebar colour dots, segmented buttons) shows the choice only with the class "on": say it to assistive tech too,
   and name a colour dot that has no name. Groups that already use tabs, radios or aria-selected are left alone. */
      if (c) {
        c.querySelectorAll('.dsw,.seg,.segm,[class*="seg"],.pzdots,.pzseg,.pzsg').forEach((g) => {
          var bs = [].filter.call(g.children, (x) => x.tagName === "BUTTON");
          if (bs.length < 2) return;
          if (bs.some((x) => x.hasAttribute("aria-selected") || x.getAttribute("role") === "tab" || x.getAttribute("role") === "radio")) return;
          bs.forEach((x, i) => {
            x.setAttribute("aria-pressed", x.classList.contains("on") || x.classList.contains("sel") || x.classList.contains("active") || x.classList.contains("selected") ? "true" : "false");
            if (!x.getAttribute("aria-label") && !x.textContent.trim()) {
              var v = x.getAttribute("data-v") || x.getAttribute("title") || "";
              x.setAttribute("aria-label", v ? "Option " + v : "Option " + (i + 1));
            }
          });
        });
      }
      /* 6. Breadcrumb semantics */
      var cr = document.querySelector("nav.crumb");
      if (cr) {
        if (!cr.getAttribute("aria-label")) cr.setAttribute("aria-label", "Breadcrumb");
        var l = cr.lastElementChild;
        if (l && l.tagName !== "A" && !l.getAttribute("aria-current")) l.setAttribute("aria-current", "page");
      }
    }

    /* 7. Scroll jitter on Personalize: handled where the sticky card is (account-settings-content.html, window._pzchk). An earlier version of this fix lived here
   (pz): it measured the page AFTER the card had shrunk, which makes the browser cut the scroll position to the shorter page (277px -> 101px card, a 40px
   jump back) and it cleared the margin the other code had set, so dragging the scroll bar snapped back. Do not bring a second one back: there must be one. */
    function pz() {}

    /* Debounce with setTimeout (requestAnimationFrame is paused in hidden panes and left the flag stuck) */
    var q = 0;
    function sched() {
      if (q) return;
      q = setTimeout(() => {
        q = 0;
        fix();
        pz();
      }, 60);
    }
    fix();
    addEventListener("hashchange", sched);
    new MutationObserver(sched).observe(b, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  /* Text typed in Settings is bounded and safe. A line of text takes at most 120 characters and a note at most 500 (a field that sets its own limit keeps it, and
   a pasted text is cut to the limit). A web address takes http(s) only: javascript:, data: and vbscript: are dropped the moment they are typed. This runs
   before the page's own handlers, so what they save is already clean. */
  document.addEventListener(
    "focusin",
    (e) => {
      var t = e.target;
      if (!t || t.hasAttribute("maxlength")) return;
      if (t.tagName === "INPUT" && (t.type === "text" || t.type === "url" || t.type === "search" || t.type === "")) t.maxLength = 120;
      else if (t.tagName === "TEXTAREA") t.maxLength = 500;
    },
    true,
  );
  /* A value set by a script, a paste or an autofill never took the limit of a field nobody had focused. Cut it to the limit when it changes, and again just
   before a button or a change is handled, so a long text is never what gets saved. */
  function clamp(t) {
    if (!t || !t.value) return;
    var tx = t.tagName === "INPUT" && (t.type === "text" || t.type === "url" || t.type === "search" || t.type === "");
    if (!tx && t.tagName !== "TEXTAREA") return;
    var max = t.maxLength > 0 ? t.maxLength : t.tagName === "TEXTAREA" ? 500 : 120;
    if (t.value.length > max) t.value = t.value.slice(0, max);
  }
  document.addEventListener(
    "input",
    (e) => {
      clamp(e.target);
    },
    true,
  );
  document.addEventListener(
    "change",
    (e) => {
      clamp(e.target);
    },
    true,
  );
  document.addEventListener(
    "click",
    (e) => {
      if (!e.target.closest || !e.target.closest("button,[role=button],.btn")) return;
      var c = document.getElementById("content");
      if (c) c.querySelectorAll("input,textarea").forEach(clamp);
    },
    true,
  );
  document.addEventListener(
    "input",
    (e) => {
      var t = e.target;
      if (!t || t.tagName !== "INPUT") return;
      var looksLikeAddress =
        t.type === "url" || /web|url|site|link|href/i.test((t.id || "") + " " + (t.name || "") + " " + (t.getAttribute("aria-label") || "") + " " + (t.getAttribute("data-k") || ""));
      if (looksLikeAddress && /^\s*(javascript|data|vbscript):/i.test(t.value)) {
        t.value = "";
        t.setAttribute("aria-invalid", "true");
        t.setAttribute("title", "Use a web address that starts with http:// or https://");
      } else if (t.getAttribute("aria-invalid") === "true" && looksLikeAddress) t.removeAttribute("aria-invalid");
    },
    true,
  );

  /* 8. The frame's floating assistant button must not cover the buttons of a dialog of this page. At 675px it sat on top of "Publish"/"Schedule" in
   New promotion, so the main action could not be clicked. While a dialog of this page is open, tell the frame (same origin) to hide that button;
   styles.css does the hiding (html[data-eso-modal]). */
  (() => {
    if (parent === window) return;
    var last = null;
    function sig() {
      var open = Array.prototype.some.call(document.querySelectorAll('[aria-modal="true"],dialog[open],.pmc-ov'), (e) => e.getClientRects().length > 0);
      if (open === last) return;
      last = open;
      try {
        parent.document.documentElement.toggleAttribute("data-eso-modal", open);
      } catch (e) {}
    }
    function start() {
      new MutationObserver(sig).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden", "open", "aria-modal", "style"] });
      sig();
    }
    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start);
    addEventListener("pagehide", () => {
      try {
        parent.document.documentElement.removeAttribute("data-eso-modal");
      } catch (e) {}
    });
  })();
})();
