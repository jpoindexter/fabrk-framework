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

export function createUpstashRateLimiter(
  config: UpstashRateLimitConfig
): RateLimitAdapter {
  const { defaultMax = 100, defaultWindowSeconds = 60, failOpen = false } = config

  async function redisCommand(command: string[]): Promise<any> {
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

    const results = await response.json()
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
      const key = `fabrk:rl:${options.identifier}:${options.limit}`
      const now = Date.now()

      // Atomic INCR + conditional EXPIRE via Lua script to avoid race conditions
      const luaScript = `
        local count = redis.call('INCR', KEYS[1])
        if count == 1 then
          redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
        end
        local ttl = redis.call('TTL', KEYS[1])
        return {count, ttl}
      `
      const response = await fetch(`${config.url}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['EVAL', luaScript, '1', key, windowSeconds.toString()],
        ]),
      })

      if (!response.ok) {
        if (failOpen) {
          return {
            allowed: true,
            remaining: max,
            limit: max,
            resetAt: new Date(now + windowSeconds * 1000),
          }
        }
        return {
          allowed: false,
          remaining: 0,
          limit: max,
          resetAt: new Date(now + windowSeconds * 1000),
        }
      }

      const results = await response.json()
      const evalResult = results[0]?.result ?? [1, windowSeconds]
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
    },

    async reset(identifier: string, limit: string): Promise<void> {
      const key = `fabrk:rl:${identifier}:${limit}`
      await redisCommand(['DEL', key])
    },
  }
}
