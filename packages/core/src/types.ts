import { fabrkConfigSchema } from '@fabrk/config'
import type { FabrkConfig, FabrkConfigInput } from '@fabrk/config'
import type { Middleware } from './middleware'
import type { PluginRegistry } from './plugins'
import type * as hooks from './hooks'

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
    notifications: unknown
    teams: unknown
    featureFlags: unknown
    webhooks: unknown
    jobs: unknown
  }
}
