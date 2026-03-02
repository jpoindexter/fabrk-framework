export interface ISRCacheEntry {
  html: string;
  timestamp: number;
  revalidate: number;
  tags: string[];
}

export interface ISRCacheHandler {
  get(key: string): Promise<ISRCacheEntry | null>;
  set(key: string, entry: ISRCacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByTag(tag: string): Promise<void>;
}

const MAX_ENTRIES = 200;

export class InMemoryISRCache implements ISRCacheHandler {
  private map = new Map<string, ISRCacheEntry>();
  private tagIndex = new Map<string, Set<string>>();

  async get(key: string): Promise<ISRCacheEntry | null> {
    return this.map.get(key) ?? null;
  }

  async set(key: string, entry: ISRCacheEntry): Promise<void> {
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

const revalidating = new Set<string>();

export function getRevalidateInterval(
  mod: Record<string, unknown>,
): number | null {
  const value = mod.revalidate;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return null;
}

export function getPageTags(mod: Record<string, unknown>): string[] {
  const value = mod.tags;
  if (Array.isArray(value)) {
    return value.filter((t): t is string => typeof t === "string");
  }
  return [];
}

export interface ISRResult {
  html: string;
  cached: boolean;
  revalidating: boolean;
}

/** Stale-while-revalidate: serve cached, trigger background re-render if stale. */
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
      return { html: entry.html, cached: true, revalidating: false };
    }

    if (!revalidating.has(pathname)) {
      revalidating.add(pathname);
      revalidateInBackground(cacheHandler, pathname, revalidateSeconds, renderFn, tags);
    }

    return { html: entry.html, cached: true, revalidating: true };
  }

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

export async function isrRevalidateTag(
  cacheHandler: ISRCacheHandler,
  tag: string,
): Promise<void> {
  await cacheHandler.deleteByTag(tag);
}

export async function isrRevalidatePath(
  cacheHandler: ISRCacheHandler,
  pathname: string,
): Promise<void> {
  await cacheHandler.delete(pathname);
}
