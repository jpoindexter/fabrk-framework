/**
 * Shared Idempotency Cache
 *
 * Reusable bounded Set+queue for deduplicating webhook events
 * across all payment adapters (Stripe, Polar, Lemon Squeezy).
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

export interface IdempotencyCache {
  /** Returns true if the id was new (first seen), false if duplicate. */
  markProcessed(id: string): boolean
}

/**
 * Create a bounded idempotency cache that tracks processed event IDs.
 * When the cache exceeds `maxSize`, the oldest entries are evicted.
 *
 * **Serverless warning:** This cache is process-scoped and does NOT survive
 * cold starts. For production serverless deployments, inject a persistent
 * idempotency store (Redis, database) to prevent webhook replay attacks.
 */
export function createIdempotencyCache(maxSize: number): IdempotencyCache {
  const seen = new Set<string>()
  const order: string[] = []

  return {
    markProcessed(id: string): boolean {
      if (seen.has(id)) return false
      seen.add(id)
      order.push(id)
      while (order.length > maxSize) {
        const oldest = order.shift()!
        seen.delete(oldest)
      }
      return true
    },
  }
}
