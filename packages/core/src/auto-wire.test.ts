 
import { describe, it, expect, vi } from 'vitest'
import { autoWire } from './auto-wire'
import type { TeamStore, NotificationStore } from './plugin-types'

function createMockTeamStore(): TeamStore {
  return {
    getOrg: vi.fn().mockResolvedValue(null),
    getOrgBySlug: vi.fn().mockResolvedValue(null),
    createOrg: vi.fn().mockResolvedValue(undefined),
    updateOrg: vi.fn().mockResolvedValue(undefined),
    deleteOrg: vi.fn().mockResolvedValue(undefined),
    getMembers: vi.fn().mockResolvedValue([]),
    addMember: vi.fn().mockResolvedValue(undefined),
    updateMemberRole: vi.fn().mockResolvedValue(undefined),
    removeMember: vi.fn().mockResolvedValue(undefined),
    createInvite: vi.fn().mockResolvedValue(undefined),
    getInviteByToken: vi.fn().mockResolvedValue(null),
    acceptInvite: vi.fn().mockResolvedValue(undefined),
  }
}

function createMockNotificationStore(): NotificationStore {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    getByUser: vi.fn().mockResolvedValue([]),
    markRead: vi.fn().mockResolvedValue(undefined),
    markAllRead: vi.fn().mockResolvedValue(undefined),
    dismiss: vi.fn().mockResolvedValue(undefined),
    getUnreadCount: vi.fn().mockResolvedValue(0),
  }
}

describe('autoWire', () => {
  it('should wire in-memory stores by default when no overrides provided', async () => {
    const { features } = await autoWire({
      teams: { enabled: true },
      notifications: { enabled: true },
      jobs: { enabled: true },
      featureFlags: { enabled: true },
      webhooks: { enabled: true },
    })

    expect(features.teams).toBeDefined()
    expect(features.notifications).toBeDefined()
    expect(features.jobs).toBeDefined()
    expect(features.featureFlags).toBeDefined()
    expect(features.webhooks).toBeDefined()
  })

  it('should use provided team store override', async () => {
    const mockStore = createMockTeamStore()

    const { features } = await autoWire(
      { teams: { enabled: true } },
      {},
      { team: mockStore }
    )

    expect(features.teams).toBeDefined()

    // Verify the mock store is being used by calling a method
    await features.teams!.getOrg('test-id')
    expect(mockStore.getOrg).toHaveBeenCalled()
  })

  it('should use provided notification store override', async () => {
    const mockStore = createMockNotificationStore()

    const { features } = await autoWire(
      { notifications: { enabled: true } },
      {},
      { notification: mockStore }
    )

    expect(features.notifications).toBeDefined()

    await features.notifications!.getUnreadCount('user-1')
    expect(mockStore.getUnreadCount).toHaveBeenCalledWith('user-1')
  })

  it('should fall back to in-memory when store override is undefined', async () => {
    const { features } = await autoWire(
      { teams: { enabled: true } },
      {},
      { team: undefined }
    )

    // Should still create a working team manager with InMemoryTeamStore
    expect(features.teams).toBeDefined()
  })

  it('should not create features when not enabled', async () => {
    const { features } = await autoWire({
      teams: { enabled: false },
      jobs: { enabled: false },
    })

    expect(features.teams).toBeNull()
    expect(features.jobs).toBeNull()
  })

  it('should accept empty store overrides', async () => {
    const { features } = await autoWire(
      { teams: { enabled: true } },
      {},
      {}
    )

    expect(features.teams).toBeDefined()
  })
})
