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

      // Persist if store is available and persistence is requested
      const s = getStore()
      if (s && options.persist) {
        await s.create(notification)
      } else {
        memoryStore.push(notification)
      }

      // Notify subscribers
      for (const cb of subscribers) {
        cb(notification)
      }

      return notification
    },

    async getForUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]> {
      const s = getStore()
      if (s) {
        return s.getByUser(userId, options)
      }
      // Memory fallback
      let filtered = memoryStore
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
      memoryStore.forEach((n) => { n.read = true })
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
      return memoryStore.filter((n) => !n.read && !n.dismissed).length
    },

    subscribe(callback: (notification: Notification) => void): () => void {
      subscribers.add(callback)
      return () => subscribers.delete(callback)
    },
  }
}
