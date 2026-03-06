import type {
  TeamStore,
  Organization,
  OrgMember,
  OrgInvite,
  OrgRole,
} from '@fabrk/core'
import type { PrismaClient } from './types'

export class PrismaTeamStore implements TeamStore {
  constructor(private prisma: PrismaClient) {}

  async getOrg(id: string): Promise<Organization | null> {
    const org = await this.prisma.organization.findUnique({ where: { id } })
    return org ? mapOrg(org) : null
  }

  async getOrgBySlug(slug: string): Promise<Organization | null> {
    const org = await this.prisma.organization.findUnique({ where: { slug } })
    return org ? mapOrg(org) : null
  }

  async createOrg(org: Organization): Promise<void> {
    await this.prisma.organization.create({
      data: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        ownerId: org.ownerId,
        logoUrl: org.logoUrl,
        createdAt: org.createdAt,
        settings: org.settings ?? {},
      },
    })
  }

  async updateOrg(id: string, updates: Partial<Organization>): Promise<void> {
    // Whitelist allowed fields to prevent mass assignment (e.g., overwriting ownerId)
    const ALLOWED_FIELDS = ['name', 'logoUrl', 'settings'] as const
    const filtered: Record<string, unknown> = {}
    for (const key of ALLOWED_FIELDS) {
      if (key in updates) {
        filtered[key] = (updates as Record<string, unknown>)[key]
      }
    }

    await this.prisma.organization.update({
      where: { id },
      data: filtered,
    })
  }

  async deleteOrg(id: string): Promise<void> {
    await this.prisma.organization.delete({ where: { id } })
  }

  async getMembers(orgId: string): Promise<OrgMember[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: true },
      take: 500,
    })
    return members.map((m: Record<string, unknown>) => {
      const user = m.user as Record<string, unknown> | undefined
      return {
        userId: m.userId as string,
        orgId: m.organizationId as string,
        role: (m.role as string).toLowerCase() as OrgRole,
        joinedAt: (m.joinedAt ?? m.createdAt) as Date,
        name: user?.name as string | undefined,
        email: (user?.email ?? '') as string,
        image: user?.image as string | undefined,
      }
    })
  }

  async addMember(member: OrgMember): Promise<void> {
    await this.prisma.organizationMember.create({
      data: {
        organizationId: member.orgId,
        userId: member.userId,
        role: member.role.toUpperCase(),
        joinedAt: member.joinedAt,
      },
    })
  }

  async updateMemberRole(orgId: string, userId: string, role: OrgRole): Promise<void> {
    await this.prisma.organizationMember.updateMany({
      where: { organizationId: orgId, userId },
      data: { role: role.toUpperCase() },
    })
  }

  async removeMember(orgId: string, userId: string): Promise<void> {
    await this.prisma.organizationMember.deleteMany({
      where: { organizationId: orgId, userId },
    })
  }

  async createInvite(invite: OrgInvite): Promise<void> {
    await this.prisma.organizationInvite.create({
      data: {
        id: invite.id,
        organizationId: invite.orgId,
        email: invite.email,
        role: invite.role.toUpperCase(),
        token: invite.token,
        invitedBy: invite.invitedBy,
        expiresAt: invite.expiresAt,
      },
    })
  }

  async getInviteByToken(token: string): Promise<OrgInvite | null> {
    const invite = await this.prisma.organizationInvite.findUnique({ where: { token } })
    return invite ? mapInvite(invite) : null
  }

  async acceptInvite(token: string): Promise<OrgInvite | null> {
    const now = new Date()
    // Atomically accept only if not yet accepted AND not expired
    const result = await this.prisma.organizationInvite.updateMany({
      where: {
        token,
        acceptedAt: null,
        expiresAt: { gt: now },
      },
      data: { acceptedAt: now },
    })
    if (result.count === 0) return null
    const raw = await this.prisma.organizationInvite.findUnique({ where: { token } })
    if (!raw) return null
    return mapInvite(raw)
  }
}

function mapOrg(raw: Record<string, unknown>): Organization {
  return {
    id: raw.id as string,
    name: raw.name as string,
    slug: raw.slug as string,
    ownerId: (raw.ownerId ?? raw.createdBy) as string,
    logoUrl: (raw.logoUrl ?? raw.logo) as string | undefined,
    createdAt: raw.createdAt as Date,
    settings: raw.settings as Record<string, unknown> | undefined,
  }
}

function mapInvite(raw: Record<string, unknown>): OrgInvite {
  return {
    id: raw.id as string,
    orgId: raw.organizationId as string,
    email: raw.email as string,
    role: (raw.role as string).toLowerCase() as OrgRole,
    token: raw.token as string,
    invitedBy: raw.invitedBy as string,
    expiresAt: raw.expiresAt as Date,
    accepted: !!raw.acceptedAt,
  }
}
