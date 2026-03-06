import type { ServerResponse } from "node:http";

const MAX_SSE_CONNECTIONS = 5;
const sinks = new Set<ServerResponse>();

export function getSinkCount(): number {
  return sinks.size;
}

export function canAcceptConnection(): boolean {
  return sinks.size < MAX_SSE_CONNECTIONS;
}

export function addSink(res: ServerResponse): void {
  sinks.add(res);
  const cleanup = () => { sinks.delete(res); };
  res.on("close", cleanup);
  res.on("error", cleanup);
}

export function broadcastSSE(data: string): void {
  for (const sink of sinks) {
    try {
      sink.write(data);
    } catch {
      sinks.delete(sink);
    }
  }
}
