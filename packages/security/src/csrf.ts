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
import { timingSafeEqual } from './crypto-utils'

export interface CsrfProtection {
  /** Generate a new CSRF token */
  generateToken(): Promise<string>
  /** Create a Set-Cookie header for the CSRF token */
  createCookie(token: string): string
  /** Verify a request has a valid CSRF token */
  verify(request: Request): Promise<boolean>
  /** Get the token from a request's cookies */
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

  return {
    async generateToken(): Promise<string> {
      const bytes = new Uint8Array(tokenLength)
      crypto.getRandomValues(bytes)
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    },

    createCookie(token: string): string {
      const parts = [
        `${cookieName}=${token}`,
        'Path=/',
        'HttpOnly',
        `SameSite=${sameSite}`,
      ]
      if (secure) parts.push('Secure')
      return parts.join('; ')
    },

    async verify(request: Request): Promise<boolean> {
      // Skip verification for safe methods
      const method = request.method.toUpperCase()
      if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return true
      }

      // Get token from cookie
      const cookieToken = this.getTokenFromCookie(request)
      if (!cookieToken) return false

      // Get token from header
      const headerToken = request.headers.get(headerName)
      if (!headerToken) return false

      // Constant-time comparison
      return timingSafeEqual(cookieToken, headerToken)
    },

    getTokenFromCookie(request: Request): string | null {
      const cookieHeader = request.headers.get('Cookie')
      if (!cookieHeader) return null

      const cookies = cookieHeader.split(';').map((c) => c.trim())
      const csrfCookie = cookies.find((c) => c.startsWith(`${cookieName}=`))
      if (!csrfCookie) return null

      return csrfCookie.split('=')[1] ?? null
    },
  }
}

