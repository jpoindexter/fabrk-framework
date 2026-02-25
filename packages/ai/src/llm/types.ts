/**
 * Unified LLM provider abstraction types
 *
 * Extracted from Forge's clean 3-provider pattern.
 * Single-method interface: all providers return Promise<string>.
 */

/** Options for LLM generation */
export interface LLMOpts {
  /** System prompt */
  system?: string
  /** User prompt */
  prompt: string
  /** Max tokens to generate */
  maxTokens?: number
  /** Temperature (0-2) */
  temperature?: number
}

/** Unified LLM client interface - all providers implement this */
export interface LLMClient {
  /** Generate a text completion */
  generate(opts: LLMOpts): Promise<string>
}

/** Task complexity for hybrid routing */
export type TaskComplexity = 'simple' | 'complex'

/** Supported LLM providers */
export type LLMProvider = 'openai' | 'anthropic' | 'ollama'

/** LLM configuration */
export interface LLMConfig {
  /** Which provider to use */
  provider: LLMProvider
  /** OpenAI API key */
  openaiApiKey?: string
  /** OpenAI model name */
  openaiModel?: string
  /** Anthropic API key */
  anthropicApiKey?: string
  /** Anthropic model name */
  anthropicModel?: string
  /** Ollama base URL */
  ollamaBaseUrl?: string
  /** Ollama model name */
  ollamaModel?: string
  /** Default max tokens */
  maxTokens?: number
  /** Default temperature */
  temperature?: number
  /** Request timeout in ms */
  timeoutMs?: number
}

/** Hard cap on tokens per request to prevent runaway cost from untrusted input */
export const MAX_TOKENS_LIMIT = 100_000

/** Default LLM configuration values */
export const LLM_DEFAULTS: Required<Omit<LLMConfig, 'openaiApiKey' | 'anthropicApiKey'>> = {
  provider: 'openai',
  openaiModel: 'gpt-4o',
  anthropicModel: 'claude-sonnet-4-5-20250929',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1:8b-instruct',
  maxTokens: 3000,
  temperature: 0.2,
  timeoutMs: 90000,
}
