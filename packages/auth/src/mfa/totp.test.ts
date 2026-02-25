import { describe, it, expect } from 'vitest'
import { generateTotpSecret, generateTotpUri, verifyTotp } from './totp'

describe('generateTotpSecret', () => {
  it('should return a 32-char base32-encoded string for default 20 bytes', () => {
    const secret = generateTotpSecret()
    expect(secret).toMatch(/^[A-Z2-7]+$/)
    expect(secret).toHaveLength(32)
  })

  it('should generate unique secrets', () => {
    const secrets = new Set(Array.from({ length: 20 }, () => generateTotpSecret()))
    expect(secrets.size).toBe(20)
  })
})

describe('generateTotpUri', () => {
  it('should produce a valid otpauth URI with correct parameters', () => {
    const uri = generateTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com', 'MyApp')
    expect(uri).toMatch(/^otpauth:\/\/totp\//)
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP')
    expect(uri).toContain('issuer=MyApp')
    expect(uri).toContain('algorithm=SHA1')
    expect(uri).toContain('digits=6')
    expect(uri).toContain('period=30')
  })

  it('should produce the exact expected format', () => {
    expect(generateTotpUri('ABCDEFGH', 'alice@test.com', 'TestApp')).toBe(
      'otpauth://totp/TestApp:alice%40test.com?secret=ABCDEFGH&issuer=TestApp&algorithm=SHA1&digits=6&period=30'
    )
  })

  it('should URL-encode issuer and email with special characters', () => {
    const uri = generateTotpUri('JBSWY3DPEHPK3PXP', 'user+test@example.com', 'My App & Co')
    expect(uri).toContain(encodeURIComponent('My App & Co'))
    expect(uri).toContain(encodeURIComponent('user+test@example.com'))
  })
})

describe('verifyTotp', () => {
  it('should reject invalid codes (non-numeric, empty, wrong length)', async () => {
    const secret = generateTotpSecret()
    expect(await verifyTotp(secret, 'abcdef')).toBe(false)
    expect(await verifyTotp(secret, '')).toBe(false)
    expect(await verifyTotp(secret, '123')).toBe(false)
    expect(await verifyTotp(secret, '12345678')).toBe(false)
  })

  it('should verify a code generated from the same secret and current time', async () => {
    const secret = generateTotpSecret()
    const counter = Math.floor(Math.floor(Date.now() / 1000) / 30)
    const code = await computeHotpForTest(secret, counter)

    expect(await verifyTotp(secret, code)).toBe(true)
  })

  it('should reject a code from far outside the window', async () => {
    const secret = generateTotpSecret()
    const counter = Math.floor(Math.floor(Date.now() / 1000) / 30) + 100
    const code = await computeHotpForTest(secret, counter)

    expect(await verifyTotp(secret, code)).toBe(false)
  })

  it('should return false for different secrets with same time', async () => {
    const secret1 = generateTotpSecret()
    const secret2 = generateTotpSecret()
    const counter = Math.floor(Math.floor(Date.now() / 1000) / 30)
    const code = await computeHotpForTest(secret1, counter)

    expect(await verifyTotp(secret2, code)).toBe(false)
  })
})

// Helper: Compute HOTP for testing

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
  const key = await crypto.subtle.importKey('raw', secretBytes.buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])

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
