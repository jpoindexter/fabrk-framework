import type { EmbeddingProvider } from '../embeddings/types.js';

export interface RankResult {
  originalIndex: number;
  score: number;
  document: string;
}

export interface RerankProvider {
  rerank(query: string, documents: string[], topN?: number): Promise<RankResult[]>;
}

export interface RerankOptions {
  model: RerankProvider;
  query: string;
  documents: string[];
  topN?: number;
}

/**
 * Rerank documents by relevance to a query using a provider-backed model.
 * Mirrors Vercel AI SDK's `rerank()` function.
 *
 * @example
 *   const { ranking } = await rerank({
 *     model: cohereReranking('rerank-v3.5'),
 *     query: 'rainfall in cities',
 *     documents: ['sunny beach', 'rainy city', 'snowy mountain'],
 *     topN: 2,
 *   });
 */
export async function rerank(opts: RerankOptions): Promise<{ ranking: RankResult[] }> {
  const ranking = await opts.model.rerank(opts.query, opts.documents, opts.topN);
  return { ranking };
}

/**
 * Cohere /v2/rerank API provider.
 * Requires COHERE_API_KEY env var or explicit apiKey parameter.
 */
export function cohereReranking(model: string, apiKey?: string): RerankProvider {
  return {
    async rerank(query: string, documents: string[], topN?: number): Promise<RankResult[]> {
      const key = apiKey ?? process.env['COHERE_API_KEY'];
      if (!key) throw new Error('[fabrk] cohereReranking: set COHERE_API_KEY or pass apiKey');

      const resp = await fetch('https://api.cohere.com/v2/rerank', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          query,
          documents,
          top_n: topN,
          return_documents: true,
        }),
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(`[fabrk] Cohere rerank failed (${resp.status}): ${body.slice(0, 200)}`);
      }

      const data = await resp.json() as {
        results: Array<{ index: number; relevance_score: number; document: { text: string } }>;
      };

      return data.results.map((r) => ({
        originalIndex: r.index,
        score: r.relevance_score,
        document: r.document.text,
      }));
    },
  };
}

/**
 * Cosine-similarity reranking using any EmbeddingProvider.
 * No external API needed — uses embeddings to compute relevance scores.
 */
export function embeddingReranking(embedder: EmbeddingProvider): RerankProvider {
  return {
    async rerank(query: string, documents: string[], topN?: number): Promise<RankResult[]> {
      const qVec = await embedder.embed(query);
      const dVecs = await Promise.all(documents.map((d) => embedder.embed(d)));

      const scored = dVecs.map((dv, i) => ({
        originalIndex: i,
        score: cosineSim(qVec, dv),
        document: documents[i]!,
      }));
      scored.sort((a, b) => b.score - a.score);
      return topN != null ? scored.slice(0, topN) : scored;
    },
  };
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, ma = 0, mb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    ma += a[i]! * a[i]!;
    mb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(ma) * Math.sqrt(mb);
  return denom === 0 ? 0 : dot / denom;
}
