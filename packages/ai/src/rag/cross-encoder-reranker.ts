import type { RetrievedChunk } from './pipeline.js';

export class CrossEncoderReranker {
  constructor(
    private score: (query: string, text: string) => Promise<number>
  ) {}

  async rerank(query: string, chunks: RetrievedChunk[]): Promise<RetrievedChunk[]> {
    const scored = await Promise.all(
      chunks.map(async (chunk) => ({
        ...chunk,
        score: await this.score(query, chunk.text),
      }))
    );
    return scored.sort((a, b) => b.score - a.score);
  }

  fn(): (query: string, chunks: RetrievedChunk[]) => Promise<RetrievedChunk[]> {
    return (query, chunks) => this.rerank(query, chunks);
  }
}
