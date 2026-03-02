import type { WebhookConfig, WebhookDelivery, WebhookStore } from '../plugin-types'
import { timingSafeEqual, bytesToHex, generateRandomHex } from '../crypto'

/**
 * Check whether four IPv4 octets fall into a private or reserved range.
 */
function isPrivateIPv4(a: number, b: number, _c: number, _d: number): boolean {
  if (a === 10) return true                         // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true  // 172.16.0.0/12
  if (a === 192 && b === 168) return true            // 192.168.0.0/16
  if (a === 127) return true                         // 127.0.0.0/8
  if (a === 0) return true                           // 0.0.0.0/8
  if (a === 169 && b === 254) return true            // 169.254.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true  // 100.64.0.0/10 CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true // 198.18.0.0/15 benchmarking
  if (a >= 240) return true                           // 240.0.0.0/4 reserved + 255.255.255.255 broadcast
  return false
}

/**
 * Validate that a URL is safe for webhook dispatch (not targeting private/internal networks).
 * Rejects private IPs (including decimal, octal, hex representations), loopback,
 * link-local, IPv6, and non-http(s) schemes.
 */
function isPrivateOrReservedHost(hostname: string): boolean {
  // Normalize hostname (strip brackets from IPv6)
  const h = hostname.replace(/^\[|\]$/g, '').toLowerCase()

  if (h === 'localhost' || h === '0.0.0.0') return true

  // Block ALL IPv6 addresses (including ::1, ::ffff:x.x.x.x, expanded forms).
  // Valid webhook targets should use DNS hostnames, not raw IPv6 literals.
  if (h.includes(':')) return true

  // Single integer IP (e.g., 2130706433 = 127.0.0.1)
  if (/^\d+$/.test(h)) {
    const num = Number(h)
    if (num >= 0 && num <= 0xFFFFFFFF) {
      return isPrivateIPv4(
        (num >>> 24) & 0xFF,
        (num >>> 16) & 0xFF,
        (num >>> 8) & 0xFF,
        num & 0xFF
      )
    }
  }

  // Dotted notation with possible octal/hex octets (e.g., 0177.0.0.1, 0x7f.0.0.1)
  const parts = h.split('.')
  if (parts.length === 4 && parts.every(p => /^(0x[\da-f]+|0[0-7]*|\d+)$/i.test(p))) {
    const octets = parts.map(p => {
      if (p.startsWith('0x') || p.startsWith('0X')) return parseInt(p, 16)
      if (p.startsWith('0') && p.length > 1) return parseInt(p, 8)
      return parseInt(p, 10)
    })
    if (octets.every(o => o >= 0 && o <= 255)) {
      return isPrivateIPv4(octets[0], octets[1], octets[2], octets[3])
    }
  }

  return false
}

/** @security DNS rebinding: hostname validation is pre-connect only. In production, use a custom DNS resolver or network-level firewall to block connections to private IPs after DNS resolution. */
function validateWebhookUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid webhook URL: malformed URL')
  }

  // Only allow http and https schemes
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Invalid webhook URL scheme. Only http: and https: are allowed.`
    )
  }

  // Reject private/internal network targets
  if (isPrivateOrReservedHost(parsed.hostname)) {
    throw new Error(
      `Webhook URL targets a private or reserved network address. This is not allowed to prevent SSRF attacks.`
    )
  }
}

export interface WebhookManager {
  register(options: { url: string; events: string[] }): Promise<WebhookConfig>
  unregister(id: string): Promise<void>
  dispatch(event: string, data: Record<string, unknown>): Promise<WebhookDelivery[]>
  verify(payload: string, signature: string, secret: string): Promise<boolean>
  list(): Promise<WebhookConfig[]>
}

class InMemoryWebhookStore implements WebhookStore {
  private static readonly MAX_DELIVERIES = 10_000
  private webhooks = new Map<string, WebhookConfig>()
  private deliveries: WebhookDelivery[] = []

  async create(webhook: WebhookConfig) { this.webhooks.set(webhook.id, webhook) }
  async getById(id: string) { return this.webhooks.get(id) ?? null }
  async listByEvent(event: string) {
    return Array.from(this.webhooks.values()).filter(
      (w) => w.active && w.events.includes(event)
    )
  }
  async listAll() { return Array.from(this.webhooks.values()) }
  async update(id: string, updates: Partial<WebhookConfig>) {
    const ALLOWED_FIELDS = ['events', 'active'] as const
    const w = this.webhooks.get(id)
    if (w) {
      for (const key of ALLOWED_FIELDS) {
        if (key in updates) {
          ;(w as unknown as Record<string, unknown>)[key] = (updates as unknown as Record<string, unknown>)[key]
        }
      }
    }
  }
  async delete(id: string) { this.webhooks.delete(id) }
  async recordDelivery(delivery: WebhookDelivery) {
    if (this.deliveries.length >= InMemoryWebhookStore.MAX_DELIVERIES) {
      this.deliveries.shift()
    }
    this.deliveries.push(delivery)
  }
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
    return bytesToHex(new Uint8Array(signature))
  }

  return {
    /**
     * Register a new webhook endpoint.
     *
     * **Security Warning:** The returned `WebhookConfig` includes the HMAC signing
     * `secret` in plaintext. This secret should be:
     * - Displayed to the user **only once** at registration time (similar to API keys)
     * - Stored securely by the caller (e.g., encrypted at rest)
     * - **Never** logged, cached, or included in API list/get responses after creation
     *
     * The secret cannot be recovered after this call; if lost, the webhook must
     * be re-registered with a new secret.
     */
    async register(options): Promise<WebhookConfig> {
      validateWebhookUrl(options.url)
      const secret = generateRandomHex(32)

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
        // Re-validate URL at dispatch time to guard against store-level manipulation
        try {
          validateWebhookUrl(webhook.url)
        } catch {
          const delivery: WebhookDelivery = {
            id: crypto.randomUUID(),
            webhookId: webhook.id,
            event,
            success: false,
            attempts: 1,
            deliveredAt: new Date(),
            response: `Blocked: webhook URL failed SSRF validation`,
          }
          await webhookStore.recordDelivery(delivery)
          deliveries.push(delivery)
          continue
        }

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
            // Do not follow redirects to prevent redirect-based SSRF
            redirect: 'error',
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
      return timingSafeEqual(expected, signature)
    },

    async list(): Promise<WebhookConfig[]> {
      const all = await webhookStore.listAll()
      // Omit secret — it is only returned once at registration time
      return all.map(({ secret: _secret, ...rest }) => ({
        ...rest,
        secret: '***',
      }))
    },
  }
}
