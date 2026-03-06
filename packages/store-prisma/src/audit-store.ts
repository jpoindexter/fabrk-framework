import type { AuditStore, AuditEvent } from '@fabrk/core'
import type { PrismaClient } from './types'

const DEFAULT_AUDIT_LIMIT = 1000
const MAX_AUDIT_LIMIT = 10_000
const MAX_AUDIT_OFFSET = 100_000

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

  /** @security No authorization check — caller must verify the requesting user has permission to view audit logs for the specified scope. */
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
      take: Math.min(options.limit ?? DEFAULT_AUDIT_LIMIT, MAX_AUDIT_LIMIT),
      skip: Math.min(options.offset ?? 0, MAX_AUDIT_OFFSET),
    })

    return events.map((e: Record<string, unknown>) => mapAuditEvent(e))
  }
}

function mapAuditEvent(raw: Record<string, unknown>): AuditEvent {
  return {
    id: raw.id as string,
    actorId: raw.actorId as string,
    action: raw.action as string,
    resourceType: raw.resourceType as string,
    resourceId: raw.resourceId as string,
    orgId: (raw.orgId as string | undefined) ?? undefined,
    metadata: (raw.metadata as Record<string, unknown> | undefined) ?? undefined,
    ipAddress: (raw.ipAddress as string | undefined) ?? undefined,
    userAgent: (raw.userAgent as string | undefined) ?? undefined,
    timestamp: raw.timestamp as Date,
    hash: (raw.hash as string | undefined) ?? undefined,
  }
}
