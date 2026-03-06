import { buildSecurityHeaders } from "../middleware/security";
import type { ServerEntry } from "./route-handlers";
import { resolveHeadHtml, wrapWithLayouts, buildHtmlShell, buildStreamShell } from "./page-layout";

type PageResult = { status: number; headers: Record<string, string>; body: string | ReadableStream };

export async function renderWithReact(
  route: ServerEntry["routes"][number],
  params: Record<string, string>,
  serverEntry: ServerEntry,
  reqUrl: string,
  cssTags: string,
  scriptTags: string,
  routeHeaders: Record<string, string>,
): Promise<PageResult> {
  const [reactDomServer, React] = await Promise.all([
    import("react-dom/server"),
    import("react"),
  ]);

  const createElement = React.createElement ?? React.default?.createElement;
  const renderToString = reactDomServer.renderToString ?? reactDomServer.default?.renderToString;
  const renderToReadableStream = reactDomServer.renderToReadableStream ?? reactDomServer.default?.renderToReadableStream;

  if (typeof createElement !== "function") {
    return errorResponse(500, "text/plain", "React SSR modules not available");
  }

  const url = new URL(reqUrl, "http://localhost");
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const head = await resolveHeadHtml(route, serverEntry, { params, searchParams });

  let element: React.ReactNode = createElement(
    route.module.default as React.FC<Record<string, unknown>>,
    { params, searchParams }
  );
  element = wrapWithLayouts(element, route, serverEntry, createElement);

  if (typeof renderToReadableStream === "function") {
    return streamResponse(element, head, cssTags, scriptTags, route, routeHeaders, renderToReadableStream);
  }

  if (typeof renderToString !== "function") {
    return errorResponse(500, "text/plain", "React SSR modules not available");
  }

  const ssrBody = renderToString(element);
  return {
    status: 200,
    headers: { ...routeHeaders, "Content-Type": "text/html; charset=utf-8", ...buildSecurityHeaders() },
    body: buildHtmlShell(head, ssrBody, cssTags, scriptTags),
  };
}

function streamResponse(
  element: React.ReactNode,
  head: string,
  cssTags: string,
  scriptTags: string,
  route: ServerEntry["routes"][number],
  routeHeaders: Record<string, string>,
  renderToReadableStream: (el: React.ReactNode, opts?: Record<string, unknown>) => Promise<ReadableStream>,
): Promise<{ status: number; headers: Record<string, string>; body: ReadableStream }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderOpts: any = {};
  const routeAny = route as Record<string, unknown>;
  if (routeAny.ppr === true) {
    renderOpts.onPostpone = () => { /* PPR: allow deferred streaming */ };
  }

  return renderToReadableStream(element, renderOpts).then((reactStream) => {
    const { prefix, suffix } = buildStreamShell(head, cssTags, scriptTags);
    const encoder = new TextEncoder();
    const reader = reactStream.getReader();

    const stream = new ReadableStream({
      async start(controller) { controller.enqueue(encoder.encode(prefix)); },
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) { controller.enqueue(encoder.encode(suffix)); controller.close(); return; }
          controller.enqueue(value);
        } catch { controller.close(); }
      },
    });

    return {
      status: 200,
      headers: {
        ...routeHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Transfer-Encoding": "chunked",
        ...buildSecurityHeaders(),
      },
      body: stream,
    };
  });
}

export function errorResponse(
  status: number,
  contentType: string,
  body: string,
): { status: number; headers: Record<string, string>; body: string } {
  return { status, headers: { "Content-Type": contentType, ...buildSecurityHeaders() }, body };
}
