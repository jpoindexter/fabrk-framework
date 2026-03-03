import { cosineSimilarity } from "../embeddings/similarity";

export interface VectorEntry {
  id: string;
  vector: number[];
  text: string;
  metadata?: Record<string, unknown>;
}

export interface VectorSearchResult {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export class InMemoryVectorStore {
  private store = new Map<string, VectorEntry>();

  add(entries: VectorEntry | VectorEntry[]): void {
    const list = Array.isArray(entries) ? entries : [entries];
    for (const entry of list) {
      this.store.set(entry.id, entry);
    }
  }

  search(
    queryVector: number[],
    opts: { topK?: number; minScore?: number } = {},
  ): VectorSearchResult[] {
    const { topK = 5, minScore = 0 } = opts;

    const results: VectorSearchResult[] = [];
    for (const entry of this.store.values()) {
      const score = cosineSimilarity(queryVector, entry.vector);
      if (score >= minScore) {
        results.push({ id: entry.id, text: entry.text, score, metadata: entry.metadata });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
