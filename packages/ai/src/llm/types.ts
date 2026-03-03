/**
 * Unified LLM provider abstraction types
 *
 * Extracted from Forge's clean 3-provider pattern.
 * Single-method interface: all providers return Promise<string>.
 */

export interface LLMOpts {
  system?: string
  prompt: string
  maxTokens?: number
  /** Temperature (0-2) */
  temperature?: number
}

/** Unified LLM client interface - all providers implement this */
export interface LLMClient {
  generate(opts: LLMOpts): Promise<string>
}

/** Task complexity for hybrid routing */
export type TaskComplexity = 'simple' | 'complex'

/** Supported LLM providers */
export type LLMProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'ollama'
  | 'azure'
  | 'groq'
  | 'together'
  | 'fireworks'
  | 'deepseek'
  | 'xai'
  | 'perplexity'
  | 'mistral'
  | 'cohere'
  | 'bedrock'

export interface LLMConfig {
  provider: LLMProvider
  openaiApiKey?: string
  openaiModel?: string
  anthropicApiKey?: string
  anthropicModel?: string
  googleApiKey?: string
  googleModel?: string
  ollamaBaseUrl?: string
  ollamaModel?: string
  maxTokens?: number
  temperature?: number
  /** Request timeout in ms */
  timeoutMs?: number
  /** Override API key for any provider */
  providerApiKey?: string
  /** Override base URL for OpenAI-compatible providers */
  providerBaseUrl?: string
  /** Provider-specific options (e.g., AWS region, API version) */
  providerOptions?: Record<string, unknown>
}

/** JSON Schema object for structured output */
export type JsonSchema = Record<string, unknown>

/** Result from generateObject — parsed object + raw response + usage */
export interface GenerateObjectResult<T = unknown> {
  object: T
  rawContent: string
  usage: { promptTokens: number; completionTokens: number }
}

/** Hard cap on tokens per request to prevent runaway cost from untrusted input */
export const MAX_TOKENS_LIMIT = 100_000

/** Default LLM configuration values */
export const LLM_DEFAULTS: Required<Omit<LLMConfig, 'openaiApiKey' | 'anthropicApiKey' | 'googleApiKey' | 'providerApiKey' | 'providerBaseUrl' | 'providerOptions'>> = {
  provider: 'openai',
  openaiModel: 'gpt-4o',
  anthropicModel: 'claude-sonnet-4-5-20250929',
  googleModel: 'gemini-2.0-flash',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1:8b-instruct',
  maxTokens: 3000,
  temperature: 0.2,
  timeoutMs: 90000,
}
