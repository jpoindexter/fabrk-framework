/**
 * OpenAI LLM client implementation
 */

import type { LLMClient, LLMOpts, LLMConfig } from './types'
import { LLM_DEFAULTS, MAX_TOKENS_LIMIT } from './types'

export class OpenAIClient implements LLMClient {
  private config: LLMConfig

  constructor(config: Partial<LLMConfig> = {}) {
    this.config = { ...LLM_DEFAULTS, ...config, provider: 'openai' }
    if (!this.config.openaiApiKey) {
      this.config.openaiApiKey = process.env.OPENAI_API_KEY || ''
    }
  }

  async generate(opts: LLMOpts): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let OpenAI: any
    try {
      const mod = await import('openai')
      OpenAI = mod.default || mod.OpenAI || mod
    } catch {
      throw new Error('openai package not installed. Install with: npm install openai')
    }

    const client = new OpenAI({ apiKey: this.config.openaiApiKey })
    const messages: Array<{ role: string; content: string }> = []

    if (opts.system) {
      messages.push({ role: 'system', content: opts.system })
    }
    messages.push({ role: 'user', content: opts.prompt })

    const response = await client.chat.completions.create(
      {
        model: this.config.openaiModel || LLM_DEFAULTS.openaiModel,
        messages,
        max_tokens: Math.min(opts.maxTokens ?? this.config.maxTokens ?? MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
        temperature: opts.temperature ?? this.config.temperature,
      },
      { timeout: this.config.timeoutMs }
    )

    return response.choices[0]?.message?.content || ''
  }
}
