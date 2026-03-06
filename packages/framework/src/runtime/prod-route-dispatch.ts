import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { buildSecurityHeaders } from "../middleware/security";
import {
  runMiddleware,
  type MiddlewareHandler,
} from "./middleware";
import {
  nodeHeadersToRecord,
  matchRoute,
  handleApiRoute,
  handleEdgeRoute,
  type ServerEntry,
} from "./route-handlers";
import { handlePageRoute } from "./page-renderer";
import { runWithContext } from "./server-context";
import { type ISRCacheHandler } from "./isr-cache";
import { drainStream } from "./prod-request-handlers";

export async function runMiddlewareStep(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  handler?: MiddlewareHandler,
  matchers?: RegExp[],
): Promise<Record<string, string> | null> {
  const mwHeaders: Record<string, string> = {};
  if (!handler) return mwHeaders;

  const webReq = new Request(`http://localhost${req.url || "/"}`, {
    method: req.method,
    headers: nodeHeadersToRecord(req.headers),
  });

  const mwResult = await runMiddleware(webReq, handler, matchers);

  if (mwResult.response) {
    const responseHeaders: Record<string, string> = {};
    mwResult.response.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value;
    });
    res.writeHead(mwResult.response.status, responseHeaders);
    res.end(await mwResult.response.text());
    return null;
  }

  if (mwResult.rewriteUrl) req.url = mwResult.rewriteUrl;
  if (mwResult.responseHeaders) {
    mwResult.responseHeaders.forEach((value: string, key: string) => {
      mwHeaders[key] = value;
    });
  }
  return mwHeaders;
}

export async function dispatchRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  serverEntry: ServerEntry,
  clientDir: string,
  mwHeaders: Record<string, string>,
  isrCache: ISRCacheHandler,
  cssTags: string,
  scriptTags: string,
) {
  const url = new URL(req.url || "/", "http://localhost");
  const isSoftNav = req.headers["x-fabrk-navigation"] === "soft";
  const matched = matchRoute(serverEntry.routes, url.pathname, isSoftNav);

  if (!matched) {
    sendFallback(res, clientDir, mwHeaders);
    return;
  }

  const routeAny = matched.route as Record<string, unknown>;
  if (
    routeAny.runtime === "edge" &&
    typeof routeAny.module === "object" &&
    routeAny.module !== null
  ) {
    const edgeResult = await handleEdgeRoute(req, matched.route, matched.params);
    const edgeHeaders: Record<string, string> = {};
    edgeResult.headers.forEach((value: string, key: string) => {
      edgeHeaders[key] = value;
    });
    res.writeHead(edgeResult.status, { ...edgeHeaders, ...buildSecurityHeaders() });
    if (edgeResult.body) {
      await drainStream(edgeResult.body.getReader(), res);
    }
    res.end();
    return;
  }

  if (matched.route.type === "api") {
    const result = await handleApiRoute(req, matched.route, matched.params);
    res.writeHead(result.status, { ...mwHeaders, ...result.headers });
    res.end(result.body);
  } else {
    const webReqForCtx = new Request(`http://localhost${req.url || "/"}`, {
      headers: nodeHeadersToRecord(req.headers),
    });
    const result = await runWithContext(webReqForCtx, () =>
      handlePageRoute(
        matched.route, matched.params, serverEntry,
        req.url || "/", cssTags, scriptTags, isrCache,
      ),
    );
    res.writeHead(result.status, { ...mwHeaders, ...result.headers });
    if (result.body instanceof ReadableStream) {
      await drainStream(result.body.getReader(), res);
      res.end();
    } else {
      res.end(result.body);
    }
  }
}

function sendFallback(
  res: http.ServerResponse,
  clientDir: string,
  mwHeaders: Record<string, string>,
) {
  const indexPath = path.join(clientDir, "index.html");
  const securityHeaders = buildSecurityHeaders();
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, "utf-8");
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      ...mwHeaders, ...securityHeaders,
    });
    res.end(html);
    return;
  }
  res.writeHead(404, {
    "Content-Type": "text/plain",
    ...mwHeaders, ...securityHeaders,
  });
  res.end("Not Found");
}
