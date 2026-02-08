/**
 * Prisma-based Webhook Store
 *
 * Persists webhook configurations and delivery records to the database.
 */

import type { WebhookStore, WebhookConfig, WebhookDelivery } from '@fabrk/core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma client is user-provided
type PrismaClient = any

export class PrismaWebhookStore implements WebhookStore {
  constructor(private prisma: PrismaClient) {}

  async create(webhook: WebhookConfig): Promise<void> {
    await this.prisma.webhook.create({
      data: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret,
        active: webhook.active,
        createdAt: webhook.createdAt,
      },
    })
  }

  async getById(id: string): Promise<WebhookConfig | null> {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } })
    return webhook ? mapWebhook(webhook) : null
  }

  async listByEvent(event: string): Promise<WebhookConfig[]> {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        active: true,
        events: { has: event },
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return webhooks.map((w: any) => mapWebhook(w))
  }

  async update(id: string, updates: Partial<WebhookConfig>): Promise<void> {
    await this.prisma.webhook.update({
      where: { id },
      data: updates,
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.webhook.delete({ where: { id } })
  }

  async recordDelivery(delivery: WebhookDelivery): Promise<void> {
    await this.prisma.webhookDelivery.create({
      data: {
        id: delivery.id,
        webhookId: delivery.webhookId,
        event: delivery.event,
        statusCode: delivery.statusCode,
        success: delivery.success,
        attempts: delivery.attempts,
        deliveredAt: delivery.deliveredAt,
        response: delivery.response,
      },
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWebhook(raw: any): WebhookConfig {
  return {
    id: raw.id,
    url: raw.url,
    events: raw.events ?? [],
    secret: raw.secret,
    active: raw.active,
    createdAt: raw.createdAt,
  }
}
