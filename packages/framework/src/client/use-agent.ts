"use client";

import { useState, useCallback, useRef } from "react";
import type { SSEEvent } from "../agents/sse-stream";

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentUsage {
  promptTokens: number;
  completionTokens: number;
}

export function parseSSELine(line: string): SSEEvent | null {
  if (!line.startsWith("data: ")) return null;
  const json = line.slice("data: ".length);
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const MAX_HISTORY = 50;

export function useAgent(agentName: string) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cost, setCost] = useState(0);
  const [usage, setUsage] = useState<AgentUsage>({
    promptTokens: 0,
    completionTokens: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const send = useCallback(
    async (content: string) => {
      setError(null);
      setIsStreaming(true);

      const userMessage: AgentMessage = { role: "user", content };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const allMessages = [
          ...messagesRef.current.slice(-MAX_HISTORY),
          { role: "user" as const, content },
        ];

        const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}`, {
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
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let assistantContent = "";
          let buffer = "";

          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "" },
          ]);

          try {
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
                  setMessages((prev) => {
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
                  setCost((prev) => prev + event.cost);
                } else if (event.type === "error") {
                  setError(event.message);
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        } else {
          const data = await res.json();
          setMessages((prev) => [
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
            setCost((prev) => prev + data.cost);
          }
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setIsStreaming(false);
      }
    },
    [agentName]
  );

  return { send, messages, isStreaming, cost, usage, error };
}
