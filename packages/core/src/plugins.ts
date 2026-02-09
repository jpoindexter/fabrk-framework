/**
 * FABRK Plugin System
 *
 * Defines adapter interfaces for all framework capabilities and the
 * PluginRegistry that manages them. Adapter packages (@fabrk/payments,
 * @fabrk/auth, etc.) provide concrete implementations.
 */

import type {
  CheckoutOptions,
  CheckoutResult,
  WebhookResult,
  CustomerInfo,
  SubscriptionInfo,
  Session,
  ApiKeyInfo,
  ApiKeyCreateResult,
  MfaSetupResult,
  MfaVerifyResult,
  EmailOptions,
  EmailResult,
  EmailTemplateData,
  UploadOptions,
  UploadResult,
  SignedUrlOptions,
  SignedUrlResult,
  RateLimitOptions,
  RateLimitResult,
} from './plugin-types'

// ============================================================================
// BASE PLUGIN INTERFACE
// ============================================================================

export interface FabrkPlugin {
  /** Unique plugin name */
  name: string
  /** Plugin version (semver) */
  version: string
  /** Initialize the plugin (called once during framework startup) */
  initialize?(): Promise<void>
  /** Cleanup the plugin (called on framework shutdown) */
  destroy?(): Promise<void>
}

// ============================================================================
// ADAPTER INTERFACES
// ============================================================================

/**
 * Payment adapter interface
 *
 * Implemented by @fabrk/payments adapters (Stripe, Polar, Lemon Squeezy).
 *
 * @example
 * ```ts
 * import { createStripeAdapter } from '@fabrk/payments'
 *
 * const payments = createStripeAdapter({
 *   secretKey: process.env.STRIPE_SECRET_KEY!,
 *   webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
 * })
 * ```
 */
export interface PaymentAdapter extends FabrkPlugin {
  /** Whether the adapter is properly configured */
  isConfigured(): boolean
  /** Create a checkout session */
  createCheckout(options: CheckoutOptions): Promise<CheckoutResult>
  /** Verify and parse a webhook event */
  handleWebhook(payload: string | ArrayBuffer, signature: string, headers?: Record<string, string>): Promise<WebhookResult>
  /** Get customer info by ID */
  getCustomer(customerId: string): Promise<CustomerInfo | null>
  /** Get subscription info by ID */
  getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null>
  /** Cancel a subscription */
  cancelSubscription(subscriptionId: string, options?: { atPeriodEnd?: boolean }): Promise<void>
  /** Create a billing portal session URL */
  createPortalSession?(customerId: string, returnUrl: string): Promise<string>
}

/**
 * Auth adapter interface
 *
 * Implemented by @fabrk/auth adapters (NextAuth, custom).
 *
 * @example
 * ```ts
 * import { createNextAuthAdapter } from '@fabrk/auth'
 *
 * const auth = createNextAuthAdapter({
 *   providers: ['google', 'credentials'],
 * })
 * ```
 */
export interface AuthAdapter extends FabrkPlugin {
  /** Whether the adapter is properly configured */
  isConfigured(): boolean
  /** Get the current session */
  getSession(request?: Request): Promise<Session | null>
  /** Validate an API key and return key info */
  validateApiKey(key: string): Promise<ApiKeyInfo | null>
  /** Create a new API key */
  createApiKey(options: { userId: string; name: string; scopes: string[] }): Promise<ApiKeyCreateResult>
  /** Revoke an API key */
  revokeApiKey(id: string): Promise<void>
  /** List API keys for a user */
  listApiKeys(userId: string): Promise<ApiKeyInfo[]>
  /** Set up MFA for a user */
  setupMfa?(userId: string): Promise<MfaSetupResult>
  /** Verify an MFA code */
  verifyMfa?(userId: string, code: string): Promise<MfaVerifyResult>
}

/**
 * Email adapter interface
 *
 * Implemented by @fabrk/email adapters (Resend, console).
 *
 * @example
 * ```ts
 * import { createResendAdapter } from '@fabrk/email'
 *
 * const email = createResendAdapter({
 *   apiKey: process.env.RESEND_API_KEY!,
 *   from: 'noreply@yourapp.com',
 * })
 * ```
 */
export interface EmailAdapter extends FabrkPlugin {
  /** Whether the adapter is properly configured */
  isConfigured(): boolean
  /** Send a raw email */
  send(options: EmailOptions): Promise<EmailResult>
  /** Send a templated email */
  sendTemplate(to: string | string[], template: EmailTemplateData): Promise<EmailResult>
}

