export { getLLMClient } from './factory'
export { OpenAIClient } from './openai-client'
export { AnthropicClient } from './anthropic-client'
export { OllamaClient } from './ollama-client'
export type {
  LLMClient,
  LLMOpts,
  LLMConfig,
  LLMProvider,
  TaskComplexity,
} from './types'
export { LLM_DEFAULTS } from './types'

export type {
  LLMToolSchema,
  LLMToolCall,
  LLMToolResult,
  LLMMessage,
  LLMStreamEvent,
} from './tool-types'

export {
  generateWithTools as openaiGenerateWithTools,
  streamWithTools as openaiStreamWithTools,
} from './openai-tools'

export {
  generateWithTools as anthropicGenerateWithTools,
  streamWithTools as anthropicStreamWithTools,
} from './anthropic-tools'

export type { ProviderAdapter } from './registry'

export {
  registerProvider,
  getProvider,
  getProviderByKey,
  listProviders,
} from './registry'

export { makeOpenAICompatAdapter } from './openai-compat'
export type { OpenAICompatOptions } from './openai-compat'

// Ensure all providers are registered eagerly.
// We re-export from their modules so the bundler includes them.
export {
  generateWithTools as cohereGenerateWithTools,
  streamWithTools as cohereStreamWithTools,
} from './cohere-tools'

export {
  generateWithTools as bedrockGenerateWithTools,
  streamWithTools as bedrockStreamWithTools,
} from './bedrock-tools'
