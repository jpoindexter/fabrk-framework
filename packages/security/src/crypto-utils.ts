/**
 * Timing-safe string comparison using Web Crypto HMAC-SHA256.
 *
 * Signs both inputs with a fresh per-call HMAC key, then XORs the resulting
 * signatures. Because the key is freshly generated and never reused, an
 * attacker cannot distinguish a mismatch from a match via timing: the XOR
 * loop operates on 32-byte HMAC digests, not on the original values, so
 * early-exit behaviour in the loop does not reveal information about the
 * inputs themselves. The HMAC operation runs in native code (Web Crypto)
 * and is not subject to JS JIT optimisation.
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const bytesA = encoder.encode(a)
  const bytesB = encoder.encode(b)

  // A length difference is itself information — mask it by always running
  // both signs, then fold the length mismatch into the XOR result.
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

  // XOR the 32-byte HMAC digests. Both are always the same length (SHA-256
  // output is always 32 bytes), so the loop runs a fixed number of iterations.
  let diff = 0
  for (let i = 0; i < dA.length; i++) diff |= dA[i] ^ dB[i]

  // Also fold in the raw length difference so that strings of different
  // lengths are never reported equal even if (hypothetically) their digests
  // collided.
  diff |= a.length ^ b.length

  return diff === 0
}
