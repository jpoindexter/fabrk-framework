/**
 * Ollama LLM client implementation (local models)
 */

import type { LLMClient, LLMOpts, LLMConfig } from './types'
import { LLM_DEFAULTS } from './types'

export class OllamaClient implements LLMClient {
  private config: LLMConfig
  private static modelValidated = false

  constructor(config: Partial<LLMConfig> = {}) {
    this.config = { ...LLM_DEFAULTS, ...config, provider: 'ollama' }
  }

  private async validateModelExists(): Promise<void> {
    if (OllamaClient.modelValidated) return

    const baseUrl = this.config.ollamaBaseUrl || LLM_DEFAULTS.ollamaBaseUrl
    const model = this.config.ollamaModel || LLM_DEFAULTS.ollamaModel

    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      throw new Error(
        `Cannot connect to Ollama at ${baseUrl}. Make sure Ollama is running: ollama serve`
      )
    }

    const data = await response.json()
    const models = data.models || []
    const modelExists = models.some(
      (m: { name: string }) => m.name === model || m.name === `${model}:latest`
    )

    if (!modelExists) {
      const available = models.map((m: { name: string }) => m.name).join(', ')
      throw new Error(
        `Model '${model}' not found in Ollama. Available: ${available || 'none'}. Run: ollama pull ${model}`
      )
    }

    OllamaClient.modelValidated = true
  }

  async generate(opts: LLMOpts): Promise<string> {
    await this.validateModelExists()

    const baseUrl = this.config.ollamaBaseUrl || LLM_DEFAULTS.ollamaBaseUrl
    const model = this.config.ollamaModel || LLM_DEFAULTS.ollamaModel

    const systemPrompt = opts.system || ''
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${opts.prompt}` : opts.prompt

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: opts.temperature ?? this.config.temperature,
          num_predict: opts.maxTokens ?? this.config.maxTokens,
        },
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs || LLM_DEFAULTS.timeoutMs),
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.response || ''
  }
}
