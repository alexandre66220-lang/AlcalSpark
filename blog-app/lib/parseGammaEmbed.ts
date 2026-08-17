const IFRAME_SRC_RE = /<iframe[^>]*\ssrc=["']([^"']+)["'][^>]*>/i;
const ALLOWED_HOSTS = ["gamma.app"];

/**
 * Extracts and validates the iframe src from a pasted Gamma embed snippet.
 * We never render the pasted HTML directly (dangerouslySetInnerHTML on
 * arbitrary CMS text) - only a same-origin-checked URL reaches the DOM.
 */
export function extractGammaEmbedSrc(rawEmbed: string): string | null {
  const match = rawEmbed.match(IFRAME_SRC_RE);
  if (!match) return null;

  try {
    const url = new URL(match[1]);
    if (url.protocol !== "https:") return null;
    const isAllowedHost = ALLOWED_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
    );
    return isAllowedHost ? url.toString() : null;
  } catch {
    return null;
  }
}