/**
 * Storage adapter interface
 *
 * Implemented by @fabrk/storage adapters (S3, R2, local).
 *
 * @example
 * ```ts
 * import { createS3Adapter } from '@fabrk/storage'
 *
 * const storage = createS3Adapter({
 *   bucket: process.env.S3_BUCKET!,
 *   region: process.env.AWS_REGION!,
 * })
 * ```
 */
export interface StorageAdapter extends FabrkPlugin {
  /** Whether the adapter is properly configured */
  isConfigured(): boolean
  /** Upload a file */
  upload(options: UploadOptions): Promise<UploadResult>
  /** Get a signed URL for private file access */
  getSignedUrl(options: SignedUrlOptions): Promise<SignedUrlResult>
  /** Delete a file */
  delete(key: string): Promise<void>
  /** Check if a file exists */
  exists(key: string): Promise<boolean>
}

/**
 * Rate limit adapter interface
 *
 * Implemented by @fabrk/security adapters (memory, Upstash Redis).
 *
 * @example
 * ```ts
 * import { createUpstashRateLimiter } from '@fabrk/security'
 *
 * const rateLimit = createUpstashRateLimiter({
 *   url: process.env.UPSTASH_REDIS_REST_URL!,
 *   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
 * })
 * ```
 */
export interface RateLimitAdapter extends FabrkPlugin {
  /** Whether the adapter is properly configured */
  isConfigured(): boolean
  /** Check rate limit for an identifier */
  check(options: RateLimitOptions): Promise<RateLimitResult>
  /** Reset rate limit for an identifier */
  reset(identifier: string, limit: string): Promise<void>
}

// ============================================================================
// PLUGIN REGISTRY
// ============================================================================

export type AdapterType = 'payment' | 'auth' | 'email' | 'storage' | 'rateLimit'

/**
 * Plugin registry for managing framework adapters
 *
 * Provides typed access to registered adapters and manages plugin lifecycle.
 *
 * @example
 * ```ts
 * const registry = new PluginRegistry()
 *
 * // Register adapters
 * registry.register('payment', stripeAdapter)
 * registry.register('auth', nextAuthAdapter)
 *
 * // Access adapters with type safety
 * const payments = registry.getPayment()
 * const session = await registry.getAuth()?.getSession()
 * ```
 */
export class PluginRegistry {
  private adapters = new Map<AdapterType, FabrkPlugin>()
  private plugins: FabrkPlugin[] = []

  /**
   * Register an adapter for a specific capability
   */
  register<T extends FabrkPlugin>(type: AdapterType, adapter: T): this {
    this.adapters.set(type, adapter)
    return this
  }

  /**
   * Register a generic plugin (non-adapter)
   */
  addPlugin(plugin: FabrkPlugin): this {
    this.plugins.push(plugin)
    return this
  }

  /**
   * Get the registered payment adapter
   */
  getPayment(): PaymentAdapter | null {
    return (this.adapters.get('payment') as PaymentAdapter) ?? null
  }

  /**
   * Get the registered auth adapter
   */
  getAuth(): AuthAdapter | null {
    return (this.adapters.get('auth') as AuthAdapter) ?? null
  }

  /**
   * Get the registered email adapter
   */
  getEmail(): EmailAdapter | null {
    return (this.adapters.get('email') as EmailAdapter) ?? null
  }

  /**
   * Get the registered storage adapter
   */
  getStorage(): StorageAdapter | null {
    return (this.adapters.get('storage') as StorageAdapter) ?? null
  }

  /**
   * Get the registered rate limit adapter
   */
  getRateLimit(): RateLimitAdapter | null {
    return (this.adapters.get('rateLimit') as RateLimitAdapter) ?? null
  }

  /**
   * Check if an adapter type is registered
   */
  has(type: AdapterType): boolean {
    return this.adapters.has(type)
  }

  /**
   * Get all registered adapter types
   */
  getRegisteredTypes(): AdapterType[] {
    return Array.from(this.adapters.keys())
  }

  /**
   * Initialize all registered adapters and plugins
   */
  async initialize(): Promise<void> {
    const all = [...this.adapters.values(), ...this.plugins]
    await Promise.all(all.map((p) => p.initialize?.()))
  }

  /**
   * Destroy all registered adapters and plugins
   */
  async destroy(): Promise<void> {
    const all = [...this.adapters.values(), ...this.plugins]
    await Promise.all(all.map((p) => p.destroy?.()))
    this.adapters.clear()
    this.plugins = []
  }
}
