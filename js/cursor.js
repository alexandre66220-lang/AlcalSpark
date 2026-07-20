/* AlcalSpark — Custom Cursor
   Couleurs : vert #385144 uniquement */
(function () {
  'use strict';

  if (window.matchMedia('(pointer: coarse)').matches) return;

  var G = '#ffffff';
  var G2 = 'rgba(255,255,255,';

  var style = document.createElement('style');
  style.textContent =
    '@keyframes spk{' +
      '0%{opacity:.7;transform:translate(-50%,-50%) scale(1)}' +
      '100%{opacity:0;transform:translate(-50%,-50%) scale(.1)}' +
    '}' +
    '.sp{' +
      'position:fixed;border-radius:50%;pointer-events:none;z-index:999998;' +
      'background:' + G + ';' +
      'mix-blend-mode:difference;' +
      'animation:spk .5s ease-out forwards' +
    '}';
  document.head.appendChild(style);

  var dot = document.createElement('div');
  dot.id = 'cursor-spark';
  dot.style.cssText =
    'position:fixed;pointer-events:none;z-index:999999;' +
    'width:10px;height:10px;border-radius:50%;' +
    'background:' + G + ';' +
    'mix-blend-mode:difference;' +
    'top:0;left:0;' +
    'transform:translate(-200px,-200px);' +
    'transition:width .15s,height .15s,opacity .15s;' +
    'will-change:transform;';
  document.body.appendChild(dot);

  var lastX = null, lastY = null;
  var isHover = false;
  var cursorHidden = false;

  function hideCursor() {
    if (cursorHidden) return;
    cursorHidden = true;
    var hide = document.createElement('style');
    hide.textContent = '*,*::before,*::after{cursor:none!important}';
    document.head.appendChild(hide);
  }

  function spawnParticle(x, y) {
    var size = isHover ? Math.random() * 4 + 2 : Math.random() * 2.5 + 1;
    var dur  = (Math.random() * 0.25 + 0.3).toFixed(2);
    var ox   = (Math.random() - 0.5) * (isHover ? 8 : 5);
    var oy   = (Math.random() - 0.5) * (isHover ? 8 : 5);

    var p = document.createElement('div');
    p.className = 'sp';
    p.style.cssText =
      'left:'   + (x + ox).toFixed(1) + 'px;' +
      'top:'    + (y + oy).toFixed(1) + 'px;' +
      'width:'  + size.toFixed(1) + 'px;' +
      'height:' + size.toFixed(1) + 'px;' +
      'opacity:.5;' +
      'animation-duration:' + dur + 's;';
    document.body.appendChild(p);
    liveParticles++;

    setTimeout(function () {
      if (p.parentNode) p.parentNode.removeChild(p);
      liveParticles--;
    }, parseFloat(dur) * 1000 + 60);
  }

  var liveParticles = 0;
  var MAX_PARTICLES = 36;

  document.addEventListener('mousemove', function (e) {
    var mx = e.clientX;
    var my = e.clientY;
    dot.style.transform = 'translate(' + (mx - 5) + 'px,' + (my - 5) + 'px)';
    hideCursor();

    if (lastX === null) { lastX = mx; lastY = my; return; }

    var dx   = mx - lastX;
    var dy   = my - lastY;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 4) {
      var step  = isHover ? 14 : 22;
      var count = Math.min(Math.max(1, Math.floor(dist / step)), 4);
      for (var i = 0; i < count && liveParticles < MAX_PARTICLES; i++) {
        var t = count > 1 ? i / (count - 1) : 0.5;
        spawnParticle(lastX + dx * t, lastY + dy * t);
      }
      lastX = mx;
      lastY = my;
    }
  });

  function attachHover(el) {
    el.addEventListener('mouseenter', function () {
      isHover = true;
      dot.style.width   = '18px';
      dot.style.height  = '18px';
      dot.style.opacity = '.7';
    });
    el.addEventListener('mouseleave', function () {
      isHover = false;
      dot.style.width   = '10px';
      dot.style.height  = '10px';
      dot.style.opacity = '1';
    });
  }

  document.querySelectorAll('a, button, [data-hover]').forEach(attachHover);

  document.addEventListener('mousedown', function () {
    dot.style.width  = '6px';
    dot.style.height = '6px';
    if (lastX !== null) {
      for (var i = 0; i < 3 && liveParticles < MAX_PARTICLES; i++) spawnParticle(lastX, lastY);
    }
  });
  document.addEventListener('mouseup', function () {
    dot.style.width  = isHover ? '18px' : '10px';
    dot.style.height = isHover ? '18px' : '10px';
  });

}());
