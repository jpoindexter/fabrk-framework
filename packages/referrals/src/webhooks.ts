/**
 * Webhook dispatch for referral events
 *
 * HMAC-SHA256 signed webhook delivery with retry support.
 */

/** Referral webhook event types */
export type ReferralWebhookEvent =
  | 'affiliate.created'
  | 'affiliate.approved'
  | 'referral.submitted'
  | 'referral.approved'
  | 'referral.rejected'
  | 'commission.created'
  | 'commission.approved'
  | 'commission.paid'
  | 'payout.requested'
  | 'payout.completed'
  | 'payout.failed'

/** Webhook configuration */
export interface WebhookConfig {
  /** Webhook endpoint URL */
  url: string
  /** HMAC secret for signing */
  secret: string
  /** Events to subscribe to */
  events: ReferralWebhookEvent[]
}

/** Webhook delivery result */
export interface WebhookDeliveryResult {
  success: boolean
  statusCode?: number
  error?: string
}

/**
 * Sign a webhook payload with HMAC-SHA256.
 * Uses Web Crypto API for cross-platform compatibility.
 */
export async function signWebhookPayload(
  payload: string,
  secret: string
): Promise<string> {
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

/**
 * Deliver a webhook event to a single endpoint.
 */
export async function deliverWebhook(
  config: WebhookConfig,
  event: ReferralWebhookEvent,
  data: Record<string, unknown>
): Promise<WebhookDeliveryResult> {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() })
  const signature = await signWebhookPayload(payload, config.secret)
  const webhookId = crypto.randomUUID()

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
        'X-Webhook-Id': webhookId,
        'X-Webhook-Timestamp': String(Date.now()),
      },
      body: payload,
      signal: AbortSignal.timeout(30000),
    })

    return {
      success: response.ok,
      statusCode: response.status,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Dispatch a webhook event to all matching subscribers.
 */
export async function dispatchWebhook(
  configs: WebhookConfig[],
  event: ReferralWebhookEvent,
  data: Record<string, unknown>
): Promise<WebhookDeliveryResult[]> {
  const matching = configs.filter((c) => c.events.includes(event))
  return Promise.all(matching.map((c) => deliverWebhook(c, event, data)))
}
