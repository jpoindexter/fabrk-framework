import type { ToolDefinition } from "../define-tool";
import { createStdioClient } from "./stdio-transport";

export interface MCPConnection {
  tools: ToolDefinition[];
  disconnect: () => Promise<void>;
  listResources: () => Promise<Array<{ uri: string; name: string; description?: string; mimeType?: string }>>;
  readResource: (uri: string) => Promise<string>;
  listPrompts: () => Promise<Array<{ name: string; description?: string }>>;
  getPrompt: (name: string, args?: Record<string, string>) => Promise<string>;
}

export interface MCPClientOptions {
  url?: string;
  command?: string;
  args?: string[];
  transport: "http" | "stdio";
  timeout?: number;
}

async function connectHTTP(
  url: string,
  timeout: number
): Promise<MCPConnection> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  async function rpcCall(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`MCP HTTP error: ${res.status}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(`MCP error: ${data.error.message}`);
    }
    return data.result;
  }

  try {
    await rpcCall("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "fabrk", version: "0.2.0" },
    });
  } finally {
    clearTimeout(timer);
  }

  const listResult = await rpcCall("tools/list") as {
    tools?: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>;
  };

  const tools: ToolDefinition[] = (listResult.tools ?? []).map((t) => ({
    name: t.name,
    description: t.description,
    schema: (t.inputSchema ?? { type: "object", properties: {} }) as ToolDefinition["schema"],
    handler: async (input: Record<string, unknown>) => {
      const callResult = await rpcCall("tools/call", { name: t.name, arguments: input }) as {
        content?: Array<{ type: string; text?: string }>;
      };
      const text = callResult.content
        ?.filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("\n") ?? "";
      return { content: [{ type: "text" as const, text }] };
    },
  }));

  return {
    tools,
    disconnect: async () => {},
    listResources: async () => {
      try {
        const r = await rpcCall("resources/list") as { resources?: Array<{ uri: string; name: string; description?: string; mimeType?: string }> };
        return r.resources ?? [];
      } catch { return []; }
    },
    readResource: async (uri: string) => {
      const r = await rpcCall("resources/read", { uri }) as { contents?: Array<{ text?: string }> };
      return r.contents?.[0]?.text ?? "";
    },
    listPrompts: async () => {
      try {
        const r = await rpcCall("prompts/list") as { prompts?: Array<{ name: string; description?: string }> };
        return r.prompts ?? [];
      } catch { return []; }
    },
    getPrompt: async (name: string, args?: Record<string, string>) => {
      const r = await rpcCall("prompts/get", { name, arguments: args ?? {} }) as {
        messages?: Array<{ content?: { text?: string } }>
      };
      return r.messages?.[0]?.content?.text ?? "";
    },
  };
}

export async function connectMCPServer(
  options: MCPClientOptions
): Promise<MCPConnection> {
  const timeout = options.timeout ?? 30_000;

  if (options.transport === "stdio") {
    if (!options.command) {
      throw new Error("MCP stdio transport requires a command");
    }
    const result = await createStdioClient(options.command, options.args);
    return {
      ...result,
      listResources: async () => [],
      readResource: async () => "",
      listPrompts: async () => [],
      getPrompt: async () => "",
    };
  }

  if (!options.url) {
    throw new Error("MCP HTTP transport requires a URL");
  }

  // Validate URL scheme
  const parsed = new URL(options.url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Invalid MCP URL scheme: ${parsed.protocol}`);
  }

  return connectHTTP(options.url, timeout);
}
