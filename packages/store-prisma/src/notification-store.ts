/**
 * Prisma-based Notification Store
 *
 * Persists user notifications to the database.
 */

import type { NotificationStore, Notification } from '@fabrk/core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma client is user-provided
type PrismaClient = any

export class PrismaNotificationStore implements NotificationStore {
  constructor(private prisma: PrismaClient) {}

  async create(notification: Notification): Promise<void> {
    await this.prisma.notification.create({
      data: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority ?? 'normal',
        actionUrl: notification.actionUrl,
        actionLabel: notification.actionLabel,
        userIds: notification.userIds ?? [],
        metadata: notification.metadata ?? {},
        read: notification.read,
        dismissed: notification.dismissed,
        createdAt: notification.createdAt,
      },
    })
  }

  async getByUser(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<Notification[]> {
    const where: Record<string, unknown> = {
      userIds: { has: userId },
      dismissed: false,
    }
    if (options?.unreadOnly) {
      where.read = false
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return notifications.map((n: any) => mapNotification(n))
  }

  async markRead(id: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    })
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        userIds: { has: userId },
        read: false,
      },
      data: { read: true },
    })
  }

  async dismiss(id: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: { dismissed: true },
    })
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userIds: { has: userId },
        read: false,
        dismissed: false,
      },
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNotification(raw: any): Notification {
  return {
    id: raw.id,
    type: raw.type,
    title: raw.title,
    message: raw.message,
    priority: raw.priority ?? undefined,
    actionUrl: raw.actionUrl ?? undefined,
    actionLabel: raw.actionLabel ?? undefined,
    userIds: raw.userIds ?? [],
    metadata: raw.metadata ?? undefined,
    read: raw.read,
    dismissed: raw.dismissed,
    createdAt: raw.createdAt,
  }
}
