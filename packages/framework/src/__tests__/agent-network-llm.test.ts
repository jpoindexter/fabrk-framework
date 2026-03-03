import { describe, it, expect, vi, afterEach } from 'vitest';
import { defineAgentNetwork } from '../agents/network';

const mockAgent = (name: string) => ({
  async execute(input: string) {
    return `${name} handled: ${input}`;
  },
});

describe('defineAgentNetwork — function router (backward compat)', () => {
  it('code router still works', async () => {
    const network = defineAgentNetwork({
      agents: { alpha: mockAgent('alpha') },
      router: async (_, ctx) => (ctx.iteration === 0 ? 'alpha' : 'END'),
    });
    const result = await network.run('hello');
    expect(result.output).toContain('alpha handled');
    expect(result.hops).toBe(1);
  });
});

describe('defineAgentNetwork — LLM router config', () => {
  afterEach(() => vi.unstubAllGlobals());

  function mockOpenAI(agentName: string) {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: agentName } }],
          }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'END' } }],
          }),
        })
    );
  }

  it('LLM router config triggers fetch call', async () => {
    mockOpenAI('researcher');
    const network = defineAgentNetwork({
      agents: { researcher: mockAgent('researcher') },
      router: { model: 'gpt-4o-mini', apiKey: 'test-key' },
    });
    await network.run('research this topic');
    expect(vi.mocked(fetch)).toHaveBeenCalled();
  });

  it('LLM returning valid agent name routes to that agent', async () => {
    mockOpenAI('writer');
    const network = defineAgentNetwork({
      agents: {
        researcher: mockAgent('researcher'),
        writer: mockAgent('writer'),
      },
      router: { model: 'gpt-4o-mini', apiKey: 'test-key' },
    });
    const result = await network.run('write a story');
    expect(result.history[0]?.agent).toBe('writer');
  });

  it('LLM returning END stops routing immediately', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'END' } }] }),
    }));
    const network = defineAgentNetwork({
      agents: { alpha: mockAgent('alpha') },
      router: { model: 'gpt-4o-mini', apiKey: 'key' },
    });
    const result = await network.run('stop now');
    expect(result.hops).toBe(0);
    expect(result.history).toHaveLength(0);
  });

  it('LLM returning unknown agent name falls back to END', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'nonexistent-agent' } }] }),
    }));
    const network = defineAgentNetwork({
      agents: { alpha: mockAgent('alpha') },
      router: { model: 'gpt-4o-mini', apiKey: 'key' },
    });
    const result = await network.run('test');
    expect(result.hops).toBe(0);
  });

  it('API failure falls back to END (no infinite loop)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const network = defineAgentNetwork({
      agents: { alpha: mockAgent('alpha') },
      router: { model: 'gpt-4o-mini', apiKey: 'key' },
    });
    const result = await network.run('test');
    expect(result.hops).toBe(0);
  });

  it('custom systemPrompt is used in LLM request body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'END' } }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const network = defineAgentNetwork({
      agents: { alpha: mockAgent('alpha') },
      router: { model: 'gpt-4o-mini', apiKey: 'key', systemPrompt: 'custom prompt' },
    });
    await network.run('test');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toBe('custom prompt');
  });

  it('maxHops still enforced with LLM router', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'alpha' } }] }),
    }));
    const network = defineAgentNetwork({
      agents: { alpha: mockAgent('alpha') },
      router: { model: 'gpt-4o-mini', apiKey: 'key' },
      maxHops: 2,
    });
    const result = await network.run('loop forever');
    expect(result.hops).toBeLessThanOrEqual(2);
  });
});
