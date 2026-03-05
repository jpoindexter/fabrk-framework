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
    try {
      const msg = JSON.parse(line);
      if (msg.id !== undefined && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        if (!p) return;
        pending.delete(msg.id);
        if (msg.error) {
          p.reject(new Error(msg.error.message));
        } else {
          p.resolve(msg.result);
        }
      }
    } catch { /* skip malformed */ }
  });

  function send(method: string, params?: Record<string, unknown>): Promise<unknown> {
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
  const remoteTools: ToolDefinition[] = (listResult.tools ?? []).map((t) => ({
    name: t.name,
    description: t.description,
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
