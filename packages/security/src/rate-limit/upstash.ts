/**
 * Upstash Redis Rate Limiter
 *
 * Distributed rate limiter using Upstash Redis.
 * Suitable for serverless and multi-server deployments.
 *
 * @example
 * ```ts
 * import { createUpstashRateLimiter } from '@fabrk/security'
 *
 * const rateLimit = createUpstashRateLimiter({
 *   url: process.env.UPSTASH_REDIS_REST_URL!,
 *   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
 * })
 *
 * registry.register('rateLimit', rateLimit)
 * ```
 */

import type { RateLimitAdapter, RateLimitOptions, RateLimitResult } from '@fabrk/core'
import type { UpstashRateLimitConfig } from '../types'
import { sanitizeKeyPart } from './utils'

export function createUpstashRateLimiter(
  config: UpstashRateLimitConfig
): RateLimitAdapter {
  const { defaultMax = 100, defaultWindowSeconds = 60, failOpen = false } = config

  async function redisCommand(command: string[]): Promise<unknown> {
    const response = await fetch(`${config.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([command]),
    })

    if (!response.ok) {
      throw new Error(`Upstash Redis error: ${response.status}`)
    }

    const results = (await response.json()) as Array<{ result?: unknown }>
    return results[0]?.result
  }

  return {
    name: 'upstash-rate-limit',
    version: '1.0.0',

    isConfigured(): boolean {
      return Boolean(config.url && config.token)
    },

    async check(options: RateLimitOptions): Promise<RateLimitResult> {
      const max = options.max ?? defaultMax
      const windowSeconds = options.windowSeconds ?? defaultWindowSeconds
      const key = `fabrk:rl:${sanitizeKeyPart(options.identifier)}:${sanitizeKeyPart(options.limit)}`
      const now = Date.now()

      const failResult = (allowed: boolean): RateLimitResult => ({
        allowed,
        remaining: allowed ? max : 0,
        limit: max,
        resetAt: new Date(now + windowSeconds * 1000),
      })

      try {
        // Atomic INCR + conditional EXPIRE via Lua script to avoid race conditions
        const luaScript = `
          local count = redis.call('INCR', KEYS[1])
          if count == 1 then
            redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
          end
          local ttl = redis.call('TTL', KEYS[1])
          return {count, ttl}
        `
        const evalResult = (await redisCommand([
          'EVAL', luaScript, '1', key, windowSeconds.toString(),
        ])) as number[] | null ?? [1, windowSeconds]
        const count = evalResult[0] ?? 1
        const ttl = evalResult[1] ?? windowSeconds

        const allowed = count <= max
        const remaining = Math.max(0, max - count)
        const resetAt = new Date(now + (ttl > 0 ? ttl : windowSeconds) * 1000)

        return {
          allowed,
          remaining,
          limit: max,
          resetAt,
          retryAfter: allowed ? undefined : ttl > 0 ? ttl : windowSeconds,
        }
      } catch {
        /** @security Network errors (DNS, timeout, parse) are caught here. failOpen controls whether to allow or deny when Redis is unreachable. */
        return failResult(failOpen)
      }
    },

    async reset(identifier: string, limit: string): Promise<void> {
      const key = `fabrk:rl:${sanitizeKeyPart(identifier)}:${sanitizeKeyPart(limit)}`
      await redisCommand(['DEL', key])
    },
  }
}
