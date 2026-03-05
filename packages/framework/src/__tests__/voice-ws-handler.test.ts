import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleRealtimeUpgrade, type RealtimeHandlerConfig } from "../agents/voice-ws-handler";
import { EventEmitter } from "node:events";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

function mockSocket() {
  const emitter = new EventEmitter();
  const socket = emitter as unknown as Duplex & { destroyed: boolean; destroy: ReturnType<typeof vi.fn> };
  socket.destroyed = false;
  socket.destroy = vi.fn(() => {
    socket.destroyed = true;
    return socket;
  });
  return socket;
}

function mockReq(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
  const emitter = new EventEmitter() as IncomingMessage;
  Object.assign(emitter, {
    url: "/__ai/realtime",
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
    ...overrides,
  });
  return emitter;
}

// Mock @fabrk/ai RealtimeProxy
const mockUpgrade = vi.fn().mockResolvedValue(undefined);
vi.mock("@fabrk/ai", () => ({
  RealtimeProxy: vi.fn().mockImplementation(() => ({
    upgrade: mockUpgrade,
  })),
}));

describe("handleRealtimeUpgrade", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: "test-key" };
    mockUpgrade.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("destroys socket when origin not allowed in dev mode", async () => {
    const socket = mockSocket();
    const req = mockReq({
      socket: { remoteAddress: "192.168.1.1" } as IncomingMessage["socket"],
    });

    await handleRealtimeUpgrade(req, socket, Buffer.alloc(0), {
      voice: { enabled: true, realtime: { enabled: true } },
      isDev: true,
    });

    expect(socket.destroy).toHaveBeenCalled();
  });

  it("allows localhost in dev mode", async () => {
    const socket = mockSocket();
    const req = mockReq({
      socket: { remoteAddress: "127.0.0.1" } as IncomingMessage["socket"],
    });

    await handleRealtimeUpgrade(req, socket, Buffer.alloc(0), {
      voice: { enabled: true, realtime: { enabled: true } },
      isDev: true,
    });

    expect(socket.destroy).not.toHaveBeenCalled();
    expect(mockUpgrade).toHaveBeenCalledOnce();
  });

  it("allows ::1 in dev mode", async () => {
    const socket = mockSocket();
    const req = mockReq({
      socket: { remoteAddress: "::1" } as IncomingMessage["socket"],
    });

    await handleRealtimeUpgrade(req, socket, Buffer.alloc(0), {
      voice: { enabled: true, realtime: { enabled: true } },
      isDev: true,
    });

    expect(socket.destroy).not.toHaveBeenCalled();
  });

  it("allows ::ffff:127.0.0.1 in dev mode", async () => {
    const socket = mockSocket();
    const req = mockReq({
      socket: { remoteAddress: "::ffff:127.0.0.1" } as IncomingMessage["socket"],
    });

    await handleRealtimeUpgrade(req, socket, Buffer.alloc(0), {
      voice: { enabled: true, realtime: { enabled: true } },
      isDev: true,
    });

    expect(socket.destroy).not.toHaveBeenCalled();
  });

  it("destroys socket when API key not configured", async () => {
    delete process.env.OPENAI_API_KEY;
    const socket = mockSocket();
    const req = mockReq();

    await handleRealtimeUpgrade(req, socket, Buffer.alloc(0), {
      voice: { enabled: true, realtime: { enabled: true } },
      isDev: false,
    });

    expect(socket.destroy).toHaveBeenCalled();
  });

  it("passes correct config to RealtimeProxy", async () => {
    const socket = mockSocket();
    const req = mockReq({ headers: { origin: "https://myapp.com" } });
    const config: RealtimeHandlerConfig = {
      voice: { enabled: true, realtime: { enabled: true, model: "gpt-4o-mini-realtime" } },
      openaiApiKey: "custom-key",
      isDev: false,
      allowedOrigins: ["https://myapp.com"],
      budgetAgentName: "voice-agent",
      budgetSessionId: "session-123",
    };

    await handleRealtimeUpgrade(req, socket, Buffer.alloc(0), config);

    expect(mockUpgrade).toHaveBeenCalledOnce();
    const proxyArgs = mockUpgrade.mock.calls[0];
    expect(proxyArgs[0]).toBe(req);
    expect(proxyArgs[1]).toBe(socket);
    expect(proxyArgs[3].apiKey).toBe("custom-key");
    expect(proxyArgs[3].model).toBe("gpt-4o-mini-realtime");
    expect(typeof proxyArgs[3].onUsage).toBe("function");
    expect(typeof proxyArgs[3].onError).toBe("function");
  });

  it("checks allowed origins in prod mode", async () => {
    const socket = mockSocket();
    const req = mockReq({ headers: { origin: "https://evil.com" } });

    await handleRealtimeUpgrade(req, socket, Buffer.alloc(0), {
      voice: { enabled: true, realtime: { enabled: true } },
      isDev: false,
      allowedOrigins: ["https://myapp.com"],
    });

    expect(socket.destroy).toHaveBeenCalled();
  });

  it("allows matching origin in prod mode", async () => {
    const socket = mockSocket();
    const req = mockReq({ headers: { origin: "https://myapp.com" } });

    await handleRealtimeUpgrade(req, socket, Buffer.alloc(0), {
      voice: { enabled: true, realtime: { enabled: true } },
      isDev: false,
      allowedOrigins: ["https://myapp.com"],
    });

    expect(socket.destroy).not.toHaveBeenCalled();
  });

  it("destroys socket when no allowedOrigins configured in prod (fail-closed)", async () => {
    const socket = mockSocket();
    const req = mockReq();

    await handleRealtimeUpgrade(req, socket, Buffer.alloc(0), {
      voice: { enabled: true, realtime: { enabled: true } },
      isDev: false,
    });

    expect(socket.destroy).toHaveBeenCalled();
  });

  it("blocks wildcard origins in production (no credential separation in WebSockets)", async () => {
    const socket = mockSocket();
    const req = mockReq({ headers: { origin: "https://any-origin.com" } });

    await handleRealtimeUpgrade(req, socket, Buffer.alloc(0), {
      voice: { enabled: true, realtime: { enabled: true } },
      isDev: false,
      allowedOrigins: ["*"],
    });

    expect(socket.destroy).toHaveBeenCalled();
  });

  it("uses env OPENAI_API_KEY as fallback", async () => {
    process.env.OPENAI_API_KEY = "env-key";
    const socket = mockSocket();
    const req = mockReq({ headers: { origin: "https://myapp.com" } });

    await handleRealtimeUpgrade(req, socket, Buffer.alloc(0), {
      voice: { enabled: true, realtime: { enabled: true } },
      isDev: false,
      allowedOrigins: ["https://myapp.com"],
    });

    const proxyArgs = mockUpgrade.mock.calls[0];
    expect(proxyArgs[3].apiKey).toBe("env-key");
  });

  it("prefers explicit apiKey over env", async () => {
    process.env.OPENAI_API_KEY = "env-key";
    const socket = mockSocket();
    const req = mockReq({ headers: { origin: "https://myapp.com" } });

    await handleRealtimeUpgrade(req, socket, Buffer.alloc(0), {
      voice: { enabled: true, realtime: { enabled: true } },
      openaiApiKey: "explicit-key",
      isDev: false,
      allowedOrigins: ["https://myapp.com"],
    });

    const proxyArgs = mockUpgrade.mock.calls[0];
    expect(proxyArgs[3].apiKey).toBe("explicit-key");
  });
});
