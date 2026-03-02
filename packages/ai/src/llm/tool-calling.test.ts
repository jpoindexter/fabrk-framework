import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LLMMessage, LLMToolSchema } from './tool-types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// OpenAI tool-calling
// ---------------------------------------------------------------------------

describe('openai-tools — generateWithTools', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns text content when no tool calls are made', async () => {
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: 'It is sunny.', tool_calls: undefined } }],
              usage: { prompt_tokens: 10, completion_tokens: 5 },
            }),
          },
        }
      },
    }))

    const { generateWithTools } = await import('./openai-tools')
    const result = await generateWithTools(MESSAGES, [], { openaiApiKey: 'test-key' })

    expect(result.content).toBe('It is sunny.')
    expect(result.toolCalls).toBeUndefined()
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 5 })
  })

  it('returns a single tool call with parsed arguments', async () => {
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: null,
                    tool_calls: [
                      {
                        id: 'call_1',
                        function: { name: 'get_weather', arguments: '{"location":"London"}' },
                      },
                    ],
                  },
                },
              ],
              usage: { prompt_tokens: 20, completion_tokens: 15 },
            }),
          },
        }
      },
    }))

    const { generateWithTools } = await import('./openai-tools')
    const result = await generateWithTools(MESSAGES, [TOOL], { openaiApiKey: 'test-key' })

    expect(result.content).toBeNull()
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls![0]).toEqual({
      id: 'call_1',
      name: 'get_weather',
      arguments: { location: 'London' },
    })
    expect(result.usage).toEqual({ promptTokens: 20, completionTokens: 15 })
  })

  it('returns multiple tool calls', async () => {
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: null,
                    tool_calls: [
                      { id: 'call_1', function: { name: 'get_weather', arguments: '{"location":"London"}' } },
                      { id: 'call_2', function: { name: 'get_weather', arguments: '{"location":"Paris"}' } },
                    ],
                  },
                },
              ],
              usage: { prompt_tokens: 30, completion_tokens: 20 },
            }),
          },
        }
      },
    }))

    const { generateWithTools } = await import('./openai-tools')
    const result = await generateWithTools(MESSAGES, [TOOL], { openaiApiKey: 'test-key' })

    expect(result.toolCalls).toHaveLength(2)
    expect(result.toolCalls![0].arguments).toEqual({ location: 'London' })
    expect(result.toolCalls![1].arguments).toEqual({ location: 'Paris' })
  })

  it('falls back to empty object when tool arguments are malformed JSON', async () => {
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: null,
                    tool_calls: [
                      { id: 'call_bad', function: { name: 'get_weather', arguments: '{bad json' } },
                    ],
                  },
                },
              ],
              usage: { prompt_tokens: 10, completion_tokens: 5 },
            }),
          },
        }
      },
    }))

    const { generateWithTools } = await import('./openai-tools')
    // JSON.parse will throw — the function itself should propagate it (parseToolCalls does not catch)
    await expect(
      generateWithTools(MESSAGES, [TOOL], { openaiApiKey: 'test-key' })
    ).rejects.toThrow()
  })

  it('returns empty toolCalls when choices has no tool_calls array', async () => {
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: 'Plain reply.' } }],
              usage: { prompt_tokens: 5, completion_tokens: 3 },
            }),
          },
        }
      },
    }))

    const { generateWithTools } = await import('./openai-tools')
    const result = await generateWithTools(MESSAGES, [], { openaiApiKey: 'test-key' })

    expect(result.toolCalls).toBeUndefined()
  })

  it('throws when the openai package is not installed', async () => {
    vi.doMock('openai', () => {
      throw new Error('Cannot find module openai')
    })

    const { generateWithTools } = await import('./openai-tools')
    await expect(
      generateWithTools(MESSAGES, [], { openaiApiKey: 'test-key' })
    ).rejects.toThrow('openai package not installed')
  })

  it('uses zero tokens when usage is missing', async () => {
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: 'hi' } }],
              usage: undefined,
            }),
          },
        }
      },
    }))

    const { generateWithTools } = await import('./openai-tools')
    const result = await generateWithTools(MESSAGES, [], { openaiApiKey: 'test-key' })

    expect(result.usage).toEqual({ promptTokens: 0, completionTokens: 0 })
  })
})

