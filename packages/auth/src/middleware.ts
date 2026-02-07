/**
 * Auth Middleware
 *
 * Middleware helpers for protecting routes with session or API key auth.
 *
 * @example
 * ```ts
 * import { withAuth, withApiKey } from '@fabrk/auth'
 *
 * // In Next.js API route
 * export const POST = withAuth(async (req, session) => {
 *   return Response.json({ user: session.userId })
 * })
 *
 * // API key auth
 * export const GET = withApiKey(auth, async (req, keyInfo) => {
 *   return Response.json({ key: keyInfo.name })
 * })
 * ```
 */

import type { AuthAdapter, Session, ApiKeyInfo } from '@fabrk/core'

type AuthenticatedHandler = (
  request: Request,
  session: Session
) => Promise<Response>

type ApiKeyHandler = (
  request: Request,
  keyInfo: ApiKeyInfo
) => Promise<Response>

/**
 * Wrap a handler to require session authentication
 */
export function withAuth(
  adapter: AuthAdapter,
  handler: AuthenticatedHandler
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const session = await adapter.getSession(request)

    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return handler(request, session)
  }
}

/**
 * Wrap a handler to require API key authentication
 *
 * Looks for the key in the Authorization header (Bearer token)
 * or X-API-Key header.
 */
export function withApiKey(
  adapter: AuthAdapter,
  handler: ApiKeyHandler,
  options?: { requiredScopes?: string[] }
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    // Extract API key from headers
    const authHeader = request.headers.get('Authorization')
    const apiKeyHeader = request.headers.get('X-API-Key')

    let key: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      key = authHeader.slice(7)
    } else if (apiKeyHeader) {
      key = apiKeyHeader
    }

    if (!key) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const keyInfo = await adapter.validateApiKey(key)

    if (!keyInfo) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Check required scopes
    if (options?.requiredScopes?.length) {
      const hasAllScopes = options.requiredScopes.every(
        (scope) => keyInfo.scopes.includes('*') || keyInfo.scopes.includes(scope)
      )

      if (!hasAllScopes) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    return handler(request, keyInfo)
  }
}

/**
 * Wrap a handler to accept either session or API key auth
 */
export function withAuthOrApiKey(
  adapter: AuthAdapter,
  handler: (request: Request, auth: { session?: Session; apiKey?: ApiKeyInfo }) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    // Try session first
    const session = await adapter.getSession(request)
    if (session) {
      return handler(request, { session })
    }

    // Try API key
    const authHeader = request.headers.get('Authorization')
    const apiKeyHeader = request.headers.get('X-API-Key')
    let key: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      key = authHeader.slice(7)
    } else if (apiKeyHeader) {
      key = apiKeyHeader
    }

    if (key) {
      const keyInfo = await adapter.validateApiKey(key)
      if (keyInfo) {
        return handler(request, { apiKey: keyInfo })
      }
    }

    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
