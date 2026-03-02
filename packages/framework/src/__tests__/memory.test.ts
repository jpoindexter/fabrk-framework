import { describe, it, expect, beforeEach } from "vitest";
import {
  InMemoryMemoryStore,
  setMemoryStore,
  getMemoryStore,
} from "../agents/memory/index";
import { createAgentHandler } from "../agents/route-handler";

describe("Memory Store", () => {
  let store: InMemoryMemoryStore;

  beforeEach(() => {
    store = new InMemoryMemoryStore();
  });

  it("creates a thread with a valid UUID", async () => {
    const thread = await store.createThread("chat-agent");
    expect(thread.id).toBeDefined();
    expect(thread.agentName).toBe("chat-agent");
    expect(thread.createdAt).toBeInstanceOf(Date);
  });

  it("retrieves a thread by ID", async () => {
    const thread = await store.createThread("agent1");
    const found = await store.getThread(thread.id);
    expect(found).not.toBeNull();
    expect((found as NonNullable<typeof found>).id).toBe(thread.id);
  });

  it("returns null for unknown thread IDs", async () => {
    const found = await store.getThread("nonexistent");
    expect(found).toBeNull();
  });

  it("appends and retrieves messages", async () => {
    const thread = await store.createThread("agent1");
    await store.appendMessage(thread.id, {
      threadId: thread.id,
      role: "user",
      content: "Hello",
    });
    await store.appendMessage(thread.id, {
      threadId: thread.id,
      role: "assistant",
      content: "Hi there!",
    });

    const msgs = await store.getMessages(thread.id);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("user");
    expect(msgs[0].content).toBe("Hello");
    expect(msgs[1].role).toBe("assistant");
  });

  it("respects message limit", async () => {
    const thread = await store.createThread("agent1");
    for (let i = 0; i < 10; i++) {
      await store.appendMessage(thread.id, {
        threadId: thread.id,
        role: "user",
        content: `Message ${i}`,
      });
    }

    const limited = await store.getMessages(thread.id, { limit: 3 });
    expect(limited).toHaveLength(3);
    expect(limited[0].content).toBe("Message 7");
  });

  it("throws when appending to non-existent thread", async () => {
    await expect(
      store.appendMessage("fake-id", {
        threadId: "fake-id",
        role: "user",
        content: "Hi",
      })
    ).rejects.toThrow("Thread not found");
  });

  it("deletes thread and its messages", async () => {
    const thread = await store.createThread("agent1");
    await store.appendMessage(thread.id, {
      threadId: thread.id,
      role: "user",
      content: "Hi",
    });

    await store.deleteThread(thread.id);
    expect(await store.getThread(thread.id)).toBeNull();
    expect(await store.getMessages(thread.id)).toEqual([]);
  });

  it("evicts oldest thread when at capacity (1000)", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 1001; i++) {
      const t = await store.createThread(`agent-${i}`);
      ids.push(t.id);
    }

    // First thread should be evicted
    expect(await store.getThread(ids[0])).toBeNull();
    // Last thread should exist
    expect(await store.getThread(ids[1000])).not.toBeNull();
  });

  it("singleton get/set works", () => {
    const custom = new InMemoryMemoryStore();
    setMemoryStore(custom);
    expect(getMemoryStore()).toBe(custom);
  });
});

describe("Memory in route handler", () => {
  it("creates thread and returns threadId", async () => {
    const store = new InMemoryMemoryStore();
    const handler = createAgentHandler({
      model: "test-model",
      auth: "none",
      tools: [],
      stream: false,
      memory: true,
      memoryStore: store,
      _llmCall: async () => ({
        content: "Hello!",
        usage: { promptTokens: 5, completionTokens: 5 },
        cost: 0.001,
      }),
    });

    const res = await handler(
      new Request("http://localhost/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hi" }],
        }),
      })
    );

    const data = await res.json();
    expect(data.threadId).toBeDefined();
    expect(typeof data.threadId).toBe("string");
    expect(data.content).toBe("Hello!");
  });

  it("persists messages across calls with threadId", async () => {
    const store = new InMemoryMemoryStore();
    let callNum = 0;
    const handler = createAgentHandler({
      model: "test-model",
      auth: "none",
      tools: [],
      stream: false,
      memory: true,
      memoryStore: store,
      _llmCall: async (_msgs) => {
        callNum++;
        return {
          content: `Response ${callNum}`,
          usage: { promptTokens: 5, completionTokens: 5 },
          cost: 0.001,
        };
      },
    });

    // First call — creates thread
    const res1 = await handler(
      new Request("http://localhost/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "First message" }],
        }),
      })
    );
    const data1 = await res1.json();
    const threadId = data1.threadId;
    expect(threadId).toBeDefined();

    // Second call — reuses thread
    const res2 = await handler(
      new Request("http://localhost/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Second message" }],
          threadId,
        }),
      })
    );
    const data2 = await res2.json();
    expect(data2.threadId).toBe(threadId);

    // Verify messages persisted
    const msgs = await store.getMessages(threadId);
    expect(msgs).toHaveLength(4); // user1, assistant1, user2, assistant2
  });

  it("rejects threadId for wrong agent", async () => {
    const store = new InMemoryMemoryStore();
    const thread = await store.createThread("other-agent");

    const handler = createAgentHandler({
      model: "test-model", // agentName derived as "test-model"
      auth: "none",
      tools: [],
      stream: false,
      memory: true,
      memoryStore: store,
      _llmCall: async () => ({
        content: "OK",
        usage: { promptTokens: 1, completionTokens: 1 },
        cost: 0,
      }),
    });

    const res = await handler(
      new Request("http://localhost/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hi" }],
          threadId: thread.id,
        }),
      })
    );

    expect(res.status).toBe(404);
  });
});
