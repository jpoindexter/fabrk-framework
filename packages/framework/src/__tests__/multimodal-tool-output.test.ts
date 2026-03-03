import { describe, it, expect } from "vitest";
import type { TextPart, ImagePart, FilePart, ToolOutputPart, ToolResult } from "../index.js";
import { runAgentLoop, type AgentLoopEvent } from "../agents/agent-loop";
import { createToolExecutor } from "../agents/tool-executor";
import type { ToolDefinition } from "../tools/define-tool";

// TypeScript type assertions — constructing typed objects validates at compile time.

describe("Multimodal Tool Output — TextPart (backward compat)", () => {
  it("ToolResult with TextPart is structurally identical to the old format", () => {
    const result: ToolResult = {
      content: [{ type: "text", text: "hello" }],
    };
    expect(result.content).toHaveLength(1);
    const part = result.content[0] as TextPart;
    expect(part.type).toBe("text");
    expect(part.text).toBe("hello");
  });

  it("accepts multiple TextParts in content array", () => {
    const result: ToolResult = {
      content: [
        { type: "text", text: "first" },
        { type: "text", text: "second" },
      ],
    };
    expect(result.content).toHaveLength(2);
  });
});

describe("Multimodal Tool Output — ImagePart", () => {
  it("constructs a valid ImagePart with png mediaType", () => {
    const part: ImagePart = {
      type: "image",
      data: "base64encodeddata==",
      mediaType: "image/png",
    };
    expect(part.type).toBe("image");
    expect(part.mediaType).toBe("image/png");
    expect(part.data).toBe("base64encodeddata==");
  });

  it("constructs a valid ImagePart with jpeg mediaType", () => {
    const part: ImagePart = {
      type: "image",
      data: "somejpegdata==",
      mediaType: "image/jpeg",
    };
    expect(part.mediaType).toBe("image/jpeg");
  });

  it("constructs a valid ImagePart with gif mediaType", () => {
    const part: ImagePart = {
      type: "image",
      data: "gifdata==",
      mediaType: "image/gif",
    };
    expect(part.mediaType).toBe("image/gif");
  });

  it("constructs a valid ImagePart with webp mediaType", () => {
    const part: ImagePart = {
      type: "image",
      data: "webpdata==",
      mediaType: "image/webp",
    };
    expect(part.mediaType).toBe("image/webp");
  });

  it("ToolResult accepts ImagePart in content array", () => {
    const result: ToolResult = {
      content: [
        {
          type: "image",
          data: "abc123==",
          mediaType: "image/png",
        },
      ],
    };
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("image");
  });
});

describe("Multimodal Tool Output — FilePart", () => {
  it("constructs a valid FilePart", () => {
    const part: FilePart = {
      type: "file",
      name: "report.pdf",
      data: "pdfbase64data==",
      mediaType: "application/pdf",
    };
    expect(part.type).toBe("file");
    expect(part.name).toBe("report.pdf");
    expect(part.mediaType).toBe("application/pdf");
  });

  it("ToolResult accepts FilePart in content array", () => {
    const result: ToolResult = {
      content: [
        {
          type: "file",
          name: "data.csv",
          data: "csvbase64==",
          mediaType: "text/csv",
        },
      ],
    };
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("file");
  });
});

describe("Multimodal Tool Output — mixed arrays", () => {
  it("mixed [TextPart, ImagePart] array is a valid ToolOutputPart[]", () => {
    const parts: ToolOutputPart[] = [
      { type: "text", text: "Here is the screenshot:" },
      { type: "image", data: "screenshotdata==", mediaType: "image/png" },
    ];
    expect(parts).toHaveLength(2);
    expect(parts[0].type).toBe("text");
    expect(parts[1].type).toBe("image");
  });

  it("mixed [TextPart, FilePart] array is a valid ToolOutputPart[]", () => {
    const parts: ToolOutputPart[] = [
      { type: "text", text: "Attached file:" },
      { type: "file", name: "output.txt", data: "filedata==", mediaType: "text/plain" },
    ];
    expect(parts).toHaveLength(2);
    expect(parts[1].type).toBe("file");
  });

  it("ToolResult with mixed TextPart + ImagePart + FilePart is valid", () => {
    const result: ToolResult = {
      content: [
        { type: "text", text: "Analysis complete." },
        { type: "image", data: "chartdata==", mediaType: "image/jpeg" },
        { type: "file", name: "raw.json", data: "jsondata==", mediaType: "application/json" },
      ],
    };
    expect(result.content).toHaveLength(3);
  });
});

