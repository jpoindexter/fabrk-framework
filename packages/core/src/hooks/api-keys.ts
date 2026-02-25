/**
 * API Keys Hook
 *
 * Access API key management from the auth adapter.
 */

'use client';

import { useMemo } from 'react';
import { useOptionalFabrk } from '../context';

// HOOK: useAPIKeys

/**
 * Access API key management from the auth adapter
 *
 * @example
 * ```tsx
 * function ApiKeyManager() {
 *   const apiKeys = useAPIKeys()
 *   if (!apiKeys) return <p>Auth not configured</p>
 *
 *   const handleCreate = async () => {
 *     const result = await apiKeys.create({
 *       userId: 'user_123',
 *       name: 'Production Key',
 *       scopes: ['read', 'write'],
 *     })
 *     console.log('Key:', result.key)
 *   }
 *
 *   return <button onClick={handleCreate}>&gt; CREATE KEY</button>
 * }
 * ```
 */
export function useAPIKeys() {
  const fabrk = useOptionalFabrk();
  const auth = fabrk?.registry.getAuth();

  return useMemo(() => {
    if (!auth) return null;

    return {
      create: auth.createApiKey.bind(auth),
      revoke: auth.revokeApiKey.bind(auth),
      list: auth.listApiKeys.bind(auth),
      validate: auth.validateApiKey.bind(auth),
    };
  }, [auth]);
}
