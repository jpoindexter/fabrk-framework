/**
 * Embedding types
 *
 * Extracted from moodreel (OpenAI/pgvector) and wisp (local Ollama/LM Studio) patterns.
 */

/** Embedding provider interface */
export interface EmbeddingProvider {
  /** Generate an embedding vector for text */
  embed(text: string): Promise<number[]>
  /** Generate embeddings for multiple texts */
  embedBatch(texts: string[]): Promise<number[][]>
}

/** Embedding configuration */
export interface EmbeddingConfig {
  /** Provider to use */
  provider: 'openai' | 'ollama' | 'cohere' | 'voyage' | 'azure'
  /** Model name */
  model?: string
  /** API key (for cloud providers) */
  apiKey?: string
  /** Base URL (for local providers) */
  baseUrl?: string
  /** Max text length before truncation */
  maxLength?: number
  /** Request timeout in ms */
  timeoutMs?: number
}

/** Default max text length (chars) before truncation for embedding providers */
export const MAX_TEXT_LENGTH = 8192

/** Default embedding config */
export const EMBEDDING_DEFAULTS = {
  provider: 'openai' as const,
  model: 'text-embedding-3-small',
  maxLength: 8192,
  timeoutMs: 30000,
  ollamaModel: 'nomic-embed-text',
  ollamaBaseUrl: 'http://localhost:11434',
}

/** Vector similarity search result */
export interface SimilarityResult {
  /** Index in the original array */
  index: number
  /** Cosine similarity score (0-1) */
  similarity: number
}
