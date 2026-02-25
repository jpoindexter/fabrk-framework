/**
 * TOTP (Time-based One-Time Password) Implementation
 *
 * RFC 6238 compliant TOTP generation and verification.
 * Uses Web Crypto API — no Node.js-specific dependencies.
 *
 * @example
 * ```ts
 * import { generateTotpSecret, verifyTotp, generateTotpUri } from '@fabrk/auth'
 *
 * // Setup
 * const secret = generateTotpSecret()
 * const uri = generateTotpUri(secret, 'user@example.com', 'MyApp')
 * // Display URI as QR code
 *
 * // Verification
 * const valid = await verifyTotp(secret, '123456')
 * ```
 */

import { timingSafeEqual } from '../crypto-utils'

/**
 * Generate a random TOTP secret (base32 encoded)
 */
export function generateTotpSecret(length: number = 20): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return base32Encode(bytes)
}

/**
 * Generate a TOTP URI for QR code display
 */
export function generateTotpUri(
  secret: string,
  email: string,
  issuer: string
): string {
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedEmail = encodeURIComponent(email)
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`
}

/**
 * Verify a TOTP code against a secret
 *
 * Checks the current time step and one step before/after
 * to account for clock skew.
 */
export async function verifyTotp(
  secret: string,
  code: string,
  options?: { window?: number }
): Promise<boolean> {
  const window = options?.window ?? 1
  const now = Math.floor(Date.now() / 1000)
  const timeStep = 30

  for (let i = -window; i <= window; i++) {
    const counter = Math.floor((now + i * timeStep) / timeStep)
    const expected = await generateHotp(secret, counter)
    if (timingSafeEqual(expected, code)) {
      return true
    }
  }

  return false
}

/**
 * Generate an HOTP code from a secret and counter
 */
async function generateHotp(secret: string, counter: number): Promise<string> {
  const secretBytes = base32Decode(secret)

  // Import key for HMAC-SHA1
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )

  // Convert counter to 8-byte big-endian buffer
  const counterBytes = new ArrayBuffer(8)
  const view = new DataView(counterBytes)
  view.setBigUint64(0, BigInt(counter))

  // HMAC-SHA1
  const hmac = await crypto.subtle.sign('HMAC', key, counterBytes)
  const hmacBytes = new Uint8Array(hmac)

  // Dynamic truncation (RFC 4226)
  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f
  const code =
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff)

  // 6-digit code
  return (code % 1_000_000).toString().padStart(6, '0')
}

// ============================================================================
// BASE32 ENCODING/DECODING
// ============================================================================

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let result = ''

  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8

    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 0x1f]
      bits -= 5
    }
  }

  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 0x1f]
  }

  return result
}

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
