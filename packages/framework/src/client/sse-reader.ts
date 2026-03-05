"use client";

/**
 * Yields raw SSE lines from a ReadableStream, handling buffering across chunks.
 * Releases the reader lock when done (whether by completion or error).
 */
export async function* readSSELines(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      yield* lines;
    }
  } finally {
    reader.releaseLock();
  }
}
