export type OrgRole = 'owner' | 'admin' | 'member' | 'guest'

export interface Organization {
  id: string
  name: string
  slug: string
  ownerId: string
  logoUrl?: string
  createdAt: Date
  settings?: Record<string, unknown>
}

export interface OrgMember {
  userId: string
  orgId: string
  role: OrgRole
  joinedAt: Date
  name?: string
  email: string
  image?: string
}

export interface OrgInvite {
  id: string
  orgId: string
  email: string
  role: OrgRole
  token: string
  invitedBy: string
  expiresAt: Date
  accepted: boolean
}

export interface AuditEvent {
  id: string
  actorId: string
  action: string
  /** e.g. 'user', 'org', 'apiKey' */
  resourceType: string
  resourceId: string
  orgId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  /** Monotonic sequence number for deterministic ordering within the hash chain */
  sequence?: number
  /** Tamper-proof hash */
  hash?: string
}

export interface TeamStore {
  getOrg(id: string): Promise<Organization | null>
  getOrgBySlug(slug: string): Promise<Organization | null>
  createOrg(org: Organization): Promise<void>
  updateOrg(id: string, updates: Partial<Organization>): Promise<void>
  deleteOrg(id: string): Promise<void>
  getMembers(orgId: string): Promise<OrgMember[]>
  addMember(member: OrgMember): Promise<void>
  updateMemberRole(orgId: string, userId: string, role: OrgRole): Promise<void>
  removeMember(orgId: string, userId: string): Promise<void>
  createInvite(invite: OrgInvite): Promise<void>
  getInviteByToken(token: string): Promise<OrgInvite | null>
  acceptInvite(token: string): Promise<OrgInvite | null>
}

export interface AuditStore {
  log(event: AuditEvent): Promise<void>
  query(options: {
    orgId?: string
    actorId?: string
    resourceType?: string
    resourceId?: string
    action?: string
    from?: Date
    to?: Date
    limit?: number
    offset?: number
  }): Promise<AuditEvent[]>
}
