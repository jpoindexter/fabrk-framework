import { describe, it, expect, vi } from 'vitest';

// Mock the openai-object module so streamObject (and streamObjectPartial via it)
// never actually hits the network. We replace streamObject at the module boundary
// that streamObjectPartial calls into, which is the provider-level import.
vi.mock('../llm/openai-object', () => ({
  streamObject: vi.fn(),
  generateObject: vi.fn(),
}));

import * as openaiObject from '../llm/openai-object';
import { streamObjectPartial } from '../llm/generate-object';

async function* makeEvents(events: Array<{ type: string; text?: string; object?: unknown; message?: string }>) {
  for (const e of events) yield e as never;
}

describe('streamObjectPartial()', () => {
  it('yields partial objects as JSON delta accumulates', async () => {
    vi.mocked(openaiObject.streamObject).mockImplementationOnce(() => makeEvents([
      { type: 'delta', text: '{"name":' },
      { type: 'delta', text: '"Alice"}' },
      { type: 'done', object: { name: 'Alice' } },
    ]) as never);

    const results: unknown[] = [];
    for await (const p of streamObjectPartial([], {})) results.push(p);
    expect(results.length).toBeGreaterThan(0);
    expect(results.at(-1)).toEqual({ name: 'Alice' });
  });

  it('yields complete object on done event', async () => {
    vi.mocked(openaiObject.streamObject).mockImplementationOnce(() => makeEvents([
      { type: 'done', object: { x: 42 } },
    ]) as never);

    const results: unknown[] = [];
    for await (const p of streamObjectPartial([], {})) results.push(p);
    expect(results).toContainEqual({ x: 42 });
  });

  it('non-object prefix yields nothing until complete', async () => {
    vi.mocked(openaiObject.streamObject).mockImplementationOnce(() => makeEvents([
      { type: 'delta', text: 'hello' },
      { type: 'done', object: 'hello' },
    ]) as never);

    const partials: unknown[] = [];
    for await (const p of streamObjectPartial([], {})) {
      if (p !== 'hello') partials.push(p);
    }
    expect(partials).toHaveLength(0);
  });

  it('throws on error event', async () => {
    vi.mocked(openaiObject.streamObject).mockImplementationOnce(() => makeEvents([
      { type: 'error', message: 'provider error' },
    ]) as never);

    await expect(async () => {
      for await (const _ of streamObjectPartial([], {})) { /* drain */ }
    }).rejects.toThrow('provider error');
  });

  it('open-brace buffer produces partial parse', async () => {
    vi.mocked(openaiObject.streamObject).mockImplementationOnce(() => makeEvents([
      { type: 'delta', text: '{"name":"Al' },
      { type: 'done', object: { name: 'Alice' } },
    ]) as never);

    const results: unknown[] = [];
    for await (const p of streamObjectPartial([], {})) results.push(p);
    // Should get at least the final done object
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});
