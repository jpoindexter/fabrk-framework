export interface LLMOpts {
  system?: string
  prompt: string
  maxTokens?: number
  temperature?: number
}

export interface LLMClient {
  generate(opts: LLMOpts): Promise<string>
}

export type TaskComplexity = 'simple' | 'complex'

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
  | 'openrouter'
  | 'cerebras'
  | 'lmstudio'
  | 'nim'
  | 'huggingface' | 'replicate' | 'deepinfra' | 'sambanova'
  | 'hyperbolic' | 'novita' | 'friendli' | 'upstage'
  | 'writer' | 'lambda' | 'reka' | 'ai21'
  | 'moonshot' | 'zhipu' | 'yi' | 'qwen'
  | 'minimax' | 'stepfun' | 'baichuan' | 'maritaca'
  | 'nebius' | 'cloudflare-ai'
  | 'scaleway' | 'siliconflow' | 'volcengine' | 'anyscale'
  | 'lepton' | 'featherless' | 'arliai' | 'kluster'
  | 'aimlapi' | 'nscale' | 'octoai' | 'github-models'
  | 'azure-ai-inference' | 'prem' | 'aleph-alpha' | 'ovhcloud'
  | 'chutes' | 'infermatic' | 'predibase' | 'spark'
  | 'hunyuan' | 'vllm' | 'jan' | 'llamacpp'
  | 'localai' | 'text-generation-webui'

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
  timeoutMs?: number
  providerApiKey?: string
  providerBaseUrl?: string
  providerOptions?: Record<string, unknown>
}

export type JsonSchema = Record<string, unknown>

export interface GenerateObjectResult<T = unknown> {
  object: T
  rawContent: string
  usage: { promptTokens: number; completionTokens: number }
}

export type StreamObjectEvent<T = unknown> =
  | { type: "delta"; text: string }
  | { type: "done"; object: T; usage: { promptTokens: number; completionTokens: number } }
  | { type: "error"; message: string };

/** Hard cap on tokens per request to prevent runaway cost from untrusted input */
export const MAX_TOKENS_LIMIT = 100_000

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
