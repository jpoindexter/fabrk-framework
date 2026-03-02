// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ISRCacheEntry {
  html: string;
  timestamp: number;
  /** Revalidation interval in seconds. */
  revalidate: number;
  tags: string[];
}

/**
 * Pluggable cache handler for ISR.
 * Default implementation is in-memory. Users can provide Redis, KV, etc.
 */
export interface ISRCacheHandler {
  get(key: string): Promise<ISRCacheEntry | null>;
  set(key: string, entry: ISRCacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
  /** Delete all entries matching a tag. */
  deleteByTag(tag: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// In-memory implementation
// ---------------------------------------------------------------------------

const MAX_ENTRIES = 200;

export class InMemoryISRCache implements ISRCacheHandler {
  private map = new Map<string, ISRCacheEntry>();
  private tagIndex = new Map<string, Set<string>>();

  async get(key: string): Promise<ISRCacheEntry | null> {
    return this.map.get(key) ?? null;
  }

  async set(key: string, entry: ISRCacheEntry): Promise<void> {
    // Evict oldest if at capacity
    if (!this.map.has(key) && this.map.size >= MAX_ENTRIES) {
      const oldest = this.map.keys().next();
      if (!oldest.done) await this.delete(oldest.value);
    }

    this.map.set(key, entry);

    for (const tag of entry.tags) {
      let keys = this.tagIndex.get(tag);
      if (!keys) {
        keys = new Set();
        this.tagIndex.set(tag, keys);
      }
      keys.add(key);
    }
  }

  async delete(key: string): Promise<void> {
    const entry = this.map.get(key);
    if (!entry) return;

    this.map.delete(key);
    for (const tag of entry.tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) this.tagIndex.delete(tag);
      }
    }
  }

  async deleteByTag(tag: string): Promise<void> {
    const keys = this.tagIndex.get(tag);
    if (!keys) return;

    for (const key of [...keys]) {
      await this.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// ISR logic
// ---------------------------------------------------------------------------

/** Set of paths currently being revalidated (prevents duplicate work). */
const revalidating = new Set<string>();

/**
 * Read the `revalidate` export from a page module.
 * Returns `null` if ISR is not configured for this page.
 */
export function getRevalidateInterval(
  mod: Record<string, unknown>,
): number | null {
  const value = mod.revalidate;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return null;
}

/**
 * Read the `tags` export from a page module.
 * Used for on-demand revalidation via `revalidateTag()`.
 */
export function getPageTags(mod: Record<string, unknown>): string[] {
  const value = mod.tags;
  if (Array.isArray(value)) {
    return value.filter((t): t is string => typeof t === "string");
  }
  return [];
}

export interface ISRResult {
  html: string;
  /** Whether this was served from cache. */
  cached: boolean;
  /** Whether a background revalidation was triggered. */
  revalidating: boolean;
}

/**
 * Attempt to serve a page from ISR cache.
 * Returns null if ISR is not configured for this route.
 *
 * If the cached entry is stale, serves it immediately and triggers
 * a background re-render (stale-while-revalidate pattern).
 */
export async function serveFromISR(
  cacheHandler: ISRCacheHandler,
  pathname: string,
  revalidateSeconds: number,
  renderFn: () => Promise<string>,
  tags: string[] = [],
): Promise<ISRResult> {
  const entry = await cacheHandler.get(pathname);

  if (entry) {
    const ageSeconds = (Date.now() - entry.timestamp) / 1000;

    if (ageSeconds <= entry.revalidate) {
      // Fresh — serve from cache
      return { html: entry.html, cached: true, revalidating: false };
    }

    // Stale — serve stale, trigger background revalidation
    if (!revalidating.has(pathname)) {
      revalidating.add(pathname);
      revalidateInBackground(cacheHandler, pathname, revalidateSeconds, renderFn, tags);
    }

    return { html: entry.html, cached: true, revalidating: true };
  }

  // Not cached — render, cache, and serve
  const html = await renderFn();
  await cacheHandler.set(pathname, {
    html,
    timestamp: Date.now(),
    revalidate: revalidateSeconds,
    tags,
  });

  return { html, cached: false, revalidating: false };
}

function revalidateInBackground(
  cacheHandler: ISRCacheHandler,
  pathname: string,
  revalidateSeconds: number,
  renderFn: () => Promise<string>,
  tags: string[],
): void {
  renderFn()
    .then(async (html) => {
      await cacheHandler.set(pathname, {
        html,
        timestamp: Date.now(),
        revalidate: revalidateSeconds,
        tags,
      });
    })
    .catch((err) => {
      console.error(`[fabrk] ISR background revalidation failed for ${pathname}:`, err);
    })
    .finally(() => {
      revalidating.delete(pathname);
    });
}

/**
 * Invalidate ISR cache entries by tag.
 * Called from API routes via `revalidateTag()`.
 */
export async function isrRevalidateTag(
  cacheHandler: ISRCacheHandler,
  tag: string,
): Promise<void> {
  await cacheHandler.deleteByTag(tag);
}

/**
 * Invalidate ISR cache entry by path.
 * Called from API routes via `revalidatePath()`.
 */
export async function isrRevalidatePath(
  cacheHandler: ISRCacheHandler,
  pathname: string,
): Promise<void> {
  await cacheHandler.delete(pathname);
}
