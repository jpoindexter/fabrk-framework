import http from "node:http";
import { handleTTSRequest, handleSTTRequest } from "../agents/voice-handler";
import { nodeHeadersToRecord } from "./route-handlers";
import type { VoiceConfig } from "@fabrk/ai";
import { collectBody, sendWebResponse } from "./prod-request-handlers";

export async function handleApprovalReq(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  approvalHandler: (req: Request, agentName: string) => Promise<Response>,
): Promise<boolean> {
  const url = new URL(req.url || "/", "http://localhost");
  if (
    !url.pathname.startsWith("/__ai/agents/") ||
    !url.pathname.endsWith("/approve") ||
    req.method !== "POST"
  ) {
    return false;
  }

  const agentName = decodeURIComponent(
    url.pathname.slice("/__ai/agents/".length, -"/approve".length),
  ).replace(/[\r\n]/g, "");

  const APPROVE_MAX_BODY = 64 * 1024;
  const body = await collectBody(req, APPROVE_MAX_BODY, res);
  if (!body) return true; // 413 already sent

  const webReq = new Request(`http://localhost${req.url || "/"}`, {
    method: "POST",
    headers: nodeHeadersToRecord(req.headers),
    body: new Uint8Array(body),
  });
  const approveRes = await approvalHandler(webReq, agentName);
  const headers: Record<string, string> = {};
  approveRes.headers.forEach((v: string, k: string) => { headers[k] = v; });
  res.writeHead(approveRes.status, headers);
  res.end(await approveRes.text());
  return true;
}

export async function handleVoiceReq(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  voiceConfig: VoiceConfig | undefined,
): Promise<boolean> {
  const url = new URL(req.url || "/", "http://localhost");
  if (
    !voiceConfig?.enabled ||
    (url.pathname !== "/__ai/tts" && url.pathname !== "/__ai/stt")
  ) {
    return false;
  }

  const VOICE_MAX_BODY = 26 * 1024 * 1024;
  const body = await collectBody(req, VOICE_MAX_BODY, res);
  if (!body) return true; // 413 already sent

  const webReq = new Request(`http://localhost${req.url || "/"}`, {
    method: req.method,
    headers: nodeHeadersToRecord(req.headers),
    body: req.method !== "GET" && req.method !== "HEAD" ? new Uint8Array(body) : undefined,
  });

  const voiceRes = url.pathname === "/__ai/tts"
    ? await handleTTSRequest(webReq, { voice: voiceConfig })
    : await handleSTTRequest(webReq, { voice: voiceConfig });

  await sendWebResponse(voiceRes, res);
  return true;
}
