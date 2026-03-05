import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import type { VoiceConfig } from "@fabrk/ai";
import { recordCost } from "./budget-guard";

const LOCALHOST_ADDRS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export interface RealtimeHandlerConfig {
  voice?: VoiceConfig;
  openaiApiKey?: string;
  isDev?: boolean;
  allowedOrigins?: string[];
  budgetAgentName?: string;
  budgetSessionId?: string;
}

function isLocalhost(addr: string | undefined): boolean {
  return !!addr && LOCALHOST_ADDRS.has(addr);
}

function isOriginAllowed(
  req: IncomingMessage,
  config: RealtimeHandlerConfig,
): boolean {
  if (config.isDev) {
    return isLocalhost(req.socket?.remoteAddress);
  }

  if (!config.allowedOrigins || config.allowedOrigins.length === 0) {
    return false;
  }

  // Wildcard "*" is not supported for WebSocket upgrades. Unlike HTTP CORS,
  // WebSockets have no credential separation at the browser level — any origin
  // could open a socket and stream audio or receive data. Force explicit origins.
  const origin = req.headers.origin;
  if (!origin) return false;
  return config.allowedOrigins.includes(origin);
}

export async function handleRealtimeUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  config: RealtimeHandlerConfig,
): Promise<void> {
  if (!isOriginAllowed(req, config)) {
    socket.destroy(new Error("Origin not allowed"));
    return;
  }

  const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    socket.destroy(new Error("OpenAI API key not configured for realtime"));
    return;
  }

  try {
    const { RealtimeProxy } = await import("@fabrk/ai");
    const proxy = new RealtimeProxy();

    const agentName = config.budgetAgentName || "realtime";
    const sessionId = config.budgetSessionId || "default";

    await proxy.upgrade(req, socket, head, {
      apiKey,
      model: config.voice?.realtime?.model,
      onUsage: (usage) => {
        // Rough cost estimate: $5/1M input, $20/1M output for realtime
        const cost = (usage.inputTokens * 5 + usage.outputTokens * 20) / 1_000_000;
        if (Number.isFinite(cost) && cost >= 0) {
          recordCost(agentName, sessionId, cost);
        }
      },
      onError: (err) => {
        console.error("[fabrk] Realtime WebSocket error:", err.message);
      },
    });
  } catch (err) {
    console.error("[fabrk] Realtime upgrade failed:", err);
    socket.destroy(
      err instanceof Error ? err : new Error("Realtime upgrade failed"),
    );
  }
}
