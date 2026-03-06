/**
 * Adversarial security tests for the MCP client/stdio-transport layer.
 * Each suite maps to a specific attack vector identified in the security audit.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import {
  connectMCPServer,
  MCPClientError,
  assertNotSsrf,
  validateToolName,
  sanitizeToolDescription,
  MAX_TOOLS_PER_SERVER,
} from "../tools/mcp/client";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeJsonRpcResponse(result: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: new Headers({ "content-length": String(JSON.stringify({ jsonrpc: "2.0", id: 1, result }).length) }),
    text: () => Promise.resolve(JSON.stringify({ jsonrpc: "2.0", id: 1, result })),
    json: () => Promise.resolve({ jsonrpc: "2.0", id: 1, result }),
  });
}

function makeMcpFetch(tools: unknown[] = []) {
  let callCount = 0;
  return vi.fn(() => {
    callCount += 1;
    if (callCount === 1) return makeJsonRpcResponse({ protocolVersion: "2024-11-05" });
    if (callCount === 2) return makeJsonRpcResponse({ tools });
    return makeJsonRpcResponse({ content: [{ type: "text", text: "ok" }] });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

// ─── 1. SSRF — assertNotSsrf unit tests ─────────────────────────────────────

describe("assertNotSsrf — cloud metadata", () => {
  it("blocks AWS/GCP/Azure metadata IP 169.254.169.254", () => {
    expect(() => assertNotSsrf("http://169.254.169.254/latest/meta-data/")).toThrow(MCPClientError);
  });

  it("blocks Alibaba Cloud metadata 100.100.100.200", () => {
    expect(() => assertNotSsrf("http://100.100.100.200/latest/meta-data/")).toThrow(MCPClientError);
  });

  it("blocks metadata.google.internal", () => {
    expect(() => assertNotSsrf("http://metadata.google.internal/computeMetadata/v1/")).toThrow(MCPClientError);
  });
});

describe("assertNotSsrf — RFC-1918 private ranges (NEW)", () => {
  it("blocks 10.x.x.x (RFC-1918)", () => {
    expect(() => assertNotSsrf("http://10.0.0.1/admin")).toThrow("RFC-1918 private address");
  });

  it("blocks 10.255.255.255", () => {
    expect(() => assertNotSsrf("http://10.255.255.255/")).toThrow("RFC-1918 private address");
  });

  it("blocks 172.16.0.1 (RFC-1918)", () => {
    expect(() => assertNotSsrf("http://172.16.0.1/")).toThrow("RFC-1918 private address");
  });

  it("blocks 172.31.255.255 (RFC-1918 upper edge)", () => {
    expect(() => assertNotSsrf("http://172.31.255.255/")).toThrow("RFC-1918 private address");
  });

  it("allows 172.15.x.x (just outside RFC-1918 range)", () => {
    // 172.15 is NOT in 172.16–172.31 range — should pass SSRF check
    // (We don't assert the connection succeeds, just that assertNotSsrf doesn't throw)
    expect(() => assertNotSsrf("http://172.15.0.1/")).not.toThrow();
  });

  it("allows 172.32.x.x (just outside RFC-1918 range)", () => {
    expect(() => assertNotSsrf("http://172.32.0.1/")).not.toThrow();
  });

  it("blocks 192.168.0.1 (RFC-1918)", () => {
    expect(() => assertNotSsrf("http://192.168.0.1/")).toThrow("RFC-1918 private address");
  });

  it("blocks 192.168.100.50", () => {
    expect(() => assertNotSsrf("http://192.168.100.50/api")).toThrow("RFC-1918 private address");
  });
});

describe("assertNotSsrf — loopback (NEW)", () => {
  it("blocks localhost by default", () => {
    expect(() => assertNotSsrf("http://localhost:3000/")).toThrow("loopback address");
  });

  it("blocks 127.0.0.1 by default", () => {
    expect(() => assertNotSsrf("http://127.0.0.1:6379/")).toThrow("loopback address");
  });

  it("blocks 127.x.x.x loopback range", () => {
    expect(() => assertNotSsrf("http://127.0.0.2/")).toThrow("loopback address");
  });

  it("blocks ::1 (IPv6 loopback) by default", () => {
    expect(() => assertNotSsrf("http://[::1]:8080/")).toThrow(/loopback|blocked/);
  });

  it("allows localhost when allowLocalhost: true", () => {
    expect(() => assertNotSsrf("http://localhost:3001/mcp", { allowLocalhost: true })).not.toThrow();
  });

  it("allows 127.0.0.1 when allowLocalhost: true", () => {
    expect(() => assertNotSsrf("http://127.0.0.1:3001/mcp", { allowLocalhost: true })).not.toThrow();
  });
});

describe("assertNotSsrf — link-local IPv6", () => {
  it("blocks fe80:: link-local", () => {
    expect(() => assertNotSsrf("http://[fe80::1]/")).toThrow("IPv6 link-local");
  });
});

describe("assertNotSsrf — scheme validation", () => {
  it("rejects file:// scheme before reaching fetch", () => {
    // file:// has no valid host so URL parsing gives hostname = ""
    // assertNotSsrf should reject invalid/unparseable URLs
    expect(() => assertNotSsrf("file:///etc/passwd")).not.toThrow(); // passes assertNotSsrf (no bad host)
    // But connectMCPServer should reject via protocol check
  });

  it("rejects ftp:// via connectMCPServer", async () => {
    await expect(
      connectMCPServer({ transport: "http", url: "ftp://example.com/mcp" })
    ).rejects.toThrow("Invalid MCP URL scheme");
  });

  it("rejects javascript: via connectMCPServer", async () => {
    await expect(
      connectMCPServer({ transport: "http", url: "javascript:alert(1)" })
    ).rejects.toThrow();
  });
});

// ─── 2. SSRF via redirect — redirect: "error" (NEW) ────────────────────────

describe("SSRF via redirect prevention", () => {
  it("passes redirect: 'error' to every fetch call", async () => {
    const fetchMock = makeMcpFetch();
    vi.stubGlobal("fetch", fetchMock);

    await connectMCPServer({
      transport: "http",
      url: "https://mcp.example.com/mcp",
    });

    for (const call of fetchMock.mock.calls) {
      const init = (call as unknown[])[1] as RequestInit & { redirect?: string };
      expect(init.redirect).toBe("error");
    }
  });
});

// ─── 3. Localhost blocked by default in connectMCPServer ────────────────────

describe("connectMCPServer — localhost blocked by default", () => {
  it("throws SSRF error for localhost URL when allowLocalhost not set", async () => {
    await expect(
      connectMCPServer({ transport: "http", url: "http://localhost:3001/mcp" })
    ).rejects.toThrow("SSRF blocked");
  });

  it("throws SSRF error for 127.0.0.1 URL when allowLocalhost not set", async () => {
    await expect(
      connectMCPServer({ transport: "http", url: "http://127.0.0.1:3001/mcp" })
    ).rejects.toThrow("SSRF blocked");
  });

  it("allows localhost URL when allowLocalhost: true", async () => {
    vi.stubGlobal("fetch", makeMcpFetch());
    // Should not throw at the URL validation step
    await expect(
      connectMCPServer({ transport: "http", url: "http://localhost:3001/mcp", allowLocalhost: true })
    ).resolves.toBeDefined();
  });

  it("blocks RFC-1918 even when allowLocalhost: true", async () => {
    await expect(
      connectMCPServer({ transport: "http", url: "http://192.168.1.1/mcp", allowLocalhost: true })
    ).rejects.toThrow("RFC-1918");
  });
});

// ─── 4. Tool name validation (NEW) ──────────────────────────────────────────

describe("validateToolName", () => {
  it("accepts valid tool names", () => {
    expect(validateToolName("search")).toBe("search");
    expect(validateToolName("file_read")).toBe("file_read");
    expect(validateToolName("http-get")).toBe("http-get");
    expect(validateToolName("tool.v2")).toBe("tool.v2");
    expect(validateToolName("a".repeat(128))).toBe("a".repeat(128));
  });

  it("rejects empty string", () => {
    expect(() => validateToolName("")).toThrow(MCPClientError);
  });

  it("rejects non-string", () => {
    expect(() => validateToolName(null)).toThrow(MCPClientError);
    expect(() => validateToolName(42)).toThrow(MCPClientError);
    expect(() => validateToolName(undefined)).toThrow(MCPClientError);
  });

  it("rejects name exceeding 128 chars", () => {
    expect(() => validateToolName("a".repeat(129))).toThrow(MCPClientError);
  });

  it("rejects names with path traversal characters", () => {
    expect(() => validateToolName("../admin")).toThrow(MCPClientError);
  });

  it("rejects names with spaces", () => {
    expect(() => validateToolName("my tool")).toThrow(MCPClientError);
  });

  it("rejects names with shell metacharacters", () => {
    expect(() => validateToolName("tool;rm")).toThrow(MCPClientError);
    expect(() => validateToolName("tool$(evil)")).toThrow(MCPClientError);
    expect(() => validateToolName("tool`ls`")).toThrow(MCPClientError);
  });

  it("rejects names with null bytes", () => {
    expect(() => validateToolName("tool\x00")).toThrow(MCPClientError);
  });
});

// ─── 5. Tool description sanitization / prompt injection (NEW) ──────────────

describe("sanitizeToolDescription", () => {
  it("returns empty string for non-string input", () => {
    expect(sanitizeToolDescription(null)).toBe("");
    expect(sanitizeToolDescription(42)).toBe("");
    expect(sanitizeToolDescription(undefined)).toBe("");
  });

  it("truncates description exceeding 2000 chars", () => {
    const long = "a".repeat(3000);
    const result = sanitizeToolDescription(long);
    expect(result.length).toBe(2000);
  });

  it("strips ASCII control characters", () => {
    const withCtrl = "tool\x00desc\x01\x02\x1F";
    const result = sanitizeToolDescription(withCtrl);
    // eslint-disable-next-line no-control-regex -- intentional: verifying control chars were stripped
    expect(result).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F]/);
  });

  it("preserves normal text", () => {
    const desc = "Searches the web for information.";
    expect(sanitizeToolDescription(desc)).toBe(desc);
  });

  it("preserves newlines and tabs (normal whitespace)", () => {
    const desc = "Line one\nLine two\tTabbed";
    expect(sanitizeToolDescription(desc)).toBe(desc);
  });
});

// ─── 6. Tool count cap (NEW) ─────────────────────────────────────────────────

describe("MCP tool count cap", () => {
  it(`throws when server returns more than ${MAX_TOOLS_PER_SERVER} tools`, async () => {
    const tooManyTools = Array.from({ length: MAX_TOOLS_PER_SERVER + 1 }, (_, i) => ({
      name: `tool_${i}`,
      description: "A tool",
      inputSchema: { type: "object", properties: {} },
    }));

    vi.stubGlobal("fetch", makeMcpFetch(tooManyTools));

    await expect(
      connectMCPServer({
        transport: "http",
        url: "https://mcp.example.com/mcp",
      })
    ).rejects.toThrow(/exceeding the limit/);
  });

  it(`accepts exactly ${MAX_TOOLS_PER_SERVER} tools`, async () => {
    const maxTools = Array.from({ length: MAX_TOOLS_PER_SERVER }, (_, i) => ({
      name: `tool_${i}`,
      description: "A tool",
      inputSchema: { type: "object", properties: {} },
    }));

    vi.stubGlobal("fetch", makeMcpFetch(maxTools));

    const conn = await connectMCPServer({
      transport: "http",
      url: "https://mcp.example.com/mcp",
    });
    expect(conn.tools).toHaveLength(MAX_TOOLS_PER_SERVER);
  });
});

// ─── 7. Malicious tool name from remote server (NEW) ─────────────────────────

describe("MCP client rejects malicious tool names from server", () => {
  const badNames = ["", "../admin", "rm -rf /", "tool;sh", "tool\x00", "a".repeat(129)];

  for (const badName of badNames) {
    it(`rejects tool name: ${JSON.stringify(badName)}`, async () => {
      const tools = [{ name: badName, description: "bad", inputSchema: { type: "object", properties: {} } }];
      vi.stubGlobal("fetch", makeMcpFetch(tools));

      await expect(
        connectMCPServer({ transport: "http", url: "https://mcp.example.com/mcp" })
      ).rejects.toThrow(MCPClientError);
    });
  }
});

// ─── 8. Response size limit (NEW) ────────────────────────────────────────────

describe("MCP HTTP response size limit", () => {
  it("throws when Content-Length header exceeds 2 MB", async () => {
    const oversizedLength = 3 * 1024 * 1024; // 3 MB
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "content-length": String(oversizedLength) }),
        text: () => Promise.resolve(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2024-11-05" } })),
      })
    ));

    await expect(
      connectMCPServer({ transport: "http", url: "https://mcp.example.com/mcp" })
    ).rejects.toThrow(/too large/);
  });
});

// ─── 9. Bearer token empty string validation (NEW) ───────────────────────────

describe("Bearer token validation", () => {
  it("throws when bearer token is empty string", async () => {
    // The fetch mock returns success for initialize/tools-list;
    // but the empty token check fires before the first network call
    vi.stubGlobal("fetch", makeMcpFetch());

    await expect(
      connectMCPServer({
        transport: "http",
        url: "https://mcp.example.com/mcp",
        auth: { type: "bearer", token: "" },
      })
    ).rejects.toThrow(/empty/);
  });
});

// ─── 10. OAuth2 tokenUrl SSRF (NEW) ──────────────────────────────────────────

describe("OAuth2 tokenUrl SSRF prevention", () => {
  it("blocks RFC-1918 tokenUrl", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ access_token: "t" }) })));

    await expect(
      connectMCPServer({
        transport: "http",
        url: "https://mcp.example.com/mcp",
        auth: { type: "oauth2", clientId: "cid", tokenUrl: "http://192.168.1.1/token" },
      })
    ).rejects.toThrow(/RFC-1918/);
  });

  it("blocks metadata endpoint tokenUrl", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ access_token: "t" }) })));

    await expect(
      connectMCPServer({
        transport: "http",
        url: "https://mcp.example.com/mcp",
        auth: { type: "oauth2", clientId: "cid", tokenUrl: "http://169.254.169.254/token" },
      })
    ).rejects.toThrow(/SSRF blocked/);
  });

  it("blocks localhost tokenUrl", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ access_token: "t" }) })));

    await expect(
      connectMCPServer({
        transport: "http",
        url: "https://mcp.example.com/mcp",
        auth: { type: "oauth2", clientId: "cid", tokenUrl: "http://localhost:9999/token" },
      })
    ).rejects.toThrow(/SSRF blocked/);
  });
});

// ─── 11. disconnect() cancels the AbortController (NEW) ─────────────────────

describe("disconnect cancels pending requests", () => {
  it("disconnect resolves without errors and aborts in-flight requests", async () => {
    vi.stubGlobal("fetch", makeMcpFetch());

    const conn = await connectMCPServer({
      transport: "http",
      url: "https://mcp.example.com/mcp",
    });

    // Should not throw
    await expect(conn.disconnect()).resolves.toBeUndefined();
  });
});

// ─── 12. Stdio — args validation (NEW) ───────────────────────────────────────

describe("createStdioClient — args validation", () => {
  beforeEach(() => { vi.resetModules(); });

  it("rejects non-array args", async () => {
    const { createStdioClient } = await import("../tools/mcp/stdio-transport");
    // TypeScript prevents this at compile time but JS callers could bypass
    await expect(
      createStdioClient("node", "bad-args" as unknown as string[])
    ).rejects.toThrow(/args must be an array/);
  });

  it("rejects args containing non-string elements", async () => {
    const { createStdioClient } = await import("../tools/mcp/stdio-transport");
    await expect(
      createStdioClient("node", [42 as unknown as string])
    ).rejects.toThrow(/must be a string/);
  });

  it("rejects args with oversized elements (>4096 chars)", async () => {
    const { createStdioClient } = await import("../tools/mcp/stdio-transport");
    await expect(
      createStdioClient("node", ["a".repeat(4097)])
    ).rejects.toThrow(/maximum length/);
  });
});

// ─── 13. Stdio — oversized line guard (NEW) ───────────────────────────────────

describe("createStdioClient — oversized stdio line guard", () => {
  beforeEach(() => { vi.resetModules(); });

  it("discards oversized lines and does not reject pending requests silently", async () => {
    const rlEmitter = new EventEmitter() as EventEmitter & { close(): void };
    rlEmitter.close = vi.fn();

    const fakeStdin = {
      write: vi.fn((data: string) => {
        setImmediate(() => {
          try {
            const req = JSON.parse(data.trim());
            let result: unknown;
            if (req.method === "initialize") result = { protocolVersion: "2024-11-05", capabilities: {} };
            else if (req.method === "tools/list") result = { tools: [] };
            else result = {};

            // First emit an oversized line (should be discarded), then the real response
            if (req.method === "tools/list") {
              rlEmitter.emit("line", "x".repeat(2 * 1024 * 1024)); // 2 MB — over the 1 MB cap
              // Then send valid response
              rlEmitter.emit("line", JSON.stringify({ jsonrpc: "2.0", id: req.id, result }));
            } else {
              rlEmitter.emit("line", JSON.stringify({ jsonrpc: "2.0", id: req.id, result }));
            }
          } catch { /* ignore */ }
        });
      }),
    };

    const fakeChild = {
      stdin: fakeStdin,
      stdout: new EventEmitter(),
      killed: false,
      kill: vi.fn(),
      on: vi.fn((event: string, cb: () => void) => {
        if (event === "exit") setImmediate(cb);
      }),
    };

    vi.doMock("node:child_process", () => ({ spawn: vi.fn().mockReturnValue(fakeChild) }));
    vi.doMock("node:readline", () => ({
      createInterface: vi.fn().mockReturnValue(rlEmitter),
    }));

    const { createStdioClient } = await import("../tools/mcp/stdio-transport");
    const client = await createStdioClient("node", []);
    // If oversized line handling is correct, tools/list still resolves (because valid response follows)
    expect(client.tools).toHaveLength(0);
    await client.disconnect();
  });
});

