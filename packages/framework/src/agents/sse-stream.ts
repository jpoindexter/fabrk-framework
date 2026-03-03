import { buildSecurityHeaders } from "../middleware/security";

export type SSEEvent =
  | { type: "text"; content: string }
  | { type: "text-delta"; content: string }
  | { type: "tool-call"; name: string; input: Record<string, unknown>; iteration: number }
  | { type: "tool-result"; name: string; output: string; durationMs: number; iteration: number }
  | {
      type: "usage";
      promptTokens: number;
      completionTokens: number;
      cost: number;
    }
  | { type: "done" }
  | { type: "error"; message: string }
  | { type: "approval-required"; toolName: string; input: Record<string, unknown>; approvalId: string; iteration: number }
  | { type: "handoff"; targetAgent: string; input: string; iteration: number };

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
        console.error("[fabrk] SSE stream error:", err);
        const errorEvent: SSEEvent = { type: "error", message: "Stream error" };
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
      ...buildSecurityHeaders(),
    },
  });
}
