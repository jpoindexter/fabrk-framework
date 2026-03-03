import { describe, it, expect } from "vitest";
import { createMCPServer } from "../tools/mcp/server";
import type { MCPResource, MCPPromptDef } from "../tools/mcp/server";

function makeResource(uri: string, content = "content"): MCPResource {
  return {
    uri,
    name: uri,
    description: `Resource ${uri}`,
    mimeType: "text/plain",
    read: async () => content,
  };
}

function makePrompt(name: string, response = "rendered"): MCPPromptDef {
  return {
    name,
    description: `Prompt ${name}`,
    arguments: [{ name: "input", required: false }],
    handler: (_args) => response,
  };
}

describe("MCP resources", () => {
  it("resources/list returns empty array when no resources configured", async () => {
    const server = createMCPServer({ name: "s", version: "1", tools: [] });
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "resources/list",
    }) as { result?: { resources: unknown[] } };
    expect(result.result?.resources).toEqual([]);
  });

  it("resources/list returns configured resources", async () => {
    const server = createMCPServer({
      name: "s",
      version: "1",
      tools: [],
      resources: [makeResource("file://a"), makeResource("file://b")],
    });
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "resources/list",
    }) as { result?: { resources: Array<{ uri: string }> } };
    expect(result.result?.resources).toHaveLength(2);
    expect(result.result?.resources.map((r) => r.uri)).toContain("file://a");
  });

  it("resources/read returns resource content", async () => {
    const server = createMCPServer({
      name: "s",
      version: "1",
      tools: [],
      resources: [makeResource("file://doc", "hello world")],
    });
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "resources/read",
      params: { uri: "file://doc" },
    }) as { result?: { contents: Array<{ text: string }> } };
    expect(result.result?.contents[0].text).toBe("hello world");
  });

  it("resources/read returns error for unknown uri", async () => {
    const server = createMCPServer({ name: "s", version: "1", tools: [] });
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 4,
      method: "resources/read",
      params: { uri: "file://nope" },
    }) as { error?: { code: number } };
    expect(result.error?.code).toBe(-32602);
  });

  it("initialize capabilities includes resources when resources configured", async () => {
    const server = createMCPServer({
      name: "s",
      version: "1",
      tools: [],
      resources: [makeResource("file://x")],
    });
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 5,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {} },
    }) as { result?: { capabilities: Record<string, unknown> } };
    expect(result.result?.capabilities).toHaveProperty("resources");
  });

  it("initialize capabilities omits resources when none configured", async () => {
    const server = createMCPServer({ name: "s", version: "1", tools: [] });
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 6,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {} },
    }) as { result?: { capabilities: Record<string, unknown> } };
    expect(result.result?.capabilities).not.toHaveProperty("resources");
  });
});

describe("MCP prompts", () => {
  it("prompts/list returns empty array when no prompts configured", async () => {
    const server = createMCPServer({ name: "s", version: "1", tools: [] });
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 10,
      method: "prompts/list",
    }) as { result?: { prompts: unknown[] } };
    expect(result.result?.prompts).toEqual([]);
  });

  it("prompts/list returns configured prompts", async () => {
    const server = createMCPServer({
      name: "s",
      version: "1",
      tools: [],
      prompts: [makePrompt("greet"), makePrompt("summarize")],
    });
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 11,
      method: "prompts/list",
    }) as { result?: { prompts: Array<{ name: string }> } };
    expect(result.result?.prompts).toHaveLength(2);
    expect(result.result?.prompts.map((p) => p.name)).toContain("greet");
  });

  it("prompts/get returns rendered prompt message", async () => {
    const server = createMCPServer({
      name: "s",
      version: "1",
      tools: [],
      prompts: [makePrompt("greet", "Hello, friend!")],
    });
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 12,
      method: "prompts/get",
      params: { name: "greet", arguments: {} },
    }) as { result?: { messages: Array<{ role: string; content: { text: string } }> } };
    expect(result.result?.messages[0].role).toBe("user");
    expect(result.result?.messages[0].content.text).toBe("Hello, friend!");
  });

  it("prompts/get returns error for unknown prompt name", async () => {
    const server = createMCPServer({ name: "s", version: "1", tools: [] });
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 13,
      method: "prompts/get",
      params: { name: "nonexistent", arguments: {} },
    }) as { error?: { code: number } };
    expect(result.error?.code).toBe(-32602);
  });

  it("initialize capabilities includes prompts when prompts configured", async () => {
    const server = createMCPServer({
      name: "s",
      version: "1",
      tools: [],
      prompts: [makePrompt("greet")],
    });
    const result = await server.handleRequest({
      jsonrpc: "2.0",
      id: 14,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {} },
    }) as { result?: { capabilities: Record<string, unknown> } };
    expect(result.result?.capabilities).toHaveProperty("prompts");
  });
});
