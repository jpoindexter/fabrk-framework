import { describe, it, expect, vi, beforeEach } from 'vitest'

// All tests use vi.resetModules() + vi.doMock() + dynamic import so that env
// vars and SDK mocks are isolated per test.

describe('claude.isAvailable', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns true when ANTHROPIC_API_KEY is set', async () => {
    const orig = process.env.ANTHROPIC_API_KEY
    process.env.ANTHROPIC_API_KEY = 'test-key'
    try {
      const { claude } = await import('../integrations')
      expect(claude.isAvailable()).toBe(true)
    } finally {
      if (orig === undefined) delete process.env.ANTHROPIC_API_KEY
      else process.env.ANTHROPIC_API_KEY = orig
    }
  })

  it('returns false when ANTHROPIC_API_KEY is absent', async () => {
    const orig = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    try {
      const { claude } = await import('../integrations')
      expect(claude.isAvailable()).toBe(false)
    } finally {
      if (orig !== undefined) process.env.ANTHROPIC_API_KEY = orig
    }
  })
})

describe('openai.isAvailable', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns true when OPENAI_API_KEY is set', async () => {
    const orig = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'sk-test'
    try {
      const { openai } = await import('../integrations')
      expect(openai.isAvailable()).toBe(true)
    } finally {
      if (orig === undefined) delete process.env.OPENAI_API_KEY
      else process.env.OPENAI_API_KEY = orig
    }
  })
})

describe('claude.generate', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns success response with content and model', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class {
        messages = {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Generated text' }],
            usage: { input_tokens: 10, output_tokens: 20 },
            model: 'claude-sonnet-4-5-20250929',
            id: 'test',
            type: 'message',
            role: 'assistant',
            stop_reason: 'end_turn',
            stop_sequence: null,
          }),
        }
      },
    }))

    const { claude } = await import('../integrations')
    const result = await claude.generate({ prompt: 'Hello', feature: 'test' })

    expect(result.success).toBe(true)
    expect(result.data?.content).toBe('Generated text')
    expect(result.data?.model).toBe('claude-sonnet-4-5-20250929')
  })

  it('returns error response when SDK throws', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class {
        messages = {
          create: vi.fn().mockRejectedValue(new Error('connection refused')),
        }
      },
    }))

    const { claude } = await import('../integrations')
    const result = await claude.generate({ prompt: 'Hello', feature: 'test' })

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('CLAUDE_ERROR')
    expect(result.error?.message).toContain('connection refused')
  })

  it('scrubApiKeys — redacts sk- API keys in error messages', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class {
        messages = {
          create: vi.fn().mockRejectedValue(new Error('sk-abcdefghij1234567890 is invalid')),
        }
      },
    }))

    const { claude } = await import('../integrations')
    const result = await claude.generate({ prompt: 'Hello', feature: 'test' })

    expect(result.success).toBe(false)
    expect(result.error?.message).toContain('sk-***REDACTED***')
    expect(result.error?.message).not.toContain('sk-abcdefghij1234567890')
  })

  it('scrubApiKeys — redacts Bearer tokens in error messages', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class {
        messages = {
          create: vi.fn().mockRejectedValue(new Error('Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9XXXX rejected')),
        }
      },
    }))

    const { claude } = await import('../integrations')
    const result = await claude.generate({ prompt: 'Hello', feature: 'test' })

    expect(result.success).toBe(false)
    expect(result.error?.message).toContain('Bearer ***REDACTED***')
    expect(result.error?.message).not.toContain('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9XXXX')
  })

  it('scrubApiKeys — redacts re_ keys in error messages', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class {
        messages = {
          create: vi.fn().mockRejectedValue(new Error('re_abcdefghij1234 is not authorized')),
        }
      },
    }))

    const { claude } = await import('../integrations')
    const result = await claude.generate({ prompt: 'Hello', feature: 'test' })

    expect(result.success).toBe(false)
    expect(result.error?.message).toContain('re_***REDACTED***')
    expect(result.error?.message).not.toContain('re_abcdefghij1234')
  })
})

