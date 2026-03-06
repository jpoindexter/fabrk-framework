import type { MemoryStore } from "./memory/types";
import type { AgentMemoryConfig } from "./define-agent";
import type { WorkingMemoryConfig } from "./memory/working-memory";
import type { compressThread as CompressFn } from "./memory/compress";

type IncomingMessage = { role: string; content: string | unknown[] };

export async function deriveUserIdFromBearer(
  authHeader: string | null
): Promise<string | undefined> {
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  const token = authHeader.slice(7).trim();
  if (!token) return undefined;
  const encoded = new TextEncoder().encode(token);
  const hashBuf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export interface ResolvedThread {
  threadId: string | undefined;
  historyMessages: IncomingMessage[];
}

export async function resolveThread(
  memoryStore: MemoryStore,
  memory: boolean | AgentMemoryConfig,
  agentName: string,
  threadId: string | undefined,
  requestUserId: string | undefined,
  compressThread: typeof CompressFn,
): Promise<ResolvedThread | Response> {
  if (threadId) {
    const thread = await memoryStore.getThread(threadId);
    if (!thread || thread.agentName !== agentName) {
      return new Response(JSON.stringify({ error: "Thread not found or does not belong to this agent" }), { status: 404 });
    }
    if (thread.userId !== undefined && thread.userId !== requestUserId) {
      return new Response(JSON.stringify({ error: "Thread not found or does not belong to this agent" }), { status: 404 });
    }

    const memoryConfig = typeof memory === "object" ? memory : undefined;
    if (memoryConfig?.compression?.enabled && memoryConfig.compression.summarize) {
      await compressThread(threadId, memoryStore, {
        triggerAt: memoryConfig.compression.triggerAt,
        keepRecent: memoryConfig.compression.keepRecent,
        summarize: memoryConfig.compression.summarize,
      });
    }

    const maxMsgs = typeof memory === "object" ? memory.maxMessages ?? 50 : 50;
    const history = await memoryStore.getMessages(threadId, { limit: maxMsgs });
    const historyMessages = history.map((m) => ({
      role: m.role === "tool-call" || m.role === "tool-result" ? "assistant" : m.role,
      content: m.content,
    }));

    return { threadId, historyMessages };
  }

  const thread = await memoryStore.createThread(agentName, requestUserId);
  return { threadId: thread.id, historyMessages: [] };
}

export async function buildWorkingMemoryPrefix(
  memoryStore: MemoryStore,
  threadId: string,
  workingMemoryConfig: WorkingMemoryConfig,
): Promise<{ role: string; content: string } | undefined> {
  const { buildWorkingMemory } = await import("../agents/memory/working-memory.js");
  const threadMessages = await memoryStore.getMessages(threadId);
  const wmContent = buildWorkingMemory(threadMessages, workingMemoryConfig);
  if (!wmContent.trim()) return undefined;

  // Sanitize: strip ASCII control chars (except tab/LF/CR), cap at 8 KB,
  // wrap in delimiters so the LLM can distinguish framework context.
  // eslint-disable-next-line no-control-regex -- intentional: stripping control chars from stored memory
  const wmSanitized = wmContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").slice(0, 8_192);
  return {
    role: "system",
    content: `<working_memory>\n${wmSanitized}\n</working_memory>`,
  };
}
