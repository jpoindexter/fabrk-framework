/**
 * Ollama embedding provider (local)
 */

import type { EmbeddingProvider, EmbeddingConfig } from './types'
import { EMBEDDING_DEFAULTS } from './types'

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private config: EmbeddingConfig

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = { ...EMBEDDING_DEFAULTS, ...config, provider: 'ollama' }
  }

  async embed(text: string): Promise<number[]> {
    const baseUrl = this.config.baseUrl || EMBEDDING_DEFAULTS.ollamaBaseUrl
    const model = this.config.model || EMBEDDING_DEFAULTS.ollamaModel
    const maxLen = this.config.maxLength || EMBEDDING_DEFAULTS.maxLength
    const truncated = text.length > maxLen ? text.substring(0, maxLen) + '...' : text

    const response = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: truncated }),
      signal: AbortSignal.timeout(this.config.timeoutMs || EMBEDDING_DEFAULTS.timeoutMs),
    })

    if (!response.ok) {
      throw new Error(`Ollama embedding error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.embeddings?.[0] || data.embedding || []
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Ollama doesn't support batch natively, process sequentially with concurrency limit
    const batchSize = 5
    const results: number[][] = []

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map((text) => this.embed(text)))
      results.push(...batchResults)
    }

    return results
  }
}
