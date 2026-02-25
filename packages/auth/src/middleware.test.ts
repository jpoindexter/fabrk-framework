import { describe, it, expect, vi } from 'vitest'
import type { AuthAdapter, Session, ApiKeyInfo } from '@fabrk/core'
import { withAuth, withApiKey, withAuthOrApiKey } from './middleware'

// Mock Adapter Factory

function createMockAdapter(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    name: 'test', version: '1.0.0', isConfigured: () => true,
    getSession: async () => null, validateApiKey: async () => null,
    createApiKey: async () => ({ id: '1', key: 'k', prefix: 'p' }),
    revokeApiKey: async () => {}, listApiKeys: async () => [],
    ...overrides,
  }
}

const mockSession: Session = { userId: 'user-1', email: 'test@example.com', name: 'Test User' }
const mockKeyInfo: ApiKeyInfo = { id: 'key-1', prefix: 'fabrk_live_abc123', name: 'Test Key', scopes: ['read', 'write'], createdAt: new Date(), active: true }

function createRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://example.com/api/test', { method: 'GET', headers })
}

// withAuth

describe('withAuth', () => {
  it('should return 401 when no session exists', async () => {
    const handler = vi.fn()
    const response = await withAuth(createMockAdapter(), handler)(createRequest())

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('Unauthorized')
    expect(handler).not.toHaveBeenCalled()
  })

  it('should call handler with session when authenticated', async () => {
    const adapter = createMockAdapter({ getSession: async () => mockSession })
    const handler = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    const request = createRequest()
    const response = await withAuth(adapter, handler)(request)

    expect(response.status).toBe(200)
    expect(handler).toHaveBeenCalledWith(request, mockSession)
  })
})

// withApiKey

describe('withApiKey', () => {
  it('should return 401 when no API key header is present', async () => {
    const handler = vi.fn()
    const response = await withApiKey(createMockAdapter(), handler)(createRequest())

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('API key required')
    expect(handler).not.toHaveBeenCalled()
  })

  it('should extract key from Bearer and X-API-Key headers, preferring Bearer', async () => {
    const validateApiKey = vi.fn().mockResolvedValue(mockKeyInfo)
    const adapter = createMockAdapter({ validateApiKey })
    const handler = vi.fn().mockResolvedValue(new Response('ok'))

    await withApiKey(adapter, handler)(createRequest({ Authorization: 'Bearer my-api-key' }))
    expect(validateApiKey).toHaveBeenCalledWith('my-api-key')

    validateApiKey.mockClear()
    await withApiKey(adapter, handler)(createRequest({ 'X-API-Key': 'x-key' }))
    expect(validateApiKey).toHaveBeenCalledWith('x-key')

    validateApiKey.mockClear()
    await withApiKey(adapter, handler)(createRequest({ Authorization: 'Bearer bearer-key', 'X-API-Key': 'x-key' }))
    expect(validateApiKey).toHaveBeenCalledWith('bearer-key')
  })

  it('should return 401 for invalid key and 403 for insufficient scopes', async () => {
    const handler = vi.fn()

    const invalidResult = await withApiKey(
      createMockAdapter({ validateApiKey: async () => null }), handler
    )(createRequest({ Authorization: 'Bearer invalid-key' }))
    expect(invalidResult.status).toBe(401)

    const readOnlyKey: ApiKeyInfo = { ...mockKeyInfo, scopes: ['read'] }
    const scopeResult = await withApiKey(
      createMockAdapter({ validateApiKey: async () => readOnlyKey }), handler,
      { requiredScopes: ['read', 'write'] }
    )(createRequest({ Authorization: 'Bearer valid-key' }))
    expect(scopeResult.status).toBe(403)
    expect(handler).not.toHaveBeenCalled()
  })

  it('should pass with all required scopes or wildcard scope', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('ok'))

    await withApiKey(
      createMockAdapter({ validateApiKey: async () => mockKeyInfo }), handler,
      { requiredScopes: ['read', 'write'] }
    )(createRequest({ Authorization: 'Bearer valid-key' }))
    expect(handler).toHaveBeenCalledTimes(1)

    handler.mockClear()
    const wildcardKey: ApiKeyInfo = { ...mockKeyInfo, scopes: ['*'] }
    await withApiKey(
      createMockAdapter({ validateApiKey: async () => wildcardKey }), handler,
      { requiredScopes: ['read', 'write', 'admin'] }
    )(createRequest({ Authorization: 'Bearer valid-key' }))
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

// withAuthOrApiKey

describe('withAuthOrApiKey', () => {
  it('should authenticate with session when available, preferring it over API key', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    const request = createRequest({ Authorization: 'Bearer valid-key' })

    await withAuthOrApiKey(
      createMockAdapter({ getSession: async () => mockSession, validateApiKey: async () => mockKeyInfo }),
      handler
    )(request)

    expect(handler).toHaveBeenCalledWith(request, { session: mockSession })
  })

  it('should fall back to API key when no session', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    const request = createRequest({ Authorization: 'Bearer valid-key' })

    await withAuthOrApiKey(
      createMockAdapter({ getSession: async () => null, validateApiKey: async () => mockKeyInfo }),
      handler
    )(request)

    expect(handler).toHaveBeenCalledWith(request, { apiKey: mockKeyInfo })
  })

  it('should return 401 when neither session nor API key is available', async () => {
    const handler = vi.fn()

    const response = await withAuthOrApiKey(
      createMockAdapter({ getSession: async () => null, validateApiKey: async () => null }),
      handler
    )(createRequest())

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('Authentication required')
    expect(handler).not.toHaveBeenCalled()
  })
})
