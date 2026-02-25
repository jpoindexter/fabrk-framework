/**
 * Shared Cryptographic Utilities
 *
 * Constant-time comparison and other crypto primitives
 * used across security, auth, and payments packages.
 */

/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * Always iterates over the maximum length of both strings
 * to avoid leaking length information.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length)
  let result = a.length ^ b.length // non-zero if lengths differ

  for (let i = 0; i < maxLen; i++) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }

  return result === 0
}
