const { getStore } = require('@netlify/blobs');

const WINDOW_MS = 60 * 60 * 1000; // 1h
const LIMIT = 15;
const STORE_NAME = 'chat-rate-limit';

/**
 * Per-IP request counter with a 1h sliding-reset window, stored in
 * Netlify Blobs. Uses etag-based conditional writes (onlyIfMatch /
 * onlyIfNew) to avoid two concurrent requests from the same IP both
 * reading count=N and both writing count=N+1. Netlify Blobs has no
 * native TTL, so expiry is handled here: a record past its `resetAt`
 * is treated as absent and the window restarts.
 *
 * Fails open on any Blobs error (read or write) -- a rate limiter
 * outage should never take the whole chat feature down with it.
 */
async function checkAndIncrement(ip) {
  const key = ip || 'unknown';
  const now = Date.now();
  const store = getStore(STORE_NAME);

  for (let attempt = 0; attempt < 2; attempt++) {
    let existing = null;
    try {
      existing = await store.getWithMetadata(key, { type: 'json' });
    } catch (err) {
      console.error('[chat] rate-limit read failed, allowing request:', err);
      return { allowed: true, remaining: LIMIT, resetAt: now + WINDOW_MS, limit: LIMIT };
    }

    const prior = existing && existing.data;
    const etag = existing && existing.etag;
    const expired = !prior || now > prior.resetAt;

    if (!expired && prior.count >= LIMIT) {
      return { allowed: false, remaining: 0, resetAt: prior.resetAt, limit: LIMIT };
    }

    const record = expired
      ? { count: 1, resetAt: now + WINDOW_MS }
      : { count: prior.count + 1, resetAt: prior.resetAt };

    try {
      const writeOptions = etag ? { onlyIfMatch: etag } : { onlyIfNew: true };
      const result = await store.setJSON(key, record, writeOptions);
      if (result.modified === false) continue; // lost a race, retry once
      return { allowed: true, remaining: Math.max(0, LIMIT - record.count), resetAt: record.resetAt, limit: LIMIT };
    } catch (err) {
      console.error('[chat] rate-limit write failed, allowing request:', err);
      return { allowed: true, remaining: Math.max(0, LIMIT - record.count), resetAt: record.resetAt, limit: LIMIT };
    }
  }

  // Two retries both lost the race -- fail open rather than block a real visitor.
  return { allowed: true, remaining: 0, resetAt: now + WINDOW_MS, limit: LIMIT };
}

module.exports = { checkAndIncrement, LIMIT, WINDOW_MS };
