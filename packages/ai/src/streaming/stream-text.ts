export async function streamToString(stream: AsyncIterable<string>): Promise<string> {
  let result = '';
  for await (const chunk of stream) {
    result += chunk;
  }
  return result;
}

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

export async function* transformStream(
  stream: AsyncIterable<string>,
  transform: (chunk: string) => string
): AsyncIterable<string> {
  for await (const chunk of stream) {
    yield transform(chunk);
  }
}

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
