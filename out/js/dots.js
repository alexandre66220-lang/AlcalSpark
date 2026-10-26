(function () {
  'use strict';

  if (window.matchMedia('(hover: none)').matches) return;

  var canvas = document.getElementById('hero-dots');
  if (!canvas) return;

  var ctx  = canvas.getContext('2d');
  var hero = document.getElementById('hero');

  // Lift hero content above the canvas (canvas is position:absolute, stacks on top of static children)
  var heroInner = hero.querySelector('.hero-inner');
  if (heroInner) { heroInner.style.position = 'relative'; heroInner.style.zIndex = 1; }

  // Parameters
  var SPACING   = 35;
  var INFLUENCE = 120;
  var MAX_PUSH  = 20;
  var LERP      = 0.08;
  var DOT_R     = 1.5;

  var mx = -9999, my = -9999, active = false;
  var dots = [];
  var W = 0, H = 0;

  // ── Grid ───────────────────────────────────────────────────────
  function buildGrid() {
    dots = [];
    var cols = Math.ceil(W / SPACING) + 1;
    var rows = Math.ceil(H / SPACING) + 1;
    var padX = ((W % SPACING) + SPACING) / 2;
    var padY = ((H % SPACING) + SPACING) / 2;
    for (var r = 0; r <= rows; r++) {
      for (var c = 0; c <= cols; c++) {
        var x = padX + c * SPACING;
        var y = padY + r * SPACING;
        dots.push({ ox: x, oy: y, x: x, y: y });
      }
    }
  }

  function resize() {
    W = canvas.width  = hero.offsetWidth;
    H = canvas.height = hero.offsetHeight;
    buildGrid();
  }

  // ── Render loop ────────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(56,81,68,0.3)';

    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      var tx = d.ox, ty = d.oy;

      if (active) {
        var dx   = d.ox - mx;
        var dy   = d.oy - my;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < INFLUENCE && dist > 0.001) {
          var force = (1 - dist / INFLUENCE) * MAX_PUSH;
          tx = d.ox + (dx / dist) * force;
          ty = d.oy + (dy / dist) * force;
        }
      }

      d.x += (tx - d.x) * LERP;
      d.y += (ty - d.y) * LERP;

      ctx.beginPath();
      ctx.arc(d.x, d.y, DOT_R, 0, 6.2832);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  // ── Events ─────────────────────────────────────────────────────
  hero.addEventListener('mousemove', function (e) {
    var r = hero.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
    active = true;
  });

  hero.addEventListener('mouseleave', function () {
    active = false;
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  // ── Init ───────────────────────────────────────────────────────
  resize();
  requestAnimationFrame(draw);
})();
