import { describe, it, expect, afterEach, vi } from "vitest";
import { connectMCPServer } from "../tools/mcp/client";

// Use a public-looking URL for tests that don't need network access.
// localhost is blocked by default in connectMCPServer (SSRF prevention).
// Tests that need localhost pass allowLocalhost: true.
const TEST_MCP_URL = "https://mcp.example.com/mcp";

function makeJsonRpcResponse(result: unknown) {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, result });
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: new Headers({ "content-length": String(body.length) }),
    text: () => Promise.resolve(body),
    json: () => Promise.resolve({ jsonrpc: "2.0", id: 1, result }),
  });
}

function makeErrorResponse(status: number) {
  return Promise.resolve({
    ok: false,
    status,
    headers: new Headers(),
    text: () => Promise.resolve("{}"),
    json: () => Promise.resolve({}),
  });
}

function makeHttpFetch() {
  let callCount = 0;
  return vi.fn(() => {
    callCount += 1;
    if (callCount === 1) {
      return makeJsonRpcResponse({ protocolVersion: "2024-11-05" });
    }
    if (callCount === 2) {
      return makeJsonRpcResponse({
        tools: [
          {
            name: "echo",
            description: "Echo tool",
            inputSchema: { type: "object", properties: {} },
          },
        ],
      });
    }
    return makeJsonRpcResponse({
      content: [{ type: "text", text: "echoed" }],
    });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("connectMCPServer", () => {
  it("throws when stdio transport lacks command", async () => {
    await expect(
      connectMCPServer({ transport: "stdio" })
    ).rejects.toThrow("MCP stdio transport requires a command");
  });

  it("throws when http transport lacks url", async () => {
    await expect(
      connectMCPServer({ transport: "http" })
    ).rejects.toThrow("MCP HTTP transport requires a URL");
  });

  it("throws on invalid URL scheme (ftp://)", async () => {
    await expect(
      connectMCPServer({ transport: "http", url: "ftp://example.com/mcp" })
    ).rejects.toThrow("Invalid MCP URL scheme: ftp:");
  });

  it("throws on invalid URL scheme (javascript:)", async () => {
    await expect(
      connectMCPServer({ transport: "http", url: "javascript:alert(1)" })
    ).rejects.toThrow();
  });

  it("throws SSRF error for localhost without allowLocalhost", async () => {
    await expect(
      connectMCPServer({ transport: "http", url: "http://localhost:3001/mcp" })
    ).rejects.toThrow("SSRF blocked");
  });

  it("HTTP transport initializes and lists tools", async () => {
    vi.stubGlobal("fetch", makeHttpFetch());

    const { tools, disconnect } = await connectMCPServer({
      transport: "http",
      url: TEST_MCP_URL,
    });

    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("echo");
    expect(tools[0].description).toBe("Echo tool");
    expect(typeof tools[0].handler).toBe("function");

    await disconnect();
  });

  it("HTTP tool handler proxies to tools/call", async () => {
    const mockFetch = makeHttpFetch();
    vi.stubGlobal("fetch", mockFetch);

    const { tools } = await connectMCPServer({
      transport: "http",
      url: TEST_MCP_URL,
    });

    const result = await tools[0].handler({});

    expect(result).toEqual({ content: [{ type: "text", text: "echoed" }] });
    expect(mockFetch).toHaveBeenCalledTimes(3);

    const thirdCall = mockFetch.mock.calls[2] as unknown[];
    const body = JSON.parse((thirdCall[1] as { body: string }).body);
    expect(body.method).toBe("tools/call");
    expect(body.params.name).toBe("echo");
  });

  it("HTTP handles fetch error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("Network failure")))
    );

    await expect(
      connectMCPServer({ transport: "http", url: TEST_MCP_URL })
    ).rejects.toThrow("Network failure");
  });

  it("HTTP handles non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => makeErrorResponse(500))
    );

    await expect(
      connectMCPServer({ transport: "http", url: TEST_MCP_URL })
    ).rejects.toThrow("MCP HTTP error: 500");
  });
});
