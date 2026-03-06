 
import { describe, it, expect } from 'vitest'
import { createTeamManager } from './organizations'
import { InMemoryTeamStore } from './memory-store'

describe('TeamManager', () => {
  function setup() {
    const store = new InMemoryTeamStore()
    const manager = createTeamManager(store)
    return { store, manager }
  }

  describe('organizations', () => {
    it('should create an organization', async () => {
      const { manager } = setup()
      const org = await manager.createOrg({
        name: 'Acme Corp',
        slug: 'acme',
        ownerId: 'user_1',
        ownerEmail: 'owner@acme.com',
      })

      expect(org.id).toBeDefined()
      expect(org.name).toBe('Acme Corp')
      expect(org.slug).toBe('acme')
      expect(org.ownerId).toBe('user_1')
      expect(org.createdAt).toBeInstanceOf(Date)
    })

    it('should auto-add owner as member', async () => {
      const { manager } = setup()
      const org = await manager.createOrg({
        name: 'Acme',
        slug: 'acme',
        ownerId: 'user_1',
        ownerEmail: 'owner@acme.com',
      })

      const members = await manager.getMembers(org.id)
      expect(members).toHaveLength(1)
      expect(members[0].userId).toBe('user_1')
      expect(members[0].role).toBe('owner')
    })

    it('should get org by ID', async () => {
      const { manager } = setup()
      const org = await manager.createOrg({
        name: 'Test',
        slug: 'test',
        ownerId: 'user_1',
        ownerEmail: 'owner@test.com',
      })

      const fetched = await manager.getOrg(org.id)
      expect(fetched).toBeDefined()
      expect(fetched!.name).toBe('Test')
    })

    it('should get org by slug', async () => {
      const { manager } = setup()
      await manager.createOrg({
        name: 'Test',
        slug: 'my-org',
        ownerId: 'user_1',
        ownerEmail: 'owner@test.com',
      })

      const fetched = await manager.getOrgBySlug('my-org')
      expect(fetched).toBeDefined()
      expect(fetched!.slug).toBe('my-org')
    })

    it('should return null for nonexistent org', async () => {
      const { manager } = setup()
      expect(await manager.getOrg('nope')).toBeNull()
      expect(await manager.getOrgBySlug('nope')).toBeNull()
    })

    it('should update organization', async () => {
      const { manager } = setup()
      const org = await manager.createOrg({
        name: 'Old Name',
        slug: 'test',
        ownerId: 'user_1',
        ownerEmail: 'owner@test.com',
      })

      await manager.updateOrg(org.id, { name: 'New Name' })
      const updated = await manager.getOrg(org.id)
      expect(updated!.name).toBe('New Name')
    })

    it('should delete organization', async () => {
      const { manager } = setup()
      const org = await manager.createOrg({
        name: 'Test',
        slug: 'test',
        ownerId: 'user_1',
        ownerEmail: 'owner@test.com',
      })

      await manager.deleteOrg(org.id)
      expect(await manager.getOrg(org.id)).toBeNull()
    })
  })

  describe('members', () => {
    it('should add a member', async () => {
      const { manager } = setup()
      const org = await manager.createOrg({
        name: 'Test',
        slug: 'test',
        ownerId: 'user_1',
        ownerEmail: 'owner@test.com',
      })

      await manager.addMember(org.id, 'user_2', 'member', {
        name: 'Jane',
        email: 'jane@test.com',
      })

      const members = await manager.getMembers(org.id)
      expect(members).toHaveLength(2) // owner + new member
    })

    it('should update member role', async () => {
      const { manager } = setup()
      const org = await manager.createOrg({
        name: 'Test',
        slug: 'test',
        ownerId: 'user_1',
        ownerEmail: 'owner@test.com',
      })

      await manager.addMember(org.id, 'user_2', 'member', {
        email: 'user2@test.com',
      })

      await manager.updateMemberRole(org.id, 'user_2', 'admin')

      const members = await manager.getMembers(org.id)
      const user2 = members.find((m) => m.userId === 'user_2')
      expect(user2!.role).toBe('admin')
    })

    it('should remove a member', async () => {
      const { manager } = setup()
      const org = await manager.createOrg({
        name: 'Test',
        slug: 'test',
        ownerId: 'user_1',
        ownerEmail: 'owner@test.com',
      })

      await manager.addMember(org.id, 'user_2', 'member', {
        email: 'user2@test.com',
      })

      await manager.removeMember(org.id, 'user_2')

      const members = await manager.getMembers(org.id)
      expect(members).toHaveLength(1) // only owner
    })
  })

  describe('invitations', () => {
    it('should create an invite with token', async () => {
      const { manager } = setup()
      const org = await manager.createOrg({
        name: 'Test',
        slug: 'test',
        ownerId: 'user_1',
        ownerEmail: 'owner@test.com',
      })

      const invite = await manager.createInvite(
        org.id,
        'new@test.com',
        'member',
        'user_1'
      )

      expect(invite.id).toBeDefined()
      expect(invite.token).toBeDefined()
      expect(invite.token.length).toBeGreaterThan(10)
      expect(invite.email).toBe('new@test.com')
      expect(invite.role).toBe('member')
      expect(invite.accepted).toBe(false)
      expect(invite.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should accept an invite', async () => {
      const { manager } = setup()
      const org = await manager.createOrg({
        name: 'Test',
        slug: 'test',
        ownerId: 'user_1',
        ownerEmail: 'owner@test.com',
      })

      const invite = await manager.createInvite(
        org.id,
        'new@test.com',
        'member',
        'user_1'
      )

      const result = await manager.acceptInvite(invite.token, 'user_2')
      expect(result).toBeDefined()
      expect(result!.email).toBe('new@test.com')
      expect(result!.userId).toBe('user_2')
    })

    it('should return null for already accepted invite', async () => {
      const { manager } = setup()
      const org = await manager.createOrg({
        name: 'Test',
        slug: 'test',
        ownerId: 'user_1',
        ownerEmail: 'owner@test.com',
      })

      const invite = await manager.createInvite(
        org.id,
        'new@test.com',
        'member',
        'user_1'
      )

      await manager.acceptInvite(invite.token, 'user_2')
      const result = await manager.acceptInvite(invite.token, 'user_2')
      expect(result).toBeNull()
    })

    it('should return null for invalid token', async () => {
      const { manager } = setup()
      const result = await manager.acceptInvite('invalid-token', 'user_x')
      expect(result).toBeNull()
    })
  })
})
