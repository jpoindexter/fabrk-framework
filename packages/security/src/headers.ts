/**
 * Security Headers
 *
 * Generates security-related HTTP headers.
 * Follows OWASP best practices.
 *
 * @example
 * ```ts
 * import { getSecurityHeaders } from '@fabrk/security'
 *
 * const headers = getSecurityHeaders()
 * // Apply to Next.js config or middleware
 * ```
 */

import type { SecurityHeadersConfig } from './types'

export function getSecurityHeaders(
  config: SecurityHeadersConfig = {}
): Record<string, string> {
  const headers: Record<string, string> = {}

  // HSTS (HTTP Strict Transport Security)
  if (config.hsts !== false) {
    const maxAge = config.hstsMaxAge ?? 31536000
    headers['Strict-Transport-Security'] = `max-age=${maxAge}; includeSubDomains; preload`
  }

  // X-Frame-Options
  if (config.frameOptions !== false) {
    headers['X-Frame-Options'] = config.frameOptions ?? 'DENY'
  }

  // X-Content-Type-Options
  if (config.contentTypeOptions !== false) {
    headers['X-Content-Type-Options'] = 'nosniff'
  }

  // Referrer-Policy
  headers['Referrer-Policy'] = config.referrerPolicy ?? 'strict-origin-when-cross-origin'

  // X-DNS-Prefetch-Control
  headers['X-DNS-Prefetch-Control'] = 'on'

  // X-Permitted-Cross-Domain-Policies
  headers['X-Permitted-Cross-Domain-Policies'] = 'none'

  // Permissions-Policy
  if (config.permissionsPolicy) {
    const directives = Object.entries(config.permissionsPolicy)
      .map(([feature, allowlist]) => `${feature}=(${allowlist.join(' ')})`)
      .join(', ')
    headers['Permissions-Policy'] = directives
  } else {
    headers['Permissions-Policy'] =
      'camera=(), microphone=(), geolocation=(), browsing-topics=()'
  }

  return headers
}

export function applySecurityHeaders(
  response: Response,
  config?: SecurityHeadersConfig
): Response {
  const headers = getSecurityHeaders(config)
  const newResponse = new Response(response.body, response)

  for (const [key, value] of Object.entries(headers)) {
    newResponse.headers.set(key, value)
  }

  return newResponse
}
