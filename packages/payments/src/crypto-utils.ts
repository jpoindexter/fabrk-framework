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
