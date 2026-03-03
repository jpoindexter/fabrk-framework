import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getLLMClient } from '../llm/factory'
import { OpenAIClient } from '../llm/openai-client'
import { AnthropicClient } from '../llm/anthropic-client'
import { OllamaClient } from '../llm/ollama-client'

describe('getLLMClient', () => {
  it('returns OpenAIClient for provider "openai"', () => {
    const client = getLLMClient({ provider: 'openai' })
    expect(client).toBeInstanceOf(OpenAIClient)
  })

  it('returns AnthropicClient for provider "anthropic"', () => {
    const client = getLLMClient({ provider: 'anthropic' })
    expect(client).toBeInstanceOf(AnthropicClient)
  })

  it('returns OllamaClient for provider "ollama"', () => {
    const client = getLLMClient({ provider: 'ollama' })
    expect(client).toBeInstanceOf(OllamaClient)
  })

  it('defaults to OpenAIClient for unknown provider', () => {
    // Cast through unknown to simulate a provider value not in the union
    const client = getLLMClient({ provider: 'unknown-provider' as unknown as 'openai' })
    expect(client).toBeInstanceOf(OpenAIClient)
  })

  it('defaults to OpenAI when no config provided', () => {
    const client = getLLMClient()
    expect(client).toBeInstanceOf(OpenAIClient)
  })

  describe('hybrid mode (ollama + complex + API key)', () => {
    it('returns OpenAIClient for complex + ollama when openaiApiKey is set in config', () => {
      const client = getLLMClient(
        { provider: 'ollama', openaiApiKey: 'sk-test' },
        'complex'
      )
      expect(client).toBeInstanceOf(OpenAIClient)
    })

    it('returns OllamaClient for simple + ollama even when openaiApiKey is set', () => {
      const client = getLLMClient(
        { provider: 'ollama', openaiApiKey: 'sk-test' },
        'simple'
      )
      expect(client).toBeInstanceOf(OllamaClient)
    })

    it('returns OllamaClient for complex + ollama when no API key is available', () => {
      // Ensure env var is absent so hybrid mode cannot trigger
      const saved = (globalThis as Record<string, unknown>).process as { env?: Record<string, string> } | undefined
      if (saved?.env) {
        delete saved.env['OPENAI_API_KEY']
      }

      const client = getLLMClient({ provider: 'ollama' }, 'complex')
      expect(client).toBeInstanceOf(OllamaClient)
    })

    describe('hybrid mode via env OPENAI_API_KEY', () => {
      let savedKey: string | undefined

      beforeEach(() => {
        const proc = (globalThis as Record<string, unknown>).process as { env?: Record<string, string> } | undefined
        if (proc?.env) {
          savedKey = proc.env['OPENAI_API_KEY']
          proc.env['OPENAI_API_KEY'] = 'sk-env-test'
        }
      })

      afterEach(() => {
        const proc = (globalThis as Record<string, unknown>).process as { env?: Record<string, string> } | undefined
        if (proc?.env) {
          if (savedKey === undefined) {
            delete proc.env['OPENAI_API_KEY']
          } else {
            proc.env['OPENAI_API_KEY'] = savedKey
          }
        }
      })

      it('returns OpenAIClient for complex + ollama when OPENAI_API_KEY is set in env', () => {
        // No openaiApiKey in config — hybrid should pick up env var
        const client = getLLMClient({ provider: 'ollama' }, 'complex')
        expect(client).toBeInstanceOf(OpenAIClient)
      })
    })
  })
})
