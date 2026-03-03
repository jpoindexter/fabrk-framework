import type { EmbeddingProvider } from "../embeddings/types";
import { cosineSimilarity } from "../embeddings/similarity";

export interface CachedEntry {
  query: string;
  queryVector: number[];
  response: string;
  createdAt: number;
  hits: number;
}

export interface SemanticCacheOptions {
  embedder: EmbeddingProvider;
  threshold?: number;
  maxEntries?: number;
  ttlMs?: number;
}

export class SemanticCache {
  private entries: CachedEntry[] = [];
  private readonly threshold: number;
  private readonly maxEntries: number;
  private readonly ttlMs: number | undefined;

  constructor(private opts: SemanticCacheOptions) {
    this.threshold = opts.threshold ?? 0.92;
    this.maxEntries = opts.maxEntries ?? 1000;
    this.ttlMs = opts.ttlMs;
  }

  async get(query: string): Promise<string | null> {
    const queryVector = await this.opts.embedder.embed(query);
    const now = Date.now();
    let best: { score: number; idx: number } | null = null;
    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i];
      if (this.ttlMs && now - e.createdAt > this.ttlMs) continue;
      const score = cosineSimilarity(queryVector, e.queryVector);
      if (score >= this.threshold && (!best || score > best.score)) {
        best = { score, idx: i };
      }
    }
    if (!best) return null;
    this.entries[best.idx].hits++;
    return this.entries[best.idx].response;
  }

  async set(query: string, response: string): Promise<void> {
    const queryVector = await this.opts.embedder.embed(query);
    if (this.entries.length >= this.maxEntries) {
      let oldestIdx = 0;
      for (let i = 1; i < this.entries.length; i++) {
        if (this.entries[i].createdAt < this.entries[oldestIdx].createdAt) oldestIdx = i;
      }
      this.entries.splice(oldestIdx, 1);
    }
    this.entries.push({ query, queryVector, response, createdAt: Date.now(), hits: 0 });
  }

  invalidate(query: string): void {
    this.entries = this.entries.filter((e) => e.query !== query);
  }

  clear(): void {
    this.entries = [];
  }

  get size(): number {
    return this.entries.length;
  }

  stats(): { size: number; totalHits: number } {
    return {
      size: this.entries.length,
      totalHits: this.entries.reduce((s, e) => s + e.hits, 0),
    };
  }
}
