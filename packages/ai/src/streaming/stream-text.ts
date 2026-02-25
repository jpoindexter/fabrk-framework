/**
 * Streaming Utilities
 *
 * Helpers for working with AI text streams.
 *
 * @example
 * ```ts
 * import { streamToString, parseStreamChunks, createTextStream } from '@fabrk/ai'
 *
 * // Consume a stream to string
 * const text = await streamToString(stream)
 *
 * // Process stream chunks with callbacks
 * await parseStreamChunks(stream, {
 *   onChunk: (chunk) => console.log(chunk),
 *   onDone: (full) => console.log('Complete:', full),
 * })
 * ```
 */

/**
 * Consume an async iterable stream into a single string
 */
export async function streamToString(stream: AsyncIterable<string>): Promise<string> {
  let result = '';
  for await (const chunk of stream) {
    result += chunk;
  }
  return result;
}

/**
 * Process stream chunks with callbacks
 */
export async function parseStreamChunks(
  stream: AsyncIterable<string>,
  options: {
    onChunk?: (chunk: string, accumulated: string) => void;
    onDone?: (fullText: string) => void;
    onError?: (error: Error) => void;
  }
): Promise<string> {
  let accumulated = '';
  try {
    for await (const chunk of stream) {
      accumulated += chunk;
      options.onChunk?.(chunk, accumulated);
    }
    options.onDone?.(accumulated);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    options.onError?.(error);
    throw error;
  }
  return accumulated;
}

/**
 * Create an async iterable text stream from a string (useful for testing)
 */
export function createTextStream(
  text: string,
  options?: { chunkSize?: number; delayMs?: number }
): AsyncIterable<string> {
  const chunkSize = options?.chunkSize ?? 10;
  const delayMs = options?.delayMs ?? 0;

  return {
    async *[Symbol.asyncIterator]() {
      for (let i = 0; i < text.length; i += chunkSize) {
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        yield text.slice(i, i + chunkSize);
      }
    },
  };
}

/**
 * Concatenate multiple async iterable streams into one (sequential, not concurrent).
 * Each stream is fully exhausted before the next one begins.
 *
 * Note: despite the name "merge" being common parlance, this function concatenates
 * streams in order. True merging (interleaved concurrent consumption) is not
 * implemented here.
 */
export async function* concatStreams(
  ...streams: AsyncIterable<string>[]
): AsyncIterable<string> {
  for (const stream of streams) {
    for await (const chunk of stream) {
      yield chunk;
    }
  }
}

/**
 * Transform stream chunks (e.g., for SSE formatting)
 */
export async function* transformStream(
  stream: AsyncIterable<string>,
  transform: (chunk: string) => string
): AsyncIterable<string> {
  for await (const chunk of stream) {
    yield transform(chunk);
  }
}

/**
 * Convert an async iterable to a ReadableStream (for Response objects)
 */
export function toReadableStream(stream: AsyncIterable<string>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

/**
 * Convert a ReadableStream back to an async iterable
 */
export async function* fromReadableStream(
  stream: ReadableStream<Uint8Array>
): AsyncIterable<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}
