/* ============================================================
   AlcalSpark — Main JS
   Custom Cursor | Page Transitions | Navbar | Scroll Reveal
   ============================================================ */

(function () {
  'use strict';

  /* ── Loading Screen ──────────────────────────────────────── */
  const loadingScreen = document.getElementById('loading-screen');
  const loadingBar    = document.querySelector('.loading-bar');
  const loadingPct    = document.querySelector('.loading-percent');

  // Detect back/forward navigation before any animation starts.
  // Navigation Timing API returns 'back_forward' for history traversal,
  // covering both bfcache restores and full reloads triggered by back/forward.
  var isBackForwardNav = (function () {
    try {
      var entries = performance.getEntriesByType('navigation');
      if (entries.length) return entries[0].type === 'back_forward';
      // Fallback: deprecated API, type 2 = back/forward
      return !!(performance.navigation && performance.navigation.type === 2);
    } catch (e) { return false; }
  }());

  function forceHideLoader() {
    var ls = document.getElementById('loading-screen');
    if (ls) { ls.style.cssText += ';display:none!important'; }
    if (loadingScreen) { loadingScreen.style.cssText += ';display:none!important'; }
  }

  // pageshow fires for both normal loads and bfcache restores.
  // persisted=true means bfcache: JS state is frozen, curtain may be stuck.
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    forceHideLoader();
    isTransitioning = false;
    revealPage();
  });

  // popstate fires on same-document history navigation.
  // Hide any loader that might be visible during the transition.
  window.addEventListener('popstate', function () {
    forceHideLoader();
  });

  function runLoader() {
    if (!loadingScreen) return;

    // Back/forward navigation (full reload or bfcache): never show the loader.
    if (isBackForwardNav) {
      loadingScreen.style.display = 'none';
      initPage();
      return;
    }

    // Inter-page navigation: curtain already covers the screen, skip loader entirely
    if (sessionStorage.getItem('as-nav')) {
      sessionStorage.removeItem('as-nav');
      loadingScreen.style.display = 'none';
      initPage();
      return;
    }

    // First/direct load: wait for real page load then fade out fast
    let done = false;
    function complete() {
      if (done) return;
      done = true;
      if (loadingBar) loadingBar.style.width = '100%';
      if (loadingPct) loadingPct.textContent = '100%';
      finishLoader();
    }

    let pct = 0;
    const interval = setInterval(() => {
      if (done) { clearInterval(interval); return; }
      pct = Math.min(pct + (pct < 60 ? Math.random() * 30 : Math.random() * 8), 88);
      if (loadingBar) loadingBar.style.width = pct + '%';
      if (loadingPct) loadingPct.textContent = Math.round(pct) + '%';
    }, 70);

    if (document.readyState === 'complete') {
      setTimeout(() => { clearInterval(interval); complete(); }, 60);
    } else {
      window.addEventListener('load', () => { clearInterval(interval); complete(); }, { once: true });
      setTimeout(complete, 1000); // safety cap
    }
  }

  function finishLoader() {
    if (loadingScreen) loadingScreen.classList.add('hidden');
    setTimeout(() => {
      if (loadingScreen) loadingScreen.remove();
      initPage();
    }, 300);
  }

  /* ── Page Transition ─────────────────────────────────────── */
  const transition     = document.getElementById('page-transition');
  const curtain        = transition?.querySelector('.curtain');
  const curtainGold    = transition?.querySelector('.curtain-gold');
  const logoReveal     = transition?.querySelector('.logo-reveal');
  let isTransitioning  = false;

  function navigateTo(href) {
    if (isTransitioning || href === window.location.href) return;
    isTransitioning = true;
    sessionStorage.setItem('as-nav', '1'); // tell next page to skip loading screen

    // In
    if (curtainGold) {
      curtainGold.style.transition = 'transform 0.35s cubic-bezier(0.76, 0, 0.24, 1)';
      curtainGold.style.transform  = 'scaleY(1)';
    }
    if (curtain) {
      curtain.style.transition  = 'transform 0.4s cubic-bezier(0.76, 0, 0.24, 1) 0.1s';
      curtain.style.transform   = 'scaleY(1)';
    }
    if (logoReveal) {
      logoReveal.style.transition = 'opacity 0.3s 0.3s';
      logoReveal.style.opacity    = '1';
    }

    setTimeout(() => { window.location.href = href; }, 500);
  }

  function revealPage() {
    if (!curtain && !curtainGold) return;
    if (curtain) {
      curtain.style.transformOrigin = 'top';
      curtain.style.transform = 'scaleY(1)';
      curtain.style.transition = 'transform 0.5s cubic-bezier(0.76, 0, 0.24, 1) 0.1s';
    }
    if (curtainGold) {
      curtainGold.style.transformOrigin = 'top';
      curtainGold.style.transform = 'scaleY(1)';
      curtainGold.style.transition = 'transform 0.45s cubic-bezier(0.76, 0, 0.24, 1)';
    }
    if (logoReveal) logoReveal.style.opacity = '0';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (curtain) curtain.style.transform = 'scaleY(0)';
        if (curtainGold) curtainGold.style.transform = 'scaleY(0)';
      });
    });
    setTimeout(() => { isTransitioning = false; }, 700);
  }

  function initTransitions() {
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) return;
      if (link.target === '_blank') return;
      link.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(href);
      });
    });
  }

  /* ── Navbar scroll ───────────────────────────────────────── */
  const navbar = document.getElementById('navbar');

  function initNavbar() {
    if (!navbar) return;

    // Pages with a green hero need nav-dark initially
    const firstSection = document.querySelector('main > section:first-child, main > .page-hero:first-child');
    const isDarkHero = firstSection && (
      firstSection.classList.contains('section-green') ||
      firstSection.classList.contains('nav-dark') ||
      firstSection.dataset.navDark === 'true'
    );
    if (isDarkHero) navbar.classList.add('nav-dark');

    const handleScroll = () => {
      const scrolled = window.scrollY > 40;
      navbar.classList.toggle('scrolled', scrolled);
      if (isDarkHero) navbar.classList.toggle('nav-dark', !scrolled);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Active link
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
      const linkPath = link.getAttribute('href')?.split('/').pop() || '';
      if (linkPath === path || (path === '' && linkPath === 'index.html')) {
        link.classList.add('active');
      }
    });

    // Burger
    const burger    = document.querySelector('.nav-burger');
    const mobileNav = document.querySelector('.nav-mobile');
    if (burger && mobileNav) {
      burger.addEventListener('click', () => {
        burger.classList.toggle('open');
        mobileNav.classList.toggle('open');
        document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
      });
      mobileNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          burger.classList.remove('open');
          mobileNav.classList.remove('open');
          document.body.style.overflow = '';
        });
      });
    }
  }

  /* ── Scroll Reveal ───────────────────────────────────────── */
  function initScrollReveal() {
    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    if (!els.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => observer.observe(el));
  }

  /* ── Mouse Parallax ──────────────────────────────────────── */
  function initMouseParallax() {
    const layers = document.querySelectorAll('[data-parallax]');
    if (!layers.length) return;

    let tX = 0, tY = 0;
    window.addEventListener('mousemove', e => {
      tX = (e.clientX / window.innerWidth  - 0.5) * 2;
      tY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function animLayers() {
      layers.forEach(el => {
        const depth = parseFloat(el.dataset.parallax) || 1;
        const cx = parseFloat(el.style.getPropertyValue('--px') || 0);
        const cy = parseFloat(el.style.getPropertyValue('--py') || 0);
        const nx = cx + (tX * depth * 20 - cx) * 0.06;
        const ny = cy + (tY * depth * 20 - cy) * 0.06;
        el.style.setProperty('--px', nx);
        el.style.setProperty('--py', ny);
        el.style.transform = `translate(calc(var(--px) * 1px), calc(var(--py) * 1px))`;
      });
      requestAnimationFrame(animLayers);
    }
    animLayers();
  }

  /* ── Magnetic Buttons ────────────────────────────────────── */
  function initMagneticButtons() {
    document.querySelectorAll('.btn, .nav-cta, [data-magnetic]').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const rect   = btn.getBoundingClientRect();
        const cx     = rect.left + rect.width  / 2;
        const cy     = rect.top  + rect.height / 2;
        const dx     = (e.clientX - cx) * 0.25;
        const dy     = (e.clientY - cy) * 0.25;
        btn.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  /* ── Smooth Scroll for anchors ───────────────────────────── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  /* ── Counter animation ───────────────────────────────────── */
  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el     = entry.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const dur    = 2000;
        const start  = performance.now();

        function update(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / dur, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = (Number.isInteger(target)
            ? Math.round(eased * target)
            : (eased * target).toFixed(1)) + suffix;
          if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
        observer.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
  }

  /* ── Text split reveal ───────────────────────────────────── */
  function initTextReveal() {
    document.querySelectorAll('[data-text-reveal]').forEach(el => {
      if (el.closest('.hero-title')) return; // hero handled by initHeroReveal
      const words = el.textContent.trim().split(' ');
      el.innerHTML = words.map((w, i) =>
        `<span class="word-wrap" style="overflow:hidden;display:inline-block;vertical-align:bottom;"><span class="word" style="display:inline-block;transform:translateY(100%);transition:transform 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 0.055}s;">${w}&nbsp;</span></span>`
      ).join('');
    });

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.querySelectorAll('.word').forEach(w => { w.style.transform = 'translateY(0)'; });
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2 });

    document.querySelectorAll('[data-text-reveal]').forEach(el => observer.observe(el));
  }

  /* ── Scroll progress bar ─────────────────────────────────── */
  function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    window.addEventListener('scroll', () => {
      const h   = document.documentElement.scrollHeight - window.innerHeight;
      const pct = h > 0 ? (window.scrollY / h) * 100 : 0;
      bar.style.width = pct + '%';
    }, { passive: true });
  }

  /* ── Global particles canvas (fixed, full viewport) ─────── */
  function initGlobalParticles() {
    if (window.innerWidth < 1024) return;

    var canvas = document.createElement('canvas');
    canvas.id = 'particles-bg';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none;';
    document.body.insertBefore(canvas, document.body.firstChild);

    var ctx = canvas.getContext('2d');
    var G   = [56, 81, 68]; /* vert #385144 */
    var particles = [];

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    for (var i = 0; i < 36; i++) {
      particles.push({
        x:     Math.random() * canvas.width,
        y:     Math.random() * canvas.height,
        r:     Math.random() * 1.0 + 0.5,
        vx:    (Math.random() - 0.5) * 0.15,
        vy:    (Math.random() - 0.5) * 0.15,
        alpha: Math.random() * 0.22 + 0.08,
        phase: Math.random() * Math.PI * 2,
      });
    }

    (function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(function (p) {
        p.x += p.vx; p.y += p.vy; p.phase += 0.008;
        if (p.x < -5) p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;
        if (p.y < -5) p.y = canvas.height + 5;
        if (p.y > canvas.height + 5) p.y = -5;
        var opacity = p.alpha * (0.6 + 0.4 * Math.sin(p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + G[0] + ',' + G[1] + ',' + G[2] + ',' + opacity.toFixed(3) + ')';
        ctx.fill();
      });
      requestAnimationFrame(tick);
    }());
  }

  /* ── Cinematic hero entrance — CSS-driven, JS adds trigger ── */
  function initHeroReveal() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        hero.classList.add('hero-ready');
      });
    });
  }

  /* ── Button ripple on click ──────────────────────────────── */
  function initButtonRipple() {
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var rect = btn.getBoundingClientRect();
        var size = 60;
        var x = e.clientX - rect.left - size / 2;
        var y = e.clientY - rect.top  - size / 2;
        var ripple = document.createElement('span');
        ripple.className = 'btn-ripple';
        ripple.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + x + 'px;top:' + y + 'px;background:rgba(255,255,255,0.3);';
        btn.appendChild(ripple);
        setTimeout(function () { if (ripple.parentNode) ripple.parentNode.removeChild(ripple); }, 700);
      });
    });
  }

  /* ── Staggered scroll reveals ────────────────────────────── */
  function initStaggeredReveal() {
    var ease = 'var(--ease-out-expo)';

    // Philosophy cards: slide-up + fade with stagger
    var philGrid = document.querySelector('.philosophy-grid');
    if (philGrid) {
      var philCards = philGrid.querySelectorAll('.phil-card');
      philCards.forEach(function (card) {
        card.style.opacity   = '0';
        card.style.transform = 'translateY(18px)';
        card.style.transition = 'opacity 0.85s ' + ease + ', transform 0.85s ' + ease;
      });
      new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          philCards.forEach(function (card, i) {
            setTimeout(function () {
              card.style.opacity   = '1';
              card.style.transform = 'translateY(0)';
            }, i * 110);
          });
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }).observe(philGrid);
    }

    // Process steps: sequential stagger
    var processContainer = document.querySelector('.process-steps');
    if (processContainer) {
      var steps = processContainer.querySelectorAll('.process-step');
      steps.forEach(function (step) {
        step.style.opacity   = '0';
        step.style.transform = 'translateY(16px)';
        step.style.transition = 'opacity 0.75s ' + ease + ', transform 0.75s ' + ease;
      });
      new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          steps.forEach(function (step, i) {
            setTimeout(function () {
              step.style.opacity   = '1';
              step.style.transform = 'translateY(0)';
            }, i * 130);
          });
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' }).observe(processContainer);
    }
  }

  /* ── Init page ───────────────────────────────────────────── */
  function initPage() {
    initTransitions();
    initNavbar();
    initScrollReveal();
    initMouseParallax();
    initMagneticButtons();
    initSmoothScroll();
    initCounters();
    initTextReveal();
    initScrollProgress();
    revealPage();
    initGlobalParticles();
    initHeroReveal();
    initStaggeredReveal();
    initCardSpotlight();
    initButtonRipple();
  }

  /* ── Card spotlight border (cursor-tracked glow on edges) ─── */
  function initCardSpotlight() {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    var cards = document.querySelectorAll('.card, .phil-card, .si-card, .testi-card');
    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
        var y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
        card.style.setProperty('--mx', x + '%');
        card.style.setProperty('--my', y + '%');
        card.style.setProperty('--sg', '1');
      });
      card.addEventListener('mouseleave', function () {
        card.style.setProperty('--sg', '0');
      });
    });
  }

  /* ── Bootstrap ───────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runLoader);
  } else {
    runLoader();
  }
})();

/* ── Cookie Consent ──────────────────────────────────────────── */
(function () {
  if (localStorage.getItem('alcalspark-cookies')) return;

  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-labelledby', 'cookie-title');
  banner.innerHTML =
    '<div class="cookie-inner">' +
      '<div class="cookie-text">' +
        '<strong id="cookie-title">Cookies & Confidentialité</strong>' +
        '<p>Ce site utilise des cookies strictement nécessaires à son fonctionnement. Avec votre accord, nous pouvons analyser votre visite pour améliorer nos services. ' +
        '<a href="mentions-legales.html">En savoir plus</a></p>' +
      '</div>' +
      '<div class="cookie-actions">' +
        '<button class="cookie-btn cookie-refuse" id="cookie-refuse">Refuser</button>' +
        '<button class="cookie-btn cookie-accept" id="cookie-accept">Tout accepter</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(banner);

  requestAnimationFrame(function () {
    setTimeout(function () { banner.classList.add('show'); }, 900);
  });

  function dismiss(choice) {
    localStorage.setItem('alcalspark-cookies', choice);
    banner.classList.remove('show');
    setTimeout(function () { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 600);
  }

  document.getElementById('cookie-accept').addEventListener('click', function () { dismiss('accepted'); });
  document.getElementById('cookie-refuse').addEventListener('click', function () { dismiss('refused'); });
})();
