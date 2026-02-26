/**
 * Feature Flag Manager
 *
 * Manages feature flags with support for rollout percentages,
 * user targeting, and role-based targeting.
 *
 * @example
 * ```ts
 * const flags = createFeatureFlagManager()
 *
 * // Define flags
 * await flags.set({ name: 'new-dashboard', enabled: true, rolloutPercent: 50 })
 *
 * // Check flags
 * const enabled = await flags.isEnabled('new-dashboard', { userId: 'user_123' })
 * ```
 */

import type { FeatureFlagOptions, FeatureFlagStore } from '../plugin-types'

export interface FeatureFlagManager {
  /** Check if a flag is enabled */
  isEnabled(name: string, context?: { userId?: string; role?: string }): Promise<boolean>
  /** Set a feature flag */
  set(flag: FeatureFlagOptions): Promise<void>
  /** Delete a feature flag */
  delete(name: string): Promise<void>
  /** Get all flags */
  getAll(): Promise<FeatureFlagOptions[]>
  /** Get a specific flag */
  get(name: string): Promise<FeatureFlagOptions | null>
}

/**
 * In-memory feature flag store
 */
class InMemoryFeatureFlagStore implements FeatureFlagStore {
  private flags = new Map<string, FeatureFlagOptions>()

  async get(name: string) { return this.flags.get(name) ?? null }
  async getAll() { return Array.from(this.flags.values()) }
  async set(flag: FeatureFlagOptions) { this.flags.set(flag.name, flag) }
  async delete(name: string) { this.flags.delete(name) }
}

export function createFeatureFlagManager(
  store?: FeatureFlagStore
): FeatureFlagManager {
  const flagStore = store ?? new InMemoryFeatureFlagStore()

  /**
   * FNV-1a hash — better distribution than djb2 for rollout bucketing.
   * Uses the standard 32-bit FNV parameters (offset basis and prime).
   * This is NOT for cryptographic purposes; it is used solely for
   * deterministic feature-flag percentage bucketing.
   */
  function hashString(str: string): number {
    let hash = 0x811c9dc5 // FNV offset basis
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193) // FNV prime
    }
    return hash >>> 0 // Convert to unsigned 32-bit integer
  }

  return {
    async isEnabled(name: string, context?: { userId?: string; role?: string }): Promise<boolean> {
      const flag = await flagStore.get(name)
      if (!flag) return false
      if (!flag.enabled) return false

      if (flag.targetUsers?.length && context?.userId) {
        if (flag.targetUsers.includes(context.userId)) return true
      }

      if (flag.targetRoles?.length) {
        if (!context?.role || !flag.targetRoles.includes(context.role)) return false
      }

      if (flag.rolloutPercent !== undefined && flag.rolloutPercent < 100) {
        if (!context?.userId) {
          // No user context — use cryptographically secure random
          const buf = new Uint32Array(1)
          crypto.getRandomValues(buf)
          return (buf[0] / 0x100000000) * 100 < flag.rolloutPercent
        }
        const bucket = hashString(`${name}:${context.userId}`) % 100
        return bucket < flag.rolloutPercent
      }

      return true
    },

    async set(flag: FeatureFlagOptions) {
      await flagStore.set(flag)
    },

    async delete(name: string) {
      await flagStore.delete(name)
    },

    async getAll() {
      return flagStore.getAll()
    },

    async get(name: string) {
      return flagStore.get(name)
    },
  }
}
