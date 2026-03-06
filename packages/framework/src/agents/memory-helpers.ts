import type { MemoryStore } from "./memory/types";

export function serializeContentForMemory(content: string | unknown[]): string {
  if (typeof content === "string") return content;
  return JSON.stringify(content);
}

export async function persistMessages(
  memoryStore: MemoryStore,
  threadId: string,
  lastUserMsg: { role: string; content: string | unknown[] } | undefined,
  assistantContent: string
): Promise<void> {
  if (lastUserMsg) {
    await memoryStore.appendMessage(threadId, {
      threadId,
      role: "user",
      content: serializeContentForMemory(lastUserMsg.content),
    });
  }
  if (assistantContent) {
    await memoryStore.appendMessage(threadId, {
      threadId,
      role: "assistant",
      content: assistantContent,
    });
  }
}
