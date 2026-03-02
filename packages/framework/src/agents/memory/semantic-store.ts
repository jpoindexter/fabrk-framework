import type { MemoryStore, Thread, ThreadMessage } from "./types";
import type { EmbeddingProvider, SimilarityResult } from "@fabrk/ai";

export interface SemanticMemoryOptions {
  embeddingProvider: EmbeddingProvider;
  topK?: number;
  threshold?: number;
}

export class SemanticMemoryStore implements MemoryStore {
  private baseStore: MemoryStore;
  private embeddings = new Map<string, number[]>();
  private messageAgentMap = new Map<string, string>();
  private messageContent = new Map<string, { threadId: string; role: string; content: string; createdAt: Date }>();
  private provider: EmbeddingProvider;
  private topK: number;
  private threshold: number;

  constructor(baseStore: MemoryStore, options: SemanticMemoryOptions) {
    this.baseStore = baseStore;
    this.provider = options.embeddingProvider;
    this.topK = options.topK ?? 5;
    this.threshold = options.threshold ?? 0.7;
  }

  async createThread(agentName: string): Promise<Thread> {
    return this.baseStore.createThread(agentName);
  }

  async getThread(threadId: string): Promise<Thread | null> {
    return this.baseStore.getThread(threadId);
  }

  async appendMessage(
    threadId: string,
    msg: Omit<ThreadMessage, "id" | "createdAt">
  ): Promise<ThreadMessage> {
    const message = await this.baseStore.appendMessage(threadId, msg);

    // Auto-embed in background (non-blocking)
    if (msg.role === "user" || msg.role === "assistant") {
      const thread = await this.baseStore.getThread(threadId);
      this.embedAsync(
        message.id,
        message.content,
        { threadId: message.threadId, role: message.role, createdAt: message.createdAt },
        thread?.agentName
      );
    }

    return message;
  }

  async getMessages(
    threadId: string,
    opts?: { limit?: number }
  ): Promise<ThreadMessage[]> {
    return this.baseStore.getMessages(threadId, opts);
  }

  async deleteThread(threadId: string): Promise<void> {
    // Clean up embeddings for this thread's messages
    const msgs = await this.baseStore.getMessages(threadId);
    for (const msg of msgs) {
      this.embeddings.delete(msg.id);
      this.messageAgentMap.delete(msg.id);
      this.messageContent.delete(msg.id);
    }
    return this.baseStore.deleteThread(threadId);
  }

  async search(
    query: string,
    opts?: { agentName?: string; limit?: number }
  ): Promise<ThreadMessage[]> {
    if (this.embeddings.size === 0) return [];

    const { findNearest } = await import("@fabrk/ai");
    const queryEmbedding = await this.provider.embed(query);

    // Build vectors array filtered by agent name if specified
    const vectors: Array<{ id: string; vector: number[] }> = [];
    for (const [id, vec] of this.embeddings) {
      if (opts?.agentName && this.messageAgentMap.get(id) !== opts.agentName) {
        continue;
      }
      vectors.push({ id, vector: vec });
    }

    if (vectors.length === 0) return [];

    const limit = opts?.limit ?? this.topK;
    const results: SimilarityResult[] = findNearest(
      queryEmbedding,
      vectors.map((v) => v.vector),
      limit,
      this.threshold
    );

    // Map results back to messages by index
    const messageIds = results.map((r) => vectors[r.index].id);

    // Hydrate messages from stored content
    const found: ThreadMessage[] = [];
    for (const msgId of messageIds) {
      const stored = this.messageContent.get(msgId);
      if (stored) {
        found.push({
          id: msgId,
          threadId: stored.threadId,
          role: stored.role as ThreadMessage["role"],
          content: stored.content,
          createdAt: stored.createdAt,
        });
      }
    }

    return found;
  }

  private embedAsync(
    messageId: string,
    content: string,
    meta: { threadId: string; role: string; createdAt: Date },
    agentName?: string
  ): void {
    this.messageContent.set(messageId, { ...meta, content });
    this.provider.embed(content).then(
      (vec) => {
        this.embeddings.set(messageId, vec);
        if (agentName) this.messageAgentMap.set(messageId, agentName);
      },
      () => { /* embedding failure is non-critical */ }
    );
  }
}
