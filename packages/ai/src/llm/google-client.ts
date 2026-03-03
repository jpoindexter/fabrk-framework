import type { LLMClient, LLMOpts, LLMConfig } from './types'
import { LLM_DEFAULTS, MAX_TOKENS_LIMIT } from './types'

export class GoogleClient implements LLMClient {
  private config: LLMConfig

  constructor(config: Partial<LLMConfig> = {}) {
    this.config = { ...LLM_DEFAULTS, ...config, provider: 'google' }
    if (!this.config.googleApiKey) {
      this.config.googleApiKey = (globalThis as Record<string, unknown>).process
        ? ((globalThis as Record<string, unknown>).process as { env?: Record<string, string> }).env?.GOOGLE_API_KEY || ''
        : ''
    }
  }

  async generate(opts: LLMOpts): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let GoogleGenerativeAI: any
    try {
      const mod = await import('@google/generative-ai')
      GoogleGenerativeAI = mod.GoogleGenerativeAI
    } catch {
      throw new Error('@google/generative-ai not installed. Install with: npm install @google/generative-ai')
    }

    const client = new GoogleGenerativeAI(this.config.googleApiKey)
    const model = client.getGenerativeModel({
      model: this.config.googleModel || LLM_DEFAULTS.googleModel,
    })

    const contents = []
    if (opts.system) {
      contents.push({ role: 'user', parts: [{ text: opts.system }] })
      contents.push({ role: 'model', parts: [{ text: 'Understood.' }] })
    }
    contents.push({ role: 'user', parts: [{ text: opts.prompt }] })

    const result = await model.generateContent({
      contents,
      generationConfig: {
        maxOutputTokens: Math.min(opts.maxTokens ?? this.config.maxTokens ?? MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
        temperature: opts.temperature ?? this.config.temperature,
      },
    })

    return result.response.text() || ''
  }
}
