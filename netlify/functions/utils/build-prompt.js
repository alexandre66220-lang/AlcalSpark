/**
 * Builds the SPARK system prompt from netlify/system-prompt.md.
 *
 * The prompt holds {{KEY}} tokens (prices, callback window, tax mention)
 * that are filled from site.config.json, the single source of truth also
 * used by scripts/apply-config.mjs for the HTML pages. The header HTML
 * comment (notes for editors) is removed before sending to the model.
 * <!--IF:KEY-->...<!--ENDIF:KEY--> blocks (not nested) are kept only when
 * the value is non-empty, same convention as scripts/apply-config.mjs.
 *
 * Throws on an unknown or empty token, so a bad config fails loudly at
 * cold start (and in scripts/check-prompt.mjs at build time) instead of
 * sending "{{PRIX_FIXE}}" to visitors.
 */
function buildSystemPrompt(template, config) {
  const filled = (key) => {
    const v = config[key];
    return !(v === undefined || v === null || v === false || v === 0 || String(v).trim() === '');
  };
  const body = template
    .replace(/^\s*<!--[\s\S]*?-->\s*/, '')
    .replace(/<!--IF:([A-Z0-9_]+)-->([\s\S]*?)<!--ENDIF:\1-->/g, (_m, key, inner) => (filled(key) ? inner : ''));
  const prompt = body.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_m, key) => {
    const value = config[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new Error(`system-prompt.md: token {{${key}}} is unknown or empty in site.config.json`);
    }
    return String(value);
  });
  return prompt;
}

module.exports = { buildSystemPrompt };
