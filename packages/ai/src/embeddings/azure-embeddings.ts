/**
 * Azure OpenAI embedding provider
 */

import type { EmbeddingProvider, EmbeddingConfig } from './types'
import { EMBEDDING_DEFAULTS, MAX_TEXT_LENGTH } from './types'
import { resolveEnv } from '../utils/env'
const AZURE_API_VERSION = '2024-02-01'

export class AzureEmbeddingProvider implements EmbeddingProvider {
  private config: EmbeddingConfig
  private endpoint: string
  private deployment: string

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = {
      provider: 'azure',
      model: config.model ?? 'text-embedding-3-small',
      apiKey: config.apiKey ?? resolveEnv('AZURE_OPENAI_API_KEY'),
      baseUrl: config.baseUrl,
      maxLength: config.maxLength ?? MAX_TEXT_LENGTH,
      timeoutMs: config.timeoutMs ?? EMBEDDING_DEFAULTS.timeoutMs,
    } as EmbeddingConfig

    if (!this.config.baseUrl) {
      throw new Error('AzureEmbeddingProvider requires baseUrl (your Azure OpenAI endpoint)')
    }

    this.endpoint = this.config.baseUrl.replace(/\/$/, '')
    this.deployment = this.config.model ?? 'text-embedding-3-small'
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text])
    return results[0]
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []
    const truncated = texts.map(t => t.slice(0, this.config.maxLength ?? MAX_TEXT_LENGTH))
    const url = `${this.endpoint}/openai/deployments/${this.deployment}/embeddings?api-version=${AZURE_API_VERSION}`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': this.config.apiKey ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: truncated }),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? EMBEDDING_DEFAULTS.timeoutMs),
    })
    if (!res.ok) throw new Error(`Azure OpenAI embed error: ${res.status}`)
    const data = await res.json() as { data: { embedding: number[] }[] }
    return data.data.map(d => d.embedding)
  }
}

