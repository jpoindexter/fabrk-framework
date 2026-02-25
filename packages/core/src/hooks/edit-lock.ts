/**
 * Edit Lock Hook
 *
 * Heartbeat-based edit lock with conflict detection.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// TYPES

export interface EditLockConflict {
  userId: string;
  userName: string;
}

export interface UseEditLockOptions {
  /** Callback to acquire/refresh the lock. Return true if acquired. */
  onAcquire: () => Promise<boolean | EditLockConflict>;
  /** Callback to release the lock. */
  onRelease: () => Promise<void>;
  /** Heartbeat interval in ms (default 10000) */
  heartbeatInterval?: number;
}

// HOOK: useEditLock

/**
 * Heartbeat-based edit lock with conflict detection.
 * Provide your own acquire/release callbacks — keeps the hook API-agnostic.
 *
 * @example
 * ```tsx
 * const lock = useEditLock({
 *   onAcquire: async () => {
 *     const res = await fetch('/api/locks', { method: 'POST', body: JSON.stringify({ resourceId }) })
 *     if (res.status === 409) return (await res.json()).lockedBy
 *     return res.ok
 *   },
 *   onRelease: () => fetch('/api/locks', { method: 'DELETE', body: JSON.stringify({ resourceId }) }),
 * })
 *
 * <button onClick={lock.acquire}> EDIT</button>
 * ```
 */
export function useEditLock({
  onAcquire,
  onRelease,
  heartbeatInterval = 10_000,
}: UseEditLockOptions) {
  const [isLocked, setIsLocked] = useState(false);
  const [conflict, setConflict] = useState<EditLockConflict | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLockedRef = useRef(false);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  const sendHeartbeat = useCallback(async () => {
    const result = await onAcquire();
    if (typeof result === 'object') {
      setConflict(result);
      setIsLocked(false);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return false;
    }
    if (result) {
      setConflict(null);
      setIsLocked(true);
    }
    return !!result;
  }, [onAcquire]);

  const acquire = useCallback(async () => {
    setIsLoading(true);
    try {
      const ok = await sendHeartbeat();
      if (ok) {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        heartbeatRef.current = setInterval(sendHeartbeat, heartbeatInterval);
      }
      return ok;
    } finally {
      setIsLoading(false);
    }
  }, [sendHeartbeat, heartbeatInterval]);

  const release = useCallback(async () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (isLockedRef.current) await onRelease();
    setIsLocked(false);
    setConflict(null);
  }, [onRelease]);

  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      // Release the lock on unmount so the server-side lock is freed.
      // Errors are caught to prevent unhandled promise rejections during cleanup.
      if (isLockedRef.current) {
        onRelease().catch(() => {
          // Intentionally swallowed — unmount cleanup cannot propagate errors
        });
      }
    };
  }, [onRelease]);

  return { isLocked, conflict, isLoading, acquire, release };
}
