// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FetchCacheOptions {
  /** Maximum number of cached entries. Default: 200. */
  maxEntries?: number;
  /** Default revalidation interval in seconds. Default: Infinity (cache forever). */
  defaultRevalidate?: number;
}

export interface CachedResponse {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
  timestamp: number;
  revalidate: number;
  tags: string[];
}

interface ExtendedRequestInit extends RequestInit {
  next?: {
    revalidate?: number;
    tags?: string[];
  };
}

// ---------------------------------------------------------------------------
// Cache state
// ---------------------------------------------------------------------------

const cache = new Map<string, CachedResponse>();
let maxEntries = 200;
let defaultRevalidate = Infinity;

/** Tags → set of cache keys that have that tag. */
const tagIndex = new Map<string, Set<string>>();

/** Paths → set of cache keys associated with that path. */
const pathIndex = new Map<string, Set<string>>();

// Headers that bypass caching (contain auth credentials)
const AUTH_HEADERS = new Set([
  "authorization",
  "cookie",
  "x-api-key",
  "x-auth-token",
]);

// ---------------------------------------------------------------------------
// Cache key generation
// ---------------------------------------------------------------------------

function generateCacheKey(
  url: string,
  method: string,
  headers: HeadersInit | undefined,
  body: BodyInit | null | undefined,
): string {
  const parts = [method.toUpperCase(), url];

  // Sort headers for deterministic keys
  if (headers) {
    const h =
      headers instanceof Headers
        ? headers
        : new Headers(headers as Record<string, string>);
    const sorted: string[] = [];
    h.forEach((v, k) => {
      if (!AUTH_HEADERS.has(k.toLowerCase())) {
        sorted.push(`${k}:${v}`);
      }
    });
    sorted.sort();
    parts.push(sorted.join("|"));
  }

  // Include body hash for non-GET requests
  if (body && typeof body === "string") {
    parts.push(simpleHash(body));
  }

  return parts.join("\0");
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return hash.toString(36);
}

// ---------------------------------------------------------------------------
// LRU eviction
// ---------------------------------------------------------------------------

function evictIfNeeded(): void {
  if (cache.size <= maxEntries) return;

  // Remove oldest entries
  const entries = [...cache.entries()];
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

  const toRemove = cache.size - maxEntries;
  for (let i = 0; i < toRemove; i++) {
    removeEntry(entries[i][0]);
  }
}

function removeEntry(key: string): void {
  const entry = cache.get(key);
  if (!entry) return;

  cache.delete(key);

  // Clean up tag index
  for (const tag of entry.tags) {
    const keys = tagIndex.get(tag);
    if (keys) {
      keys.delete(key);
      if (keys.size === 0) tagIndex.delete(tag);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the fetch cache. Call once at server startup.
 */
export function initFetchCache(options: FetchCacheOptions = {}): void {
  maxEntries = options.maxEntries ?? 200;
  defaultRevalidate = options.defaultRevalidate ?? Infinity;
}

/**
 * Clear all cached entries.
 */
export function clearFetchCache(): void {
  cache.clear();
  tagIndex.clear();
  pathIndex.clear();
}

/**
 * Invalidate all cache entries with a specific tag.
 */
export function revalidateTag(tag: string): void {
  const keys = tagIndex.get(tag);
  if (!keys) return;

  for (const key of [...keys]) {
    removeEntry(key);
  }
}

/**
 * Invalidate all cache entries associated with a specific path.
 */
export function revalidatePath(urlPath: string): void {
  const keys = pathIndex.get(urlPath);
  if (!keys) return;

  for (const key of [...keys]) {
    removeEntry(key);
  }
  pathIndex.delete(urlPath);
}

/**
 * Get cache stats for debugging.
 */
export function getCacheStats(): {
  size: number;
  maxEntries: number;
  tags: number;
} {
  return {
    size: cache.size,
    maxEntries,
    tags: tagIndex.size,
  };
}

// ---------------------------------------------------------------------------
// Patched fetch
// ---------------------------------------------------------------------------

/**
 * Create a patched `fetch` that respects caching directives.
 *
 * Supports:
 * - `cache: "force-cache"` → always serve from cache (if available)
 * - `cache: "no-store"` → never cache
 * - `next: { revalidate: 60 }` → time-based revalidation
 * - `next: { tags: ["products"] }` → tag-based invalidation
 *
 * Requests with auth headers (Authorization, Cookie) are never cached.
 */
export function createCachedFetch(
  originalFetch: typeof globalThis.fetch,
): typeof globalThis.fetch {
  return async function cachedFetch(
    input: RequestInfo | URL,
    init?: ExtendedRequestInit,
  ): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET");

    // Only cache GET/HEAD requests
    if (method.toUpperCase() !== "GET" && method.toUpperCase() !== "HEAD") {
      return originalFetch(input, init);
    }

    // Check for explicit no-store
    if (init?.cache === "no-store") {
      return originalFetch(input, init);
    }

    // Skip caching if auth headers present
    if (init?.headers) {
      const h = new Headers(init.headers as Record<string, string>);
      for (const authHeader of AUTH_HEADERS) {
        if (h.has(authHeader)) {
          return originalFetch(input, init);
        }
      }
    }

    const cacheKey = generateCacheKey(url, method, init?.headers, init?.body);
    const revalidate = init?.next?.revalidate ?? defaultRevalidate;
    const tags = init?.next?.tags ?? [];

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      const age = (Date.now() - cached.timestamp) / 1000;
      const isStale = age > cached.revalidate;

      if (!isStale || init?.cache === "force-cache") {
        // Serve from cache
        return new Response(cached.body, {
          status: cached.status,
          statusText: cached.statusText,
          headers: new Headers(cached.headers),
        });
      }

      // Stale — remove and re-fetch
      removeEntry(cacheKey);
    }

    // Fetch from origin
    const response = await originalFetch(input, init);

    // Only cache successful responses
    if (response.ok) {
      const body = await response.text();
      const headers: [string, string][] = [];
      response.headers.forEach((v, k) => headers.push([k, v]));

      const entry: CachedResponse = {
        status: response.status,
        statusText: response.statusText,
        headers,
        body,
        timestamp: Date.now(),
        revalidate: Number.isFinite(revalidate) ? revalidate : Infinity,
        tags,
      };

      cache.set(cacheKey, entry);

      // Update tag index
      for (const tag of tags) {
        let tagKeys = tagIndex.get(tag);
        if (!tagKeys) {
          tagKeys = new Set();
          tagIndex.set(tag, tagKeys);
        }
        tagKeys.add(cacheKey);
      }

      // Update path index
      try {
        const urlPath = new URL(url).pathname;
        let pathKeys = pathIndex.get(urlPath);
        if (!pathKeys) {
          pathKeys = new Set();
          pathIndex.set(urlPath, pathKeys);
        }
        pathKeys.add(cacheKey);
      } catch {
        // Invalid URL — skip path indexing
      }

      evictIfNeeded();

      // Return a new Response with the cached body
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(headers),
      });
    }

    return response;
  };
}

/**
 * Patch `globalThis.fetch` with caching support.
 * Returns a cleanup function that restores the original fetch.
 */
export function patchFetch(options?: FetchCacheOptions): () => void {
  initFetchCache(options);
  const original = globalThis.fetch;
  globalThis.fetch = createCachedFetch(original);
  return () => {
    globalThis.fetch = original;
    clearFetchCache();
  };
}