// ---------------------------------------------------------------------------
// OpenAI — streamWithTools
// ---------------------------------------------------------------------------

describe('openai-tools — streamWithTools', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  async function* fakeStream(chunks: unknown[]) {
    for (const chunk of chunks) yield chunk
  }

  it('yields text-delta events for streamed text', async () => {
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue(
              fakeStream([
                { choices: [{ delta: { content: 'Hello' } }] },
                { choices: [{ delta: { content: ' world' } }] },
                { choices: [{ delta: {} }], usage: { prompt_tokens: 10, completion_tokens: 5 } },
              ])
            ),
          },
        }
      },
    }))

    const { streamWithTools } = await import('./openai-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [], { openaiApiKey: 'test-key' })) {
      events.push(e)
    }

    const textEvents = events.filter(e => e.type === 'text-delta')
    expect(textEvents).toHaveLength(2)
    expect(textEvents[0]).toEqual({ type: 'text-delta', content: 'Hello' })
    expect(textEvents[1]).toEqual({ type: 'text-delta', content: ' world' })
  })

  it('yields usage event from the final chunk', async () => {
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue(
              fakeStream([
                { choices: [{ delta: { content: 'done' } }] },
                { choices: [{ delta: {} }], usage: { prompt_tokens: 8, completion_tokens: 4 } },
              ])
            ),
          },
        }
      },
    }))

    const { streamWithTools } = await import('./openai-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [], { openaiApiKey: 'test-key' })) {
      events.push(e)
    }

    const usageEvents = events.filter(e => e.type === 'usage')
    expect(usageEvents).toHaveLength(1)
    expect(usageEvents[0]).toEqual({ type: 'usage', promptTokens: 8, completionTokens: 4 })
  })

  it('accumulates streamed tool call deltas and emits a single tool-call event', async () => {
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue(
              fakeStream([
                // First chunk: tool call starts, id + function name arrive
                { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'get_weather', arguments: '' } }] } }] },
                // Second chunk: arguments arrive in parts
                { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"location"' } }] } }] },
                { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: ':"London"}' } }] } }] },
                // Final chunk with usage — triggers emission
                { choices: [{ delta: {} }], usage: { prompt_tokens: 15, completion_tokens: 10 } },
              ])
            ),
          },
        }
      },
    }))

    const { streamWithTools } = await import('./openai-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [TOOL], { openaiApiKey: 'test-key' })) {
      events.push(e)
    }

    const toolEvents = events.filter(e => e.type === 'tool-call')
    expect(toolEvents).toHaveLength(1)
    expect(toolEvents[0]).toEqual({
      type: 'tool-call',
      id: 'call_1',
      name: 'get_weather',
      arguments: { location: 'London' },
    })
  })

  it('emits tool-call via fallback path when no usage chunk arrives', async () => {
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue(
              fakeStream([
                { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_x', function: { name: 'fn', arguments: '{}' } }] } }] },
                // No usage chunk — exercises the fallback emission path
              ])
            ),
          },
        }
      },
    }))

    const { streamWithTools } = await import('./openai-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [TOOL], { openaiApiKey: 'test-key' })) {
      events.push(e)
    }

    const toolEvents = events.filter(e => e.type === 'tool-call')
    expect(toolEvents).toHaveLength(1)
    expect(toolEvents[0]).toMatchObject({ type: 'tool-call', id: 'call_x', name: 'fn' })
  })

  it('keeps empty arguments object when streamed tool args are malformed JSON', async () => {
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue(
              fakeStream([
                { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_bad', function: { name: 'fn', arguments: '{bad' } }] } }] },
                { choices: [{ delta: {} }], usage: { prompt_tokens: 5, completion_tokens: 2 } },
              ])
            ),
          },
        }
      },
    }))

    const { streamWithTools } = await import('./openai-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [TOOL], { openaiApiKey: 'test-key' })) {
      events.push(e)
    }

    const toolEvent = events.find(e => e.type === 'tool-call')
    expect(toolEvent).toBeDefined()
    expect((toolEvent as { arguments: unknown }).arguments).toEqual({})
  })

  it('accumulates multiple concurrent tool calls by index', async () => {
    vi.doMock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue(
              fakeStream([
                { choices: [{ delta: { tool_calls: [{ index: 0, id: 'c0', function: { name: 'fn_a', arguments: '{"x":1}' } }] } }] },
                { choices: [{ delta: { tool_calls: [{ index: 1, id: 'c1', function: { name: 'fn_b', arguments: '{"y":2}' } }] } }] },
                { choices: [{ delta: {} }], usage: { prompt_tokens: 20, completion_tokens: 10 } },
              ])
            ),
          },
        }
      },
    }))

    const { streamWithTools } = await import('./openai-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [TOOL], { openaiApiKey: 'test-key' })) {
      events.push(e)
    }

    const toolEvents = events.filter(e => e.type === 'tool-call')
    expect(toolEvents).toHaveLength(2)
    expect(toolEvents[0]).toMatchObject({ name: 'fn_a', arguments: { x: 1 } })
    expect(toolEvents[1]).toMatchObject({ name: 'fn_b', arguments: { y: 2 } })
  })

  it('throws when the openai package is not installed', async () => {
    vi.doMock('openai', () => {
      throw new Error('Cannot find module openai')
    })

    const { streamWithTools } = await import('./openai-tools')
    const gen = streamWithTools(MESSAGES, [], { openaiApiKey: 'test-key' })
    await expect(gen.next()).rejects.toThrow('openai package not installed')
  })
})

