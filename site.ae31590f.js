/* site.js — the only JS beyond static markup on the four marketing sites.
 * Loaded once per site (./ relative, no external requests). Feature-detects
 * which widgets exist on the current page (hub / investors / jp / ps / jamstand) and
 * wires up only those. No audio, no autoplay, no analytics, nothing stored
 * beyond the theme preference (localStorage key "jams-theme").
 *
 * None of the transforms below carry a CSS transition/animation, so every
 * interaction is an instant value change rather than a motion sequence —
 * that is what keeps each signature interaction "static" for
 * prefers-reduced-motion without a separate code path; the reduced-motion
 * guard below still flags the state (as a class on <html>) in case a
 * future addition needs it, and disables the wheel-scrub convenience since
 * that one is the closest thing here to a continuous motion gesture.
 */
(function () {
  "use strict";

  /* ---------------------------------------------------------------------
   * Theme switch — data-theme on <html>. Dark by default on a first visit
   * (the OS colour scheme is not consulted); an explicit choice made with the
   * toggle is persisted to localStorage under "jams-theme".
   * ------------------------------------------------------------------- */
  var THEME_KEY = "jams-theme";
  var root = document.documentElement;

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    var toggle = document.querySelector("[data-theme-toggle]");
    if (toggle) {
      toggle.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
      toggle.setAttribute(
        "aria-label",
        theme === "light" ? "Switch to dark theme" : "Switch to light theme"
      );
    }
  }

  function readStoredTheme() {
    try {
      var v = window.localStorage.getItem(THEME_KEY);
      return v === "dark" || v === "light" ? v : null;
    } catch (e) {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      /* private mode / blocked storage — theme still applies for this load */
    }
  }

  function initTheme() {
    // Dark on a first visit, whatever the OS prefers (founder 2026-10-18). Only
    // an explicit choice made with the toggle (stored) switches the page to light.
    applyTheme(readStoredTheme() === "light" ? "light" : "dark");
    var toggle = document.querySelector("[data-theme-toggle]");
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", root.getAttribute("data-theme") === "light" ? "true" : "false");
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
      storeTheme(next);
    });
  }

  /* ---------------------------------------------------------------------
   * Reduced-motion guard.
   * ------------------------------------------------------------------- */
  var reducedMotion = false;
  function initReducedMotionGuard() {
    if (!window.matchMedia) return;
    var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    function apply(matches) {
      reducedMotion = matches;
      root.classList.toggle("reduced-motion", matches);
    }
    apply(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", function (e) { apply(e.matches); });
  }

  /* ---------------------------------------------------------------------
   * Mobile menu — progressive enhancement. Without JS the mobile links are
   * always visible under the bar (see .mobile-nav in site.css); with JS the
   * "js" class on <html> hides them behind the Menu button.
   * ------------------------------------------------------------------- */
  function initMenu() {
    root.classList.add("js");
    var nav = document.querySelector(".nav");
    var btn = document.querySelector("[data-menu-toggle]");
    if (!nav || !btn) return;
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------------------------------------------------------------------
   * Personal Soundtrack — "Set the scene". Three scenario buttons swap two
   * plain lines of site copy: which track it picks, and one short sentence
   * of what was read. Site-native paragraphs, not an app-panel mockup — no
   * card, no field list, no "Your Context" heading (M-4, 2026-09-16 review
   * — supersedes the earlier context-readout-card version of this
   * interaction). Depicts what is read, never how it is used or why;
   * nothing learned from the visitor, no live recommender.
   * ------------------------------------------------------------------- */
  var PS_SCENARIOS = {
    "After a run": {
      track: "Sunburnt",
      artist: "The Saltmarsh Kids",
      read: "a run just finished, heart rate coming down, a clear evening outside.",
    },
    "Focus hour": {
      track: "Third Avenue Waltz",
      artist: "Otis Granger Trio",
      read: "sitting still for a while, a steady heart rate, quiet at home.",
    },
    "Rainy evening": {
      track: "Heavy Rain on a Tin Roof",
      artist: "Dry Creek Revival",
      read: "rain outside, a slower heart rate, an evening at home.",
    },
  };

  function initSceneBoard() {
    var board = document.querySelector("[data-scene-board]");
    if (!board) return;

    var buttons = Array.prototype.slice.call(board.querySelectorAll(".scene-board__scenario"));
    var trackEl = board.querySelector(".scene-board__track");
    var artistEl = board.querySelector(".scene-board__artist");
    var readEl = board.querySelector(".scene-board__read");

    function render(scenario) {
      var data = PS_SCENARIOS[scenario];
      if (!data) return;
      if (trackEl) trackEl.textContent = data.track;
      if (artistEl) artistEl.textContent = data.artist;
      if (readEl) readEl.textContent = data.read;
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        render(btn.dataset.scenario);
      });
    });
  }

  function boot() {
    initTheme();
    initReducedMotionGuard();
    initMenu();
    initSceneBoard();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
