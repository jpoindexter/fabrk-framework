import { describe, it, expect, vi, beforeEach } from 'vitest'
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

describe('google-tools — generateWithTools', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns text content when no function calls are made', async () => {
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: class {
        getGenerativeModel() {
          return {
            generateContent: vi.fn().mockResolvedValue({
              response: {
                candidates: [{ content: { parts: [{ text: 'It is sunny.' }] } }],
                usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
              },
            }),
          }
        }
      },
    }))

    const { generateWithTools } = await import('../llm/google-tools')
    const result = await generateWithTools(MESSAGES, [], { googleApiKey: 'test-key' })

    expect(result.content).toBe('It is sunny.')
    expect(result.toolCalls).toBeUndefined()
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 5 })
  })

  it('returns a function call as a tool call', async () => {
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: class {
        getGenerativeModel() {
          return {
            generateContent: vi.fn().mockResolvedValue({
              response: {
                candidates: [{
                  content: {
                    parts: [{ functionCall: { name: 'get_weather', args: { location: 'London' } } }],
                  },
                }],
                usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10 },
              },
            }),
          }
        }
      },
    }))

    const { generateWithTools } = await import('../llm/google-tools')
    const result = await generateWithTools(MESSAGES, [TOOL], { googleApiKey: 'test-key' })

    expect(result.content).toBeNull()
    expect(result.toolCalls).toHaveLength(1)
     
    expect(result.toolCalls![0]).toEqual({
      id: 'call_0',
      name: 'get_weather',
      arguments: { location: 'London' },
    })
    expect(result.usage).toEqual({ promptTokens: 20, completionTokens: 10 })
  })

  it('returns multiple function calls', async () => {
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: class {
        getGenerativeModel() {
          return {
            generateContent: vi.fn().mockResolvedValue({
              response: {
                candidates: [{
                  content: {
                    parts: [
                      { functionCall: { name: 'get_weather', args: { location: 'London' } } },
                      { functionCall: { name: 'get_weather', args: { location: 'Paris' } } },
                    ],
                  },
                }],
                usageMetadata: { promptTokenCount: 30, candidatesTokenCount: 15 },
              },
            }),
          }
        }
      },
    }))

    const { generateWithTools } = await import('../llm/google-tools')
    const result = await generateWithTools(MESSAGES, [TOOL], { googleApiKey: 'test-key' })

    expect(result.toolCalls).toHaveLength(2)
     
    expect(result.toolCalls![0].arguments).toEqual({ location: 'London' })
     
    expect(result.toolCalls![1].arguments).toEqual({ location: 'Paris' })
  })

  it('uses zero tokens when usageMetadata is missing', async () => {
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: class {
        getGenerativeModel() {
          return {
            generateContent: vi.fn().mockResolvedValue({
              response: {
                candidates: [{ content: { parts: [{ text: 'hi' }] } }],
                usageMetadata: undefined,
              },
            }),
          }
        }
      },
    }))

    const { generateWithTools } = await import('../llm/google-tools')
    const result = await generateWithTools(MESSAGES, [], { googleApiKey: 'test-key' })

    expect(result.usage).toEqual({ promptTokens: 0, completionTokens: 0 })
  })

  it('throws when @google/generative-ai is not installed', async () => {
    vi.doMock('@google/generative-ai', () => {
      throw new Error('Cannot find module @google/generative-ai')
    })

    const { generateWithTools } = await import('../llm/google-tools')
    await expect(
      generateWithTools(MESSAGES, [], { googleApiKey: 'test-key' })
    ).rejects.toThrow('@google/generative-ai not installed')
  })

  it('filters system messages into systemInstruction', async () => {
    let capturedRequest: unknown = null

    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: class {
        getGenerativeModel() {
          return {
            generateContent: vi.fn().mockImplementation((req: unknown) => {
              capturedRequest = req
              return Promise.resolve({
                response: {
                  candidates: [{ content: { parts: [{ text: 'ok' }] } }],
                  usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 },
                },
              })
            }),
          }
        }
      },
    }))

    const { generateWithTools } = await import('../llm/google-tools')
    const messagesWithSystem: LLMMessage[] = [
      { role: 'system', content: 'You are a weather assistant.' },
      { role: 'user', content: 'London weather?' },
    ]
    await generateWithTools(messagesWithSystem, [], { googleApiKey: 'test-key' })

    const req = capturedRequest as { systemInstruction: unknown; contents: unknown[] }
    expect(req.systemInstruction).toEqual({ parts: [{ text: 'You are a weather assistant.' }] })
    expect(req.contents).toHaveLength(1)
  })
})

