import type { ToolDefinition, ToolResult } from "../../tools/define-tool";

const MAX_DELEGATION_DEPTH = 5;
const DEPTH_HEADER = "X-Fabrk-Delegation-Depth";

export function agentAsTool(
  options: {
    name: string;
    description: string;
    inputSchema?: Record<string, unknown>;
    parentRequest?: Request;
  },
  handlerFactory: (name: string) => Promise<(req: Request) => Promise<Response>>
): ToolDefinition {
  return {
    name: options.name,
    description: options.description,
    schema: {
      type: "object",
      properties: options.inputSchema ?? {
        message: { type: "string", description: "Message to send to the agent" },
      },
      required: ["message"],
    },
    handler: async (input: Record<string, unknown>): Promise<ToolResult> => {
      const message = typeof input.message === "string" ? input.message : JSON.stringify(input);
      const handler = await handlerFactory(options.name);

      const parentDepth = parseInt(
        options.parentRequest?.headers.get(DEPTH_HEADER) ?? "0",
        10
      );
      const childDepth = String(parentDepth + 1);

      const req = new Request(`http://localhost/api/agents/${encodeURIComponent(options.name)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [DEPTH_HEADER]: childDepth,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: message }],
        }),
      });

      const res = await handler(req);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Agent call failed" }));
        return { content: [{ type: "text", text: `Error: ${err.error ?? "Agent call failed"}` }] };
      }

      const contentType = res.headers.get("Content-Type") ?? "";
      if (contentType.includes("text/event-stream")) {
        const text = await res.text();
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));
        let result = "";
        for (const line of lines) {
          try {
            const event = JSON.parse(line.slice("data: ".length));
            if (event.type === "text" || event.type === "text-delta") {
              result += event.content;
            }
          } catch { /* skip malformed */ }
        }
        return { content: [{ type: "text", text: result || "No response" }] };
      }

      const data = await res.json();
      return { content: [{ type: "text", text: data.content ?? "No response" }] };
    },
  };
}

/**
 * Returns true when the request originates from the same server (localhost).
 * Only internal same-server calls are allowed to set the delegation depth header;
 * external callers could otherwise forge it to bypass depth limits.
 */
function isLocalhostRequest(req: Request): boolean {
  try {
    const host = new URL(req.url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

export function checkDelegationDepth(req: Request): string | null {
  // Only trust the header from internal same-server calls. External callers
  // start at depth 0 regardless of what header they send.
  const rawHeader = isLocalhostRequest(req) ? req.headers.get(DEPTH_HEADER) : null;
  const depth = parseInt(rawHeader ?? "0", 10);
  if (depth >= MAX_DELEGATION_DEPTH) {
    return `Maximum delegation depth (${MAX_DELEGATION_DEPTH}) exceeded`;
  }
  return null;
}

export function detectCircularDeps(
  agents: Array<{ name: string; agents?: Array<{ name: string }> }>
): string[] {
  const errors: string[] = [];
  const graph = new Map<string, Set<string>>();

  for (const agent of agents) {
    const deps = new Set((agent.agents ?? []).map((a) => a.name));
    graph.set(agent.name, deps);
  }

  for (const [name] of graph) {
    const visited = new Set<string>();
    const stack = [name];

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) break;
      if (visited.has(current)) {
        errors.push(`Circular dependency detected: ${name} -> ... -> ${current}`);
        break;
      }
      visited.add(current);
      const deps = graph.get(current);
      if (deps) {
        for (const dep of deps) {
          if (dep === name) {
            errors.push(`Circular dependency: ${name} -> ${current} -> ${name}`);
          } else {
            stack.push(dep);
          }
        }
      }
    }
  }

  return errors;
}
