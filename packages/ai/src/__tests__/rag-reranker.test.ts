import { describe, it, expect, vi } from 'vitest';
import { createRagPipeline } from '../rag/pipeline.js';
import { CrossEncoderReranker } from '../rag/cross-encoder-reranker.js';
import type { RetrievedChunk } from '../rag/pipeline.js';
import type { VectorStoreAdapter, VectorSearchResult } from '../rag/adapters.js';
import type { EmbeddingProvider } from '../embeddings/types.js';

// Helpers to build test chunks with predictable ordering
function makeChunk(id: string, text: string, score: number): RetrievedChunk {
  return { id, text, score };
}

function makeEmbedder(vector: number[] = [1, 0]): EmbeddingProvider {
  return {
    embed: vi.fn().mockResolvedValue(vector),
    embedBatch: vi.fn().mockResolvedValue([vector]),
  };
}

function makeStore(results: VectorSearchResult[]): VectorStoreAdapter {
  return {
    add: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue(results),
    delete: vi.fn().mockResolvedValue(true),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

describe('RAG pipeline — no reranker', () => {
  it('reranker not called when option absent', async () => {
    const chunks: VectorSearchResult[] = [
      makeChunk('a', 'alpha', 0.9),
      makeChunk('b', 'beta', 0.7),
    ];
    const store = makeStore(chunks);
    const embedder = makeEmbedder();
    const rerankerFn = vi.fn();

    const pipeline = createRagPipeline({ embedder, store });
    const results = await pipeline.search('hello');

    expect(rerankerFn).not.toHaveBeenCalled();
    expect(results).toEqual(chunks);
  });

  it('fetches exactly topK when no reranker', async () => {
    const chunks: VectorSearchResult[] = [makeChunk('a', 'alpha', 0.9)];
    const store = makeStore(chunks);
    const embedder = makeEmbedder();

    const pipeline = createRagPipeline({ embedder, store, topK: 4 });
    await pipeline.search('hello');

    expect(store.search).toHaveBeenCalledWith([1, 0], { topK: 4, minScore: undefined });
  });
});

describe('RAG pipeline — with reranker', () => {
  it('reranker called with query and initial results', async () => {
    const initialChunks: VectorSearchResult[] = [
      makeChunk('a', 'alpha', 0.9),
      makeChunk('b', 'beta', 0.8),
      makeChunk('c', 'gamma', 0.7),
    ];
    const store = makeStore(initialChunks);
    const embedder = makeEmbedder();
    const rerankerFn = vi.fn().mockResolvedValue(initialChunks);

    const pipeline = createRagPipeline({ embedder, store, topK: 1, reranker: rerankerFn });
    await pipeline.search('my query');

    expect(rerankerFn).toHaveBeenCalledWith('my query', initialChunks);
  });

  it('reranked results replace original order', async () => {
    const initialChunks: VectorSearchResult[] = [
      makeChunk('a', 'alpha', 0.9),
      makeChunk('b', 'beta', 0.8),
      makeChunk('c', 'gamma', 0.7),
    ];
    // Reranker reverses order
    const rerankedChunks: RetrievedChunk[] = [
      makeChunk('c', 'gamma', 0.99),
      makeChunk('b', 'beta', 0.88),
      makeChunk('a', 'alpha', 0.1),
    ];
    const store = makeStore(initialChunks);
    const embedder = makeEmbedder();
    const rerankerFn = vi.fn().mockResolvedValue(rerankedChunks);

    const pipeline = createRagPipeline({ embedder, store, topK: 3, reranker: rerankerFn });
    const results = await pipeline.search('query');

    expect(results[0].id).toBe('c');
    expect(results[1].id).toBe('b');
    expect(results[2].id).toBe('a');
  });

  it('topK applied after reranking — 3x candidates fetched from store', async () => {
    const manyChunks: VectorSearchResult[] = Array.from({ length: 15 }, (_, i) =>
      makeChunk(`id-${i}`, `text ${i}`, 1 - i * 0.05)
    );
    const store = makeStore(manyChunks);
    const embedder = makeEmbedder();
    const rerankerFn = vi.fn().mockImplementation(async (_q: string, chunks: RetrievedChunk[]) => chunks);

    const topK = 5;
    const pipeline = createRagPipeline({ embedder, store, topK, reranker: rerankerFn });
    const results = await pipeline.search('query');

    // Store must be asked for topK * 3 = 15 candidates
    expect(store.search).toHaveBeenCalledWith([1, 0], { topK: topK * 3, minScore: undefined });
    // Final result must be sliced to topK
    expect(results).toHaveLength(5);
  });
});

describe('CrossEncoderReranker', () => {
  it('fn() reorders chunks by score descending', async () => {
    const scoreFn = vi.fn().mockImplementation(async (_q: string, text: string) => {
      // Assign scores based on content
      if (text === 'most relevant') return 0.95;
      if (text === 'somewhat relevant') return 0.6;
      return 0.1;
    });

    const reranker = new CrossEncoderReranker(scoreFn);
    const chunks: RetrievedChunk[] = [
      makeChunk('a', 'not relevant', 0.9),
      makeChunk('b', 'most relevant', 0.5),
      makeChunk('c', 'somewhat relevant', 0.7),
    ];

    const result = await reranker.fn()('my query', chunks);

    expect(result[0].id).toBe('b');    // score 0.95
    expect(result[1].id).toBe('c');    // score 0.6
    expect(result[2].id).toBe('a');    // score 0.1
  });

  it('zero-score chunks sorted to bottom', async () => {
    const scoreFn = vi.fn().mockImplementation(async (_q: string, text: string) => {
      return text === 'winner' ? 0.8 : 0;
    });

    const reranker = new CrossEncoderReranker(scoreFn);
    const chunks: RetrievedChunk[] = [
      makeChunk('z1', 'loser one', 0.9),
      makeChunk('z2', 'loser two', 0.85),
      makeChunk('w', 'winner', 0.1),
    ];

    const result = await reranker.rerank('query', chunks);

    expect(result[0].id).toBe('w');
    expect(result[result.length - 1].score).toBe(0);
  });

  it('score function called once per chunk with query and chunk text', async () => {
    const scoreFn = vi.fn().mockResolvedValue(0.5);
    const reranker = new CrossEncoderReranker(scoreFn);
    const chunks: RetrievedChunk[] = [
      makeChunk('x', 'text x', 0.8),
      makeChunk('y', 'text y', 0.6),
    ];

    await reranker.rerank('test query', chunks);

    expect(scoreFn).toHaveBeenCalledTimes(2);
    expect(scoreFn).toHaveBeenCalledWith('test query', 'text x');
    expect(scoreFn).toHaveBeenCalledWith('test query', 'text y');
  });

  it('fn() returns a bound rerank function that delegates to rerank()', async () => {
    const scoreFn = vi.fn().mockResolvedValue(0.5);
    const reranker = new CrossEncoderReranker(scoreFn);
    const spy = vi.spyOn(reranker, 'rerank');
    const chunks: RetrievedChunk[] = [makeChunk('a', 'text', 0.9)];

    const bound = reranker.fn();
    await bound('q', chunks);

    expect(spy).toHaveBeenCalledWith('q', chunks);
  });
});
