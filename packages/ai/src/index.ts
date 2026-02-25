/**
 * @fabrk/ai — AI Integration Toolkit
 *
 * Provides LLM providers, cost tracking, embeddings, streaming,
 * prompt management, and middleware for AI-powered applications.
 *
 * @module ai
 */

// Re-export Vercel AI SDK provider utilities
export {
  getModel,
  getConfiguredProvider,
} from './provider';

// API response types
export type { APIResponse } from './types';

// AI DEVELOPMENT TOOLS

// Cost tracking — types
export {
  type AICostEvent,
  type CostSummary,
  type FeatureCost,
  type CostBudgetStatus,
  type CostStore,
} from './cost-types';

// Cost tracking — pricing
export {
  calculateCost as calculateModelCost,
  MODEL_PRICING,
} from './pricing';

// Cost tracking — tracker
export {
  AICostTracker,
  InMemoryCostStore,
  getCostTracker,
  setCostStore,
} from './tracker';


// AI Integrations (unified interface)
export {
  // Types
  type GenerateOptions,
  type GenerateResult,
  // Providers
  ai,
  claude,
  openai,
} from './integrations';

// Streaming utilities
export {
  streamToString,
  parseStreamChunks,
  createTextStream,
  concatStreams,
  transformStream,
  toReadableStream,
  fromReadableStream,
} from './streaming/stream-text';

// Prompt management
export {
  // Types
  type PromptTemplate,
  // Functions
  createPromptTemplate,
  composePrompts,
  createMessagePair,
} from './prompts/template';

export {
  // Types
  type BuiltPrompt,
  // Classes
  PromptBuilder,
} from './prompts/builder';

// Prisma cost store (reference implementation)
export { PrismaCostStore } from './cost-store-prisma'

// LLM Provider Abstraction
export {
  getLLMClient,
  OpenAIClient,
  AnthropicClient,
  OllamaClient,
  LLM_DEFAULTS,
} from './llm'

export type {
  LLMClient,
  LLMOpts,
  LLMConfig,
  LLMProvider,
  TaskComplexity,
} from './llm'

// Embeddings & Similarity
export {
  getEmbeddingProvider,
  OpenAIEmbeddingProvider,
  OllamaEmbeddingProvider,
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

// AI Middleware (budget enforcement, provider fallback)
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
