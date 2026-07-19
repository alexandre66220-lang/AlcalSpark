(function () {
  'use strict';

  var canvas = document.getElementById('blobs-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 0, H = 0;
  var rafId = null;
  var lastTs = 0;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function mob() { return window.innerWidth < 768; }

  function resize() {
    var box = canvas.parentElement;
    W = canvas.width  = box.offsetWidth;
    H = canvas.height = box.offsetHeight;
  }

  // ── Définitions des 3 blobs ───────────────────────────────────
  // cx/cy : centre en fraction de W et H
  // rBase : rayon de base en fraction de min(W,H)
  // amp   : amplitude oscillation radiale
  // speed : vitesse en rad/ms  (2π / speed ≈ durée d'un cycle)
  var DEFS = [
    // Grand — vert forêt
    {
      cx: 0.48, cy: 0.52, rBase: 0.44, amp: 0.22, speed: 0.00055,
      color: 'rgba(56,81,68,0.60)', comp: 'source-over',
      phases: null, nPts: 0,
    },
    // Moyen — vert sombre
    {
      cx: 0.60, cy: 0.36, rBase: 0.30, amp: 0.20, speed: 0.00070,
      color: 'rgba(26,46,32,0.80)', comp: 'source-over',
      phases: null, nPts: 0,
    },
    // Petit — blanc cassé très subtil
    {
      cx: 0.35, cy: 0.66, rBase: 0.19, amp: 0.28, speed: 0.00080,
      color: 'rgba(248,245,242,0.08)', comp: 'screen',
      phases: null, nPts: 0,
    },
  ];

  function initBlobs() {
    var isMobile = mob();
    DEFS.forEach(function (b) {
      b.nPts = isMobile ? 4 : 6;
      b.phases = [];
      for (var i = 0; i < b.nPts; i++) {
        // Phase de base répartie + décalage aléatoire pour l'organicité
        b.phases.push((i / b.nPts) * Math.PI * 2 + (Math.random() - 0.5) * 0.9);
      }
    });
  }

  // Courbe fermée lisse via Catmull-Rom → Bézier cubique
  function strokeBlob(pts) {
    var n = pts.length;
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n];
      var p1 = pts[i];
      var p2 = pts[(i + 1) % n];
      var p3 = pts[(i + 2) % n];
      var cp1x = p1.x + (p2.x - p0.x) / 6;
      var cp1y = p1.y + (p2.y - p0.y) / 6;
      var cp2x = p2.x - (p3.x - p1.x) / 6;
      var cp2y = p2.y - (p3.y - p1.y) / 6;
      if (i === 0) { ctx.moveTo(p1.x, p1.y); }
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.closePath();
  }

  function drawBlob(b, t) {
    var cx = b.cx * W;
    var cy = b.cy * H;
    var rRef = Math.min(W, H) * b.rBase;
    var pts = [];
    for (var i = 0; i < b.nPts; i++) {
      var angle = (i / b.nPts) * Math.PI * 2;
      var r = rRef * (1 + b.amp * Math.sin(t * b.speed + b.phases[i]));
      pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
    ctx.save();
    ctx.globalCompositeOperation = b.comp;
    ctx.fillStyle = b.color;
    strokeBlob(pts);
    ctx.fill();
    ctx.restore();
  }

  function render(ts) {
    // Cap 30 fps sur mobile
    if (mob() && ts - lastTs < 33) {
      rafId = requestAnimationFrame(render);
      return;
    }
    lastTs = ts;

    ctx.clearRect(0, 0, W, H);
    DEFS.forEach(function (b) { drawBlob(b, ts); });

    rafId = requestAnimationFrame(render);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    DEFS.forEach(function (b) { drawBlob(b, 0); });
  }

  function start() {
    resize();
    initBlobs();
    if (reducedMotion) {
      drawStatic();
      return;
    }
    rafId = requestAnimationFrame(render);
  }

  // Pause quand l'onglet est inactif
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!reducedMotion && !rafId) {
      rafId = requestAnimationFrame(render);
    }
  });

  // Resize avec debounce + re-init si passage mobile/desktop
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var wasMobile = DEFS[0].nPts === 4;
      resize();
      if (wasMobile !== mob()) { initBlobs(); }
    }, 200);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
