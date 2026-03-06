export interface Session {
  userId: string
  email: string
  name?: string
  image?: string
  role?: string
  expiresAt?: Date
  metadata?: Record<string, unknown>
}

export interface ApiKeyInfo {
  id: string
  /** e.g. 'fabrk_live_abc...' */
  prefix: string
  name: string
  scopes: string[]
  createdAt: Date
  lastUsedAt?: Date
  expiresAt?: Date
  active: boolean
}

export interface ApiKeyCreateResult {
  id: string
  /** Full key — only returned on creation, never stored */
  key: string
  prefix: string
}

export interface MfaSetupResult {
  secret: string
  qrCodeUrl: string
  /** Only shown once at setup time */
  backupCodes: string[]
}

export interface MfaVerifyResult {
  verified: boolean
  usedBackupCode?: boolean
}

export interface AuthStore {
  getSession(sessionToken: string): Promise<Session | null>
  createSession(session: Session & { token: string }): Promise<void>
  deleteSession(sessionToken: string): Promise<void>
}

export interface ApiKeyStore {
  getByHash(hash: string): Promise<ApiKeyInfo | null>
  create(key: ApiKeyInfo & { hash: string; userId: string }): Promise<void>
  revoke(id: string): Promise<void>
  listByUser(userId: string): Promise<ApiKeyInfo[]>
  updateLastUsed(id: string): Promise<void>
}