describe("Multimodal Tool Output — agent loop runtime (no throw)", () => {
  it("passing an ImagePart in tool output does not throw", async () => {
    const imageTool: ToolDefinition = {
      name: "screenshot",
      description: "Take a screenshot",
      schema: { type: "object", properties: {} },
      handler: async () => ({
        content: [
          { type: "image", data: "fakebase64==", mediaType: "image/png" },
        ],
      }),
    };

    const executor = createToolExecutor([imageTool]);
    let callCount = 0;
    const events: AgentLoopEvent[] = [];

    for await (const event of runAgentLoop({
      messages: [{ role: "user", content: "Take a screenshot" }],
      toolExecutor: executor,
      toolSchemas: executor.toLLMSchema(),
      agentName: "test",
      sessionId: "multimodal-s1",
      model: "test-model",
      stream: false,
      generateWithTools: async () => {
        callCount++;
        if (callCount === 1) {
          return {
            content: null,
            toolCalls: [{ id: "tc1", name: "screenshot", arguments: {} }],
            usage: { promptTokens: 5, completionTokens: 5 },
          };
        }
        return {
          content: "Screenshot taken.",
          usage: { promptTokens: 10, completionTokens: 10 },
        };
      },
      calculateCost: (_m: string, _p: number, _c: number) => ({ costUSD: 0.001 }),
    })) {
      events.push(event);
    }

    // Should complete without throwing
    expect(events.some((e) => e.type === "done")).toBe(true);
    expect(events.some((e) => e.type === "tool-call")).toBe(true);
    expect(events.some((e) => e.type === "tool-result")).toBe(true);
  });

  it("passing a FilePart in tool output does not throw", async () => {
    const fileTool: ToolDefinition = {
      name: "export",
      description: "Export data as file",
      schema: { type: "object", properties: {} },
      handler: async () => ({
        content: [
          { type: "file", name: "export.csv", data: "csvdata==", mediaType: "text/csv" },
        ],
      }),
    };

    const executor = createToolExecutor([fileTool]);
    let callCount = 0;
    const events: AgentLoopEvent[] = [];

    for await (const event of runAgentLoop({
      messages: [{ role: "user", content: "Export data" }],
      toolExecutor: executor,
      toolSchemas: executor.toLLMSchema(),
      agentName: "test",
      sessionId: "multimodal-s2",
      model: "test-model",
      stream: false,
      generateWithTools: async () => {
        callCount++;
        if (callCount === 1) {
          return {
            content: null,
            toolCalls: [{ id: "tc2", name: "export", arguments: {} }],
            usage: { promptTokens: 5, completionTokens: 5 },
          };
        }
        return {
          content: "Exported.",
          usage: { promptTokens: 10, completionTokens: 10 },
        };
      },
      calculateCost: (_m: string, _p: number, _c: number) => ({ costUSD: 0.001 }),
    })) {
      events.push(event);
    }

    expect(events.some((e) => e.type === "done")).toBe(true);
  });
});

describe("Multimodal Tool Output — exports from index", () => {
  it("TextPart, ImagePart, FilePart, ToolOutputPart are exported from the package index", () => {
    // This test validates the imports at the top of this file compile correctly.
    // If the types are not exported, TypeScript compilation fails.
    const textPart: TextPart = { type: "text", text: "test" };
    const imagePart: ImagePart = { type: "image", data: "d==", mediaType: "image/png" };
    const filePart: FilePart = { type: "file", name: "f.txt", data: "d==", mediaType: "text/plain" };
    const outputParts: ToolOutputPart[] = [textPart, imagePart, filePart];
    expect(outputParts).toHaveLength(3);
  });
});
