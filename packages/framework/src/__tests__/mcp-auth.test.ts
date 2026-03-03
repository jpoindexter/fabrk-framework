import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { connectMCPServer, MCPClientError, OAuth2TokenCache } from "../tools/mcp/client";

// --- Fetch mock helpers ---

function makeJsonRpcResponse(result: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ jsonrpc: "2.0", id: 1, result }),
  });
}

function makeTokenResponse(token: string, expiresIn = 3600) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ access_token: token, expires_in: expiresIn }),
  });
}

function makeErrorResponse(status: number) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  });
}

/**
 * Builds a fetch mock that handles the full MCP HTTP lifecycle:
 *   initialize → tools/list → (any subsequent calls)
 * Optionally intercepts a token endpoint URL with a token response first.
 */
function makeMcpFetch(opts: {
  tokenUrl?: string;
  tokenResponse?: ReturnType<typeof makeTokenResponse>;
  extraCalls?: Array<ReturnType<typeof makeJsonRpcResponse>>;
} = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls: Array<Promise<any>> = [];

  if (opts.tokenUrl) {
    // token call comes first when oauth2 is used
    calls.push(opts.tokenResponse ?? makeTokenResponse("tok"));
  }

  calls.push(
    makeJsonRpcResponse({ protocolVersion: "2024-11-05" }), // initialize
    makeJsonRpcResponse({ tools: [] }),                     // tools/list
    ...(opts.extraCalls ?? []),
  );

  let idx = 0;
  return vi.fn(() => calls[Math.min(idx++, calls.length - 1)]);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// 1. Bearer token added to request headers
// ---------------------------------------------------------------------------
describe("MCP auth — bearer", () => {
  it("adds Authorization: Bearer header to all outgoing requests", async () => {
    const mockFetch = makeMcpFetch();
    vi.stubGlobal("fetch", mockFetch);

    await connectMCPServer({
      transport: "http",
      url: "http://localhost:3001/mcp",
      auth: { type: "bearer", token: "abc" },
    });

    // Every call should carry the header
    for (const call of mockFetch.mock.calls) {
      const reqInit = (call as unknown[])[1] as RequestInit;
      const headers = reqInit.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer abc");
    }
  });

  it("does NOT add Authorization header when auth option is absent", async () => {
    const mockFetch = makeMcpFetch();
    vi.stubGlobal("fetch", mockFetch);

    await connectMCPServer({
      transport: "http",
      url: "http://localhost:3001/mcp",
    });

    for (const call of mockFetch.mock.calls) {
      const reqInit = (call as unknown[])[1] as RequestInit;
      const headers = reqInit.headers as Record<string, string>;
      expect(headers["Authorization"]).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 2-4. OAuth2 token caching
// ---------------------------------------------------------------------------
describe("MCP auth — OAuth2", () => {
  it("POSTs to tokenUrl on first request", async () => {
    const tokenUrl = "https://auth.example.com/token";
    const mockFetch = makeMcpFetch({ tokenUrl });
    vi.stubGlobal("fetch", mockFetch);

    await connectMCPServer({
      transport: "http",
      url: "http://localhost:3001/mcp",
      auth: { type: "oauth2", clientId: "cid", tokenUrl },
    });

    // First call should be to the token endpoint
    const firstCall = mockFetch.mock.calls[0] as unknown[];
    expect(firstCall[0]).toBe(tokenUrl);
    const reqInit = firstCall[1] as RequestInit;
    expect((reqInit.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/x-www-form-urlencoded"
    );
  });

  it("caches the token and calls tokenUrl only once for multiple requests", async () => {
    const tokenUrl = "https://auth.example.com/token";
    // Two extra RPC calls after connect (initialize + tools/list already in makeMcpFetch)
    const extraCalls = [
      makeJsonRpcResponse({ resources: [] }),
      makeJsonRpcResponse({ resources: [] }),
    ] as Array<ReturnType<typeof makeJsonRpcResponse>>;
    const mockFetch = makeMcpFetch({ tokenUrl, extraCalls });
    vi.stubGlobal("fetch", mockFetch);

    const conn = await connectMCPServer({
      transport: "http",
      url: "http://localhost:3001/mcp",
      auth: { type: "oauth2", clientId: "cid", tokenUrl },
    });

    // Make two more RPC calls
    await conn.listResources();
    await conn.listResources();

    // Only one call to token URL (index 0)
    const tokenCalls = mockFetch.mock.calls.filter(
      (c) => (c as unknown[])[0] === tokenUrl
    );
    expect(tokenCalls).toHaveLength(1);
  });

  it("refreshes token when within 60 s of expiry", async () => {
    const cache = new OAuth2TokenCache();

    // Seed a token that is about to expire (30 s from now — inside the 60 s buffer)
    // We do this by calling getToken once and then manually manipulating the expiry
    // via a second call with a mock that reflects a near-expiry scenario.
    let fetchCount = 0;
    const mockFetch = vi.fn(() => {
      fetchCount += 1;
      if (fetchCount === 1) {
        // First token — expires_in=30 makes expiresAt = now + 30_000 ms
        return makeTokenResponse("first-token", 30);
      }
      return makeTokenResponse("second-token", 3600);
    });
    vi.stubGlobal("fetch", mockFetch);

    const opts = { clientId: "cid", tokenUrl: "https://auth.example.com/token" };

    const first = await cache.getToken(opts);
    expect(first).toBe("first-token");

    // Because expires_in=30 → expiresAt = now + 30_000 < now + 60_000 threshold,
    // the next call should refresh.
    const second = await cache.getToken(opts);
    expect(second).toBe("second-token");
    expect(fetchCount).toBe(2);
  });

  it("propagates MCPClientError when token endpoint returns non-ok", async () => {
    const cache = new OAuth2TokenCache();
    vi.stubGlobal("fetch", vi.fn(() => makeErrorResponse(401)));

    await expect(
      cache.getToken({ clientId: "cid", tokenUrl: "https://auth.example.com/token" })
    ).rejects.toThrow(MCPClientError);

    await expect(
      cache.getToken({ clientId: "cid", tokenUrl: "https://auth.example.com/token" })
    ).rejects.toThrow("OAuth2 token fetch failed: 401");
  });
});

// ---------------------------------------------------------------------------
// 5-6. Elicitation
// ---------------------------------------------------------------------------
describe("MCP elicitation", () => {
  it("calls elicitation callback when server sends elicitation/create", async () => {
    const elicitationCb = vi.fn().mockResolvedValue({ answer: "yes" });

    let callCount = 0;
    const mockFetch = vi.fn(() => {
      callCount += 1;
      if (callCount === 1) {
        // initialize — returns an elicitation/create server-initiated message
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              jsonrpc: "2.0",
              method: "elicitation/create",
              params: { prompt: "What is your name?", schema: { type: "string" } },
            }),
        });
      }
      if (callCount === 2) {
        // elicitation/respond send (fire-and-forget inside rpcCall)
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      }
      if (callCount === 3) {
        // Re-attempt initialize (after elicitation resolves, rpcCall returns {} so the
        // client continues). The initialize step gets {} as result — no error field,
        // so it proceeds to tools/list.
        return makeJsonRpcResponse({ protocolVersion: "2024-11-05" });
      }
      // tools/list
      return makeJsonRpcResponse({ tools: [] });
    });

    vi.stubGlobal("fetch", mockFetch);

    await connectMCPServer({
      transport: "http",
      url: "http://localhost:3001/mcp",
      elicitation: elicitationCb,
    });

    expect(elicitationCb).toHaveBeenCalledWith("What is your name?", { type: "string" });
  });

  it("sends elicitation/respond back after callback resolves", async () => {
    const elicitationResult = { choice: "ok" };
    const elicitationCb = vi.fn().mockResolvedValue(elicitationResult);

    let callCount = 0;
    const sentBodies: unknown[] = [];

    const mockFetch = vi.fn((url: string, init?: RequestInit) => {
      if (init?.body) sentBodies.push(JSON.parse(init.body as string));
      callCount += 1;

      if (callCount === 1) {
        // initialize returns elicitation/create
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              jsonrpc: "2.0",
              method: "elicitation/create",
              params: { prompt: "Confirm?", schema: { type: "boolean" } },
            }),
        });
      }
      if (callCount === 2) {
        // elicitation/respond (fire-and-forget)
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      }
      if (callCount === 3) {
        return makeJsonRpcResponse({ protocolVersion: "2024-11-05" });
      }
      return makeJsonRpcResponse({ tools: [] });
    });

    vi.stubGlobal("fetch", mockFetch);

    await connectMCPServer({
      transport: "http",
      url: "http://localhost:3001/mcp",
      elicitation: elicitationCb,
    });

    // Wait for the fire-and-forget respond call to settle
    await new Promise((r) => setTimeout(r, 10));

    const respondMsg = sentBodies.find(
      (b) => (b as { method?: string }).method === "elicitation/respond"
    ) as { method: string; params: { result: unknown } } | undefined;

    expect(respondMsg).toBeDefined();
    expect(respondMsg?.params.result).toEqual(elicitationResult);
  });

  it("ignores elicitation/create when no elicitation callback is configured", async () => {
    let callCount = 0;
    const mockFetch = vi.fn(() => {
      callCount += 1;
      if (callCount === 1) {
        // initialize returns elicitation/create but no callback configured
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              jsonrpc: "2.0",
              method: "elicitation/create",
              params: { prompt: "Ignored?", schema: {} },
            }),
        });
      }
      if (callCount === 2) {
        return makeJsonRpcResponse({ protocolVersion: "2024-11-05" });
      }
      return makeJsonRpcResponse({ tools: [] });
    });

    vi.stubGlobal("fetch", mockFetch);

    // Should not throw even though an elicitation/create arrived with no handler
    await expect(
      connectMCPServer({
        transport: "http",
        url: "http://localhost:3001/mcp",
      })
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 7. MCPClientError exported correctly
// ---------------------------------------------------------------------------
describe("MCPClientError", () => {
  it("is an Error subclass with correct name", () => {
    const err = new MCPClientError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("MCPClientError");
    expect(err.message).toBe("test");
  });
});
