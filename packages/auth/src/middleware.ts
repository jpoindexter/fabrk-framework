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

function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7)
  return request.headers.get('X-API-Key')
}

function checkScopes(keyInfo: ApiKeyInfo, requiredScopes?: string[]): boolean {
  if (!requiredScopes?.length) return true
  return requiredScopes.every(
    (scope) => keyInfo.scopes.includes('*') || keyInfo.scopes.includes(scope)
  )
}

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

export function withApiKey(
  adapter: AuthAdapter,
  handler: ApiKeyHandler,
  options?: { requiredScopes?: string[] }
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const key = extractApiKey(request)

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

    if (!checkScopes(keyInfo, options?.requiredScopes)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return handler(request, keyInfo)
  }
}

/**
 * @security Session auth bypasses requiredScopes — scopes only apply to API key auth.
 * To enforce role-based access for sessions, check session.role in your handler.
 */
export function withAuthOrApiKey(
  adapter: AuthAdapter,
  handler: (request: Request, auth: { session?: Session; apiKey?: ApiKeyInfo }) => Promise<Response>,
  options?: { requiredScopes?: string[] }
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const session = await adapter.getSession(request)
    if (session) {
      return handler(request, { session })
    }

    const key = extractApiKey(request)
    if (key) {
      const keyInfo = await adapter.validateApiKey(key)
      if (keyInfo) {
        if (!checkScopes(keyInfo, options?.requiredScopes)) {
          return new Response(
            JSON.stringify({ error: 'Insufficient API key scope' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }

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
