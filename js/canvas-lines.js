// ── CANVAS LIGNES INTERACTIF — desktop only ──
(function () {
  if (window.innerWidth < 1024) return;

  const canvas = document.getElementById('lines-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const zone = canvas.parentElement;
  let mouse = { x: -1, y: -1 }, W, H, tick = 0;
  let currentMode = 0, targetMode = 0, modeBlend = 1;

  function resize() {
    W = canvas.width = zone.offsetWidth;
    H = canvas.height = zone.offsetHeight;
  }

  zone.addEventListener('mousemove', e => {
    const r = zone.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  zone.addEventListener('mouseleave', () => { mouse.x = -1; mouse.y = -1; });

  document.querySelectorAll('.stat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.stat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentMode = targetMode;
      targetMode = parseInt(tab.dataset.mode);
      modeBlend = 0;
    });
  });

  const NUM = 60;
  const modes = [
    {
      getY(i, x, t, mx, my) {
        const base = H * .1 + (i / (NUM - 1)) * H * .8;
        const w = Math.sin(x / W * Math.PI * 1.2 + t * .005 + i * .18) * 28;
        const mF = my > 0 ? Math.max(0, 1 - Math.abs(base - my) / 120) : 0;
        const mW = mx > 0 ? Math.exp(-Math.pow((x - mx) / (W * .15), 2)) * mF * 50 : 0;
        return base + w + mW * (i / (NUM - 1) - .5) * 2;
      },
      col() { return '56,81,68'; }
    },
    {
      getY(i, x, t, mx, my) {
        const base = H * .1 + (i / (NUM - 1)) * H * .8;
        const pull = (H * .5 - base) * (Math.sin(x / W * Math.PI) * 0.35 + 0.15);
        const w = Math.sin(x / W * Math.PI * 2 + t * .007 + i * .12) * 15;
        const mF = mx > 0 ? Math.exp(-Math.pow((x - mx) / (W * .2), 2)) * Math.max(0, 1 - Math.abs(base - my) / 150) : 0;
        return base + pull + w + mF * 30 * (i / (NUM - 1) - .5) * 2;
      },
      col() { return '74,107,90'; }
    },
    {
      getY(i, x, t, mx, my) {
        const base = H * .1 + (i / (NUM - 1)) * H * .8;
        const cx = W * .5, cy = H * .5;
        const angle = Math.atan2(base - cy, x - cx);
        const wave = Math.sin(Math.sqrt((x - cx) ** 2 + (base - cy) ** 2) * .015 - t * .008 + i * .1) * 20;
        const mF = mx > 0 ? Math.exp(-Math.pow(Math.sqrt((x - mx) ** 2 + (base - my) ** 2) / 180, 2)) : 0;
        return base + wave + mF * 40 * Math.sin(angle * 3 + t * .01);
      },
      col() { return '90,138,110'; }
    },
    {
      getY(i, x, t, mx, my) {
        const base = H * .1 + (i / (NUM - 1)) * H * .8;
        const w = Math.sin(x / W * Math.PI * 3 + t * .012 + i * .25) * 18
                + Math.sin(x / W * Math.PI * 1.5 - t * .008 + i * .15) * 12;
        const mF = my > 0 ? Math.max(0, 1 - Math.abs(base - my) / 100) : 0;
        const spike = mx > 0 ? Math.exp(-Math.pow((x - mx) / (W * .08), 2)) * mF * 70 : 0;
        return base + w + spike * (i / (NUM - 1) - .5) * 3;
      },
      col() { return '56,81,68'; }
    }
  ];

  function draw() {
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, 'rgba(10,13,11,1)');
    bg.addColorStop(.5, 'rgba(14,20,16,.97)');
    bg.addColorStop(1, 'rgba(10,13,11,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    tick++;
    if (modeBlend < 1) modeBlend = Math.min(1, modeBlend + .025);

    const mA = modes[currentMode];
    const mB = modes[targetMode];

    for (let i = 0; i < NUM; i++) {
      const base = H * .1 + (i / (NUM - 1)) * H * .8;
      const mF = mouse.y > 0 ? Math.max(0, 1 - Math.abs(base - mouse.y) / 130) : 0;

      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const y = mA.getY(i, x, tick, mouse.x, mouse.y) * (1 - modeBlend)
                + mB.getY(i, x, tick, mouse.x, mouse.y) * modeBlend;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }

      ctx.strokeStyle = `rgba(${mB.col()},${.06 + mF * .22})`;
      ctx.lineWidth = .7 + mF * 1.5;
      ctx.stroke();
    }

    rafId = requestAnimationFrame(draw);
  }

  // Boucle active uniquement quand la zone est visible et l'onglet actif
  let rafId = null;
  let inView = false;
  let started = false;

  function play() {
    if (started && inView && !document.hidden && rafId === null) {
      rafId = requestAnimationFrame(draw);
    }
  }
  function pause() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function start() {
    if (started) return;
    started = true;
    resize();
    window.addEventListener('resize', resize);
    play();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause(); else play();
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        inView = entry.isIntersecting;
        if (inView) { start(); play(); }
        else pause();
      });
    }, { rootMargin: '200px' });
    observer.observe(zone);
  } else {
    inView = true;
    start();
  }
})();
