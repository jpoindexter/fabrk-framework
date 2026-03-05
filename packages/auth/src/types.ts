import type { AuthStore, ApiKeyStore, Session, ApiKeyInfo } from '@fabrk/core'
import { timingSafeEqual, bytesToHex } from '@fabrk/core'

export type { AuthStore, ApiKeyStore }

export interface NextAuthAdapterConfig {
  /**
   * User's NextAuth v5 `auth()` function.
   * This is the function exported from your `auth.ts` file.
   *
   * @example
   * ```ts
   * import { auth } from './lib/auth'
   * createNextAuthAdapter({ authInstance: auth })
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authInstance?: () => Promise<any>
  /** Custom API key store (defaults to InMemoryApiKeyStore) */
  apiKeyStore?: ApiKeyStore
  /** OAuth providers to enable */
  providers?: Array<'google' | 'github' | 'credentials' | 'magic-link'>
  /** Session strategy */
  sessionStrategy?: 'jwt' | 'database'
  /** Secret for JWT signing */
  secret?: string
  /** Custom pages */
  pages?: {
    signIn?: string
    signOut?: string
    error?: string
    verifyRequest?: string
  }
}

export interface ApiKeyGeneratorConfig {
  /** Key prefix (default: 'fabrk') */
  prefix?: string
  /** Key environment suffix (default: 'live') */
  environment?: 'live' | 'test'
  /** Key length in bytes (default: 32) */
  keyLength?: number
}

export class InMemoryAuthStore implements AuthStore {
  private sessions = new Map<string, Session & { token: string }>()
  private order: string[] = []
  private readonly maxEntries = 10_000

  private async hashToken(token: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    return bytesToHex(new Uint8Array(buf))
  }

  async getSession(sessionToken: string): Promise<Session | null> {
    const hash = await this.hashToken(sessionToken)
    const session = this.sessions.get(hash)
    if (!session) return null
    if (session.expiresAt && session.expiresAt < new Date()) {
      this.sessions.delete(hash)
      return null
    }
    return session
  }

  async createSession(session: Session & { token: string }): Promise<void> {
    const hash = await this.hashToken(session.token)
    this.sessions.set(hash, session)
    this.order.push(hash)
    while (this.sessions.size > this.maxEntries) {
      const oldest = this.order.shift()
      if (oldest) this.sessions.delete(oldest)
    }
  }

  async deleteSession(sessionToken: string): Promise<void> {
    const hash = await this.hashToken(sessionToken)
    this.sessions.delete(hash)
  }
}

export class InMemoryApiKeyStore implements ApiKeyStore {
  private keys = new Map<string, ApiKeyInfo & { hash: string; userId?: string }>()

  async getByHash(hash: string): Promise<ApiKeyInfo | null> {
    // Iterate ALL keys to maintain constant time — do not return early on match
    let matched: (ApiKeyInfo & { hash: string; userId?: string }) | null = null
    for (const key of this.keys.values()) {
      if (await timingSafeEqual(key.hash, hash)) {
        matched = key
      }
    }
    // Filter revoked and expired keys (matches Prisma store behavior)
    if (matched && !matched.active) return null
    if (matched?.expiresAt && matched.expiresAt < new Date()) return null
    return matched
  }

  async create(key: ApiKeyInfo & { hash: string; userId: string }): Promise<void> {
    this.keys.set(key.id, key)
  }

  async revoke(id: string): Promise<void> {
    const key = this.keys.get(id)
    if (key) {
      key.active = false
    }
  }

  async listByUser(userId: string): Promise<ApiKeyInfo[]> {
    const now = new Date()
    return Array.from(this.keys.values()).filter(
      (k) => k.active && k.userId === userId && (!k.expiresAt || k.expiresAt > now)
    )
  }

  async updateLastUsed(id: string): Promise<void> {
    const key = this.keys.get(id)
    if (key) {
      key.lastUsedAt = new Date()
    }
  }
}
