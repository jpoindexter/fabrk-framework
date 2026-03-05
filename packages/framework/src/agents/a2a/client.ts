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
    let parsed: URL;
    try {
      parsed = new URL(baseUrl);
    } catch {
      throw new Error(`Invalid A2A base URL: ${baseUrl}`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Invalid A2A base URL scheme: ${parsed.protocol}`);
    }
    // Block cloud metadata endpoints and RFC-1918 private ranges.
    // A2A targets are remote agent servers; there is no valid use case for reaching
    // internal infrastructure (metadata services, databases, other internal services).
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const blockedHosts = ["metadata.google.internal", "169.254.169.254", "100.100.100.200"];
    if (blockedHosts.includes(host)) {
      throw new A2AClientError(`A2A SSRF blocked: cloud metadata endpoint ${host}`);
    }
    const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\./);
    if (v4) {
      const a = Number(v4[1]);
      const b = Number(v4[2]);
      // 127.x.x.x — loopback
      if (a === 127) throw new A2AClientError(`A2A SSRF blocked: loopback address ${host}`);
      // 169.254.x.x — link-local / cloud metadata
      if (a === 169 && b === 254) throw new A2AClientError(`A2A SSRF blocked: link-local address ${host}`);
      // 10.x.x.x — RFC-1918
      if (a === 10) throw new A2AClientError(`A2A SSRF blocked: RFC-1918 address ${host}`);
      // 192.168.x.x — RFC-1918
      if (a === 192 && b === 168) throw new A2AClientError(`A2A SSRF blocked: RFC-1918 address ${host}`);
      // 172.16-31.x.x — RFC-1918
      if (a === 172 && b >= 16 && b <= 31) throw new A2AClientError(`A2A SSRF blocked: RFC-1918 address ${host}`);
      // 100.64-127.x.x — CGNAT / Tailscale shared space
      if (a === 100 && b >= 64 && b <= 127) throw new A2AClientError(`A2A SSRF blocked: shared-address space ${host}`);
    }
    // IPv6 loopback and link-local
    if (host === "::1" || host === "0:0:0:0:0:0:0:1") throw new A2AClientError(`A2A SSRF blocked: IPv6 loopback`);
    if (host.startsWith("fe80")) throw new A2AClientError(`A2A SSRF blocked: IPv6 link-local ${host}`);
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
