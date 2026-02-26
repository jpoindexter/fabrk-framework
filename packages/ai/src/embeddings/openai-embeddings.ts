/**
 * OpenAI embedding provider
 */

import type { EmbeddingProvider, EmbeddingConfig } from './types'
import { EMBEDDING_DEFAULTS } from './types'

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private config: EmbeddingConfig

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = { ...EMBEDDING_DEFAULTS, ...config, provider: 'openai' }
    if (!this.config.apiKey) {
      this.config.apiKey = (globalThis as any).process?.env?.OPENAI_API_KEY || ''
    }
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text])
    return results[0]
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let OpenAI: any
    try {
      const mod = await import('openai')
      OpenAI = mod.default || mod.OpenAI || mod
    } catch {
      throw new Error('openai package not installed. Install with: npm install openai')
    }

    const client = new OpenAI({ apiKey: this.config.apiKey })
    const maxLen = this.config.maxLength || EMBEDDING_DEFAULTS.maxLength
    // Truncate by characters (approximation: ~4 chars per token for English text)
    // For accurate token counting use tiktoken. Remove '...' suffix to avoid exceeding limit.
    const truncated = texts.map((t) => (t.length > maxLen ? t.substring(0, maxLen) : t))

    const response = await client.embeddings.create({
      model: this.config.model || EMBEDDING_DEFAULTS.model,
      input: truncated,
    })

    return response.data.map((d: { embedding: number[] }) => d.embedding)
  }
}
