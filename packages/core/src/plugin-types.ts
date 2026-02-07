/**
 * Provider-agnostic types for FABRK plugin system
 *
 * These types define the contracts between the framework and adapter packages.
 * Adapters (Stripe, Resend, S3, etc.) implement these interfaces without
 * the framework needing to know which provider is being used.
 */

// ============================================================================
// PAYMENTS
// ============================================================================

export interface CheckoutOptions {
  /** Price ID from payment provider */
  priceId: string
  /** Customer email for association */
  customerEmail?: string
  /** Customer ID from payment provider */
  customerId?: string
  /** URL to redirect on success */
  successUrl: string
  /** URL to redirect on cancel */
  cancelUrl: string
  /** Whether this is a subscription checkout */
  subscription?: boolean
  /** Trial period in days */
  trialDays?: number
  /** Arbitrary metadata to attach */
  metadata?: Record<string, string>
}

export interface CheckoutResult {
  /** Checkout session ID */
  id: string
  /** URL to redirect the customer to */
  url: string
  /** Provider-specific raw response */
  raw?: unknown
}

export interface WebhookEvent {
  /** Event type (e.g. 'checkout.completed', 'subscription.updated') */
  type: string
  /** Event ID from provider */
  id: string
  /** Parsed event data */
  data: Record<string, unknown>
  /** Provider-specific raw event */
  raw?: unknown
}

export interface WebhookResult {
  /** Whether verification passed */
  verified: boolean
  /** Parsed event, if verified */
  event?: WebhookEvent
  /** Error message, if verification failed */
  error?: string
}

export interface CustomerInfo {
  /** Customer ID from provider */
  id: string
  /** Customer email */
  email: string
  /** Display name */
  name?: string
  /** Active subscription IDs */
  subscriptions?: string[]
  /** Arbitrary metadata */
  metadata?: Record<string, string>
}

export interface SubscriptionInfo {
  /** Subscription ID from provider */
  id: string
  /** Current status */
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'paused'
  /** Price ID */
  priceId: string
  /** Current period start */
  currentPeriodStart: Date
  /** Current period end */
  currentPeriodEnd: Date
  /** Whether set to cancel at period end */
  cancelAtPeriodEnd: boolean
}

// ============================================================================
// AUTH
// ============================================================================

export interface Session {
  /** User ID */
  userId: string
  /** User email */
  email: string
  /** Display name */
  name?: string
  /** Avatar URL */
  image?: string
  /** User role */
  role?: string
  /** Session expiry */
  expiresAt?: Date
  /** Additional session data */
  metadata?: Record<string, unknown>
}

export interface ApiKeyInfo {
  /** Key ID (public identifier) */
  id: string
  /** Key prefix for display (e.g. 'fabrk_live_abc...') */
  prefix: string
  /** Key name/label */
  name: string
  /** Scopes/permissions */
  scopes: string[]
  /** Creation timestamp */
  createdAt: Date
  /** Last used timestamp */
  lastUsedAt?: Date
  /** Expiry timestamp */
  expiresAt?: Date
  /** Whether the key is active */
  active: boolean
}

export interface ApiKeyCreateResult {
  /** Key ID */
  id: string
  /** The full key (only returned on creation, never stored) */
  key: string
  /** Display prefix */
  prefix: string
}

export interface MfaSetupResult {
  /** TOTP secret */
  secret: string
  /** QR code data URI */
  qrCodeUrl: string
  /** Backup codes (only shown once) */
  backupCodes: string[]
}

export interface MfaVerifyResult {
  /** Whether verification succeeded */
  verified: boolean
  /** Whether a backup code was used */
  usedBackupCode?: boolean
}

// ============================================================================
// EMAIL
// ============================================================================

