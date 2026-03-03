import type { LLMMessage, JsonSchema } from "@fabrk/ai";
import { streamObject } from "@fabrk/ai";
import type { LLMConfig } from "@fabrk/ai";
import { buildSecurityHeaders } from "../middleware/security";

/**
 * Server-side handler that runs streamObject and returns an SSE Response.
 * Use in your API route to back the useObject() client hook.
 *
 * @example
 * // In your API route handler:
 * export async function POST(req: Request) {
 *   const { messages } = await req.json();
 *   return handleStreamObject(messages, mySchema, { provider: "openai" });
 * }
 */
export async function handleStreamObject<T = unknown>(
  messages: LLMMessage[],
  schema: JsonSchema,
  config: Partial<LLMConfig> = {}
): Promise<Response> {
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    ...buildSecurityHeaders(),
  };

  const encoder = new TextEncoder();

  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamObject<T>(messages, schema, config)) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } catch (err) {
        const errEvent = { type: "error", message: err instanceof Error ? err.message : "Internal error" };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errEvent)}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, { status: 200, headers });
}
