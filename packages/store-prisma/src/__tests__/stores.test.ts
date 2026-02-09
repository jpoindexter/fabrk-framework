import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PrismaTeamStore } from '../team-store'
import { PrismaApiKeyStore } from '../api-key-store'
import { PrismaAuditStore } from '../audit-store'
import { PrismaNotificationStore } from '../notification-store'
import { PrismaJobStore } from '../job-store'
import { PrismaWebhookStore } from '../webhook-store'
import { PrismaFeatureFlagStore } from '../feature-flag-store'

// ---------------------------------------------------------------------------
// Mock PrismaClient factory
// ---------------------------------------------------------------------------

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
  }
}

// ---------------------------------------------------------------------------
// PrismaTeamStore
// ---------------------------------------------------------------------------

describe('PrismaTeamStore', () => {
  let prisma: ReturnType<typeof createMockPrisma>
  let store: PrismaTeamStore

  beforeEach(() => {
    prisma = createMockPrisma()
    store = new PrismaTeamStore(prisma)
  })

  describe('getOrg', () => {
    it('should return mapped organization when found', async () => {
      const raw = {
        id: 'org-1',
        name: 'Acme',
        slug: 'acme',
        ownerId: 'user-1',
        logoUrl: 'https://example.com/logo.png',
        createdAt: new Date('2025-01-01'),
        settings: { theme: 'dark' },
      }
      prisma.organization.findUnique.mockResolvedValue(raw)

      const result = await store.getOrg('org-1')

      expect(prisma.organization.findUnique).toHaveBeenCalledWith({ where: { id: 'org-1' } })
      expect(result).toEqual({
        id: 'org-1',
        name: 'Acme',
        slug: 'acme',
        ownerId: 'user-1',
        logoUrl: 'https://example.com/logo.png',
        createdAt: new Date('2025-01-01'),
        settings: { theme: 'dark' },
      })
    })

    it('should return null when not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null)

      const result = await store.getOrg('nonexistent')

      expect(result).toBeNull()
    })

    it('should map createdBy to ownerId when ownerId is missing', async () => {
      const raw = {
        id: 'org-2',
        name: 'Test',
        slug: 'test',
        ownerId: null,
        createdBy: 'user-fallback',
        logoUrl: null,
        logo: 'https://example.com/alt-logo.png',
        createdAt: new Date(),
        settings: {},
      }
      prisma.organization.findUnique.mockResolvedValue(raw)

      const result = await store.getOrg('org-2')

      expect(result?.ownerId).toBe('user-fallback')
      expect(result?.logoUrl).toBe('https://example.com/alt-logo.png')
    })
  })

  describe('getOrgBySlug', () => {
    it('should query by slug', async () => {
      const raw = {
        id: 'org-1',
        name: 'Acme',
        slug: 'acme',
        ownerId: 'user-1',
        logoUrl: null,
        createdAt: new Date(),
        settings: {},
      }
      prisma.organization.findUnique.mockResolvedValue(raw)

      const result = await store.getOrgBySlug('acme')

      expect(prisma.organization.findUnique).toHaveBeenCalledWith({ where: { slug: 'acme' } })
      expect(result?.slug).toBe('acme')
    })

    it('should return null when slug not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null)

      const result = await store.getOrgBySlug('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('createOrg', () => {
    it('should create organization with correct data shape', async () => {
      const org = {
        id: 'org-1',
        name: 'Acme',
        slug: 'acme',
        ownerId: 'user-1',
        logoUrl: 'https://example.com/logo.png',
        createdAt: new Date('2025-01-01'),
        settings: { plan: 'pro' },
      }
      prisma.organization.create.mockResolvedValue(org)

      await store.createOrg(org)

      expect(prisma.organization.create).toHaveBeenCalledWith({
        data: {
          id: 'org-1',
          name: 'Acme',
          slug: 'acme',
          ownerId: 'user-1',
          logoUrl: 'https://example.com/logo.png',
          createdAt: new Date('2025-01-01'),
          settings: { plan: 'pro' },
        },
      })
    })

    it('should default settings to empty object when undefined', async () => {
      const org = {
        id: 'org-2',
        name: 'Beta',
        slug: 'beta',
        ownerId: 'user-2',
        createdAt: new Date(),
      }
      prisma.organization.create.mockResolvedValue(org)

      await store.createOrg(org)

      const callData = prisma.organization.create.mock.calls[0][0].data
      expect(callData.settings).toEqual({})
    })
  })

  describe('updateOrg', () => {
    it('should call update with correct where and data', async () => {
      prisma.organization.update.mockResolvedValue({})

      await store.updateOrg('org-1', { name: 'New Name' })

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { name: 'New Name' },
      })
    })
  })

  describe('deleteOrg', () => {
    it('should call delete with correct id', async () => {
      prisma.organization.delete.mockResolvedValue({})

      await store.deleteOrg('org-1')

      expect(prisma.organization.delete).toHaveBeenCalledWith({ where: { id: 'org-1' } })
    })
  })

  describe('getMembers', () => {
    it('should return mapped members with user info', async () => {
      prisma.organizationMember.findMany.mockResolvedValue([
        {
          userId: 'user-1',
          organizationId: 'org-1',
          role: 'ADMIN',
          joinedAt: new Date('2025-01-15'),
          createdAt: new Date('2025-01-15'),
          user: {
            name: 'Alice',
            email: 'alice@example.com',
            image: 'https://example.com/alice.png',
          },
        },
        {
          userId: 'user-2',
          organizationId: 'org-1',
          role: 'MEMBER',
          joinedAt: null,
          createdAt: new Date('2025-02-01'),
          user: {
            name: 'Bob',
            email: 'bob@example.com',
            image: null,
          },
        },
      ])

      const result = await store.getMembers('org-1')

      expect(prisma.organizationMember.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        include: { user: true },
      })
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        userId: 'user-1',
        orgId: 'org-1',
        role: 'admin',
        joinedAt: new Date('2025-01-15'),
        name: 'Alice',
        email: 'alice@example.com',
        image: 'https://example.com/alice.png',
      })
      // Fallback: joinedAt is null, should fall back to createdAt
      expect(result[1].joinedAt).toEqual(new Date('2025-02-01'))
      expect(result[1].role).toBe('member')
    })
  })

  describe('addMember', () => {
    it('should create member with uppercased role', async () => {
      prisma.organizationMember.create.mockResolvedValue({})

      const joinedAt = new Date('2025-03-01')
      await store.addMember({
        orgId: 'org-1',
        userId: 'user-3',
        role: 'admin',
        joinedAt,
        email: 'charlie@example.com',
      })

      expect(prisma.organizationMember.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          userId: 'user-3',
          role: 'ADMIN',
          joinedAt,
        },
      })
    })
  })

  describe('updateMemberRole', () => {
    it('should updateMany with uppercased role', async () => {
      prisma.organizationMember.updateMany.mockResolvedValue({ count: 1 })

      await store.updateMemberRole('org-1', 'user-3', 'member')

      expect(prisma.organizationMember.updateMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', userId: 'user-3' },
        data: { role: 'MEMBER' },
      })
    })
  })

  describe('removeMember', () => {
    it('should deleteMany matching org and user', async () => {
      prisma.organizationMember.deleteMany.mockResolvedValue({ count: 1 })

      await store.removeMember('org-1', 'user-3')

      expect(prisma.organizationMember.deleteMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', userId: 'user-3' },
      })
    })
  })

  describe('createInvite', () => {
    it('should create invite with uppercased role', async () => {
      prisma.organizationInvite.create.mockResolvedValue({})

      const expiresAt = new Date('2025-04-01')
      await store.createInvite({
        id: 'inv-1',
        orgId: 'org-1',
        email: 'dave@example.com',
        role: 'member',
        token: 'tok-abc',
        invitedBy: 'user-1',
        expiresAt,
        accepted: false,
      })

      expect(prisma.organizationInvite.create).toHaveBeenCalledWith({
        data: {
          id: 'inv-1',
          organizationId: 'org-1',
          email: 'dave@example.com',
          role: 'MEMBER',
          token: 'tok-abc',
          invitedBy: 'user-1',
          expiresAt,
        },
      })
    })
  })

  describe('getInviteByToken', () => {
    it('should return mapped invite when found', async () => {
      prisma.organizationInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        organizationId: 'org-1',
        email: 'dave@example.com',
        role: 'MEMBER',
        token: 'tok-abc',
        invitedBy: 'user-1',
        expiresAt: new Date('2025-04-01'),
        acceptedAt: null,
      })

      const result = await store.getInviteByToken('tok-abc')

      expect(prisma.organizationInvite.findUnique).toHaveBeenCalledWith({ where: { token: 'tok-abc' } })
      expect(result).toEqual({
        id: 'inv-1',
        orgId: 'org-1',
        email: 'dave@example.com',
        role: 'member',
        token: 'tok-abc',
        invitedBy: 'user-1',
        expiresAt: new Date('2025-04-01'),
        accepted: false,
      })
    })

    it('should return accepted: true when acceptedAt is set', async () => {
      prisma.organizationInvite.findUnique.mockResolvedValue({
        id: 'inv-2',
        organizationId: 'org-1',
        email: 'eve@example.com',
        role: 'ADMIN',
        token: 'tok-def',
        invitedBy: 'user-1',
        expiresAt: new Date('2025-04-01'),
        acceptedAt: new Date('2025-03-15'),
      })

      const result = await store.getInviteByToken('tok-def')

      expect(result?.accepted).toBe(true)
      expect(result?.role).toBe('admin')
    })

    it('should return null when token not found', async () => {
      prisma.organizationInvite.findUnique.mockResolvedValue(null)

      const result = await store.getInviteByToken('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('acceptInvite', () => {
    it('should set acceptedAt to current date', async () => {
      prisma.organizationInvite.update.mockResolvedValue({})

      await store.acceptInvite('tok-abc')

      expect(prisma.organizationInvite.update).toHaveBeenCalledWith({
        where: { token: 'tok-abc' },
        data: { acceptedAt: expect.any(Date) },
      })
    })
  })
})

