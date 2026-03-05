import type { AuthAdapter, Session, ApiKeyInfo } from '@fabrk/core'

const SEC: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

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
        headers: SEC,
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
          headers: SEC,
        }
      )
    }

    const keyInfo = await adapter.validateApiKey(key)

    if (!keyInfo) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        {
          status: 401,
          headers: SEC,
        }
      )
    }

    if (!checkScopes(keyInfo, options?.requiredScopes)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        {
          status: 403,
          headers: SEC,
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
              headers: SEC,
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
        headers: SEC,
      }
    )
  }
}