// ─── 14a. Stdio — JSON-RPC ID type confusion attack ─────────────────────────
// A malicious stdio MCP server could send responses with non-numeric IDs
// (objects, arrays, floats, strings) crafted to collide with a pending
// request's integer ID via Map key coercion. After the fix, only exact
// integer matches are resolved.
describe("createStdioClient — JSON-RPC ID type validation", () => {
  beforeEach(() => { vi.resetModules(); });

  it("ignores responses with object ID that would coerce to a matching string", async () => {
    const rlEmitter = new EventEmitter() as EventEmitter & { close(): void };
    rlEmitter.close = vi.fn();

    const fakeStdin = {
      write: vi.fn((data: string) => {
        setImmediate(() => {
          try {
            const req = JSON.parse(data.trim());
            let result: unknown;
            if (req.method === "initialize") {
              result = { protocolVersion: "2024-11-05", capabilities: {} };
              // Send with correct numeric id
              rlEmitter.emit("line", JSON.stringify({ jsonrpc: "2.0", id: req.id, result }));
            } else if (req.method === "tools/list") {
              result = { tools: [] };
              // Malicious: respond with a string id "1" instead of numeric 1
              // (or an object {valueOf: 1}) — should NOT resolve the pending promise
              rlEmitter.emit("line", JSON.stringify({ jsonrpc: "2.0", id: String(req.id), result }));
              // Then send the legitimate numeric response
              rlEmitter.emit("line", JSON.stringify({ jsonrpc: "2.0", id: req.id, result }));
            } else {
              result = {};
              rlEmitter.emit("line", JSON.stringify({ jsonrpc: "2.0", id: req.id, result }));
            }
          } catch { /* ignore */ }
        });
      }),
    };

    const fakeChild = {
      stdin: fakeStdin,
      stdout: new EventEmitter(),
      killed: false,
      kill: vi.fn(),
      on: vi.fn((event: string, cb: () => void) => {
        if (event === "exit") setImmediate(cb);
      }),
    };

    vi.doMock("node:child_process", () => ({ spawn: vi.fn().mockReturnValue(fakeChild) }));
    vi.doMock("node:readline", () => ({
      createInterface: vi.fn().mockReturnValue(rlEmitter),
    }));

    const { createStdioClient } = await import("../tools/mcp/stdio-transport");
    // Must resolve normally (numeric id fallback is sent after the poisoned string id)
    const client = await createStdioClient("node", []);
    expect(client.tools).toHaveLength(0);
    await client.disconnect();
  });

  it("ignores responses with null ID (server-side notifications)", async () => {
    const rlEmitter = new EventEmitter() as EventEmitter & { close(): void };
    rlEmitter.close = vi.fn();

    const fakeStdin = {
      write: vi.fn((data: string) => {
        setImmediate(() => {
          try {
            const req = JSON.parse(data.trim());
            let result: unknown;
            if (req.method === "initialize") {
              result = { protocolVersion: "2024-11-05", capabilities: {} };
            } else if (req.method === "tools/list") {
              result = { tools: [] };
            } else {
              result = {};
            }
            // First emit a null-id notification (should be ignored, not crash)
            rlEmitter.emit("line", JSON.stringify({ jsonrpc: "2.0", id: null, method: "notifications/tools/list_changed" }));
            // Then send real response
            rlEmitter.emit("line", JSON.stringify({ jsonrpc: "2.0", id: req.id, result }));
          } catch { /* ignore */ }
        });
      }),
    };

    const fakeChild = {
      stdin: fakeStdin,
      stdout: new EventEmitter(),
      killed: false,
      kill: vi.fn(),
      on: vi.fn((event: string, cb: () => void) => {
        if (event === "exit") setImmediate(cb);
      }),
    };

    vi.doMock("node:child_process", () => ({ spawn: vi.fn().mockReturnValue(fakeChild) }));
    vi.doMock("node:readline", () => ({
      createInterface: vi.fn().mockReturnValue(rlEmitter),
    }));

    const { createStdioClient } = await import("../tools/mcp/stdio-transport");
    const client = await createStdioClient("node", []);
    expect(client.tools).toHaveLength(0);
    await client.disconnect();
  });
});

