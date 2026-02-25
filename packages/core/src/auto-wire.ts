/**
 * FABRK Auto-Wiring
 *
 * Reads the framework config and automatically creates + registers the
 * appropriate adapters from installed @fabrk/* packages.
 *
 * This is what makes FABRK feel like a real framework — you define config
 * and everything wires up automatically.
 */

import type { FabrkConfigInput } from './types'
import { PluginRegistry } from './plugins'
import type {
  PaymentAdapter,
  AuthAdapter,
  EmailAdapter,
  StorageAdapter,
  RateLimitAdapter,
} from './plugins'
import type {
  TeamStore,
  NotificationStore,
  FeatureFlagStore,
  WebhookStore,
  JobStore,
  AuditStore,
} from './plugin-types'
import { createNotificationManager, type NotificationManager } from './notifications/manager'
import { createTeamManager, type TeamManager } from './teams/organizations'
import { InMemoryTeamStore } from './teams/memory-store'
import { createFeatureFlagManager, type FeatureFlagManager } from './feature-flags/manager'
import { createWebhookManager, type WebhookManager } from './webhooks/manager'
import { createJobQueue, type JobQueue } from './jobs/queue'
import { isDev } from './defaults'

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
 * User-provided store overrides.
 *
 * Replace in-memory stores with persistent implementations (e.g. Prisma).
 * Any store not provided falls back to its in-memory default.
 *
 * @example
 * ```ts
 * import { PrismaTeamStore, PrismaAuditStore } from '@fabrk/store-prisma'
 * import { prisma } from './lib/prisma'
 *
 * const { features } = await autoWire(config, {}, {
 *   team: new PrismaTeamStore(prisma),
 *   audit: new PrismaAuditStore(prisma),
 * })
 * ```
 */
