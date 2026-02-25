/**
 * Constant-time string comparison to prevent timing attacks.
 * Iterates over the maximum length to avoid leaking length info.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length)
  let result = a.length ^ b.length

  for (let i = 0; i < maxLen; i++) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }

  return result === 0
}

/**
 * SHA-256 hash a string payload and return the hex digest.
 * Used for deriving deterministic event IDs when webhooks lack a native ID.
 */
export async function hashPayload(payload: string): Promise<string> {
  const data = new TextEncoder().encode(payload)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}