describe('openai.generate', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns success response with content and model', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    vi.doMock('openai', () => ({
      default: class {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: 'OpenAI response' } }],
              usage: { prompt_tokens: 5, completion_tokens: 10 },
            }),
          },
        }
        embeddings = {
          create: vi.fn().mockResolvedValue({
            data: [{ embedding: [0.1, 0.2, 0.3] }],
          }),
        }
      },
    }))

    const { openai } = await import('../integrations')
    const result = await openai.generate({ prompt: 'Hello', feature: 'test' })

    expect(result.success).toBe(true)
    expect(result.data?.content).toBe('OpenAI response')
    expect(result.data?.model).toBe('gpt-4o')
  })
})

describe('openai.embed', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns embeddings array on success', async () => {
    vi.doMock('openai', () => ({
      default: class {
        chat = {
          completions: {
            create: vi.fn(),
          },
        }
        embeddings = {
          create: vi.fn().mockResolvedValue({
            data: [{ embedding: [0.1, 0.2, 0.3] }],
          }),
        }
      },
    }))

    const { openai } = await import('../integrations')
    const result = await openai.embed('hello world')

    expect(result.success).toBe(true)
    expect(result.data).toEqual([[0.1, 0.2, 0.3]])
  })
})

describe('ai.generate', () => {
  beforeEach(() => { vi.resetModules() })

  it('uses claude when ANTHROPIC_API_KEY is set', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    const origOpenAI = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY

    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class {
        messages = {
          create: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Claude response' }],
            usage: { input_tokens: 5, output_tokens: 8 },
            model: 'claude-sonnet-4-5-20250929',
            id: 'test',
            type: 'message',
            role: 'assistant',
            stop_reason: 'end_turn',
            stop_sequence: null,
          }),
        }
      },
    }))

    try {
      const { ai } = await import('../integrations')
      const result = await ai.generate({ prompt: 'Hello', feature: 'test' })

      expect(result.success).toBe(true)
      expect(result.data?.content).toBe('Claude response')
    } finally {
      if (origOpenAI !== undefined) process.env.OPENAI_API_KEY = origOpenAI
    }
  })

  it('returns NO_AI_PROVIDER error when no keys configured', async () => {
    const origA = process.env.ANTHROPIC_API_KEY
    const origO = process.env.OPENAI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENAI_API_KEY

    try {
      const { ai } = await import('../integrations')
      const result = await ai.generate({ prompt: 'Hello', feature: 'test' })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('NO_AI_PROVIDER')
      expect(result.error?.message).toContain('No AI provider configured')
    } finally {
      if (origA !== undefined) process.env.ANTHROPIC_API_KEY = origA
      if (origO !== undefined) process.env.OPENAI_API_KEY = origO
    }
  })
})

describe('ai.getAvailableProviders', () => {
  beforeEach(() => { vi.resetModules() })

  it('returns empty array when no keys are set', async () => {
    const origA = process.env.ANTHROPIC_API_KEY
    const origO = process.env.OPENAI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENAI_API_KEY

    try {
      const { ai } = await import('../integrations')
      expect(ai.getAvailableProviders()).toEqual([])
    } finally {
      if (origA !== undefined) process.env.ANTHROPIC_API_KEY = origA
      if (origO !== undefined) process.env.OPENAI_API_KEY = origO
    }
  })

  it('returns both providers when both keys are set', async () => {
    const origA = process.env.ANTHROPIC_API_KEY
    const origO = process.env.OPENAI_API_KEY
    process.env.ANTHROPIC_API_KEY = 'test-anthropic'
    process.env.OPENAI_API_KEY = 'sk-test-openai'

    try {
      const { ai } = await import('../integrations')
      const providers = ai.getAvailableProviders()
      expect(providers).toContain('claude')
      expect(providers).toContain('openai')
      expect(providers).toHaveLength(2)
    } finally {
      if (origA === undefined) delete process.env.ANTHROPIC_API_KEY
      else process.env.ANTHROPIC_API_KEY = origA
      if (origO === undefined) delete process.env.OPENAI_API_KEY
      else process.env.OPENAI_API_KEY = origO
    }
  })
})
