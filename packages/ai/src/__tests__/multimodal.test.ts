import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LLMMessage, LLMToolSchema } from '../llm/tool-types'

const TOOLS: LLMToolSchema[] = []

// ── OpenAI content-part conversion ────────────────────────────────────────────

describe('openai-tools — multimodal content', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('string content passes through unchanged', async () => {
    let captured: unknown = null

    vi.doMock('openai', () => ({
      default: class {
        chat = {
          completions: {
            create: vi.fn().mockImplementation((req: unknown) => {
              captured = req
              return Promise.resolve({
                choices: [{ message: { content: 'ok', tool_calls: undefined } }],
                usage: { prompt_tokens: 5, completion_tokens: 3 },
              })
            }),
          },
        }
      },
    }))

    const { generateWithTools } = await import('../llm/openai-tools')
    const messages: LLMMessage[] = [{ role: 'user', content: 'Hello' }]
    await generateWithTools(messages, TOOLS, { openaiApiKey: 'test' })

    const req = captured as { messages: Array<{ content: unknown }> }
    expect(req.messages[0].content).toBe('Hello')
  })

  it('text+image array maps to OpenAI image_url format', async () => {
    let captured: unknown = null

    vi.doMock('openai', () => ({
      default: class {
        chat = {
          completions: {
            create: vi.fn().mockImplementation((req: unknown) => {
              captured = req
              return Promise.resolve({
                choices: [{ message: { content: 'described', tool_calls: undefined } }],
                usage: { prompt_tokens: 10, completion_tokens: 5 },
              })
            }),
          },
        }
      },
    }))

    const { generateWithTools } = await import('../llm/openai-tools')
    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is in this image?' },
          { type: 'image', url: 'https://example.com/photo.jpg' },
        ],
      },
    ]
    await generateWithTools(messages, TOOLS, { openaiApiKey: 'test' })

    const req = captured as { messages: Array<{ content: unknown }> }
    expect(Array.isArray(req.messages[0].content)).toBe(true)
    const parts = req.messages[0].content as Array<Record<string, unknown>>
    expect(parts[0]).toEqual({ type: 'text', text: 'What is in this image?' })
    expect(parts[1]).toEqual({ type: 'image_url', image_url: { url: 'https://example.com/photo.jpg' } })
  })

  it('base64 image builds correct data: URL', async () => {
    let captured: unknown = null

    vi.doMock('openai', () => ({
      default: class {
        chat = {
          completions: {
            create: vi.fn().mockImplementation((req: unknown) => {
              captured = req
              return Promise.resolve({
                choices: [{ message: { content: 'described', tool_calls: undefined } }],
                usage: { prompt_tokens: 10, completion_tokens: 5 },
              })
            }),
          },
        }
      },
    }))

    const { generateWithTools } = await import('../llm/openai-tools')
    const fakeBase64 = 'iVBORw0KGgo='
    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe' },
          { type: 'image', base64: fakeBase64, mimeType: 'image/jpeg' },
        ],
      },
    ]
    await generateWithTools(messages, TOOLS, { openaiApiKey: 'test' })

    const req = captured as { messages: Array<{ content: unknown }> }
    const parts = req.messages[0].content as Array<Record<string, unknown>>
    expect(parts[1]).toEqual({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${fakeBase64}` },
    })
  })

  it('base64 image defaults to image/jpeg when mimeType is omitted', async () => {
    let captured: unknown = null

    vi.doMock('openai', () => ({
      default: class {
        chat = {
          completions: {
            create: vi.fn().mockImplementation((req: unknown) => {
              captured = req
              return Promise.resolve({
                choices: [{ message: { content: 'ok', tool_calls: undefined } }],
                usage: { prompt_tokens: 5, completion_tokens: 2 },
              })
            }),
          },
        }
      },
    }))

    const { generateWithTools } = await import('../llm/openai-tools')
    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: [{ type: 'image', base64: 'abc123' }],
      },
    ]
    await generateWithTools(messages, TOOLS, { openaiApiKey: 'test' })

    const req = captured as { messages: Array<{ content: unknown }> }
    const parts = req.messages[0].content as Array<Record<string, unknown>>
    const imgPart = parts[0] as { image_url: { url: string } }
    expect(imgPart.image_url.url).toContain('data:image/jpeg;base64,')
  })
})

// ── Anthropic content-part conversion ─────────────────────────────────────────

describe('anthropic-tools — multimodal content', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  function makeAnthropicMock(captureRef: { value: unknown }) {
    return {
      default: class {
        messages = {
          create: vi.fn().mockImplementation((req: unknown) => {
            captureRef.value = req
            return Promise.resolve({
              content: [{ type: 'text', text: 'ok' }],
              usage: { input_tokens: 5, output_tokens: 3 },
            })
          }),
          stream: vi.fn().mockImplementation((req: unknown) => {
            captureRef.value = req
            return (async function* () {
              yield {
                type: 'message_start',
                message: { usage: { input_tokens: 5, output_tokens: 0 } },
              }
              yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'ok' } }
              yield { type: 'message_delta', usage: { output_tokens: 3 } }
            })()
          }),
        }
      },
    }
  }

  it('string content passes through unchanged', async () => {
    const captureRef = { value: null as unknown }
    vi.doMock('@anthropic-ai/sdk', () => makeAnthropicMock(captureRef))

    const { generateWithTools } = await import('../llm/anthropic-tools')
    const messages: LLMMessage[] = [{ role: 'user', content: 'Hello' }]
    await generateWithTools(messages, TOOLS, { anthropicApiKey: 'test' })

    const req = captureRef.value as { messages: Array<{ content: unknown }> }
    expect(req.messages[0].content).toBe('Hello')
  })

  it('image URL maps to Anthropic url source format', async () => {
    const captureRef = { value: null as unknown }
    vi.doMock('@anthropic-ai/sdk', () => makeAnthropicMock(captureRef))

    const { generateWithTools } = await import('../llm/anthropic-tools')
    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is this?' },
          { type: 'image', url: 'https://example.com/img.png' },
        ],
      },
    ]
    await generateWithTools(messages, TOOLS, { anthropicApiKey: 'test' })

    const req = captureRef.value as { messages: Array<{ content: unknown }> }
    const parts = req.messages[0].content as Array<Record<string, unknown>>
    expect(parts[0]).toEqual({ type: 'text', text: 'What is this?' })
    expect(parts[1]).toEqual({ type: 'image', source: { type: 'url', url: 'https://example.com/img.png' } })
  })

  it('base64 image maps to Anthropic base64 source format', async () => {
    const captureRef = { value: null as unknown }
    vi.doMock('@anthropic-ai/sdk', () => makeAnthropicMock(captureRef))

    const { generateWithTools } = await import('../llm/anthropic-tools')
    const fakeBase64 = 'iVBORw0KGgo='
    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'image', base64: fakeBase64, mimeType: 'image/png' },
        ],
      },
    ]
    await generateWithTools(messages, TOOLS, { anthropicApiKey: 'test' })

    const req = captureRef.value as { messages: Array<{ content: unknown }> }
    const parts = req.messages[0].content as Array<Record<string, unknown>>
    expect(parts[0]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: fakeBase64 },
    })
  })

  it('base64 image defaults to image/jpeg when mimeType omitted', async () => {
    const captureRef = { value: null as unknown }
    vi.doMock('@anthropic-ai/sdk', () => makeAnthropicMock(captureRef))

    const { generateWithTools } = await import('../llm/anthropic-tools')
    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: [{ type: 'image', base64: 'abc123' }],
      },
    ]
    await generateWithTools(messages, TOOLS, { anthropicApiKey: 'test' })

    const req = captureRef.value as { messages: Array<{ content: unknown }> }
    const parts = req.messages[0].content as Array<Record<string, unknown>>
    const src = (parts[0] as { source: { media_type: string } }).source
    expect(src.media_type).toBe('image/jpeg')
  })
})

// ── Google + Ollama graceful degradation ───────────────────────────────────────

describe('google-tools — multimodal graceful degradation', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('passes text parts through and warns for image parts', async () => {
    let capturedContents: unknown = null
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: class {
        getGenerativeModel() {
          return {
            generateContent: vi.fn().mockImplementation((req: unknown) => {
              capturedContents = (req as { contents: unknown }).contents
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
    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe' },
          { type: 'image', url: 'https://example.com/img.jpg' },
        ],
      },
    ]
    await generateWithTools(messages, TOOLS, { googleApiKey: 'test' })

    // Only the text part should be forwarded
    const contents = capturedContents as Array<{ parts: Array<{ text: string }> }>
    expect(contents[0].parts).toHaveLength(1)
    expect(contents[0].parts[0]).toEqual({ text: 'Describe' })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Image content parts are not supported'))

    warnSpy.mockRestore()
  })
})

describe('ollama-tools — multimodal graceful degradation', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('concatenates text parts and warns for image parts', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let capturedBody: unknown = null

    globalThis.fetch = vi.fn().mockImplementation((_url: string, opts: { body: string }) => {
      capturedBody = JSON.parse(opts.body)
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            message: { content: 'ok', tool_calls: undefined },
            prompt_eval_count: 5,
            eval_count: 3,
          }),
      })
    }) as unknown as typeof fetch

    const { generateWithTools } = await import('../llm/ollama-tools')
    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Hello ' },
          { type: 'image', url: 'https://example.com/img.jpg' },
          { type: 'text', text: 'world' },
        ],
      },
    ]
    await generateWithTools(messages, TOOLS)

    const body = capturedBody as { messages: Array<{ content: string }> }
    expect(body.messages[0].content).toBe('Hello world')
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Image content parts are not supported'))

    warnSpy.mockRestore()
  })
})
