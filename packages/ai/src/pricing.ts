/**
 * AI Model Pricing Tables
 *
 * Pricing data for Claude, OpenAI, and other AI models.
 * Update these as providers change rates.
 */

/**
 * AI model pricing per 1K tokens
 * Update these as providers change rates
 */
export const MODEL_PRICING: Record<
  string,
  { input: number; output: number; provider: 'anthropic' | 'openai' | 'other' }
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

  // OpenAI models
  'gpt-4o': {
    input: 0.005,
    output: 0.015,
    provider: 'openai',
  },
  'gpt-4o-mini': {
    input: 0.00015,
    output: 0.0006,
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
};

/**
 * Calculate cost for a given model and token usage
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): { costUSD: number; provider: 'anthropic' | 'openai' | 'other' } {
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
