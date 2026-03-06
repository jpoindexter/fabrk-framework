"use client";

import { useState, useCallback, useRef } from "react";
import type { SSEEvent } from "../agents/sse-stream";
import { readSSELines } from "./sse-reader";

export type AgentContentPart =
  | { type: "text"; text: string }
  | { type: "image"; url?: string; base64?: string; mimeType?: string };

export interface AgentMessage {
  role: "user" | "assistant";
  content: string | AgentContentPart[];
}

export interface AgentUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface AgentToolCall {
  name: string;
  input: Record<string, unknown>;
  output?: string;
  durationMs?: number;
  iteration: number;
}

export function parseSSELine(line: string): SSEEvent | null {
  if (!line.startsWith("data: ")) return null;
  const json = line.slice("data: ".length);
  try {
    return JSON.parse(json);
  } catch (err) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.warn('[fabrk] failed to parse SSE line:', err);
    }
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
  const [toolCalls, setToolCalls] = useState<AgentToolCall[]>([]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const send = useCallback(
    async (content: string | AgentContentPart[]) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setError(null);
      setIsStreaming(true);
      setToolCalls([]);

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
          signal: abortControllerRef.current.signal,
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
          let assistantContent = "";

          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "" },
          ]);

          for await (const line of readSSELines(reader)) {
            const event = parseSSELine(line);
            if (!event) continue;

            if (event.type === "text-delta") {
              assistantContent += event.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return updated;
              });
            } else if (event.type === "text") {
              assistantContent = event.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return updated;
              });
            } else if (event.type === "tool-call") {
              setToolCalls((prev) => [
                ...prev,
                { name: event.name, input: event.input, iteration: event.iteration },
              ]);
            } else if (event.type === "tool-result") {
              setToolCalls((prev) => {
                const updated = [...prev];
                const idx = updated.findIndex(
                  (tc) => tc.name === event.name && tc.output === undefined
                );
                if (idx >= 0) {
                  updated[idx] = {
                    ...updated[idx],
                    output: event.output,
                    durationMs: event.durationMs,
                  };
                }
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
          if (data.toolCalls) {
            setToolCalls(data.toolCalls.map((tc: { name: string; input: Record<string, unknown>; output: string }, _i: number) => ({
              ...tc,
              iteration: 0,
              durationMs: 0,
            })));
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsStreaming(false);
      }
    },
    [agentName]
  );

  return { send, stop, messages, isStreaming, cost, usage, error, toolCalls };
}

/**
 * Infer the chat messages array type from a `useAgent` hook result.
 *
 * @example
 * const agent = useAgent('my-agent');
 * type MyMessages = InferChatMessages<typeof agent>;
 * // MyMessages = AgentMessage[]
 *
 * // Or use directly:
 * const [messages, setMessages] = useState<InferChatMessages<ReturnType<typeof useAgent>>>([]);
 */
export type InferChatMessages<T extends { messages: AgentMessage[] }> = T["messages"];