// ---------------------------------------------------------------------------
// PrismaApiKeyStore
// ---------------------------------------------------------------------------

describe('PrismaApiKeyStore', () => {
  let prisma: ReturnType<typeof createMockPrisma>
  let store: PrismaApiKeyStore

  beforeEach(() => {
    prisma = createMockPrisma()
    store = new PrismaApiKeyStore(prisma)
  })

  describe('getByHash', () => {
    it('should query with hash and active filter', async () => {
      const raw = {
        id: 'key-1',
        prefix: 'fabrk_live_abc',
        name: 'Production Key',
        scopes: ['read', 'write'],
        createdAt: new Date('2025-01-01'),
        lastUsedAt: new Date('2025-02-01'),
        expiresAt: null,
        active: true,
      }
      prisma.apiKey.findFirst.mockResolvedValue(raw)

      const result = await store.getByHash('sha256-hash')

      expect(prisma.apiKey.findFirst).toHaveBeenCalledWith({
        where: { hash: 'sha256-hash', active: true },
      })
      expect(result).toEqual({
        id: 'key-1',
        prefix: 'fabrk_live_abc',
        name: 'Production Key',
        scopes: ['read', 'write'],
        createdAt: new Date('2025-01-01'),
        lastUsedAt: new Date('2025-02-01'),
        expiresAt: undefined,
        active: true,
      })
    })

    it('should return null when no active key matches', async () => {
      prisma.apiKey.findFirst.mockResolvedValue(null)

      const result = await store.getByHash('nonexistent-hash')

      expect(result).toBeNull()
    })

    it('should map null scopes to empty array', async () => {
      prisma.apiKey.findFirst.mockResolvedValue({
        id: 'key-2',
        prefix: 'fabrk_test_xyz',
        name: 'Test Key',
        scopes: null,
        createdAt: new Date(),
        lastUsedAt: null,
        expiresAt: null,
        active: true,
      })

      const result = await store.getByHash('hash-2')

      expect(result?.scopes).toEqual([])
      expect(result?.lastUsedAt).toBeUndefined()
      expect(result?.expiresAt).toBeUndefined()
    })
  })

  describe('create', () => {
    it('should create key with all fields', async () => {
      prisma.apiKey.create.mockResolvedValue({})

      const createdAt = new Date('2025-01-01')
      const expiresAt = new Date('2026-01-01')
      await store.create({
        id: 'key-1',
        prefix: 'fabrk_live_abc',
        hash: 'sha256-hash',
        name: 'Production Key',
        scopes: ['read'],
        active: true,
        createdAt,
        expiresAt,
        userId: 'user-1',
      })

      expect(prisma.apiKey.create).toHaveBeenCalledWith({
        data: {
          id: 'key-1',
          prefix: 'fabrk_live_abc',
          hash: 'sha256-hash',
          name: 'Production Key',
          scopes: ['read'],
          userId: 'user-1',
          active: true,
          createdAt,
          expiresAt,
        },
      })
    })
  })

  describe('revoke', () => {
    it('should set active to false and record revokedAt', async () => {
      prisma.apiKey.update.mockResolvedValue({})

      await store.revoke('key-1')

      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: { active: false, revokedAt: expect.any(Date) },
      })
    })
  })

  describe('listByUser', () => {
    it('should query active keys ordered by createdAt desc', async () => {
      prisma.apiKey.findMany.mockResolvedValue([
        {
          id: 'key-2',
          prefix: 'fabrk_live_def',
          name: 'Newer Key',
          scopes: ['admin'],
          createdAt: new Date('2025-06-01'),
          lastUsedAt: null,
          expiresAt: null,
          active: true,
        },
        {
          id: 'key-1',
          prefix: 'fabrk_live_abc',
          name: 'Older Key',
          scopes: ['read'],
          createdAt: new Date('2025-01-01'),
          lastUsedAt: null,
          expiresAt: null,
          active: true,
        },
      ])

      const result = await store.listByUser('user-1')

      expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', active: true },
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('key-2')
      expect(result[1].id).toBe('key-1')
    })
  })

  describe('updateLastUsed', () => {
    it('should set lastUsedAt to current time', async () => {
      prisma.apiKey.update.mockResolvedValue({})

      await store.updateLastUsed('key-1')

      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: { lastUsedAt: expect.any(Date) },
      })
    })
  })
})

