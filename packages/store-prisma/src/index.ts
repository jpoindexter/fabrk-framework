/**
 * @fabrk/store-prisma
 *
 * Prisma-based store implementations for FABRK Framework.
 * Provides persistent database adapters for all framework stores.
 *
 * @example
 * ```ts
 * import { PrismaTeamStore, PrismaAuditStore } from '@fabrk/store-prisma'
 * import { autoWire } from '@fabrk/core'
 * import { prisma } from './lib/prisma'
 *
 * const { registry, features } = await autoWire(config, {}, {
 *   team: new PrismaTeamStore(prisma),
 *   audit: new PrismaAuditStore(prisma),
 * })
 * ```
 */

export { PrismaTeamStore } from './team-store'
export { PrismaApiKeyStore } from './api-key-store'
export { PrismaAuditStore } from './audit-store'
export { PrismaNotificationStore } from './notification-store'
export { PrismaJobStore } from './job-store'
export { PrismaWebhookStore } from './webhook-store'
export { PrismaFeatureFlagStore } from './feature-flag-store'

// Note: PrismaCostStore lives in @fabrk/ai since cost types are defined there.
// import { PrismaCostStore } from '@fabrk/ai'
