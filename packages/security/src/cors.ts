/**
 * CORS Configuration
 *
 * Helper for generating CORS headers and handling preflight requests.
 *
 * @example
 * ```ts
 * import { createCorsHandler } from '@fabrk/security'
 *
 * const cors = createCorsHandler({
 *   origins: ['https://myapp.com'],
 *   credentials: true,
 * })
 *
 * // In API route
 * export async function OPTIONS(request: Request) {
 *   return cors.preflight(request)
 * }
 *
 * export async function GET(request: Request) {
 *   const response = Response.json({ data: 'hello' })
 *   return cors.apply(request, response)
 * }
 * ```
 */

import type { CorsConfig } from './types'

export interface CorsHandler {
  getHeaders(request: Request): Record<string, string>
  preflight(request: Request): Response
  apply(request: Request, response: Response): Response
  isAllowed(origin: string): boolean
}

export function createCorsHandler(config: CorsConfig): CorsHandler {
  const {
    origins,
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-API-Key', 'X-CSRF-Token'],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400,
  } = config

  if (origins.includes('*') && credentials) {
    throw new Error('CORS: origins ["*"] with credentials: true is insecure. Specify explicit origins.')
  }

  function isAllowed(origin: string): boolean {
    if (origins.includes('*')) return true
    return origins.includes(origin)
  }

  function getHeaders(request: Request): Record<string, string> {
    const origin = request.headers.get('Origin') ?? ''
    const headers: Record<string, string> = {}

    if (!isAllowed(origin)) return headers

    // Use the specific origin (not *) when credentials are enabled
    headers['Access-Control-Allow-Origin'] = credentials ? origin : (origins.includes('*') ? '*' : origin)

    /** @security Vary: Origin prevents shared caches from serving a response with the wrong ACAO header to a different origin (cache poisoning). Required whenever ACAO is not a static wildcard '*'. */
    if (!origins.includes('*')) {
      headers['Vary'] = 'Origin'
    }

    if (credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true'
    }

    if (exposedHeaders.length) {
      headers['Access-Control-Expose-Headers'] = exposedHeaders.join(', ')
    }

    return headers
  }

  return {
    isAllowed,
    getHeaders,

    preflight(request: Request): Response {
      const headers = getHeaders(request)

      // If origin is not allowed, return a bare 204 with no CORS headers
      // to avoid leaking configuration to disallowed origins
      if (!headers['Access-Control-Allow-Origin']) {
        return new Response(null, { status: 204 })
      }

      headers['Access-Control-Allow-Methods'] = methods.join(', ')
      headers['Access-Control-Allow-Headers'] = allowedHeaders.join(', ')
      headers['Access-Control-Max-Age'] = maxAge.toString()

      return new Response(null, {
        status: 204,
        headers,
      })
    },

    apply(request: Request, response: Response): Response {
      const corsHeaders = getHeaders(request)
      const newResponse = new Response(response.body, response)

      for (const [key, value] of Object.entries(corsHeaders)) {
        newResponse.headers.set(key, value)
      }

      return newResponse
    },
  }
}
