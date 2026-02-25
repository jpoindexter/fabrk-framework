import { describe, it, expect } from "vitest";
import { defineTool, textResult } from "../tools/define-tool.js";

describe("defineTool", () => {
  it("returns a tool definition with all fields", () => {
    const tool = defineTool({
      name: "search-docs",
      description: "Search documentation",
      schema: {
        type: "object" as const,
        properties: { query: { type: "string" } },
        required: ["query"],
      },
      handler: async (input) => textResult(`Results for: ${input.query}`),
    });

    expect(tool.name).toBe("search-docs");
    expect(tool.description).toBe("Search documentation");
    expect((tool.schema.properties.query as { type: string }).type).toBe("string");
    expect(typeof tool.handler).toBe("function");
  });

  it("handler returns expected result", async () => {
    const tool = defineTool({
      name: "echo",
      description: "Echo input",
      schema: { type: "object" as const, properties: {} },
      handler: async (input) => textResult("hello"),
    });

    const result = await tool.handler({});
    expect(result).toEqual({
      content: [{ type: "text", text: "hello" }],
    });
  });
});

describe("textResult", () => {
  it("wraps string in MCP content structure", () => {
    const result = textResult("Hello world");
    expect(result).toEqual({
      content: [{ type: "text", text: "Hello world" }],
    });
  });
});
