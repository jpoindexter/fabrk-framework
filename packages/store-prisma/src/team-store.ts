/**
 * Prisma-based Team Store
 *
 * Persists organizations, members, and invites to the database.
 */

import type {
  TeamStore,
  Organization,
  OrgMember,
  OrgInvite,
  OrgRole,
} from '@fabrk/core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma client is user-provided
type PrismaClient = any

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
    await this.prisma.organization.update({
      where: { id },
      data: updates,
    })
  }

  async deleteOrg(id: string): Promise<void> {
    await this.prisma.organization.delete({ where: { id } })
  }

  async getMembers(orgId: string): Promise<OrgMember[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: true },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return members.map((m: any) => ({
      userId: m.userId,
      orgId: m.organizationId,
      role: (m.role as string).toLowerCase() as OrgRole,
      joinedAt: m.joinedAt ?? m.createdAt,
      name: m.user?.name,
      email: m.user?.email ?? '',
      image: m.user?.image,
    }))
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

  async acceptInvite(token: string): Promise<void> {
    await this.prisma.organizationInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrg(raw: any): Organization {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    ownerId: raw.ownerId ?? raw.createdBy,
    logoUrl: raw.logoUrl ?? raw.logo,
    createdAt: raw.createdAt,
    settings: raw.settings,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInvite(raw: any): OrgInvite {
  return {
    id: raw.id,
    orgId: raw.organizationId,
    email: raw.email,
    role: (raw.role as string).toLowerCase() as OrgRole,
    token: raw.token,
    invitedBy: raw.invitedBy,
    expiresAt: raw.expiresAt,
    accepted: !!raw.acceptedAt,
  }
}
