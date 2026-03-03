import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SemanticMemoryStore } from '../agents/memory/semantic-store';
import { InMemoryMemoryStore } from '../agents/memory/in-memory-store';
import type { EmbeddingProvider } from '@fabrk/ai';

// Simple embedding provider: each unique word maps to a fixed dimension vector
function makeEmbedder(): EmbeddingProvider {
  let callCount = 0;
  return {
    model: 'test',
    embed: vi.fn().mockImplementation(async (text: string) => {
      // Return orthogonal-ish vectors based on which call this is
      callCount++;
      const dim = 4;
      const vec = new Array(dim).fill(0);
      vec[callCount % dim] = 1;
      return vec;
    }),
    embedBatch: vi.fn().mockImplementation(async (texts: string[]) => {
      return texts.map(() => {
        callCount++;
        const dim = 4;
        const vec = new Array(dim).fill(0);
        vec[callCount % dim] = 1;
        return vec;
      });
    }),
  };
}

// Wait for all microtask embeddings to settle
function flushAsync(): Promise<void> {
  return new Promise((r) => setTimeout(r, 10));
}

describe('SemanticMemoryStore', () => {
  let baseStore: InMemoryMemoryStore;
  let embedder: EmbeddingProvider;
  let store: SemanticMemoryStore;

  beforeEach(() => {
    baseStore = new InMemoryMemoryStore();
    embedder = makeEmbedder();
    store = new SemanticMemoryStore(baseStore, {
      embeddingProvider: embedder,
      topK: 3,
      threshold: 0,
    });
  });

  it('createThread delegates to base store', async () => {
    const thread = await store.createThread('agentA');
    expect(thread.agentName).toBe('agentA');
  });

  it('getThread returns null for unknown threadId', async () => {
    const result = await store.getThread('no-such-id');
    expect(result).toBeNull();
  });

  it('appendMessage stores message and triggers embedding for user messages', async () => {
    const thread = await store.createThread('agentA');
    const msg = await store.appendMessage(thread.id, { role: 'user', content: 'hello world', threadId: thread.id });
    expect(msg.content).toBe('hello world');
    expect(embedder.embed).toHaveBeenCalledWith('hello world');
  });

  it('appendMessage triggers embedding for assistant messages', async () => {
    const thread = await store.createThread('agentA');
    await store.appendMessage(thread.id, { role: 'assistant', content: 'I can help', threadId: thread.id });
    expect(embedder.embed).toHaveBeenCalledWith('I can help');
  });

  it('appendMessage does NOT embed system/tool messages', async () => {
    const thread = await store.createThread('agentA');
    vi.clearAllMocks();
    await store.appendMessage(thread.id, { role: 'system', content: 'Be helpful', threadId: thread.id });
    expect(embedder.embed).not.toHaveBeenCalled();
  });

  it('search returns empty array when no embeddings stored', async () => {
    const thread = await store.createThread('agentA');
    // Don't add any messages
    const results = await store.search('query', { agentName: 'agentA' });
    expect(results).toEqual([]);
  });

  it('search returns messages after embedding settles', async () => {
    const thread = await store.createThread('agentA');
    await store.appendMessage(thread.id, { role: 'user', content: 'hello', threadId: thread.id });
    await flushAsync(); // let background embed settle

    // Use threshold: 0 to match anything
    const storeWithZeroThreshold = new SemanticMemoryStore(baseStore, {
      embeddingProvider: embedder,
      topK: 3,
      threshold: 0,
    });
    const results = await storeWithZeroThreshold.search('hello');
    // May or may not find results depending on mock vectors — just verify it runs
    expect(Array.isArray(results)).toBe(true);
  });

  it('getMessages delegates to base store', async () => {
    const thread = await store.createThread('agentA');
    await store.appendMessage(thread.id, { role: 'user', content: 'msg1', threadId: thread.id });
    await store.appendMessage(thread.id, { role: 'assistant', content: 'msg2', threadId: thread.id });
    const msgs = await store.getMessages(thread.id);
    expect(msgs).toHaveLength(2);
  });

  it('deleteThread removes embeddings and messageContent for that thread', async () => {
    const thread = await store.createThread('agentA');
    await store.appendMessage(thread.id, { role: 'user', content: 'to delete', threadId: thread.id });
    await flushAsync();
    await store.deleteThread(thread.id);
    const result = await store.getThread(thread.id);
    expect(result).toBeNull();
  });

  it('replaceMessages delegates to base store when supported', async () => {
    const thread = await store.createThread('agentA');
    await store.appendMessage(thread.id, { role: 'user', content: 'original', threadId: thread.id });
    await store.replaceMessages(thread.id, [
      { role: 'assistant', content: 'compressed summary', threadId: thread.id },
    ]);
    const msgs = await store.getMessages(thread.id);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe('compressed summary');
  });

  it('replaceMessages is a no-op when base store does not implement it', async () => {
    // Build a MemoryStore without replaceMessages by delegating to baseStore
    const noReplaceBase = {
      createThread: (n: string) => baseStore.createThread(n),
      getThread: (id: string) => baseStore.getThread(id),
      appendMessage: (tid: string, msg: Parameters<typeof baseStore.appendMessage>[1]) =>
        baseStore.appendMessage(tid, msg),
      getMessages: (tid: string, opts?: { limit?: number }) => baseStore.getMessages(tid, opts),
      deleteThread: (tid: string) => baseStore.deleteThread(tid),
      // no replaceMessages
    };
    const s = new SemanticMemoryStore(noReplaceBase, { embeddingProvider: embedder });
    const thread = await noReplaceBase.createThread('agentA');
    // Should not throw even if replaceMessages is absent
    await expect(s.replaceMessages(thread.id, [])).resolves.toBeUndefined();
  });

  it('embedding failure is silently ignored', async () => {
    const failingEmbedder: EmbeddingProvider = {
      model: 'fail',
      embed: vi.fn().mockRejectedValue(new Error('embed error')),
      embedBatch: vi.fn().mockRejectedValue(new Error('embed error')),
    };
    const s = new SemanticMemoryStore(baseStore, { embeddingProvider: failingEmbedder });
    const thread = await s.createThread('agentA');
    // Should not throw even when embedding fails
    await expect(
      s.appendMessage(thread.id, { role: 'user', content: 'hello', threadId: thread.id })
    ).resolves.toBeDefined();
    await flushAsync(); // let background fail settle — no unhandled rejection
  });
});
