/**
 * Audit Logger
 *
 * Tamper-proof audit logging with hash chaining.
 * Each event includes a SHA-256 hash of the previous event,
 * creating a verifiable chain of audit events.
 *
 * @example
 * ```ts
 * import { createAuditLogger, InMemoryAuditStore } from '@fabrk/security'
 *
 * const audit = createAuditLogger(new InMemoryAuditStore())
 *
 * await audit.log({
 *   actorId: 'user_123',
 *   action: 'user.login',
 *   resourceType: 'session',
 *   resourceId: 'sess_456',
 *   ipAddress: '127.0.0.1',
 * })
 * ```
 */

import type { AuditEvent, AuditStore } from '@fabrk/core'

export interface AuditLogInput {
  actorId: string
  action: string
  resourceType: string
  resourceId: string
  orgId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export interface AuditLogger {
  /** Log an audit event */
  log(input: AuditLogInput): Promise<AuditEvent>
  /** Query audit events */
  query(options: Parameters<AuditStore['query']>[0]): Promise<AuditEvent[]>
  /** Verify the integrity of the audit chain */
  verifyChain(events: AuditEvent[]): Promise<boolean>
}

export function createAuditLogger(store: AuditStore): AuditLogger {
  let lastHash = ''

  return {
    async log(input: AuditLogInput): Promise<AuditEvent> {
      const event: AuditEvent = {
        id: crypto.randomUUID(),
        actorId: input.actorId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        orgId: input.orgId,
        metadata: input.metadata,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        timestamp: new Date(),
      }

      // Create hash chain
      const hashInput = JSON.stringify({
        id: event.id,
        actorId: event.actorId,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        timestamp: event.timestamp.toISOString(),
        previousHash: lastHash,
      })

      const encoder = new TextEncoder()
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(hashInput))
      event.hash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      lastHash = event.hash

      await store.log(event)
      return event
    },

    async query(options) {
      return store.query(options)
    },

    async verifyChain(events: AuditEvent[]): Promise<boolean> {
      if (events.length === 0) return true

      // Sort by timestamp
      const sorted = [...events].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      )

      let previousHash = ''

      for (const event of sorted) {
        if (!event.hash) return false

        const hashInput = JSON.stringify({
          id: event.id,
          actorId: event.actorId,
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          timestamp: event.timestamp.toISOString(),
          previousHash,
        })

        const encoder = new TextEncoder()
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(hashInput))
        const expectedHash = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')

        if (event.hash !== expectedHash) return false
        previousHash = event.hash
      }

      return true
    },
  }
}
