/* ─────────────────────────────────────────────────────────────
   Hero chat ("Jarvis") -- talks to netlify/functions/chat.js via
   POST /api/chat, streamed as a small custom SSE format
   ({type:'text'|'done'|'error'}). Loads on every device (unlike
   the 3D eye, this is real functionality, not decorative), and
   drives window.AlcalEye when it exists (desktop only) -- every
   call is guarded so this file works standalone on mobile.
───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var root = document.getElementById('hero-chat');
  if (!root) return;

  var form = document.getElementById('hero-chat-form');
  var input = document.getElementById('hero-chat-input');
  var sendBtn = document.getElementById('hero-chat-send');
  var log = document.getElementById('hero-chat-log');
  if (!form || !input || !log) return;

  var MAX_LEN = 500;
  var MAX_TURNS = 10;
  var history = []; // [{role, content}, ...] mirrors what the server accepts
  var busy = false;

  function setEyeState(mode) {
    if (window.AlcalEye && typeof window.AlcalEye.setState === 'function') {
      window.AlcalEye.setState(mode);
    }
  }
  function eyePulse() {
    if (window.AlcalEye && typeof window.AlcalEye.pulse === 'function') {
      window.AlcalEye.pulse();
    }
  }

  function addMessage(role, text) {
    var msg = document.createElement('div');
    msg.className = 'hero-chat-msg hero-chat-msg--' + role;
    var roleLabel = document.createElement('span');
    roleLabel.className = 'hero-chat-msg-role';
    roleLabel.textContent = role === 'user' ? 'vous' : role === 'error' ? 'erreur' : 'système';
    var body = document.createElement('span');
    body.className = 'hero-chat-msg-body';
    body.textContent = text;
    msg.appendChild(roleLabel);
    msg.appendChild(document.createElement('br'));
    msg.appendChild(body);
    log.appendChild(msg);
    root.classList.add('has-log');
    log.scrollTop = log.scrollHeight;
    return body;
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

  async function streamReply(message) {
    var res;
    try {
      res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message, history: history })
      });
    } catch (err) {
      addMessage('error', "Impossible de contacter le système -- vérifie ta connexion.");
      return;
    }

    if (!res.ok || !res.body) {
      var errText = "Une erreur est survenue.";
      try {
        var errJson = await res.json();
        if (errJson && errJson.error) errText = errJson.error;
      } catch (e) { /* non-JSON error body, keep default message */ }
      addMessage('error', errText);
      return;
    }

    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';
    var replyEl = null;
    var replyText = '';
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
          if (!gotFirstToken) {
            gotFirstToken = true;
            setEyeState('speaking');
            replyEl = addMessage('assistant', '');
          }
          replyText += evt.text;
          replyEl.textContent = replyText;
          log.scrollTop = log.scrollHeight;
          eyePulse();
        } else if (evt.type === 'error') {
          addMessage('error', evt.message || 'Une erreur est survenue.');
        } else if (evt.type === 'done') {
          // handled after the loop
        }
      }
    }

    if (replyText) pushHistory('assistant', replyText);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (busy) return;

    var message = input.value.trim();
    if (!message) return;
    if (message.length > MAX_LEN) {
      addMessage('error', 'Message trop long (500 caractères max).');
      return;
    }

    addMessage('user', message);
    pushHistory('user', message);
    input.value = '';
    setBusy(true);
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
