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
   * Jams Player — the Dial. Scrubs a static hand-written waveform (no
   * audio, no autoplay). A pure scrubber: no payment meaning of any kind.
   * Drag, arrow keys (2 s / 10 s with Shift), wheel, Home/End.
   * ------------------------------------------------------------------- */
  function initDial() {
    var knob = document.getElementById("jp-dial-knob");
    if (!knob) return;
    var pointer = document.getElementById("jp-dial-pointer");
    var bars = Array.prototype.slice.call(document.querySelectorAll(".dial__bar"));
    var timeEl = document.getElementById("jp-dial-time");

    var DURATION = 192; /* 3:12 — the static CC waveform's length */
    var seconds = 31;
    var ANGLE_SPAN = 324; /* the Dial's travel, per SITES_DESIGN_BRIEF §4 */
    var ANGLE_START = -ANGLE_SPAN / 2;

    function fmt(s) {
      var m = Math.floor(s / 60);
      var r = Math.floor(s % 60);
      return m + ":" + (r < 10 ? "0" : "") + r;
    }

    function render() {
      var frac = seconds / DURATION;
      var angle = ANGLE_START + frac * ANGLE_SPAN;
      if (pointer) pointer.style.transform = "rotate(" + angle + "deg)";
      var playedBars = Math.round(frac * bars.length);
      bars.forEach(function (b, i) {
        b.classList.toggle("dial__bar--played", i < playedBars);
      });
      if (timeEl) timeEl.textContent = fmt(seconds);
      knob.setAttribute("aria-valuenow", String(Math.round(seconds)));
      knob.setAttribute("aria-valuetext", fmt(seconds) + " of " + fmt(DURATION));
    }

    function setSeconds(next) {
      seconds = Math.min(DURATION, Math.max(0, next));
      render();
    }

    function fractionFromPoint(clientX, clientY) {
      var rect = knob.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var deg = (Math.atan2(clientX - cx, -(clientY - cy)) * 180) / Math.PI;
      var a = Math.max(ANGLE_START, Math.min(ANGLE_START + ANGLE_SPAN, deg));
      return (a - ANGLE_START) / ANGLE_SPAN;
    }

    var dragging = false;
    knob.addEventListener("pointerdown", function (e) {
      dragging = true;
      knob.setPointerCapture(e.pointerId);
      setSeconds(fractionFromPoint(e.clientX, e.clientY) * DURATION);
    });
    knob.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      setSeconds(fractionFromPoint(e.clientX, e.clientY) * DURATION);
    });
    knob.addEventListener("pointerup", function () { dragging = false; });
    knob.addEventListener("pointercancel", function () { dragging = false; });

    knob.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? 10 : 2;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        setSeconds(seconds + step);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        setSeconds(seconds - step);
      } else if (e.key === "Home") {
        e.preventDefault();
        setSeconds(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setSeconds(DURATION);
      }
    });

    knob.addEventListener(
      "wheel",
      function (e) {
        if (reducedMotion) return; /* the one continuous-gesture path; skip under reduced motion */
        e.preventDefault();
        setSeconds(seconds + (e.deltaY > 0 ? -2 : 2));
      },
      { passive: false }
    );

    render();
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
    initDial();
    initSceneBoard();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
