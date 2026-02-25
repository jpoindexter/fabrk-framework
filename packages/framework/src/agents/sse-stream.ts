export type SSEEvent =
  | { type: "text"; content: string }
  | {
      type: "usage";
      promptTokens: number;
      completionTokens: number;
      cost: number;
    }
  | { type: "done" }
  | { type: "error"; message: string };

export function formatSSEEvent(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function createSSEStream(
  generator: () => AsyncGenerator<SSEEvent, void, unknown>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generator()) {
          controller.enqueue(encoder.encode(formatSSEEvent(event)));
        }
      } catch (err) {
        const errorEvent: SSEEvent = { type: "error", message: String(err) };
        controller.enqueue(encoder.encode(formatSSEEvent(errorEvent)));
      } finally {
        controller.close();
      }
    },
  });
}

export function createSSEResponse(
  generator: () => AsyncGenerator<SSEEvent, void, unknown>
): Response {
  return new Response(createSSEStream(generator), {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
