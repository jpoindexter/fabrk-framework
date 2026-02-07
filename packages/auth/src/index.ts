/**
 * @fabrk/auth
 *
 * Authentication adapters for the FABRK framework.
 * Supports NextAuth, API keys, and MFA (TOTP + backup codes).
 */

// Adapters
export { createNextAuthAdapter } from './nextauth/adapter'

// API Keys
export { generateApiKey, hashApiKey } from './api-keys/generator'
export { createApiKeyValidator } from './api-keys/validator'
export type { ApiKeyValidator } from './api-keys/validator'

// MFA
export { generateTotpSecret, generateTotpUri, verifyTotp } from './mfa/totp'
export { generateBackupCodes, hashBackupCodes, verifyBackupCode } from './mfa/backup-codes'

// Middleware
export { withAuth, withApiKey, withAuthOrApiKey } from './middleware'

// Types & Stores
export { InMemoryAuthStore, InMemoryApiKeyStore } from './types'
export type {
  NextAuthAdapterConfig,
  ApiKeyGeneratorConfig,
  MfaConfig,
  AuthStore,
  ApiKeyStore,
} from './types'
