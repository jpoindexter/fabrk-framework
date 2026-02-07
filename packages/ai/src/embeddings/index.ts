/**
 * Embedding generation and similarity search
 *
 * @example
 * ```ts
 * import { getEmbeddingProvider, cosineSimilarity, findNearest } from '@fabrk/ai'
 *
 * const embedder = getEmbeddingProvider({ provider: 'openai' })
 * const queryVec = await embedder.embed('search query')
 * const docVecs = await embedder.embedBatch(['doc 1', 'doc 2', 'doc 3'])
 *
 * const results = findNearest(queryVec, docVecs, 3, 0.5)
 * ```
 */

import type { EmbeddingConfig, EmbeddingProvider } from './types'
import { EMBEDDING_DEFAULTS } from './types'
import { OpenAIEmbeddingProvider } from './openai-embeddings'
import { OllamaEmbeddingProvider } from './ollama-embeddings'

/**
 * Create an embedding provider based on configuration.
 */
export function getEmbeddingProvider(config: Partial<EmbeddingConfig> = {}): EmbeddingProvider {
  const provider = config.provider || EMBEDDING_DEFAULTS.provider

  switch (provider) {
    case 'ollama':
      return new OllamaEmbeddingProvider(config)
    case 'openai':
    default:
      return new OpenAIEmbeddingProvider(config)
  }
}

export { OpenAIEmbeddingProvider } from './openai-embeddings'
export { OllamaEmbeddingProvider } from './ollama-embeddings'
export { cosineSimilarity, cosineDistance, findNearest, centroid, jaccardSimilarity } from './similarity'
export type { EmbeddingProvider, EmbeddingConfig, SimilarityResult } from './types'
export { EMBEDDING_DEFAULTS } from './types'
