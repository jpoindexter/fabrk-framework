export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
}

export interface EmbeddingConfig {
  provider: 'openai' | 'ollama' | 'cohere' | 'voyage' | 'azure'
  model?: string
  apiKey?: string
  baseUrl?: string
  maxLength?: number
  timeoutMs?: number
}

export const MAX_TEXT_LENGTH = 8192

export const EMBEDDING_DEFAULTS = {
  provider: 'openai' as const,
  model: 'text-embedding-3-small',
  maxLength: 8192,
  timeoutMs: 30000,
  ollamaModel: 'nomic-embed-text',
  ollamaBaseUrl: 'http://localhost:11434',
}

export interface SimilarityResult {
  index: number
  similarity: number
}
