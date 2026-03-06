import { MCPClientError } from "./client-types";

/**
 * Block cloud metadata endpoints and RFC-1918 / loopback ranges.
 *
 * MCP servers may legitimately run on localhost in development, so callers
 * who need local access must explicitly pass `allowLocalhost: true`.
 */
export function assertNotSsrf(rawUrl: string, { allowLocalhost = false } = {}): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new MCPClientError(`Invalid URL: ${rawUrl}`);
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  assertNotCloudMetadata(host);
  assertNotPrivateRange(host);

  if (!allowLocalhost) {
    assertNotLoopback(host);
  }

  if (host.startsWith("fe80")) {
    throw new MCPClientError(`SSRF blocked: IPv6 link-local address ${host}`);
  }
  if (!allowLocalhost && (host === "::1" || host === "0:0:0:0:0:0:0:1")) {
    throw new MCPClientError(`SSRF blocked: IPv6 loopback address ${host}`);
  }
}

function assertNotCloudMetadata(host: string): void {
  const blocked = ["metadata.google.internal", "169.254.169.254", "100.100.100.200"];
  if (blocked.includes(host)) {
    throw new MCPClientError(`SSRF blocked: cloud metadata endpoint ${host}`);
  }
  const parts = host.split(".");
  if (parts.length === 4 && Number(parts[0]) === 169 && Number(parts[1]) === 254) {
    throw new MCPClientError(`SSRF blocked: link-local address ${host}`);
  }
}

function assertNotPrivateRange(host: string): void {
  const parts = host.split(".");
  if (parts.length !== 4) return;
  const [a, b] = parts.map(Number);
  if (a === 10) {
    throw new MCPClientError(`SSRF blocked: RFC-1918 private address ${host}`);
  }
  if (a === 172 && b >= 16 && b <= 31) {
    throw new MCPClientError(`SSRF blocked: RFC-1918 private address ${host}`);
  }
  if (a === 192 && b === 168) {
    throw new MCPClientError(`SSRF blocked: RFC-1918 private address ${host}`);
  }
}

function assertNotLoopback(host: string): void {
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "::ffff:127.0.0.1") {
    throw new MCPClientError(`SSRF blocked: loopback address ${host}`);
  }
  const parts = host.split(".");
  if (parts.length === 4 && Number(parts[0]) === 127) {
    throw new MCPClientError(`SSRF blocked: loopback address ${host}`);
  }
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

    assertNotSsrf(opts.tokenUrl, { allowLocalhost: false });

    const body = new URLSearchParams({ grant_type: "client_credentials", client_id: opts.clientId });
    if (opts.clientSecret) body.set("client_secret", opts.clientSecret);
    if (opts.scopes?.length) body.set("scope", opts.scopes.join(" "));

    const resp = await fetch(opts.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      redirect: "error",
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
