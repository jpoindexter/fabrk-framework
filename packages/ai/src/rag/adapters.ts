import { InMemoryVectorStore } from "./vector-store";
import type { VectorEntry, VectorSearchResult } from "./vector-store";

export type { VectorEntry, VectorSearchResult };

export interface VectorStoreAdapter {
  add(entries: VectorEntry | VectorEntry[]): Promise<void>;
  search(queryVector: number[], opts?: { topK?: number; minScore?: number }): Promise<VectorSearchResult[]>;
  delete(id: string): Promise<boolean>;
  clear(): Promise<void>;
}

export class InMemoryVectorStoreAdapter implements VectorStoreAdapter {
  private store = new InMemoryVectorStore();

  async add(entries: VectorEntry | VectorEntry[]): Promise<void> {
    this.store.add(entries);
  }

  async search(
    queryVector: number[],
    opts?: { topK?: number; minScore?: number },
  ): Promise<VectorSearchResult[]> {
    return this.store.search(queryVector, opts);
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export interface PineconeVectorStoreOptions {
  indexName: string;
  namespace?: string;
  apiKey?: string;
  host: string;
}

export class PineconeVectorStore implements VectorStoreAdapter {
  private readonly host: string;
  private readonly namespace: string | undefined;
  private readonly apiKey: string;

  constructor(private opts: PineconeVectorStoreOptions) {
    this.host = opts.host;
    this.namespace = opts.namespace;
    this.apiKey = opts.apiKey ?? process.env.PINECONE_API_KEY ?? "";
  }

  private headers(): Record<string, string> {
    return {
      "Api-Key": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  async add(entries: VectorEntry | VectorEntry[]): Promise<void> {
    const list = Array.isArray(entries) ? entries : [entries];
    const vectors = list.map((e) => ({
      id: e.id,
      values: e.vector,
      metadata: { text: e.text, ...e.metadata },
    }));
    const body: Record<string, unknown> = { vectors };
    if (this.namespace) body.namespace = this.namespace;

    const res = await fetch(`https://${this.host}/vectors/upsert`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Pinecone upsert failed: ${res.status}`);
  }

  async search(
    queryVector: number[],
    opts: { topK?: number; minScore?: number } = {},
  ): Promise<VectorSearchResult[]> {
    const body: Record<string, unknown> = {
      vector: queryVector,
      topK: opts.topK ?? 5,
      includeMetadata: true,
    };
    if (this.namespace) body.namespace = this.namespace;

    const res = await fetch(`https://${this.host}/query`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Pinecone query failed: ${res.status}`);

    const data = (await res.json()) as {
      matches: Array<{
        id: string;
        score: number;
        metadata?: { text?: string; [k: string]: unknown };
      }>;
    };

    const minScore = opts.minScore ?? 0;
    return data.matches
      .filter((m) => m.score >= minScore)
      .map((m) => {
        const { text, ...rest } = m.metadata ?? {};
        return {
          id: m.id,
          text: typeof text === "string" ? text : "",
          score: m.score,
          metadata: Object.keys(rest).length ? rest : undefined,
        };
      });
  }

  async delete(id: string): Promise<boolean> {
    const body: Record<string, unknown> = { ids: [id] };
    if (this.namespace) body.namespace = this.namespace;

    const res = await fetch(`https://${this.host}/vectors/delete`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    return res.ok;
  }

  async clear(): Promise<void> {
    const body: Record<string, unknown> = { deleteAll: true };
    if (this.namespace) body.namespace = this.namespace;

    const res = await fetch(`https://${this.host}/vectors/delete`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Pinecone deleteAll failed: ${res.status}`);
  }
}
