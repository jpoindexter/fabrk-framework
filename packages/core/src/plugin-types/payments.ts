export interface CheckoutOptions {
  priceId: string
  customerEmail?: string
  customerId?: string
  successUrl: string
  cancelUrl: string
  subscription?: boolean
  trialDays?: number
  metadata?: Record<string, string>
}

export interface CheckoutResult {
  id: string
  url: string
  raw?: unknown
}

export interface WebhookEvent {
  /** e.g. 'checkout.completed', 'subscription.updated' */
  type: string
  id: string
  data: Record<string, unknown>
  raw?: unknown
}

export interface WebhookResult {
  verified: boolean
  event?: WebhookEvent
  error?: string
  /** Whether this event was already processed (idempotency) */
  duplicate?: boolean
}

export interface CustomerInfo {
  id: string
  email: string
  name?: string
  subscriptions?: string[]
  metadata?: Record<string, string>
}

export interface SubscriptionInfo {
  id: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'paused'
  priceId: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
}

export interface PaymentStore {
  getCustomer(userId: string): Promise<CustomerInfo | null>
  saveCustomer(customer: CustomerInfo): Promise<void>
  getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null>
  saveSubscription(subscription: SubscriptionInfo): Promise<void>
}
