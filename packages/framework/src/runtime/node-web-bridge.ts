import type { Connect } from "vite";
import type { ServerResponse } from "node:http";

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB

export async function nodeToWebRequest(
  req: Connect.IncomingMessage,
  url: string
): Promise<Request> {
  const webUrl = `http://localhost${url}`;

  const bodyChunks: Buffer[] = [];
  let totalSize = 0;
  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > MAX_BODY_BYTES) {
      req.destroy();
      throw new Error("Request body too large");
    }
    bodyChunks.push(chunk);
  }
  const body = Buffer.concat(bodyChunks).toString();

  return new Request(webUrl, {
    method: req.method,
    headers: Object.fromEntries(
      Object.entries(req.headers).filter(
        ([, v]) => typeof v === "string"
      ) as [string, string][]
    ),
    body: req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
  });
}

export async function writeWebResponse(
  res: ServerResponse,
  webRes: Response
): Promise<void> {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value: string, key: string) => {
    res.setHeader(key, value);
  });

  if (webRes.body) {
    const reader = webRes.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  res.end();
}
