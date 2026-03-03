"use client";

import { useState, useCallback, useRef } from "react";

export interface UseObjectOptions<T> {
  /** API endpoint that streams the object (must return SSE or JSON) */
  api: string;
  /** Called when the full object is received */
  onFinish?: (object: T) => void;
}

export function useObject<T>(options: UseObjectOptions<T>) {
  const [object, setObject] = useState<Partial<T> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const submit = useCallback(
    async (input: unknown) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setError(null);
      setIsLoading(true);
      setObject(null);

      try {
        const res = await fetch(options.api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: abortControllerRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          setError((err as { error?: string }).error ?? "Request failed");
          return;
        }

        const contentType = res.headers.get("Content-Type") ?? "";

        if (contentType.includes("text/event-stream") && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const json = line.slice("data: ".length);
                let event: { type: string; text?: string; object?: T };
                try { event = JSON.parse(json); } catch { continue; }

                if (event.type === "delta" && event.text) {
                  accumulated += event.text;
                  try {
                    // Progressive update — only if accumulated is valid JSON so far
                    const partial = JSON.parse(accumulated) as Partial<T>;
                    setObject(partial);
                  } catch { /* keep accumulating */ }
                } else if (event.type === "done" && event.object) {
                  setObject(event.object as Partial<T>);
                  options.onFinish?.(event.object);
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        } else {
          const data = await res.json() as { object?: T };
          if (data.object) {
            setObject(data.object as Partial<T>);
            options.onFinish?.(data.object);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.api, options.onFinish]
  );

  return { submit, stop, object, isLoading, error };
}
