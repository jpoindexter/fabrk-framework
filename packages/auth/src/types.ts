/**
 * Auth package types
 */

import type { AuthStore, ApiKeyStore, Session, ApiKeyInfo } from '@fabrk/core'

// Re-export store interfaces for convenience
export type { AuthStore, ApiKeyStore }

export interface NextAuthAdapterConfig {
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

export interface MfaConfig {
  /** App name shown in authenticator */
  appName: string
  /** Issuer name */
  issuer?: string
  /** Number of backup codes to generate (default: 10) */
  backupCodeCount?: number
}

/**
 * In-memory auth store for development/testing
 */
export class InMemoryAuthStore implements AuthStore {
  private sessions = new Map<string, Session & { token: string }>()

  async getSession(sessionToken: string): Promise<Session | null> {
    const session = this.sessions.get(sessionToken)
    if (!session) return null
    if (session.expiresAt && session.expiresAt < new Date()) {
      this.sessions.delete(sessionToken)
      return null
    }
    return session
  }

  async createSession(session: Session & { token: string }): Promise<void> {
    this.sessions.set(session.token, session)
  }

  async deleteSession(sessionToken: string): Promise<void> {
    this.sessions.delete(sessionToken)
  }
}

/**
 * In-memory API key store for development/testing
 */
export class InMemoryApiKeyStore implements ApiKeyStore {
  private keys = new Map<string, ApiKeyInfo & { hash: string }>()
  private userKeys = new Map<string, Set<string>>()

  async getByHash(hash: string): Promise<ApiKeyInfo | null> {
    for (const key of this.keys.values()) {
      if (key.hash === hash) return key
    }
    return null
  }

  async create(key: ApiKeyInfo & { hash: string }): Promise<void> {
    this.keys.set(key.id, key)
    if (!this.userKeys.has(key.id)) {
      this.userKeys.set(key.id, new Set())
    }
  }

  async revoke(id: string): Promise<void> {
    const key = this.keys.get(id)
    if (key) {
      key.active = false
    }
  }

  async listByUser(_userId: string): Promise<ApiKeyInfo[]> {
    return Array.from(this.keys.values()).filter((k) => k.active)
  }

  async updateLastUsed(id: string): Promise<void> {
    const key = this.keys.get(id)
    if (key) {
      key.lastUsedAt = new Date()
    }
  }
}
