/**
 * @fabrk/core
 *
 * Framework runtime and core utilities for FABRK
 */

export { createFabrk, initFabrk } from './framework'
export type { CreateFabrkOptions } from './framework'

export { autoWire } from './auto-wire'
export type { AutoWireResult, FeatureModules, AdapterOverrides, StoreOverrides } from './auto-wire'

export { timingSafeEqual, hashPayload } from './crypto'

export { isDev, applyDevDefaults } from './defaults'
export * from './middleware'
export * from './middleware-presets'
export * from './hooks'
export * from './providers'
export * from './types'
export * from './utils'

export * from './plugins'
export * from './plugin-types'
export { useFabrk, useOptionalFabrk } from './context'
export type { FabrkContextValue } from './context'

export { createNotificationManager } from './notifications/manager'
export type { NotificationManager } from './notifications/manager'

export { createTeamManager } from './teams/organizations'
export type { TeamManager } from './teams/organizations'
export { InMemoryTeamStore } from './teams/memory-store'

export { createFeatureFlagManager } from './feature-flags/manager'
export type { FeatureFlagManager } from './feature-flags/manager'

export { createWebhookManager } from './webhooks/manager'
export type { WebhookManager } from './webhooks/manager'

export { createJobQueue } from './jobs/queue'
export type { JobQueue } from './jobs/queue'

