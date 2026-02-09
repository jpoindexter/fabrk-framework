import { describe, it, expect, vi } from 'vitest'
import type { AuthAdapter, Session, ApiKeyInfo } from '@fabrk/core'
import { withAuth, withApiKey, withAuthOrApiKey } from './middleware'

// ============================================================================
// Mock Adapter Factory
// ============================================================================

function createMockAdapter(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    name: 'test',
    version: '1.0.0',
    isConfigured: () => true,
    getSession: async () => null,
    validateApiKey: async () => null,
    createApiKey: async () => ({ id: '1', key: 'k', prefix: 'p' }),
    revokeApiKey: async () => {},
    listApiKeys: async () => [],
    ...overrides,
  }
}

const mockSession: Session = {
  userId: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
}

const mockKeyInfo: ApiKeyInfo = {
  id: 'key-1',
  prefix: 'fabrk_live_abc123',
  name: 'Test Key',
  scopes: ['read', 'write'],
  createdAt: new Date(),
  active: true,
}

function createRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://example.com/api/test', {
    method: 'GET',
    headers,
  })
}

// ============================================================================
// withAuth
// ============================================================================

describe('withAuth', () => {
  it('should return 401 when no session exists', async () => {
    const adapter = createMockAdapter({ getSession: async () => null })
    const handler = vi.fn()
    const wrapped = withAuth(adapter, handler)

    const response = await wrapped(createRequest())

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
    expect(handler).not.toHaveBeenCalled()
  })

  it('should call handler with session when session exists', async () => {
    const adapter = createMockAdapter({ getSession: async () => mockSession })
    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )
    const wrapped = withAuth(adapter, handler)

    const request = createRequest()
    const response = await wrapped(request)

    expect(response.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(request, mockSession)
  })

  it('should pass the request to getSession', async () => {
    const getSession = vi.fn().mockResolvedValue(mockSession)
    const adapter = createMockAdapter({ getSession })
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    const wrapped = withAuth(adapter, handler)

    const request = createRequest()
    await wrapped(request)

    expect(getSession).toHaveBeenCalledWith(request)
  })

  it('should return 401 with JSON content type', async () => {
    const adapter = createMockAdapter({ getSession: async () => null })
    const handler = vi.fn()
    const wrapped = withAuth(adapter, handler)

    const response = await wrapped(createRequest())

    expect(response.headers.get('Content-Type')).toBe('application/json')
  })
})

// ============================================================================
// withApiKey
// ============================================================================

describe('withApiKey', () => {
  it('should return 401 when no API key header is present', async () => {
    const adapter = createMockAdapter()
    const handler = vi.fn()
    const wrapped = withApiKey(adapter, handler)

    const response = await wrapped(createRequest())

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('API key required')
    expect(handler).not.toHaveBeenCalled()
  })

  it('should extract key from Authorization Bearer header', async () => {
    const validateApiKey = vi.fn().mockResolvedValue(mockKeyInfo)
    const adapter = createMockAdapter({ validateApiKey })
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    const wrapped = withApiKey(adapter, handler)

    await wrapped(createRequest({ Authorization: 'Bearer my-api-key' }))

    expect(validateApiKey).toHaveBeenCalledWith('my-api-key')
  })

  it('should extract key from X-API-Key header', async () => {
    const validateApiKey = vi.fn().mockResolvedValue(mockKeyInfo)
    const adapter = createMockAdapter({ validateApiKey })
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    const wrapped = withApiKey(adapter, handler)

    await wrapped(createRequest({ 'X-API-Key': 'my-api-key' }))

    expect(validateApiKey).toHaveBeenCalledWith('my-api-key')
  })

  it('should prefer Authorization header over X-API-Key', async () => {
    const validateApiKey = vi.fn().mockResolvedValue(mockKeyInfo)
    const adapter = createMockAdapter({ validateApiKey })
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    const wrapped = withApiKey(adapter, handler)

    await wrapped(createRequest({
      Authorization: 'Bearer bearer-key',
      'X-API-Key': 'x-api-key',
    }))

    expect(validateApiKey).toHaveBeenCalledWith('bearer-key')
  })

  it('should return 401 when key is invalid', async () => {
    const adapter = createMockAdapter({ validateApiKey: async () => null })
    const handler = vi.fn()
    const wrapped = withApiKey(adapter, handler)

    const response = await wrapped(
      createRequest({ Authorization: 'Bearer invalid-key' })
    )

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Invalid API key')
    expect(handler).not.toHaveBeenCalled()
  })

  it('should call handler with key info when key is valid', async () => {
    const adapter = createMockAdapter({ validateApiKey: async () => mockKeyInfo })
    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const wrapped = withApiKey(adapter, handler)

    const request = createRequest({ Authorization: 'Bearer valid-key' })
    const response = await wrapped(request)

    expect(response.status).toBe(200)
    expect(handler).toHaveBeenCalledWith(request, mockKeyInfo)
  })

  it('should return 403 when required scopes are missing', async () => {
    const keyWithReadOnly: ApiKeyInfo = { ...mockKeyInfo, scopes: ['read'] }
    const adapter = createMockAdapter({ validateApiKey: async () => keyWithReadOnly })
    const handler = vi.fn()
    const wrapped = withApiKey(adapter, handler, {
      requiredScopes: ['read', 'write'],
    })

    const response = await wrapped(
      createRequest({ Authorization: 'Bearer valid-key' })
    )

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('Insufficient permissions')
    expect(handler).not.toHaveBeenCalled()
  })

  it('should pass when key has all required scopes', async () => {
    const adapter = createMockAdapter({ validateApiKey: async () => mockKeyInfo })
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    const wrapped = withApiKey(adapter, handler, {
      requiredScopes: ['read', 'write'],
    })

    const response = await wrapped(
      createRequest({ Authorization: 'Bearer valid-key' })
    )

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should pass when key has wildcard scope', async () => {
    const wildcardKey: ApiKeyInfo = { ...mockKeyInfo, scopes: ['*'] }
    const adapter = createMockAdapter({ validateApiKey: async () => wildcardKey })
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    const wrapped = withApiKey(adapter, handler, {
      requiredScopes: ['read', 'write', 'admin'],
    })

    await wrapped(createRequest({ Authorization: 'Bearer valid-key' }))

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should pass when no required scopes are specified', async () => {
    const adapter = createMockAdapter({ validateApiKey: async () => mockKeyInfo })
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    const wrapped = withApiKey(adapter, handler)

    await wrapped(createRequest({ Authorization: 'Bearer valid-key' }))

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should not treat non-Bearer Authorization header as API key', async () => {
    const adapter = createMockAdapter()
    const handler = vi.fn()
    const wrapped = withApiKey(adapter, handler)

    const response = await wrapped(
      createRequest({ Authorization: 'Basic dXNlcjpwYXNz' })
    )

    // No Bearer prefix and no X-API-Key, so should fail with 401
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('API key required')
  })
})

