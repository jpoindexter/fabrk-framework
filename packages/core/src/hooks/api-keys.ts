'use client';

import { useMemo } from 'react';
import { useOptionalFabrk } from '../context';

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
