/**
 * In-memory Team Store for development/testing
 */

import type {
  Organization,
  OrgMember,
  OrgInvite,
  OrgRole,
  TeamStore,
} from '../plugin-types'

const POISONED_MAP_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function validateKey(key: string): void {
  if (POISONED_MAP_KEYS.has(key)) {
    throw new Error(`Invalid key: "${key}" is a restricted property name`)
  }
}

export class InMemoryTeamStore implements TeamStore {
  private orgs = new Map<string, Organization>()
  private members = new Map<string, OrgMember[]>()
  private invites = new Map<string, OrgInvite>()

  async getOrg(id: string): Promise<Organization | null> {
    return this.orgs.get(id) ?? null
  }

  async getOrgBySlug(slug: string): Promise<Organization | null> {
    for (const org of this.orgs.values()) {
      if (org.slug === slug) return org
    }
    return null
  }

  async createOrg(org: Organization): Promise<void> {
    validateKey(org.id)
    this.orgs.set(org.id, org)
    this.members.set(org.id, [])
  }

  async updateOrg(id: string, updates: Partial<Organization>): Promise<void> {
    validateKey(id)
    const ALLOWED_FIELDS = ['name', 'logoUrl', 'settings'] as const
    const org = this.orgs.get(id)
    if (org) {
      for (const key of ALLOWED_FIELDS) {
        if (key in updates) {
          ;(org as unknown as Record<string, unknown>)[key] = (updates as unknown as Record<string, unknown>)[key]
        }
      }
    }
  }

  async deleteOrg(id: string): Promise<void> {
    this.orgs.delete(id)
    this.members.delete(id)
  }

  async getMembers(orgId: string): Promise<OrgMember[]> {
    return this.members.get(orgId) ?? []
  }

  async addMember(member: OrgMember): Promise<void> {
    const orgMembers = this.members.get(member.orgId) ?? []
    orgMembers.push(member)
    this.members.set(member.orgId, orgMembers)
  }

  async updateMemberRole(orgId: string, userId: string, role: OrgRole): Promise<void> {
    const orgMembers = this.members.get(orgId) ?? []
    const member = orgMembers.find((m) => m.userId === userId)
    if (member) member.role = role
  }

  async removeMember(orgId: string, userId: string): Promise<void> {
    const orgMembers = this.members.get(orgId) ?? []
    const filtered = orgMembers.filter((m) => m.userId !== userId)
    this.members.set(orgId, filtered)
  }

  async createInvite(invite: OrgInvite): Promise<void> {
    validateKey(invite.token)
    this.invites.set(invite.token, invite)
  }

  async getInviteByToken(token: string): Promise<OrgInvite | null> {
    return this.invites.get(token) ?? null
  }

  async acceptInvite(token: string): Promise<OrgInvite | null> {
    const invite = this.invites.get(token)
    if (!invite) return null
    if (invite.accepted) return null
    if (invite.expiresAt < new Date()) return null
    invite.accepted = true
    return invite
  }
}
