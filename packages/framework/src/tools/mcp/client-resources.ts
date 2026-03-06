import type { ToolDefinition } from "../define-tool";
import type { MCPConnection, MCPClientOptions } from "./client-types";
import { MCPClientError } from "./client-types";
import { OAuth2TokenCache } from "./client-auth";
import { parseResponse } from "./client-http";

const MAX_TOOLS_PER_SERVER = 256;

export function validateToolName(name: unknown): string {
  if (typeof name !== "string" || name.length === 0) {
    throw new MCPClientError("MCP server returned a tool with an empty or non-string name");
  }
  if (name.length > 128) {
    throw new MCPClientError(`MCP server returned a tool name exceeding 128 chars: "${name.slice(0, 32)}..."`);
  }
  if (!/^[\w.-]+$/.test(name)) {
    throw new MCPClientError(`MCP server returned a tool name with invalid characters: "${name}"`);
  }
  return name;
}

export function sanitizeToolDescription(description: unknown): string {
  if (typeof description !== "string") return "";
  // eslint-disable-next-line no-control-regex -- sanitizing control chars from untrusted MCP server output
  const cleaned = description.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return cleaned.slice(0, 2_000);
}

export async function connectHTTP(
  url: string,
  timeout: number,
  opts: Pick<MCPClientOptions, "auth" | "elicitation">
): Promise<MCPConnection> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const tokenCache = opts.auth?.type === "oauth2" ? new OAuth2TokenCache() : null;

  async function getAuthHeader(): Promise<string | null> {
    if (!opts.auth) return null;
    if (opts.auth.type === "bearer") {
      if (!opts.auth.token) throw new MCPClientError("Bearer token must not be empty");
      return `Bearer ${opts.auth.token}`;
    }
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
      redirect: "error",
    });

    if (!res.ok) throw new Error(`MCP HTTP error: ${res.status}`);
    return parseResponse(res, authHeader, url, opts);
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

  const tools = await fetchTools(rpcCall);
  return buildConnection(tools, timer, controller, rpcCall);
}

function buildConnection(
  tools: ToolDefinition[],
  timer: ReturnType<typeof setTimeout>,
  controller: AbortController,
  rpcCall: (method: string, params?: Record<string, unknown>) => Promise<unknown>
): MCPConnection {
  return {
    tools,
    disconnect: async () => { clearTimeout(timer); controller.abort(); },
    listResources: async () => {
      try {
        const r = await rpcCall("resources/list") as { resources?: Array<{ uri: string; name: string; description?: string; mimeType?: string }> };
        return r.resources ?? [];
      } catch (err) {
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
          console.warn('[fabrk] failed to list MCP resources:', err);
        }
        return [];
      }
    },
    readResource: async (uri: string) => {
      const r = await rpcCall("resources/read", { uri }) as { contents?: Array<{ text?: string }> };
      return r.contents?.[0]?.text ?? "";
    },
    listPrompts: async () => {
      try {
        const r = await rpcCall("prompts/list") as { prompts?: Array<{ name: string; description?: string }> };
        return r.prompts ?? [];
      } catch (err) {
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
          console.warn('[fabrk] failed to list MCP prompts:', err);
        }
        return [];
      }
    },
    getPrompt: async (name: string, args?: Record<string, string>) => {
      const r = await rpcCall("prompts/get", { name, arguments: args ?? {} }) as {
        messages?: Array<{ content?: { text?: string } }>
      };
      return r.messages?.[0]?.content?.text ?? "";
    },
  };
}

async function fetchTools(rpcCall: (method: string, params?: Record<string, unknown>) => Promise<unknown>): Promise<ToolDefinition[]> {
  const listResult = await rpcCall("tools/list") as {
    tools?: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>;
  };

  const rawTools = listResult.tools ?? [];
  if (rawTools.length > MAX_TOOLS_PER_SERVER) {
    throw new MCPClientError(
      `MCP server returned ${rawTools.length} tools, exceeding the limit of ${MAX_TOOLS_PER_SERVER}`
    );
  }

  return rawTools.map((t) => ({
    name: validateToolName(t.name),
    description: sanitizeToolDescription(t.description),
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
}