// ============================================================================
// withAuthOrApiKey
// ============================================================================

describe('withAuthOrApiKey', () => {
  it('should authenticate with session when available', async () => {
    const adapter = createMockAdapter({ getSession: async () => mockSession })
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    const wrapped = withAuthOrApiKey(adapter, handler)

    const request = createRequest()
    await wrapped(request)

    expect(handler).toHaveBeenCalledWith(request, { session: mockSession })
  })

  it('should fall back to API key when no session', async () => {
    const adapter = createMockAdapter({
      getSession: async () => null,
      validateApiKey: async () => mockKeyInfo,
    })
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    const wrapped = withAuthOrApiKey(adapter, handler)

    const request = createRequest({ Authorization: 'Bearer valid-key' })
    await wrapped(request)

    expect(handler).toHaveBeenCalledWith(request, { apiKey: mockKeyInfo })
  })

  it('should prefer session over API key', async () => {
    const adapter = createMockAdapter({
      getSession: async () => mockSession,
      validateApiKey: async () => mockKeyInfo,
    })
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    const wrapped = withAuthOrApiKey(adapter, handler)

    const request = createRequest({ Authorization: 'Bearer valid-key' })
    await wrapped(request)

    // Should use session, not API key
    expect(handler).toHaveBeenCalledWith(request, { session: mockSession })
  })

  it('should return 401 when neither session nor API key is available', async () => {
    const adapter = createMockAdapter({
      getSession: async () => null,
      validateApiKey: async () => null,
    })
    const handler = vi.fn()
    const wrapped = withAuthOrApiKey(adapter, handler)

    const response = await wrapped(createRequest())

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Authentication required')
    expect(handler).not.toHaveBeenCalled()
  })

  it('should return 401 when no session and API key is invalid', async () => {
    const adapter = createMockAdapter({
      getSession: async () => null,
      validateApiKey: async () => null,
    })
    const handler = vi.fn()
    const wrapped = withAuthOrApiKey(adapter, handler)

    const response = await wrapped(
      createRequest({ Authorization: 'Bearer bad-key' })
    )

    expect(response.status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
  })

  it('should work with X-API-Key header when no session', async () => {
    const adapter = createMockAdapter({
      getSession: async () => null,
      validateApiKey: async () => mockKeyInfo,
    })
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    const wrapped = withAuthOrApiKey(adapter, handler)

    const request = createRequest({ 'X-API-Key': 'my-key' })
    await wrapped(request)

    expect(handler).toHaveBeenCalledWith(request, { apiKey: mockKeyInfo })
  })

  it('should return 401 with JSON content type', async () => {
    const adapter = createMockAdapter({
      getSession: async () => null,
      validateApiKey: async () => null,
    })
    const handler = vi.fn()
    const wrapped = withAuthOrApiKey(adapter, handler)

    const response = await wrapped(createRequest())

    expect(response.headers.get('Content-Type')).toBe('application/json')
  })
})
