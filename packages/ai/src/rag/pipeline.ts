import type { EmbeddingProvider } from "../embeddings/types";
import type { VectorStoreAdapter, VectorSearchResult } from "./adapters";
import { InMemoryVectorStoreAdapter } from "./adapters";
import { chunkText } from "./chunk";
import type { ChunkOptions } from "./chunk";

export type RetrievedChunk = VectorSearchResult;

export interface RagPipelineOptions {
  embedder: EmbeddingProvider;
  store?: VectorStoreAdapter;
  chunkOptions?: ChunkOptions;
  topK?: number;
  minScore?: number;
  reranker?: (query: string, chunks: RetrievedChunk[]) => Promise<RetrievedChunk[]>;
}

export interface RagPipeline {
  ingest(text: string, metadata?: Record<string, unknown>): Promise<string[]>;
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
      const topK = searchOpts?.topK ?? opts.topK ?? 5;
      const minScore = searchOpts?.minScore ?? opts.minScore;
      const vector = await opts.embedder.embed(query);

      if (opts.reranker) {
        const candidates = await store.search(vector, { topK: topK * 3, minScore });
        const reranked = await opts.reranker(query, candidates);
        return reranked.slice(0, topK);
      }

      return store.search(vector, { topK, minScore });
    },
  };
}
