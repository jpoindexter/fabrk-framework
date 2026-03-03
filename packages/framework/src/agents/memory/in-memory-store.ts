import type { MemoryStore, Thread, ThreadMessage } from "./types";

const MAX_THREADS = 1_000;
const MAX_MESSAGES_PER_THREAD = 500;

export class InMemoryMemoryStore implements MemoryStore {
  private threads = new Map<string, Thread>();
  private messages = new Map<string, ThreadMessage[]>();

  async createThread(agentName: string): Promise<Thread> {
    if (this.threads.size >= MAX_THREADS) {
      const oldest = this.threads.keys().next().value;
      if (oldest !== undefined) {
        this.threads.delete(oldest);
        this.messages.delete(oldest);
      }
    }

    const thread: Thread = {
      id: crypto.randomUUID(),
      agentName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.threads.set(thread.id, thread);
    this.messages.set(thread.id, []);
    return thread;
  }

  async getThread(threadId: string): Promise<Thread | null> {
    return this.threads.get(threadId) ?? null;
  }

  async appendMessage(
    threadId: string,
    msg: Omit<ThreadMessage, "id" | "createdAt">
  ): Promise<ThreadMessage> {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    const msgs = this.messages.get(threadId) ?? [];

    // Evict oldest messages if at capacity
    while (msgs.length >= MAX_MESSAGES_PER_THREAD) {
      msgs.shift();
    }

    const message: ThreadMessage = {
      ...msg,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    msgs.push(message);
    this.messages.set(threadId, msgs);

    thread.updatedAt = new Date();

    return message;
  }

  async getMessages(
    threadId: string,
    opts?: { limit?: number }
  ): Promise<ThreadMessage[]> {
    const msgs = this.messages.get(threadId) ?? [];
    if (opts?.limit && opts.limit > 0) {
      return msgs.slice(-opts.limit);
    }
    return [...msgs];
  }

  async deleteThread(threadId: string): Promise<void> {
    this.threads.delete(threadId);
    this.messages.delete(threadId);
  }

  async replaceMessages(
    threadId: string,
    messages: Omit<ThreadMessage, "id" | "createdAt">[]
  ): Promise<void> {
    const thread = this.threads.get(threadId);
    if (!thread) throw new Error(`Thread not found: ${threadId}`);
    const newMessages: ThreadMessage[] = messages.map((m) => ({
      ...m,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    }));
    this.messages.set(threadId, newMessages);
    thread.updatedAt = new Date();
  }
}
