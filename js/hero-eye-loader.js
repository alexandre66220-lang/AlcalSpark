/* ─────────────────────────────────────────────────────────────
   Hero "robotic eye" — desktop-only lazy loader.

   This file itself is small enough to ship via plain <script defer>
   on every device (mirrors the site's existing script pattern), but
   it does real work only on desktop: the heavy Three.js bundle and
   the scene script are fetched from here, never referenced anywhere
   else, so mobile/tablet never download them at all.

   Gate order: viewport width -> reduced-motion -> WebGL support.
   Any failure past this point (network, WebGL init, runtime error
   inside the scene) is caught and only console.error'd — the
   existing CSS blob animation (#blobs-canvas) is left completely
   untouched as the fallback.
───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var zone = document.querySelector('.hero-blobs');
  if (!zone) return;

  // Same breakpoint as css/home.css (.hero switches to a stacked
  // mobile layout at max-width: 767px) and js/blob-hero.js.
  if (!window.matchMedia('(min-width: 768px)').matches) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  if (!window.WebGLRenderingContext) return;

  // Resolve sibling asset paths relative to *this* script's own
  // location (not the page's), so the loader works unmodified from
  // both / and /en/ without hardcoding a site root.
  var thisScript = document.currentScript;
  var base = thisScript ? thisScript.src.replace(/[^/]*$/, '') : '';

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('failed to load ' + src)); };
      document.body.appendChild(s);
    });
  }

  function loadStyle(href) {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }

  // Bump when hero-eye-scene.js/hero-eye.css change in a way that isn't
  // safe to leave to the 7-day cache on /js/* and /css/* (netlify.toml)
  // -- e.g. the scene's public AlcalEye API changing shape. Loader
  // itself must also be re-referenced with a fresh ?v= from the HTML
  // for this to take effect for a returning visitor.
  var ASSET_VERSION = '4';

  function boot() {
    loadStyle(base + '../css/hero-eye.css?v=' + ASSET_VERSION);
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
      .then(function () { return loadScript(base + 'hero-eye-scene.js?v=' + ASSET_VERSION); })
      .catch(function (err) {
        // Silent fallback in production: the blob canvas is still
        // there and untouched, nothing further to do.
        console.error('[hero-eye] 3D scene failed to load, keeping blob fallback:', err);
      });
  }

  function whenIdle(cb) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(cb, { timeout: 2000 });
    } else {
      setTimeout(cb, 200);
    }
  }

  if (document.readyState === 'complete') {
    whenIdle(boot);
  } else {
    window.addEventListener('load', function () { whenIdle(boot); });
  }
})();
