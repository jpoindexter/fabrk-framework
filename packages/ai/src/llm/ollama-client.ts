/**
 * Ollama LLM client implementation (local models)
 */

import type { LLMClient, LLMOpts, LLMConfig } from './types'
import { LLM_DEFAULTS, MAX_TOKENS_LIMIT } from './types'

/**
 * Validate that an Ollama base URL is safe.
 *
 * Uses an allowlist approach for IP addresses to prevent SSRF via alternate
 * IP representations (decimal, octal, hex, IPv6-mapped IPv4).
 *
 * - localhost / 127.0.0.1 / ::1 are allowed (standard Ollama deployment)
 * - All other IP-like hostnames are rejected
 * - Public hostnames (non-IP) are allowed (DNS rebinding is mitigated at network level)
 * - Non-http(s) schemes are rejected
 */
export function validateOllamaUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Invalid Ollama base URL: ${url}`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Invalid Ollama URL scheme "${parsed.protocol}". Only http: and https: are allowed.`
    )
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase()

  // Strict allowlist for localhost variants
  const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])
  if (ALLOWED_HOSTS.has(hostname)) return

  // Reject ANY IP-like hostname (catches decimal, octal, hex, IPv6, IPv6-mapped IPv4)
  if (
    /^\d+$/.test(hostname) ||           // decimal IP (2130706433)
    /^0[xX]/.test(hostname) ||           // hex IP
    /^0\d/.test(hostname) ||             // octal IP
    hostname.includes(':') ||            // IPv6 (including ::ffff:x.x.x.x)
    /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)  // dotted decimal IPv4
  ) {
    throw new Error(
      `Ollama URL "${url}" uses an IP address that is not localhost. ` +
      `Only localhost (127.0.0.1 / ::1) is allowed for local Ollama. ` +
      `For remote Ollama, use a public hostname.`
    )
  }
  // Public hostname allowed (DNS rebinding mitigated at network level)
}

export class OllamaClient implements LLMClient {
  private config: LLMConfig
  private modelValidated = false

  constructor(config: Partial<LLMConfig> = {}) {
    this.config = { ...LLM_DEFAULTS, ...config, provider: 'ollama' }

    // Validate the base URL on construction
    const baseUrl = this.config.ollamaBaseUrl || LLM_DEFAULTS.ollamaBaseUrl
    validateOllamaUrl(baseUrl)
  }

  private async validateModelExists(): Promise<void> {
    if (this.modelValidated) return

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

    this.modelValidated = true
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
          num_predict: Math.min(opts.maxTokens ?? this.config.maxTokens ?? MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
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
