import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ApiKeyInfo } from '@fabrk/core'
import { PrismaTeamStore } from '../team-store'
import { PrismaApiKeyStore } from '../api-key-store'
import { PrismaAuditStore } from '../audit-store'
import { PrismaNotificationStore } from '../notification-store'
import { PrismaJobStore } from '../job-store'
import { PrismaWebhookStore } from '../webhook-store'
import { PrismaFeatureFlagStore } from '../feature-flag-store'

function createMockPrisma() {
  return {
    organization: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    organizationMember: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    organizationInvite: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    apiKey: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    job: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    webhook: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    webhookDelivery: {
      create: vi.fn(),
    },
    featureFlag: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    $queryRaw: vi.fn(),
  }
}

describe('PrismaTeamStore', () => {
  let prisma: ReturnType<typeof createMockPrisma>
  let store: PrismaTeamStore

  beforeEach(() => {
    prisma = createMockPrisma()
    store = new PrismaTeamStore(prisma)
  })

  it('should get org and map createdBy → ownerId fallback', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-1', name: 'Acme', slug: 'acme', ownerId: null,
      createdBy: 'user-fallback', logoUrl: null, logo: 'https://example.com/logo.png',
      createdAt: new Date(), settings: {},
    })

    const result = await store.getOrg('org-1')
    expect(result?.ownerId).toBe('user-fallback')
    expect(result?.logoUrl).toBe('https://example.com/logo.png')
  })

  it('should return null when org not found', async () => {
    prisma.organization.findUnique.mockResolvedValue(null)
    expect(await store.getOrg('nonexistent')).toBeNull()
    expect(await store.getOrgBySlug('nonexistent')).toBeNull()
  })

  it('should create org with default empty settings', async () => {
    prisma.organization.create.mockResolvedValue({})
    await store.createOrg({ id: 'org-1', name: 'Test', slug: 'test', ownerId: 'user-1', createdAt: new Date() })
    const callData = prisma.organization.create.mock.calls[0][0].data
    expect(callData.settings).toEqual({})
  })

  it('should map members with role lowercase and joinedAt fallback', async () => {
    prisma.organizationMember.findMany.mockResolvedValue([
      {
        userId: 'user-1', organizationId: 'org-1', role: 'ADMIN',
        joinedAt: null, createdAt: new Date('2025-01-15'),
        user: { name: 'Alice', email: 'alice@example.com', image: null },
      },
    ])
    const result = await store.getMembers('org-1')
    expect(result[0].role).toBe('admin')
    expect(result[0].joinedAt).toEqual(new Date('2025-01-15'))
  })

  it('should addMember with uppercased role', async () => {
    prisma.organizationMember.create.mockResolvedValue({})
    await store.addMember({ orgId: 'org-1', userId: 'user-1', role: 'admin', joinedAt: new Date(), email: 'a@b.com' })
    expect(prisma.organizationMember.create.mock.calls[0][0].data.role).toBe('ADMIN')
  })

  it('should map invite with accepted flag', async () => {
    prisma.organizationInvite.findUnique.mockResolvedValue({
      id: 'inv-1', organizationId: 'org-1', email: 'e@e.com', role: 'MEMBER',
      token: 'tok', invitedBy: 'user-1', expiresAt: new Date(), acceptedAt: new Date(),
    })
    const result = await store.getInviteByToken('tok')
    expect(result?.accepted).toBe(true)
    expect(result?.role).toBe('member')
  })
})

describe('PrismaApiKeyStore', () => {
  let prisma: ReturnType<typeof createMockPrisma>
  let store: PrismaApiKeyStore

  beforeEach(() => {
    prisma = createMockPrisma()
    store = new PrismaApiKeyStore(prisma)
  })

  it('should get by hash, map null scopes/dates, and return null when not found', async () => {
    prisma.apiKey.findFirst.mockResolvedValue({
      id: 'key-1', prefix: 'fabrk_test_xyz', name: 'Key', scopes: null,
      createdAt: new Date(), lastUsedAt: null, expiresAt: null, active: true,
    })
    const result = await store.getByHash('hash')
    expect(result?.scopes).toEqual([])
    expect(result?.lastUsedAt).toBeUndefined()

    prisma.apiKey.findFirst.mockResolvedValue(null)
    expect(await store.getByHash('nonexistent')).toBeNull()
  })

  it('should create key and revoke', async () => {
    prisma.apiKey.create.mockResolvedValue({})
    prisma.apiKey.update.mockResolvedValue({})

    await store.create({
      id: 'key-1', prefix: 'fabrk_live_abc', hash: 'sha256-hash',
      name: 'Key', scopes: ['read'], active: true, createdAt: new Date(),
    } as ApiKeyInfo & { hash: string })
    expect(prisma.apiKey.create).toHaveBeenCalled()

    await store.revoke('key-1')
    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: 'key-1' },
      data: { active: false, revokedAt: expect.any(Date) },
    })
  })

  it('should list by user ordered by createdAt desc', async () => {
    prisma.apiKey.findMany.mockResolvedValue([
      { id: 'key-2', prefix: 'p', name: 'Newer', scopes: ['admin'], createdAt: new Date(), lastUsedAt: null, expiresAt: null, active: true },
      { id: 'key-1', prefix: 'p', name: 'Older', scopes: ['read'], createdAt: new Date(), lastUsedAt: null, expiresAt: null, active: true },
    ])
    const result = await store.listByUser('user-1')
    expect(result).toHaveLength(2)
    expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', active: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  })
})

