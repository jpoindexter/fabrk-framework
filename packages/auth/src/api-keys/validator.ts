import type { ApiKeyInfo, ApiKeyStore } from '@fabrk/core'
import { hashApiKey } from './generator'

export interface ApiKeyValidator {
  validate(key: string): Promise<ApiKeyInfo | null>
  hasScope(keyInfo: ApiKeyInfo, scope: string): boolean
  hasAllScopes(keyInfo: ApiKeyInfo, scopes: string[]): boolean
}

export function createApiKeyValidator(store: ApiKeyStore): ApiKeyValidator {
  return {
    async validate(key: string): Promise<ApiKeyInfo | null> {
      if (!key || !key.includes('_')) {
        return null
      }

      const hash = await hashApiKey(key)
      const keyInfo = await store.getByHash(hash)

      if (!keyInfo) return null
      if (!keyInfo.active) return null
      if (keyInfo.expiresAt && keyInfo.expiresAt < new Date()) {
        return null
      }

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
