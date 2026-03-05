import type { LLMClient, LLMConfig, TaskComplexity } from './types'
import { LLM_DEFAULTS } from './types'
import { OpenAIClient } from './openai-client'
import { AnthropicClient } from './anthropic-client'
import { GoogleClient } from './google-client'
import { OllamaClient } from './ollama-client'

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
    case 'google':
      return new GoogleClient(merged)
    case 'ollama':
      return new OllamaClient(merged)
    default:
      return new OpenAIClient(merged)
  }
}
