/**
 * HTTP header and URL sanitization utilities for SSR responses.
 * Prevents response splitting and open redirect attacks.
 */

/**
 * Strip CRLF and other control characters from a header value to prevent
 * HTTP response splitting. Returns the cleaned string.
 * Range \x00-\x1f covers all C0 controls including \x09 (HT/tab) which can
 * be used for obsolete header line-folding in some HTTP stacks.
 */
export function sanitizeHeaderValue(value: string): string {
  // eslint-disable-next-line no-control-regex -- strip all ASCII control chars including tab (\x09)
  return value.replace(/[\x00-\x1f\x7f]/g, "");
}

/**
 * Sanitize a record of route-supplied headers: strip newlines from both
 * header names and values to prevent response splitting.
 */
export function sanitizeRouteHeaders(headers: Record<string, string>): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    // Strip CRLF from header name — a name containing \r\n would split the response line
    // eslint-disable-next-line no-control-regex
    const safeName = k.replace(/[\x00-\x1f\x7f]/g, "");
    if (!safeName) continue;
    safe[safeName] = sanitizeHeaderValue(v);
  }
  return safe;
}

export function sanitizeRedirectUrl(url: string): string {
  // Mirror validateRedirectUrl from server-helpers: strip all control chars
  // (not just CR/LF) to prevent scheme-smuggling via tab, null, etc.
  // eslint-disable-next-line no-control-regex -- intentionally strips ASCII control chars 0x00–0x20 and DEL (0x7f)
  const stripped = url.replace(/[\x00-\x20\x7f]/g, "");
  // Reject // prefix — protocol-relative URLs resolve to an arbitrary domain (open redirect)
  if (stripped.startsWith("/") && !stripped.startsWith("//")) return stripped;
  return "/";
}

/**
 * Validate and sanitize a middleware rewrite URL.
 * Only allows relative same-origin paths; rejects absolute URLs and
 * protocol-relative paths that would change the request origin.
 */
export function rewriteUrl(raw: string): string | null {
  // eslint-disable-next-line no-control-regex
  const stripped = raw.replace(/[\x00-\x20\x7f]/g, "");
  if (stripped.startsWith("/") && !stripped.startsWith("//")) return raw;
  return null;
}