describe('PrismaAuditStore', () => {
  let prisma: ReturnType<typeof createMockPrisma>
  let store: PrismaAuditStore

  beforeEach(() => {
    prisma = createMockPrisma()
    store = new PrismaAuditStore(prisma)
  })

  it('should log event with default empty metadata', async () => {
    prisma.auditEvent.create.mockResolvedValue({})
    await store.log({ id: 'evt-1', actorId: 'u1', action: 'test', resourceType: 'user', resourceId: 'u2', timestamp: new Date() })
    expect(prisma.auditEvent.create.mock.calls[0][0].data.metadata).toEqual({})
  })

  it('should query with filters and map null fields to undefined', async () => {
    prisma.auditEvent.findMany.mockResolvedValue([{
      id: 'evt-1', actorId: 'u1', action: 'test', resourceType: 'test', resourceId: 't1',
      orgId: null, metadata: null, ipAddress: null, userAgent: null, timestamp: new Date(), hash: null,
    }])
    const result = await store.query({ orgId: 'org-1', limit: 50, offset: 10 })
    expect(result[0].orgId).toBeUndefined()
    expect(result[0].metadata).toBeUndefined()
    expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 50, skip: 10 }))
  })
})

describe('PrismaNotificationStore', () => {
  let prisma: ReturnType<typeof createMockPrisma>
  let store: PrismaNotificationStore

  beforeEach(() => {
    prisma = createMockPrisma()
    store = new PrismaNotificationStore(prisma)
  })

  it('should create with default priority and empty arrays', async () => {
    prisma.notification.create.mockResolvedValue({})
    await store.create({ id: 'n1', type: 'warning', title: 'Alert', message: 'msg', read: false, dismissed: false, createdAt: new Date() })
    const data = prisma.notification.create.mock.calls[0][0].data
    expect(data.priority).toBe('normal')
    expect(data.userIds).toEqual([])
    expect(data.metadata).toEqual({})
  })

  it('should getByUser with unreadOnly filter and map nulls', async () => {
    prisma.notification.findMany.mockResolvedValue([{
      id: 'n1', type: 'error', title: 'Err', message: 'msg',
      priority: null, actionUrl: null, actionLabel: null, userIds: null, metadata: null,
      read: true, dismissed: false, createdAt: new Date(),
    }])
    const result = await store.getByUser('user-1', { unreadOnly: true, limit: 10 })
    expect(result[0].priority).toBeUndefined()
    expect(result[0].userIds).toEqual([])
    expect(prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ read: false }),
      take: 10,
    }))
  })

  it('should markRead, markAllRead, dismiss, and getUnreadCount', async () => {
    prisma.notification.update.mockResolvedValue({})
    prisma.notification.updateMany.mockResolvedValue({ count: 5 })
    prisma.notification.count.mockResolvedValue(7)

    await store.markRead('n1')
    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { read: true } })

    await store.markAllRead('user-1')
    expect(prisma.notification.updateMany).toHaveBeenCalled()

    await store.dismiss('n1')

    expect(await store.getUnreadCount('user-1')).toBe(7)
  })
})

