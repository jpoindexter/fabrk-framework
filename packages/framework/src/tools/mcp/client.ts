import type { ToolDefinition } from "../define-tool";
import { createStdioClient } from "./stdio-transport";

export class MCPClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MCPClientError";
  }
}

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
  auth?:
    | { type: "bearer"; token: string }
    | { type: "oauth2"; clientId: string; clientSecret?: string; tokenUrl: string; scopes?: string[] };
  elicitation?: (prompt: string, schema: Record<string, unknown>) => Promise<unknown>;
}

export class OAuth2TokenCache {
  private token: string | null = null;
  private expiresAt = 0;

  async getToken(opts: {
    clientId: string;
    clientSecret?: string;
    tokenUrl: string;
    scopes?: string[];
  }): Promise<string> {
    if (this.token && Date.now() < this.expiresAt - 60_000) {
      return this.token;
    }

    const body = new URLSearchParams({ grant_type: "client_credentials", client_id: opts.clientId });
    if (opts.clientSecret) body.set("client_secret", opts.clientSecret);
    if (opts.scopes?.length) body.set("scope", opts.scopes.join(" "));

    const resp = await fetch(opts.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!resp.ok) throw new MCPClientError(`OAuth2 token fetch failed: ${resp.status}`);

    const data = await resp.json() as { access_token: string; expires_in?: number };
    this.token = data.access_token;
    this.expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
    return this.token;
  }
}

async function connectHTTP(
  url: string,
  timeout: number,
  opts: Pick<MCPClientOptions, "auth" | "elicitation">
): Promise<MCPConnection> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const tokenCache = opts.auth?.type === "oauth2" ? new OAuth2TokenCache() : null;

  async function getAuthHeader(): Promise<string | null> {
    if (!opts.auth) return null;
    if (opts.auth.type === "bearer") return `Bearer ${opts.auth.token}`;
    if (opts.auth.type === "oauth2") {
      const token = await tokenCache!.getToken(opts.auth);
      return `Bearer ${token}`;
    }
    return null;
  }

  async function rpcCall(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const authHeader = await getAuthHeader();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authHeader) headers["Authorization"] = authHeader;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`MCP HTTP error: ${res.status}`);
    }

    const data = await res.json() as {
      result?: unknown;
      error?: { message: string };
      method?: string;
      params?: { prompt?: string; schema?: Record<string, unknown> };
    };

    // Handle elicitation/create server-initiated message
    if (data.method === "elicitation/create" && opts.elicitation) {
      const prompt = data.params?.prompt ?? "";
      const schema = data.params?.schema ?? {};
      const result = await opts.elicitation(prompt, schema);
      // Send elicitation/respond back — fire-and-forget, no await needed for the round-trip
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeader ? { Authorization: authHeader } : {}) },
        body: JSON.stringify({ jsonrpc: "2.0", method: "elicitation/respond", params: { result } }),
      }).catch(() => {});
      return {};
    }

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

  return connectHTTP(options.url, timeout, { auth: options.auth, elicitation: options.elicitation });
}
