import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { LLMMessage, LLMToolSchema } from '../llm/tool-types'

const TOOL: LLMToolSchema = {
  type: 'function',
  function: {
    name: 'get_weather',
    description: 'Get current weather',
    parameters: {
      type: 'object',
      properties: { location: { type: 'string' } },
      required: ['location'],
    },
  },
}

const MESSAGES: LLMMessage[] = [
  { role: 'user', content: 'What is the weather in London?' },
]

describe('ollama-tools — generateWithTools', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    vi.resetModules()
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns text content when no tool calls are made', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        message: { role: 'assistant', content: 'It is sunny.' },
        prompt_eval_count: 10,
        eval_count: 5,
      }),
    })

    const { generateWithTools } = await import('../llm/ollama-tools')
    const result = await generateWithTools(MESSAGES, [], {})

    expect(result.content).toBe('It is sunny.')
    expect(result.toolCalls).toBeUndefined()
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 5 })
  })

  it('returns a tool call from Ollama response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        message: {
          role: 'assistant',
          content: '',
          tool_calls: [{
            id: 'call_0',
            function: { name: 'get_weather', arguments: { location: 'London' } },
          }],
        },
        prompt_eval_count: 20,
        eval_count: 10,
      }),
    })

    const { generateWithTools } = await import('../llm/ollama-tools')
    const result = await generateWithTools(MESSAGES, [TOOL], {})

    expect(result.toolCalls).toHaveLength(1)
     
    expect(result.toolCalls![0]).toEqual({
      id: 'call_0',
      name: 'get_weather',
      arguments: { location: 'London' },
    })
    expect(result.usage).toEqual({ promptTokens: 20, completionTokens: 10 })
  })

  it('generates synthetic id when tool call has no id', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        message: {
          role: 'assistant',
          content: '',
          tool_calls: [{
            function: { name: 'get_weather', arguments: { location: 'Paris' } },
          }],
        },
        prompt_eval_count: 15,
        eval_count: 8,
      }),
    })

    const { generateWithTools } = await import('../llm/ollama-tools')
    const result = await generateWithTools(MESSAGES, [TOOL], {})

     
    expect(result.toolCalls![0].id).toBe('call_0')
     
    expect(result.toolCalls![0].name).toBe('get_weather')
  })

  it('throws on API error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const { generateWithTools } = await import('../llm/ollama-tools')
    await expect(
      generateWithTools(MESSAGES, [], {})
    ).rejects.toThrow('Ollama API error: 500')
  })

  it('uses zero tokens when usage counts are missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        message: { role: 'assistant', content: 'hi' },
      }),
    })

    const { generateWithTools } = await import('../llm/ollama-tools')
    const result = await generateWithTools(MESSAGES, [], {})

    expect(result.usage).toEqual({ promptTokens: 0, completionTokens: 0 })
  })

  it('sends tools in OpenAI-compatible format', async () => {
    let capturedBody: string = ''
    globalThis.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedBody = init.body as string
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          message: { role: 'assistant', content: 'ok' },
          prompt_eval_count: 5,
          eval_count: 3,
        }),
      })
    })

    const { generateWithTools } = await import('../llm/ollama-tools')
    await generateWithTools(MESSAGES, [TOOL], {})

    const parsed = JSON.parse(capturedBody)
    expect(parsed.tools).toHaveLength(1)
    expect(parsed.tools[0]).toEqual({
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get current weather',
        parameters: TOOL.function.parameters,
      },
    })
  })
})

describe('ollama-tools — streamWithTools', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    vi.resetModules()
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function createReadableStream(lines: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    const text = lines.join('\n') + '\n'
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text))
        controller.close()
      },
    })
  }

  it('yields text-delta events from streamed chunks', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createReadableStream([
        JSON.stringify({ message: { content: 'Hello' }, done: false }),
        JSON.stringify({ message: { content: ' world' }, done: false }),
        JSON.stringify({ done: true, prompt_eval_count: 10, eval_count: 5 }),
      ]),
    })

    const { streamWithTools } = await import('../llm/ollama-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [], {})) {
      events.push(e)
    }

    const textEvents = events.filter(e => e.type === 'text-delta')
    expect(textEvents).toHaveLength(2)
    expect(textEvents[0]).toEqual({ type: 'text-delta', content: 'Hello' })
    expect(textEvents[1]).toEqual({ type: 'text-delta', content: ' world' })
  })

  it('yields tool-call events from streamed tool calls', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createReadableStream([
        JSON.stringify({
          message: {
            content: '',
            tool_calls: [{
              id: 'call_0',
              function: { name: 'get_weather', arguments: { location: 'London' } },
            }],
          },
          done: false,
        }),
        JSON.stringify({ done: true, prompt_eval_count: 15, eval_count: 8 }),
      ]),
    })

    const { streamWithTools } = await import('../llm/ollama-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [TOOL], {})) {
      events.push(e)
    }

    const toolEvents = events.filter(e => e.type === 'tool-call')
    expect(toolEvents).toHaveLength(1)
    expect(toolEvents[0]).toEqual({
      type: 'tool-call',
      id: 'call_0',
      name: 'get_weather',
      arguments: { location: 'London' },
    })
  })

  it('yields usage event from final done chunk', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createReadableStream([
        JSON.stringify({ message: { content: 'done' }, done: false }),
        JSON.stringify({ done: true, prompt_eval_count: 8, eval_count: 4 }),
      ]),
    })

    const { streamWithTools } = await import('../llm/ollama-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [], {})) {
      events.push(e)
    }

    const usageEvents = events.filter(e => e.type === 'usage')
    expect(usageEvents).toHaveLength(1)
    expect(usageEvents[0]).toEqual({ type: 'usage', promptTokens: 8, completionTokens: 4 })
  })

  it('throws on API error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    })

    const { streamWithTools } = await import('../llm/ollama-tools')
    const gen = streamWithTools(MESSAGES, [], {})
    await expect(gen.next()).rejects.toThrow('Ollama API error: 503')
  })

  it('throws when response body is missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: null,
    })

    const { streamWithTools } = await import('../llm/ollama-tools')
    const gen = streamWithTools(MESSAGES, [], {})
    await expect(gen.next()).rejects.toThrow('No response body from Ollama')
  })
})
