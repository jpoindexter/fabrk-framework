import type { ToolDefinition } from "../define-tool";
import { createStdioClient } from "./stdio-transport";

export class MCPClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MCPClientError";
  }
}

// Maximum number of tools a single MCP server may register.
// Prevents memory exhaustion from a malicious tools/list response.
const MAX_TOOLS_PER_SERVER = 256;

// Maximum response body size for HTTP MCP responses (2 MB).
// Prevents OOM from a malicious or misbehaving server.
const MAX_HTTP_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB

// Maximum byte length of a single stdio line (1 MB).
const MAX_STDIO_LINE_BYTES = 1 * 1024 * 1024; // 1 MB

/**
 * Validate a tool name returned by a remote MCP server.
 * - Must be a non-empty string
 * - Max 128 characters
 * - Allowed chars: alphanumeric, underscores, hyphens, dots (matches LLM tool naming rules)
 */
function validateToolName(name: unknown): string {
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

/**
 * Sanitize a tool description returned by a remote MCP server.
 * - Must be a string (empty string allowed)
 * - Truncated to 2 000 characters to limit prompt injection surface
 * - Control characters stripped
 */
function sanitizeToolDescription(description: unknown): string {
  if (typeof description !== "string") return "";
  // Strip ASCII control characters (keep printable + standard whitespace)
  // eslint-disable-next-line no-control-regex -- intentional: sanitizing control chars from untrusted MCP server output
  const cleaned = description.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return cleaned.slice(0, 2_000);
}

/**
 * Block cloud metadata endpoints and RFC-1918 / loopback ranges.
 *
 * MCP servers may legitimately run on localhost in development, so callers
 * who need local access must explicitly pass `allowLocalhost: true`. For
 * production OAuth2 token URLs and HTTP MCP servers, local addresses have
 * no legitimate use and are blocked by default.
 */
function assertNotSsrf(rawUrl: string, { allowLocalhost = false } = {}): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new MCPClientError(`Invalid URL: ${rawUrl}`);
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets

  // --- Cloud metadata endpoints ---
  const blockedHosts = [
    "metadata.google.internal",
    "169.254.169.254", // AWS/GCP/Azure/DigitalOcean metadata
    "100.100.100.200", // Alibaba Cloud metadata
  ];
  if (blockedHosts.includes(host)) {
    throw new MCPClientError(`SSRF blocked: cloud metadata endpoint ${host}`);
  }

  // Block 169.254.x.x range (link-local — encompasses all cloud metadata IPs)
  const parts = host.split(".");
  if (parts.length === 4) {
    const [a, b] = parts.map(Number);
    // 169.254.x.x — link-local
    if (a === 169 && b === 254) {
      throw new MCPClientError(`SSRF blocked: link-local address ${host}`);
    }
    // 10.x.x.x — RFC-1918
    if (a === 10) {
      throw new MCPClientError(`SSRF blocked: RFC-1918 private address ${host}`);
    }
    // 172.16.x.x – 172.31.x.x — RFC-1918
    if (a === 172 && b >= 16 && b <= 31) {
      throw new MCPClientError(`SSRF blocked: RFC-1918 private address ${host}`);
    }
    // 192.168.x.x — RFC-1918
    if (a === 192 && b === 168) {
      throw new MCPClientError(`SSRF blocked: RFC-1918 private address ${host}`);
    }
  }

  // --- Loopback ---
  if (!allowLocalhost) {
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "::ffff:127.0.0.1") {
      throw new MCPClientError(`SSRF blocked: loopback address ${host}`);
    }
    // 127.x.x.x loopback range
    if (parts.length === 4 && Number(parts[0]) === 127) {
      throw new MCPClientError(`SSRF blocked: loopback address ${host}`);
    }
  }

  // --- IPv6 link-local (fe80::/10) ---
  if (host.startsWith("fe80")) {
    throw new MCPClientError(`SSRF blocked: IPv6 link-local address ${host}`);
  }

  // --- IPv6 loopback (::1) — already caught above but belt-and-suspenders ---
  if (!allowLocalhost && (host === "::1" || host === "0:0:0:0:0:0:0:1")) {
    throw new MCPClientError(`SSRF blocked: IPv6 loopback address ${host}`);
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
  /**
   * Allow the MCP server URL to be a localhost/loopback address.
   * Defaults to `false` (localhost blocked) to prevent SSRF in production.
   * Set to `true` only for local development MCP servers.
   */
  allowLocalhost?: boolean;
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

    // OAuth2 token endpoints must be on public internet — no RFC-1918/loopback
    assertNotSsrf(opts.tokenUrl, { allowLocalhost: false });

    const body = new URLSearchParams({ grant_type: "client_credentials", client_id: opts.clientId });
    if (opts.clientSecret) body.set("client_secret", opts.clientSecret);
    if (opts.scopes?.length) body.set("scope", opts.scopes.join(" "));

    const resp = await fetch(opts.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      redirect: "error", // never follow redirects on auth endpoints
    });

    if (!resp.ok) throw new MCPClientError(`OAuth2 token fetch failed: ${resp.status}`);

    const data = await resp.json() as { access_token: string; expires_in?: number };
    if (!data.access_token || typeof data.access_token !== "string") {
      throw new MCPClientError("OAuth2 token response missing access_token");
    }
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
    if (opts.auth.type === "bearer") {
      if (!opts.auth.token) {
        throw new MCPClientError("Bearer token must not be empty");
      }
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
      redirect: "error", // never follow redirects — prevents redirect-based SSRF
    });

    if (!res.ok) {
      throw new Error(`MCP HTTP error: ${res.status}`);
    }

    // Guard against oversized responses before buffering (2 MB hard cap)
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_HTTP_RESPONSE_BYTES) {
      throw new MCPClientError(`MCP response too large: ${contentLength} bytes`);
    }
    const rawText = await res.text();
    if (rawText.length > MAX_HTTP_RESPONSE_BYTES) {
      throw new MCPClientError(`MCP response too large: ${rawText.length} bytes`);
    }

    const data = JSON.parse(rawText) as {
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
        redirect: "error",
      }).catch((err) => console.error("[fabrk] MCP elicitation respond failed:", err));
      return {};
    }

    if (data.error) {
      // Sanitize error message to prevent internal server details leaking
      throw new Error(`MCP error: ${String(data.error.message).slice(0, 256)}`);
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

  const rawTools = listResult.tools ?? [];
  if (rawTools.length > MAX_TOOLS_PER_SERVER) {
    throw new MCPClientError(
      `MCP server returned ${rawTools.length} tools, exceeding the limit of ${MAX_TOOLS_PER_SERVER}`
    );
  }

  const tools: ToolDefinition[] = rawTools.map((t) => ({
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

  return {
    tools,
    disconnect: async () => {
      clearTimeout(timer);
      controller.abort();
    },
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

  const allowLocalhost = options.allowLocalhost ?? false;
  assertNotSsrf(options.url, { allowLocalhost });

  const parsed = new URL(options.url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Invalid MCP URL scheme: ${parsed.protocol}`);
  }

  return connectHTTP(options.url, timeout, { auth: options.auth, elicitation: options.elicitation });
}

// Export for testing
export { assertNotSsrf, validateToolName, sanitizeToolDescription, MAX_TOOLS_PER_SERVER };
