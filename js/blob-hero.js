(function () {
  'use strict';

  var canvas = document.getElementById('blobs-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 0, H = 0;
  var rafId = null;
  var lastTs = 0;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none)').matches;

  function mob() { return window.innerWidth < 768; }

  function resize() {
    var box = canvas.parentElement;
    W = canvas.width  = box.offsetWidth;
    H = canvas.height = box.offsetHeight;
  }

  // ── Blobs ─────────────────────────────────────────────────────────
  // cx/cy        : centre de base en fraction de W/H
  // rBase        : rayon en fraction de min(W,H) — grand blob ~80% largeur zone
  // amp / speed  : morphing sinusoïdal
  // driftAmpX/Y  : dérive lente en fraction de W/H
  // driftSpeed   : vitesse dérive rad/ms
  // driftPhase   : décalage de phase pour asynchronicité
  // cursorFactor : >0 suit curseur, <0 fuit curseur
  // lerpFactor   : fluidité du suivi (bas = lent)
  // drawCx/Cy    : position courante interpolée (runtime)
  var DEFS = [
    // Grand — vert forêt — suit le curseur doucement
    {
      cx: 0.50, cy: 0.52,
      rBase: 0.72, amp: 0.14, speed: 0.00055,
      color: 'rgba(56,81,68,0.65)', comp: 'source-over',
      driftAmpX: 0.18, driftAmpY: 0.13, driftSpeed: 0.00017, driftPhase: 0,
      cursorFactor: 0.30, lerpFactor: 0.04,
      phases: null, nPts: 0, drawCx: 0, drawCy: 0,
    },
    // Moyen — vert sombre — fuit le curseur
    {
      cx: 0.65, cy: 0.34,
      rBase: 0.54, amp: 0.17, speed: 0.00070,
      color: 'rgba(26,46,32,0.90)', comp: 'source-over',
      driftAmpX: 0.15, driftAmpY: 0.18, driftSpeed: 0.00022, driftPhase: 2.1,
      cursorFactor: -0.22, lerpFactor: 0.025,
      phases: null, nPts: 0, drawCx: 0, drawCy: 0,
    },
    // Tiers — vert forêt subtil — ombre, suit plus vite
    {
      cx: 0.28, cy: 0.66,
      rBase: 0.42, amp: 0.20, speed: 0.00080,
      color: 'rgba(56,81,68,0.30)', comp: 'source-over',
      driftAmpX: 0.13, driftAmpY: 0.11, driftSpeed: 0.00028, driftPhase: 4.5,
      cursorFactor: 0.50, lerpFactor: 0.08,
      phases: null, nPts: 0, drawCx: 0, drawCy: 0,
    },
  ];

  function initBlobs() {
    var isMob = mob();
    DEFS.forEach(function (b) {
      b.nPts = isMob ? 4 : 6;
      b.phases = [];
      for (var i = 0; i < b.nPts; i++) {
        b.phases.push((i / b.nPts) * Math.PI * 2 + (Math.random() - 0.5) * 0.9);
      }
      b.drawCx = b.cx * W;
      b.drawCy = b.cy * H;
    });
  }

  // ── Interaction curseur ────────────────────────────────────────────
  var mouse      = { x: 0, y: 0 };
  var mouseIn    = false;
  var exitTs     = -1;
  var FADE_MS    = 2000;

  function influence(ts) {
    if (isTouch || mob()) return 0;
    if (mouseIn) return 1;
    if (exitTs < 0) return 0;
    var t = (ts - exitTs) / FADE_MS;
    if (t >= 1) { exitTs = -1; return 0; }
    return 1 - t;
  }

  var zone = canvas.parentElement;

  zone.addEventListener('mousemove', function (e) {
    if (isTouch || mob()) return;
    var r = zone.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    if (!mouseIn) { mouseIn = true; exitTs = -1; }
  });

  zone.addEventListener('mouseleave', function () {
    if (isTouch || mob()) return;
    mouseIn = false;
    exitTs = performance.now();
  });

  // ── Rendu ─────────────────────────────────────────────────────────
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
      if (i === 0) ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.closePath();
  }

  function drawBlob(b, t) {
    var rRef = Math.min(W, H) * b.rBase;
    var pts  = [];
    for (var i = 0; i < b.nPts; i++) {
      var angle = (i / b.nPts) * Math.PI * 2;
      var r = rRef * (1 + b.amp * Math.sin(t * b.speed + b.phases[i]));
      pts.push({ x: b.drawCx + Math.cos(angle) * r, y: b.drawCy + Math.sin(angle) * r });
    }
    ctx.save();
    ctx.globalCompositeOperation = b.comp;
    ctx.fillStyle = b.color;
    strokeBlob(pts);
    ctx.fill();
    ctx.restore();
  }

  function render(ts) {
    if (mob() && ts - lastTs < 33) {
      rafId = requestAnimationFrame(render);
      return;
    }
    lastTs = ts;

    var inf = influence(ts);

    ctx.clearRect(0, 0, W, H);

    DEFS.forEach(function (b) {
      // Position automatique avec dérive lente sur toute la zone
      var driftX = b.driftAmpX * Math.sin(ts * b.driftSpeed + b.driftPhase);
      var driftY = b.driftAmpY * Math.cos(ts * b.driftSpeed * 0.7 + b.driftPhase + 1.3);
      var autoCx = (b.cx + driftX) * W;
      var autoCy = (b.cy + driftY) * H;

      // Cible avec influence curseur
      var targetCx = autoCx;
      var targetCy = autoCy;
      if (inf > 0) {
        targetCx = autoCx + (mouse.x - autoCx) * b.cursorFactor * inf;
        targetCy = autoCy + (mouse.y - autoCy) * b.cursorFactor * inf;
      }

      // Lerp vers cible
      b.drawCx += (targetCx - b.drawCx) * b.lerpFactor;
      b.drawCy += (targetCy - b.drawCy) * b.lerpFactor;

      drawBlob(b, ts);
    });

    rafId = requestAnimationFrame(render);
  }

  function drawStatic() {
    DEFS.forEach(function (b) {
      b.drawCx = b.cx * W;
      b.drawCy = b.cy * H;
    });
    ctx.clearRect(0, 0, W, H);
    DEFS.forEach(function (b) { drawBlob(b, 0); });
  }

  function start() {
    resize();
    initBlobs();
    if (reducedMotion) { drawStatic(); return; }
    rafId = requestAnimationFrame(render);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!reducedMotion && !rafId) {
      rafId = requestAnimationFrame(render);
    }
  });

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
