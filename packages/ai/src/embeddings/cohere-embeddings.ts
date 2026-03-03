/**
 * Cohere embedding provider
 */

import type { EmbeddingProvider, EmbeddingConfig } from './types'
import { EMBEDDING_DEFAULTS } from './types'

const MAX_TEXT_LENGTH = 8192

export class CohereEmbeddingProvider implements EmbeddingProvider {
  private config: EmbeddingConfig

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = {
      provider: 'cohere',
      model: config.model ?? 'embed-v4.0',
      apiKey: config.apiKey ?? resolveEnv('COHERE_API_KEY'),
      maxLength: config.maxLength ?? MAX_TEXT_LENGTH,
      timeoutMs: config.timeoutMs ?? EMBEDDING_DEFAULTS.timeoutMs,
    } as EmbeddingConfig
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text])
    return results[0]
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []
    const truncated = texts.map(t => t.slice(0, this.config.maxLength ?? MAX_TEXT_LENGTH))
    const res = await fetch('https://api.cohere.com/v2/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model ?? 'embed-v4.0',
        texts: truncated,
        input_type: 'search_document',
        embedding_types: ['float'],
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? EMBEDDING_DEFAULTS.timeoutMs),
    })
    if (!res.ok) throw new Error(`Cohere embed error: ${res.status}`)
    const data = await res.json() as { embeddings: { float: number[][] } }
    return data.embeddings.float
  }
}

function resolveEnv(key: string): string {
  const g = globalThis as Record<string, unknown>
  const proc = g.process as { env?: Record<string, string> } | undefined
  return proc?.env?.[key] ?? ''
}
