/**
 * API Key Validator
 *
 * Validates API keys by hashing and looking up in the store.
 * Supports scope/permission checking.
 *
 * @example
 * ```ts
 * import { createApiKeyValidator } from '@fabrk/auth'
 *
 * const validator = createApiKeyValidator(apiKeyStore)
 * const keyInfo = await validator.validate('fabrk_live_abc...')
 *
 * if (keyInfo && validator.hasScope(keyInfo, 'write')) {
 *   // Authorized
 * }
 * ```
 */

import type { ApiKeyInfo, ApiKeyStore } from '@fabrk/core'
import { hashApiKey } from './generator'

export interface ApiKeyValidator {
  /** Validate a key and return its info (or null if invalid) */
  validate(key: string): Promise<ApiKeyInfo | null>
  /** Check if a key has a specific scope */
  hasScope(keyInfo: ApiKeyInfo, scope: string): boolean
  /** Check if a key has all specified scopes */
  hasAllScopes(keyInfo: ApiKeyInfo, scopes: string[]): boolean
}

export function createApiKeyValidator(store: ApiKeyStore): ApiKeyValidator {
  return {
    async validate(key: string): Promise<ApiKeyInfo | null> {
      // Validate key format
      if (!key || !key.includes('_')) {
        return null
      }

      const hash = await hashApiKey(key)
      const keyInfo = await store.getByHash(hash)

      if (!keyInfo) return null

      // Check if key is active
      if (!keyInfo.active) return null

      // Check if key is expired
      if (keyInfo.expiresAt && keyInfo.expiresAt < new Date()) {
        return null
      }

      // Update last used timestamp
      await store.updateLastUsed(keyInfo.id)

      return keyInfo
    },

    hasScope(keyInfo: ApiKeyInfo, scope: string): boolean {
      // Wildcard scope grants everything
      if (keyInfo.scopes.includes('*')) return true
      return keyInfo.scopes.includes(scope)
    },

    hasAllScopes(keyInfo: ApiKeyInfo, scopes: string[]): boolean {
      if (keyInfo.scopes.includes('*')) return true
      return scopes.every((scope) => keyInfo.scopes.includes(scope))
    },
  }
}
