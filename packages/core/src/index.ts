/**
 * @fabrk/core
 *
 * Framework runtime and core utilities for FABRK
 */

// Framework
export { createFabrk, initFabrk } from './framework'
export type { CreateFabrkOptions } from './framework'

// Auto-wiring
export { autoWire } from './auto-wire'
export type { AutoWireResult, FeatureModules, AdapterOverrides } from './auto-wire'

// Defaults
export { isDev, applyDevDefaults } from './defaults'
export * from './middleware'
export * from './middleware-presets'
export * from './hooks'
export * from './providers'
export * from './types'
export * from './utils'

// Plugin System
export * from './plugins'
export * from './plugin-types'
export * from './context'

// Feature Modules
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

// Validation utilities
export {
  // Types
  type Severity,
  type ValidationIssue,
  type ValidationReport,
  type ValidatorOptions,
  type ComponentMeta,
  type ComponentRegistry,
  // Validators
  checkHardcodedColors,
  checkInlineStyles,
  checkEvalUsage,
  checkDangerousHTML,
  checkHardcodedSecrets,
  checkAccessibility,
  validateFile,
  // Registry
  createComponentRegistry,
  // Report
  generateReport,
  formatReport,
} from './validation'
