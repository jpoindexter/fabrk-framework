import type { AuthAdapter } from '@fabrk/core'
import type {
  Session,
  ApiKeyInfo,
  ApiKeyCreateResult,
  MfaSetupResult,
  MfaVerifyResult,
} from '@fabrk/core'
import type { NextAuthAdapterConfig } from '../types'
import { generateApiKey } from '../api-keys/generator'
import { createApiKeyValidator } from '../api-keys/validator'
import { generateTotpSecret, generateTotpUri, verifyTotp } from '../mfa/totp'
import { generateBackupCodes, hashBackupCodes, verifyBackupCode } from '../mfa/backup-codes'
import { InMemoryApiKeyStore } from '../types'

/**
 * MFA brute-force protection: track failed verification attempts per user.
 * After MAX_MFA_ATTEMPTS failures within MFA_LOCKOUT_SECONDS, the user
 * is locked out until the lockout period expires.
 */
const MAX_MFA_ATTEMPTS = 5
const MFA_LOCKOUT_SECONDS = 300
const MAX_MFA_ATTEMPT_ENTRIES = 10000

interface MfaAttemptRecord {
  count: number
  firstAttemptAt: number
}

const mfaAttempts = new Map<string, MfaAttemptRecord>()

function pruneMfaAttempts(): void {
  if (mfaAttempts.size <= MAX_MFA_ATTEMPT_ENTRIES) return
  const now = Date.now()
  for (const [key, record] of mfaAttempts) {
    if ((now - record.firstAttemptAt) / 1000 > MFA_LOCKOUT_SECONDS) {
      mfaAttempts.delete(key)
    }
  }
  // If still over limit, delete oldest entries
  if (mfaAttempts.size > MAX_MFA_ATTEMPT_ENTRIES) {
    const entries = [...mfaAttempts.entries()].sort((a, b) => a[1].firstAttemptAt - b[1].firstAttemptAt)
    const toDelete = entries.slice(0, entries.length - MAX_MFA_ATTEMPT_ENTRIES)
    for (const [key] of toDelete) mfaAttempts.delete(key)
  }
}

export function createNextAuthAdapter(
  config: NextAuthAdapterConfig = {}
): AuthAdapter {
  const apiKeyStore = config.apiKeyStore ?? new InMemoryApiKeyStore()
  const validator = createApiKeyValidator(apiKeyStore)

  // MFA secrets stored in memory (in production, use a database)
  const mfaSecrets = new Map<string, string>()
  const mfaBackupCodes = new Map<string, string[]>()
  const MAX_MFA_USERS = 10_000

  return {
    name: 'nextauth',
    version: '1.0.0',

    isConfigured(): boolean {
      return !!config.authInstance
    },

    async getSession(_request?: Request): Promise<Session | null> {
      if (!config.authInstance) return null

      try {
        const session = await config.authInstance()
        if (!session?.user) return null

        /** @security Reject sessions without a usable identifier to prevent downstream authz checks against undefined userId. */
        const userId = session.user.id ?? session.user.email
        if (!userId) return null

        return {
          userId,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
          role: session.user.role,
          expiresAt: session.expires ? new Date(session.expires) : undefined,
          metadata: session.user,
        }
      } catch {
        return null
      }
    },

    async validateApiKey(key: string): Promise<ApiKeyInfo | null> {
      return validator.validate(key)
    },

    async createApiKey(options: {
      userId: string
      name: string
      scopes: string[]
    }): Promise<ApiKeyCreateResult> {
      const { key, prefix, hash } = await generateApiKey()

      const keyInfo: ApiKeyInfo & { hash: string; userId: string } = {
        id: crypto.randomUUID(),
        prefix,
        name: options.name,
        scopes: options.scopes,
        createdAt: new Date(),
        active: true,
        hash,
        userId: options.userId,
      }

      await apiKeyStore.create(keyInfo)

      return {
        id: keyInfo.id,
        key,
        prefix,
      }
    },

    async revokeApiKey(id: string): Promise<void> {
      await apiKeyStore.revoke(id)
    },

    async listApiKeys(userId: string): Promise<ApiKeyInfo[]> {
      return apiKeyStore.listByUser(userId)
    },

    /**
     * Set up MFA for a user.
     *
     * @param userId - The user's identifier.
     * @param force - Pass `true` to allow re-enrollment when MFA is already set up.
     *   Defaults to `false` to prevent silent overwrite of an existing enrollment.
     *   **Callers must verify the user's identity before passing `force=true`.**
     *
     * @throws {Error} If MFA is already configured and `force` is not `true`.
     *
     * @security Silent overwrite of an existing MFA enrollment lets an attacker who
     * briefly controls a session lock out the legitimate user. Always check for an
     * existing secret and require explicit opt-in (`force=true`) to re-enroll.
     */
    async setupMfa(userId: string, force = false): Promise<MfaSetupResult> {
      if (!force && mfaSecrets.has(userId)) {
        throw new Error('MFA is already set up for this user. Pass force=true to re-enroll.')
      }

      const secret = generateTotpSecret()
      // Use a proper human-readable app name as the TOTP issuer.
      // config.pages?.signIn is a URL path (e.g. "/auth/signin"), not an app name.
      // There is no appName field on NextAuthAdapterConfig, so fall back to 'FABRK App'.
      const issuer = 'FABRK App'
      const qrCodeUrl = generateTotpUri(secret, userId, issuer)
      const backupCodes = generateBackupCodes(10)
      const hashedCodes = await hashBackupCodes(backupCodes)

      // Evict oldest entries (FIFO via Map insertion order) to prevent unbounded growth
      if (mfaSecrets.size >= MAX_MFA_USERS && !mfaSecrets.has(userId)) {
        const oldest = mfaSecrets.keys().next().value
        if (oldest !== undefined) {
          mfaSecrets.delete(oldest)
          mfaBackupCodes.delete(oldest)
        }
      }

      mfaSecrets.set(userId, secret)
      mfaBackupCodes.set(userId, hashedCodes)

      return {
        secret,
        qrCodeUrl,
        backupCodes,
      }
    },

    async verifyMfa(userId: string, code: string): Promise<MfaVerifyResult> {
      const secret = mfaSecrets.get(userId)
      if (!secret) {
        return { verified: false }
      }

      pruneMfaAttempts()

      const now = Date.now()
      const attempt = mfaAttempts.get(userId)
      if (attempt) {
        const elapsed = (now - attempt.firstAttemptAt) / 1000
        if (elapsed > MFA_LOCKOUT_SECONDS) {
          mfaAttempts.delete(userId)
        } else if (attempt.count >= MAX_MFA_ATTEMPTS) {
          return { verified: false }
        }
      }

      const totpValid = await verifyTotp(secret, code)
      if (totpValid) {
        mfaAttempts.delete(userId)
        return { verified: true, usedBackupCode: false }
      }

      const hashedCodes = mfaBackupCodes.get(userId) ?? []
      const { valid, matchedIndex } = await verifyBackupCode(code, hashedCodes)
      if (valid) {
        hashedCodes.splice(matchedIndex, 1)
        mfaBackupCodes.set(userId, hashedCodes)
        mfaAttempts.delete(userId)
        return { verified: true, usedBackupCode: true }
      }

      const currentAttempt = mfaAttempts.get(userId)
      if (currentAttempt) {
        currentAttempt.count++
      } else {
        mfaAttempts.set(userId, { count: 1, firstAttemptAt: now })
      }

      return { verified: false }
    },
  }
}
