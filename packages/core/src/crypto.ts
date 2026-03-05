/**
 * Timing-safe string comparison using Web Crypto HMAC-SHA256.
 *
 * Signs both inputs with a fresh per-call HMAC key, then XORs the resulting
 * signatures. The HMAC operation runs in native code (Web Crypto) and is not
 * subject to JS JIT optimisation, making this resistant to timing attacks.
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  // Encode both strings. HMAC-SHA256 output is always 32 bytes regardless of
  // input length, so the XOR loop below runs in constant time. We do NOT
  // compare raw lengths here — that would be a side-channel: the HMAC
  // signatures already encode length differences in their output.
  const bytesA = encoder.encode(a)
  const bytesB = encoder.encode(b)

  const key = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, bytesA),
    crypto.subtle.sign('HMAC', key, bytesB),
  ])

  const dA = new Uint8Array(sigA)
  const dB = new Uint8Array(sigB)

  // dA and dB are always 32 bytes (SHA-256 HMAC output). The XOR of unequal
  // inputs produces a non-zero signature, so length differences are captured
  // here without a separate length comparison.
  let diff = 0
  for (let i = 0; i < dA.length; i++) diff |= dA[i] ^ dB[i]

  return diff === 0
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function generateRandomHex(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

export async function hashPayload(payload: string): Promise<string> {
  const data = new TextEncoder().encode(payload)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(hash))
}
