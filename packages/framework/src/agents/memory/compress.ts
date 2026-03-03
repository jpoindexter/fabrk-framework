import type { MemoryStore, ThreadMessage } from './types.js';

export interface CompressionOptions {
  triggerAt?: number;
  keepRecent?: number;
  summarize: (messages: ThreadMessage[]) => Promise<string>;
}

export async function compressThread(
  threadId: string,
  store: MemoryStore,
  opts: CompressionOptions
): Promise<{ compressed: boolean; removedCount: number }> {
  const triggerAt = opts.triggerAt ?? 40;
  const keepRecent = opts.keepRecent ?? 10;

  const messages = await store.getMessages(threadId);
  if (messages.length <= triggerAt) return { compressed: false, removedCount: 0 };

  const toCompress = messages.slice(0, messages.length - keepRecent);
  const recent = messages.slice(-keepRecent);
  if (toCompress.length === 0) return { compressed: false, removedCount: 0 };

  const summary = await opts.summarize(toCompress);

  const replacement: Omit<ThreadMessage, 'id' | 'createdAt'>[] = [
    {
      threadId,
      role: 'assistant' as const,
      content: `[Context summary — ${toCompress.length} earlier messages compressed]\n\n${summary}`,
    },
    ...recent.map((m) => ({
      threadId: m.threadId,
      role: m.role,
      content: m.content,
      metadata: m.metadata,
    })),
  ];

  if (store.replaceMessages) {
    await store.replaceMessages(threadId, replacement);
  } else {
    return { compressed: false, removedCount: 0 };
  }

  return { compressed: true, removedCount: toCompress.length };
}