// ---------------------------------------------------------------------------
// PrismaAuditStore
// ---------------------------------------------------------------------------

describe('PrismaAuditStore', () => {
  let prisma: ReturnType<typeof createMockPrisma>
  let store: PrismaAuditStore

  beforeEach(() => {
    prisma = createMockPrisma()
    store = new PrismaAuditStore(prisma)
  })

  describe('log', () => {
    it('should create audit event with all fields', async () => {
      prisma.auditEvent.create.mockResolvedValue({})

      const timestamp = new Date('2025-03-01')
      const event = {
        id: 'evt-1',
        actorId: 'user-1',
        action: 'user.create',
        resourceType: 'user',
        resourceId: 'user-2',
        orgId: 'org-1',
        metadata: { reason: 'signup' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        timestamp,
        hash: 'sha256-event-hash',
      }

      await store.log(event)

      expect(prisma.auditEvent.create).toHaveBeenCalledWith({
        data: {
          id: 'evt-1',
          actorId: 'user-1',
          action: 'user.create',
          resourceType: 'user',
          resourceId: 'user-2',
          orgId: 'org-1',
          metadata: { reason: 'signup' },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          timestamp,
          hash: 'sha256-event-hash',
        },
      })
    })

    it('should default metadata to empty object when undefined', async () => {
      prisma.auditEvent.create.mockResolvedValue({})

      await store.log({
        id: 'evt-2',
        actorId: 'user-1',
        action: 'user.delete',
        resourceType: 'user',
        resourceId: 'user-2',
        timestamp: new Date(),
      })

      const callData = prisma.auditEvent.create.mock.calls[0][0].data
      expect(callData.metadata).toEqual({})
    })
  })

  describe('query', () => {
    it('should query with all filter options', async () => {
      const from = new Date('2025-01-01')
      const to = new Date('2025-03-01')
      prisma.auditEvent.findMany.mockResolvedValue([])

      await store.query({
        orgId: 'org-1',
        actorId: 'user-1',
        resourceType: 'user',
        resourceId: 'user-2',
        action: 'user.create',
        from,
        to,
        limit: 50,
        offset: 10,
      })

      expect(prisma.auditEvent.findMany).toHaveBeenCalledWith({
        where: {
          orgId: 'org-1',
          actorId: 'user-1',
          resourceType: 'user',
          resourceId: 'user-2',
          action: 'user.create',
          timestamp: { gte: from, lte: to },
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
        skip: 10,
      })
    })

    it('should return mapped audit events', async () => {
      const timestamp = new Date('2025-02-15')
      prisma.auditEvent.findMany.mockResolvedValue([
        {
          id: 'evt-1',
          actorId: 'user-1',
          action: 'org.update',
          resourceType: 'org',
          resourceId: 'org-1',
          orgId: 'org-1',
          metadata: { field: 'name' },
          ipAddress: '10.0.0.1',
          userAgent: 'curl/7.68.0',
          timestamp,
          hash: 'abc123',
        },
      ])

      const result = await store.query({ orgId: 'org-1' })

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'evt-1',
        actorId: 'user-1',
        action: 'org.update',
        resourceType: 'org',
        resourceId: 'org-1',
        orgId: 'org-1',
        metadata: { field: 'name' },
        ipAddress: '10.0.0.1',
        userAgent: 'curl/7.68.0',
        timestamp,
        hash: 'abc123',
      })
    })

    it('should map null optional fields to undefined', async () => {
      prisma.auditEvent.findMany.mockResolvedValue([
        {
          id: 'evt-3',
          actorId: 'user-1',
          action: 'test',
          resourceType: 'test',
          resourceId: 'test-1',
          orgId: null,
          metadata: null,
          ipAddress: null,
          userAgent: null,
          timestamp: new Date(),
          hash: null,
        },
      ])

      const result = await store.query({})

      expect(result[0].orgId).toBeUndefined()
      expect(result[0].metadata).toBeUndefined()
      expect(result[0].ipAddress).toBeUndefined()
      expect(result[0].userAgent).toBeUndefined()
      expect(result[0].hash).toBeUndefined()
    })
  })
})

