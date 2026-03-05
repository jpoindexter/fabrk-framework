import type { A2AAgentCard, A2ATask, A2ATaskResult } from './types.js';

export class A2AClientError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'A2AClientError';
  }
}

/**
 * Client for interacting with a remote A2A-compatible agent server.
 *
 * ```ts
 * const client = new A2AClient('https://remote-agent.example.com');
 * const card   = await client.discover();
 * const result = await client.sendTask({ message: { role: 'user', parts: [{ text: 'Hello' }] } });
 * ```
 */
export class A2AClient {
  constructor(private readonly baseUrl: string) {
    try {
      const parsed = new URL(baseUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error(`Invalid A2A base URL scheme: ${parsed.protocol}`);
      }
    } catch (e) {
      if (e instanceof TypeError) throw new Error(`Invalid A2A base URL: ${baseUrl}`);
      throw e;
    }
  }

  /** Fetch the remote agent card from `GET /.well-known/agent.json`. */
  async discover(): Promise<A2AAgentCard> {
    const resp = await fetch(`${this.baseUrl}/.well-known/agent.json`);
    if (!resp.ok) {
      throw new A2AClientError(`A2A discovery failed: ${resp.status}`, resp.status);
    }
    return resp.json() as Promise<A2AAgentCard>;
  }

  /** Send a task and wait for the synchronous result. A unique `id` is generated automatically. */
  async sendTask(task: Omit<A2ATask, 'id'>): Promise<A2ATaskResult> {
    const id = crypto.randomUUID();
    const resp = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...task, id }),
    });
    if (!resp.ok) {
      throw new A2AClientError(`A2A task failed: ${resp.status}`, resp.status);
    }
    return resp.json() as Promise<A2ATaskResult>;
  }
}
