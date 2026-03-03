import { describe, it, expect, vi } from 'vitest';
import { InMemoryMemoryStore } from '../agents/memory/in-memory-store';
import { compressThread } from '../agents/memory/compress';
import type { MemoryStore } from '../agents/memory/types';

async function createThreadWithMessages(
  store: InMemoryMemoryStore,
  count: number,
  agentName = 'test-agent'
): Promise<string> {
  const thread = await store.createThread(agentName);
  for (let i = 0; i < count; i++) {
    await store.appendMessage(thread.id, {
      threadId: thread.id,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    });
  }
  return thread.id;
}

describe('memory compression', () => {
  it('compresses thread when exceeding triggerAt', async () => {
    const store = new InMemoryMemoryStore();
    const threadId = await createThreadWithMessages(store, 50);
    const summarize = vi.fn().mockResolvedValue('Summary of 45 messages');

    const result = await compressThread(threadId, store, {
      triggerAt: 20,
      keepRecent: 5,
      summarize,
    });

    expect(result.compressed).toBe(true);
    expect(result.removedCount).toBe(45);
  });

  it('after compression, thread has 1 summary + keepRecent messages', async () => {
    const store = new InMemoryMemoryStore();
    const threadId = await createThreadWithMessages(store, 50);
    const summarize = vi.fn().mockResolvedValue('Compressed summary');

    await compressThread(threadId, store, {
      triggerAt: 20,
      keepRecent: 5,
      summarize,
    });

    const messages = await store.getMessages(threadId);
    expect(messages).toHaveLength(6); // 1 summary + 5 recent
  });

  it('summary message role is assistant with [Context summary] prefix', async () => {
    const store = new InMemoryMemoryStore();
    const threadId = await createThreadWithMessages(store, 30);
    const summarize = vi.fn().mockResolvedValue('the summary');

    await compressThread(threadId, store, {
      triggerAt: 20,
      keepRecent: 5,
      summarize,
    });

    const messages = await store.getMessages(threadId);
    expect(messages[0].role).toBe('assistant');
    expect(messages[0].content).toContain('[Context summary');
    expect(messages[0].content).toContain('the summary');
  });

  it('summarize called once with messages to compress', async () => {
    const store = new InMemoryMemoryStore();
    const threadId = await createThreadWithMessages(store, 30);
    const summarize = vi.fn().mockResolvedValue('ok');

    await compressThread(threadId, store, {
      triggerAt: 20,
      keepRecent: 5,
      summarize,
    });

    expect(summarize).toHaveBeenCalledOnce();
    expect(summarize.mock.calls[0][0]).toHaveLength(25); // 30 - 5 = 25 to compress
  });

  it('thread below triggerAt is not compressed', async () => {
    const store = new InMemoryMemoryStore();
    const threadId = await createThreadWithMessages(store, 15);
    const summarize = vi.fn();

    const result = await compressThread(threadId, store, {
      triggerAt: 20,
      keepRecent: 5,
      summarize,
    });

    expect(result.compressed).toBe(false);
    expect(result.removedCount).toBe(0);
    expect(summarize).not.toHaveBeenCalled();
    const messages = await store.getMessages(threadId);
    expect(messages).toHaveLength(15);
  });

  it('thread at exact triggerAt boundary is not compressed', async () => {
    const store = new InMemoryMemoryStore();
    const threadId = await createThreadWithMessages(store, 20);
    const summarize = vi.fn();

    const result = await compressThread(threadId, store, {
      triggerAt: 20,
      keepRecent: 5,
      summarize,
    });

    expect(result.compressed).toBe(false);
    expect(summarize).not.toHaveBeenCalled();
  });

  it('store without replaceMessages returns compressed: false gracefully', async () => {
    const store: MemoryStore = {
      createThread: vi.fn().mockResolvedValue({ id: 'thread-1', agentName: 'a', createdAt: new Date(), updatedAt: new Date() }),
      getThread: vi.fn(),
      appendMessage: vi.fn(),
      getMessages: vi.fn().mockResolvedValue(
        Array.from({ length: 50 }, (_, i) => ({
          id: `msg-${i}`,
          threadId: 'thread-1',
          role: 'user' as const,
          content: `msg ${i}`,
          createdAt: new Date(),
        }))
      ),
      deleteThread: vi.fn(),
      // no replaceMessages
    };

    const result = await compressThread('thread-1', store, {
      triggerAt: 20,
      keepRecent: 5,
      summarize: vi.fn().mockResolvedValue('summary'),
    });

    expect(result.compressed).toBe(false);
    expect(result.removedCount).toBe(0);
  });

  it('uses default triggerAt=40 when not specified', async () => {
    const store = new InMemoryMemoryStore();
    const threadId = await createThreadWithMessages(store, 39);
    const summarize = vi.fn().mockResolvedValue('summary');

    const result = await compressThread(threadId, store, { summarize });

    expect(result.compressed).toBe(false);
    expect(summarize).not.toHaveBeenCalled();
  });

  it('uses default keepRecent=10 when not specified', async () => {
    const store = new InMemoryMemoryStore();
    const threadId = await createThreadWithMessages(store, 50);
    const summarize = vi.fn().mockResolvedValue('summary');

    await compressThread(threadId, store, { triggerAt: 20, summarize });

    const messages = await store.getMessages(threadId);
    // 1 summary + 10 recent (default keepRecent)
    expect(messages).toHaveLength(11);
  });

  it('replaceMessages is implemented on InMemoryMemoryStore', async () => {
    const store = new InMemoryMemoryStore();
    const thread = await store.createThread('agent');
    await store.appendMessage(thread.id, {
      threadId: thread.id,
      role: 'user',
      content: 'Old message 1',
    });
    await store.appendMessage(thread.id, {
      threadId: thread.id,
      role: 'assistant',
      content: 'Old message 2',
    });

    await store.replaceMessages(thread.id, [
      { threadId: thread.id, role: 'assistant', content: 'New summary message' },
    ]);

    const msgs = await store.getMessages(thread.id);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe('New summary message');
    expect(msgs[0].id).toBeDefined();
    expect(msgs[0].createdAt).toBeInstanceOf(Date);
  });

  it('replaceMessages throws for unknown threadId', async () => {
    const store = new InMemoryMemoryStore();
    await expect(
      store.replaceMessages('nonexistent', [])
    ).rejects.toThrow('Thread not found: nonexistent');
  });

  it('recent messages content is preserved after compression', async () => {
    const store = new InMemoryMemoryStore();
    const thread = await store.createThread('agent');

    // Add 25 messages
    for (let i = 0; i < 25; i++) {
      await store.appendMessage(thread.id, {
        threadId: thread.id,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message content ${i}`,
      });
    }

    const summarize = vi.fn().mockResolvedValue('bulk summary');

    await compressThread(thread.id, store, {
      triggerAt: 20,
      keepRecent: 5,
      summarize,
    });

    const messages = await store.getMessages(thread.id);
    // Last 5 messages should have content from messages 20-24
    expect(messages[1].content).toBe('Message content 20');
    expect(messages[2].content).toBe('Message content 21');
    expect(messages[3].content).toBe('Message content 22');
    expect(messages[4].content).toBe('Message content 23');
    expect(messages[5].content).toBe('Message content 24');
  });
});
