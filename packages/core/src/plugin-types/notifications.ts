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
