/**
 * Internal utilities for @fabrk/components
 */

const SAFE_URL_PROTOCOLS = ['https:', 'http:', 'mailto:', 'tel:'];

/**
 * Sanitize an href value to prevent javascript: protocol XSS attacks.
 * Allows https:, http:, mailto:, tel:, and relative paths (starting with /).
 * Returns '#' for any disallowed protocol.
 */
export function sanitizeHref(href: string): string {
  if (!href) return '#';

  const trimmed = href.trim();

  // Allow relative paths (but not protocol-relative URLs like //evil.com)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;

  // Allow fragment-only links
  if (trimmed.startsWith('#')) return trimmed;

  try {
    const url = new URL(trimmed, 'http://placeholder.invalid');
    if (SAFE_URL_PROTOCOLS.includes(url.protocol)) {
      return trimmed;
    }
  } catch {
    // Malformed URL — allow if it looks like a relative path (no colon before first slash)
    if (!trimmed.includes(':')) return trimmed;
  }

  return '#';
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function sanitizeSrc(src: string | undefined): string | undefined {
  if (!src) return src
  const trimmed = src.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^data:image\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) return trimmed
  return undefined
}