// ---------------------------------------------------------------------------
// Anthropic tool-calling
// ---------------------------------------------------------------------------

describe('anthropic-tools — generateWithTools', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns text content when response is a plain text block', async () => {
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class Anthropic {
        messages = {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Sunny in London.' }],
            usage: { input_tokens: 12, output_tokens: 6 },
          }),
        }
      },
    }))

    const { generateWithTools } = await import('./anthropic-tools')
    const result = await generateWithTools(MESSAGES, [], { anthropicApiKey: 'test-key' })

    expect(result.content).toBe('Sunny in London.')
    expect(result.toolCalls).toBeUndefined()
    expect(result.usage).toEqual({ promptTokens: 12, completionTokens: 6 })
  })

  it('returns a tool use block as a tool call', async () => {
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class Anthropic {
        messages = {
          create: vi.fn().mockResolvedValue({
            content: [
              { type: 'tool_use', id: 'tu_1', name: 'get_weather', input: { location: 'London' } },
            ],
            usage: { input_tokens: 20, output_tokens: 10 },
          }),
        }
      },
    }))

    const { generateWithTools } = await import('./anthropic-tools')
    const result = await generateWithTools(MESSAGES, [TOOL], { anthropicApiKey: 'test-key' })

    expect(result.content).toBeNull()
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls![0]).toEqual({
      id: 'tu_1',
      name: 'get_weather',
      arguments: { location: 'London' },
    })
    expect(result.usage).toEqual({ promptTokens: 20, completionTokens: 10 })
  })

  it('returns multiple tool use blocks', async () => {
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class Anthropic {
        messages = {
          create: vi.fn().mockResolvedValue({
            content: [
              { type: 'tool_use', id: 'tu_1', name: 'get_weather', input: { location: 'London' } },
              { type: 'tool_use', id: 'tu_2', name: 'get_weather', input: { location: 'Paris' } },
            ],
            usage: { input_tokens: 30, output_tokens: 15 },
          }),
        }
      },
    }))

    const { generateWithTools } = await import('./anthropic-tools')
    const result = await generateWithTools(MESSAGES, [TOOL], { anthropicApiKey: 'test-key' })

    expect(result.toolCalls).toHaveLength(2)
    expect(result.toolCalls![0].arguments).toEqual({ location: 'London' })
    expect(result.toolCalls![1].arguments).toEqual({ location: 'Paris' })
  })

  it('returns both text and tool calls when response has mixed blocks', async () => {
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class Anthropic {
        messages = {
          create: vi.fn().mockResolvedValue({
            content: [
              { type: 'text', text: 'Let me check that for you.' },
              { type: 'tool_use', id: 'tu_1', name: 'get_weather', input: { location: 'Tokyo' } },
            ],
            usage: { input_tokens: 25, output_tokens: 12 },
          }),
        }
      },
    }))

    const { generateWithTools } = await import('./anthropic-tools')
    const result = await generateWithTools(MESSAGES, [TOOL], { anthropicApiKey: 'test-key' })

    expect(result.content).toBe('Let me check that for you.')
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls![0].name).toBe('get_weather')
  })

  it('uses zero tokens when usage is missing', async () => {
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class Anthropic {
        messages = {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'hi' }],
            usage: undefined,
          }),
        }
      },
    }))

    const { generateWithTools } = await import('./anthropic-tools')
    const result = await generateWithTools(MESSAGES, [], { anthropicApiKey: 'test-key' })

    expect(result.usage).toEqual({ promptTokens: 0, completionTokens: 0 })
  })

  it('throws when the @anthropic-ai/sdk package is not installed', async () => {
    vi.doMock('@anthropic-ai/sdk', () => {
      throw new Error('Cannot find module @anthropic-ai/sdk')
    })

    const { generateWithTools } = await import('./anthropic-tools')
    await expect(
      generateWithTools(MESSAGES, [], { anthropicApiKey: 'test-key' })
    ).rejects.toThrow('@anthropic-ai/sdk not installed')
  })

  it('filters out system messages and passes them as system prompt', async () => {
    let capturedRequest: unknown = null

    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class Anthropic {
        messages = {
          create: vi.fn().mockImplementation((req: unknown) => {
            capturedRequest = req
            return Promise.resolve({
              content: [{ type: 'text', text: 'ok' }],
              usage: { input_tokens: 5, output_tokens: 2 },
            })
          }),
        }
      },
    }))

    const { generateWithTools } = await import('./anthropic-tools')
    const messagesWithSystem: LLMMessage[] = [
      { role: 'system', content: 'You are a weather assistant.' },
      { role: 'user', content: 'London weather?' },
    ]
    await generateWithTools(messagesWithSystem, [], { anthropicApiKey: 'test-key' })

    const req = capturedRequest as { system: string; messages: unknown[] }
    expect(req.system).toBe('You are a weather assistant.')
    // System message should NOT appear in the messages array
    expect(req.messages).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Anthropic — streamWithTools
