import { timingSafeEqual, bytesToHex } from '@fabrk/core'

/**
 * TOTP replay protection: recently used codes are cached to prevent reuse
 * within the same time window. Each entry stores the expiry timestamp.
 *
 * Key format: "secretHash:code" to scope per-secret without exposing raw secret material.
 * Cleanup runs on each verification to prevent unbounded growth.
 *
 * @remarks **Serverless warning:** This in-process replay-protection store provides
 * NO protection across cold starts on serverless platforms (Vercel, AWS Lambda, etc.).
 * Each cold start gets a fresh empty map. For production serverless deployments,
 * inject a persistent store for replay tracking (Redis, database).
 *
 * In-process protection works for long-running servers (traditional Node.js).
 */
const usedCodes = new Map<string, number>()
const USED_CODE_MAX_ENTRIES = 10_000

function pruneUsedCodes(): void {
  const now = Date.now()
  for (const [key, expiresAt] of usedCodes) {
    if (expiresAt < now) {
      usedCodes.delete(key)
    }
  }
}

export function generateTotpSecret(length: number = 20): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return base32Encode(bytes)
}

export function generateTotpUri(
  secret: string,
  email: string,
  issuer: string
): string {
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedEmail = encodeURIComponent(email)
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`
}

export async function verifyTotp(
  secret: string,
  code: string,
  options?: { window?: number }
): Promise<boolean> {
  // Reject obviously invalid inputs before any cryptographic work.
  // TOTP codes are always exactly 6 decimal digits (RFC 4226 §5.3).
  // Reject non-numeric or wrong-length strings immediately to prevent:
  //   1. Unnecessary HMAC-SHA1 computation across the full window
  //   2. Large replay-protection Map entries for garbage inputs
  //   3. Misuse of this exported primitive without a brute-force guard
  if (!code || !/^\d{6}$/.test(code)) return false

  // Cap secret length to prevent base32Decode DoS on maliciously large inputs.
  // A legitimate TOTP secret is at most 160 chars (100 bytes base32-encoded).
  // Allow up to 512 chars to accommodate non-standard secrets while still
  // bounding memory/CPU usage.
  if (!secret || secret.length > 512) return false

  // Cap window to prevent excessively large search ranges that weaken TOTP security
  const safeWindow = Math.min(options?.window ?? 1, 5)
  const now = Math.floor(Date.now() / 1000)
  const timeStep = 30

  pruneUsedCodes()

  // Hash the secret to avoid exposing raw secret material in replay-detection Map keys.
  // Use the full 64-character SHA-256 hex digest — truncating to 16 chars (64-bit) would
  // create birthday-attack risk at scale (~2^32 operations for a 50% collision probability).
  const digestBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret)))
  const secretHash = bytesToHex(digestBytes)
  const replayKey = `${secretHash}:${code}`
  if (usedCodes.has(replayKey)) {
    return false
  }

  for (let i = -safeWindow; i <= safeWindow; i++) {
    const counter = Math.floor((now + i * timeStep) / timeStep)
    const expected = await generateHotp(secret, counter)
    if (await timingSafeEqual(expected, code)) {
      // Expire after the full window span to prevent reuse within the valid period.
      // The code is valid for (2 * safeWindow + 1) * timeStep seconds.
      const expiresInMs = (2 * safeWindow + 1) * timeStep * 1000
      usedCodes.set(replayKey, Date.now() + expiresInMs)

      if (usedCodes.size > USED_CODE_MAX_ENTRIES) {
        pruneUsedCodes()
      }

      return true
    }
  }

  return false
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

  // Dynamic truncation (RFC 4226)
  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f
  const code =
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff)

  return (code % 1_000_000).toString().padStart(6, '0')
}

// BASE32 ENCODING/DECODING

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
