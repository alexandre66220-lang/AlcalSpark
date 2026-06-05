/* AlcalSpark — Custom Spark Cursor
   Pure div/CSS approach — no canvas, no external dependencies
   cursor:none injected only after first mousemove confirms cursor is live */
(function () {
  'use strict';

  // Skip on touch/stylus screens
  if (window.matchMedia('(pointer: coarse)').matches) return;

  /* ── Particle keyframe + base class ───────────────────────── */
  var style = document.createElement('style');
  style.textContent =
    '@keyframes spk{' +
      '0%{opacity:.85;transform:translate(-50%,-50%) scale(1)}' +
      '100%{opacity:0;transform:translate(-50%,-50%) scale(.1)}' +
    '}' +
    '.sp{' +
      'position:fixed;border-radius:50%;pointer-events:none;z-index:999998;' +
      'background:radial-gradient(circle,#fffce0 0%,#e8c97a 45%,#c9a84c 100%);' +
      'animation:spk .45s ease-out forwards' +
    '}';
  document.head.appendChild(style);

  /* ── Cursor head ───────────────────────────────────────────── */
  var dot = document.createElement('div');
  dot.id = 'cursor-spark';
  dot.style.cssText =
    'position:fixed;pointer-events:none;z-index:999999;' +
    'width:14px;height:14px;border-radius:50%;' +
    'background:radial-gradient(circle,#fffce0 0%,#e8c97a 40%,#c9a84c 100%);' +
    'box-shadow:0 0 8px 2px rgba(232,201,122,.8),0 0 20px 5px rgba(201,168,76,.3);' +
    'transform:translate(-50%,-50%);' +
    'transition:width .12s,height .12s,box-shadow .12s,transform .08s;' +
    'top:-200px;left:-200px;' +
    'will-change:top,left;';
  document.body.appendChild(dot);

  var lastX = null, lastY = null;
  var isHover = false;
  var cursorHidden = false;

  /* ── Hide native cursor (deferred to first real mouse event) ─ */
  function hideCursor() {
    if (cursorHidden) return;
    cursorHidden = true;
    var hide = document.createElement('style');
    hide.textContent = '*,*::before,*::after{cursor:none!important}';
    document.head.appendChild(hide);
  }

  /* ── Spawn one trail particle ─────────────────────────────── */
  function spawnParticle(x, y) {
    var size = isHover
      ? Math.random() * 5 + 3
      : Math.random() * 3 + 1.5;
    var dur = (Math.random() * 0.2 + 0.3).toFixed(2);
    var ox  = (Math.random() - 0.5) * (isHover ? 7 : 4);
    var oy  = (Math.random() - 0.5) * (isHover ? 7 : 4);

    var p = document.createElement('div');
    p.className = 'sp';
    p.style.cssText =
      'left:'   + (x + ox).toFixed(1) + 'px;' +
      'top:'    + (y + oy).toFixed(1) + 'px;' +
      'width:'  + size.toFixed(1) + 'px;' +
      'height:' + size.toFixed(1) + 'px;' +
      'box-shadow:0 0 ' + (size * 1.8).toFixed(1) + 'px rgba(201,168,76,.55);' +
      'animation-duration:' + dur + 's;';
    document.body.appendChild(p);

    setTimeout(function () {
      if (p.parentNode) p.parentNode.removeChild(p);
    }, parseFloat(dur) * 1000 + 60);
  }

  /* ── Mouse tracking ────────────────────────────────────────── */
  document.addEventListener('mousemove', function (e) {
    var mx = e.clientX;
    var my = e.clientY;

    // Move cursor head immediately
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';

    // Hide native cursor on first move (cursor head is now positioned)
    hideCursor();

    // Seed lastX/lastY on very first event — no particles yet
    if (lastX === null) { lastX = mx; lastY = my; return; }

    var dx   = mx - lastX;
    var dy   = my - lastY;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 3) {
      // Interpolate spawn points along the movement vector
      var step  = isHover ? 9 : 14;
      var count = Math.max(1, Math.floor(dist / step));
      for (var i = 0; i < count; i++) {
        var t = count > 1 ? i / (count - 1) : 0.5;
        spawnParticle(lastX + dx * t, lastY + dy * t);
      }
      lastX = mx;
      lastY = my;
    }
  });

  /* ── Hover intensity on interactive elements ───────────────── */
  function attachHover(el) {
    el.addEventListener('mouseenter', function () {
      isHover = true;
      dot.style.width     = '20px';
      dot.style.height    = '20px';
      dot.style.boxShadow = '0 0 12px 4px rgba(232,201,122,.9),0 0 30px 8px rgba(201,168,76,.4)';
    });
    el.addEventListener('mouseleave', function () {
      isHover = false;
      dot.style.width     = '14px';
      dot.style.height    = '14px';
      dot.style.boxShadow = '0 0 8px 2px rgba(232,201,122,.8),0 0 20px 5px rgba(201,168,76,.3)';
    });
  }

  document.querySelectorAll('a, button, [data-hover]').forEach(attachHover);

  /* ── Click pulse ───────────────────────────────────────────── */
  document.addEventListener('mousedown', function () {
    dot.style.transform = 'translate(-50%,-50%) scale(.65)';
    // Extra burst on click
    if (lastX !== null) {
      for (var i = 0; i < 5; i++) spawnParticle(lastX, lastY);
    }
  });
  document.addEventListener('mouseup', function () {
    dot.style.transform = 'translate(-50%,-50%) scale(1)';
  });

}());
