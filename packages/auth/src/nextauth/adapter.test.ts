import { describe, it, expect, vi } from 'vitest'
import { createNextAuthAdapter } from './adapter'

describe('createNextAuthAdapter', () => {
  it('should return an adapter with correct name and version', () => {
    const adapter = createNextAuthAdapter()
    expect(adapter.name).toBe('nextauth')
    expect(adapter.version).toBe('1.0.0')
  })

  it('should return an adapter with all required methods', () => {
    const adapter = createNextAuthAdapter()
    expect(typeof adapter.isConfigured).toBe('function')
    expect(typeof adapter.getSession).toBe('function')
    expect(typeof adapter.validateApiKey).toBe('function')
    expect(typeof adapter.createApiKey).toBe('function')
    expect(typeof adapter.revokeApiKey).toBe('function')
    expect(typeof adapter.listApiKeys).toBe('function')
    expect(typeof adapter.setupMfa).toBe('function')
    expect(typeof adapter.verifyMfa).toBe('function')
  })
})

describe('isConfigured', () => {
  it('should return false when no authInstance is provided', () => {
    const adapter = createNextAuthAdapter()
    expect(adapter.isConfigured()).toBe(false)
  })

  it('should return false when config is empty', () => {
    const adapter = createNextAuthAdapter({})
    expect(adapter.isConfigured()).toBe(false)
  })

  it('should return true when authInstance is provided', () => {
    const mockAuth = async () => ({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })
    const adapter = createNextAuthAdapter({ authInstance: mockAuth })
    expect(adapter.isConfigured()).toBe(true)
  })
})

describe('getSession', () => {
  it('should return null when not configured (no authInstance)', async () => {
    const adapter = createNextAuthAdapter()
    const session = await adapter.getSession()
    expect(session).toBeNull()
  })

  it('should return session data when authInstance returns a valid session', async () => {
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
    expect(session!.image).toBe('https://example.com/avatar.png')
    expect(session!.role).toBe('admin')
    expect(session!.expiresAt).toBeInstanceOf(Date)
  })

  it('should use email as userId when id is not provided', async () => {
    const mockAuth = async () => ({
      user: {
        email: 'fallback@example.com',
        name: 'Fallback User',
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })
    const adapter = createNextAuthAdapter({ authInstance: mockAuth })
    const session = await adapter.getSession()

    expect(session).not.toBeNull()
    expect(session!.userId).toBe('fallback@example.com')
  })

  it('should return null when authInstance returns null', async () => {
    const mockAuth = async () => null
    const adapter = createNextAuthAdapter({ authInstance: mockAuth })
    const session = await adapter.getSession()
    expect(session).toBeNull()
  })

  it('should return null when authInstance returns session without user', async () => {
    const mockAuth = async () => ({
      expires: new Date(Date.now() + 86400000).toISOString(),
    })
    const adapter = createNextAuthAdapter({ authInstance: mockAuth })
    const session = await adapter.getSession()
    expect(session).toBeNull()
  })

  it('should return null when authInstance throws', async () => {
    const mockAuth = async () => {
      throw new Error('Auth service unavailable')
    }
    const adapter = createNextAuthAdapter({ authInstance: mockAuth })
    const session = await adapter.getSession()
    expect(session).toBeNull()
  })

  it('should set expiresAt to undefined when expires is not provided', async () => {
    const mockAuth = async () => ({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test' },
    })
    const adapter = createNextAuthAdapter({ authInstance: mockAuth })
    const session = await adapter.getSession()

    expect(session).not.toBeNull()
    expect(session!.expiresAt).toBeUndefined()
  })

  it('should include user object as metadata', async () => {
    const userObj = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      customField: 'custom-value',
    }
    const mockAuth = async () => ({ user: userObj })
    const adapter = createNextAuthAdapter({ authInstance: mockAuth })
    const session = await adapter.getSession()

    expect(session).not.toBeNull()
    expect(session!.metadata).toEqual(userObj)
  })
})

