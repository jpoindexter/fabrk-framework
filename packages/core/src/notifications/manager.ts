/**
 * Notification Manager
 *
 * Manages both toast (ephemeral) and persistent notifications.
 */

import type {
  Notification,
  NotificationOptions,
  NotificationStore,
} from '../plugin-types'

export interface NotificationManager {
  /** Send a notification */
  notify(options: NotificationOptions): Promise<Notification>
  /** Get notifications for a user */
  getForUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]>
  /** Mark a notification as read */
  markRead(id: string): Promise<void>
  /** Mark all as read for a user */
  markAllRead(userId: string): Promise<void>
  /** Dismiss a notification */
  dismiss(id: string): Promise<void>
  /** Get unread count */
  getUnreadCount(userId: string): Promise<number>
  /** Subscribe to new notifications */
  subscribe(callback: (notification: Notification) => void): () => void
}

/** Maximum number of notifications held in the in-memory fallback store. */
const MAX_MEMORY_NOTIFICATIONS = 1000

export function createNotificationManager(
  store?: NotificationStore
): NotificationManager {
  const subscribers: Set<(notification: Notification) => void> = new Set()
  const memoryStore: Notification[] = []

  function getStore(): NotificationStore | null {
    return store ?? null
  }

  return {
    async notify(options: NotificationOptions): Promise<Notification> {
      const notification: Notification = {
        ...options,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        read: false,
        dismissed: false,
        priority: options.priority ?? 'normal',
        duration: options.duration ?? (options.type === 'error' ? 0 : 5000),
      }

      const s = getStore()
      if (s) {
        // Always use the store when available, regardless of persist flag
        // For non-persistent notifications, callers use subscribers (fire-and-forget)
        if (options.persist) {
          await s.create(notification)
        }
      } else {
        // No store configured — use in-memory as fallback
        memoryStore.push(notification)
        // Evict oldest notifications when the in-memory store exceeds the cap
        while (memoryStore.length > MAX_MEMORY_NOTIFICATIONS) {
          memoryStore.shift()
        }
      }

      // Always notify subscribers — errors in one subscriber are isolated so
      // remaining subscribers still receive the notification.
      for (const cb of subscribers) {
        try {
          cb(notification)
        } catch {
          // Subscriber errors are intentionally swallowed to protect other subscribers
        }
      }

      return notification
    },

    /**
     * @security Broadcast notifications (those without `userIds`) are visible to all users by design.
     * This allows system-wide announcements to reach every user. If you need to restrict
     * visibility, always populate the `userIds` array when creating the notification.
     */
    async getForUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]> {
      const s = getStore()
      if (s) {
        return s.getByUser(userId, options)
      }
      // Memory fallback — filter by userId to prevent cross-user data leakage
      // Notifications without userIds are broadcast (visible to all users)
      let filtered = memoryStore.filter((n) => !n.userIds || n.userIds.includes(userId))
      if (options?.unreadOnly) {
        filtered = filtered.filter((n) => !n.read)
      }
      return filtered.slice(0, options?.limit ?? 50)
    },

    async markRead(id: string): Promise<void> {
      const s = getStore()
      if (s) {
        await s.markRead(id)
        return
      }
      const n = memoryStore.find((n) => n.id === id)
      if (n) n.read = true
    },

    async markAllRead(userId: string): Promise<void> {
      const s = getStore()
      if (s) {
        await s.markAllRead(userId)
        return
      }
      memoryStore.forEach((n) => { if (!n.userIds || n.userIds.includes(userId)) n.read = true })
    },

    async dismiss(id: string): Promise<void> {
      const s = getStore()
      if (s) {
        await s.dismiss(id)
        return
      }
      const n = memoryStore.find((n) => n.id === id)
      if (n) n.dismissed = true
    },

    async getUnreadCount(userId: string): Promise<number> {
      const s = getStore()
      if (s) return s.getUnreadCount(userId)
      return memoryStore.filter((n) => (!n.userIds || n.userIds.includes(userId)) && !n.read && !n.dismissed).length
    },

    subscribe(callback: (notification: Notification) => void): () => void {
      subscribers.add(callback)
      return () => subscribers.delete(callback)
    },
  }
}
