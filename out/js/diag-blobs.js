(function () {
  'use strict';

  var canvases = document.querySelectorAll('.diag-blob-canvas');
  if (!canvases.length) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COLORS = ['rgba(45, 90, 61, 0.40)', 'rgba(56, 81, 68, 0.32)'];

  function initField(canvas) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0;
    var RES = 0.5;
    var rafId = null;
    var running = false;

    var DEFS = COLORS.map(function (color, i) {
      return {
        color: color,
        r: i === 0 ? 0.34 : 0.24,
        phase: Math.random() * Math.PI * 2,
        speed: 0.00045 + i * 0.00015,
        amp: 0.14,
        nPts: 6,
        phases: [],
        drawCx: 0, drawCy: 0
      };
    });

    function resize() {
      var box = canvas.parentElement;
      W = canvas.width  = Math.max(1, Math.round(box.offsetWidth  * RES));
      H = canvas.height = Math.max(1, Math.round(box.offsetHeight * RES));
    }

    function initPts() {
      DEFS.forEach(function (b) {
        b.phases = [];
        for (var i = 0; i < b.nPts; i++) {
          b.phases.push((i / b.nPts) * Math.PI * 2 + Math.random() * 0.6);
        }
        b.drawCx = W * 0.5;
        b.drawCy = H * 0.5;
      });
    }

    function strokeBlob(pts) {
      var n = pts.length;
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        var cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
        var cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
        if (i === 0) ctx.moveTo(p1.x, p1.y);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
      ctx.closePath();
    }

    function drawBlob(b, t) {
      var rPx = b.r * W;
      var targetCx = W * (0.5 + 0.12 * Math.cos(t * b.speed + b.phase));
      var targetCy = H * (0.5 + 0.12 * Math.sin(t * b.speed * 0.8 + b.phase));
      b.drawCx += (targetCx - b.drawCx) * 0.04;
      b.drawCy += (targetCy - b.drawCy) * 0.04;

      var pts = [];
      for (var i = 0; i < b.nPts; i++) {
        var angle = (i / b.nPts) * Math.PI * 2;
        var r = rPx * (1 + b.amp * Math.sin(t * b.speed * 1.4 + b.phases[i]));
        pts.push({ x: b.drawCx + Math.cos(angle) * r, y: b.drawCy + Math.sin(angle) * r });
      }
      ctx.fillStyle = b.color;
      strokeBlob(pts);
      ctx.fill();
    }

    function render(ts) {
      ctx.clearRect(0, 0, W, H);
      DEFS.forEach(function (b) { drawBlob(b, ts); });
      if (running) rafId = requestAnimationFrame(render);
    }

    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      DEFS.forEach(function (b) { drawBlob(b, 0); });
    }

    function start() {
      resize();
      initPts();
      if (reducedMotion) { drawStatic(); return; }
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(render);
    }

    function stop() {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) start(); else stop();
        });
      }, { rootMargin: '60px' }).observe(canvas.parentElement);
    } else {
      start();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else if (!reducedMotion) start();
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });

    // La carte grandit dynamiquement (questions ajoutées) : le canvas
    // plein cadre doit suivre sa hauteur sans attendre un resize fenêtre.
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { resize(); }).observe(canvas.parentElement);
    }
  }

  canvases.forEach(initField);
})();