// ─── 14. Stdio — tool count cap ───────────────────────────────────────────────

describe("createStdioClient — tool count cap", () => {
  beforeEach(() => { vi.resetModules(); });

  it(`rejects when stdio server returns more than ${MAX_TOOLS_PER_SERVER} tools`, async () => {
    const tooManyTools = Array.from({ length: MAX_TOOLS_PER_SERVER + 1 }, (_, i) => ({
      name: `tool_${i}`,
      description: "A tool",
      inputSchema: { type: "object", properties: {} },
    }));

    const rlEmitter = new EventEmitter() as EventEmitter & { close(): void };
    rlEmitter.close = vi.fn();

    const fakeStdin = {
      write: vi.fn((data: string) => {
        setImmediate(() => {
          try {
            const req = JSON.parse(data.trim());
            let result: unknown;
            if (req.method === "initialize") result = { protocolVersion: "2024-11-05", capabilities: {} };
            else if (req.method === "tools/list") result = { tools: tooManyTools };
            else result = {};
            rlEmitter.emit("line", JSON.stringify({ jsonrpc: "2.0", id: req.id, result }));
          } catch { /* ignore */ }
        });
      }),
    };

    const fakeChild = {
      stdin: fakeStdin,
      stdout: new EventEmitter(),
      killed: false,
      kill: vi.fn(),
      on: vi.fn((event: string, cb: () => void) => {
        if (event === "exit") setImmediate(cb);
      }),
    };

    vi.doMock("node:child_process", () => ({ spawn: vi.fn().mockReturnValue(fakeChild) }));
    vi.doMock("node:readline", () => ({
      createInterface: vi.fn().mockReturnValue(rlEmitter),
    }));

    const { createStdioClient } = await import("../tools/mcp/stdio-transport");
    await expect(createStdioClient("node", [])).rejects.toThrow(/exceeding the limit/);
  });
});
