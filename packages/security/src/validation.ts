/**
 * Input Sanitization
 *
 * Utilities for sanitizing user input to prevent XSS and injection attacks.
 */

/**
 * Sanitize a string by escaping HTML entities
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Strip all HTML tags from a string
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

/**
 * Sanitize a string for use in SQL (basic protection — use parameterized queries instead)
 */
export function sanitizeSqlInput(input: string): string {
  return input.replace(/['";\\]/g, '')
}

/**
 * Validate and sanitize a URL
 */
export function sanitizeUrl(input: string): string | null {
  try {
    const url = new URL(input)
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

/**
 * Validate and sanitize a redirect URL (prevent open redirect)
 */
export function sanitizeRedirectUrl(
  input: string,
  allowedHosts: string[]
): string | null {
  // Allow relative URLs
  if (input.startsWith('/') && !input.startsWith('//')) {
    return input
  }

  try {
    const url = new URL(input)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null
    }
    if (!allowedHosts.includes(url.hostname)) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}
