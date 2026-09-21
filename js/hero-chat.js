/* ─────────────────────────────────────────────────────────────
   Hero chat (SPARK) -- talks to netlify/functions/chat.js via
   POST /api/chat, streamed as a small custom SSE format
   ({type:'text'|'done'|'error'}).

   The reply renders in #hero-eye-speech, inside .hero-blobs -- the
   same visual container as the eye, whichever render layer is active
   (js/hero-eye-scene.js's Three.js scene on desktop, js/hero-eye-lite.js's
   CSS/SVG eye on mobile) -- so it reads as the eye speaking, not a
   chat widget next to it. This file IS the shared chat logic between
   desktop and mobile: it only ever talks to window.AlcalEye through
   the guarded eyeXxx() wrappers below, never assumes which
   implementation (or none) is behind them, and never branches on
   device except for the two mobile-specific UX details noted inline
   (auto-refocus, keyboard scroll-into-view).

   Reply lifecycle mirrors AlcalEye's: eyeStartReply() on submit,
   eyePulse(charDelta) per SSE text chunk (drives the core kick and
   the streaming-rate signal used for radar sweep speed on desktop),
   eyeEndReply() on the stream's last token (short-reply ring burst /
   long-reply wind-down + the deliberate end-of-turn blink).

   CTA: SPARK can end a reply with a [[CTA:Label]] marker (see
   netlify/system-prompt.md). It's stripped from the displayed text
   and rendered as a button instead -- see the "CTA" block below.
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

  var IS_DESKTOP = window.matchMedia('(min-width: 768px)').matches; // same breakpoint as hero-eye-loader.js/hero-eye-lite.js

  var MAX_LEN = 500;
  var MAX_TURNS = 10;
  var TYPE_INTERVAL_MS = 18; // base pace of the char-by-char reveal
  // Longer than any realistic [[CTA:Label]] marker (label is meant to
  // stay to 2-6 words). Text within this many characters of the raw
  // stream's current end is held back from the typewriter queue, so a
  // trailing marker can never partially flash on screen before being
  // detected and stripped at 'done'.
  var CTA_HOLD_BACK = 70;
  var CTA_RE = /\[\[CTA:([^\]]{1,60})\]\]\s*$/;

  var history = []; // [{role, content}, ...] sent to the API for context, not rendered
  var busy = false;

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

  function pushHistory(role, content) {
    history.push({ role: role, content: content });
    if (history.length > MAX_TURNS * 2) {
      history = history.slice(-MAX_TURNS * 2);
    }
  }

  function setBusy(state) {
    busy = state;
    input.disabled = state;
    sendBtn.disabled = state;
  }

  function showQuery(text) {
    speechQueryEl.textContent = 'REQUÊTE REÇUE > ' + text;
    speechRoot.classList.add('is-active');
  }

  /* ── CTA ───────────────────────────────────────────────────
     Rendered only once the full reply text is showing (never mid-
     stream), as a real button rather than plain text -- see
     CTA_RE/CTA_HOLD_BACK above for how it's kept out of the typed
     text. The link target is fixed to the site's existing contact
     page (the only CTA destination anywhere on the site); SPARK only
     supplies the label. */
  function showCTA(label) {
    if (!ctaEl) return;
    ctaEl.textContent = label;
    ctaEl.hidden = false;
  }
  function hideCTA() {
    if (ctaEl) ctaEl.hidden = true;
  }

  /* ── Char-by-char reveal ───────────────────────────────────
     SSE chunks land in `pending`; a ticker drains a few characters
     at a time into `shown`, so the text reads as typed rather than
     jumping in whatever burst sizes the network happened to deliver.
     Speeds up automatically if the backlog grows (fast bursts) so a
     long reply never visibly lags behind what has actually arrived. */
  var pending = '';
  var shown = '';
  var typerHandle = null;
  var isError = false;

  function renderReply(stillTyping) {
    speechReplyEl.textContent = shown;
    speechReplyEl.classList.toggle('is-typing', !!stillTyping);
    speechReplyEl.classList.toggle('hero-eye-speech-reply--error', isError);
    speechReplyEl.scrollTop = speechReplyEl.scrollHeight; // keep the latest text in view if it grows past max-height
  }

  function stopTyper() {
    if (typerHandle) { clearInterval(typerHandle); typerHandle = null; }
  }

  function startTyper() {
    if (typerHandle) return;
    typerHandle = setInterval(function () {
      if (!pending.length) { stopTyper(); return; }
      var take = pending.length > 40 ? 4 : pending.length > 12 ? 2 : 1;
      shown += pending.slice(0, take);
      pending = pending.slice(take);
      renderReply(true);
    }, TYPE_INTERVAL_MS);
  }

  function resetSpeech() {
    stopTyper();
    pending = '';
    shown = '';
    isError = false;
    speechReplyEl.textContent = '';
    speechReplyEl.classList.remove('is-typing', 'hero-eye-speech-reply--error');
    hideCTA();
  }

  function queueReplyChunk(text) {
    if (!text) return;
    pending += text;
    startTyper();
  }

  function showError(text) {
    stopTyper();
    pending = '';
    shown = text;
    isError = true;
    renderReply(false);
  }

  async function streamReply(message) {
    var res;
    try {
      res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message, history: history })
      });
    } catch (err) {
      showError("Impossible de contacter le système -- vérifie ta connexion.");
      eyeEndReply();
      return;
    }

    if (!res.ok || !res.body) {
      var errText = "Une erreur est survenue.";
      try {
        var errJson = await res.json();
        if (errJson && errJson.error) errText = errJson.error;
      } catch (e) { /* non-JSON error body, keep default message */ }
      showError(errText);
      eyeEndReply();
      return;
    }

    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';
    var replyText = '';   // full raw text, marker included, for the API history
    var queuedLen = 0;    // how much of replyText has been pushed into the typewriter so far
    var gotFirstToken = false;
    var sawDone = false;

    while (true) {
      var chunk;
      try {
        chunk = await reader.read();
      } catch (err) {
        break;
      }
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });

      var parts = buffer.split('\n\n');
      buffer = parts.pop(); // last part may be incomplete, keep for next read

      for (var i = 0; i < parts.length; i++) {
        var line = parts[i];
        if (!line.startsWith('data: ')) continue;
        var evt;
        try {
          evt = JSON.parse(line.slice(6));
        } catch (e) {
          continue;
        }

        if (evt.type === 'text') {
          if (!gotFirstToken) {
            gotFirstToken = true;
            setEyeState('speaking');
          }
          replyText += evt.text;
          // Hold back the tail: only queue text that's far enough
          // behind the live edge to be certain it isn't the start of
          // a still-forming [[CTA:...]] marker.
          var safeLen = Math.max(0, replyText.length - CTA_HOLD_BACK);
          if (safeLen > queuedLen) {
            queueReplyChunk(replyText.slice(queuedLen, safeLen));
            queuedLen = safeLen;
          }
          eyePulse(evt.text.length); // received-at-network-time, independent of the typewriter's own pace
        } else if (evt.type === 'error') {
          showError(evt.message || 'Une erreur est survenue.');
        } else if (evt.type === 'done') {
          sawDone = true;
          var ctaMatch = replyText.match(CTA_RE);
          var cleanText = ctaMatch ? replyText.slice(0, ctaMatch.index).replace(/\s+$/, '') : replyText;
          var remainder = cleanText.slice(queuedLen);
          if (remainder) { pending += remainder; queuedLen = cleanText.length; }
          stopTyper();
          shown += pending;
          pending = '';
          renderReply(false); // show the full (marker-stripped) text immediately -- the blink is the "end of reply" cue, not a lagging typewriter
          if (ctaMatch) showCTA(ctaMatch[1].trim());
          eyeEndReply();
        }
      }
    }

    if (!sawDone) eyeEndReply(); // stream cut short (network error mid-flight) -- still close out the turn visually
    if (replyText) pushHistory('assistant', replyText);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (busy) return;

    var message = input.value.trim();
    if (!message) return;
    if (message.length > MAX_LEN) {
      showQuery(message);
      resetSpeech();
      showError('Message trop long (500 caractères max).');
      return;
    }

    showQuery(message);
    resetSpeech();
    pushHistory('user', message);
    input.value = '';
    setBusy(true);
    eyeStartReply();
    setEyeState('thinking');

    try {
      await streamReply(message);
    } finally {
      setBusy(false);
      setEyeState(document.activeElement === input ? 'listening' : 'idle');
      // Auto-refocus is a desktop nicety (keyboard-driven follow-ups).
      // On mobile it would reopen the virtual keyboard right after the
      // reply lands -- the exact "parasitic" jump this widget needs to
      // avoid -- so the visitor decides when to tap back in instead.
      if (IS_DESKTOP) input.focus();
    }
  });

  input.addEventListener('focus', function () {
    if (!busy) setEyeState('listening');
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
  input.addEventListener('blur', function () { if (!busy) setEyeState('idle'); });
})();
