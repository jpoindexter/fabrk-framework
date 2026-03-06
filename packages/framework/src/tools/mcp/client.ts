import { createStdioClient } from "./stdio-transport";
import { assertNotSsrf, OAuth2TokenCache } from "./client-auth";
import { connectHTTP, validateToolName, sanitizeToolDescription } from "./client-resources";
import { MCPClientError } from "./client-types";
import type { MCPConnection, MCPClientOptions } from "./client-types";

export type { MCPConnection, MCPClientOptions };
export { MCPClientError };

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

const MAX_TOOLS_PER_SERVER = 256;

export { assertNotSsrf, validateToolName, sanitizeToolDescription, MAX_TOOLS_PER_SERVER, OAuth2TokenCache };
