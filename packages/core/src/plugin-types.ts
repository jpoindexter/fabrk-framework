export interface CheckoutOptions {
  priceId: string
  customerEmail?: string
  customerId?: string
  successUrl: string
  cancelUrl: string
  subscription?: boolean
  trialDays?: number
  metadata?: Record<string, string>
}

export interface CheckoutResult {
  id: string
  url: string
  raw?: unknown
}

export interface WebhookEvent {
  /** e.g. 'checkout.completed', 'subscription.updated' */
  type: string
  id: string
  data: Record<string, unknown>
  raw?: unknown
}

export interface WebhookResult {
  verified: boolean
  event?: WebhookEvent
  error?: string
  /** Whether this event was already processed (idempotency) */
  duplicate?: boolean
}

export interface CustomerInfo {
  id: string
  email: string
  name?: string
  subscriptions?: string[]
  metadata?: Record<string, string>
}

export interface SubscriptionInfo {
  id: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'paused'
  priceId: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
}

export interface Session {
  userId: string
  email: string
  name?: string
  image?: string
  role?: string
  expiresAt?: Date
  metadata?: Record<string, unknown>
}

export interface ApiKeyInfo {
  id: string
  /** e.g. 'fabrk_live_abc...' */
  prefix: string
  name: string
  scopes: string[]
  createdAt: Date
  lastUsedAt?: Date
  expiresAt?: Date
  active: boolean
}

export interface ApiKeyCreateResult {
  id: string
  /** Full key — only returned on creation, never stored */
  key: string
  prefix: string
}

export interface MfaSetupResult {
  secret: string
  qrCodeUrl: string
  /** Only shown once at setup time */
  backupCodes: string[]
}

export interface MfaVerifyResult {
  verified: boolean
  usedBackupCode?: boolean
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  headers?: Record<string, string>
  tags?: Array<{ name: string; value: string }>
}

export interface EmailResult {
  id: string
  success: boolean
  error?: string
}

export interface EmailTemplateData {
  template: string
  data: Record<string, unknown>
}

export interface UploadOptions {
  file: ArrayBuffer | Blob | ReadableStream
  filename: string
  contentType: string
  path?: string
  public?: boolean
  maxSize?: number
  allowedTypes?: string[]
  metadata?: Record<string, string>
}

export interface UploadResult {
  key: string
  url?: string
  size: number
  contentType: string
}

export interface SignedUrlOptions {
  key: string
  expiresIn?: number
  contentDisposition?: string
}

export interface SignedUrlResult {
  url: string
  expiresAt: Date
}

export interface RateLimitOptions {
  identifier: string
  limit: string
  max?: number
  windowSeconds?: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: Date
  retryAfter?: number
}

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'system'
  | 'billing'
  | 'security'
  | 'team'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface NotificationOptions {
  type: NotificationType
  title: string
  message: string
  priority?: NotificationPriority
  persist?: boolean
  /** Auto-dismiss after ms; 0 = no auto-dismiss */
  duration?: number
  actionUrl?: string
  actionLabel?: string
  /** Empty = broadcast to all users */
  userIds?: string[]
  metadata?: Record<string, unknown>
}

export interface Notification extends NotificationOptions {
  id: string
  createdAt: Date
  read: boolean
  dismissed: boolean
}

export interface FeatureFlagOptions {
  name: string
  enabled: boolean
  rolloutPercent?: number
  targetUsers?: string[]
  targetRoles?: string[]
  metadata?: Record<string, unknown>
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface JobOptions {
  type: string
  payload: Record<string, unknown>
  /** Higher = processed first */
  priority?: number
  maxRetries?: number
  delay?: number
  scheduledAt?: Date
}

export interface Job extends JobOptions {
  id: string
  status: JobStatus
  attempts: number
  createdAt: Date
  lastAttemptAt?: Date
  completedAt?: Date
  error?: string
  result?: unknown
}

export interface WebhookConfig {
  id: string
  url: string
  events: string[]
  secret: string
  active: boolean
  createdAt: Date
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  event: string
  statusCode?: number
  success: boolean
  attempts: number
  deliveredAt: Date
  response?: string
}

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

export interface PaymentStore {
  getCustomer(userId: string): Promise<CustomerInfo | null>
  saveCustomer(customer: CustomerInfo): Promise<void>
  getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null>
  saveSubscription(subscription: SubscriptionInfo): Promise<void>
}

export interface AuthStore {
  getSession(sessionToken: string): Promise<Session | null>
  createSession(session: Session & { token: string }): Promise<void>
  deleteSession(sessionToken: string): Promise<void>
}

export interface ApiKeyStore {
  getByHash(hash: string): Promise<ApiKeyInfo | null>
  create(key: ApiKeyInfo & { hash: string; userId: string }): Promise<void>
  revoke(id: string): Promise<void>
  listByUser(userId: string): Promise<ApiKeyInfo[]>
  updateLastUsed(id: string): Promise<void>
}

export interface NotificationStore {
  create(notification: Notification): Promise<void>
  getByUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]>
  markRead(id: string, userId: string): Promise<void>
  markAllRead(userId: string): Promise<void>
  dismiss(id: string, userId: string): Promise<void>
  getUnreadCount(userId: string): Promise<number>
}

export interface FeatureFlagStore {
  get(name: string): Promise<FeatureFlagOptions | null>
  getAll(): Promise<FeatureFlagOptions[]>
  set(flag: FeatureFlagOptions): Promise<void>
  delete(name: string): Promise<void>
}

export interface JobStore {
  enqueue(job: Job): Promise<void>
  dequeue(types?: string[]): Promise<Job | null>
  update(id: string, updates: Partial<Job>): Promise<void>
  getById(id: string): Promise<Job | null>
  getByStatus(status: JobStatus, limit?: number): Promise<Job[]>
}

export interface WebhookStore {
  create(webhook: WebhookConfig): Promise<void>
  getById(id: string): Promise<WebhookConfig | null>
  listByEvent(event: string): Promise<WebhookConfig[]>
  /** List all registered webhooks regardless of event subscription. */
  listAll(): Promise<WebhookConfig[]>
  update(id: string, updates: Partial<WebhookConfig>): Promise<void>
  delete(id: string): Promise<void>
  recordDelivery(delivery: WebhookDelivery): Promise<void>
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
