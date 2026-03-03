import { describe, it, expect } from 'vitest';
import { SemanticMemoryStore } from '../agents/memory/semantic-store';
import { InMemoryMemoryStore } from '../agents/memory/in-memory-store';
import type { EmbeddingProvider } from '@fabrk/ai';

// Controlled embedding provider.
//
// Each message content must include a "SLOT:N" tag (e.g. "msg SLOT:0").
// embed() extracts the slot and returns a unit basis vector for that dimension,
// making cosine similarity between equal slots exactly 1 and between different
// slots exactly 0 (orthogonal basis). Querying with "SLOT:N" deterministically
// targets only messages tagged with that slot, regardless of call order.
function makeSlottedProvider(dims = 8): EmbeddingProvider {
  const zeroVec = (): number[] => new Array(dims).fill(0);

  function vectorForText(text: string): number[] {
    const m = /SLOT:(\d+)/.exec(text);
    if (!m) return zeroVec();
    const v = zeroVec();
    v[parseInt(m[1], 10) % dims] = 1;
    return v;
  }

  return {
    embed: async (text: string) => vectorForText(text),
    embedBatch: async (texts: string[]) => texts.map(vectorForText),
  };
}

// Wait for background embed promises to settle
function flushAsync(): Promise<void> {
  return new Promise((r) => setTimeout(r, 50));
}

describe('SemanticMemoryStore messageRange', () => {
  it('without messageRange returns only the semantically matched message', async () => {
    const base = new InMemoryMemoryStore();
    const store = new SemanticMemoryStore(base, {
      embeddingProvider: makeSlottedProvider(),
      threshold: 0,
      topK: 1,
    });

    const thread = await store.createThread('agent1');
    await store.appendMessage(thread.id, { threadId: thread.id, role: 'user', content: 'before SLOT:0' });
    const m2 = await store.appendMessage(thread.id, { threadId: thread.id, role: 'assistant', content: 'target SLOT:1' });
    await store.appendMessage(thread.id, { threadId: thread.id, role: 'user', content: 'after SLOT:2' });

    await flushAsync();

    // Query targets slot 1 → only m2 matches
    const results = await store.search('SLOT:1', { limit: 1 });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(m2.id);
  });

  it('messageRange { before: 1, after: 1 } expands around each match', async () => {
    const base = new InMemoryMemoryStore();
    const store = new SemanticMemoryStore(base, {
      embeddingProvider: makeSlottedProvider(),
      threshold: 0,
      topK: 1,
    });

    const thread = await store.createThread('agent1');
    const m1 = await store.appendMessage(thread.id, { threadId: thread.id, role: 'user', content: 'before context SLOT:0' });
    const m2 = await store.appendMessage(thread.id, { threadId: thread.id, role: 'assistant', content: 'relevant match SLOT:1' });
    const m3 = await store.appendMessage(thread.id, { threadId: thread.id, role: 'user', content: 'after context SLOT:2' });

    await flushAsync();

    const results = await store.search('SLOT:1', {
      limit: 1,
      messageRange: { before: 1, after: 1 },
    });

    const ids = results.map((m) => m.id);
    expect(ids).toContain(m1.id);
    expect(ids).toContain(m2.id);
    expect(ids).toContain(m3.id);
    expect(results).toHaveLength(3);
  });

  it('messageRange does not produce duplicate message ids when windows overlap', async () => {
    const base = new InMemoryMemoryStore();
    const store = new SemanticMemoryStore(base, {
      embeddingProvider: makeSlottedProvider(),
      threshold: 0,
      topK: 5,
    });

    const thread = await store.createThread('agent1');
    // All 5 messages share SLOT:0 so all 5 are semantic matches with topK=5.
    // With before:2 after:2 every match window overlaps — deduplication is exercised.
    for (let i = 0; i < 5; i++) {
      await store.appendMessage(thread.id, { threadId: thread.id, role: 'user', content: `msg${i} SLOT:0` });
    }

    await flushAsync();

    const results = await store.search('SLOT:0', {
      messageRange: { before: 2, after: 2 },
    });

    const ids = results.map((m) => m.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('messageRange clamps to thread boundaries without throwing', async () => {
    const base = new InMemoryMemoryStore();
    const store = new SemanticMemoryStore(base, {
      embeddingProvider: makeSlottedProvider(),
      threshold: 0,
      topK: 1,
    });

    const thread = await store.createThread('agent1');
    // Only 2 messages — large before/after values must clamp, not throw.
    await store.appendMessage(thread.id, { threadId: thread.id, role: 'user', content: 'first SLOT:0' });
    await store.appendMessage(thread.id, { threadId: thread.id, role: 'assistant', content: 'second SLOT:1' });

    await flushAsync();

    await expect(
      store.search('SLOT:1', { messageRange: { before: 100, after: 100 } })
    ).resolves.toBeDefined();
  });

  it('messageRange { before: 0, after: 0 } returns only the matched message', async () => {
    const base = new InMemoryMemoryStore();
    const store = new SemanticMemoryStore(base, {
      embeddingProvider: makeSlottedProvider(),
      threshold: 0,
      topK: 1,
    });

    const thread = await store.createThread('agent1');
    await store.appendMessage(thread.id, { threadId: thread.id, role: 'user', content: 'neighbor A SLOT:0' });
    const m2 = await store.appendMessage(thread.id, { threadId: thread.id, role: 'assistant', content: 'match SLOT:1' });
    await store.appendMessage(thread.id, { threadId: thread.id, role: 'user', content: 'neighbor B SLOT:2' });

    await flushAsync();

    const results = await store.search('SLOT:1', {
      limit: 1,
      messageRange: { before: 0, after: 0 },
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(m2.id);
  });

  it('messageRange { before: 2, after: 0 } expands backwards only', async () => {
    const base = new InMemoryMemoryStore();
    const store = new SemanticMemoryStore(base, {
      embeddingProvider: makeSlottedProvider(),
      threshold: 0,
      topK: 1,
    });

    const thread = await store.createThread('agent1');
    const m1 = await store.appendMessage(thread.id, { threadId: thread.id, role: 'user', content: 'two before SLOT:0' });
    const m2 = await store.appendMessage(thread.id, { threadId: thread.id, role: 'user', content: 'one before SLOT:1' });
    const m3 = await store.appendMessage(thread.id, { threadId: thread.id, role: 'assistant', content: 'match SLOT:2' });
    const m4 = await store.appendMessage(thread.id, { threadId: thread.id, role: 'user', content: 'after excluded SLOT:3' });

    await flushAsync();

    const results = await store.search('SLOT:2', {
      limit: 1,
      messageRange: { before: 2, after: 0 },
    });

    const ids = results.map((m) => m.id);
    expect(ids).toContain(m3.id); // the match
    expect(ids).toContain(m2.id); // 1 before
    expect(ids).toContain(m1.id); // 2 before
    expect(ids).not.toContain(m4.id); // forward — must be absent
  });
});
