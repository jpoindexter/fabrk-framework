import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LLMMessage, LLMToolSchema, GenerationOptions } from '../llm/tool-types'

const MESSAGES: LLMMessage[] = [{ role: 'user', content: 'Hello' }]

const TOOL: LLMToolSchema = {
  type: 'function',
  function: {
    name: 'myTool',
    description: 'A test tool',
    parameters: { type: 'object', properties: {} },
  },
}

// ── OpenAI ────────────────────────────────────────────────────────────────────

describe('openai-tools — GenerationOptions', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  function makeOpenAIMock(capture: { req: unknown }) {
    return {
      default: class {
        chat = {
          completions: {
            create: vi.fn().mockImplementation((req: unknown) => {
              capture.req = req
              return Promise.resolve({
                choices: [{ message: { content: 'ok', tool_calls: undefined } }],
                usage: { prompt_tokens: 5, completion_tokens: 3 },
              })
            }),
          },
        }
      },
    }
  }

  it('toolChoice "none" sets tool_choice: "none" on OpenAI', async () => {
    const capture: { req: unknown } = { req: null }
    vi.doMock('openai', () => makeOpenAIMock(capture))

    const { generateWithTools } = await import('../llm/openai-tools')
    const opts: GenerationOptions = { toolChoice: 'none' }
    await generateWithTools(MESSAGES, [TOOL], { openaiApiKey: 'test' }, opts)

    const req = capture.req as Record<string, unknown>
    expect(req.tool_choice).toBe('none')
  })

  it('toolChoice "required" sets tool_choice: "required" on OpenAI', async () => {
    const capture: { req: unknown } = { req: null }
    vi.doMock('openai', () => makeOpenAIMock(capture))

    const { generateWithTools } = await import('../llm/openai-tools')
    const opts: GenerationOptions = { toolChoice: 'required' }
    await generateWithTools(MESSAGES, [TOOL], { openaiApiKey: 'test' }, opts)

    const req = capture.req as Record<string, unknown>
    expect(req.tool_choice).toBe('required')
  })

  it('toolChoice "auto" sets tool_choice: "auto" on OpenAI', async () => {
    const capture: { req: unknown } = { req: null }
    vi.doMock('openai', () => makeOpenAIMock(capture))

    const { generateWithTools } = await import('../llm/openai-tools')
    const opts: GenerationOptions = { toolChoice: 'auto' }
    await generateWithTools(MESSAGES, [TOOL], { openaiApiKey: 'test' }, opts)

    const req = capture.req as Record<string, unknown>
    expect(req.tool_choice).toBe('auto')
  })

  it('toolChoice {type:"tool",toolName:"myTool"} maps to OpenAI function format', async () => {
    const capture: { req: unknown } = { req: null }
    vi.doMock('openai', () => makeOpenAIMock(capture))

    const { generateWithTools } = await import('../llm/openai-tools')
    const opts: GenerationOptions = { toolChoice: { type: 'tool', toolName: 'myTool' } }
    await generateWithTools(MESSAGES, [TOOL], { openaiApiKey: 'test' }, opts)

    const req = capture.req as Record<string, unknown>
    expect(req.tool_choice).toEqual({ type: 'function', function: { name: 'myTool' } })
  })

  it('toolChoice is omitted when no tools are passed', async () => {
    const capture: { req: unknown } = { req: null }
    vi.doMock('openai', () => makeOpenAIMock(capture))

    const { generateWithTools } = await import('../llm/openai-tools')
    const opts: GenerationOptions = { toolChoice: 'required' }
    await generateWithTools(MESSAGES, [], { openaiApiKey: 'test' }, opts)

    const req = capture.req as Record<string, unknown>
    expect(req.tool_choice).toBeUndefined()
  })

  it('topP: 0.9 is forwarded to OpenAI as top_p', async () => {
    const capture: { req: unknown } = { req: null }
    vi.doMock('openai', () => makeOpenAIMock(capture))

    const { generateWithTools } = await import('../llm/openai-tools')
    const opts: GenerationOptions = { topP: 0.9 }
    await generateWithTools(MESSAGES, [], { openaiApiKey: 'test' }, opts)

    const req = capture.req as Record<string, unknown>
    expect(req.top_p).toBe(0.9)
  })

  it('stop: ["END"] is forwarded to OpenAI', async () => {
    const capture: { req: unknown } = { req: null }
    vi.doMock('openai', () => makeOpenAIMock(capture))

    const { generateWithTools } = await import('../llm/openai-tools')
    const opts: GenerationOptions = { stop: ['END'] }
    await generateWithTools(MESSAGES, [], { openaiApiKey: 'test' }, opts)

    const req = capture.req as Record<string, unknown>
    expect(req.stop).toEqual(['END'])
  })

  it('opts omitted — top_p and stop are absent from request', async () => {
    const capture: { req: unknown } = { req: null }
    vi.doMock('openai', () => makeOpenAIMock(capture))

    const { generateWithTools } = await import('../llm/openai-tools')
    await generateWithTools(MESSAGES, [], { openaiApiKey: 'test' })

    const req = capture.req as Record<string, unknown>
    expect(req.top_p).toBeUndefined()
    expect(req.stop).toBeUndefined()
  })

  it('providerBaseUrl is forwarded as baseURL to the OpenAI client constructor', async () => {
    const captureCtorArgs: unknown[] = []
    vi.doMock('openai', () => ({
      default: class {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: 'ok', tool_calls: undefined } }],
              usage: { prompt_tokens: 5, completion_tokens: 3 },
            }),
          },
        }
        constructor(...args: unknown[]) { captureCtorArgs.push(args[0]) }
      },
    }))

    const { generateWithTools } = await import('../llm/openai-tools')
    await generateWithTools(MESSAGES, [], {
      openaiApiKey: 'test-key',
      providerBaseUrl: 'https://api.groq.com/openai/v1',
    })

    const ctorArg = captureCtorArgs[0] as Record<string, unknown>
    expect(ctorArg.baseURL).toBe('https://api.groq.com/openai/v1')
  })

  it('providerBaseUrl absent — no baseURL in OpenAI client constructor', async () => {
    const captureCtorArgs: unknown[] = []
    vi.doMock('openai', () => ({
      default: class {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: 'ok', tool_calls: undefined } }],
              usage: { prompt_tokens: 5, completion_tokens: 3 },
            }),
          },
        }
        constructor(...args: unknown[]) { captureCtorArgs.push(args[0]) }
      },
    }))

    const { generateWithTools } = await import('../llm/openai-tools')
    await generateWithTools(MESSAGES, [], { openaiApiKey: 'test-key' })

    const ctorArg = captureCtorArgs[0] as Record<string, unknown>
    expect(ctorArg.baseURL).toBeUndefined()
  })
})

