import { generateRandomHex } from '../crypto'
import type {
  Organization,
  OrgMember,
  OrgInvite,
  OrgRole,
  TeamStore,
} from '../plugin-types'

export interface TeamManager {
  createOrg(options: { name: string; slug: string; ownerId: string; ownerEmail: string }): Promise<Organization>
  getOrg(id: string): Promise<Organization | null>
  getOrgBySlug(slug: string): Promise<Organization | null>
  updateOrg(id: string, updates: Partial<Pick<Organization, 'name' | 'logoUrl' | 'settings'>>): Promise<void>
  deleteOrg(id: string): Promise<void>
  getMembers(orgId: string): Promise<OrgMember[]>
  addMember(orgId: string, userId: string, role: OrgRole, info: { name?: string; email: string }): Promise<void>
  updateMemberRole(orgId: string, userId: string, role: OrgRole): Promise<void>
  removeMember(orgId: string, userId: string): Promise<void>
  createInvite(orgId: string, email: string, role: OrgRole, invitedBy: string): Promise<OrgInvite>
  /** Email validates the accepting user matches the invite recipient */
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
      const token = generateRandomHex(32)

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
