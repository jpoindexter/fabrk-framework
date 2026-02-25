import { fabrkConfigSchema } from '@fabrk/config'
import type { FabrkConfig, FabrkConfigInput } from '@fabrk/config'
import type { Middleware } from './middleware'
import type { PluginRegistry } from './plugins'
import type * as hooks from './hooks'
import type { NotificationManager } from './notifications/manager'
import type { TeamManager } from './teams/organizations'
import type { FeatureFlagManager } from './feature-flags/manager'
import type { WebhookManager } from './webhooks/manager'
import type { JobQueue } from './jobs/queue'

// Re-export config schema and types so consumers can import from @fabrk/core
export { fabrkConfigSchema }
export type { FabrkConfig, FabrkConfigInput }

export interface FabrkInstance {
  config: FabrkConfig
  middleware: Middleware
  hooks: typeof hooks
  registry: PluginRegistry
  /** Auto-wired feature modules (available after autoWire()) */
  features?: {
    notifications: NotificationManager | null
    teams: TeamManager | null
    featureFlags: FeatureFlagManager | null
    webhooks: WebhookManager | null
    jobs: JobQueue | null
  }
}
