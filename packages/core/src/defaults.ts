/**
 * FABRK Zero-Config Defaults
 *
 * Provides sensible development defaults so packages work out of the box
 * without any configuration. In production, explicit config is required
 * for external services (Stripe, Resend, S3, etc.).
 *
 * @example
 * ```ts
 * import { initFabrk } from '@fabrk/core'
 *
 * // Zero-config: auto-detects dev environment and applies defaults
 * const fabrk = await initFabrk()
 *
 * // Explicit: override specific settings
 * const fabrk = await initFabrk({
 *   email: { adapter: 'resend', from: 'hi@myapp.com' },
 * })
 * ```
 */

import type { FabrkConfigInput } from './types'

/**
 * Detect if running in development mode.
 *
 * Checks NODE_ENV, common CI variables, and falls back to 'development'.
 */
export function isDev(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (globalThis as any).process?.env?.NODE_ENV
    return !env || env === 'development' || env === 'test'
  } catch {
    return true
  }
}

/**
 * Merge user config with development defaults.
 *
 * Only applies defaults for features that have zero-config dev adapters.
 * External services (Stripe, S3, Resend) are NOT defaulted since they
 * require API keys.
 *
 * In development mode, this enables:
 * - Console email adapter (logs to terminal)
 * - Local file storage (./uploads directory)
 * - In-memory rate limiting
 * - Notifications (in-memory)
 * - Feature flags (in-memory)
 * - Job queue (in-memory)
 *
 * @example
 * ```ts
 * // Apply dev defaults to user config
 * const config = applyDevDefaults({})
 * // Result: { email: { adapter: 'console' }, storage: { adapter: 'local' }, ... }
 *
 * // User overrides take priority
 * const config = applyDevDefaults({ email: { adapter: 'resend' } })
 * // Result: { email: { adapter: 'resend' }, storage: { adapter: 'local' }, ... }
 * ```
 */
export function applyDevDefaults(config: FabrkConfigInput): FabrkConfigInput {
  if (!isDev()) return config

  return {
    ...config,
    // Only apply defaults where user didn't provide config
    email: config.email ?? { adapter: 'console' as const },
    storage: config.storage ?? { adapter: 'local' as const },
    security: config.security ?? {
      csrf: { enabled: true },
      csp: { enabled: true },
      rateLimit: { enabled: true },
      auditLog: { enabled: false },
    },
    notifications: config.notifications ?? { enabled: true, persistToDb: false },
    featureFlags: config.featureFlags ?? { enabled: true },
    jobs: config.jobs ?? { enabled: true },
  }
}
