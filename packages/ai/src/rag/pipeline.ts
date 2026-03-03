import type { EmbeddingProvider } from "../embeddings/types";
import type { VectorStoreAdapter, VectorSearchResult } from "./adapters";
import { InMemoryVectorStoreAdapter } from "./adapters";
import { chunkText } from "./chunk";
import type { ChunkOptions } from "./chunk";

export interface RagPipelineOptions {
  embedder: EmbeddingProvider;
  store?: VectorStoreAdapter;
  chunkOptions?: ChunkOptions;
  topK?: number;
  minScore?: number;
}

export interface RagPipeline {
  /** Embed and store text documents, returns IDs of created chunks */
  ingest(text: string, metadata?: Record<string, unknown>): Promise<string[]>;
  /** Embed query and search the store */
  search(query: string, opts?: { topK?: number; minScore?: number }): Promise<VectorSearchResult[]>;
  store: VectorStoreAdapter;
}

export function createRagPipeline(opts: RagPipelineOptions): RagPipeline {
  const store = opts.store ?? new InMemoryVectorStoreAdapter();
  let docCount = 0;

  return {
    store,

    async ingest(text: string, metadata?: Record<string, unknown>): Promise<string[]> {
      const chunks = chunkText(text, opts.chunkOptions);
      const ids: string[] = [];
      for (const chunk of chunks) {
        const id = `doc-${docCount++}-chunk-${chunk.index}`;
        const vector = await opts.embedder.embed(chunk.text);
        await store.add({ id, vector, text: chunk.text, metadata: { ...metadata, chunkIndex: chunk.index } });
        ids.push(id);
      }
      return ids;
    },

    async search(query: string, searchOpts?: { topK?: number; minScore?: number }): Promise<VectorSearchResult[]> {
      const vector = await opts.embedder.embed(query);
      return store.search(vector, {
        topK: searchOpts?.topK ?? opts.topK ?? 5,
        minScore: searchOpts?.minScore ?? opts.minScore,
      });
    },
  };
}
