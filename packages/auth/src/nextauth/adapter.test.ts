/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from 'vitest'
import { createNextAuthAdapter } from './adapter'

describe('isConfigured', () => {
  it('should return false when no authInstance, true when provided', () => {
    expect(createNextAuthAdapter().isConfigured()).toBe(false)
    expect(createNextAuthAdapter({}).isConfigured()).toBe(false)

    const mockAuth = async () => ({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })
    expect(createNextAuthAdapter({ authInstance: mockAuth }).isConfigured()).toBe(true)
  })
})

describe('getSession', () => {
  it('should return null when not configured', async () => {
    const adapter = createNextAuthAdapter()
    expect(await adapter.getSession()).toBeNull()
  })

  it('should return mapped session data', async () => {
    const mockAuth = async () => ({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.png',
        role: 'admin',
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })
    const adapter = createNextAuthAdapter({ authInstance: mockAuth })
    const session = await adapter.getSession()

    expect(session).not.toBeNull()
    expect(session!.userId).toBe('user-1')
    expect(session!.email).toBe('test@example.com')
    expect(session!.name).toBe('Test User')
    expect(session!.role).toBe('admin')
    expect(session!.expiresAt).toBeInstanceOf(Date)
  })

  it('should use email as userId fallback', async () => {
    const mockAuth = async () => ({
      user: { email: 'fallback@example.com', name: 'Fallback User' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })
    const session = await createNextAuthAdapter({ authInstance: mockAuth }).getSession()
    expect(session!.userId).toBe('fallback@example.com')
  })

  it('should return null for null session, missing user, or error', async () => {
    expect(await createNextAuthAdapter({ authInstance: async () => null }).getSession()).toBeNull()
    expect(await createNextAuthAdapter({ authInstance: async () => ({ expires: '' }) }).getSession()).toBeNull()
    expect(await createNextAuthAdapter({ authInstance: async () => { throw new Error('fail') } }).getSession()).toBeNull()
  })

  it('should include user object as metadata', async () => {
    const userObj = { id: 'user-1', email: 'test@example.com', name: 'Test User', customField: 'custom-value' }
    const session = await createNextAuthAdapter({ authInstance: async () => ({ user: userObj }) }).getSession()
    expect(session!.metadata).toEqual(userObj)
  })
})

describe('API Key lifecycle', () => {
  it('should create, validate, and revoke keys', async () => {
    const adapter = createNextAuthAdapter()

    // Create
    const result = await adapter.createApiKey({ userId: 'user-1', name: 'Test Key', scopes: ['read', 'write'] })
    expect(result.key).toMatch(/^fabrk_live_/)
    expect(result.id).toBeDefined()

    // Validate
    const keyInfo = await adapter.validateApiKey(result.key)
    expect(keyInfo).not.toBeNull()
    expect(keyInfo!.id).toBe(result.id)
    expect(keyInfo!.name).toBe('Test Key')
    expect(keyInfo!.scopes).toEqual(['read', 'write'])
    expect(keyInfo!.active).toBe(true)

    // Revoke
    await adapter.revokeApiKey(result.id)
    expect(await adapter.validateApiKey(result.key)).toBeNull()
  })

  it('should return null for invalid keys', async () => {
    const adapter = createNextAuthAdapter()
    expect(await adapter.validateApiKey('invalid_key_here')).toBeNull()
    expect(await adapter.validateApiKey('')).toBeNull()
  })

  it('should list active keys and exclude revoked', async () => {
    const adapter = createNextAuthAdapter()
    const k1 = await adapter.createApiKey({ userId: 'user-1', name: 'Key A', scopes: ['read'] })
    await adapter.createApiKey({ userId: 'user-1', name: 'Key B', scopes: ['write'] })

    expect(await adapter.listApiKeys('user-1')).toHaveLength(2)

    await adapter.revokeApiKey(k1.id)
    const remaining = await adapter.listApiKeys('user-1')
    expect(remaining).toHaveLength(1)
    expect(remaining[0].name).toBe('Key B')
  })
})

describe('MFA', () => {
  it('should setup MFA with secret, QR URL, and backup codes', async () => {
    const adapter = createNextAuthAdapter()
    const result = await adapter.setupMfa!('user-1')

    expect(result.secret.length).toBeGreaterThan(0)
    expect(result.qrCodeUrl).toMatch(/^otpauth:\/\/totp\//)
    expect(result.qrCodeUrl).toContain(result.secret)
    expect(result.backupCodes).toHaveLength(10)
    for (const code of result.backupCodes) {
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)
    }
  })

  it('should verify correct TOTP code', async () => {
    const adapter = createNextAuthAdapter()
    const setup = await adapter.setupMfa!('user-1')
    const code = await computeCurrentTotp(setup.secret)
    const result = await adapter.verifyMfa!('user-1', code)
    expect(result.verified).toBe(true)
    expect(result.usedBackupCode).toBe(false)
  })

  it('should verify backup code and prevent reuse', async () => {
    const adapter = createNextAuthAdapter()
    const setup = await adapter.setupMfa!('user-1')

    const first = await adapter.verifyMfa!('user-1', setup.backupCodes[0])
    expect(first.verified).toBe(true)
    expect(first.usedBackupCode).toBe(true)

    const second = await adapter.verifyMfa!('user-1', setup.backupCodes[0])
    expect(second.verified).toBe(false)
  })

  it('should return verified: false for unknown user', async () => {
    const adapter = createNextAuthAdapter()
    expect((await adapter.verifyMfa!('unknown-user', '123456')).verified).toBe(false)
  })
})

// Helper: Compute current TOTP for testing

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

async function computeCurrentTotp(secret: string): Promise<string> {
  const secretBytes = base32Decode(secret)

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )

  const now = Math.floor(Date.now() / 1000)
  const counter = Math.floor(now / 30)

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
