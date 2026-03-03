/**
 * @fabrk/ai — AI Integration Toolkit
 *
 * Provides LLM providers, cost tracking, embeddings, streaming,
 * prompt management, and middleware for AI-powered applications.
 *
 * @module ai
 */

export type { APIResponse } from './types';

export {
  type AICostEvent,
  type CostSummary,
  type FeatureCost,
  type CostBudgetStatus,
  type CostStore,
} from './cost-types';

export {
  calculateCost as calculateModelCost,
  MODEL_PRICING,
} from './pricing';

export {
  AICostTracker,
  InMemoryCostStore,
  getCostTracker,
  setCostStore,
} from './tracker';

export {
  type GenerateOptions,
  type GenerateResult,
  ai,
  claude,
  openai,
} from './integrations';

export {
  streamToString,
  parseStreamChunks,
  createTextStream,
  concatStreams,
  transformStream,
  toReadableStream,
  fromReadableStream,
} from './streaming/stream-text';

export {
  type PromptTemplate,
  createPromptTemplate,
  composePrompts,
  createMessagePair,
} from './prompts/template';

export {
  type BuiltPrompt,
  PromptBuilder,
} from './prompts/builder';

export { PrismaCostStore } from './cost-store-prisma'

export {
  getLLMClient,
  OpenAIClient,
  AnthropicClient,
  GoogleClient,
  OllamaClient,
  LLM_DEFAULTS,
  generateObject,
  streamObject,
  streamObjectPartial,
} from './llm'

export type {
  LLMClient,
  LLMOpts,
  LLMConfig,
  LLMProvider,
  TaskComplexity,
  JsonSchema,
  GenerateObjectResult,
  StreamObjectEvent,
  LLMToolSchema,
  LLMToolCall,
  LLMToolResult,
  LLMMessage,
  LLMStreamEvent,
  LLMTextPart,
  LLMImagePart,
  LLMContentPart,
  GenerationOptions,
  ToolChoiceValue,
} from './llm'

export {
  openaiGenerateWithTools,
  openaiStreamWithTools,
  anthropicGenerateWithTools,
  anthropicStreamWithTools,
  googleGenerateWithTools,
  googleStreamWithTools,
  ollamaGenerateWithTools,
  ollamaStreamWithTools,
  cohereGenerateWithTools,
  cohereStreamWithTools,
  bedrockGenerateWithTools,
  bedrockStreamWithTools,
} from './llm'

export type { ProviderAdapter, OpenAICompatOptions } from './llm'

export {
  registerProvider,
  getProvider,
  getProviderByKey,
  listProviders,
  makeOpenAICompatAdapter,
} from './llm'

export {
  getEmbeddingProvider,
  OpenAIEmbeddingProvider,
  OllamaEmbeddingProvider,
  CohereEmbeddingProvider,
  VoyageEmbeddingProvider,
  AzureEmbeddingProvider,
  cosineSimilarity,
  cosineDistance,
  findNearest,
  centroid,
  jaccardSimilarity,
  EMBEDDING_DEFAULTS,
} from './embeddings'

export type {
  EmbeddingProvider,
  EmbeddingConfig,
  SimilarityResult,
} from './embeddings';

export { chunkText, InMemoryVectorStore, InMemoryVectorStoreAdapter, PineconeVectorStore, createRagPipeline, CrossEncoderReranker, rerank, cohereReranking, embeddingReranking } from './rag';
export type { ChunkOptions, TextChunk, VectorEntry, VectorSearchResult, VectorStoreAdapter, RagPipeline, RagPipelineOptions, RetrievedChunk, RerankProvider, RankResult, RerankOptions } from './rag';

// Semantic cache
export { SemanticCache } from './cache';
export type { CachedEntry, SemanticCacheOptions } from './cache';

export {
  createAIMiddleware,
  budgetEnforcement,
  providerFallback,
} from './middleware'

export type {
  AIRequestContext,
  AIMiddlewareFunction,
  AIMiddleware,
  BudgetConfig,
  FallbackConfig,
  ProviderName,
} from './middleware'

export {
  OpenAITTSProvider,
  ElevenLabsTTSProvider,
  OpenAISTTProvider,
  RealtimeProxy,
  getTTSContentType,
  VOICE_DEFAULTS,
  ALLOWED_TTS_FORMATS,
  ALLOWED_AUDIO_TYPES,
  TTS_MAX_TEXT_LENGTH,
  TTS_MIN_SPEED,
  TTS_MAX_SPEED,
} from './voice'

export type {
  VoiceTTSProvider,
  VoiceSTTProvider,
  TTSOptions,
  STTOptions,
  STTResult,
  VoiceConfig,
  RealtimeUsage,
  RealtimeProxyOptions,
} from './voice'
