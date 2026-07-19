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
    DEFS.forEach(function (b) {
      b.drawCx = pos(b, 0).x;
      b.drawCy = pos(b, 0).y;
    });
  }

  // ── Trajectoires parametriques ─────────────────────────────────
  // Chaque blob a une trajectoire propre, espacement garanti par
  // des phases et centres de base très différents.
  //
  // Rayon = fraction de W (pas de min(W,H))

  var SPD = 0.000785; // 8s par cycle complet (2π / SPD)

  // Grand : ellipse large qui couvre toute la zone
  function posGrand(t) {
    return {
      x: W * 0.50 + W * 0.36 * Math.cos(t * SPD),
      y: H * 0.50 + H * 0.28 * Math.sin(t * SPD * 0.71)
    };
  }

  // Moyen : cercle décalé de 2s (≈ π/2 à cette vitesse) + sens opposé
  var MED_PH = SPD * 2000 + Math.PI;
  function posMed(t) {
    return {
      x: W * 0.50 + W * 0.30 * Math.cos(t * SPD + MED_PH),
      y: H * 0.50 + H * 0.26 * Math.sin(t * SPD * 0.83 + MED_PH + 0.6)
    };
  }

  // Petit : deux sinusoïdes additionnées → trajectoire imprévisible
  function posSmall(t) {
    return {
      x: W * 0.50 + W * 0.28 * Math.sin(t * 0.00112) + W * 0.12 * Math.cos(t * 0.00191),
      y: H * 0.50 + H * 0.26 * Math.cos(t * 0.00134) + H * 0.10 * Math.sin(t * 0.00247)
    };
  }

  function pos(b, t) { return b.fn(t); }

  // ── Définitions ────────────────────────────────────────────────
  var DEFS = [
    {
      fn: posGrand,
      r: 0.28,                          // 28% de W
      color: 'rgba(45,90,61,0.45)',      // #2d5a3d 45%
      comp: 'source-over',
      cursorFactor:  0.30, lerpFactor: 0.04,
      drawCx: 0, drawCy: 0, nPts: 0, phases: null,
      amp: 0.10, speed: 0.00055,
    },
    {
      fn: posMed,
      r: 0.20,                          // 20% de W
      color: 'rgba(56,81,68,0.35)',      // #385144 35%
      comp: 'source-over',
      cursorFactor: -0.20, lerpFactor: 0.025,
      drawCx: 0, drawCy: 0, nPts: 0, phases: null,
      amp: 0.12, speed: 0.00070,
    },
    {
      fn: posSmall,
      r: 0.14,                          // 14% de W
      color: 'rgba(26,51,40,0.55)',      // #1a3328 55%
      comp: 'source-over',
      cursorFactor:  0.45, lerpFactor: 0.08,
      drawCx: 0, drawCy: 0, nPts: 0, phases: null,
      amp: 0.16, speed: 0.00090,
    },
  ];

  function initBlobs() {
    var isMob = mob();
    DEFS.forEach(function (b) {
      b.nPts = isMob ? 5 : 7;
      b.phases = [];
      for (var i = 0; i < b.nPts; i++) {
        b.phases.push((i / b.nPts) * Math.PI * 2 + (Math.random() - 0.5) * 0.9);
      }
      var p = pos(b, 0);
      b.drawCx = p.x;
      b.drawCy = p.y;
    });
  }

  // ── Curseur (desktop uniquement) ───────────────────────────────
  var mouse   = { x: 0, y: 0 };
  var mouseIn = false;
  var exitTs  = -1;
  var FADE_MS = 2000;

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

  // ── Rendu blob (Catmull-Rom → Bézier) ─────────────────────────
  function strokeBlob(pts) {
    var n = pts.length;
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i];
      var p2 = pts[(i + 1) % n],     p3 = pts[(i + 2) % n];
      var cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
      var cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
      if (i === 0) ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.closePath();
  }

  function drawBlob(b, t) {
    var rPx = b.r * W;
    var pts = [];
    for (var i = 0; i < b.nPts; i++) {
      var angle = (i / b.nPts) * Math.PI * 2;
      var r = rPx * (1 + b.amp * Math.sin(t * b.speed + b.phases[i]));
      pts.push({ x: b.drawCx + Math.cos(angle) * r, y: b.drawCy + Math.sin(angle) * r });
    }
    ctx.save();
    ctx.globalCompositeOperation = b.comp;
    ctx.fillStyle = b.color;
    strokeBlob(pts);
    ctx.fill();
    ctx.restore();
  }

  // ── Boucle ─────────────────────────────────────────────────────
  function render(ts) {
    if (mob() && ts - lastTs < 33) { rafId = requestAnimationFrame(render); return; }
    lastTs = ts;

    var inf = influence(ts);
    ctx.clearRect(0, 0, W, H);

    DEFS.forEach(function (b) {
      var auto = pos(b, ts);

      var targetCx = auto.x, targetCy = auto.y;
      if (inf > 0) {
        targetCx += (mouse.x - auto.x) * b.cursorFactor * inf;
        targetCy += (mouse.y - auto.y) * b.cursorFactor * inf;
      }

      b.drawCx += (targetCx - b.drawCx) * b.lerpFactor;
      b.drawCy += (targetCy - b.drawCy) * b.lerpFactor;

      drawBlob(b, ts);
    });

    rafId = requestAnimationFrame(render);
  }

  function drawStatic() {
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
    if (document.hidden) { cancelAnimationFrame(rafId); rafId = null; }
    else if (!reducedMotion && !rafId) { rafId = requestAnimationFrame(render); }
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var wasMob = DEFS[0].nPts === 5;
      resize();
      if (wasMob !== mob()) initBlobs();
    }, 200);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