// ── Anthropic ────────────────────────────────────────────────────────────────

describe('anthropic-tools — GenerationOptions', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  function makeAnthropicMock(capture: { req: unknown }) {
    return {
      default: class {
        messages = {
          create: vi.fn().mockImplementation((req: unknown) => {
            capture.req = req
            return Promise.resolve({
              content: [{ type: 'text', text: 'ok' }],
              usage: { input_tokens: 5, output_tokens: 3 },
            })
          }),
        }
      },
    }
  }

  it('toolChoice "required" maps to Anthropic {type:"any"}', async () => {
    const capture: { req: unknown } = { req: null }
    vi.doMock('@anthropic-ai/sdk', () => makeAnthropicMock(capture))

    const { generateWithTools } = await import('../llm/anthropic-tools')
    const opts: GenerationOptions = { toolChoice: 'required' }
    await generateWithTools(MESSAGES, [TOOL], { anthropicApiKey: 'test' }, opts)

    const req = capture.req as Record<string, unknown>
    expect(req.tool_choice).toEqual({ type: 'any' })
  })

  it('toolChoice "auto" maps to Anthropic {type:"auto"}', async () => {
    const capture: { req: unknown } = { req: null }
    vi.doMock('@anthropic-ai/sdk', () => makeAnthropicMock(capture))

    const { generateWithTools } = await import('../llm/anthropic-tools')
    const opts: GenerationOptions = { toolChoice: 'auto' }
    await generateWithTools(MESSAGES, [TOOL], { anthropicApiKey: 'test' }, opts)

    const req = capture.req as Record<string, unknown>
    expect(req.tool_choice).toEqual({ type: 'auto' })
  })

  it('toolChoice {type:"tool",toolName:"myTool"} maps to Anthropic {type:"tool",name:"myTool"}', async () => {
    const capture: { req: unknown } = { req: null }
    vi.doMock('@anthropic-ai/sdk', () => makeAnthropicMock(capture))

    const { generateWithTools } = await import('../llm/anthropic-tools')
    const opts: GenerationOptions = { toolChoice: { type: 'tool', toolName: 'myTool' } }
    await generateWithTools(MESSAGES, [TOOL], { anthropicApiKey: 'test' }, opts)

    const req = capture.req as Record<string, unknown>
    expect(req.tool_choice).toEqual({ type: 'tool', name: 'myTool' })
  })

  it('toolChoice "none" removes tools from Anthropic request', async () => {
    const capture: { req: unknown } = { req: null }
    vi.doMock('@anthropic-ai/sdk', () => makeAnthropicMock(capture))

    const { generateWithTools } = await import('../llm/anthropic-tools')
    const opts: GenerationOptions = { toolChoice: 'none' }
    await generateWithTools(MESSAGES, [TOOL], { anthropicApiKey: 'test' }, opts)

    const req = capture.req as Record<string, unknown>
    expect(req.tools).toBeUndefined()
    expect(req.tool_choice).toBeUndefined()
  })

  it('stop string is wrapped into stop_sequences array for Anthropic', async () => {
    const capture: { req: unknown } = { req: null }
    vi.doMock('@anthropic-ai/sdk', () => makeAnthropicMock(capture))

    const { generateWithTools } = await import('../llm/anthropic-tools')
    const opts: GenerationOptions = { stop: 'END' }
    await generateWithTools(MESSAGES, [], { anthropicApiKey: 'test' }, opts)

    const req = capture.req as Record<string, unknown>
    expect(req.stop_sequences).toEqual(['END'])
  })

  it('stop array passes through as stop_sequences for Anthropic', async () => {
    const capture: { req: unknown } = { req: null }
    vi.doMock('@anthropic-ai/sdk', () => makeAnthropicMock(capture))

    const { generateWithTools } = await import('../llm/anthropic-tools')
    const opts: GenerationOptions = { stop: ['STOP', 'END'] }
    await generateWithTools(MESSAGES, [], { anthropicApiKey: 'test' }, opts)

    const req = capture.req as Record<string, unknown>
    expect(req.stop_sequences).toEqual(['STOP', 'END'])
  })

  it('topP is forwarded as top_p to Anthropic', async () => {
    const capture: { req: unknown } = { req: null }
    vi.doMock('@anthropic-ai/sdk', () => makeAnthropicMock(capture))

    const { generateWithTools } = await import('../llm/anthropic-tools')
    const opts: GenerationOptions = { topP: 0.8 }
    await generateWithTools(MESSAGES, [], { anthropicApiKey: 'test' }, opts)

    const req = capture.req as Record<string, unknown>
    expect(req.top_p).toBe(0.8)
  })
})

// ── Type export check ─────────────────────────────────────────────────────────

describe('GenerationOptions — type export', () => {
  it('GenerationOptions and ToolChoiceValue are exported from @fabrk/ai llm module', async () => {
    // If these types are not exported, TypeScript will fail at build time.
    // This runtime check verifies the module loads without error.
    const mod = await import('../llm/tool-types')
    // The module itself is the type definition file; just confirm it can be imported.
    expect(mod).toBeDefined()
  })
})