describe('createApiKey', () => {
  it('should generate a key and return id, key, and prefix', async () => {
    const adapter = createNextAuthAdapter()
    const result = await adapter.createApiKey({
      userId: 'user-1',
      name: 'Test Key',
      scopes: ['read', 'write'],
    })

    expect(result.id).toBeDefined()
    expect(typeof result.id).toBe('string')
    expect(result.key).toMatch(/^fabrk_live_/)
    expect(result.prefix).toMatch(/^fabrk_live_/)
  })

  it('should generate unique keys each time', async () => {
    const adapter = createNextAuthAdapter()
    const result1 = await adapter.createApiKey({
      userId: 'user-1',
      name: 'Key 1',
      scopes: ['read'],
    })
    const result2 = await adapter.createApiKey({
      userId: 'user-1',
      name: 'Key 2',
      scopes: ['read'],
    })

    expect(result1.id).not.toBe(result2.id)
    expect(result1.key).not.toBe(result2.key)
  })

  it('should store the key so it can be validated later', async () => {
    const adapter = createNextAuthAdapter()
    const result = await adapter.createApiKey({
      userId: 'user-1',
      name: 'Validate Test',
      scopes: ['read'],
    })

    const keyInfo = await adapter.validateApiKey(result.key)
    expect(keyInfo).not.toBeNull()
    expect(keyInfo!.id).toBe(result.id)
    expect(keyInfo!.name).toBe('Validate Test')
    expect(keyInfo!.scopes).toEqual(['read'])
    expect(keyInfo!.active).toBe(true)
  })
})

describe('validateApiKey', () => {
  it('should return null for an invalid key', async () => {
    const adapter = createNextAuthAdapter()
    const result = await adapter.validateApiKey('invalid_key_here')
    expect(result).toBeNull()
  })

  it('should return null for an empty string', async () => {
    const adapter = createNextAuthAdapter()
    const result = await adapter.validateApiKey('')
    expect(result).toBeNull()
  })

  it('should return key info for a valid key', async () => {
    const adapter = createNextAuthAdapter()
    const created = await adapter.createApiKey({
      userId: 'user-1',
      name: 'Valid Key',
      scopes: ['read', 'write'],
    })

    const keyInfo = await adapter.validateApiKey(created.key)
    expect(keyInfo).not.toBeNull()
    expect(keyInfo!.prefix).toBe(created.prefix)
    expect(keyInfo!.scopes).toEqual(['read', 'write'])
  })
})

describe('revokeApiKey', () => {
  it('should revoke a key so it can no longer be validated', async () => {
    const adapter = createNextAuthAdapter()
    const created = await adapter.createApiKey({
      userId: 'user-1',
      name: 'Revoke Test',
      scopes: ['read'],
    })

    // Key should work before revocation
    const beforeRevoke = await adapter.validateApiKey(created.key)
    expect(beforeRevoke).not.toBeNull()

    // Revoke the key
    await adapter.revokeApiKey(created.id)

    // Key should no longer validate
    const afterRevoke = await adapter.validateApiKey(created.key)
    expect(afterRevoke).toBeNull()
  })

  it('should not throw when revoking a non-existent key', async () => {
    const adapter = createNextAuthAdapter()
    await expect(adapter.revokeApiKey('non-existent-id')).resolves.toBeUndefined()
  })
})

describe('listApiKeys', () => {
  it('should return active keys', async () => {
    const adapter = createNextAuthAdapter()

    await adapter.createApiKey({
      userId: 'user-1',
      name: 'Key A',
      scopes: ['read'],
    })
    await adapter.createApiKey({
      userId: 'user-1',
      name: 'Key B',
      scopes: ['write'],
    })

    const keys = await adapter.listApiKeys('user-1')
    expect(keys).toHaveLength(2)
    expect(keys.map((k) => k.name)).toContain('Key A')
    expect(keys.map((k) => k.name)).toContain('Key B')
  })

  it('should not include revoked keys', async () => {
    const adapter = createNextAuthAdapter()

    const created = await adapter.createApiKey({
      userId: 'user-1',
      name: 'To Revoke',
      scopes: ['read'],
    })
    await adapter.createApiKey({
      userId: 'user-1',
      name: 'Keep Active',
      scopes: ['read'],
    })

    await adapter.revokeApiKey(created.id)

    const keys = await adapter.listApiKeys('user-1')
    expect(keys).toHaveLength(1)
    expect(keys[0].name).toBe('Keep Active')
  })

  it('should return empty array when no keys exist', async () => {
    const adapter = createNextAuthAdapter()
    const keys = await adapter.listApiKeys('user-with-no-keys')
    expect(keys).toEqual([])
  })
})

