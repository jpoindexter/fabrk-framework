'use client';

import { useState, useCallback } from 'react';

export function useCsrfToken(
  cookieName = 'csrf-token',
  headerName = 'x-csrf-token'
) {
  const [token] = useState<string | null>(() => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie
      .split(';')
      .find((c) => c.trim().startsWith(`${cookieName}=`));
    if (!match) return null;
    const eqIndex = match.indexOf('=');
    return eqIndex !== -1 ? decodeURIComponent(match.slice(eqIndex + 1)) : '';
  });

  const csrfFetch = useCallback(
    (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);
      const method = options.method?.toUpperCase() || 'GET';
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && token) {
        headers.set(headerName, token);
      }
      if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(url, { ...options, headers });
    },
    [token, headerName]
  );

  return { token, csrfFetch };
}
