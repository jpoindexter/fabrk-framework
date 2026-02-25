/**
 * CSRF Protection
 *
 * Generates and verifies CSRF tokens using Web Crypto API.
 * Tokens are stored in cookies and validated against request headers.
 *
 * @example
 * ```ts
 * import { createCsrfProtection } from '@fabrk/security'
 *
 * const csrf = createCsrfProtection()
 *
 * // In API route
 * export async function POST(request: Request) {
 *   const valid = await csrf.verify(request)
 *   if (!valid) return new Response('Invalid CSRF token', { status: 403 })
 *   // ...
 * }
 * ```
 */

import type { CsrfConfig } from './types'
import { timingSafeEqual } from '@fabrk/core'

export interface CsrfProtection {
  generateToken(): Promise<string>
  createCookie(token: string): string
  verify(request: Request): Promise<boolean>
  getTokenFromCookie(request: Request): string | null
}

export function createCsrfProtection(config: CsrfConfig = {}): CsrfProtection {
  const {
    cookieName = '__fabrk_csrf',
    headerName = 'x-csrf-token',
    tokenLength = 32,
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'strict',
  } = config

  // Use __Host- prefix when secure to prevent subdomain cookie tossing.
  // __Host- enforces Secure, Path=/, and no Domain attribute (browser-enforced).
  // Guard against double-prefixing if the caller already supplied a prefixed name.
  const effectiveName = secure
    ? cookieName.startsWith('__Host-') || cookieName.startsWith('__Secure-')
      ? cookieName
      : `__Host-${cookieName}`
    : cookieName

  return {
    async generateToken(): Promise<string> {
      const bytes = new Uint8Array(tokenLength)
      crypto.getRandomValues(bytes)
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    },

    createCookie(token: string): string {
      // Validate token contains only hex characters to prevent header injection
      if (!/^[a-f0-9]+$/i.test(token)) {
        throw new Error('CSRF token must be a hex string')
      }

      // SameSite=None is insecure for CSRF cookies because it allows cross-origin requests,
      // which is exactly what CSRF protection is meant to prevent.
      if (sameSite === 'none') {
        throw new Error(
          'CSRF cookies must not use SameSite=None. ' +
          'This would allow cross-origin requests to include the cookie, defeating CSRF protection. ' +
          'Use "strict" (recommended) or "lax" instead.'
        )
      }

      const parts = [
        `${effectiveName}=${token}`,
        'Path=/',
        'HttpOnly',
        `SameSite=${sameSite}`,
      ]

      // Only set Secure flag when configured (typically production over HTTPS).
      // In development over HTTP, the Secure flag prevents the cookie from being set.
      if (secure) {
        parts.push('Secure')
      }

      return parts.join('; ')
    },

    async verify(request: Request): Promise<boolean> {
      const method = request.method.toUpperCase()
      if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return true
      }

      const cookieToken = this.getTokenFromCookie(request)
      if (!cookieToken) return false

      const headerToken = request.headers.get(headerName)
      if (!headerToken) return false

      return await timingSafeEqual(cookieToken, headerToken)
    },

    getTokenFromCookie(request: Request): string | null {
      const cookieHeader = request.headers.get('Cookie')
      if (!cookieHeader) return null

      const cookies = cookieHeader.split(';').map((c) => c.trim())
      const csrfCookie = cookies.find((c) => c.startsWith(`${effectiveName}=`))
      if (!csrfCookie) return null

      const eqIndex = csrfCookie.indexOf('=')
      return eqIndex === -1 ? null : csrfCookie.slice(eqIndex + 1) || null
    },
  }
}

