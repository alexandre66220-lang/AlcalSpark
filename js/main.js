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

  function runLoader() {
    if (!loadingScreen) return;
    let pct = 0;
    const interval = setInterval(() => {
      pct += Math.random() * 18;
      if (pct >= 100) { pct = 100; clearInterval(interval); finishLoader(); }
      if (loadingBar)  loadingBar.style.width = pct + '%';
      if (loadingPct)  loadingPct.textContent = Math.round(pct) + '%';
    }, 120);
  }

  function finishLoader() {
    setTimeout(() => {
      if (loadingScreen) loadingScreen.classList.add('hidden');
      setTimeout(() => {
        if (loadingScreen) loadingScreen.remove();
        initPage();
      }, 800);
    }, 400);
  }

  /* ── Custom Cursor ───────────────────────────────────────── */
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');

  let mouseX = 0, mouseY = 0;
  let ringX  = 0, ringY  = 0;
  let ringAnimId;

  function initCursor() {
    if (!dot || !ring) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left  = mouseX + 'px';
      dot.style.top   = mouseY + 'px';
    });

    document.addEventListener('mousedown', () => document.body.classList.add('cursor-click'));
    document.addEventListener('mouseup',   () => document.body.classList.remove('cursor-click'));

    document.querySelectorAll('a, button, [data-hover]').forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    function animateRing() {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.left = ringX + 'px';
      ring.style.top  = ringY + 'px';
      ringAnimId = requestAnimationFrame(animateRing);
    }
    animateRing();
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

    setTimeout(() => { window.location.href = href; }, 700);
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
    const handleScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
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
      const words = el.textContent.trim().split(' ');
      el.innerHTML = words.map((w, i) =>
        `<span class="word-wrap" style="overflow:hidden;display:inline-block;vertical-align:bottom;"><span class="word" style="display:inline-block;transform:translateY(105%);transition:transform 0.8s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s;">${w}&nbsp;</span></span>`
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

  /* ── Init page ───────────────────────────────────────────── */
  function initPage() {
    initCursor();
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
