import { describe, it, expect } from "vitest";
import { buildMcpTools } from "../tools/mcp-dev-server";
import { defineTool, textResult } from "../tools/define-tool";

describe("buildMcpTools", () => {
  it("converts framework tool definitions to MCP format", () => {
    const tools = [
      defineTool({
        name: "search-docs",
        description: "Search documentation",
        schema: {
          type: "object" as const,
          properties: {
            query: { type: "string", description: "Search query" },
          },
          required: ["query"],
        },
        handler: async (input) => textResult(`Results for: ${input.query}`),
      }),
    ];

    const mcpTools = buildMcpTools(tools);
    expect(mcpTools).toHaveLength(1);
    expect(mcpTools[0].name).toBe("search-docs");
    expect(mcpTools[0].description).toBe("Search documentation");
    expect(mcpTools[0].inputSchema).toEqual({
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    });
  });

  it("converts multiple tools", () => {
    const tools = [
      defineTool({
        name: "tool-a",
        description: "Tool A",
        schema: { type: "object" as const, properties: {} },
        handler: async () => textResult("a"),
      }),
      defineTool({
        name: "tool-b",
        description: "Tool B",
        schema: { type: "object" as const, properties: {} },
        handler: async () => textResult("b"),
      }),
    ];

    const mcpTools = buildMcpTools(tools);
    expect(mcpTools).toHaveLength(2);
    expect(mcpTools.map((t) => t.name)).toEqual(["tool-a", "tool-b"]);
  });

  it("preserves handler functionality", async () => {
    const tools = [
      defineTool({
        name: "echo",
        description: "Echo",
        schema: { type: "object" as const, properties: {} },
        handler: async () => textResult("hello"),
      }),
    ];

    const mcpTools = buildMcpTools(tools);
    const result = await mcpTools[0].handler({});
    expect(result.content[0].text).toBe("hello");
  });
});
