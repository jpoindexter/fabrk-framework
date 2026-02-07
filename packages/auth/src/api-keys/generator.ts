/**
 * API Key Generator
 *
 * Generates secure API keys in the format: fabrk_live_xxxxx
 * Keys are hashed with SHA-256 before storage — the raw key
 * is only returned once at creation time.
 *
 * @example
 * ```ts
 * import { generateApiKey, hashApiKey } from '@fabrk/auth'
 *
 * const { key, prefix, hash } = await generateApiKey({ prefix: 'fabrk', environment: 'live' })
 * // key:    "fabrk_live_a1b2c3d4e5f6..."
 * // prefix: "fabrk_live_a1b2c3"
 * // hash:   "sha256:..."
 * ```
 */

import type { ApiKeyGeneratorConfig } from '../types'

/**
 * Generate a cryptographically secure API key
 */
export async function generateApiKey(
  config: ApiKeyGeneratorConfig = {}
): Promise<{ key: string; prefix: string; hash: string }> {
  const {
    prefix = 'fabrk',
    environment = 'live',
    keyLength = 32,
  } = config

  // Generate random bytes
  const bytes = new Uint8Array(keyLength)
  crypto.getRandomValues(bytes)

  // Encode as base62 (alphanumeric)
  const randomPart = base62Encode(bytes)

  // Build the full key
  const key = `${prefix}_${environment}_${randomPart}`

  // Create display prefix (first 6 chars of random part)
  const displayPrefix = `${prefix}_${environment}_${randomPart.slice(0, 6)}`

  // Hash for storage
  const hash = await hashApiKey(key)

  return { key, prefix: displayPrefix, hash }
}

/**
 * Hash an API key using SHA-256
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return `sha256:${hashHex}`
}

/**
 * Base62 encode a Uint8Array
 */
function base62Encode(bytes: Uint8Array): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  let result = ''
  for (const byte of bytes) {
    result += chars[byte % 62]
  }
  return result
}