export interface EmailOptions {
  /** Recipient email(s) */
  to: string | string[]
  /** Email subject */
  subject: string
  /** HTML body */
  html?: string
  /** Plain text body */
  text?: string
  /** Reply-to address */
  replyTo?: string
  /** CC recipients */
  cc?: string | string[]
  /** BCC recipients */
  bcc?: string | string[]
  /** Custom headers */
  headers?: Record<string, string>
  /** Tags for analytics */
  tags?: Array<{ name: string; value: string }>
}

export interface EmailResult {
  /** Message ID from provider */
  id: string
  /** Whether send was successful */
  success: boolean
  /** Error message if failed */
  error?: string
}

export interface EmailTemplateData {
  /** Template name */
  template: string
  /** Template variables */
  data: Record<string, unknown>
}

// ============================================================================
// STORAGE
// ============================================================================

export interface UploadOptions {
  /** File data (ArrayBuffer, Blob, or ReadableStream) */
  file: ArrayBuffer | Blob | ReadableStream
  /** File name */
  filename: string
  /** MIME type */
  contentType: string
  /** Storage path/key */
  path?: string
  /** Whether the file should be publicly accessible */
  public?: boolean
  /** Max file size in bytes */
  maxSize?: number
  /** Allowed MIME types */
  allowedTypes?: string[]
  /** Arbitrary metadata */
  metadata?: Record<string, string>
}

export interface UploadResult {
  /** Storage key/path */
  key: string
  /** Public URL (if publicly accessible) */
  url?: string
  /** File size in bytes */
  size: number
  /** Content type */
  contentType: string
}

export interface SignedUrlOptions {
  /** Storage key */
  key: string
  /** URL expiry in seconds (default: 3600) */
  expiresIn?: number
  /** Content disposition for downloads */
  contentDisposition?: string
}

export interface SignedUrlResult {
  /** Pre-signed URL */
  url: string
  /** Expiry timestamp */
  expiresAt: Date
}

// ============================================================================
// RATE LIMITING
// ============================================================================

export interface RateLimitOptions {
  /** Identifier (e.g. IP address, user ID) */
  identifier: string
  /** Limit name/bucket */
  limit: string
  /** Max requests in window */
  max?: number
  /** Window size in seconds */
  windowSeconds?: number
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Remaining requests in window */
  remaining: number
  /** Total limit */
  limit: number
  /** Window reset timestamp */
  resetAt: Date
  /** Retry-After header value in seconds */
  retryAfter?: number
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

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
  /** Notification type */
  type: NotificationType
  /** Title */
  title: string
  /** Message body */
  message: string
  /** Priority level */
  priority?: NotificationPriority
  /** Whether to persist to database */
  persist?: boolean
  /** Auto-dismiss after ms (0 = no auto-dismiss) */
  duration?: number
  /** Action URL to navigate to */
  actionUrl?: string
  /** Action label */
  actionLabel?: string
  /** Target user IDs (empty = broadcast) */
  userIds?: string[]
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>
}

