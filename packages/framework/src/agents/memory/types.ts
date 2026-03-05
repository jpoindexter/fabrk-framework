export interface ThreadMessage {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "tool-call" | "tool-result";
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface Thread {
  id: string;
  agentName: string;
  userId?: string;  // bound to auth credential — prevents cross-user thread access
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryStore {
  createThread(agentName: string, userId?: string): Promise<Thread>;
  getThread(threadId: string): Promise<Thread | null>;
  appendMessage(threadId: string, msg: Omit<ThreadMessage, "id" | "createdAt">): Promise<ThreadMessage>;
  getMessages(threadId: string, opts?: { limit?: number }): Promise<ThreadMessage[]>;
  deleteThread(threadId: string): Promise<void>;
  replaceMessages?(
    threadId: string,
    messages: Omit<ThreadMessage, "id" | "createdAt">[]
  ): Promise<void>;
}
