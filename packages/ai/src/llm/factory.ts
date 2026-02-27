/**
 * LLM client factory
 *
 * Supports hybrid mode: use cloud provider for complex tasks
 * while keeping simple tasks on local Ollama.
 */

import type { LLMClient, LLMConfig, TaskComplexity } from './types'
import { LLM_DEFAULTS } from './types'
import { OpenAIClient } from './openai-client'
import { AnthropicClient } from './anthropic-client'
import { OllamaClient } from './ollama-client'

/**
 * Create an LLM client for the given configuration and task complexity.
 *
 * @example
 * ```ts
 * // Simple: use default provider
 * const client = getLLMClient()
 * const response = await client.generate({ prompt: 'Hello' })
 *
 * // Hybrid: use cloud for complex tasks even when default is local
 * const client = getLLMClient({ provider: 'ollama' }, 'complex')
 * // → Uses OpenAI if OPENAI_API_KEY is set, otherwise falls back to Ollama
 * ```
 */
export function getLLMClient(
  config: Partial<LLMConfig> = {},
  complexity: TaskComplexity = 'simple'
): LLMClient {
  const merged: LLMConfig = { ...LLM_DEFAULTS, ...config }

  // Hybrid mode: use OpenAI for complex tasks when running local
  if (
    complexity === 'complex' &&
    merged.provider === 'ollama' &&
    (merged.openaiApiKey || ((globalThis as Record<string, unknown>).process as { env?: Record<string, string> } | undefined)?.env?.OPENAI_API_KEY)
  ) {
    return new OpenAIClient(merged)
  }

  switch (merged.provider) {
    case 'openai':
      return new OpenAIClient(merged)
    case 'anthropic':
      return new AnthropicClient(merged)
    case 'ollama':
      return new OllamaClient(merged)
    default:
      return new OpenAIClient(merged)
  }
}
