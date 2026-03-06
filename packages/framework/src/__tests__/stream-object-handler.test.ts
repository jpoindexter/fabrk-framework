import { describe, it, expect, vi, beforeEach } from 'vitest';

// Parse all SSE events from a Response body
async function parseSSE(resp: Response): Promise<Array<Record<string, unknown>>> {
  const text = await resp.text();
  const events: Array<Record<string, unknown>> = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data: ')) {
      try {
        events.push(JSON.parse(trimmed.slice(6)));
      } catch { /* ignore malformed */ }
    }
  }
  return events;
}

describe('handleStreamObject', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns a Response with content-type: text/event-stream', async () => {
    vi.doMock('@fabrk/ai', () => ({
      streamObject: async function* () {
        yield { type: 'delta', text: '{' };
        yield { type: 'done', object: { name: 'test' }, usage: { promptTokens: 5, completionTokens: 3 } };
      },
    }));

    const { handleStreamObject } = await import('../runtime/stream-object-handler');
    const resp = await handleStreamObject(
      [{ role: 'user', content: 'go' }],
      { type: 'object', properties: { name: { type: 'string' } } }
    );

    expect(resp.headers.get('content-type')).toBe('text/event-stream');
  });

  it('emits delta and done SSE events from streamObject', async () => {
    vi.doMock('@fabrk/ai', () => ({
      streamObject: async function* () {
        yield { type: 'delta', text: '{"n' };
        yield { type: 'delta', text: 'ame":"test"}' };
        yield { type: 'done', object: { name: 'test' }, usage: { promptTokens: 5, completionTokens: 3 } };
      },
    }));

    const { handleStreamObject } = await import('../runtime/stream-object-handler');
    const resp = await handleStreamObject(
      [{ role: 'user', content: 'go' }],
      { type: 'object', properties: {} }
    );

    const events = await parseSSE(resp);
    expect(events.some((e) => e.type === 'delta')).toBe(true);
    expect(events.some((e) => e.type === 'done')).toBe(true);
    const done = events.find((e) => e.type === 'done') as Record<string, unknown>;
    expect((done.object as Record<string, unknown>).name).toBe('test');
  });

  it('emits error SSE event when streamObject throws', async () => {
    vi.doMock('@fabrk/ai', () => ({
      // eslint-disable-next-line require-yield
      streamObject: async function* () {
        throw new Error('provider failure');
      },
    }));

    const { handleStreamObject } = await import('../runtime/stream-object-handler');
    const resp = await handleStreamObject(
      [{ role: 'user', content: 'go' }],
      { type: 'object', properties: {} }
    );

    const events = await parseSSE(resp);
    expect(events.some((e) => e.type === 'error')).toBe(true);
    const errEvent = events.find((e) => e.type === 'error') as Record<string, unknown>;
    expect(errEvent.message).toContain('provider failure');
  });

  it('includes security headers in response', async () => {
    vi.doMock('@fabrk/ai', () => ({
      streamObject: async function* () {
        yield { type: 'done', object: {}, usage: { promptTokens: 1, completionTokens: 1 } };
      },
    }));

    const { handleStreamObject } = await import('../runtime/stream-object-handler');
    const resp = await handleStreamObject(
      [{ role: 'user', content: 'go' }],
      { type: 'object', properties: {} }
    );

    expect(resp.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('emits error event for non-Error thrown value', async () => {
    vi.doMock('@fabrk/ai', () => ({
      // eslint-disable-next-line require-yield
      streamObject: async function* () {
         
        throw 'string error';
      },
    }));

    const { handleStreamObject } = await import('../runtime/stream-object-handler');
    const resp = await handleStreamObject(
      [{ role: 'user', content: 'go' }],
      { type: 'object', properties: {} }
    );

    const events = await parseSSE(resp);
    const errEvent = events.find((e) => e.type === 'error') as Record<string, unknown>;
    expect(errEvent.message).toBe('Internal error');
  });
});
