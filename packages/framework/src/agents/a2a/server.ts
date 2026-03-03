import type { A2AAgentCard, A2ATask, A2ATaskResult } from './types.js';

export interface A2AAgentEntry {
  name: string;
  description?: string;
  execute: (input: string, sessionId?: string) => Promise<string>;
}

export interface A2AServerOptions {
  agents: Record<string, A2AAgentEntry>;
  baseUrl: string;
  name?: string;
  description?: string;
  version?: string;
}

/**
 * Create an A2A-compatible HTTP handler.
 *
 * Returns a function that accepts a `Request` and returns a `Response` (or
 * `null` when the path is not an A2A route, letting the caller fall through
 * to its own routing logic).
 *
 * Supported routes:
 *   GET  /.well-known/agent.json  — agent card discovery
 *   POST /                        — submit a task
 */
export function createA2AServer(
  options: A2AServerOptions,
): (req: Request) => Promise<Response | null> {
  const agentNames = Object.keys(options.agents);

  return async (req: Request): Promise<Response | null> => {
    const url = new URL(req.url, options.baseUrl);

    // GET /.well-known/agent.json — agent card discovery
    if (url.pathname === '/.well-known/agent.json' && req.method === 'GET') {
      const card: A2AAgentCard = {
        name: options.name ?? 'FABRK Agent Network',
        description: options.description ?? `${agentNames.length} agents available`,
        version: options.version ?? '1.0',
        capabilities: {
          streaming: true,
          tools: agentNames,
        },
        url: options.baseUrl,
      };
      return new Response(JSON.stringify(card), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // POST / — send a task
    if (url.pathname === '/' && req.method === 'POST') {
      let task: A2ATask;
      try {
        task = (await req.json()) as A2ATask;
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (!task.id || !task.message?.parts?.length) {
        return new Response(JSON.stringify({ error: 'Invalid task' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Extract agent name from message: "@agentName some input" or fall back to first agent
      const text = task.message.parts.map((p) => p.text).join(' ');
      const agentMatch = text.match(/^@(\w+)\s*/);
      const agentName = agentMatch ? agentMatch[1] : agentNames[0];
      const input = agentMatch ? text.slice(agentMatch[0].length) : text;

      const agent = agentName ? options.agents[agentName] : undefined;
      if (!agent) {
        const result: A2ATaskResult = {
          id: task.id,
          status: 'failed',
          error: { message: `Agent "${agentName}" not found` },
        };
        return new Response(JSON.stringify(result), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      try {
        const output = await agent.execute(input, task.sessionId);
        const result: A2ATaskResult = {
          id: task.id,
          status: 'completed',
          artifacts: [{ parts: [{ text: output }] }],
        };
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        const result: A2ATaskResult = {
          id: task.id,
          status: 'failed',
          error: { message: err instanceof Error ? err.message : String(err) },
        };
        return new Response(JSON.stringify(result), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return null; // not an A2A route
  };
}
