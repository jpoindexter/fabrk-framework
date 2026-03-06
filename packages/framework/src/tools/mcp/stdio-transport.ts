import type { MCPServer } from "./server";
import type { ToolDefinition } from "../define-tool";

// Allowlist of commands permitted for MCP stdio transport.
// A blocklist approach (blocking sh, bash, etc.) is trivially bypassed via
// trailing spaces, mixed case, or unlisted shells. An allowlist ensures only
// known-safe runtimes can be spawned.
const ALLOWED_COMMANDS = new Set([
  "node", "node.exe",
  "npx", "npx.cmd",
  "python", "python3", "python.exe", "python3.exe",
  "uvx",
  "deno",
  "bun",
]);

// Maximum number of tools a single stdio MCP server may register.
const MAX_TOOLS_PER_SERVER = 256;

// Maximum byte length of a single newline-delimited stdio line (1 MB).
// Prevents OOM from a rogue child process flooding stdout.
const MAX_STDIO_LINE_BYTES = 1 * 1024 * 1024; // 1 MB

function validateCommand(command: string): void {
  // Extract the binary name from a full path (e.g. /usr/local/bin/node → node)
  const base = command.split("/").pop()?.split("\\").pop()?.trim() ?? command;
  if (!ALLOWED_COMMANDS.has(base.toLowerCase())) {
    throw new Error(
      `Command not permitted for MCP stdio: "${base}". ` +
      `Allowed: ${[...ALLOWED_COMMANDS].join(", ")}. ` +
      `Pass an absolute path to one of these binaries if needed.`
    );
  }
}

/**
 * Validate spawn args array.
 * - Must be an array of strings (no objects, no numbers that could be coerced)
 * - Each arg capped at 4 096 chars to prevent oversized command lines
 * - Rejects args that are null/undefined (spawn would serialize them as "null")
 */
function validateArgs(args: string[]): void {
  if (!Array.isArray(args)) {
    throw new Error("MCP stdio args must be an array");
  }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (typeof arg !== "string") {
      throw new Error(`MCP stdio args[${i}] must be a string, got ${typeof arg}`);
    }
    if (arg.length > 4096) {
      throw new Error(`MCP stdio args[${i}] exceeds maximum length of 4096 characters`);
    }
  }
}

export function startStdioServer(server: MCPServer): void {
  const readline = require("node:readline") as typeof import("node:readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on("line", async (line: string) => {
    if (!line.trim()) return;

    try {
      const request = JSON.parse(line);
      const response = await server.handleRequest(request);
      process.stdout.write(JSON.stringify(response) + "\n");
    } catch {
      const error = {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      };
      process.stdout.write(JSON.stringify(error) + "\n");
    }
  });

  rl.on("close", () => {
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    rl.close();
    process.exit(0);
  });

  process.on("SIGINT", () => {
    rl.close();
    process.exit(0);
  });
}

export async function createStdioClient(
  command: string,
  args: string[] = []
): Promise<{
  tools: ToolDefinition[];
  disconnect: () => Promise<void>;
}> {
  validateCommand(command);
  validateArgs(args);

  const { spawn } = await import("node:child_process");
  const readline = await import("node:readline");

  const child = spawn(command, args, {
    stdio: ["pipe", "pipe", "inherit"],
  });

  if (!child.stdout) {
    throw new Error("Failed to create stdio client: child process stdout not available");
  }

  const rl = readline.createInterface({
    input: child.stdout,
    terminal: false,
  });

  let requestId = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  rl.on("line", (line: string) => {
    // Guard against oversized lines before parsing (1 MB hard cap)
    if (line.length > MAX_STDIO_LINE_BYTES) {
      console.error(`[fabrk] MCP stdio: discarding oversized line (${line.length} bytes)`);
      return;
    }

    try {
      const msg = JSON.parse(line);
      // Only accept numeric IDs that match a pending request.
      // A malicious child process could send non-numeric ids (objects, arrays)
      // whose coerced toString() matches a valid id, or send a crafted id that
      // resolves a request it did not handle. Strict Number check prevents this.
      if (typeof msg.id === "number" && Number.isInteger(msg.id) && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        if (!p) return;
        pending.delete(msg.id);
        if (msg.error) {
          // Sanitize error message to prevent internal details leaking
          p.reject(new Error(String(msg.error.message ?? "MCP stdio error").slice(0, 256)));
        } else {
          p.resolve(msg.result);
        }
      }
    } catch (err) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.warn('[fabrk] MCP stdio: failed to parse response line:', err);
      }
    }
  });

  function send(method: string, params?: Record<string, unknown>): Promise<unknown> {
    // Wrap around at Number.MAX_SAFE_INTEGER to prevent precision loss
    if (requestId >= Number.MAX_SAFE_INTEGER) requestId = 0;
    const id = ++requestId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`MCP stdio request timed out: ${method}`));
      }, 30_000);

      pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });

      const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params });
      if (!child.stdin) {
        reject(new Error("Child process stdin not available"));
        return;
      }
      child.stdin.write(msg + "\n");
    });
  }

  await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "fabrk", version: "0.2.0" },
  });

  const listResult = await send("tools/list") as { tools?: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> };

  const rawTools = listResult.tools ?? [];
  if (rawTools.length > MAX_TOOLS_PER_SERVER) {
    throw new Error(
      `MCP stdio server returned ${rawTools.length} tools, exceeding the limit of ${MAX_TOOLS_PER_SERVER}`
    );
  }

  // Import validators from client module
  const { validateToolName, sanitizeToolDescription } = await import("./client");

  const remoteTools: ToolDefinition[] = rawTools.map((t) => ({
    name: validateToolName(t.name),
    description: sanitizeToolDescription(t.description),
    schema: (t.inputSchema ?? { type: "object", properties: {} }) as ToolDefinition["schema"],
    handler: async (input: Record<string, unknown>) => {
      const callResult = await send("tools/call", { name: t.name, arguments: input }) as {
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
    tools: remoteTools,
    disconnect: async () => {
      rl.close();
      child.kill("SIGTERM");
      // Give it a moment to exit gracefully
      await new Promise<void>((resolve) => {
        child.on("exit", () => resolve());
        setTimeout(() => {
          if (!child.killed) child.kill("SIGKILL");
          resolve();
        }, 3_000);
      });
    },
  };
}
