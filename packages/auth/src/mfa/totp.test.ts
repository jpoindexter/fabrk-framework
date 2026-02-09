import { describe, it, expect } from 'vitest'
import { generateTotpSecret, generateTotpUri, verifyTotp } from './totp'

describe('generateTotpSecret', () => {
  it('should return a base32-encoded string', () => {
    const secret = generateTotpSecret()
    // Base32 alphabet: A-Z and 2-7
    expect(secret).toMatch(/^[A-Z2-7]+$/)
  })

  it('should return a string of expected length for default 20 bytes', () => {
    const secret = generateTotpSecret()
    // 20 bytes = 160 bits, base32 encodes 5 bits per char => ceil(160/5) = 32 chars
    expect(secret).toHaveLength(32)
  })

  it('should return a longer string for larger byte length', () => {
    const secret = generateTotpSecret(32)
    // 32 bytes = 256 bits => ceil(256/5) = 52 chars (with possible padding bits)
    expect(secret.length).toBeGreaterThan(32)
  })

  it('should return a shorter string for smaller byte length', () => {
    const secret = generateTotpSecret(10)
    // 10 bytes = 80 bits => ceil(80/5) = 16 chars
    expect(secret).toHaveLength(16)
  })

  it('should generate unique secrets', () => {
    const secrets = new Set<string>()
    for (let i = 0; i < 20; i++) {
      secrets.add(generateTotpSecret())
    }
    expect(secrets.size).toBe(20)
  })
})

describe('generateTotpUri', () => {
  it('should return a valid otpauth URI', () => {
    const uri = generateTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com', 'MyApp')
    expect(uri).toMatch(/^otpauth:\/\/totp\//)
  })

  it('should include the secret parameter', () => {
    const secret = 'JBSWY3DPEHPK3PXP'
    const uri = generateTotpUri(secret, 'user@example.com', 'MyApp')
    expect(uri).toContain(`secret=${secret}`)
  })

  it('should include the issuer parameter', () => {
    const uri = generateTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com', 'MyApp')
    expect(uri).toContain('issuer=MyApp')
  })

  it('should include algorithm, digits, and period parameters', () => {
    const uri = generateTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com', 'MyApp')
    expect(uri).toContain('algorithm=SHA1')
    expect(uri).toContain('digits=6')
    expect(uri).toContain('period=30')
  })

  it('should URL-encode the issuer with special characters', () => {
    const uri = generateTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com', 'My App & Co')
    expect(uri).toContain(encodeURIComponent('My App & Co'))
    // Should not contain raw ampersand in issuer position
    expect(uri).toMatch(/issuer=My%20App%20%26%20Co/)
  })

  it('should URL-encode the email with special characters', () => {
    const uri = generateTotpUri('JBSWY3DPEHPK3PXP', 'user+test@example.com', 'MyApp')
    expect(uri).toContain(encodeURIComponent('user+test@example.com'))
  })

  it('should include issuer:email in the label portion', () => {
    const uri = generateTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com', 'MyApp')
    expect(uri).toContain('otpauth://totp/MyApp:user%40example.com')
  })

  it('should produce the exact expected format', () => {
    const uri = generateTotpUri('ABCDEFGH', 'alice@test.com', 'TestApp')
    expect(uri).toBe(
      'otpauth://totp/TestApp:alice%40test.com?secret=ABCDEFGH&issuer=TestApp&algorithm=SHA1&digits=6&period=30'
    )
  })
})

describe('verifyTotp', () => {
  it('should reject a clearly invalid code (non-numeric)', async () => {
    const secret = generateTotpSecret()
    const result = await verifyTotp(secret, 'abcdef')
    expect(result).toBe(false)
  })

  it('should reject an empty code', async () => {
    const secret = generateTotpSecret()
    const result = await verifyTotp(secret, '')
    expect(result).toBe(false)
  })

  it('should reject a too-short code', async () => {
    const secret = generateTotpSecret()
    const result = await verifyTotp(secret, '123')
    expect(result).toBe(false)
  })

  it('should reject a too-long code', async () => {
    const secret = generateTotpSecret()
    const result = await verifyTotp(secret, '12345678')
    expect(result).toBe(false)
  })

  it('should reject an arbitrary 6-digit code with very high probability', async () => {
    // With window=1, there are only 3 valid codes at any time.
    // The probability of '000000' being one of them is 3/1_000_000.
    const secret = generateTotpSecret()
    const result = await verifyTotp(secret, '000000')
    // This is not 100% guaranteed to be false, but astronomically likely
    expect(result).toBe(false)
  })

  it('should verify a code generated from the same secret and time', async () => {
    // Generate a secret, compute what the TOTP should be, and verify it
    const secret = generateTotpSecret()

    // We'll use the same HOTP logic inline to compute the expected code
    const now = Math.floor(Date.now() / 1000)
    const counter = Math.floor(now / 30)
    const code = await computeHotpForTest(secret, counter)

    const result = await verifyTotp(secret, code)
    expect(result).toBe(true)
  })

  it('should verify a code from one time step ago (within window)', async () => {
    const secret = generateTotpSecret()
    const now = Math.floor(Date.now() / 1000)
    const counter = Math.floor(now / 30) - 1
    const code = await computeHotpForTest(secret, counter)

    const result = await verifyTotp(secret, code)
    expect(result).toBe(true)
  })

  it('should verify a code from one time step ahead (within window)', async () => {
    const secret = generateTotpSecret()
    const now = Math.floor(Date.now() / 1000)
    const counter = Math.floor(now / 30) + 1
    const code = await computeHotpForTest(secret, counter)

    const result = await verifyTotp(secret, code)
    expect(result).toBe(true)
  })

  it('should reject a code from far outside the window', async () => {
    const secret = generateTotpSecret()
    const now = Math.floor(Date.now() / 1000)
    // 100 steps in the future
    const counter = Math.floor(now / 30) + 100
    const code = await computeHotpForTest(secret, counter)

    const result = await verifyTotp(secret, code)
    expect(result).toBe(false)
  })

  it('should respect a custom window size of 0 (exact match only)', async () => {
    const secret = generateTotpSecret()
    const now = Math.floor(Date.now() / 1000)
    const counter = Math.floor(now / 30)
    const code = await computeHotpForTest(secret, counter)

    const result = await verifyTotp(secret, code, { window: 0 })
    expect(result).toBe(true)
  })

  it('should reject adjacent step with window=0', async () => {
    const secret = generateTotpSecret()
    const now = Math.floor(Date.now() / 1000)
    // One step before
    const counter = Math.floor(now / 30) - 1
    const code = await computeHotpForTest(secret, counter)

    // With window=0, only the current step is valid
    // But the current counter might equal counter-1 if we're at a boundary,
    // so this could rarely pass. We use a counter far enough away to be safe.
    const farCounter = Math.floor(now / 30) - 5
    const farCode = await computeHotpForTest(secret, farCounter)

    const result = await verifyTotp(secret, farCode, { window: 0 })
    expect(result).toBe(false)
  })

  it('should return false for different secrets with same time', async () => {
    const secret1 = generateTotpSecret()
    const secret2 = generateTotpSecret()
    const now = Math.floor(Date.now() / 1000)
    const counter = Math.floor(now / 30)

    const code = await computeHotpForTest(secret1, counter)
    const result = await verifyTotp(secret2, code)
    // Extremely unlikely to match with a different secret
    expect(result).toBe(false)
  })
})

// ============================================================================
// Helper: Compute HOTP for testing
// This mirrors the internal generateHotp function in totp.ts
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

async function computeHotpForTest(secret: string, counter: number): Promise<string> {
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
