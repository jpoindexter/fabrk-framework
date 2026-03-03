import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

// ── validateCommand (exercised via createStdioClient) ──────────────────────

describe("createStdioClient — validateCommand", () => {
  beforeEach(() => { vi.resetModules(); });

  const BLOCKED = ["bash", "sh", "cmd", "cmd.exe", "powershell", "pwsh", "zsh"];

  for (const shell of BLOCKED) {
    it(`rejects blocked shell: ${shell}`, async () => {
      const { createStdioClient } = await import("../tools/mcp/stdio-transport");
      await expect(createStdioClient(shell)).rejects.toThrow(
        `Blocked command: ${shell}`
      );
    });
  }

  it("rejects shell buried in absolute path (/usr/bin/bash)", async () => {
    const { createStdioClient } = await import("../tools/mcp/stdio-transport");
    await expect(createStdioClient("/usr/bin/bash")).rejects.toThrow("Blocked command: bash");
  });

  it("rejects shell buried in Windows-style path (C:\\Windows\\System32\\cmd.exe)", async () => {
    const { createStdioClient } = await import("../tools/mcp/stdio-transport");
    await expect(createStdioClient("C:\\Windows\\System32\\cmd.exe")).rejects.toThrow(
      "Blocked command: cmd.exe"
    );
  });
});

// ── createStdioClient — full flow with mocked child_process + readline ─────

describe("createStdioClient — full flow", () => {
  beforeEach(() => { vi.resetModules(); });

  /**
   * Build a minimal fake MCP stdio server.
   *
   * Returns a `spawn` mock that, when called, creates an in-memory pipe:
   *   - `child.stdin.write(line)` is captured and replied to via `stdinLines`
   *   - `rlEmitter` drives the readline 'line' events the client listens to
   */
  function makeFakeMcpServer(tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>) {
    const stdinWritten: string[] = [];
    let requestIdCounter = 0;

    // EventEmitter used as the mock readline interface
    const rlEmitter = new EventEmitter() as EventEmitter & {
      close(): void;
    };
    rlEmitter.close = vi.fn();

    const fakeStdin = {
      write: vi.fn((data: string) => {
        stdinWritten.push(data);
        // Parse the JSON-RPC request and simulate server reply on next tick
        setImmediate(() => {
          try {
            const req = JSON.parse(data.trim());
            let result: unknown;
            if (req.method === "initialize") {
              result = { protocolVersion: "2024-11-05", capabilities: {} };
            } else if (req.method === "tools/list") {
              result = { tools };
            } else if (req.method === "tools/call") {
              result = {
                content: [{ type: "text", text: `result:${req.params?.name}` }],
              };
            } else {
              result = {};
            }
            rlEmitter.emit(
              "line",
              JSON.stringify({ jsonrpc: "2.0", id: req.id, result })
            );
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

    const spawnMock = vi.fn().mockReturnValue(fakeChild);

    // Mock both child_process and readline
    vi.doMock("node:child_process", () => ({ spawn: spawnMock }));
    vi.doMock("node:readline", () => ({
      createInterface: vi.fn().mockReturnValue(rlEmitter),
    }));

    return { fakeChild, rlEmitter, stdinWritten, spawnMock };
  }

  it("sends initialize and tools/list on connect", async () => {
    const { stdinWritten } = makeFakeMcpServer([]);
    const { createStdioClient } = await import("../tools/mcp/stdio-transport");

    const client = await createStdioClient("node", ["--version"]);
    await client.disconnect();

    const methods = stdinWritten
      .map((s) => JSON.parse(s.trim()).method as string)
      .filter(Boolean);
    expect(methods).toContain("initialize");
    expect(methods).toContain("tools/list");
  });

  it("exposes tools from tools/list response", async () => {
    const serverTools = [
      {
        name: "echo",
        description: "Echoes input",
        inputSchema: { type: "object", properties: { msg: { type: "string" } } },
      },
    ];
    makeFakeMcpServer(serverTools);
    const { createStdioClient } = await import("../tools/mcp/stdio-transport");

    const client = await createStdioClient("node", []);
    expect(client.tools).toHaveLength(1);
    expect(client.tools[0].name).toBe("echo");
    expect(client.tools[0].description).toBe("Echoes input");
    await client.disconnect();
  });

  it("tool handler sends tools/call and returns text content", async () => {
    const serverTools = [
      {
        name: "greet",
        description: "Greets",
        inputSchema: { type: "object", properties: {} },
      },
    ];
    makeFakeMcpServer(serverTools);
    const { createStdioClient } = await import("../tools/mcp/stdio-transport");

    const client = await createStdioClient("node", []);
    const result = await client.tools[0].handler({ name: "world" });
    expect(result.content[0].text).toBe("result:greet");
    await client.disconnect();
  });

  it("disconnect kills the child process", async () => {
    const { fakeChild } = makeFakeMcpServer([]);
    const { createStdioClient } = await import("../tools/mcp/stdio-transport");

    const client = await createStdioClient("node", []);
    await client.disconnect();

    expect(fakeChild.kill).toHaveBeenCalled();
  });
});

// ── startStdioServer ────────────────────────────────────────────────────────
// Note: startStdioServer uses require("node:readline") synchronously which
// cannot be intercepted by vi.doMock. The function is an I/O boundary that
// attaches readline to process.stdin — tested via integration rather than unit.

describe("startStdioServer — exports", () => {
  beforeEach(() => { vi.resetModules(); });

  it("is exported and is a function", async () => {
    const mod = await import("../tools/mcp/stdio-transport");
    expect(typeof mod.startStdioServer).toBe("function");
  });
});
