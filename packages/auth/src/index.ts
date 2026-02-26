/**
 * @fabrk/auth
 *
 * Authentication adapters for the FABRK framework.
 * Supports NextAuth, API keys, and MFA (TOTP + backup codes).
 */

export { createNextAuthAdapter } from './nextauth/adapter'

export { generateApiKey, hashApiKey } from './api-keys/generator'
export { createApiKeyValidator } from './api-keys/validator'
export type { ApiKeyValidator } from './api-keys/validator'

export { generateTotpSecret, generateTotpUri, verifyTotp } from './mfa/totp'
export { generateBackupCodes, hashBackupCodes, verifyBackupCode } from './mfa/backup-codes'

export { withAuth, withApiKey, withAuthOrApiKey } from './middleware'

export { InMemoryAuthStore, InMemoryApiKeyStore } from './types'
export type {
  NextAuthAdapterConfig,
  ApiKeyGeneratorConfig,
  AuthStore,
  ApiKeyStore,
} from './types'