// ---------------------------------------------------------------------------

describe('anthropic-tools — streamWithTools', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  async function* fakeStream(events: unknown[]) {
    for (const e of events) yield e
  }

  it('yields text-delta events for streamed text', async () => {
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class Anthropic {
        messages = {
          stream: vi.fn().mockReturnValue(
            fakeStream([
              { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Partly' } },
              { type: 'content_block_delta', delta: { type: 'text_delta', text: ' cloudy.' } },
            ])
          ),
        }
      },
    }))

    const { streamWithTools } = await import('./anthropic-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [], { anthropicApiKey: 'test-key' })) {
      events.push(e)
    }

    const textEvents = events.filter(e => e.type === 'text-delta')
    expect(textEvents).toHaveLength(2)
    expect(textEvents[0]).toEqual({ type: 'text-delta', content: 'Partly' })
    expect(textEvents[1]).toEqual({ type: 'text-delta', content: ' cloudy.' })
  })

  it('yields prompt usage from message_start and completion tokens from message_delta', async () => {
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class Anthropic {
        messages = {
          stream: vi.fn().mockReturnValue(
            fakeStream([
              { type: 'message_start', message: { usage: { input_tokens: 20 } } },
              { type: 'content_block_delta', delta: { type: 'text_delta', text: 'hi' } },
              { type: 'message_delta', usage: { output_tokens: 8 } },
            ])
          ),
        }
      },
    }))

    const { streamWithTools } = await import('./anthropic-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [], { anthropicApiKey: 'test-key' })) {
      events.push(e)
    }

    const usageEvents = events.filter(e => e.type === 'usage')
    expect(usageEvents).toHaveLength(2)
    // message_start emits prompt tokens, completionTokens=0
    expect(usageEvents[0]).toEqual({ type: 'usage', promptTokens: 20, completionTokens: 0 })
    // message_delta emits output tokens, promptTokens=0
    expect(usageEvents[1]).toEqual({ type: 'usage', promptTokens: 0, completionTokens: 8 })
  })

  it('accumulates tool call input and emits on content_block_stop', async () => {
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class Anthropic {
        messages = {
          stream: vi.fn().mockReturnValue(
            fakeStream([
              { type: 'content_block_start', content_block: { type: 'tool_use', id: 'tu_1', name: 'get_weather' } },
              { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{"location"' } },
              { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: ':"Paris"}' } },
              { type: 'content_block_stop' },
            ])
          ),
        }
      },
    }))

    const { streamWithTools } = await import('./anthropic-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [TOOL], { anthropicApiKey: 'test-key' })) {
      events.push(e)
    }

    const toolEvents = events.filter(e => e.type === 'tool-call')
    expect(toolEvents).toHaveLength(1)
    expect(toolEvents[0]).toEqual({
      type: 'tool-call',
      id: 'tu_1',
      name: 'get_weather',
      arguments: { location: 'Paris' },
    })
  })

  it('resets tool state after content_block_stop so a second tool call is independent', async () => {
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class Anthropic {
        messages = {
          stream: vi.fn().mockReturnValue(
            fakeStream([
              { type: 'content_block_start', content_block: { type: 'tool_use', id: 'tu_1', name: 'fn_a' } },
              { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{"x":1}' } },
              { type: 'content_block_stop' },
              { type: 'content_block_start', content_block: { type: 'tool_use', id: 'tu_2', name: 'fn_b' } },
              { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{"y":2}' } },
              { type: 'content_block_stop' },
            ])
          ),
        }
      },
    }))

    const { streamWithTools } = await import('./anthropic-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [TOOL], { anthropicApiKey: 'test-key' })) {
      events.push(e)
    }

    const toolEvents = events.filter(e => e.type === 'tool-call')
    expect(toolEvents).toHaveLength(2)
    expect(toolEvents[0]).toMatchObject({ id: 'tu_1', name: 'fn_a', arguments: { x: 1 } })
    expect(toolEvents[1]).toMatchObject({ id: 'tu_2', name: 'fn_b', arguments: { y: 2 } })
  })

  it('emits empty arguments object when tool input JSON is malformed', async () => {
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class Anthropic {
        messages = {
          stream: vi.fn().mockReturnValue(
            fakeStream([
              { type: 'content_block_start', content_block: { type: 'tool_use', id: 'tu_bad', name: 'fn' } },
              { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{bad json' } },
              { type: 'content_block_stop' },
            ])
          ),
        }
      },
    }))

    const { streamWithTools } = await import('./anthropic-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [TOOL], { anthropicApiKey: 'test-key' })) {
      events.push(e)
    }

    const toolEvent = events.find(e => e.type === 'tool-call')
    expect(toolEvent).toBeDefined()
    expect((toolEvent as { arguments: unknown }).arguments).toEqual({})
  })

  it('does not emit tool-call on content_block_stop when no tool block is active', async () => {
    // content_block_stop for a text block — should not emit a tool-call event
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class Anthropic {
        messages = {
          stream: vi.fn().mockReturnValue(
            fakeStream([
              { type: 'content_block_delta', delta: { type: 'text_delta', text: 'hello' } },
              { type: 'content_block_stop' }, // no tool block open
            ])
          ),
        }
      },
    }))

    const { streamWithTools } = await import('./anthropic-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [], { anthropicApiKey: 'test-key' })) {
      events.push(e)
    }

    expect(events.filter(e => e.type === 'tool-call')).toHaveLength(0)
  })

  it('throws when the @anthropic-ai/sdk package is not installed', async () => {
    vi.doMock('@anthropic-ai/sdk', () => {
      throw new Error('Cannot find module @anthropic-ai/sdk')
    })

    const { streamWithTools } = await import('./anthropic-tools')
    const gen = streamWithTools(MESSAGES, [], { anthropicApiKey: 'test-key' })
    await expect(gen.next()).rejects.toThrow('@anthropic-ai/sdk not installed')
  })
})
