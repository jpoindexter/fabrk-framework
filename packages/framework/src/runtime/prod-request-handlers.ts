import http from "node:http";
import { buildSecurityHeaders } from "../middleware/security";
import { isImageRequest, handleImageRequest } from "./image-handler";
import { isOGRequest, handleOGRequest, type OGTemplate } from "./og-handler";
import { nodeHeadersToRecord } from "./route-handlers";

export async function drainStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  res: http.ServerResponse,
): Promise<void> {
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally {
    reader.releaseLock();
  }
}

export function sendWebResponse(
  webRes: Response,
  res: http.ServerResponse,
): Promise<void> {
  const headers: Record<string, string> = {};
  webRes.headers.forEach((value: string, key: string) => {
    headers[key] = value;
  });
  res.writeHead(webRes.status, headers);
  if (webRes.body) {
    return drainStream(webRes.body.getReader(), res).then(() => {
      res.end();
    });
  }
  res.end();
  return Promise.resolve();
}

export async function collectBody(
  req: http.IncomingMessage,
  maxBytes: number,
  res: http.ServerResponse,
): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const secHeaders = buildSecurityHeaders();
      res.writeHead(413, { "Content-Type": "application/json", ...secHeaders });
      res.end(JSON.stringify({ error: "Request body too large" }));
      return null;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function handleImageReq(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  clientDir: string,
): Promise<boolean> {
  const parsedUrl = new URL(req.url || "/", "http://localhost");
  if (!isImageRequest(parsedUrl.pathname)) return false;

  const imgReq = new Request(`http://localhost${req.url || "/"}`, {
    method: "GET",
    headers: nodeHeadersToRecord(req.headers),
  });
  const imgRes = await handleImageRequest(imgReq, clientDir);
  await sendWebResponse(imgRes, res);
  return true;
}

export async function handleOGReq(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ogTemplates: Map<string, OGTemplate> | undefined,
): Promise<boolean> {
  const parsedUrl = new URL(req.url || "/", "http://localhost");
  if (!isOGRequest(parsedUrl.pathname) || !ogTemplates) return false;

  const ogReq = new Request(`http://localhost${req.url || "/"}`, {
    method: "GET",
    headers: nodeHeadersToRecord(req.headers),
  });
  const ogRes = await handleOGRequest(ogReq, ogTemplates);
  await sendWebResponse(ogRes, res);
  return true;
}

export function handleAIDashboardGuard(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): boolean {
  const remoteAddr = (
    req as unknown as { socket?: { remoteAddress?: string } }
  ).socket?.remoteAddress ?? "";
  const LOCAL_ADDRS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
  const url = new URL(req.url || "/", "http://localhost");

  if (url.pathname.startsWith("/__ai/") && !LOCAL_ADDRS.has(remoteAddr)) {
    res.writeHead(403, {
      "Content-Type": "text/plain",
      ...buildSecurityHeaders(),
    });
    res.end("Forbidden");
    return true;
  }
  return false;
}
