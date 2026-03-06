import type { WebhookStore, WebhookConfig, WebhookDelivery } from '@fabrk/core'
import type { PrismaClient } from './types'

export class PrismaWebhookStore implements WebhookStore {
  constructor(private prisma: PrismaClient) {}

  async create(webhook: WebhookConfig): Promise<void> {
    if (!webhook.secret || webhook.secret.length < 32) {
      throw new Error('Webhook secret must be at least 32 characters for security')
    }
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
      take: 100,
    })
    return webhooks.map((w: Record<string, unknown>) => mapWebhook(w))
  }

  async listAll(): Promise<WebhookConfig[]> {
    const webhooks = await this.prisma.webhook.findMany({ take: 1000 })
    return webhooks.map((w: Record<string, unknown>) => mapWebhook(w))
  }

  async update(id: string, updates: Partial<WebhookConfig>): Promise<void> {
    // Whitelist allowed fields — never allow secret to be updated through this method
    const ALLOWED_FIELDS = ['events', 'active'] as const
    const filtered: Record<string, unknown> = {}
    for (const key of ALLOWED_FIELDS) {
      if (key in updates) {
        filtered[key] = (updates as Record<string, unknown>)[key]
      }
    }

    await this.prisma.webhook.update({
      where: { id },
      data: filtered,
    })
  }

  /** @security No ownership check — caller must verify the webhook belongs to the requesting user/org. */
  async delete(id: string): Promise<void> {
    await this.prisma.webhook.delete({ where: { id } })
  }

  /** @security Webhook secrets are stored in plaintext. In high-security deployments, encrypt at rest or use HMAC with a server key. */
  async getSecret(id: string): Promise<string | null> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
      select: { secret: true },
    })
    return webhook?.secret ?? null
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

function mapWebhook(raw: Record<string, unknown>): WebhookConfig {
  return {
    id: raw.id as string,
    url: raw.url as string,
    events: (raw.events ?? []) as string[],
    secret: '***',
    active: raw.active as boolean,
    createdAt: raw.createdAt as Date,
  }
}
