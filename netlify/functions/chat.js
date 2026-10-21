const fs = require('fs');
const path = require('path');
const { stream } = require('@netlify/functions');
const Anthropic = require('@anthropic-ai/sdk');
const { checkAndIncrement, LIMIT } = require('./utils/rate-limit');
const { buildSystemPrompt, languageContext } = require('./utils/build-prompt');
// JSON is inlined by esbuild at bundle time, so no extra included_files entry is needed.
const SITE_CONFIG = require('../../site.config.json');

const MAX_MESSAGE_LEN = 500;
const MAX_HISTORY_TURNS = 10; // 10 exchanges = up to 20 messages
const MAX_TOKENS = 500;
// Pinned snapshot by default; override with ANTHROPIC_MODEL in Netlify env
// vars to move to a newer Haiku snapshot without a code change.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = buildSystemPrompt(
  fs.readFileSync(path.join(__dirname, '../system-prompt.md'), 'utf-8'),
  SITE_CONFIG
);

/** 'fr' | 'en' : langue de la page du visiteur (envoyée par le frontend). */
function normalizeLang(raw) {
  return raw === 'en' ? 'en' : 'fr';
}

/** Message poli quand la limite horaire est atteinte (vouvoiement, temps d'attente indicatif). */
function rateLimitMessage(lang, resetAt) {
  const minutes = Math.max(1, Math.ceil((resetAt - Date.now()) / 60000));
  if (lang === 'en') {
    return `You have reached the limit of ${LIMIT} messages per hour. Please try again in about ${minutes} minute${minutes > 1 ? 's' : ''}, or write to Alex directly from the contact page: he replies within 24 hours.`;
  }
  return `Vous avez atteint la limite de ${LIMIT} messages par heure. Merci de réessayer dans environ ${minutes} minute${minutes > 1 ? 's' : ''}, ou d'écrire directement à Alex depuis la page contact : il répond sous 24 h.`;
}

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(data),
  };
}

function getClientIp(headers) {
  const nfIp = headers['x-nf-client-connection-ip'];
  if (nfIp) return nfIp;
  const forwarded = headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

/**
 * Never trust the client's history: cap length, cap per-message size,
 * drop malformed entries, and make sure the transcript still starts on
 * a `user` turn (Anthropic requires strict user/assistant alternation).
 */
function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const cleaned = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_LEN) }));
  const trimmed = cleaned.slice(-MAX_HISTORY_TURNS * 2);
  const firstUserIdx = trimmed.findIndex((m) => m.role === 'user');
  return firstUserIdx === -1 ? [] : trimmed.slice(firstUserIdx);
}

/**
 * POST { message: string, history: Array<{role, content}> }
 * -> text/event-stream of {type:'text',text} / {type:'done'} / {type:'error',message}
 *
 * Wrapped in @netlify/functions' `stream()` so the response body can be a
 * WHATWG ReadableStream, piped directly from the Anthropic SDK's message
 * stream -- no client-side Anthropic SDK, no buffering the full reply
 * before the browser sees anything.
 */
exports.handler = stream(async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Corps de requête JSON invalide.' });
  }

  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (!message) {
    return jsonResponse(400, { error: 'Le message est vide.' });
  }
  if (message.length > MAX_MESSAGE_LEN) {
    return jsonResponse(400, { error: `Le message dépasse la limite de ${MAX_MESSAGE_LEN} caractères.` });
  }

  const lang = normalizeLang(payload.lang);
  const history = sanitizeHistory(payload.history);
  const ip = getClientIp(event.headers || {});

  const rate = await checkAndIncrement(ip);
  if (!rate.allowed) {
    return jsonResponse(429, {
      error: rateLimitMessage(lang, rate.resetAt),
      resetAt: rate.resetAt,
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[chat] ANTHROPIC_API_KEY is not configured');
    return jsonResponse(500, { error: lang === 'en' ? 'The chat service is temporarily unavailable.' : 'Le service de chat est momentanément indisponible.' });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const encoder = new TextEncoder();

  const body = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // controller already closed (client disconnected) -- nothing to do
        }
      };

      let messageStream;
      try {
        messageStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT + languageContext(lang),
          messages: [...history, { role: 'user', content: message }],
        });

        messageStream.on('text', (delta) => send({ type: 'text', text: delta }));

        await messageStream.finalMessage();
        send({ type: 'done' });
      } catch (err) {
        console.error('[chat] Anthropic API error:', err);
        send({ type: 'error', message: lang === 'en' ? 'Something went wrong, please try again in a moment.' : "Une erreur est survenue, réessayez dans un instant." });
      } finally {
        controller.close();
      }
    },
    cancel() {
      // Browser navigated away / aborted -- nothing to clean up beyond
      // letting the in-flight Anthropic request finish server-side.
    },
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-RateLimit-Remaining': String(rate.remaining),
    },
    body,
  };
});
