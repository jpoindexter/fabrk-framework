/**
 * Anthropic LLM client implementation
 */

import type { LLMClient, LLMOpts, LLMConfig } from './types'
import { LLM_DEFAULTS } from './types'

export class AnthropicClient implements LLMClient {
  private config: LLMConfig

  constructor(config: Partial<LLMConfig> = {}) {
    this.config = { ...LLM_DEFAULTS, ...config, provider: 'anthropic' }
    if (!this.config.anthropicApiKey) {
      this.config.anthropicApiKey = process.env.ANTHROPIC_API_KEY || ''
    }
  }

  async generate(opts: LLMOpts): Promise<string> {
    let Anthropic: any
    try {
      const mod = await import('@anthropic-ai/sdk')
      Anthropic = mod.default || mod.Anthropic || mod
    } catch {
      throw new Error('@anthropic-ai/sdk not installed. Install with: npm install @anthropic-ai/sdk')
    }

    const client = new Anthropic({ apiKey: this.config.anthropicApiKey })

    const response = await client.messages.create(
      {
        model: this.config.anthropicModel || LLM_DEFAULTS.anthropicModel,
        max_tokens: opts.maxTokens ?? this.config.maxTokens ?? 1024,
        temperature: opts.temperature ?? this.config.temperature,
        system: opts.system,
        messages: [{ role: 'user', content: opts.prompt }],
      },
      { timeout: this.config.timeoutMs }
    )

    const textBlock = response.content.find((block: any) => block.type === 'text')
    return textBlock?.text || ''
  }
}
