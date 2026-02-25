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

export function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const binary = String.fromCharCode(...bytes)
  return btoa(binary)
}

/**
 * Validate a CSP directive value to prevent header injection.
 * Rejects values containing semicolons, carriage returns, or newlines
 * which could be used to inject additional directives or headers.
 */
function validateDirectiveValue(value: string): string {
  if (/[;\r\n]/.test(value)) {
    throw new Error(
      `Invalid CSP directive value: "${value}". Values must not contain semicolons, carriage returns, or newlines.`
    )
  }
  return value
}

function sanitizeDirectiveValues(values: string[]): string[] {
  return values.map(validateDirectiveValue)
}

export function generateCspHeader(config: CspConfig = {}): string {
  const directives: string[] = []

  directives.push("default-src 'self'")

  if (config.scriptSrc?.length) {
    directives.push(`script-src ${sanitizeDirectiveValues(config.scriptSrc).join(' ')}`)
  } else {
    directives.push("script-src 'self'")
  }

  if (config.styleSrc?.length) {
    directives.push(`style-src ${sanitizeDirectiveValues(config.styleSrc).join(' ')}`)
  } else {
    directives.push("style-src 'self' 'unsafe-inline'")
  }

  if (config.imgSrc?.length) {
    directives.push(`img-src ${sanitizeDirectiveValues(config.imgSrc).join(' ')}`)
  } else {
    directives.push("img-src 'self' data: blob:")
  }

  if (config.connectSrc?.length) {
    directives.push(`connect-src ${sanitizeDirectiveValues(config.connectSrc).join(' ')}`)
  } else {
    directives.push("connect-src 'self'")
  }

  if (config.fontSrc?.length) {
    directives.push(`font-src ${sanitizeDirectiveValues(config.fontSrc).join(' ')}`)
  } else {
    directives.push("font-src 'self'")
  }

  if (config.frameSrc?.length) {
    directives.push(`frame-src ${sanitizeDirectiveValues(config.frameSrc).join(' ')}`)
  } else {
    directives.push("frame-src 'none'")
  }

  directives.push("base-uri 'self'")
  directives.push("form-action 'self'")
  directives.push('upgrade-insecure-requests')

  if (config.reportUri) {
    directives.push(`report-uri ${validateDirectiveValue(config.reportUri)}`)
  }

  return directives.join('; ')
}

export function getCspHeaderName(config: CspConfig = {}): string {
  return config.reportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy'
}
