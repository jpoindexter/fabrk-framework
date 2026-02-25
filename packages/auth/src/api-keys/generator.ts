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

const MIN_KEY_LENGTH = 16

export async function generateApiKey(
  config: ApiKeyGeneratorConfig = {}
): Promise<{ key: string; prefix: string; hash: string }> {
  const {
    prefix = 'fabrk',
    environment = 'live',
    keyLength = 32,
  } = config

  if (keyLength < MIN_KEY_LENGTH) {
    throw new Error(
      `API key length must be at least ${MIN_KEY_LENGTH} bytes, got ${keyLength}`
    )
  }

  const bytes = new Uint8Array(keyLength)
  crypto.getRandomValues(bytes)

  const randomPart = base62Encode(bytes)
  const key = `${prefix}_${environment}_${randomPart}`
  const displayPrefix = `${prefix}_${environment}_${randomPart.slice(0, 6)}`
  const hash = await hashApiKey(key)

  return { key, prefix: displayPrefix, hash }
}

export async function hashApiKey(key: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `sha256:${hashHex}`
}

/**
 * Base62 encode using rejection sampling to eliminate modulo bias.
 * Discards byte values >= 248 (largest multiple of 62 under 256)
 * to ensure uniform distribution across all 62 characters.
 */
function base62Encode(bytes: Uint8Array): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  const limit = 248 // 62 * 4 = 248 — largest multiple of 62 that fits in a byte
  let result = ''
  let i = 0

  while (result.length < bytes.length) {
    if (i >= bytes.length) {
      // Need more random bytes — generate a fresh batch
      const extra = new Uint8Array(bytes.length - result.length + 16)
      crypto.getRandomValues(extra)
      for (const b of extra) {
        if (b < limit && result.length < bytes.length) {
          result += chars[b % 62]
        }
      }
    } else if (bytes[i] < limit) {
      result += chars[bytes[i] % 62]
      i++
    } else {
      i++ // reject biased byte
    }
  }

  return result
}
