import type {
  Notification,
  NotificationOptions,
  NotificationStore,
} from '../plugin-types'

export interface NotificationManager {
  notify(options: NotificationOptions): Promise<Notification>
  getForUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]>
  markRead(id: string, userId: string): Promise<void>
  markAllRead(userId: string): Promise<void>
  dismiss(id: string, userId: string): Promise<void>
  getUnreadCount(userId: string): Promise<number>
  subscribe(callback: (notification: Notification) => void): () => void
}

/** Maximum number of notifications held in the in-memory fallback store. */
const MAX_MEMORY_NOTIFICATIONS = 1000

export function createNotificationManager(
  store?: NotificationStore
): NotificationManager {
  const subscribers: Set<(notification: Notification) => void> = new Set()
  const memoryStore: Notification[] = []

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

      if (store) {
        if (options.persist) {
          await store.create(notification)
        }
      } else {
        memoryStore.push(notification)
        while (memoryStore.length > MAX_MEMORY_NOTIFICATIONS) {
          memoryStore.shift()
        }
      }

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
     */
    async getForUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]> {
      if (store) {
        return store.getByUser(userId, options)
      }
      let filtered = memoryStore.filter((n) => !n.userIds || n.userIds.includes(userId))
      if (options?.unreadOnly) {
        filtered = filtered.filter((n) => !n.read)
      }
      return filtered.slice(0, options?.limit ?? 50)
    },

    async markRead(id: string, userId: string): Promise<void> {
      if (store) {
        await store.markRead(id, userId)
        return
      }
      const n = memoryStore.find((n) => n.id === id && (!n.userIds || n.userIds.includes(userId)))
      if (n) n.read = true
    },

    async markAllRead(userId: string): Promise<void> {
      if (store) {
        await store.markAllRead(userId)
        return
      }
      memoryStore.forEach((n) => { if (!n.userIds || n.userIds.includes(userId)) n.read = true })
    },

    async dismiss(id: string, userId: string): Promise<void> {
      if (store) {
        await store.dismiss(id, userId)
        return
      }
      const n = memoryStore.find((n) => n.id === id && (!n.userIds || n.userIds.includes(userId)))
      if (n) n.dismissed = true
    },

    async getUnreadCount(userId: string): Promise<number> {
      if (store) return store.getUnreadCount(userId)
      return memoryStore.filter((n) => (!n.userIds || n.userIds.includes(userId)) && !n.read && !n.dismissed).length
    },

    subscribe(callback: (notification: Notification) => void): () => void {
      subscribers.add(callback)
      return () => subscribers.delete(callback)
    },
  }
}
