/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest'
import { createNextAuthAdapter } from '../nextauth/adapter'
import { withApiKey, withAuth } from '../middleware'
import type { AuthAdapter } from '@fabrk/core'

// Helper: generate a valid TOTP code from a secret at the current time step

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
  new DataView(counterBytes).setBigUint64(0, BigInt(counter))
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
  return generateHotp(secret, Math.floor(Math.floor(Date.now() / 1000) / 30))
}

describe('Auth + Middleware Integration', () => {
  let adapter: AuthAdapter

  describe('API Key Flow', () => {
    beforeEach(() => {
      adapter = createNextAuthAdapter({
        authInstance: async () => ({
          user: { id: 'user-123', email: 'test@example.com', name: 'Test User', role: 'admin' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      })
    })

    it('should create key, validate via middleware, and reject after revocation', async () => {
      const result = await adapter.createApiKey({
        userId: 'user-123',
        name: 'Test API Key',
        scopes: ['read', 'write'],
      })
      expect(result.key).toContain('fabrk_live_')

      let receivedKeyInfo: any = null
      const handler = withApiKey(adapter, async (_req, keyInfo) => {
        receivedKeyInfo = keyInfo
        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      // Valid key works
      const req = new Request('https://example.com/api/data', {
        headers: { Authorization: `Bearer ${result.key}` },
      })
      const res = await handler(req)
      expect(res.status).toBe(200)
      expect(receivedKeyInfo.id).toBe(result.id)
      expect(receivedKeyInfo.scopes).toEqual(['read', 'write'])

      // Revoke, then reject
      await adapter.revokeApiKey(result.id)
      const res2 = await handler(new Request('https://example.com/api/data', {
        headers: { Authorization: `Bearer ${result.key}` },
      }))
      expect(res2.status).toBe(401)
    })

    it('should return 401 for invalid/missing API key', async () => {
      const handler = withApiKey(adapter, async () =>
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )

      const invalidRes = await handler(new Request('https://example.com/api', {
        headers: { Authorization: 'Bearer fabrk_live_invalid_key_here' },
      }))
      expect(invalidRes.status).toBe(401)

      const missingRes = await handler(new Request('https://example.com/api'))
      expect(missingRes.status).toBe(401)
    })

    it('should enforce required scopes and allow wildcard', async () => {
      const limitedKey = await adapter.createApiKey({ userId: 'user-123', name: 'Limited', scopes: ['read'] })
      const adminKey = await adapter.createApiKey({ userId: 'user-123', name: 'Admin', scopes: ['*'] })

      const handler = withApiKey(adapter, async () =>
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
        { requiredScopes: ['write', 'admin'] }
      )

      const limitedRes = await handler(new Request('https://example.com/api', {
        headers: { Authorization: `Bearer ${limitedKey.key}` },
      }))
      expect(limitedRes.status).toBe(403)

      const adminRes = await handler(new Request('https://example.com/api', {
        headers: { Authorization: `Bearer ${adminKey.key}` },
      }))
      expect(adminRes.status).toBe(200)
    })
  })

  describe('Session Auth Middleware', () => {
    it('should allow authenticated and reject unauthenticated', async () => {
      const authedAdapter = createNextAuthAdapter({
        authInstance: async () => ({
          user: { id: 'user-456', email: 'authed@example.com', name: 'Authed User' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      })

      let receivedSession: any = null
      const handler = withAuth(authedAdapter, async (_req, session) => {
        receivedSession = session
        return new Response(JSON.stringify({ userId: session.userId }), { status: 200 })
      })

      const authedRes = await handler(new Request('https://example.com/api/me'))
      expect(authedRes.status).toBe(200)
      expect(receivedSession.userId).toBe('user-456')

      // No session → 401
      const noAuthHandler = withAuth(
        createNextAuthAdapter({ authInstance: async () => null }),
        async (_req, session) => new Response(JSON.stringify({ userId: session.userId }), { status: 200 })
      )
      const noAuthRes = await noAuthHandler(new Request('https://example.com/api/me'))
      expect(noAuthRes.status).toBe(401)
    })
  })

  describe('MFA Flow', () => {
    let mfaAdapter: AuthAdapter

    beforeEach(() => {
      mfaAdapter = createNextAuthAdapter({
        authInstance: async () => ({ user: { id: 'mfa-user', email: 'mfa@example.com' } }),
      })
    })

    it('should setup MFA and verify TOTP', async () => {
      const setup = await mfaAdapter.setupMfa!('mfa-user-1')
      expect(setup.secret.length).toBeGreaterThan(0)
      expect(setup.qrCodeUrl).toContain('otpauth://totp/')
      expect(setup.backupCodes).toHaveLength(10)

      const validCode = await generateCurrentTotp(setup.secret)
      const result = await mfaAdapter.verifyMfa!('mfa-user-1', validCode)
      expect(result.verified).toBe(true)
      expect(result.usedBackupCode).toBe(false)
    })

    it('should accept backup code and prevent reuse', async () => {
      const setup = await mfaAdapter.setupMfa!('mfa-user-2')

      const r1 = await mfaAdapter.verifyMfa!('mfa-user-2', setup.backupCodes[0])
      expect(r1.verified).toBe(true)
      expect(r1.usedBackupCode).toBe(true)

      const r2 = await mfaAdapter.verifyMfa!('mfa-user-2', setup.backupCodes[0])
      expect(r2.verified).toBe(false)
    })

    it('should return verified: false for unknown user', async () => {
      const result = await mfaAdapter.verifyMfa!('nonexistent-user', '123456')
      expect(result.verified).toBe(false)
    })
  })
})
