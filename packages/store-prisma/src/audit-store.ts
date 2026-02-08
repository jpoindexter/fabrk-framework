/**
 * Prisma-based Audit Store
 *
 * Persists tamper-proof audit events to the database.
 */

import type { AuditStore, AuditEvent } from '@fabrk/core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma client is user-provided
type PrismaClient = any

export class PrismaAuditStore implements AuditStore {
  constructor(private prisma: PrismaClient) {}

  async log(event: AuditEvent): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        id: event.id,
        actorId: event.actorId,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        orgId: event.orgId,
        metadata: event.metadata ?? {},
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        timestamp: event.timestamp,
        hash: event.hash,
      },
    })
  }

  async query(options: {
    orgId?: string
    actorId?: string
    resourceType?: string
    resourceId?: string
    action?: string
    from?: Date
    to?: Date
    limit?: number
    offset?: number
  }): Promise<AuditEvent[]> {
    const events = await this.prisma.auditEvent.findMany({
      where: {
        orgId: options.orgId,
        actorId: options.actorId,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
        action: options.action,
        timestamp: {
          gte: options.from,
          lte: options.to,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: options.limit,
      skip: options.offset,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return events.map((e: any) => mapAuditEvent(e))
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAuditEvent(raw: any): AuditEvent {
  return {
    id: raw.id,
    actorId: raw.actorId,
    action: raw.action,
    resourceType: raw.resourceType,
    resourceId: raw.resourceId,
    orgId: raw.orgId ?? undefined,
    metadata: raw.metadata ?? undefined,
    ipAddress: raw.ipAddress ?? undefined,
    userAgent: raw.userAgent ?? undefined,
    timestamp: raw.timestamp,
    hash: raw.hash ?? undefined,
  }
}
