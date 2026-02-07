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
 */
export function rateLimitMiddleware(
  adapter: RateLimitAdapter,
  options?: { limit?: string; max?: number; windowSeconds?: number }
): MiddlewareFunction<RequestContext> {
  return async (ctx, next) => {
    const identifier =
      ctx.session?.userId ??
      ctx.apiKey?.id ??
      ctx.request.headers.get('X-Forwarded-For') ??
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
    const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin)

    await next()

    if (isAllowed && ctx.response) {
      const r = ctx.response
      r.headers.set('Access-Control-Allow-Origin', origin || '*')
      r.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      r.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
    }
  }
}

/**
 * Cost tracking middleware — logs AI request costs
 */
export function costTrackingMiddleware(): MiddlewareFunction<RequestContext & { cost?: number; feature?: string }> {
  return async (ctx, next) => {
    const start = Date.now()
    await next()
    const duration = Date.now() - start

    if (ctx.cost !== undefined) {
      // Log to console in development
      if (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.NODE_ENV !== 'production') {
        console.log(
          `[COST] ${ctx.feature ?? 'unknown'}: $${ctx.cost.toFixed(4)} (${duration}ms)`
        )
      }
    }
  }
}

/**
 * Security headers middleware
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
    }
  }
}
