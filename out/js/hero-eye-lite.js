/* ─────────────────────────────────────────────────────────────
   Hero "robotic eye" — mobile/tablet lite version.

   The full Three.js scene (js/hero-eye-scene.js, gated to desktop by
   js/hero-eye-loader.js) is too heavy for lower/mid-range phones --
   this is its CSS/SVG counterpart instead: same static markup
   (#hero-eye-lite in .hero-blobs), no WebGL, no per-frame JS loop --
   state changes just toggle CSS classes and let keyframe animations
   do the work, which is cheap on any device.

   Implements the exact same window.AlcalEye API shape as the Three.js
   scene (setState/getState/pulse/startReply/endReply/getDebugState),
   so js/hero-chat.js -- the shared chat logic between desktop and
   mobile -- needs zero changes or branching to drive either one.
───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  // Same breakpoint as hero-eye-loader.js/css/home.css: desktop gets
  // the full 3D scene instead, this script has nothing to do there.
  if (window.matchMedia('(min-width: 768px)').matches) return;

  if (window.AlcalEye) return; // something else already claimed this global

  var root = document.getElementById('hero-eye-lite');
  if (!root) return;
  var pupil = document.getElementById('hero-eye-lite-pupil');

  var MODE_CLASSES = ['is-idle', 'is-listening', 'is-thinking', 'is-speaking'];

  var state = { mode: 'idle', totalChars: 0, streaming: false };
  var blinkTimeout = null;

  function applyModeClass() {
    for (var i = 0; i < MODE_CLASSES.length; i++) root.classList.remove(MODE_CLASSES[i]);
    root.classList.add('is-' + state.mode);
  }

  // Restarts a CSS animation even if one triggered by the same class
  // is already mid-flight, by forcing a reflow between remove/add.
  function retrigger(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }

  window.AlcalEye = {
    setState: function (mode) {
      if (MODE_CLASSES.indexOf('is-' + mode) === -1) return;
      state.mode = mode;
      applyModeClass();
    },
    getState: function () { return state.mode; },

    // Per-token kick -- a brief pupil scale-up, retriggered on every
    // call so a burst of tokens reads as a flurry rather than one kick.
    pulse: function (charDelta) {
      state.totalChars += (typeof charDelta === 'number' && charDelta > 0) ? charDelta : 1;
      if (pupil) retrigger(pupil, 'is-kicked');
    },

    startReply: function () {
      state.totalChars = 0;
      state.streaming = true;
    },

    // Deliberate end-of-reply blink, independent of `mode` -- mirrors
    // the Three.js scene's state.blink, which is layered on top of
    // whatever mode-driven animation is already running rather than
    // replacing it.
    endReply: function () {
      state.streaming = false;
      retrigger(root, 'is-blinking');
      if (blinkTimeout) clearTimeout(blinkTimeout);
      blinkTimeout = setTimeout(function () { root.classList.remove('is-blinking'); }, 360);
    },

    getDebugState: function () {
      return { mode: state.mode, speak: { totalChars: state.totalChars, streaming: state.streaming } };
    }
  };

  applyModeClass();
})();
