/* ─────────────────────────────────────────────────────────────
   SPARK persistent mini-widget.

   Present on every page (injected by js/main.js's site-wide loader,
   near the end of this file), not just the homepage hero: a small
   CSS/SVG eye icon fixed in the bottom-right corner that opens a
   floating chat panel on click. Deliberately NOT a Three.js/WebGL
   instance -- same "cheap on any device" reasoning as
   js/hero-eye-lite.js, since this one stays mounted on every page
   rather than a single hero section.

   Drives the exact same shared session as js/hero-chat.js (see
   js/spark-chat-core.js) -- a conversation started in the hero is
   still there if the visitor opens this widget afterward, and the
   session's own busy-guard means only one of the two can have a
   request in flight at a time.

   On the homepage the widget stays hidden while the hero itself is
   in view (the full/lite eye there already gives access to SPARK)
   and fades in once the visitor scrolls past it; on every other page
   it's visible from load. Both transitions are CSS, never an
   instant cut.
───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  if (document.getElementById('spark-widget')) return; // already injected
  if (!window.SparkChat) return; // core module missing/failed to load -- nothing to drive

  var IS_DESKTOP = window.matchMedia('(min-width: 768px)').matches; // same breakpoint used across the hero eye/chat files
  var IS_EN = document.documentElement.lang === 'en';
  var TYPE_INTERVAL_MS = 16;

  var STR = IS_EN ? {
    openLabel: 'Open the SPARK assistant',
    closeLabel: 'Close the SPARK assistant',
    closeBtn: 'Close',
    send: 'Send',
    placeholder: 'Ask about ALCALSPARK',
    hint: 'ALCALSPARK system -- services, pricing, portfolio, contact.',
    contactHref: '/en/contact.html'
  } : {
    openLabel: "Ouvrir l'assistant SPARK",
    closeLabel: "Fermer l'assistant SPARK",
    closeBtn: 'Fermer',
    send: 'Envoyer',
    placeholder: 'Une question sur ALCALSPARK ?',
    hint: 'Système ALCALSPARK -- services, tarifs, portfolio, contact.',
    contactHref: '/contact.html'
  };

  /* ── DOM ───────────────────────────────────────────────────── */
  var wrap = document.createElement('div');
  wrap.className = 'spark-widget';
  wrap.id = 'spark-widget';

  wrap.innerHTML =
    '<button type="button" class="spark-widget-btn" id="spark-widget-btn" aria-haspopup="dialog" aria-expanded="false" aria-controls="spark-widget-panel" aria-label="' + STR.openLabel + '">' +
      '<svg class="spark-widget-eye" viewBox="0 0 100 100" aria-hidden="true">' +
        '<circle class="sw-ring sw-ring--outer" cx="50" cy="50" r="42"></circle>' +
        '<circle class="sw-ring sw-ring--mid" cx="50" cy="50" r="30"></circle>' +
        '<circle class="sw-pupil" id="spark-widget-pupil" cx="50" cy="50" r="10"></circle>' +
      '</svg>' +
    '</button>' +
    '<div class="spark-widget-panel" id="spark-widget-panel" role="dialog" aria-modal="false" aria-label="SPARK" hidden>' +
      '<div class="spark-widget-panel-header">' +
        '<span class="spark-widget-panel-title">SPARK</span>' +
        '<button type="button" class="spark-widget-close" id="spark-widget-close" aria-label="' + STR.closeBtn + '">&times;</button>' +
      '</div>' +
      '<div class="spark-widget-transcript" id="spark-widget-transcript" aria-live="polite"></div>' +
      '<form class="spark-widget-form" id="spark-widget-form">' +
        '<span class="spark-widget-prompt" aria-hidden="true">&gt;</span>' +
        '<input type="text" id="spark-widget-input" class="spark-widget-input" placeholder="' + STR.placeholder + '" maxlength="500" autocomplete="off" />' +
        '<button type="submit" id="spark-widget-send" class="spark-widget-send" aria-label="' + STR.send + '">&rarr;</button>' +
      '</form>' +
      '<p class="spark-widget-hint">' + STR.hint + '</p>' +
    '</div>';

  document.body.appendChild(wrap);

  var btn = document.getElementById('spark-widget-btn');
  var panel = document.getElementById('spark-widget-panel');
  var closeBtn = document.getElementById('spark-widget-close');
  var transcriptEl = document.getElementById('spark-widget-transcript');
  var form = document.getElementById('spark-widget-form');
  var input = document.getElementById('spark-widget-input');
  var sendBtn = document.getElementById('spark-widget-send');
  var pupil = document.getElementById('spark-widget-pupil');

  var PANEL_TRANSITION_MS = 240; // keep in sync with css/spark-widget.css

  // .spark-widget is both position:fixed AND transitions its own
  // `transform` (for the show/hide animation) -- that combination makes
  // Chromium treat .focus() on any descendant as needing to scroll the
  // page to "reveal" an element that's already fully on-screen. A plain
  // .focus() here would jerk the whole page toward the top every time
  // the panel opens/closes.
  function focusNoScroll(el) {
    el.focus({ preventScroll: true });
  }

  /* ── Mini eye reactions ───────────────────────────────────────
     Deliberately not the full idle/listening/thinking/speaking
     state machine window.AlcalEye implements -- just enough to read
     as "alive" and "replying", cheap CSS classes only. Never touches
     window.AlcalEye itself: that global belongs to whichever hero eye
     implementation is on this page (Three.js or the lite SVG one),
     and this widget is a fully separate element. */
  function retrigger(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }
  function setBusyVisual(isBusy) {
    wrap.classList.toggle('is-busy', !!isBusy);
  }
  function kickPupil() {
    retrigger(pupil, 'is-kicked');
  }
  var flashTimeout = null;
  function flashEye() {
    retrigger(wrap, 'is-flash');
    if (flashTimeout) clearTimeout(flashTimeout);
    flashTimeout = setTimeout(function () { wrap.classList.remove('is-flash'); }, 420);
  }

  /* ── Visibility (hero-gated on the homepage, immediate elsewhere) ── */
  var hero = document.getElementById('hero');

  function setVisible(visible) {
    if (visible) {
      wrap.classList.remove('is-hidden');
    } else {
      wrap.classList.add('is-hidden');
      closePanel({ silent: true });
    }
  }

  if (hero) {
    wrap.classList.add('is-hidden'); // starts hidden -- the hero's own eye covers SPARK access up there
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          setVisible(!entry.isIntersecting);
        });
      }, { threshold: 0, rootMargin: '-10% 0px -10% 0px' });
      io.observe(hero);
    } else {
      setVisible(true); // no IntersectionObserver support -- fail open rather than permanently hidden
    }
  } else {
    // No hero on this page: visible from load, but still fades in
    // rather than appearing instantly (double rAF so the "start
    // hidden" state actually paints before the transition begins --
    // same pattern as main.js's initHeroReveal()).
    wrap.classList.add('is-hidden');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        wrap.classList.remove('is-hidden');
      });
    });
  }

  /* ── Panel open/close ─────────────────────────────────────────
     `hidden` stays off the DOM node the whole time it's visually
     open/closing so the CSS transition can run; it's only set once
     the close transition has actually finished, keeping the panel
     out of the tab order and screen-reader tree while shut. */
  var panelOpen = false;
  var closeHideTimeout = null;

  function openPanel() {
    if (panelOpen) return;
    panelOpen = true;
    if (closeHideTimeout) { clearTimeout(closeHideTimeout); closeHideTimeout = null; }
    panel.hidden = false;
    void panel.offsetWidth; // force reflow so removing `hidden` and adding `is-open` don't collapse into one un-transitioned paint
    wrap.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', STR.closeLabel);
    if (IS_DESKTOP) focusNoScroll(input);
    document.addEventListener('pointerdown', onOutsidePointer, true);
    document.addEventListener('keydown', onKeydown, true);
  }

  function closePanel(opts) {
    if (!panelOpen) return;
    panelOpen = false;
    wrap.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', STR.openLabel);
    document.removeEventListener('pointerdown', onOutsidePointer, true);
    document.removeEventListener('keydown', onKeydown, true);
    if (!(opts && opts.silent)) focusNoScroll(btn);
    closeHideTimeout = setTimeout(function () { panel.hidden = true; }, PANEL_TRANSITION_MS);
  }

  function togglePanel() {
    if (panelOpen) closePanel(); else openPanel();
  }

  function onOutsidePointer(e) {
    if (wrap.contains(e.target)) return;
    closePanel();
  }
  function onKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') closePanel();
  }

  btn.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', function () { closePanel(); });

  /* ── Transcript + session wiring ──────────────────────────────
     Each turn gets its own message pair appended to the scrollback
     (unlike the hero's single reply bubble that gets overwritten
     each turn) -- reopening the panel later still shows everything
     said so far this page session. */
  function scrollToBottom() {
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }

  function appendUserMsg(text) {
    var el = document.createElement('div');
    el.className = 'spark-widget-msg spark-widget-msg--user';
    el.textContent = text;
    transcriptEl.appendChild(el);
    scrollToBottom();
  }

  function appendAssistantMsg() {
    var wrapEl = document.createElement('div');
    wrapEl.className = 'spark-widget-msg spark-widget-msg--assistant';
    var textEl = document.createElement('span');
    textEl.className = 'spark-widget-msg-text';
    var ctaEl = document.createElement('a');
    ctaEl.className = 'spark-widget-msg-cta';
    ctaEl.href = STR.contactHref;
    ctaEl.hidden = true;
    wrapEl.appendChild(textEl);
    wrapEl.appendChild(ctaEl);
    transcriptEl.appendChild(wrapEl);
    scrollToBottom();
    return { textEl: textEl, ctaEl: ctaEl };
  }

  var session = window.SparkChat.getSession();
  var currentTurn = null; // {textEl, ctaEl, typer} for the in-flight reply, set on 'reset'

  session.on('query', function (text) {
    appendUserMsg(text);
  });

  session.on('reset', function () {
    var parts = appendAssistantMsg();
    var typer = window.SparkChat.createTypewriter(TYPE_INTERVAL_MS, function (shown, stillTyping, isError) {
      parts.textEl.textContent = shown;
      parts.textEl.classList.toggle('is-typing', !!stillTyping);
      parts.textEl.classList.toggle('spark-widget-msg-text--error', !!isError);
      scrollToBottom();
    });
    currentTurn = { textEl: parts.textEl, ctaEl: parts.ctaEl, typer: typer };
  });

  session.on('busy', function (isBusy) {
    input.disabled = isBusy;
    sendBtn.disabled = isBusy;
    setBusyVisual(isBusy);
  });

  session.on('firstToken', function () {
    // nothing hero-specific to do here -- the mini eye already shows
    // "busy" the moment the request started, no separate "speaking"
    // visual at this scale.
  });

  session.on('chunk', function (payload) {
    if (currentTurn) currentTurn.typer.push(payload.safeText);
    kickPupil();
  });

  session.on('cta', function (label) {
    if (!currentTurn) return;
    currentTurn.ctaEl.textContent = label;
    currentTurn.ctaEl.hidden = false;
  });

  session.on('done', function (payload) {
    if (currentTurn) currentTurn.typer.finish(payload.remainder);
  });

  session.on('error', function (text) {
    if (currentTurn) currentTurn.typer.setError(text);
  });

  session.on('end', function () {
    flashEye();
    currentTurn = null;
    if (panelOpen && IS_DESKTOP) focusNoScroll(input);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var message = input.value;
    session.send(message).then(function (status) {
      if (status === 'sent') input.value = '';
    });
  });
})();
