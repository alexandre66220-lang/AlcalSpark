/* ─────────────────────────────────────────────────────────────
   Hero chat ("Jarvis") -- talks to netlify/functions/chat.js via
   POST /api/chat, streamed as a small custom SSE format
   ({type:'text'|'done'|'error'}).

   The reply renders in #hero-eye-speech, inside .hero-blobs -- the
   same visual container as the 3D eye (js/hero-eye-scene.js) -- so it
   reads as the eye speaking, not a chat widget next to it. That
   overlay and its char-by-char reveal work standalone on mobile too
   (no 3D scene there); every window.AlcalEye call is guarded so this
   file never depends on the scene existing.

   Reply lifecycle mirrors AlcalEye's: eyeStartReply() on submit,
   eyePulse(charDelta) per SSE text chunk (drives the core kick and
   the streaming-rate signal the scene uses for glitch/radar speed),
   eyeEndReply() on the stream's last token (short-reply ring burst /
   long-reply wind-down + the deliberate end-of-turn blink).
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
  if (!form || !input || !speechRoot || !speechQueryEl || !speechReplyEl) return;

  var MAX_LEN = 500;
  var MAX_TURNS = 10;
  var TYPE_INTERVAL_MS = 18; // base pace of the char-by-char reveal
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
  }

  function queueReplyChunk(text) {
    pending += text;
    startTyper();
  }

  function flushReply() {
    shown += pending;
    pending = '';
    stopTyper();
    renderReply(false);
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
    var replyText = '';
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
          queueReplyChunk(evt.text);
          eyePulse(evt.text.length); // received-at-network-time, independent of the typewriter's own pace
        } else if (evt.type === 'error') {
          showError(evt.message || 'Une erreur est survenue.');
        } else if (evt.type === 'done') {
          sawDone = true;
          flushReply(); // show the full text immediately -- the blink is the "end of reply" cue, not a lagging typewriter
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
      input.focus();
    }
  });

  input.addEventListener('focus', function () { if (!busy) setEyeState('listening'); });
  input.addEventListener('blur', function () { if (!busy) setEyeState('idle'); });
})();
