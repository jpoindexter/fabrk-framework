/**
 * In-Memory Rate Limiter
 *
 * Simple sliding window rate limiter using in-memory storage.
 * Suitable for single-server deployments and development.
 *
 * @example
 * ```ts
 * import { createMemoryRateLimiter } from '@fabrk/security'
 *
 * const rateLimit = createMemoryRateLimiter({
 *   defaultMax: 100,
 *   defaultWindowSeconds: 60,
 * })
 *
 * registry.register('rateLimit', rateLimit)
 * ```
 */

import type { RateLimitAdapter, RateLimitOptions, RateLimitResult } from '@fabrk/core'
import type { MemoryRateLimitConfig } from '../types'
import { sanitizeKeyPart } from './utils'

interface WindowEntry {
  count: number
  resetAt: number
}

export function createMemoryRateLimiter(
  config: MemoryRateLimitConfig = {}
): RateLimitAdapter {
  const { defaultMax = 100, defaultWindowSeconds = 60, maxEntries = 10_000 } = config

  // Map<"identifier:limit", WindowEntry>
  const windows = new Map<string, WindowEntry>()

  function pruneExpired(): void {
    const now = Date.now()
    for (const [key, entry] of windows) {
      if (entry.resetAt < now) {
        windows.delete(key)
      }
    }

    // If still over maxEntries after expiry cleanup, evict oldest entries (FIFO via Map insertion order)
    if (windows.size > maxEntries) {
      const excess = windows.size - maxEntries
      const keys = windows.keys()
      for (let i = 0; i < excess; i++) {
        const next = keys.next()
        if (!next.done) {
          windows.delete(next.value)
        }
      }
    }
  }

  const cleanupInterval = setInterval(() => {
    pruneExpired()
  }, 60_000)

  // Prevent interval from keeping the process alive
  if (typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
    cleanupInterval.unref()
  }

  return {
    name: 'memory-rate-limit',
    version: '1.0.0',

    isConfigured(): boolean {
      return true
    },

    async destroy() {
      clearInterval(cleanupInterval)
      windows.clear()
    },

    async check(options: RateLimitOptions): Promise<RateLimitResult> {
      const max = options.max ?? defaultMax
      const windowSeconds = options.windowSeconds ?? defaultWindowSeconds
      const key = `${sanitizeKeyPart(options.identifier)}:${sanitizeKeyPart(options.limit)}`
      const now = Date.now()

      let entry = windows.get(key)

      if (!entry || entry.resetAt < now) {
        if (!entry && windows.size >= maxEntries) {
          pruneExpired()
        }

        entry = {
          count: 0,
          resetAt: now + windowSeconds * 1000,
        }
        windows.set(key, entry)
      }

      entry.count++

      const allowed = entry.count <= max
      const remaining = Math.max(0, max - entry.count)
      const resetAt = new Date(entry.resetAt)

      return {
        allowed,
        remaining,
        limit: max,
        resetAt,
        retryAfter: allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000),
      }
    },

    async reset(identifier: string, limit: string): Promise<void> {
      windows.delete(`${sanitizeKeyPart(identifier)}:${sanitizeKeyPart(limit)}`)
    },
  }
}
