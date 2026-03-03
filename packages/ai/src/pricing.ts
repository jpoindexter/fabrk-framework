/** AI model pricing per 1K tokens. Update as providers change rates. */
export const MODEL_PRICING: Record<
  string,
  { input: number; output: number; provider: string }
> = {
  // Anthropic Claude models
  'claude-sonnet-4-20250514': {
    input: 0.003,
    output: 0.015,
    provider: 'anthropic',
  },
  // Default model used by LLM_DEFAULTS in llm/types.ts
  'claude-sonnet-4-5-20250929': {
    input: 0.003,
    output: 0.015,
    provider: 'anthropic',
  },
  'claude-opus-4-20250514': {
    input: 0.015,
    output: 0.075,
    provider: 'anthropic',
  },
  'claude-3-5-sonnet-20241022': {
    input: 0.003,
    output: 0.015,
    provider: 'anthropic',
  },
  'claude-3-5-haiku-20241022': {
    input: 0.0008,
    output: 0.004,
    provider: 'anthropic',
  },
  'claude-3-opus-20240229': {
    input: 0.015,
    output: 0.075,
    provider: 'anthropic',
  },

  // Anthropic Claude 4 series
  'claude-haiku-4-5-20251001': {
    input: 0.0008,
    output: 0.004,
    provider: 'anthropic',
  },
  'claude-sonnet-4-6': {
    input: 0.003,
    output: 0.015,
    provider: 'anthropic',
  },
  'claude-opus-4-6': {
    input: 0.015,
    output: 0.075,
    provider: 'anthropic',
  },

  // OpenAI models
  'gpt-4o': {
    input: 0.0025,
    output: 0.01,
    provider: 'openai',
  },
  'gpt-4o-mini': {
    input: 0.00015,
    output: 0.0006,
    provider: 'openai',
  },
  'gpt-4.1': {
    input: 0.002,
    output: 0.008,
    provider: 'openai',
  },
  'gpt-4.1-mini': {
    input: 0.0004,
    output: 0.0016,
    provider: 'openai',
  },
  'gpt-4.1-nano': {
    input: 0.0001,
    output: 0.0004,
    provider: 'openai',
  },
  'gpt-4-turbo': {
    input: 0.01,
    output: 0.03,
    provider: 'openai',
  },
  'gpt-4': {
    input: 0.03,
    output: 0.06,
    provider: 'openai',
  },
  'gpt-3.5-turbo': {
    input: 0.0005,
    output: 0.0015,
    provider: 'openai',
  },
  'o1': {
    input: 0.015,
    output: 0.06,
    provider: 'openai',
  },
  'o1-mini': {
    input: 0.003,
    output: 0.012,
    provider: 'openai',
  },
  'o3': {
    input: 0.01,
    output: 0.04,
    provider: 'openai',
  },
  'o3-mini': {
    input: 0.0011,
    output: 0.0044,
    provider: 'openai',
  },
  'o4-mini': {
    input: 0.0011,
    output: 0.0044,
    provider: 'openai',
  },

  // Embedding models
  'text-embedding-3-small': {
    input: 0.00002,
    output: 0,
    provider: 'openai',
  },
  'text-embedding-3-large': {
    input: 0.00013,
    output: 0,
    provider: 'openai',
  },

  // DeepSeek
  'deepseek-chat': {
    input: 0.00014,
    output: 0.00028,
    provider: 'deepseek',
  },
  'deepseek-reasoner': {
    input: 0.00055,
    output: 0.00219,
    provider: 'deepseek',
  },

  // Mistral
  'mistral-large-latest': {
    input: 0.002,
    output: 0.006,
    provider: 'mistral',
  },
  'mistral-small-latest': {
    input: 0.0002,
    output: 0.0006,
    provider: 'mistral',
  },
  'codestral-latest': {
    input: 0.0003,
    output: 0.0009,
    provider: 'mistral',
  },

  // Cohere
  'command-r-plus': {
    input: 0.0025,
    output: 0.01,
    provider: 'cohere',
  },
  'command-r': {
    input: 0.00015,
    output: 0.0006,
    provider: 'cohere',
  },

  // xAI / Grok
  'grok-3': {
    input: 0.003,
    output: 0.015,
    provider: 'xai',
  },
  'grok-3-mini': {
    input: 0.0003,
    output: 0.0005,
    provider: 'xai',
  },

  // Groq (inference pricing, not model training)
  'llama-3.3-70b-versatile': {
    input: 0.00059,
    output: 0.00079,
    provider: 'groq',
  },

  // Perplexity Sonar
  'llama-3.1-sonar-large-128k-online': {
    input: 0.001,
    output: 0.001,
    provider: 'perplexity',
  },
};

/**
 * Calculate cost for a given model and token usage
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): { costUSD: number; provider: string } {
  if (promptTokens < 0 || completionTokens < 0) {
    throw new Error('Token counts must be non-negative');
  }

  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    // Fallback: model not in pricing table — using rough estimate, actual cost may differ significantly
    return { costUSD: ((promptTokens + completionTokens) / 1000) * 0.01, provider: 'other' as const }
  }

  const inputCost = (promptTokens / 1000) * pricing.input;
  const outputCost = (completionTokens / 1000) * pricing.output;

  return {
    costUSD: inputCost + outputCost,
    provider: pricing.provider,
  };
}
