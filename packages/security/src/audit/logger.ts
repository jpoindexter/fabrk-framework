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
import { timingSafeEqual, bytesToHex } from '@fabrk/core'

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
  log(input: AuditLogInput): Promise<AuditEvent>
  query(options: Parameters<AuditStore['query']>[0]): Promise<AuditEvent[]>
  verifyChain(events: AuditEvent[]): Promise<boolean>
}

export function createAuditLogger(store: AuditStore): AuditLogger {
  let lastHash = ''
  let sequenceCounter = 0
  let chainInitialized = false

  // Promise mutex: each log() call chains onto this promise so that
  // reads and writes of lastHash/sequenceCounter are serialized and
  // no two concurrent calls can fork the hash chain (TOCTOU fix).
  let pendingLog: Promise<unknown> = Promise.resolve()

  return {
    async log(input: AuditLogInput): Promise<AuditEvent> {
      const operation = async (): Promise<AuditEvent> => {
        // On first log call, attempt to recover the chain from the store
        // to prevent accidental chain reset on logger restart.
        if (!chainInitialized) {
          chainInitialized = true
          try {
            const recent = await store.query({ limit: 1 })
            if (recent.length > 0 && recent[0].hash) {
              lastHash = recent[0].hash
              // Resume sequence from the last stored event
              sequenceCounter = (recent[0].sequence ?? 0) + 1
            }
          } catch {
            // If recovery fails, start a new chain. The verifyChain method
            // will detect the break when validating the full sequence.
          }
        }

        const currentSequence = sequenceCounter++

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
          sequence: currentSequence,
        }

        // Create hash chain — includes sequence for deterministic ordering
        const hashInput = JSON.stringify({
          id: event.id,
          actorId: event.actorId,
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          timestamp: event.timestamp.toISOString(),
          sequence: event.sequence,
          previousHash: lastHash,
        })

        const encoder = new TextEncoder()
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(hashInput))
        event.hash = bytesToHex(new Uint8Array(hashBuffer))

        lastHash = event.hash

        await store.log(event)
        return event
      }

      // Serialize: wait for the previous log to complete before starting this one.
      // Errors are absorbed on the pending side so the mutex never gets stuck.
      const result = pendingLog.then(operation, operation)
      pendingLog = result.then(
        () => {},
        () => {}
      )
      return result
    },

    async query(options) {
      return store.query(options)
    },

    async verifyChain(events: AuditEvent[]): Promise<boolean> {
      if (events.length === 0) return true

      // Sort by sequence number for deterministic ordering.
      // Falls back to timestamp for legacy events without sequence numbers.
      const sorted = [...events].sort((a, b) => {
        if (a.sequence != null && b.sequence != null) {
          return a.sequence - b.sequence
        }
        return a.timestamp.getTime() - b.timestamp.getTime()
      })

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
          // Include sequence in hash computation when present (new events).
          // Omit for legacy events to preserve backward compatibility.
          ...(event.sequence != null ? { sequence: event.sequence } : {}),
          previousHash,
        })

        const encoder = new TextEncoder()
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(hashInput))
        const expectedHash = bytesToHex(new Uint8Array(hashBuffer))

        if (!await timingSafeEqual(event.hash ?? '', expectedHash)) return false
        previousHash = event.hash
      }

      return true
    },
  }
}
