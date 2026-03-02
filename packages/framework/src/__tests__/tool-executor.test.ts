import { describe, it, expect } from "vitest";
import { createToolExecutor } from "../agents/tool-executor";
import type { ToolDefinition } from "../tools/define-tool";

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: "test-tool",
    description: "A test tool",
    schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    handler: async (input) => ({
      content: [{ type: "text", text: `Result for: ${input.query}` }],
    }),
    ...overrides,
  };
}

describe("createToolExecutor", () => {
  it("executes a known tool and returns output + duration", async () => {
    const executor = createToolExecutor([makeTool()]);
    const { output, durationMs } = await executor.execute("test-tool", { query: "hello" });
    expect(output).toBe("Result for: hello");
    expect(durationMs).toBeGreaterThanOrEqual(0);
  });

  it("rejects unknown tool names", async () => {
    const executor = createToolExecutor([makeTool()]);
    await expect(executor.execute("unknown", {})).rejects.toThrow("Unknown tool: unknown");
  });

  it("validates required input fields", async () => {
    const executor = createToolExecutor([makeTool()]);
    await expect(executor.execute("test-tool", {})).rejects.toThrow("Missing required field: query");
  });

  it("enforces timeout on slow tools", async () => {
    const slowTool = makeTool({
      handler: () => new Promise((resolve) => setTimeout(() => resolve({
        content: [{ type: "text", text: "done" }],
      }), 60_000)),
    });
    const executor = createToolExecutor([slowTool]);
    await expect(executor.execute("test-tool", { query: "hi" })).rejects.toThrow("timed out");
  }, 35_000);

  it("truncates output exceeding 50K chars", async () => {
    const bigTool = makeTool({
      handler: async () => ({
        content: [{ type: "text", text: "x".repeat(60_000) }],
      }),
    });
    const executor = createToolExecutor([bigTool]);
    const { output } = await executor.execute("test-tool", { query: "big" });
    expect(output.length).toBeLessThanOrEqual(50_020);
    expect(output).toContain("[truncated]");
  });

  it("generates LLM-compatible tool schemas", () => {
    const executor = createToolExecutor([makeTool()]);
    const schemas = executor.toLLMSchema();
    expect(schemas).toHaveLength(1);
    expect(schemas[0].type).toBe("function");
    expect(schemas[0].function.name).toBe("test-tool");
    expect(schemas[0].function.description).toBe("A test tool");
  });

  it("resolves tools by name in the map", () => {
    const executor = createToolExecutor([
      makeTool({ name: "alpha" }),
      makeTool({ name: "beta" }),
    ]);
    expect(executor.resolvedTools.has("alpha")).toBe(true);
    expect(executor.resolvedTools.has("beta")).toBe(true);
    expect(executor.resolvedTools.has("gamma")).toBe(false);
  });
});
