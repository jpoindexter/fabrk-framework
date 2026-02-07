/**
 * FABRK Auto-Wiring
 *
 * Reads the framework config and automatically creates + registers the
 * appropriate adapters from installed @fabrk/* packages.
 *
 * This is what makes FABRK feel like a real framework — you define config
 * and everything wires up automatically.
 */

import type { FabrkConfig } from './types'
import { PluginRegistry } from './plugins'
import type {
  PaymentAdapter,
  AuthAdapter,
  EmailAdapter,
  StorageAdapter,
  RateLimitAdapter,
} from './plugins'
import { createNotificationManager, type NotificationManager } from './notifications/manager'
import { createTeamManager, type TeamManager } from './teams/organizations'
import { InMemoryTeamStore } from './teams/memory-store'
import { createFeatureFlagManager, type FeatureFlagManager } from './feature-flags/manager'
import { createWebhookManager, type WebhookManager } from './webhooks/manager'
import { createJobQueue, type JobQueue } from './jobs/queue'

// Helper: safely read env vars without direct process.env reference
function env(key: string, fallback = ''): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (globalThis as any).process?.env?.[key] ?? fallback
  } catch {
    return fallback
  }
}

/**
 * Feature modules auto-created from config
 */
export interface FeatureModules {
  notifications: NotificationManager | null
  teams: TeamManager | null
  featureFlags: FeatureFlagManager | null
  webhooks: WebhookManager | null
  jobs: JobQueue | null
}

/**
 * Result of auto-wiring
 */
export interface AutoWireResult {
  registry: PluginRegistry
  features: FeatureModules
}

/**
 * User-provided adapter overrides.
 *
 * If provided, these take priority over auto-detected adapters.
 * Use this when you need custom adapter configurations.
 */
export interface AdapterOverrides {
  payment?: PaymentAdapter
  auth?: AuthAdapter
  email?: EmailAdapter
  storage?: StorageAdapter
  rateLimit?: RateLimitAdapter
}

/**
 * Auto-wire adapters and feature modules from config.
 *
 * Attempts dynamic imports of @fabrk/* packages and creates adapters
 * based on config. Falls back gracefully when packages aren't installed.
 *
 * @example
 * ```ts
 * import { autoWire } from '@fabrk/core'
 *
 * const { registry, features } = await autoWire({
 *   payments: { provider: 'stripe', mode: 'test' },
 *   auth: { adapter: 'nextauth', apiKeys: true },
 *   notifications: { enabled: true },
 * })
 * ```
 */
export async function autoWire(
  config: FabrkConfig,
  overrides?: AdapterOverrides
): Promise<AutoWireResult> {
  const registry = new PluginRegistry()

  // Wire user-provided adapters first (take priority)
  if (overrides?.payment) registry.register('payment', overrides.payment)
  if (overrides?.auth) registry.register('auth', overrides.auth)
  if (overrides?.email) registry.register('email', overrides.email)
  if (overrides?.storage) registry.register('storage', overrides.storage)
  if (overrides?.rateLimit) registry.register('rateLimit', overrides.rateLimit)

  // Auto-detect from installed packages when no override is provided
  if (!overrides?.payment && config.payments) {
    await wirePayment(config, registry)
  }

  if (!overrides?.email && config.email) {
    await wireEmail(config, registry)
  }

  if (!overrides?.storage && config.storage) {
    await wireStorage(config, registry)
  }

  // Wire feature modules (sync, no external deps)
  const features = wireFeatures(config)

  // Initialize all adapters
  await registry.initialize()

  return { registry, features }
}

// ============================================================================
// ADAPTER WIRING (dynamic imports)
//
// Dynamic imports use string variables so TypeScript doesn't try to resolve
// the modules at build time. The packages are optional peer dependencies.
// ============================================================================

async function wirePayment(config: FabrkConfig, registry: PluginRegistry): Promise<void> {
  const pkgName = '@fabrk/payments'
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payments: any = await import(/* webpackIgnore: true */ pkgName)
    const provider = config.payments?.provider

    if (provider === 'stripe' && payments.createStripeAdapter) {
      registry.register('payment', payments.createStripeAdapter({
        secretKey: env('STRIPE_SECRET_KEY'),
        webhookSecret: env('STRIPE_WEBHOOK_SECRET'),
      }))
    } else if (provider === 'polar' && payments.createPolarAdapter) {
      registry.register('payment', payments.createPolarAdapter({
        accessToken: env('POLAR_ACCESS_TOKEN'),
      }))
    } else if (provider === 'lemonsqueezy' && payments.createLemonSqueezyAdapter) {
      registry.register('payment', payments.createLemonSqueezyAdapter({
        apiKey: env('LEMONSQUEEZY_API_KEY'),
        storeId: env('LEMONSQUEEZY_STORE_ID'),
        webhookSecret: env('LEMONSQUEEZY_WEBHOOK_SECRET'),
      }))
    }
  } catch {
    // @fabrk/payments not installed — skip
  }
}

async function wireEmail(config: FabrkConfig, registry: PluginRegistry): Promise<void> {
  const pkgName = '@fabrk/email'
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const email: any = await import(/* webpackIgnore: true */ pkgName)
    const adapter = config.email?.adapter

    if (adapter === 'resend' && email.createResendAdapter) {
      registry.register('email', email.createResendAdapter({
        apiKey: env('RESEND_API_KEY'),
        from: config.email?.from ?? 'noreply@example.com',
      }))
    } else if (adapter === 'console' && email.createConsoleAdapter) {
      registry.register('email', email.createConsoleAdapter({
        from: config.email?.from ?? 'dev@localhost',
      }))
    }
  } catch {
    // @fabrk/email not installed — skip
  }
}

async function wireStorage(config: FabrkConfig, registry: PluginRegistry): Promise<void> {
  const pkgName = '@fabrk/storage'
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage: any = await import(/* webpackIgnore: true */ pkgName)
    const adapter = config.storage?.adapter

    if (adapter === 's3' && storage.createS3Adapter) {
      registry.register('storage', storage.createS3Adapter({
        bucket: env('S3_BUCKET'),
        region: env('AWS_REGION', 'us-east-1'),
      }))
    } else if (adapter === 'r2' && storage.createR2Adapter) {
      registry.register('storage', storage.createR2Adapter({
        bucket: env('R2_BUCKET'),
        accountId: env('R2_ACCOUNT_ID'),
      }))
    } else if (adapter === 'local' && storage.createLocalAdapter) {
      registry.register('storage', storage.createLocalAdapter({
        basePath: env('STORAGE_PATH', './uploads'),
      }))
    }
  } catch {
    // @fabrk/storage not installed — skip
  }
}

// ============================================================================
// FEATURE MODULE WIRING
// ============================================================================

function wireFeatures(config: FabrkConfig): FeatureModules {
  const features: FeatureModules = {
    notifications: null,
    teams: null,
    featureFlags: null,
    webhooks: null,
    jobs: null,
  }

  if (config.notifications?.enabled !== false) {
    features.notifications = createNotificationManager()
  }

  if (config.teams?.enabled) {
    features.teams = createTeamManager(new InMemoryTeamStore())
  }

  if (config.featureFlags?.enabled) {
    features.featureFlags = createFeatureFlagManager()
  }

  if (config.webhooks?.enabled) {
    features.webhooks = createWebhookManager()
  }

  if (config.jobs?.enabled) {
    features.jobs = createJobQueue()
  }

  return features
}