export interface Notification extends NotificationOptions {
  /** Notification ID */
  id: string
  /** Creation timestamp */
  createdAt: Date
  /** Whether read by user */
  read: boolean
  /** Whether dismissed by user */
  dismissed: boolean
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export interface FeatureFlagOptions {
  /** Flag name */
  name: string
  /** Whether enabled */
  enabled: boolean
  /** Rollout percentage (0-100) */
  rolloutPercent?: number
  /** Target user IDs for flag */
  targetUsers?: string[]
  /** Target roles */
  targetRoles?: string[]
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>
}

export interface FeatureFlagResult {
  /** Flag name */
  name: string
  /** Whether enabled for this context */
  enabled: boolean
  /** Variant value (for multivariate flags) */
  variant?: string
}

// ============================================================================
// JOB QUEUE
// ============================================================================

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying'

export interface JobOptions {
  /** Job type/name */
  type: string
  /** Job payload */
  payload: Record<string, unknown>
  /** Priority (higher = processed first) */
  priority?: number
  /** Max retry attempts */
  maxRetries?: number
  /** Delay before processing (ms) */
  delay?: number
  /** Scheduled execution time */
  scheduledAt?: Date
}

export interface Job extends JobOptions {
  /** Job ID */
  id: string
  /** Current status */
  status: JobStatus
  /** Number of attempts */
  attempts: number
  /** Creation timestamp */
  createdAt: Date
  /** Last attempt timestamp */
  lastAttemptAt?: Date
  /** Completion timestamp */
  completedAt?: Date
  /** Error message from last failure */
  error?: string
  /** Result data */
  result?: unknown
}

// ============================================================================
// WEBHOOKS
// ============================================================================

export interface WebhookConfig {
  /** Webhook ID */
  id: string
  /** Target URL */
  url: string
  /** Events to subscribe to */
  events: string[]
  /** Signing secret */
  secret: string
  /** Whether active */
  active: boolean
  /** Creation timestamp */
  createdAt: Date
}

export interface WebhookDelivery {
  /** Delivery ID */
  id: string
  /** Webhook ID */
  webhookId: string
  /** Event type */
  event: string
  /** HTTP status code from target */
  statusCode?: number
  /** Whether delivery succeeded */
  success: boolean
  /** Number of attempts */
  attempts: number
  /** Delivery timestamp */
  deliveredAt: Date
  /** Response body (truncated) */
  response?: string
}

// ============================================================================
// TEAMS / ORGANIZATIONS
// ============================================================================

export type OrgRole = 'owner' | 'admin' | 'member' | 'guest'

export interface Organization {
  /** Organization ID */
  id: string
  /** Organization name */
  name: string
  /** URL-safe slug */
  slug: string
  /** Owner user ID */
  ownerId: string
  /** Organization logo URL */
  logoUrl?: string
  /** Creation timestamp */
  createdAt: Date
  /** Organization settings */
  settings?: Record<string, unknown>
}

export interface OrgMember {
  /** User ID */
  userId: string
  /** Organization ID */
  orgId: string
  /** Member role */
  role: OrgRole
  /** Join timestamp */
  joinedAt: Date
  /** Display name */
  name?: string
  /** Email */
  email: string
  /** Avatar URL */
  image?: string
}

export interface OrgInvite {
  /** Invite ID */
  id: string
  /** Organization ID */
  orgId: string
  /** Invitee email */
  email: string
  /** Invited role */
  role: OrgRole
  /** Invite token */
  token: string
  /** Inviter user ID */
  invitedBy: string
  /** Expiry timestamp */
  expiresAt: Date
  /** Whether accepted */
  accepted: boolean
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface AuditEvent {
  /** Event ID */
  id: string
  /** Actor user ID */
  actorId: string
  /** Action performed */
  action: string
  /** Resource type (e.g. 'user', 'org', 'apiKey') */
  resourceType: string
  /** Resource ID */
  resourceId: string
  /** Organization ID (for scoping) */
  orgId?: string
  /** Event metadata */
  metadata?: Record<string, unknown>
  /** IP address */
  ipAddress?: string
  /** User agent */
  userAgent?: string
  /** Timestamp */
  timestamp: Date
  /** Tamper-proof hash */
  hash?: string
}

// ============================================================================
// STORE INTERFACES
// ============================================================================

/**
 * Base store interface pattern.
 * Each adapter package provides concrete implementations (e.g. PrismaPaymentStore).
 * The framework ships with InMemory stores for development.
 */

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
  create(key: ApiKeyInfo & { hash: string }): Promise<void>
  revoke(id: string): Promise<void>
  listByUser(userId: string): Promise<ApiKeyInfo[]>
  updateLastUsed(id: string): Promise<void>
}

export interface NotificationStore {
  create(notification: Notification): Promise<void>
  getByUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]>
  markRead(id: string): Promise<void>
  markAllRead(userId: string): Promise<void>
  dismiss(id: string): Promise<void>
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
  acceptInvite(token: string): Promise<void>
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
