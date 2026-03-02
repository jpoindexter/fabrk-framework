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

export interface FabrkPlugin {
  name: string
  version: string
  /** Called once during framework startup */
  initialize?(): Promise<void>
  /** Called on framework shutdown */
  destroy?(): Promise<void>
}

export interface PaymentAdapter extends FabrkPlugin {
  isConfigured(): boolean
  createCheckout(options: CheckoutOptions): Promise<CheckoutResult>
  handleWebhook(payload: string | ArrayBuffer, signature: string, headers?: Record<string, string>): Promise<WebhookResult>
  getCustomer(customerId: string): Promise<CustomerInfo | null>
  getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null>
  cancelSubscription(subscriptionId: string, options?: { atPeriodEnd?: boolean }): Promise<void>
  createPortalSession?(customerId: string, returnUrl: string): Promise<string>
}

export interface AuthAdapter extends FabrkPlugin {
  isConfigured(): boolean
  getSession(request?: Request): Promise<Session | null>
  validateApiKey(key: string): Promise<ApiKeyInfo | null>
  createApiKey(options: { userId: string; name: string; scopes: string[] }): Promise<ApiKeyCreateResult>
  revokeApiKey(id: string): Promise<void>
  listApiKeys(userId: string): Promise<ApiKeyInfo[]>
  setupMfa?(userId: string): Promise<MfaSetupResult>
  verifyMfa?(userId: string, code: string): Promise<MfaVerifyResult>
}

export interface EmailAdapter extends FabrkPlugin {
  isConfigured(): boolean
  send(options: EmailOptions): Promise<EmailResult>
  sendTemplate(to: string | string[], template: EmailTemplateData): Promise<EmailResult>
}

export interface StorageAdapter extends FabrkPlugin {
  isConfigured(): boolean
  upload(options: UploadOptions): Promise<UploadResult>
  getSignedUrl(options: SignedUrlOptions): Promise<SignedUrlResult>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

export interface RateLimitAdapter extends FabrkPlugin {
  isConfigured(): boolean
  check(options: RateLimitOptions): Promise<RateLimitResult>
  reset(identifier: string, limit: string): Promise<void>
}

export type AdapterType = 'payment' | 'auth' | 'email' | 'storage' | 'rateLimit'

export class PluginRegistry {
  private adapters = new Map<AdapterType, FabrkPlugin>()
  private plugins: FabrkPlugin[] = []

  register<T extends FabrkPlugin>(type: AdapterType, adapter: T): this {
    this.adapters.set(type, adapter)
    return this
  }

  addPlugin(plugin: FabrkPlugin): this {
    this.plugins.push(plugin)
    return this
  }

  getPayment(): PaymentAdapter | null {
    return (this.adapters.get('payment') as PaymentAdapter) ?? null
  }

  getAuth(): AuthAdapter | null {
    return (this.adapters.get('auth') as AuthAdapter) ?? null
  }

  getEmail(): EmailAdapter | null {
    return (this.adapters.get('email') as EmailAdapter) ?? null
  }

  getStorage(): StorageAdapter | null {
    return (this.adapters.get('storage') as StorageAdapter) ?? null
  }

  getRateLimit(): RateLimitAdapter | null {
    return (this.adapters.get('rateLimit') as RateLimitAdapter) ?? null
  }

  has(type: AdapterType): boolean {
    return this.adapters.has(type)
  }

  getRegisteredTypes(): AdapterType[] {
    return Array.from(this.adapters.keys())
  }

  async initialize(): Promise<void> {
    const all = [...this.adapters.values(), ...this.plugins]
    const results = await Promise.allSettled(all.map((p) => p.initialize?.() ?? Promise.resolve()))
    const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failures.length > 0) {
      throw new AggregateError(failures.map((f) => f.reason), 'Plugin initialization failed')
    }
  }

  /**
   * Destroy all registered adapters and plugins.
   * All plugins are destroyed even if some fail; throws AggregateError if any fail.
   */
  async destroy(): Promise<void> {
    const all = [...this.adapters.values(), ...this.plugins]
    const results = await Promise.allSettled(all.map((p) => p.destroy?.() ?? Promise.resolve()))
    this.adapters.clear()
    this.plugins = []
    const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failures.length > 0) {
      throw new AggregateError(failures.map((f) => f.reason), 'Plugin destroy failed')
    }
  }
}
