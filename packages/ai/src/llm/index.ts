export { getLLMClient } from './factory'
export { OpenAIClient } from './openai-client'
export { AnthropicClient } from './anthropic-client'
export { GoogleClient } from './google-client'
export { OllamaClient } from './ollama-client'
export type {
  LLMClient,
  LLMOpts,
  LLMConfig,
  LLMProvider,
  TaskComplexity,
  JsonSchema,
  GenerateObjectResult,
} from './types'
export { LLM_DEFAULTS } from './types'

export type {
  LLMToolSchema,
  LLMToolCall,
  LLMToolResult,
  LLMMessage,
  LLMStreamEvent,
  LLMTextPart,
  LLMImagePart,
  LLMContentPart,
} from './tool-types'

export {
  generateWithTools as openaiGenerateWithTools,
  streamWithTools as openaiStreamWithTools,
} from './openai-tools'

export {
  generateWithTools as anthropicGenerateWithTools,
  streamWithTools as anthropicStreamWithTools,
} from './anthropic-tools'

export {
  generateWithTools as googleGenerateWithTools,
  streamWithTools as googleStreamWithTools,
} from './google-tools'

export {
  generateWithTools as ollamaGenerateWithTools,
  streamWithTools as ollamaStreamWithTools,
} from './ollama-tools'

export { generateObject } from './generate-object'

export type { ProviderAdapter } from './registry'

export {
  registerProvider,
  getProvider,
  getProviderByKey,
  listProviders,
} from './registry'

export { makeOpenAICompatAdapter } from './openai-compat'
export type { OpenAICompatOptions } from './openai-compat'

export {
  generateWithTools as cohereGenerateWithTools,
  streamWithTools as cohereStreamWithTools,
} from './cohere-tools'

export {
  generateWithTools as bedrockGenerateWithTools,
  streamWithTools as bedrockStreamWithTools,
} from './bedrock-tools'
