(function () {
  'use strict';

  // Only run on pointer devices
  if (window.matchMedia('(hover: none)').matches) return;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function initItem(item) {
    var xray = item.querySelector('.svc-xray');
    if (!xray) return;

    var radius = 0;
    var targetRadius = 0;
    var cx = 0;
    var cy = 0;
    var raf = null;

    function applyClip() {
      xray.style.clipPath =
        'circle(' + radius.toFixed(1) + 'px at ' + cx.toFixed(1) + 'px ' + cy.toFixed(1) + 'px)';
    }

    function tick() {
      var diff = targetRadius - radius;
      if (Math.abs(diff) < 0.4) {
        radius = targetRadius;
        raf = null;
      } else {
        radius = lerp(radius, targetRadius, 0.18);
        raf = requestAnimationFrame(tick);
      }
      applyClip();
    }

    function startAnim() {
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function getPos(e) {
      var rect = item.getBoundingClientRect();
      cx = e.clientX - rect.left;
      cy = e.clientY - rect.top;
    }

    item.addEventListener('mouseenter', function (e) {
      getPos(e);
      targetRadius = 90;
      startAnim();
    });

    item.addEventListener('mousemove', function (e) {
      getPos(e);
      // When radius is settled at 90, update position directly
      if (!raf) applyClip();
    });

    item.addEventListener('mouseleave', function (e) {
      getPos(e);
      targetRadius = 0;
      startAnim();
    });
  }

  function init() {
    document.querySelectorAll('.service-item').forEach(initItem);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