// ---------------------------------------------------------------------------
// PrismaNotificationStore
// ---------------------------------------------------------------------------

describe('PrismaNotificationStore', () => {
  let prisma: ReturnType<typeof createMockPrisma>
  let store: PrismaNotificationStore

  beforeEach(() => {
    prisma = createMockPrisma()
    store = new PrismaNotificationStore(prisma)
  })

  describe('create', () => {
    it('should create notification with all fields', async () => {
      prisma.notification.create.mockResolvedValue({})

      const createdAt = new Date('2025-03-01')
      await store.create({
        id: 'notif-1',
        type: 'info',
        title: 'Welcome',
        message: 'Welcome to the platform',
        priority: 'high',
        actionUrl: '/dashboard',
        actionLabel: 'Go to dashboard',
        userIds: ['user-1', 'user-2'],
        metadata: { source: 'system' },
        read: false,
        dismissed: false,
        createdAt,
      })

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          id: 'notif-1',
          type: 'info',
          title: 'Welcome',
          message: 'Welcome to the platform',
          priority: 'high',
          actionUrl: '/dashboard',
          actionLabel: 'Go to dashboard',
          userIds: ['user-1', 'user-2'],
          metadata: { source: 'system' },
          read: false,
          dismissed: false,
          createdAt,
        },
      })
    })

    it('should default optional fields when undefined', async () => {
      prisma.notification.create.mockResolvedValue({})

      await store.create({
        id: 'notif-2',
        type: 'warning',
        title: 'Alert',
        message: 'Something happened',
        read: false,
        dismissed: false,
        createdAt: new Date(),
      })

      const callData = prisma.notification.create.mock.calls[0][0].data
      expect(callData.priority).toBe('normal')
      expect(callData.userIds).toEqual([])
      expect(callData.metadata).toEqual({})
    })
  })

  describe('getByUser', () => {
    it('should query notifications for a user (not dismissed)', async () => {
      prisma.notification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          type: 'info',
          title: 'Hello',
          message: 'World',
          priority: 'normal',
          actionUrl: null,
          actionLabel: null,
          userIds: ['user-1'],
          metadata: null,
          read: false,
          dismissed: false,
          createdAt: new Date(),
        },
      ])

      const result = await store.getByUser('user-1')

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          userIds: { has: 'user-1' },
          dismissed: false,
        },
        orderBy: { createdAt: 'desc' },
        take: undefined,
      })
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Hello')
    })

    it('should filter to unread only when option is set', async () => {
      prisma.notification.findMany.mockResolvedValue([])

      await store.getByUser('user-1', { unreadOnly: true, limit: 10 })

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          userIds: { has: 'user-1' },
          dismissed: false,
          read: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
    })

    it('should map null optional fields to undefined', async () => {
      prisma.notification.findMany.mockResolvedValue([
        {
          id: 'notif-3',
          type: 'error',
          title: 'Error',
          message: 'Something broke',
          priority: null,
          actionUrl: null,
          actionLabel: null,
          userIds: null,
          metadata: null,
          read: true,
          dismissed: false,
          createdAt: new Date(),
        },
      ])

      const result = await store.getByUser('user-1')

      expect(result[0].priority).toBeUndefined()
      expect(result[0].actionUrl).toBeUndefined()
      expect(result[0].actionLabel).toBeUndefined()
      expect(result[0].userIds).toEqual([])
      expect(result[0].metadata).toBeUndefined()
    })
  })

  describe('markRead', () => {
    it('should update read to true for a specific notification', async () => {
      prisma.notification.update.mockResolvedValue({})

      await store.markRead('notif-1')

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { read: true },
      })
    })
  })

  describe('markAllRead', () => {
    it('should update all unread notifications for user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 })

      await store.markAllRead('user-1')

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userIds: { has: 'user-1' },
          read: false,
        },
        data: { read: true },
      })
    })
  })

  describe('dismiss', () => {
    it('should set dismissed to true', async () => {
      prisma.notification.update.mockResolvedValue({})

      await store.dismiss('notif-1')

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { dismissed: true },
      })
    })
  })

  describe('getUnreadCount', () => {
    it('should count unread, non-dismissed notifications for user', async () => {
      prisma.notification.count.mockResolvedValue(7)

      const result = await store.getUnreadCount('user-1')

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: {
          userIds: { has: 'user-1' },
          read: false,
          dismissed: false,
        },
      })
      expect(result).toBe(7)
    })
  })
})

