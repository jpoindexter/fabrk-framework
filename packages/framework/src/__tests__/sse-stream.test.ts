import { describe, it, expect } from "vitest";
import {
  createSSEStream,
  createSSEResponse,
  formatSSEEvent,
} from "../agents/sse-stream.js";

describe("SSE stream utilities", () => {
  it("formats a text event", () => {
    const event = formatSSEEvent({ type: "text", content: "Hello" });
    expect(event).toBe('data: {"type":"text","content":"Hello"}\n\n');
  });

  it("formats a usage event", () => {
    const event = formatSSEEvent({
      type: "usage",
      promptTokens: 10,
      completionTokens: 5,
      cost: 0.001,
    });
    expect(event).toContain('"type":"usage"');
    expect(event).toContain('"cost":0.001');
  });

  it("formats a done event", () => {
    const event = formatSSEEvent({ type: "done" });
    expect(event).toBe('data: {"type":"done"}\n\n');
  });

  it("formats an error event", () => {
    const event = formatSSEEvent({ type: "error", message: "fail" });
    expect(event).toContain('"type":"error"');
    expect(event).toContain('"message":"fail"');
  });

  it("createSSEStream returns a ReadableStream", () => {
    const stream = createSSEStream(async function* () {
      yield { type: "text" as const, content: "Hi" };
      yield { type: "done" as const };
    });
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it("createSSEResponse returns Response with correct headers", () => {
    const res = createSSEResponse(async function* () {
      yield { type: "done" as const };
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
  });

  it("streams events through ReadableStream", async () => {
    const stream = createSSEStream(async function* () {
      yield { type: "text" as const, content: "Hello" };
      yield { type: "text" as const, content: " world" };
      yield { type: "done" as const };
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value));
    }

    const output = chunks.join("");
    expect(output).toContain('"content":"Hello"');
    expect(output).toContain('"content":" world"');
    expect(output).toContain('"type":"done"');
  });
});
