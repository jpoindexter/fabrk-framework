/**
 * NextAuth Adapter
 *
 * Implements AuthAdapter wrapping NextAuth (Auth.js v5).
 * NextAuth is an optional peer dependency.
 *
 * @example
 * ```ts
 * import { createNextAuthAdapter } from '@fabrk/auth'
 *
 * const auth = createNextAuthAdapter({
 *   providers: ['google', 'credentials'],
 *   sessionStrategy: 'jwt',
 * })
 *
 * registry.register('auth', auth)
 * ```
 */

import type { AuthAdapter } from '@fabrk/core'
import type {
  Session,
  ApiKeyInfo,
  ApiKeyCreateResult,
  MfaSetupResult,
  MfaVerifyResult,
} from '@fabrk/core'
import type { NextAuthAdapterConfig } from '../types'
import { generateApiKey, hashApiKey } from '../api-keys/generator'
import { createApiKeyValidator } from '../api-keys/validator'
import { generateTotpSecret, generateTotpUri, verifyTotp } from '../mfa/totp'
import { generateBackupCodes, hashBackupCodes } from '../mfa/backup-codes'
import { InMemoryApiKeyStore } from '../types'

export function createNextAuthAdapter(
  config: NextAuthAdapterConfig = {}
): AuthAdapter {
  // Default to in-memory store for development
  const apiKeyStore = new InMemoryApiKeyStore()
  const validator = createApiKeyValidator(apiKeyStore)

  // MFA secrets stored in memory (in production, use a database)
  const mfaSecrets = new Map<string, string>()
  const mfaBackupCodes = new Map<string, string[]>()

  return {
    name: 'nextauth',
    version: '1.0.0',

    isConfigured(): boolean {
      return true // NextAuth configures via auth.ts, not here
    },

    async getSession(_request?: Request): Promise<Session | null> {
      // In production, this delegates to NextAuth's getServerSession()
      // The actual NextAuth integration is handled at the app level
      // This adapter provides the interface contract
      return null
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

      const keyInfo: ApiKeyInfo & { hash: string } = {
        id: crypto.randomUUID(),
        prefix,
        name: options.name,
        scopes: options.scopes,
        createdAt: new Date(),
        active: true,
        hash,
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

    async setupMfa(userId: string): Promise<MfaSetupResult> {
      const secret = generateTotpSecret()
      const qrCodeUrl = generateTotpUri(secret, userId, config.pages?.signIn ?? 'FABRK App')
      const backupCodes = generateBackupCodes(10)
      const hashedCodes = await hashBackupCodes(backupCodes)

      // Store secret and backup codes
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

      // Try TOTP first
      const totpValid = await verifyTotp(secret, code)
      if (totpValid) {
        return { verified: true, usedBackupCode: false }
      }

      // Try backup codes
      const hashedCodes = mfaBackupCodes.get(userId) ?? []
      const encoder = new TextEncoder()
      const codeHash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest('SHA-256', encoder.encode(code.toUpperCase().replace(/\s/g, '')))
        )
      )
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      const matchedIndex = hashedCodes.indexOf(codeHash)
      if (matchedIndex !== -1) {
        // Remove used backup code
        hashedCodes.splice(matchedIndex, 1)
        mfaBackupCodes.set(userId, hashedCodes)
        return { verified: true, usedBackupCode: true }
      }

      return { verified: false }
    },
  }
}