// ---------------------------------------------------------------------------
// PrismaJobStore
// ---------------------------------------------------------------------------

describe('PrismaJobStore', () => {
  let prisma: ReturnType<typeof createMockPrisma>
  let store: PrismaJobStore

  beforeEach(() => {
    prisma = createMockPrisma()
    store = new PrismaJobStore(prisma)
  })

  describe('enqueue', () => {
    it('should create job with all fields', async () => {
      prisma.job.create.mockResolvedValue({})

      const createdAt = new Date('2025-03-01')
      const scheduledAt = new Date('2025-03-02')
      await store.enqueue({
        id: 'job-1',
        type: 'email.send',
        payload: { to: 'user@example.com' },
        priority: 5,
        maxRetries: 5,
        delay: 1000,
        scheduledAt,
        status: 'pending',
        attempts: 0,
        createdAt,
      })

      expect(prisma.job.create).toHaveBeenCalledWith({
        data: {
          id: 'job-1',
          type: 'email.send',
          payload: { to: 'user@example.com' },
          priority: 5,
          maxRetries: 5,
          delay: 1000,
          scheduledAt,
          status: 'pending',
          attempts: 0,
          createdAt,
        },
      })
    })

    it('should default priority and maxRetries when undefined', async () => {
      prisma.job.create.mockResolvedValue({})

      await store.enqueue({
        id: 'job-2',
        type: 'cleanup',
        payload: {},
        status: 'pending',
        attempts: 0,
        createdAt: new Date(),
      })

      const callData = prisma.job.create.mock.calls[0][0].data
      expect(callData.priority).toBe(0)
      expect(callData.maxRetries).toBe(3)
    })
  })

  describe('dequeue', () => {
    it('should use transaction to atomically claim a job', async () => {
      const pendingJob = {
        id: 'job-1',
        type: 'email.send',
        payload: { to: 'user@example.com' },
        priority: 0,
        maxRetries: 3,
        delay: null,
        scheduledAt: null,
        status: 'running',
        attempts: 1,
        createdAt: new Date('2025-01-01'),
        lastAttemptAt: expect.any(Date),
        completedAt: null,
        error: null,
        result: null,
      }

      // The $transaction receives a callback. We simulate it by calling the callback
      // with a mock transaction client.
      prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const txClient = {
          job: {
            findFirst: vi.fn().mockResolvedValue({
              id: 'job-1',
              type: 'email.send',
              payload: { to: 'user@example.com' },
              priority: 0,
              maxRetries: 3,
              delay: null,
              scheduledAt: null,
              status: 'pending',
              attempts: 0,
              createdAt: new Date('2025-01-01'),
              lastAttemptAt: null,
              completedAt: null,
              error: null,
              result: null,
            }),
            update: vi.fn().mockResolvedValue({}),
          },
        }
        return cb(txClient)
      })

      const result = await store.dequeue()

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function))
      expect(result).not.toBeNull()
      expect(result?.id).toBe('job-1')
      expect(result?.status).toBe('running')
      expect(result?.attempts).toBe(1)
    })

    it('should return null when no pending jobs', async () => {
      prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const txClient = {
          job: {
            findFirst: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
          },
        }
        return cb(txClient)
      })

      const result = await store.dequeue()

      expect(result).toBeNull()
    })

    it('should filter by types when provided', async () => {
      let capturedFindFirstArgs: unknown

      prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const txClient = {
          job: {
            findFirst: vi.fn().mockImplementation((args: unknown) => {
              capturedFindFirstArgs = args
              return Promise.resolve(null)
            }),
            update: vi.fn(),
          },
        }
        return cb(txClient)
      })

      await store.dequeue(['email.send', 'webhook.fire'])

      // The where clause should include a type filter
      const where = (capturedFindFirstArgs as { where: Record<string, unknown> }).where
      expect(where.type).toEqual({ in: ['email.send', 'webhook.fire'] })
    })
  })

  describe('update', () => {
    it('should update job fields', async () => {
      prisma.job.update.mockResolvedValue({})

      await store.update('job-1', {
        status: 'completed',
        completedAt: new Date('2025-03-01'),
        result: { delivered: true },
      })

      expect(prisma.job.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: {
          status: 'completed',
          attempts: undefined,
          lastAttemptAt: undefined,
          completedAt: new Date('2025-03-01'),
          error: undefined,
          result: { delivered: true },
        },
      })
    })
  })

  describe('getById', () => {
    it('should return mapped job when found', async () => {
      prisma.job.findUnique.mockResolvedValue({
        id: 'job-1',
        type: 'email.send',
        payload: { to: 'user@example.com' },
        priority: 0,
        maxRetries: 3,
        delay: null,
        scheduledAt: null,
        status: 'completed',
        attempts: 1,
        createdAt: new Date('2025-01-01'),
        lastAttemptAt: new Date('2025-01-01'),
        completedAt: new Date('2025-01-01'),
        error: null,
        result: { sent: true },
      })

      const result = await store.getById('job-1')

      expect(prisma.job.findUnique).toHaveBeenCalledWith({ where: { id: 'job-1' } })
      expect(result).not.toBeNull()
      expect(result?.status).toBe('completed')
      expect(result?.result).toEqual({ sent: true })
    })

    it('should return null when not found', async () => {
      prisma.job.findUnique.mockResolvedValue(null)

      const result = await store.getById('nonexistent')

      expect(result).toBeNull()
    })

    it('should map null optional fields to undefined', async () => {
      prisma.job.findUnique.mockResolvedValue({
        id: 'job-2',
        type: 'cleanup',
        payload: null,
        priority: null,
        maxRetries: null,
        delay: null,
        scheduledAt: null,
        status: 'pending',
        attempts: 0,
        createdAt: new Date(),
        lastAttemptAt: null,
        completedAt: null,
        error: null,
        result: null,
      })

      const result = await store.getById('job-2')

      expect(result?.payload).toEqual({})
      expect(result?.priority).toBe(0)
      expect(result?.maxRetries).toBe(3)
      expect(result?.delay).toBeUndefined()
      expect(result?.scheduledAt).toBeUndefined()
      expect(result?.lastAttemptAt).toBeUndefined()
      expect(result?.completedAt).toBeUndefined()
      expect(result?.error).toBeUndefined()
      expect(result?.result).toBeUndefined()
    })
  })

  describe('getByStatus', () => {
    it('should query by status with optional limit', async () => {
      prisma.job.findMany.mockResolvedValue([
        {
          id: 'job-1',
          type: 'email.send',
          payload: {},
          priority: 0,
          maxRetries: 3,
          delay: null,
          scheduledAt: null,
          status: 'failed',
          attempts: 3,
          createdAt: new Date(),
          lastAttemptAt: new Date(),
          completedAt: null,
          error: 'Timeout',
          result: null,
        },
      ])

      const result = await store.getByStatus('failed', 10)

      expect(prisma.job.findMany).toHaveBeenCalledWith({
        where: { status: 'failed' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
      expect(result).toHaveLength(1)
      expect(result[0].error).toBe('Timeout')
    })
  })
})

// ---------------------------------------------------------------------------
// PrismaWebhookStore
// ---------------------------------------------------------------------------

describe('PrismaWebhookStore', () => {
  let prisma: ReturnType<typeof createMockPrisma>
  let store: PrismaWebhookStore

  beforeEach(() => {
    prisma = createMockPrisma()
    store = new PrismaWebhookStore(prisma)
  })

  describe('create', () => {
    it('should create webhook with all fields', async () => {
      prisma.webhook.create.mockResolvedValue({})

      const createdAt = new Date('2025-01-01')
      await store.create({
        id: 'wh-1',
        url: 'https://example.com/webhook',
        events: ['user.created', 'user.deleted'],
        secret: 'whsec_abc',
        active: true,
        createdAt,
      })

      expect(prisma.webhook.create).toHaveBeenCalledWith({
        data: {
          id: 'wh-1',
          url: 'https://example.com/webhook',
          events: ['user.created', 'user.deleted'],
          secret: 'whsec_abc',
          active: true,
          createdAt,
        },
      })
    })
  })

  describe('getById', () => {
    it('should return mapped webhook when found', async () => {
      const createdAt = new Date('2025-01-01')
      prisma.webhook.findUnique.mockResolvedValue({
        id: 'wh-1',
        url: 'https://example.com/webhook',
        events: ['user.created'],
        secret: 'whsec_abc',
        active: true,
        createdAt,
      })

      const result = await store.getById('wh-1')

      expect(prisma.webhook.findUnique).toHaveBeenCalledWith({ where: { id: 'wh-1' } })
      expect(result).toEqual({
        id: 'wh-1',
        url: 'https://example.com/webhook',
        events: ['user.created'],
        secret: 'whsec_abc',
        active: true,
        createdAt,
      })
    })

    it('should return null when not found', async () => {
      prisma.webhook.findUnique.mockResolvedValue(null)

      const result = await store.getById('nonexistent')

      expect(result).toBeNull()
    })

    it('should map null events to empty array', async () => {
      prisma.webhook.findUnique.mockResolvedValue({
        id: 'wh-2',
        url: 'https://example.com/hook',
        events: null,
        secret: 'whsec_xyz',
        active: false,
        createdAt: new Date(),
      })

      const result = await store.getById('wh-2')

      expect(result?.events).toEqual([])
    })
  })

  describe('listByEvent', () => {
    it('should query active webhooks subscribed to event', async () => {
      prisma.webhook.findMany.mockResolvedValue([
        {
          id: 'wh-1',
          url: 'https://a.com/hook',
          events: ['user.created'],
          secret: 'sec-1',
          active: true,
          createdAt: new Date(),
        },
        {
          id: 'wh-2',
          url: 'https://b.com/hook',
          events: ['user.created', 'user.updated'],
          secret: 'sec-2',
          active: true,
          createdAt: new Date(),
        },
      ])

      const result = await store.listByEvent('user.created')

      expect(prisma.webhook.findMany).toHaveBeenCalledWith({
        where: {
          active: true,
          events: { has: 'user.created' },
        },
      })
      expect(result).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('should call update with correct args', async () => {
      prisma.webhook.update.mockResolvedValue({})

      await store.update('wh-1', { active: false })

      expect(prisma.webhook.update).toHaveBeenCalledWith({
        where: { id: 'wh-1' },
        data: { active: false },
      })
    })
  })

  describe('delete', () => {
    it('should call delete with correct id', async () => {
      prisma.webhook.delete.mockResolvedValue({})

      await store.delete('wh-1')

      expect(prisma.webhook.delete).toHaveBeenCalledWith({ where: { id: 'wh-1' } })
    })
  })

  describe('recordDelivery', () => {
    it('should create delivery record with all fields', async () => {
      prisma.webhookDelivery.create.mockResolvedValue({})

      const deliveredAt = new Date('2025-03-01')
      await store.recordDelivery({
        id: 'del-1',
        webhookId: 'wh-1',
        event: 'user.created',
        statusCode: 200,
        success: true,
        attempts: 1,
        deliveredAt,
        response: '{"ok":true}',
      })

      expect(prisma.webhookDelivery.create).toHaveBeenCalledWith({
        data: {
          id: 'del-1',
          webhookId: 'wh-1',
          event: 'user.created',
          statusCode: 200,
          success: true,
          attempts: 1,
          deliveredAt,
          response: '{"ok":true}',
        },
      })
    })
  })
})

// ---------------------------------------------------------------------------
// PrismaFeatureFlagStore
// ---------------------------------------------------------------------------

describe('PrismaFeatureFlagStore', () => {
  let prisma: ReturnType<typeof createMockPrisma>
  let store: PrismaFeatureFlagStore

  beforeEach(() => {
    prisma = createMockPrisma()
    store = new PrismaFeatureFlagStore(prisma)
  })

  describe('get', () => {
    it('should return mapped flag when found', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue({
        name: 'dark-mode',
        enabled: true,
        rolloutPercent: 50,
        targetUsers: ['user-1'],
        targetRoles: ['admin'],
        metadata: { description: 'Dark mode feature' },
      })

      const result = await store.get('dark-mode')

      expect(prisma.featureFlag.findUnique).toHaveBeenCalledWith({ where: { name: 'dark-mode' } })
      expect(result).toEqual({
        name: 'dark-mode',
        enabled: true,
        rolloutPercent: 50,
        targetUsers: ['user-1'],
        targetRoles: ['admin'],
        metadata: { description: 'Dark mode feature' },
      })
    })

    it('should return null when not found', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(null)

      const result = await store.get('nonexistent')

      expect(result).toBeNull()
    })

    it('should map null optional fields to defaults', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue({
        name: 'basic-flag',
        enabled: false,
        rolloutPercent: null,
        targetUsers: null,
        targetRoles: null,
        metadata: null,
      })

      const result = await store.get('basic-flag')

      expect(result?.rolloutPercent).toBeUndefined()
      expect(result?.targetUsers).toEqual([])
      expect(result?.targetRoles).toEqual([])
      expect(result?.metadata).toBeUndefined()
    })
  })

  describe('getAll', () => {
    it('should return all flags ordered by name', async () => {
      prisma.featureFlag.findMany.mockResolvedValue([
        {
          name: 'alpha',
          enabled: true,
          rolloutPercent: 100,
          targetUsers: [],
          targetRoles: [],
          metadata: {},
        },
        {
          name: 'beta',
          enabled: false,
          rolloutPercent: null,
          targetUsers: [],
          targetRoles: [],
          metadata: null,
        },
      ])

      const result = await store.getAll()

      expect(prisma.featureFlag.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      })
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('alpha')
      expect(result[1].name).toBe('beta')
    })
  })

  describe('set', () => {
    it('should upsert flag with all fields', async () => {
      prisma.featureFlag.upsert.mockResolvedValue({})

      await store.set({
        name: 'dark-mode',
        enabled: true,
        rolloutPercent: 75,
        targetUsers: ['user-1', 'user-2'],
        targetRoles: ['admin', 'beta-tester'],
        metadata: { description: 'Dark mode' },
      })

      expect(prisma.featureFlag.upsert).toHaveBeenCalledWith({
        where: { name: 'dark-mode' },
        create: {
          name: 'dark-mode',
          enabled: true,
          rolloutPercent: 75,
          targetUsers: ['user-1', 'user-2'],
          targetRoles: ['admin', 'beta-tester'],
          metadata: { description: 'Dark mode' },
        },
        update: {
          enabled: true,
          rolloutPercent: 75,
          targetUsers: ['user-1', 'user-2'],
          targetRoles: ['admin', 'beta-tester'],
          metadata: { description: 'Dark mode' },
        },
      })
    })

    it('should default arrays and metadata when undefined', async () => {
      prisma.featureFlag.upsert.mockResolvedValue({})

      await store.set({
        name: 'simple-flag',
        enabled: true,
      })

      const call = prisma.featureFlag.upsert.mock.calls[0][0]
      expect(call.create.targetUsers).toEqual([])
      expect(call.create.targetRoles).toEqual([])
      expect(call.create.metadata).toEqual({})
      expect(call.update.targetUsers).toEqual([])
      expect(call.update.targetRoles).toEqual([])
      expect(call.update.metadata).toEqual({})
    })
  })

  describe('delete', () => {
    it('should call delete with flag name', async () => {
      prisma.featureFlag.delete.mockResolvedValue({})

      await store.delete('dark-mode')

      expect(prisma.featureFlag.delete).toHaveBeenCalledWith({ where: { name: 'dark-mode' } })
    })
  })
})