describe('PrismaJobStore', () => {
  let prisma: ReturnType<typeof createMockPrisma>
  let store: PrismaJobStore

  beforeEach(() => {
    prisma = createMockPrisma()
    store = new PrismaJobStore(prisma)
  })

  it('should enqueue with default priority/maxRetries', async () => {
    prisma.job.create.mockResolvedValue({})
    await store.enqueue({ id: 'j1', type: 'cleanup', payload: {}, status: 'pending', attempts: 0, createdAt: new Date() })
    const data = prisma.job.create.mock.calls[0][0].data
    expect(data.priority).toBe(0)
    expect(data.maxRetries).toBe(3)
  })

  it('should dequeue atomically via FOR UPDATE SKIP LOCKED', async () => {
    prisma.$queryRaw.mockResolvedValue([{
      id: 'j1', type: 'email.send', payload: {}, priority: 0, max_retries: 3,
      delay: null, scheduled_at: null, status: 'running', attempts: 1,
      created_at: new Date(), last_attempt_at: new Date(), completed_at: null, error: null, result: null,
    }])
    const result = await store.dequeue()
    expect(result).not.toBeNull()
    expect(result?.status).toBe('running')
    expect(result?.attempts).toBe(1)
  })

  it('should return null when no pending jobs', async () => {
    prisma.$queryRaw.mockResolvedValue([])
    expect(await store.dequeue()).toBeNull()
  })

  it('should map null optional fields to defaults on getById', async () => {
    prisma.job.findUnique.mockResolvedValue({
      id: 'j2', type: 'cleanup', payload: null, priority: null, maxRetries: null,
      delay: null, scheduledAt: null, status: 'pending', attempts: 0,
      createdAt: new Date(), lastAttemptAt: null, completedAt: null, error: null, result: null,
    })
    const result = await store.getById('j2')
    expect(result?.payload).toEqual({})
    expect(result?.priority).toBe(0)
    expect(result?.maxRetries).toBe(3)
  })
})

describe('PrismaWebhookStore', () => {
  let prisma: ReturnType<typeof createMockPrisma>
  let store: PrismaWebhookStore

  beforeEach(() => {
    prisma = createMockPrisma()
    store = new PrismaWebhookStore(prisma)
  })

  it('should create, getById, and map null events to empty array', async () => {
    prisma.webhook.create.mockResolvedValue({})
    await store.create({ id: 'wh-1', url: 'https://example.com/hook', events: ['user.created'], secret: 'a-very-long-secret-key-for-security-min-32-chars', active: true, createdAt: new Date() })
    expect(prisma.webhook.create).toHaveBeenCalled()

    prisma.webhook.findUnique.mockResolvedValue({
      id: 'wh-1', url: 'https://example.com/hook', events: null, secret: 'sec', active: false, createdAt: new Date(),
    })
    const result = await store.getById('wh-1')
    expect(result?.events).toEqual([])

    prisma.webhook.findUnique.mockResolvedValue(null)
    expect(await store.getById('nonexistent')).toBeNull()
  })

  it('should listByEvent filtering active webhooks', async () => {
    prisma.webhook.findMany.mockResolvedValue([
      { id: 'wh-1', url: 'https://a.com', events: ['user.created'], secret: 's', active: true, createdAt: new Date() },
    ])
    const result = await store.listByEvent('user.created')
    expect(result).toHaveLength(1)
    expect(prisma.webhook.findMany).toHaveBeenCalledWith({
      where: { active: true, events: { has: 'user.created' } },
      take: 100,
    })
  })

  it('should record delivery', async () => {
    prisma.webhookDelivery.create.mockResolvedValue({})
    await store.recordDelivery({
      id: 'del-1', webhookId: 'wh-1', event: 'user.created',
      statusCode: 200, success: true, attempts: 1, deliveredAt: new Date(), response: '{"ok":true}',
    })
    expect(prisma.webhookDelivery.create).toHaveBeenCalled()
  })
})

describe('PrismaFeatureFlagStore', () => {
  let prisma: ReturnType<typeof createMockPrisma>
  let store: PrismaFeatureFlagStore

  beforeEach(() => {
    prisma = createMockPrisma()
    store = new PrismaFeatureFlagStore(prisma)
  })

  it('should get flag and map null optional fields', async () => {
    prisma.featureFlag.findUnique.mockResolvedValue({
      name: 'basic', enabled: false, rolloutPercent: null, targetUsers: null, targetRoles: null, metadata: null,
    })
    const result = await store.get('basic')
    expect(result?.rolloutPercent).toBeUndefined()
    expect(result?.targetUsers).toEqual([])
    expect(result?.targetRoles).toEqual([])

    prisma.featureFlag.findUnique.mockResolvedValue(null)
    expect(await store.get('nonexistent')).toBeNull()
  })

  it('should upsert flag with default arrays and metadata', async () => {
    prisma.featureFlag.upsert.mockResolvedValue({})
    await store.set({ name: 'simple', enabled: true })
    const call = prisma.featureFlag.upsert.mock.calls[0][0]
    expect(call.create.targetUsers).toEqual([])
    expect(call.create.targetRoles).toEqual([])
    expect(call.create.metadata).toEqual({})
  })

  it('should getAll ordered by name', async () => {
    prisma.featureFlag.findMany.mockResolvedValue([
      { name: 'alpha', enabled: true, rolloutPercent: 100, targetUsers: [], targetRoles: [], metadata: {} },
    ])
    const result = await store.getAll()
    expect(result).toHaveLength(1)
    expect(prisma.featureFlag.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' }, take: 1000 })
  })
})
