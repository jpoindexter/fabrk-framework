import { describe, it, expect, beforeEach } from 'vitest'
import { createNextAuthAdapter } from '../nextauth/adapter'
import { withApiKey, withAuth, withAuthOrApiKey } from '../middleware'
import { verifyTotp } from '../mfa/totp'
import type { AuthAdapter } from '@fabrk/core'

// ============================================================================
// Helper: generate a valid TOTP code from a secret at the current time step
// Replicates the internal HOTP logic since generateHotp is not exported
// ============================================================================

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.replace(/[=\s]/g, '').toUpperCase()
  const bytes: number[] = []
  let bits = 0
  let value = 0

  for (const char of cleaned) {
    const index = BASE32_CHARS.indexOf(char)
    if (index === -1) continue
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }

  return new Uint8Array(bytes)
}

async function generateHotp(secret: string, counter: number): Promise<string> {
  const secretBytes = base32Decode(secret)

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )

  const counterBytes = new ArrayBuffer(8)
  const view = new DataView(counterBytes)
  view.setBigUint64(0, BigInt(counter))

  const hmac = await crypto.subtle.sign('HMAC', key, counterBytes)
  const hmacBytes = new Uint8Array(hmac)

  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f
  const code =
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff)

  return (code % 1_000_000).toString().padStart(6, '0')
}

async function generateCurrentTotp(secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const counter = Math.floor(now / 30)
  return generateHotp(secret, counter)
}

// ============================================================================
// Test 1: Auth + Middleware Integration — API Key Flow
// ============================================================================

