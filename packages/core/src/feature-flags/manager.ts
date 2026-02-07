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

  function hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  return {
    async isEnabled(name: string, context?: { userId?: string; role?: string }): Promise<boolean> {
      const flag = await flagStore.get(name)
      if (!flag) return false
      if (!flag.enabled) return false

      // Check user targeting
      if (flag.targetUsers?.length && context?.userId) {
        if (flag.targetUsers.includes(context.userId)) return true
      }

      // Check role targeting
      if (flag.targetRoles?.length && context?.role) {
        if (flag.targetRoles.includes(context.role)) return true
        // If targeting specific roles and user doesn't match, skip rollout
        if (!flag.targetUsers?.length) return false
      }

      // Check rollout percentage
      if (flag.rolloutPercent !== undefined && flag.rolloutPercent < 100) {
        if (!context?.userId) {
          // No user context — use random
          return Math.random() * 100 < flag.rolloutPercent
        }
        // Deterministic hash for consistent experience
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
