import type { NotificationStore, Notification, NotificationType, NotificationPriority } from '@fabrk/core'
import type { PrismaClient } from './types'

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
      take: options?.limit ?? 200,
    })

    return notifications.map((n: Record<string, unknown>) => mapNotification(n))
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userIds: { has: userId } },
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

  async dismiss(id: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userIds: { has: userId } },
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

function mapNotification(raw: Record<string, unknown>): Notification {
  return {
    id: raw.id as string,
    type: raw.type as NotificationType,
    title: raw.title as string,
    message: raw.message as string,
    priority: (raw.priority as NotificationPriority | undefined) ?? undefined,
    actionUrl: (raw.actionUrl as string | undefined) ?? undefined,
    actionLabel: (raw.actionLabel as string | undefined) ?? undefined,
    userIds: (raw.userIds ?? []) as string[],
    metadata: (raw.metadata as Record<string, unknown> | undefined) ?? undefined,
    read: raw.read as boolean,
    dismissed: raw.dismissed as boolean,
    createdAt: raw.createdAt as Date,
  }
}
