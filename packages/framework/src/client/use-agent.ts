"use client";

import { useState, useCallback } from "react";
import type { SSEEvent } from "../agents/sse-stream.js";

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentUsage {
  promptTokens: number;
  completionTokens: number;
}

/**
 * Parse a single SSE line into an event object.
 * Returns null for non-data lines or invalid JSON.
 */
export function parseSSELine(line: string): SSEEvent | null {
  if (!line.startsWith("data: ")) return null;
  const json = line.slice("data: ".length);
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * React hook for interacting with an agent via SSE streaming.
 *
 * @example
 * ```tsx
 * const { send, messages, isStreaming, cost, error } = useAgent('chat')
 *
 * await send('Hello!')
 * ```
 */
export function useAgent(agentName: string) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cost, setCost] = useState(0);
  const [usage, setUsage] = useState<AgentUsage>({
    promptTokens: 0,
    completionTokens: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (content: string) => {
      setError(null);
      setIsStreaming(true);

      const userMessage: AgentMessage = { role: "user", content };
      setMessages((prev: AgentMessage[]) => [...prev, userMessage]);

      try {
        const allMessages = [
          ...messages,
          { role: "user" as const, content },
        ];

        const res = await fetch(`/api/agents/${agentName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: allMessages }),
        });

        if (!res.ok) {
          const err = await res.json();
          setError(err.error || "Request failed");
          setIsStreaming(false);
          return;
        }

        const contentType = res.headers.get("Content-Type") ?? "";

        if (contentType.includes("text/event-stream") && res.body) {
          // SSE streaming response
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let assistantContent = "";
          let buffer = "";

          setMessages((prev: AgentMessage[]) => [
            ...prev,
            { role: "assistant", content: "" },
          ]);

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const event = parseSSELine(line);
              if (!event) continue;

              if (event.type === "text") {
                assistantContent += event.content;
                setMessages((prev: AgentMessage[]) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return updated;
                });
              } else if (event.type === "usage") {
                setUsage({
                  promptTokens: event.promptTokens,
                  completionTokens: event.completionTokens,
                });
                setCost((prev: number) => prev + event.cost);
              } else if (event.type === "error") {
                setError(event.message);
              }
            }
          }
        } else {
          // JSON response (non-streaming)
          const data = await res.json();
          setMessages((prev: AgentMessage[]) => [
            ...prev,
            { role: "assistant", content: data.content },
          ]);
          if (data.usage) {
            setUsage({
              promptTokens: data.usage.promptTokens,
              completionTokens: data.usage.completionTokens,
            });
          }
          if (data.cost) {
            setCost((prev: number) => prev + data.cost);
          }
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setIsStreaming(false);
      }
    },
    [agentName, messages]
  );

  return { send, messages, isStreaming, cost, usage, error };
}