describe('Auth + Middleware Integration', () => {
  let adapter: AuthAdapter

  describe('API Key Flow', () => {
    beforeEach(() => {
      adapter = createNextAuthAdapter({
        authInstance: async () => ({
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            role: 'admin',
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      })
    })

    it('should create an API key and validate it via middleware', async () => {
      // Step 1: Create an API key
      const result = await adapter.createApiKey({
        userId: 'user-123',
        name: 'Test API Key',
        scopes: ['read', 'write'],
      })

      expect(result.id).toBeDefined()
      expect(result.key).toBeDefined()
      expect(result.prefix).toBeDefined()
      expect(result.key).toContain('fabrk_live_')

      // Step 2: Use withApiKey middleware with the created key
      let handlerCalled = false
      let receivedKeyInfo: any = null

      const handler = withApiKey(adapter, async (_req, keyInfo) => {
        handlerCalled = true
        receivedKeyInfo = keyInfo
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      // Step 3: Send request with the key in Authorization header
      const request = new Request('https://example.com/api/data', {
        headers: {
          Authorization: `Bearer ${result.key}`,
        },
      })

      const response = await handler(request)

      // Step 4: Verify the middleware called the handler with valid keyInfo
      expect(response.status).toBe(200)
      expect(handlerCalled).toBe(true)
      expect(receivedKeyInfo).not.toBeNull()
      expect(receivedKeyInfo.id).toBe(result.id)
      expect(receivedKeyInfo.name).toBe('Test API Key')
      expect(receivedKeyInfo.scopes).toEqual(['read', 'write'])
      expect(receivedKeyInfo.active).toBe(true)
    })

    it('should return 401 for invalid API key', async () => {
      const handler = withApiKey(adapter, async () => {
        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const request = new Request('https://example.com/api/data', {
        headers: {
          Authorization: 'Bearer fabrk_live_invalid_key_here',
        },
      })

      const response = await handler(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Invalid API key')
    })

    it('should return 401 when no API key is provided', async () => {
      const handler = withApiKey(adapter, async () => {
        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const request = new Request('https://example.com/api/data')
      const response = await handler(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('API key required')
    })

    it('should accept API key via X-API-Key header', async () => {
      const result = await adapter.createApiKey({
        userId: 'user-123',
        name: 'X-Header Key',
        scopes: ['*'],
      })

      let receivedKeyInfo: any = null

      const handler = withApiKey(adapter, async (_req, keyInfo) => {
        receivedKeyInfo = keyInfo
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      })

      const request = new Request('https://example.com/api/data', {
        headers: {
          'X-API-Key': result.key,
        },
      })

      const response = await handler(request)
      expect(response.status).toBe(200)
      expect(receivedKeyInfo.name).toBe('X-Header Key')
    })

    it('should enforce required scopes', async () => {
      const result = await adapter.createApiKey({
        userId: 'user-123',
        name: 'Limited Key',
        scopes: ['read'],
      })

      const handler = withApiKey(
        adapter,
        async () => {
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        },
        { requiredScopes: ['write', 'admin'] }
      )

      const request = new Request('https://example.com/api/data', {
        headers: {
          Authorization: `Bearer ${result.key}`,
        },
      })

      const response = await handler(request)
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe('Insufficient permissions')
    })

    it('should allow wildcard scope to bypass scope checks', async () => {
      const result = await adapter.createApiKey({
        userId: 'user-123',
        name: 'Admin Key',
        scopes: ['*'],
      })

      const handler = withApiKey(
        adapter,
        async () => {
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        },
        { requiredScopes: ['write', 'admin', 'superuser'] }
      )

      const request = new Request('https://example.com/api/data', {
        headers: {
          Authorization: `Bearer ${result.key}`,
        },
      })

      const response = await handler(request)
      expect(response.status).toBe(200)
    })

    it('should revoke an API key and reject subsequent requests', async () => {
      const result = await adapter.createApiKey({
        userId: 'user-123',
        name: 'Revocable Key',
        scopes: ['read'],
      })

      // Verify it works before revocation
      const handler = withApiKey(adapter, async () => {
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      })

      const request1 = new Request('https://example.com/api/data', {
        headers: { Authorization: `Bearer ${result.key}` },
      })
      const response1 = await handler(request1)
      expect(response1.status).toBe(200)

      // Revoke
      await adapter.revokeApiKey(result.id)

      // Should now be rejected
      const request2 = new Request('https://example.com/api/data', {
        headers: { Authorization: `Bearer ${result.key}` },
      })
      const response2 = await handler(request2)
      expect(response2.status).toBe(401)
    })
  })

  // ============================================================================
  // Session Auth Middleware
  // ============================================================================

  describe('Session Auth Middleware', () => {
    it('should allow authenticated session requests', async () => {
      const authedAdapter = createNextAuthAdapter({
        authInstance: async () => ({
          user: {
            id: 'user-456',
            email: 'authed@example.com',
            name: 'Authed User',
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      })

      let receivedSession: any = null

      const handler = withAuth(authedAdapter, async (_req, session) => {
        receivedSession = session
        return new Response(JSON.stringify({ userId: session.userId }), {
          status: 200,
        })
      })

      const request = new Request('https://example.com/api/me')
      const response = await handler(request)

      expect(response.status).toBe(200)
      expect(receivedSession.userId).toBe('user-456')
      expect(receivedSession.email).toBe('authed@example.com')
    })

    it('should reject requests when no session exists', async () => {
      const noAuthAdapter = createNextAuthAdapter({
        authInstance: async () => null,
      })

      const handler = withAuth(noAuthAdapter, async (_req, session) => {
        return new Response(JSON.stringify({ userId: session.userId }), {
          status: 200,
        })
      })

      const request = new Request('https://example.com/api/me')
      const response = await handler(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('should reject requests when authInstance is not configured', async () => {
      const unconfiguredAdapter = createNextAuthAdapter({})

      const handler = withAuth(unconfiguredAdapter, async (_req, session) => {
        return new Response(JSON.stringify({ userId: session.userId }), {
          status: 200,
        })
      })

      const request = new Request('https://example.com/api/me')
      const response = await handler(request)

      expect(response.status).toBe(401)
    })
  })

  // ============================================================================
  // Combined Auth (withAuthOrApiKey)
  // ============================================================================

  describe('withAuthOrApiKey middleware', () => {
    it('should accept session-authenticated request', async () => {
      const authedAdapter = createNextAuthAdapter({
        authInstance: async () => ({
          user: {
            id: 'user-789',
            email: 'combo@example.com',
            name: 'Combo User',
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      })

      let receivedAuth: any = null

      const handler = withAuthOrApiKey(authedAdapter, async (_req, auth) => {
        receivedAuth = auth
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      })

      const request = new Request('https://example.com/api/data')
      const response = await handler(request)

      expect(response.status).toBe(200)
      expect(receivedAuth.session).toBeDefined()
      expect(receivedAuth.session.userId).toBe('user-789')
    })

    it('should accept API key when no session exists', async () => {
      const noSessionAdapter = createNextAuthAdapter({
        authInstance: async () => null,
      })

      const keyResult = await noSessionAdapter.createApiKey({
        userId: 'user-999',
        name: 'Combo API Key',
        scopes: ['read'],
      })

      let receivedAuth: any = null

      const handler = withAuthOrApiKey(noSessionAdapter, async (_req, auth) => {
        receivedAuth = auth
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      })

      const request = new Request('https://example.com/api/data', {
        headers: { Authorization: `Bearer ${keyResult.key}` },
      })

      const response = await handler(request)

      expect(response.status).toBe(200)
      expect(receivedAuth.apiKey).toBeDefined()
      expect(receivedAuth.apiKey.name).toBe('Combo API Key')
    })

    it('should return 401 when neither session nor API key', async () => {
      const noAuthAdapter = createNextAuthAdapter({
        authInstance: async () => null,
      })

      const handler = withAuthOrApiKey(noAuthAdapter, async (_req, auth) => {
        return new Response(JSON.stringify(auth), { status: 200 })
      })

      const request = new Request('https://example.com/api/data')
      const response = await handler(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Authentication required')
    })
  })

  // ============================================================================
  // Test 2: MFA Flow
  // ============================================================================

  describe('MFA Flow', () => {
    let mfaAdapter: AuthAdapter

    beforeEach(() => {
      mfaAdapter = createNextAuthAdapter({
        authInstance: async () => ({
          user: { id: 'mfa-user', email: 'mfa@example.com' },
        }),
      })
    })

    it('should set up MFA and return secret, qrCodeUrl, and backup codes', async () => {
      const result = await mfaAdapter.setupMfa!('mfa-user-1')

      expect(result.secret).toBeDefined()
      expect(result.secret.length).toBeGreaterThan(0)
      expect(result.qrCodeUrl).toContain('otpauth://totp/')
      expect(result.qrCodeUrl).toContain(result.secret)
      expect(result.backupCodes).toHaveLength(10)

      // Backup codes should be in XXXX-XXXX format
      for (const code of result.backupCodes) {
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)
      }
    })

    it('should verify a valid TOTP code', async () => {
      const setup = await mfaAdapter.setupMfa!('mfa-user-2')

      // Generate a valid TOTP code from the secret
      const validCode = await generateCurrentTotp(setup.secret)

      // Verify the code
      const result = await mfaAdapter.verifyMfa!('mfa-user-2', validCode)

      expect(result.verified).toBe(true)
      expect(result.usedBackupCode).toBe(false)
    })

    it('should reject an invalid TOTP code', async () => {
      await mfaAdapter.setupMfa!('mfa-user-3')

      const result = await mfaAdapter.verifyMfa!('mfa-user-3', '000000')

      // This might pass if 000000 happens to be the current code (extremely unlikely),
      // but we also verify with a known-bad value
      // Use a clearly invalid code format
      const result2 = await mfaAdapter.verifyMfa!('mfa-user-3', 'ABCDEF')
      expect(result2.verified).toBe(false)
    })

    it('should accept a backup code', async () => {
      const setup = await mfaAdapter.setupMfa!('mfa-user-4')

      // Use the first backup code
      const backupCode = setup.backupCodes[0]
      const result = await mfaAdapter.verifyMfa!('mfa-user-4', backupCode)

      expect(result.verified).toBe(true)
      expect(result.usedBackupCode).toBe(true)
    })

    it('should reject a reused backup code', async () => {
      const setup = await mfaAdapter.setupMfa!('mfa-user-5')

      const backupCode = setup.backupCodes[0]

      // First use — should succeed
      const result1 = await mfaAdapter.verifyMfa!('mfa-user-5', backupCode)
      expect(result1.verified).toBe(true)
      expect(result1.usedBackupCode).toBe(true)

      // Second use — should fail (code was consumed)
      const result2 = await mfaAdapter.verifyMfa!('mfa-user-5', backupCode)
      expect(result2.verified).toBe(false)
    })

    it('should allow using multiple different backup codes', async () => {
      const setup = await mfaAdapter.setupMfa!('mfa-user-6')

      // Use first backup code
      const result1 = await mfaAdapter.verifyMfa!('mfa-user-6', setup.backupCodes[0])
      expect(result1.verified).toBe(true)
      expect(result1.usedBackupCode).toBe(true)

      // Use second backup code
      const result2 = await mfaAdapter.verifyMfa!('mfa-user-6', setup.backupCodes[1])
      expect(result2.verified).toBe(true)
      expect(result2.usedBackupCode).toBe(true)

      // First is still consumed
      const result3 = await mfaAdapter.verifyMfa!('mfa-user-6', setup.backupCodes[0])
      expect(result3.verified).toBe(false)
    })

    it('should return verified: false for unknown user', async () => {
      const result = await mfaAdapter.verifyMfa!('nonexistent-user', '123456')
      expect(result.verified).toBe(false)
    })

    it('should verify TOTP independently from verifyTotp function', async () => {
      const setup = await mfaAdapter.setupMfa!('mfa-user-7')

      // Generate valid code using our helper
      const code = await generateCurrentTotp(setup.secret)

      // Verify using the exported verifyTotp directly
      const isValid = await verifyTotp(setup.secret, code)
      expect(isValid).toBe(true)

      // Verify using the adapter
      const adapterResult = await mfaAdapter.verifyMfa!('mfa-user-7', code)
      expect(adapterResult.verified).toBe(true)
    })
  })

  // ============================================================================
  // Adapter Configuration
  // ============================================================================

  describe('Adapter Configuration', () => {
    it('should report isConfigured: true when authInstance is provided', () => {
      const configured = createNextAuthAdapter({
        authInstance: async () => null,
      })
      expect(configured.isConfigured()).toBe(true)
    })

    it('should report isConfigured: false when authInstance is not provided', () => {
      const unconfigured = createNextAuthAdapter({})
      expect(unconfigured.isConfigured()).toBe(false)
    })

    it('should have correct name and version', () => {
      const adapter = createNextAuthAdapter({})
      expect(adapter.name).toBe('nextauth')
      expect(adapter.version).toBe('1.0.0')
    })

    it('should list API keys for a user', async () => {
      const adapter = createNextAuthAdapter({})

      // Create multiple keys
      await adapter.createApiKey({ userId: 'user-1', name: 'Key A', scopes: ['read'] })
      await adapter.createApiKey({ userId: 'user-1', name: 'Key B', scopes: ['write'] })

      const keys = await adapter.listApiKeys('user-1')
      expect(keys.length).toBe(2)
    })
  })
})
