import { createFromReadableStream } from "react-server-dom-webpack/client";
import { renderToReadableStream } from "react-dom/server";
import { injectRSCPayload } from "rsc-html-stream/server";
import React from "react";

export interface RenderToHtmlOptions {
  /** Bootstrap script content for client hydration. */
  bootstrapScript?: string;
  /** CSP nonce for injected <script> tags. */
  nonce?: string;
}

export async function renderToHtml(
  rscStream: ReadableStream<Uint8Array>,
  options: RenderToHtmlOptions = {}
): Promise<ReadableStream> {
  const [forSsr, forClient] = rscStream.tee();
  const contentPromise = createFromReadableStream(forSsr);

  function App(): React.ReactNode {
    return React.use(contentPromise) as React.ReactNode;
  }

  const htmlStream = await renderToReadableStream(
    React.createElement(App),
    {
      bootstrapScriptContent: options.bootstrapScript,
    }
  );

  return htmlStream.pipeThrough(
    injectRSCPayload(forClient, { nonce: options.nonce })
  );
}
