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

    // Block cloud metadata endpoints — Azure OpenAI endpoints are always *.openai.azure.com
    try {
      const parsed = new URL(this.config.baseUrl)
      const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
      const blockedHosts = ['metadata.google.internal', '169.254.169.254', '100.100.100.200']
      if (blockedHosts.includes(host)) {
        throw new Error(`AzureEmbeddingProvider: SSRF blocked — cloud metadata endpoint ${host}`)
      }
      const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\./)
      if (v4 && Number(v4[1]) === 169 && Number(v4[2]) === 254) {
        throw new Error(`AzureEmbeddingProvider: SSRF blocked — link-local address ${host}`)
      }
    } catch (e) {
      if (e instanceof TypeError) throw new Error(`AzureEmbeddingProvider: invalid baseUrl ${this.config.baseUrl}`)
      throw e
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

