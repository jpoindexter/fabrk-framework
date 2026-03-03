export interface LongTermEntry {
  namespace: string;
  key: string;
  value: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LongTermStore {
  set(namespace: string, key: string, value: string, metadata?: Record<string, unknown>): Promise<void>;
  get(namespace: string, key: string): Promise<string | null>;
  delete(namespace: string, key: string): Promise<void>;
  list(namespace: string): Promise<string[]>;
  search(namespace: string, query: string, topK?: number): Promise<Array<{ key: string; value: string; score: number }>>;
}

export class InMemoryLongTermStore implements LongTermStore {
  private entries = new Map<string, LongTermEntry>(); // key: `${namespace}::${key}`

  async set(namespace: string, key: string, value: string, metadata?: Record<string, unknown>): Promise<void> {
    const mapKey = `${namespace}::${key}`;
    const existing = this.entries.get(mapKey);
    this.entries.set(mapKey, {
      namespace,
      key,
      value,
      metadata,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
    });
  }

  async get(namespace: string, key: string): Promise<string | null> {
    return this.entries.get(`${namespace}::${key}`)?.value ?? null;
  }

  async delete(namespace: string, key: string): Promise<void> {
    this.entries.delete(`${namespace}::${key}`);
  }

  async list(namespace: string): Promise<string[]> {
    const keys: string[] = [];
    for (const entry of this.entries.values()) {
      if (entry.namespace === namespace) {
        keys.push(entry.key);
      }
    }
    return keys;
  }

  // search: exact match score=1.0; substring match score=0.5; no match returns []
  async search(namespace: string, query: string, topK = 10): Promise<Array<{ key: string; value: string; score: number }>> {
    const results: Array<{ key: string; value: string; score: number }> = [];
    for (const entry of this.entries.values()) {
      if (entry.namespace !== namespace) continue;
      let score = 0;
      if (entry.value === query || entry.key === query) {
        score = 1.0;
      } else if (entry.value.includes(query) || entry.key.includes(query)) {
        score = 0.5;
      }
      if (score > 0) {
        results.push({ key: entry.key, value: entry.value, score });
      }
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }
}