describe('setupMfa', () => {
  it('should return secret, qrCodeUrl, and backupCodes', async () => {
    const adapter = createNextAuthAdapter()
    const result = await adapter.setupMfa!('user-1')

    expect(result.secret).toBeDefined()
    expect(typeof result.secret).toBe('string')
    expect(result.secret.length).toBeGreaterThan(0)

    expect(result.qrCodeUrl).toMatch(/^otpauth:\/\/totp\//)
    expect(result.qrCodeUrl).toContain(result.secret)

    expect(Array.isArray(result.backupCodes)).toBe(true)
    expect(result.backupCodes).toHaveLength(10)
  })

  it('should include userId in the QR code URL', async () => {
    const adapter = createNextAuthAdapter()
    const result = await adapter.setupMfa!('user@example.com')

    expect(result.qrCodeUrl).toContain(encodeURIComponent('user@example.com'))
  })

  it('should use signIn page config as issuer when provided', async () => {
    const adapter = createNextAuthAdapter({ pages: { signIn: 'My Custom App' } })
    const result = await adapter.setupMfa!('user-1')

    expect(result.qrCodeUrl).toContain(encodeURIComponent('My Custom App'))
  })

  it('should use default issuer when signIn page not configured', async () => {
    const adapter = createNextAuthAdapter()
    const result = await adapter.setupMfa!('user-1')

    expect(result.qrCodeUrl).toContain('FABRK%20App')
  })

  it('should generate different secrets for different users', async () => {
    const adapter = createNextAuthAdapter()
    const result1 = await adapter.setupMfa!('user-1')
    const result2 = await adapter.setupMfa!('user-2')

    expect(result1.secret).not.toBe(result2.secret)
  })

  it('should generate backup codes in XXXX-XXXX format', async () => {
    const adapter = createNextAuthAdapter()
    const result = await adapter.setupMfa!('user-1')

    for (const code of result.backupCodes) {
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)
    }
  })
})

describe('verifyMfa', () => {
  it('should return verified: false when MFA not set up for user', async () => {
    const adapter = createNextAuthAdapter()
    const result = await adapter.verifyMfa!('unknown-user', '123456')
    expect(result.verified).toBe(false)
  })

  it('should reject an incorrect TOTP code', async () => {
    const adapter = createNextAuthAdapter()
    await adapter.setupMfa!('user-1')

    const result = await adapter.verifyMfa!('user-1', '000000')
    // Very high probability this is wrong
    expect(result.verified).toBe(false)
  })

  it('should verify a correct TOTP code', async () => {
    const adapter = createNextAuthAdapter()
    const setup = await adapter.setupMfa!('user-1')

    // Compute the correct TOTP code from the secret
    const code = await computeCurrentTotp(setup.secret)
    const result = await adapter.verifyMfa!('user-1', code)

    expect(result.verified).toBe(true)
    expect(result.usedBackupCode).toBe(false)
  })

  it('should verify a valid backup code', async () => {
    const adapter = createNextAuthAdapter()
    const setup = await adapter.setupMfa!('user-1')

    const backupCode = setup.backupCodes[0]
    const result = await adapter.verifyMfa!('user-1', backupCode)

    expect(result.verified).toBe(true)
    expect(result.usedBackupCode).toBe(true)
  })

  it('should not allow reuse of a consumed backup code', async () => {
    const adapter = createNextAuthAdapter()
    const setup = await adapter.setupMfa!('user-1')

    const backupCode = setup.backupCodes[0]

    // First use should succeed
    const first = await adapter.verifyMfa!('user-1', backupCode)
    expect(first.verified).toBe(true)

    // Second use should fail
    const second = await adapter.verifyMfa!('user-1', backupCode)
    expect(second.verified).toBe(false)
  })

  it('should allow using different backup codes', async () => {
    const adapter = createNextAuthAdapter()
    const setup = await adapter.setupMfa!('user-1')

    const result1 = await adapter.verifyMfa!('user-1', setup.backupCodes[0])
    expect(result1.verified).toBe(true)

    const result2 = await adapter.verifyMfa!('user-1', setup.backupCodes[1])
    expect(result2.verified).toBe(true)
  })

  it('should reject a backup code from a different user', async () => {
    const adapter = createNextAuthAdapter()
    const setup1 = await adapter.setupMfa!('user-1')
    await adapter.setupMfa!('user-2')

    // user-1's backup code should not work for user-2
    const result = await adapter.verifyMfa!('user-2', setup1.backupCodes[0])
    expect(result.verified).toBe(false)
  })
})

// ============================================================================
// Helper: Compute current TOTP for testing
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