// ---------------------------------------------------------------------------
// Instantiation tests — verify all stores accept a prisma-like object
// ---------------------------------------------------------------------------

describe('Store instantiation', () => {
  it('should instantiate PrismaTeamStore', () => {
    const store = new PrismaTeamStore({})
    expect(store).toBeInstanceOf(PrismaTeamStore)
  })

  it('should instantiate PrismaApiKeyStore', () => {
    const store = new PrismaApiKeyStore({})
    expect(store).toBeInstanceOf(PrismaApiKeyStore)
  })

  it('should instantiate PrismaAuditStore', () => {
    const store = new PrismaAuditStore({})
    expect(store).toBeInstanceOf(PrismaAuditStore)
  })

  it('should instantiate PrismaNotificationStore', () => {
    const store = new PrismaNotificationStore({})
    expect(store).toBeInstanceOf(PrismaNotificationStore)
  })

  it('should instantiate PrismaJobStore', () => {
    const store = new PrismaJobStore({})
    expect(store).toBeInstanceOf(PrismaJobStore)
  })

  it('should instantiate PrismaWebhookStore', () => {
    const store = new PrismaWebhookStore({})
    expect(store).toBeInstanceOf(PrismaWebhookStore)
  })

  it('should instantiate PrismaFeatureFlagStore', () => {
    const store = new PrismaFeatureFlagStore({})
    expect(store).toBeInstanceOf(PrismaFeatureFlagStore)
  })
})
