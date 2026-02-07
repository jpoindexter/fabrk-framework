/**
 * Content Security Policy (CSP)
 *
 * Generates CSP headers with nonce support for inline scripts/styles.
 *
 * @example
 * ```ts
 * import { generateCspHeader, generateNonce } from '@fabrk/security'
 *
 * const nonce = generateNonce()
 * const csp = generateCspHeader({
 *   scriptSrc: [`'nonce-${nonce}'`, "'strict-dynamic'"],
 *   styleSrc: ["'self'", "'unsafe-inline'"],
 * })
 * ```
 */

import type { CspConfig } from './types'

/**
 * Generate a cryptographic nonce for CSP
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  // Base64 encode
  const binary = String.fromCharCode(...bytes)
  return btoa(binary)
}

/**
 * Generate a CSP header string
 */
export function generateCspHeader(config: CspConfig = {}): string {
  const directives: string[] = []

  // Default-src is always 'self'
  directives.push("default-src 'self'")

  if (config.scriptSrc?.length) {
    directives.push(`script-src ${config.scriptSrc.join(' ')}`)
  } else {
    directives.push("script-src 'self'")
  }

  if (config.styleSrc?.length) {
    directives.push(`style-src ${config.styleSrc.join(' ')}`)
  } else {
    directives.push("style-src 'self' 'unsafe-inline'")
  }

  if (config.imgSrc?.length) {
    directives.push(`img-src ${config.imgSrc.join(' ')}`)
  } else {
    directives.push("img-src 'self' data: blob:")
  }

  if (config.connectSrc?.length) {
    directives.push(`connect-src ${config.connectSrc.join(' ')}`)
  } else {
    directives.push("connect-src 'self'")
  }

  if (config.fontSrc?.length) {
    directives.push(`font-src ${config.fontSrc.join(' ')}`)
  } else {
    directives.push("font-src 'self'")
  }

  if (config.frameSrc?.length) {
    directives.push(`frame-src ${config.frameSrc.join(' ')}`)
  } else {
    directives.push("frame-src 'none'")
  }

  // Always include these security directives
  directives.push("base-uri 'self'")
  directives.push("form-action 'self'")
  directives.push('upgrade-insecure-requests')

  if (config.reportUri) {
    directives.push(`report-uri ${config.reportUri}`)
  }

  return directives.join('; ')
}

/**
 * Get the CSP header name based on config
 */
export function getCspHeaderName(config: CspConfig = {}): string {
  return config.reportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy'
}
