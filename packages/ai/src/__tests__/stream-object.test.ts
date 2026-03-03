import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LLMMessage } from '../llm/tool-types'
import type { StreamObjectEvent } from '../llm/types'

const MESSAGES: LLMMessage[] = [
  { role: 'user', content: 'Extract name and age from: John is 30 years old.' },
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

async function collect<T>(gen: AsyncGenerator<StreamObjectEvent<T>>): Promise<StreamObjectEvent<T>[]> {
  const events: StreamObjectEvent<T>[] = []
  for await (const event of gen) events.push(event)
  return events
}

describe('streamObject — OpenAI dispatch (default)', () => {
  beforeEach(() => { vi.resetModules() })

  it('dispatches to openai-object by default', async () => {
    const chunks = [
      { choices: [{ delta: { content: '{"name":' } }], usage: null },
      { choices: [{ delta: { content: '"John","age":30}' } }], usage: null },
      { choices: [{ delta: { content: '' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } },
    ]
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue((async function* () { yield* chunks })()),
          },
        }
      },
    }))

    const { streamObject } = await import('../llm/generate-object')
    const events = await collect(streamObject(MESSAGES, SCHEMA, { openaiApiKey: 'test-key' }))

    const deltas = events.filter((e) => e.type === 'delta')
    const done = events.find((e) => e.type === 'done')

    expect(deltas.length).toBe(2)
    expect(done).toBeDefined()
    expect(done?.type === 'done' && done.object).toEqual({ name: 'John', age: 30 })
  })

  it('yields delta events before done', async () => {
    const chunks = [
      { choices: [{ delta: { content: '{"x":' } }], usage: null },
      { choices: [{ delta: { content: '1}' } }], usage: { prompt_tokens: 5, completion_tokens: 3 } },
    ]
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue((async function* () { yield* chunks })()),
          },
        }
      },
    }))

    const { streamObject } = await import('../llm/generate-object')
    const events = await collect(streamObject(MESSAGES, SCHEMA, { openaiApiKey: 'key' }))

    // All deltas must come before done
    const doneIdx = events.findIndex((e) => e.type === 'done')
    const afterDone = events.slice(doneIdx + 1)
    expect(afterDone.every((e) => e.type !== 'delta')).toBe(true)
    expect(events[0].type).toBe('delta')
  })

  it('yields error event on invalid JSON', async () => {
    const chunks = [
      { choices: [{ delta: { content: 'not-json' } }], usage: { prompt_tokens: 5, completion_tokens: 2 } },
    ]
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue((async function* () { yield* chunks })()),
          },
        }
      },
    }))

    const { streamObject } = await import('../llm/generate-object')
    const events = await collect(streamObject(MESSAGES, SCHEMA, { openaiApiKey: 'key' }))

    const err = events.find((e) => e.type === 'error')
    expect(err).toBeDefined()
    expect(err?.type === 'error' && err.message).toMatch(/parse/)
  })

  it('carries usage tokens in done event', async () => {
    const chunks = [
      { choices: [{ delta: { content: '{}' } }], usage: { prompt_tokens: 20, completion_tokens: 8 } },
    ]
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue((async function* () { yield* chunks })()),
          },
        }
      },
    }))

    const { streamObject } = await import('../llm/generate-object')
    const events = await collect(streamObject(MESSAGES, SCHEMA, { openaiApiKey: 'key' }))

    const done = events.find((e) => e.type === 'done')
    expect(done?.type === 'done' && done.usage).toEqual({ promptTokens: 20, completionTokens: 8 })
  })
})

describe('streamObject — Anthropic dispatch', () => {
  beforeEach(() => { vi.resetModules() })

  it('dispatches to anthropic-object for provider: "anthropic"', async () => {
    const streamEvents = [
      { type: 'message_start', message: { usage: { input_tokens: 15 } } },
      { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{"name":"John"' } },
      { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: ',"age":30}' } },
      { type: 'message_delta', usage: { output_tokens: 10 } },
    ]
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class Anthropic {
        messages = {
          stream: vi.fn().mockReturnValue((async function* () { yield* streamEvents })()),
        }
      },
    }))

    const { streamObject } = await import('../llm/generate-object')
    const events = await collect(streamObject(MESSAGES, SCHEMA, {
      provider: 'anthropic',
      anthropicApiKey: 'test-key',
    }))

    const deltas = events.filter((e) => e.type === 'delta')
    const done = events.find((e) => e.type === 'done')

    expect(deltas.length).toBe(2)
    expect(done?.type === 'done' && done.object).toEqual({ name: 'John', age: 30 })
    expect(done?.type === 'done' && done.usage).toEqual({ promptTokens: 15, completionTokens: 10 })
  })

  it('yields done with empty object when no json delta events emitted', async () => {
    const streamEvents = [
      { type: 'message_start', message: { usage: { input_tokens: 5 } } },
      { type: 'message_delta', usage: { output_tokens: 2 } },
    ]
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class Anthropic {
        messages = {
          stream: vi.fn().mockReturnValue((async function* () { yield* streamEvents })()),
        }
      },
    }))

    const { streamObject } = await import('../llm/generate-object')
    const events = await collect(streamObject(MESSAGES, SCHEMA, {
      provider: 'anthropic',
      anthropicApiKey: 'key',
    }))

    const done = events.find((e) => e.type === 'done')
    expect(done).toBeDefined()
    expect(done?.type === 'done' && done.object).toEqual({})
  })
})

describe('StreamObjectEvent type export', () => {
  it('StreamObjectEvent is exported from @fabrk/ai llm barrel', async () => {
    // Type-level check — if this compiles without error, export exists
    const event: StreamObjectEvent<{ name: string }> = { type: 'delta', text: 'hello' }
    expect(event.type).toBe('delta')
  })

  it('done event shape is correct', () => {
    const event: StreamObjectEvent<{ name: string }> = {
      type: 'done',
      object: { name: 'test' },
      usage: { promptTokens: 10, completionTokens: 5 },
    }
    expect(event.type).toBe('done')
  })

  it('error event shape is correct', () => {
    const event: StreamObjectEvent = { type: 'error', message: 'oops' }
    expect(event.type).toBe('error')
  })
})
