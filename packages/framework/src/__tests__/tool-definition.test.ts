import { describe, it, expect, vi } from "vitest";
import { toolDefinition, clientTools } from "../tools/tool-definition";
import { defineTool } from "../tools/define-tool";

describe("toolDefinition builder", () => {
  it("creates a valid ToolDefinition-compatible object", () => {
    const tool = toolDefinition("search")
      .description("Search the web")
      .schema({ type: "object", properties: { query: { type: "string" } } })
      .server(async () => ({ content: [{ type: "text", text: "result" }] }))
      .build();

    expect(tool.name).toBe("search");
    expect(tool.description).toBe("Search the web");
    expect(typeof tool.handler).toBe("function");
    expect(tool.clientExposed).toBe(false);
  });

  it(".client() marks tool as client-exposed", () => {
    const tool = toolDefinition("greet")
      .description("Say hello")
      .server(async () => ({ content: [{ type: "text", text: "hi" }] }))
      .client()
      .build();

    expect(tool.clientExposed).toBe(true);
  });

  it("server handler executes correctly", async () => {
    const handler = vi
      .fn()
      .mockResolvedValue({ content: [{ type: "text", text: "found it" }] });
    const tool = toolDefinition("lookup").description("Lookup").server(handler).build();

    const result = await tool.handler({ id: "123" });
    expect(result.content[0].text).toBe("found it");
    expect(handler).toHaveBeenCalledWith({ id: "123" });
  });

  it("clientDescriptor contains name, description, schema but not handler", () => {
    const schema = {
      type: "object" as const,
      properties: { q: { type: "string" } },
    };
    const tool = toolDefinition("t")
      .description("A tool")
      .schema(schema)
      .server(async () => ({ content: [] as [] }))
      .client()
      .build();

    expect(tool.clientDescriptor.name).toBe("t");
    expect(tool.clientDescriptor.description).toBe("A tool");
    expect(tool.clientDescriptor.schema).toEqual(schema);
    expect("handler" in tool.clientDescriptor).toBe(false);
  });

  it("defaults schema to empty object schema when not provided", () => {
    const tool = toolDefinition("no-schema")
      .description("No schema")
      .server(async () => ({ content: [] as [] }))
      .build();

    expect(tool.schema).toEqual({ type: "object", properties: {} });
  });

  it("method chaining returns the same builder instance", () => {
    const builder = toolDefinition("chain");
    const afterDesc = builder.description("desc");
    const afterServer = afterDesc.server(async () => ({ content: [] as [] }));
    const afterClient = afterServer.client();

    // All should be the same object (fluent chain returns `this`)
    expect(afterDesc).toBe(builder);
    expect(afterServer).toBe(builder);
    expect(afterClient).toBe(builder);
  });
});

describe("clientTools", () => {
  it("returns only client-exposed tools", () => {
    const serverOnly = toolDefinition("server-only")
      .description("Server only")
      .server(async () => ({ content: [] as [] }))
      .build();
    const clientExposed = toolDefinition("client-exposed")
      .description("Client exposed")
      .server(async () => ({ content: [] as [] }))
      .client()
      .build();

    const descriptors = clientTools([serverOnly, clientExposed]);
    expect(descriptors).toHaveLength(1);
    expect(descriptors[0].name).toBe("client-exposed");
  });

  it("returns empty array when no client-exposed tools", () => {
    const t = toolDefinition("t")
      .description("t")
      .server(async () => ({ content: [] as [] }))
      .build();
    expect(clientTools([t])).toEqual([]);
  });

  it("accepts plain ToolDefinition objects without crashing", () => {
    const plain = defineTool({
      name: "plain",
      description: "plain tool",
      schema: { type: "object", properties: {} },
      handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
    });
    expect(clientTools([plain])).toEqual([]);
  });

  it("works with mixed arrays of ToolDefinition and IsomorphicToolDefinition", () => {
    const plain = defineTool({
      name: "plain",
      description: "plain",
      schema: { type: "object", properties: {} },
      handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
    });
    const iso = toolDefinition("iso")
      .description("iso")
      .server(async () => ({ content: [] as [] }))
      .client()
      .build();

    const result = clientTools([plain, iso]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("iso");
  });

  it("preserves descriptor shape — no handler field", () => {
    const tool = toolDefinition("safe")
      .description("Safe tool")
      .schema({ type: "object", properties: { x: { type: "number" } }, required: ["x"] })
      .server(async () => ({ content: [{ type: "text", text: "done" }] }))
      .client()
      .build();

    const [descriptor] = clientTools([tool]);
    expect(descriptor).toEqual({
      name: "safe",
      description: "Safe tool",
      schema: { type: "object", properties: { x: { type: "number" } }, required: ["x"] },
    });
    expect("handler" in descriptor).toBe(false);
  });

  it("returns empty array for empty input", () => {
    expect(clientTools([])).toEqual([]);
  });
});
