import { describe, it, expect, vi } from 'vitest';
import { rerank, cohereReranking, embeddingReranking, type RerankProvider } from '../rag/rerank';

const mockProvider = (scores: number[]): RerankProvider => ({
  async rerank(query, documents, topN) {
    const results = documents.map((doc, i) => ({
      originalIndex: i,
      score: scores[i] ?? 0,
      document: doc,
    }));
    results.sort((a, b) => b.score - a.score);
    return topN != null ? results.slice(0, topN) : results;
  },
});

describe('rerank()', () => {
  it('returns { ranking } sorted by score descending', async () => {
    const { ranking } = await rerank({
      model: mockProvider([0.3, 0.9, 0.5]),
      query: 'test',
      documents: ['doc0', 'doc1', 'doc2'],
    });
    expect(ranking[0]!.score).toBe(0.9);
    expect(ranking[0]!.document).toBe('doc1');
  });

  it('respects topN', async () => {
    const { ranking } = await rerank({
      model: mockProvider([0.1, 0.8, 0.5]),
      query: 'test',
      documents: ['a', 'b', 'c'],
      topN: 2,
    });
    expect(ranking).toHaveLength(2);
  });

  it('preserves originalIndex', async () => {
    const { ranking } = await rerank({
      model: mockProvider([0.1, 0.9]),
      query: 'test',
      documents: ['first', 'second'],
    });
    expect(ranking[0]!.originalIndex).toBe(1);
  });
});

describe('cohereReranking()', () => {
  it('throws when no API key', async () => {
    delete process.env['COHERE_API_KEY'];
    const provider = cohereReranking('rerank-v3.5');
    await expect(provider.rerank('q', ['doc'])).rejects.toThrow('COHERE_API_KEY');
  });

  it('sends correct body to Cohere API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ index: 0, relevance_score: 0.9, document: { text: 'doc1' } }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = cohereReranking('rerank-v3.5', 'test-key');
    await provider.rerank('rainfall', ['doc1'], 1);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.cohere.com/v2/rerank',
      expect.objectContaining({ method: 'POST' })
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('rerank-v3.5');
    expect(body.query).toBe('rainfall');
    expect(body.documents).toEqual(['doc1']);

    vi.unstubAllGlobals();
  });

  it('maps Cohere response to RankResult[]', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { index: 2, relevance_score: 0.7, document: { text: 'doc-c' } },
          { index: 0, relevance_score: 0.3, document: { text: 'doc-a' } },
        ],
      }),
    }));

    const provider = cohereReranking('rerank-v3.5', 'key');
    const results = await provider.rerank('q', ['doc-a', 'doc-b', 'doc-c']);
    expect(results[0]!.originalIndex).toBe(2);
    expect(results[0]!.score).toBe(0.7);
    vi.unstubAllGlobals();
  });

  it('throws with status code on API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    }));
    const provider = cohereReranking('model', 'key');
    await expect(provider.rerank('q', ['doc'])).rejects.toThrow('429');
    vi.unstubAllGlobals();
  });
});

describe('embeddingReranking()', () => {
  const mockEmbedder = {
    async embed(text: string) {
      // Simple mock: query vector = [1,0], docs get similarity based on position
      if (text === 'rain') return [1, 0];
      if (text === 'sunny') return [0, 1];
      if (text === 'rainy') return [0.9, 0.1];
      if (text === 'snowy') return [0, 1];
      return [0.5, 0.5];
    },
    async embedBatch(texts: string[]) {
      return Promise.all(texts.map((t) => mockEmbedder.embed(t)));
    },
  };

  it('ranks documents by cosine similarity', async () => {
    const provider = embeddingReranking(mockEmbedder);
    const results = await provider.rerank('rain', ['sunny', 'rainy', 'snowy']);
    expect(results[0]!.document).toBe('rainy'); // highest cosine with [1,0]
  });

  it('respects topN', async () => {
    const provider = embeddingReranking(mockEmbedder);
    const results = await provider.rerank('rain', ['a', 'b', 'c'], 1);
    expect(results).toHaveLength(1);
  });
});
