/**
 * Timing-safe string comparison using Web Crypto HMAC-SHA256.
 *
 * Signs both inputs with a fresh per-call HMAC key, then XORs the resulting
 * signatures. The HMAC operation runs in native code (Web Crypto) and is not
 * subject to JS JIT optimisation, making this resistant to timing attacks.
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
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

  let diff = 0
  for (let i = 0; i < dA.length; i++) diff |= dA[i] ^ dB[i]
  diff |= a.length ^ b.length

  return diff === 0
}

/** Convert a Uint8Array to a hex string. */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Generate a cryptographically random hex string of the given byte length. */
export function generateRandomHex(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

/** SHA-256 hash a string and return the hex digest. */
export async function hashPayload(payload: string): Promise<string> {
  const data = new TextEncoder().encode(payload)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(hash))
}
