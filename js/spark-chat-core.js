/* ─────────────────────────────────────────────────────────────
   SPARK chat -- shared session core.

   Single source of truth for talking to POST /api/chat (streamed as
   a small custom SSE format: {type:'text'|'done'|'error'}), the
   conversation history sent back for context, and the [[CTA:Label]]
   marker parsing/stripping. No DOM, no rendering, no eye/visual hooks
   in here -- those stay in each renderer (js/hero-chat.js for the
   hero, js/spark-widget.js for the persistent mini-widget) so this
   file can be the one place that logic exists, per the "no
   duplication" brief, without coupling it to any one UI's markup.

   One session per page load (getSession() memoizes), so every
   renderer mounted on the page drives and observes the exact same
   ongoing conversation: only one flow can ever be in-flight at once
   (the `busy` guard is shared), and a renderer that mounts later
   still has the conversation's history for the API context.

   Renderers subscribe via session.on(event, fn):
     'query'  (message)                     -- a message was accepted for sending (even if too long)
     'reset'  ()                             -- clear whatever the previous turn's reply looked like
     'busy'   (bool)                         -- disable/enable input while a request is in flight
     'start'  ()                             -- network request is starting (post-validation)
     'firstToken' ()                         -- first text chunk of the reply arrived
     'chunk'  ({safeText, rawLen})           -- safeText is ready to reveal (CTA-marker-safe tail already held back); rawLen is the raw arrived-chunk length, for pulse/kick animations
     'cta'    (label)                        -- reply ended with a [[CTA:Label]] marker
     'done'   ({remainder})                  -- reply finished normally; remainder is the last CTA-safe slice to flush into the typewriter
     'error'  (text)                         -- show this as the reply (network failure, bad response, mid-stream error, or the local "message too long" rejection)
     'end'    ()                             -- the whole turn is over (success or failure) and `busy` is already back to false -- the right moment for an end-of-reply blink/refocus
───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var MAX_LEN = 500;
  var MAX_TURNS = 10;
  // Longer than any realistic [[CTA:Label]] marker (label is meant to
  // stay to 2-6 words). Text within this many characters of the raw
  // stream's current end is held back from `chunk`, so a trailing
  // marker can never partially reach a renderer before being detected
  // and stripped at 'done'.
  var CTA_HOLD_BACK = 70;
  var CTA_RE = /\[\[CTA:([^\]]{1,60})\]\]\s*$/;

  var session = null; // singleton, see getSession()

  /* ── Shared char-by-char reveal helper ────────────────────────
     Small enough that both renderers reusing the exact same drain
     algorithm (rather than each re-implementing it) is worth a tiny
     shared utility, even though it touches the DOM only through the
     caller-supplied onTick. */
  function createTypewriter(intervalMs, onTick) {
    var pending = '';
    var shown = '';
    var handle = null;

    function stop() { if (handle) { clearInterval(handle); handle = null; } }
    function drain() {
      if (!pending.length) { stop(); return; }
      var take = pending.length > 40 ? 4 : pending.length > 12 ? 2 : 1;
      shown += pending.slice(0, take);
      pending = pending.slice(take);
      onTick(shown, true, false);
    }

    return {
      push: function (text) {
        if (!text) return;
        pending += text;
        if (!handle) handle = setInterval(drain, intervalMs);
      },
      // Flushes any remaining pending text plus an optional final
      // remainder straight through (no more typing left to do).
      finish: function (remainder) {
        stop();
        shown += pending + (remainder || '');
        pending = '';
        onTick(shown, false, false);
      },
      setError: function (text) {
        stop();
        pending = '';
        shown = text;
        onTick(shown, false, true);
      },
      reset: function () {
        stop();
        pending = '';
        shown = '';
      },
      getShown: function () { return shown; }
    };
  }

  function createSession() {
    var history = []; // [{role, content}, ...] sent to the API for context, not rendered directly
    var busy = false;
    var listeners = {};

    function on(evt, fn) {
      (listeners[evt] = listeners[evt] || []).push(fn);
      return function off() {
        var arr = listeners[evt];
        if (!arr) return;
        var i = arr.indexOf(fn);
        if (i !== -1) arr.splice(i, 1);
      };
    }
    function emit(evt, payload) {
      var arr = listeners[evt];
      if (!arr || !arr.length) return;
      arr.slice().forEach(function (fn) {
        try { fn(payload); } catch (err) { console.error('[spark-chat] listener error for "' + evt + '":', err); }
      });
    }

    function pushHistory(role, content) {
      history.push({ role: role, content: content });
      if (history.length > MAX_TURNS * 2) history.splice(0, history.length - MAX_TURNS * 2);
    }

    function setBusy(v) {
      busy = v;
      emit('busy', v);
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
        emit('error', "Impossible de contacter le système -- vérifie ta connexion.");
        return;
      }

      if (!res.ok || !res.body) {
        var errText = "Une erreur est survenue.";
        try {
          var errJson = await res.json();
          if (errJson && errJson.error) errText = errJson.error;
        } catch (e) { /* non-JSON error body, keep default message */ }
        emit('error', errText);
        return;
      }

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      var replyText = '';   // full raw text, marker included, for the API history
      var queuedLen = 0;    // how much of replyText has already been emitted via 'chunk'
      var gotFirstToken = false;

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
            if (!gotFirstToken) { gotFirstToken = true; emit('firstToken'); }
            replyText += evt.text;
            // Hold back the tail: only emit text far enough behind the
            // live edge to be certain it isn't the start of a still-
            // forming [[CTA:...]] marker.
            var safeLen = Math.max(0, replyText.length - CTA_HOLD_BACK);
            if (safeLen > queuedLen) {
              emit('chunk', { safeText: replyText.slice(queuedLen, safeLen), rawLen: evt.text.length });
              queuedLen = safeLen;
            } else {
              emit('chunk', { safeText: '', rawLen: evt.text.length });
            }
          } else if (evt.type === 'error') {
            emit('error', evt.message || 'Une erreur est survenue.');
          } else if (evt.type === 'done') {
            var ctaMatch = replyText.match(CTA_RE);
            var cleanText = ctaMatch ? replyText.slice(0, ctaMatch.index).replace(/\s+$/, '') : replyText;
            var remainder = cleanText.slice(queuedLen);
            queuedLen = cleanText.length;
            emit('done', { remainder: remainder });
            if (ctaMatch) emit('cta', ctaMatch[1].trim());
          }
        }
      }

      if (replyText) pushHistory('assistant', replyText);
    }

    /* Returns a status string rather than throwing/booling, so a caller
       can decide UI details (like whether to clear its input) from one
       awaited value: 'sent' | 'too_long' | 'busy' | 'empty'. */
    async function send(message) {
      message = (typeof message === 'string' ? message : '').trim();
      if (!message) return 'empty';
      if (busy) return 'busy';

      emit('query', message);

      if (message.length > MAX_LEN) {
        emit('reset');
        emit('error', 'Message trop long (500 caractères max).');
        return 'too_long';
      }

      emit('reset');
      pushHistory('user', message);
      setBusy(true);
      emit('start');
      try {
        await streamReply(message);
      } finally {
        // 'busy':false is guaranteed to reach listeners before 'end' --
        // renderers that re-enable input/focus it in their 'end' handler
        // rely on that ordering.
        setBusy(false);
        emit('end');
      }
      return 'sent';
    }

    return {
      history: history,
      isBusy: function () { return busy; },
      send: send,
      on: on
    };
  }

  window.SparkChat = {
    getSession: function () {
      if (!session) session = createSession();
      return session;
    },
    createTypewriter: createTypewriter,
    MAX_LEN: MAX_LEN
  };
})();
