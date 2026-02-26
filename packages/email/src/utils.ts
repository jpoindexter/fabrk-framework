const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const HTML_ESCAPE_RE = /[&<>"']/g

export function escapeHtml(value: string): string {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return value.replace(HTML_ESCAPE_RE, (ch) => HTML_ESCAPE_MAP[ch]!)
}

/**
 * Sanitize a URL for use in an `href` attribute.
 *
 * - Allows `http://` and `https://` URLs through unchanged.
 * - Falls back to `#` for anything else (javascript:, data:, etc.).
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed === '#') return '#'
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return '#'
}

/**
 * Sanitize email subject line to prevent header injection.
 * Strips CR, LF, and other control characters.
 */
export function sanitizeSubject(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\r\n\t\u0000-\u001f\u007f]/g, ' ').trim()
}