export interface StoreOverrides {
  team?: TeamStore
  notification?: NotificationStore
  featureFlag?: FeatureFlagStore
  webhook?: WebhookStore
  job?: JobStore
  audit?: AuditStore
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
 *   payments: { adapter: 'stripe', mode: 'test' },
 *   auth: { adapter: 'nextauth', apiKeys: { enabled: true } },
 *   notifications: { enabled: true },
 * })
 * ```
 */
export async function autoWire(
  config: FabrkConfigInput,
  overrides?: AdapterOverrides,
  stores?: StoreOverrides
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
  const features = wireFeatures(config, stores)

  // Initialize all adapters
  await registry.initialize()

  return { registry, features }
}

// ADAPTER WIRING
// Dynamic imports use string variables so TypeScript doesn't resolve them at build time.
// The packages are optional peer dependencies.

async function wirePayment(config: FabrkConfigInput, registry: PluginRegistry): Promise<void> {
  const pkgName = '@fabrk/payments'
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payments: any = await import(/* webpackIgnore: true */ pkgName)
    const adapter = config.payments?.adapter

    if (adapter === 'stripe' && payments.createStripeAdapter) {
      const secretKey = env('STRIPE_SECRET_KEY')
      const webhookSecret = env('STRIPE_WEBHOOK_SECRET')
      if (!secretKey && isDev()) console.warn('[FABRK] STRIPE_SECRET_KEY is not set — Stripe adapter will not function')
      if (!webhookSecret && isDev()) console.warn('[FABRK] STRIPE_WEBHOOK_SECRET is not set — Stripe webhook verification will not function')
      registry.register('payment', payments.createStripeAdapter({ secretKey, webhookSecret }))
    } else if (adapter === 'polar' && payments.createPolarAdapter) {
      const accessToken = env('POLAR_ACCESS_TOKEN')
      if (!accessToken && isDev()) console.warn('[FABRK] POLAR_ACCESS_TOKEN is not set — Polar adapter will not function')
      registry.register('payment', payments.createPolarAdapter({ accessToken }))
    } else if (adapter === 'lemonsqueezy' && payments.createLemonSqueezyAdapter) {
      const apiKey = env('LEMONSQUEEZY_API_KEY')
      const storeId = env('LEMONSQUEEZY_STORE_ID')
      const webhookSecret = env('LEMONSQUEEZY_WEBHOOK_SECRET')
      if (!apiKey && isDev()) console.warn('[FABRK] LEMONSQUEEZY_API_KEY is not set — Lemon Squeezy adapter will not function')
      if (!storeId && isDev()) console.warn('[FABRK] LEMONSQUEEZY_STORE_ID is not set — Lemon Squeezy adapter will not function')
      if (!webhookSecret && isDev()) console.warn('[FABRK] LEMONSQUEEZY_WEBHOOK_SECRET is not set — Lemon Squeezy webhook verification will not function')
      registry.register('payment', payments.createLemonSqueezyAdapter({ apiKey, storeId, webhookSecret }))
    }
  } catch {
    // @fabrk/payments not installed — skip
  }
}

async function wireEmail(config: FabrkConfigInput, registry: PluginRegistry): Promise<void> {
  const pkgName = '@fabrk/email'
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const email: any = await import(/* webpackIgnore: true */ pkgName)
    const adapter = config.email?.adapter

    if (adapter === 'resend' && email.createResendAdapter) {
      const apiKey = env('RESEND_API_KEY')
      if (!apiKey && isDev()) console.warn('[FABRK] RESEND_API_KEY is not set — Resend adapter will not function')
      registry.register('email', email.createResendAdapter({
        apiKey,
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

async function wireStorage(config: FabrkConfigInput, registry: PluginRegistry): Promise<void> {
  const pkgName = '@fabrk/storage'
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage: any = await import(/* webpackIgnore: true */ pkgName)
    const adapter = config.storage?.adapter

    if (adapter === 's3' && storage.createS3Adapter) {
      const accessKeyId = env('AWS_ACCESS_KEY_ID')
      const bucket = env('S3_BUCKET')
      if (!accessKeyId && isDev()) console.warn('[FABRK] AWS_ACCESS_KEY_ID is not set — S3 adapter will not function')
      if (!bucket && isDev()) console.warn('[FABRK] S3_BUCKET is not set — S3 adapter will not function')
      registry.register('storage', storage.createS3Adapter({
        bucket,
        region: env('AWS_REGION', 'us-east-1'),
      }))
    } else if (adapter === 'r2' && storage.createR2Adapter) {
      const bucket = env('R2_BUCKET')
      const accountId = env('R2_ACCOUNT_ID')
      if (!bucket && isDev()) console.warn('[FABRK] R2_BUCKET is not set — R2 adapter will not function')
      if (!accountId && isDev()) console.warn('[FABRK] R2_ACCOUNT_ID is not set — R2 adapter will not function')
      registry.register('storage', storage.createR2Adapter({ bucket, accountId }))
    } else if (adapter === 'local' && storage.createLocalAdapter) {
      registry.register('storage', storage.createLocalAdapter({
        basePath: env('STORAGE_PATH', './uploads'),
      }))
    }
  } catch {
    // @fabrk/storage not installed — skip
  }
}

// FEATURE MODULE WIRING

function wireFeatures(config: FabrkConfigInput, stores?: StoreOverrides): FeatureModules {
  const features: FeatureModules = {
    notifications: null,
    teams: null,
    featureFlags: null,
    webhooks: null,
    jobs: null,
  }

  if (config.notifications?.enabled !== false) {
    features.notifications = createNotificationManager(stores?.notification)
  }

  if (config.teams?.enabled) {
    features.teams = createTeamManager(stores?.team ?? new InMemoryTeamStore())
  }

  if (config.featureFlags?.enabled) {
    features.featureFlags = createFeatureFlagManager(stores?.featureFlag)
  }

  if (config.webhooks?.enabled) {
    features.webhooks = createWebhookManager(stores?.webhook)
  }

  if (config.jobs?.enabled) {
    features.jobs = createJobQueue(stores?.job)
  }

  return features
}
