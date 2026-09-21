/* ─────────────────────────────────────────────────────────────
   Hero chat (SPARK) -- renders the hero's own reply overlay and
   input row, driven by js/spark-chat-core.js (the shared session:
   network call to /api/chat, conversation history, busy-guard,
   [[CTA:Label]] parsing). This file owns only hero-specific
   presentation: the char-by-char reveal into #hero-eye-speech, the
   window.AlcalEye hooks (Three.js scene on desktop, js/hero-eye-lite.js's
   CSS/SVG eye on mobile -- same window.AlcalEye API either way, no
   branching needed here), and the two mobile-specific UX details
   noted inline (auto-refocus, keyboard scroll-into-view).

   js/spark-widget.js (the persistent mini-widget, present on every
   page) drives the exact same shared session -- so a conversation
   started here is still there if the visitor later opens the
   widget, and the session's own busy-guard means only one of the two
   can have a request in flight at a time.
───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var root = document.getElementById('hero-chat');
  if (!root) return;

  var form = document.getElementById('hero-chat-form');
  var input = document.getElementById('hero-chat-input');
  var sendBtn = document.getElementById('hero-chat-send');
  var speechRoot = document.getElementById('hero-eye-speech');
  var speechQueryEl = document.getElementById('hero-eye-speech-query');
  var speechReplyEl = document.getElementById('hero-eye-speech-reply');
  var ctaEl = document.getElementById('hero-eye-cta');
  if (!form || !input || !speechRoot || !speechQueryEl || !speechReplyEl) return;
  if (!window.SparkChat) return; // core module missing/failed to load -- no chat without it

  var IS_DESKTOP = window.matchMedia('(min-width: 768px)').matches; // same breakpoint as hero-eye-loader.js/hero-eye-lite.js

  var TYPE_INTERVAL_MS = 18; // base pace of the char-by-char reveal

  var session = window.SparkChat.getSession();

  function setEyeState(mode) {
    if (window.AlcalEye && typeof window.AlcalEye.setState === 'function') {
      window.AlcalEye.setState(mode);
    }
  }
  function eyeStartReply() {
    if (window.AlcalEye && typeof window.AlcalEye.startReply === 'function') {
      window.AlcalEye.startReply();
    }
  }
  function eyePulse(charDelta) {
    if (window.AlcalEye && typeof window.AlcalEye.pulse === 'function') {
      window.AlcalEye.pulse(charDelta);
    }
  }
  function eyeEndReply() {
    if (window.AlcalEye && typeof window.AlcalEye.endReply === 'function') {
      window.AlcalEye.endReply();
    }
  }

  function showQuery(text) {
    speechQueryEl.textContent = 'REQUÊTE REÇUE > ' + text;
    speechRoot.classList.add('is-active');
  }

  /* ── CTA ───────────────────────────────────────────────────
     Rendered only once the full reply text is showing (never mid-
     stream), as a real button rather than plain text. The link
     target is fixed to the site's existing contact page (the only
     CTA destination anywhere on the site); SPARK only supplies the
     label. */
  function showCTA(label) {
    if (!ctaEl) return;
    ctaEl.textContent = label;
    ctaEl.hidden = false;
  }
  function hideCTA() {
    if (ctaEl) ctaEl.hidden = true;
  }

  var typer = window.SparkChat.createTypewriter(TYPE_INTERVAL_MS, function (shown, stillTyping, isError) {
    speechReplyEl.textContent = shown;
    speechReplyEl.classList.toggle('is-typing', !!stillTyping);
    speechReplyEl.classList.toggle('hero-eye-speech-reply--error', !!isError);
    speechReplyEl.scrollTop = speechReplyEl.scrollHeight; // keep the latest text in view if it grows past max-height
  });

  // js/spark-widget.js (the persistent mini-widget, present alongside
  // this on the homepage once scrolled past the hero) drives the exact
  // same shared session, so 'query'/'chunk'/'done'/etc. fire for turns
  // that started in the widget too -- not just this form. The hero's
  // reply bubble should only react to a turn it actually started; the
  // widget's own scrollback is the one place a turn started elsewhere
  // is meant to show up. Without this guard, a widget-initiated reply
  // would silently re-render into the (possibly off-screen) hero
  // bubble too, and its desktop auto-refocus below would drag the
  // page back up to the hero out from under a visitor scrolled well
  // past it. `busy` is deliberately NOT gated by this -- disabling
  // this form's input/send button while *any* turn is in flight,
  // hero- or widget-started, is exactly the single-flow guarantee
  // both renderers rely on.
  var heroOwnsCurrentTurn = false;

  session.on('query', function (text) {
    if (!heroOwnsCurrentTurn) return;
    showQuery(text);
  });

  session.on('reset', function () {
    if (!heroOwnsCurrentTurn) return;
    typer.reset();
    speechReplyEl.textContent = '';
    speechReplyEl.classList.remove('is-typing', 'hero-eye-speech-reply--error');
    hideCTA();
  });

  session.on('busy', function (isBusy) {
    input.disabled = isBusy;
    sendBtn.disabled = isBusy;
  });

  session.on('start', function () {
    if (!heroOwnsCurrentTurn) return;
    eyeStartReply();
    setEyeState('thinking');
  });

  session.on('firstToken', function () {
    if (!heroOwnsCurrentTurn) return;
    setEyeState('speaking');
  });

  session.on('chunk', function (payload) {
    if (!heroOwnsCurrentTurn) return;
    typer.push(payload.safeText);
    eyePulse(payload.rawLen); // received-at-network-time, independent of the typewriter's own pace
  });

  session.on('cta', function (label) {
    if (!heroOwnsCurrentTurn) return;
    showCTA(label);
  });

  session.on('done', function (payload) {
    if (!heroOwnsCurrentTurn) return;
    typer.finish(payload.remainder); // show the full (marker-stripped) text immediately -- the blink is the "end of reply" cue, not a lagging typewriter
  });

  session.on('error', function (text) {
    if (!heroOwnsCurrentTurn) return;
    typer.setError(text);
  });

  session.on('end', function () {
    if (!heroOwnsCurrentTurn) return;
    heroOwnsCurrentTurn = false;
    eyeEndReply();
    setEyeState(document.activeElement === input ? 'listening' : 'idle');
    // Auto-refocus is a desktop nicety (keyboard-driven follow-ups).
    // On mobile it would reopen the virtual keyboard right after the
    // reply lands -- the exact "parasitic" jump this widget needs to
    // avoid -- so the visitor decides when to tap back in instead.
    if (IS_DESKTOP) input.focus();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var message = input.value;
    heroOwnsCurrentTurn = true;
    session.send(message).then(function (status) {
      if (status === 'sent') input.value = '';
      else if (status !== 'sent') heroOwnsCurrentTurn = false; // 'busy'/'empty'/'too_long' never emit 'end' to clear the flag themselves
    });
  });

  input.addEventListener('focus', function () {
    if (!session.isBusy()) setEyeState('listening');
    if (!IS_DESKTOP) {
      // Some mobile browsers don't reliably scroll a focused input
      // clear of the virtual keyboard on their own inside a flex
      // layout; nudge it into view after the keyboard's own resize
      // has settled.
      setTimeout(function () {
        input.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 300);
    }
  });
  input.addEventListener('blur', function () { if (!session.isBusy()) setEyeState('idle'); });
})();
