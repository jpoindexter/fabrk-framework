import type { MCPClientOptions } from "./client-types";
import { MCPClientError } from "./client-types";

const MAX_HTTP_RESPONSE_BYTES = 2 * 1024 * 1024;

export async function parseResponse(
  res: Response,
  authHeader: string | null,
  url: string,
  opts: Pick<MCPClientOptions, "elicitation">
): Promise<unknown> {
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

  if (data.method === "elicitation/create" && opts.elicitation) {
    return handleElicitation(data.params, opts.elicitation, authHeader, url);
  }

  if (data.error) {
    throw new Error(`MCP error: ${String(data.error.message).slice(0, 256)}`);
  }
  return data.result;
}

async function handleElicitation(
  params: { prompt?: string; schema?: Record<string, unknown> } | undefined,
  elicitation: NonNullable<MCPClientOptions["elicitation"]>,
  authHeader: string | null,
  url: string
): Promise<Record<string, never>> {
  const prompt = params?.prompt ?? "";
  const schema = params?.schema ?? {};
  const result = await elicitation(prompt, schema);
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(authHeader ? { Authorization: authHeader } : {}) },
    body: JSON.stringify({ jsonrpc: "2.0", method: "elicitation/respond", params: { result } }),
    redirect: "error",
  }).catch((err) => console.error("[fabrk] MCP elicitation respond failed:", err));
  return {};
}
