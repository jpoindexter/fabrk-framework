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

  if (config.hsts !== false) {
    const maxAge = config.hstsMaxAge ?? 31536000
    headers['Strict-Transport-Security'] = `max-age=${maxAge}; includeSubDomains; preload`
  }

  if (config.frameOptions !== false) {
    headers['X-Frame-Options'] = config.frameOptions ?? 'DENY'
  }

  if (config.contentTypeOptions !== false) {
    headers['X-Content-Type-Options'] = 'nosniff'
  }

  headers['Referrer-Policy'] = config.referrerPolicy ?? 'strict-origin-when-cross-origin'
  headers['X-DNS-Prefetch-Control'] = 'on'
  headers['X-Permitted-Cross-Domain-Policies'] = 'none'

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
