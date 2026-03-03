import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LLMMessage } from '../llm/tool-types'

const MESSAGES: LLMMessage[] = [
  { role: 'user', content: 'Extract the name and age from: John is 30 years old.' },
]

const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
  },
  required: ['name', 'age'],
  additionalProperties: false,
}

describe('generateObject — OpenAI dispatch', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('parses structured JSON from OpenAI response_format', async () => {
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: '{"name":"John","age":30}' } }],
              usage: { prompt_tokens: 15, completion_tokens: 8 },
            }),
          },
        }
      },
    }))

    const { generateObject } = await import('../llm/generate-object')
    const result = await generateObject(MESSAGES, SCHEMA, {
      provider: 'openai',
      openaiApiKey: 'test-key',
    })

    expect(result.object).toEqual({ name: 'John', age: 30 })
    expect(result.rawContent).toBe('{"name":"John","age":30}')
    expect(result.usage).toEqual({ promptTokens: 15, completionTokens: 8 })
  })

  it('throws on malformed JSON from OpenAI', async () => {
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: '{bad json' } }],
              usage: { prompt_tokens: 10, completion_tokens: 5 },
            }),
          },
        }
      },
    }))

    const { generateObject } = await import('../llm/generate-object')
    await expect(
      generateObject(MESSAGES, SCHEMA, { provider: 'openai', openaiApiKey: 'test-key' })
    ).rejects.toThrow()
  })
})

describe('generateObject — Anthropic dispatch', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('extracts structured output via tool-forcing trick', async () => {
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class Anthropic {
        messages = {
          create: vi.fn().mockResolvedValue({
            content: [
              {
                type: 'tool_use',
                id: 'tu_1',
                name: '__structured_output',
                input: { name: 'John', age: 30 },
              },
            ],
            usage: { input_tokens: 20, output_tokens: 12 },
          }),
        }
      },
    }))

    const { generateObject } = await import('../llm/generate-object')
    const result = await generateObject(MESSAGES, SCHEMA, {
      provider: 'anthropic',
      anthropicApiKey: 'test-key',
    })

    expect(result.object).toEqual({ name: 'John', age: 30 })
    expect(result.usage).toEqual({ promptTokens: 20, completionTokens: 12 })
  })

  it('returns empty object when no tool_use block matches', async () => {
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class Anthropic {
        messages = {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Unexpected' }],
            usage: { input_tokens: 10, output_tokens: 5 },
          }),
        }
      },
    }))

    const { generateObject } = await import('../llm/generate-object')
    const result = await generateObject(MESSAGES, SCHEMA, {
      provider: 'anthropic',
      anthropicApiKey: 'test-key',
    })

    expect(result.object).toEqual({})
  })
})

describe('generateObject — Google dispatch', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('parses structured JSON from Google Gemini', async () => {
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: class {
        getGenerativeModel() {
          return {
            generateContent: vi.fn().mockResolvedValue({
              response: {
                text: () => '{"name":"John","age":30}',
                usageMetadata: { promptTokenCount: 18, candidatesTokenCount: 10 },
              },
            }),
          }
        }
      },
    }))

    const { generateObject } = await import('../llm/generate-object')
    const result = await generateObject(MESSAGES, SCHEMA, {
      provider: 'google',
      googleApiKey: 'test-key',
    })

    expect(result.object).toEqual({ name: 'John', age: 30 })
    expect(result.usage).toEqual({ promptTokens: 18, completionTokens: 10 })
  })
})

describe('generateObject — Ollama dispatch', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('parses structured JSON from Ollama format: "json"', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        message: { content: '{"name":"John","age":30}' },
        prompt_eval_count: 12,
        eval_count: 7,
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { generateObject } = await import('../llm/generate-object')
    const result = await generateObject(MESSAGES, SCHEMA, { provider: 'ollama' })

    expect(result.object).toEqual({ name: 'John', age: 30 })
    expect(result.usage).toEqual({ promptTokens: 12, completionTokens: 7 })

    vi.unstubAllGlobals()
  })

  it('throws on Ollama API error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })
    vi.stubGlobal('fetch', mockFetch)

    const { generateObject } = await import('../llm/generate-object')
    await expect(
      generateObject(MESSAGES, SCHEMA, { provider: 'ollama' })
    ).rejects.toThrow('Ollama API error: 500')

    vi.unstubAllGlobals()
  })
})

describe('generateObject — default dispatch', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('defaults to OpenAI when no provider specified', async () => {
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: '{"name":"Jane","age":25}' } }],
              usage: { prompt_tokens: 10, completion_tokens: 5 },
            }),
          },
        }
      },
    }))

    const { generateObject } = await import('../llm/generate-object')
    const result = await generateObject(MESSAGES, SCHEMA, { openaiApiKey: 'test-key' })

    expect(result.object).toEqual({ name: 'Jane', age: 25 })
  })
})
