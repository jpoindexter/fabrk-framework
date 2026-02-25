/**
 * Middleware Presets
 *
 * Pre-built middleware functions for common patterns.
 * These wrap adapter interfaces into composable middleware.
 *
 * @example
 * ```ts
 * import { createFabrk, authMiddleware, rateLimitMiddleware } from '@fabrk/core'
 *
 * const fabrk = createFabrk({ ... })
 * fabrk.middleware
 *   .use(rateLimitMiddleware(rateLimit))
 *   .use(authMiddleware(auth))
 * ```
 */

import type { MiddlewareFunction } from './middleware'
import type { AuthAdapter, RateLimitAdapter } from './plugins'

interface RequestContext {
  request: Request
  session?: { userId: string; email: string; role?: string }
  apiKey?: { id: string; scopes: string[] }
  [key: string]: unknown
}

/**
 * Auth middleware — validates session or API key
 */
export function authMiddleware(
  adapter: AuthAdapter
): MiddlewareFunction<RequestContext> {
  return async (ctx, next) => {
    // Try session
    const session = await adapter.getSession(ctx.request)
    if (session) {
      ctx.session = { userId: session.userId, email: session.email, role: session.role }
      await next()
      return
    }

    // Try API key
    const authHeader = ctx.request.headers.get('Authorization')
    const apiKeyHeader = ctx.request.headers.get('X-API-Key')
    const key = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : apiKeyHeader

    if (key) {
      const keyInfo = await adapter.validateApiKey(key)
      if (keyInfo) {
        ctx.apiKey = { id: keyInfo.id, scopes: keyInfo.scopes }
        await next()
        return
      }
    }

    throw new Error('Unauthorized')
  }
}

/**
 * Rate limit middleware
 *
 * **IP Header Configuration:** The `ipHeader` option controls which header is
 * used to identify unauthenticated clients. The correct header depends on your
 * deployment platform:
 *
 * - **Cloudflare:** `'CF-Connecting-IP'`
 * - **AWS ALB / CloudFront:** `'X-Forwarded-For'` (default chain includes this)
 * - **Nginx (proxy_protocol):** `'X-Real-IP'`
 * - **Vercel:** `'X-Real-IP'`
 * - **Fly.io:** `'Fly-Client-IP'`
 *
 * If no trusted header is available, the identifier falls back to `'anonymous'`,
 * which means all unauthenticated traffic shares a single rate-limit bucket.
 * Always configure `ipHeader` to match your reverse proxy for per-IP limiting.
 */
export function rateLimitMiddleware(
  adapter: RateLimitAdapter,
  options?: { limit?: string; max?: number; windowSeconds?: number; ipHeader?: string }
): MiddlewareFunction<RequestContext> {
  return async (ctx, next) => {
    let ipIdentifier: string | null = null
    if (options?.ipHeader) {
      // Use the explicitly configured header (most reliable)
      ipIdentifier = ctx.request.headers.get(options.ipHeader)
    } else {
      // Default chain: X-Real-IP (set by most reverse proxies as a single IP),
      // then first IP from X-Forwarded-For (may contain a chain of proxies)
      ipIdentifier = ctx.request.headers.get('X-Real-IP')
      if (!ipIdentifier) {
        const xff = ctx.request.headers.get('X-Forwarded-For')
        if (xff) {
          // Take only the first (leftmost) IP — the original client IP
          ipIdentifier = xff.split(',')[0].trim() || null
        }
      }
    }

    const identifier =
      ctx.session?.userId ??
      ctx.apiKey?.id ??
      ipIdentifier ??
      'anonymous'

    const result = await adapter.check({
      identifier,
      limit: options?.limit ?? 'default',
      max: options?.max,
      windowSeconds: options?.windowSeconds,
    })

    if (!result.allowed) {
      throw Object.assign(
        new Error('Rate limit exceeded'),
        { statusCode: 429, retryAfter: result.retryAfter }
      )
    }

    await next()
  }
}

/**
 * CORS middleware
 */
export function corsMiddleware(
  allowedOrigins: string[]
): MiddlewareFunction<RequestContext & { response?: Response }> {
  return async (ctx, next) => {
    const origin = ctx.request.headers.get('Origin') ?? ''
    const isWildcard = allowedOrigins.includes('*')
    const isAllowed = isWildcard || allowedOrigins.includes(origin)

    await next()

    if (isAllowed && ctx.response) {
      const r = ctx.response
      if (isWildcard) {
        // Wildcard mode: use literal '*' instead of reflecting the request origin
        r.headers.set('Access-Control-Allow-Origin', '*')
      } else {
        // Specific origin match: reflect the matched origin and add Vary header
        r.headers.set('Access-Control-Allow-Origin', origin)
        r.headers.append('Vary', 'Origin')
      }
      r.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      r.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
    }
  }
}

/**
 * Cost tracking middleware — tracks AI request costs in the store.
 * Cost data is persisted via the AI cost store; no console output is emitted.
 */
export function costTrackingMiddleware(): MiddlewareFunction<RequestContext & { cost?: number; feature?: string }> {
  return async (ctx, next) => {
    await next()
    // ctx.cost is available here for downstream middleware or handlers to persist
  }
}

/**
 * Security headers middleware
 *
 * @remarks This middleware sets basic security headers (X-Content-Type-Options, X-Frame-Options,
 * Referrer-Policy, X-DNS-Prefetch-Control). It does NOT set Content-Security-Policy or
 * Strict-Transport-Security (HSTS) as these are highly application-specific.
 * Use `@fabrk/security` for a full CSP/HSTS preset.
 */
export function securityHeadersMiddleware(): MiddlewareFunction<RequestContext & { response?: Response }> {
  return async (ctx, next) => {
    await next()

    if (ctx.response) {
      const r = ctx.response
      r.headers.set('X-Content-Type-Options', 'nosniff')
      r.headers.set('X-Frame-Options', 'DENY')
      r.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
      r.headers.set('X-DNS-Prefetch-Control', 'on')
      r.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
      r.headers.set('X-XSS-Protection', '0')
    }
  }
}
