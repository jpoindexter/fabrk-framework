"use client";

const NAVIGATE_EVENT = "fabrk:navigate";
let patched = false;

export function patchHistory(): void {
  if (patched || typeof window === "undefined") return;
  patched = true;

  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);

  history.pushState = function (
    data: unknown,
    unused: string,
    url?: string | URL | null
  ) {
    origPush(data, unused, url);
    window.dispatchEvent(new PopStateEvent(NAVIGATE_EVENT, { state: data }));
  };

  history.replaceState = function (
    data: unknown,
    unused: string,
    url?: string | URL | null
  ) {
    origReplace(data, unused, url);
    window.dispatchEvent(new PopStateEvent(NAVIGATE_EVENT, { state: data }));
  };

  window.addEventListener("popstate", (event: PopStateEvent) => {
    requestAnimationFrame(() => {
      const scrollY = (event.state as Record<string, unknown> | null)?.__fabrkScrollY;
      window.scrollTo(0, typeof scrollY === "number" ? scrollY : 0);
    });
  });
}

const MAX_ENTRIES = 50;
const TTL_MS = 30_000;

interface CacheEntry {
  html: string;
  timestamp: number;
}

declare global {
  interface Window {
    __FABRK_PREFETCH_CACHE__?: Map<string, CacheEntry>;
    __FABRK_PARAMS__?: Record<string, string>;
    __FABRK_RSC_NAVIGATE__?: (url: string) => Promise<void>;
  }
}

// Module-level fallback for non-browser environments (SSR/tests)
let moduleCache: Map<string, CacheEntry> | null = null;

function getCache(): Map<string, CacheEntry> {
  if (typeof window !== "undefined") {
    if (!window.__FABRK_PREFETCH_CACHE__) {
      window.__FABRK_PREFETCH_CACHE__ = new Map();
    }
    return window.__FABRK_PREFETCH_CACHE__;
  }
  if (!moduleCache) moduleCache = new Map();
  return moduleCache;
}

export function storePrefetchResponse(url: string, html: string): void {
  const cache = getCache();

  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }

  cache.set(url, { html, timestamp: Date.now() });
}

export function getPrefetchResponse(url: string): string | null {
  const cache = getCache();
  const entry = cache.get(url);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > TTL_MS) {
    cache.delete(url);
    return null;
  }

  cache.delete(url);
  cache.set(url, entry);

  return entry.html;
}

export function clearPrefetchCache(): void {
  if (typeof window !== "undefined") {
    window.__FABRK_PREFETCH_CACHE__?.clear();
  }
  moduleCache?.clear();
}

/** @internal Test-only reset for the patched flag. */
export function _resetPatched(): void {
  patched = false;
}

export { NAVIGATE_EVENT };
