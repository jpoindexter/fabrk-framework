/**
 * Organization / Team Management
 *
 * CRUD operations for organizations, members, and invitations.
 */

import type {
  Organization,
  OrgMember,
  OrgInvite,
  OrgRole,
  TeamStore,
} from '../plugin-types'

export interface TeamManager {
  /** Create an organization */
  createOrg(options: { name: string; slug: string; ownerId: string; ownerEmail: string }): Promise<Organization>
  /** Get organization by ID */
  getOrg(id: string): Promise<Organization | null>
  /** Get organization by slug */
  getOrgBySlug(slug: string): Promise<Organization | null>
  /** Update organization */
  updateOrg(id: string, updates: Partial<Pick<Organization, 'name' | 'logoUrl' | 'settings'>>): Promise<void>
  /** Delete organization */
  deleteOrg(id: string): Promise<void>
  /** Get members of an organization */
  getMembers(orgId: string): Promise<OrgMember[]>
  /** Add a member to an organization */
  addMember(orgId: string, userId: string, role: OrgRole, info: { name?: string; email: string }): Promise<void>
  /** Update a member's role */
  updateMemberRole(orgId: string, userId: string, role: OrgRole): Promise<void>
  /** Remove a member from an organization */
  removeMember(orgId: string, userId: string): Promise<void>
  /** Create an invitation */
  createInvite(orgId: string, email: string, role: OrgRole, invitedBy: string): Promise<OrgInvite>
  /** Accept an invitation (email validates the accepting user matches the invite) */
  acceptInvite(token: string, userId: string, email?: string): Promise<OrgMember | null>
}

export function createTeamManager(store: TeamStore): TeamManager {
  return {
    async createOrg(options): Promise<Organization> {
      const org: Organization = {
        id: crypto.randomUUID(),
        name: options.name,
        slug: options.slug,
        ownerId: options.ownerId,
        createdAt: new Date(),
      }

      await store.createOrg(org)

      await store.addMember({
        userId: options.ownerId,
        orgId: org.id,
        role: 'owner',
        joinedAt: new Date(),
        email: options.ownerEmail,
      })

      return org
    },

    async getOrg(id: string) {
      return store.getOrg(id)
    },

    async getOrgBySlug(slug: string) {
      return store.getOrgBySlug(slug)
    },

    /** @security No authorization check — caller must verify user has admin/owner role */
    async updateOrg(id: string, updates) {
      await store.updateOrg(id, updates)
    },

    /** @security No authorization check — caller must verify user has admin/owner role */
    async deleteOrg(id: string) {
      await store.deleteOrg(id)
    },

    async getMembers(orgId: string) {
      return store.getMembers(orgId)
    },

    async addMember(orgId, userId, role, info) {
      await store.addMember({
        orgId,
        userId,
        role,
        joinedAt: new Date(),
        name: info.name,
        email: info.email,
      })
    },

    /** @security No authorization check — caller must verify user has admin/owner role */
    async updateMemberRole(orgId, userId, role) {
      await store.updateMemberRole(orgId, userId, role)
    },

    /** @security No authorization check — caller must verify user has admin/owner role */
    async removeMember(orgId, userId) {
      await store.removeMember(orgId, userId)
    },

    async createInvite(orgId, email, role, invitedBy) {
      const bytes = new Uint8Array(32)
      crypto.getRandomValues(bytes)
      const token = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      const invite: OrgInvite = {
        id: crypto.randomUUID(),
        orgId,
        email,
        role,
        token,
        invitedBy,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        accepted: false,
      }

      await store.createInvite(invite)
      return invite
    },

    /** @security Validates accepting user's email matches the invite recipient */
    async acceptInvite(token: string, userId: string, email?: string): Promise<OrgMember | null> {
      if (!userId) return null

      const invite = await store.acceptInvite(token)
      if (!invite) return null

      // Verify the accepting user matches the invited email when provided
      if (email && invite.email.toLowerCase() !== email.toLowerCase()) {
        return null
      }

      const member: OrgMember = {
        userId,
        orgId: invite.orgId,
        role: invite.role,
        joinedAt: new Date(),
        email: invite.email,
      }

      await store.addMember(member)
      return member
    },
  }
}
