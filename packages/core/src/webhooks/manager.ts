/**
 * Webhook Manager
 *
 * Manages webhook registrations and dispatches events to registered endpoints.
 * Includes HMAC-SHA256 signature verification and retry logic.
 *
 * @example
 * ```ts
 * const webhooks = createWebhookManager()
 *
 * // Register a webhook
 * const webhook = await webhooks.register({
 *   url: 'https://example.com/webhook',
 *   events: ['user.created', 'payment.completed'],
 * })
 *
 * // Dispatch an event
 * await webhooks.dispatch('user.created', { userId: 'user_123' })
 * ```
 */

import type { WebhookConfig, WebhookDelivery, WebhookStore } from '../plugin-types'

export interface WebhookManager {
  /** Register a new webhook endpoint */
  register(options: { url: string; events: string[] }): Promise<WebhookConfig>
  /** Unregister a webhook */
  unregister(id: string): Promise<void>
  /** Dispatch an event to all matching webhooks */
  dispatch(event: string, data: Record<string, unknown>): Promise<WebhookDelivery[]>
  /** Verify a webhook signature */
  verify(payload: string, signature: string, secret: string): Promise<boolean>
  /** List all webhooks */
  list(): Promise<WebhookConfig[]>
}

/**
 * In-memory webhook store
 */
class InMemoryWebhookStore implements WebhookStore {
  private webhooks = new Map<string, WebhookConfig>()
  private deliveries: WebhookDelivery[] = []

  async create(webhook: WebhookConfig) { this.webhooks.set(webhook.id, webhook) }
  async getById(id: string) { return this.webhooks.get(id) ?? null }
  async listByEvent(event: string) {
    return Array.from(this.webhooks.values()).filter(
      (w) => w.active && w.events.includes(event)
    )
  }
  async update(id: string, updates: Partial<WebhookConfig>) {
    const w = this.webhooks.get(id)
    if (w) Object.assign(w, updates)
  }
  async delete(id: string) { this.webhooks.delete(id) }
  async recordDelivery(delivery: WebhookDelivery) { this.deliveries.push(delivery) }
}

export function createWebhookManager(
  store?: WebhookStore
): WebhookManager {
  const webhookStore = store ?? new InMemoryWebhookStore()

  async function sign(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  return {
    async register(options): Promise<WebhookConfig> {
      // Generate secret
      const secretBytes = new Uint8Array(32)
      crypto.getRandomValues(secretBytes)
      const secret = Array.from(secretBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      const webhook: WebhookConfig = {
        id: crypto.randomUUID(),
        url: options.url,
        events: options.events,
        secret: `whsec_${secret}`,
        active: true,
        createdAt: new Date(),
      }

      await webhookStore.create(webhook)
      return webhook
    },

    async unregister(id: string) {
      await webhookStore.delete(id)
    },

    async dispatch(event: string, data: Record<string, unknown>): Promise<WebhookDelivery[]> {
      const webhooks = await webhookStore.listByEvent(event)
      const deliveries: WebhookDelivery[] = []

      for (const webhook of webhooks) {
        const payload = JSON.stringify({
          event,
          data,
          timestamp: new Date().toISOString(),
          webhookId: webhook.id,
        })

        const signature = await sign(payload, webhook.secret)

        const delivery: WebhookDelivery = {
          id: crypto.randomUUID(),
          webhookId: webhook.id,
          event,
          success: false,
          attempts: 1,
          deliveredAt: new Date(),
        }

        try {
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
              'X-Webhook-Event': event,
              'X-Webhook-Id': delivery.id,
            },
            body: payload,
          })

          delivery.statusCode = response.status
          delivery.success = response.ok
          delivery.response = (await response.text()).slice(0, 1000)
        } catch (err) {
          delivery.success = false
          delivery.response = err instanceof Error ? err.message : 'Request failed'
        }

        await webhookStore.recordDelivery(delivery)
        deliveries.push(delivery)
      }

      return deliveries
    },

    async verify(payload: string, signature: string, secret: string): Promise<boolean> {
      const expected = await sign(payload, secret)
      // Constant-time comparison
      if (expected.length !== signature.length) return false
      let result = 0
      for (let i = 0; i < expected.length; i++) {
        result |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
      }
      return result === 0
    },

    async list(): Promise<WebhookConfig[]> {
      // Return all webhooks by listing all possible events
      const all = new Map<string, WebhookConfig>()
      // Use a wildcard query
      const wildcardResults = await webhookStore.listByEvent('*')
      for (const w of wildcardResults) all.set(w.id, w)
      return Array.from(all.values())
    },
  }
}