describe('google-tools — message format translation', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('translates assistant messages to model role', async () => {
    let capturedRequest: unknown = null

    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: class {
        getGenerativeModel() {
          return {
            generateContent: vi.fn().mockImplementation((req: unknown) => {
              capturedRequest = req
              return Promise.resolve({
                response: {
                  candidates: [{ content: { parts: [{ text: 'ok' }] } }],
                  usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 },
                },
              })
            }),
          }
        }
      },
    }))

    const { generateWithTools } = await import('../llm/google-tools')
    const msgs: LLMMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
      { role: 'user', content: 'Weather?' },
    ]
    await generateWithTools(msgs, [], { googleApiKey: 'test-key' })

    const req = capturedRequest as { contents: Array<{ role: string }> }
    expect(req.contents[0].role).toBe('user')
    expect(req.contents[1].role).toBe('model')
    expect(req.contents[2].role).toBe('user')
  })

  it('translates tool result messages to functionResponse format', async () => {
    let capturedRequest: unknown = null

    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: class {
        getGenerativeModel() {
          return {
            generateContent: vi.fn().mockImplementation((req: unknown) => {
              capturedRequest = req
              return Promise.resolve({
                response: {
                  candidates: [{ content: { parts: [{ text: 'done' }] } }],
                  usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 },
                },
              })
            }),
          }
        }
      },
    }))

    const { generateWithTools } = await import('../llm/google-tools')
    const msgs: LLMMessage[] = [
      { role: 'user', content: 'Weather?' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [{ id: 'call_0', name: 'get_weather', arguments: { location: 'London' } }],
      },
      { role: 'tool', content: 'Sunny, 20C', toolCallId: 'get_weather' },
    ]
    await generateWithTools(msgs, [TOOL], { googleApiKey: 'test-key' })

     
    const req = capturedRequest as { contents: any[] }
    const toolMsg = req.contents[2]
    expect(toolMsg.role).toBe('function')
    expect(toolMsg.parts[0].functionResponse.name).toBe('get_weather')
    expect(toolMsg.parts[0].functionResponse.response.result).toBe('Sunny, 20C')
  })
})

describe('google-tools — streamWithTools', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  async function* fakeStream(chunks: unknown[]) {
    for (const chunk of chunks) yield chunk
  }

  it('yields text-delta events for streamed text', async () => {
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: class {
        getGenerativeModel() {
          return {
            generateContentStream: vi.fn().mockResolvedValue({
              stream: fakeStream([
                { candidates: [{ content: { parts: [{ text: 'Hello' }] } }] },
                { candidates: [{ content: { parts: [{ text: ' world' }] } }] },
                { candidates: [], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } },
              ]),
            }),
          }
        }
      },
    }))

    const { streamWithTools } = await import('../llm/google-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [], { googleApiKey: 'test-key' })) {
      events.push(e)
    }

    const textEvents = events.filter(e => e.type === 'text-delta')
    expect(textEvents).toHaveLength(2)
    expect(textEvents[0]).toEqual({ type: 'text-delta', content: 'Hello' })
    expect(textEvents[1]).toEqual({ type: 'text-delta', content: ' world' })
  })

  it('yields tool-call events for streamed function calls', async () => {
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: class {
        getGenerativeModel() {
          return {
            generateContentStream: vi.fn().mockResolvedValue({
              stream: fakeStream([
                {
                  candidates: [{
                    content: {
                      parts: [{ functionCall: { name: 'get_weather', args: { location: 'London' } } }],
                    },
                  }],
                },
                { candidates: [], usageMetadata: { promptTokenCount: 15, candidatesTokenCount: 8 } },
              ]),
            }),
          }
        }
      },
    }))

    const { streamWithTools } = await import('../llm/google-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [TOOL], { googleApiKey: 'test-key' })) {
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

  it('yields usage event from chunks', async () => {
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: class {
        getGenerativeModel() {
          return {
            generateContentStream: vi.fn().mockResolvedValue({
              stream: fakeStream([
                { candidates: [{ content: { parts: [{ text: 'done' }] } }] },
                { candidates: [], usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 4 } },
              ]),
            }),
          }
        }
      },
    }))

    const { streamWithTools } = await import('../llm/google-tools')
    const events = []
    for await (const e of streamWithTools(MESSAGES, [], { googleApiKey: 'test-key' })) {
      events.push(e)
    }

    const usageEvents = events.filter(e => e.type === 'usage')
    expect(usageEvents).toHaveLength(1)
    expect(usageEvents[0]).toEqual({ type: 'usage', promptTokens: 8, completionTokens: 4 })
  })

  it('throws when @google/generative-ai is not installed', async () => {
    vi.doMock('@google/generative-ai', () => {
      throw new Error('Cannot find module @google/generative-ai')
    })

    const { streamWithTools } = await import('../llm/google-tools')
    const gen = streamWithTools(MESSAGES, [], { googleApiKey: 'test-key' })
    await expect(gen.next()).rejects.toThrow('@google/generative-ai not installed')
  })
})
