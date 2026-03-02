/**
 * Unified LLM provider abstraction
 *
 * @example
 * ```ts
 * import { getLLMClient } from '@fabrk/ai'
 *
 * const client = getLLMClient({ provider: 'openai' })
 * const response = await client.generate({
 *   system: 'You are a helpful assistant.',
 *   prompt: 'What is TypeScript?',
 * })
 * ```
 */

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
