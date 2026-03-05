import type { EmbeddingConfig, EmbeddingProvider } from './types'
import { EMBEDDING_DEFAULTS } from './types'
import { OpenAIEmbeddingProvider } from './openai-embeddings'
import { OllamaEmbeddingProvider } from './ollama-embeddings'
import { CohereEmbeddingProvider } from './cohere-embeddings'
import { VoyageEmbeddingProvider } from './voyage-embeddings'
import { AzureEmbeddingProvider } from './azure-embeddings'

export function getEmbeddingProvider(config: Partial<EmbeddingConfig> = {}): EmbeddingProvider {
  const provider = config.provider || EMBEDDING_DEFAULTS.provider

  switch (provider) {
    case 'ollama':
      return new OllamaEmbeddingProvider(config)
    case 'cohere':
      return new CohereEmbeddingProvider(config)
    case 'voyage':
      return new VoyageEmbeddingProvider(config)
    case 'azure':
      return new AzureEmbeddingProvider(config)
    case 'openai':
    default:
      return new OpenAIEmbeddingProvider(config)
  }
}

export { OpenAIEmbeddingProvider } from './openai-embeddings'
export { OllamaEmbeddingProvider } from './ollama-embeddings'
export { CohereEmbeddingProvider } from './cohere-embeddings'
export { VoyageEmbeddingProvider } from './voyage-embeddings'
export { AzureEmbeddingProvider } from './azure-embeddings'
export { cosineSimilarity, cosineDistance, findNearest, centroid, jaccardSimilarity } from './similarity'
export type { EmbeddingProvider, EmbeddingConfig, SimilarityResult } from './types'
export { EMBEDDING_DEFAULTS } from './types'
