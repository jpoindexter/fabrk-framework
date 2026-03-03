import { createFromReadableStream } from "react-server-dom-webpack/client";
import { rscStream } from "rsc-html-stream/client";
import { hydrateRoot } from "react-dom/client";
import React from "react";

const NAVIGATE_EVENT = "fabrk:navigate";

declare global {
  interface Window {
    __FABRK_RSC_NAVIGATE__?: (url: string) => Promise<void>;
    __FABRK_RSC__?: boolean;
  }
}

const contentPromise = createFromReadableStream(rscStream);
let currentContent: ReturnType<typeof createFromReadableStream> = contentPromise;

function App(): React.ReactNode {
  return React.use(currentContent) as React.ReactNode;
}

const rootEl = document.getElementById("root");
let reactRoot: ReturnType<typeof hydrateRoot> | undefined;

if (rootEl) {
  reactRoot = hydrateRoot(rootEl, React.createElement(App));
}

/**
 * Navigate to a new page via RSC Flight protocol.
 * Fetches the `.rsc` payload for the target URL and re-renders the app.
 * Falls back to full page navigation on failure.
 */
window.__FABRK_RSC_NAVIGATE__ = async function (url: string): Promise<void> {
  const rscUrl = url.endsWith("/") ? url.slice(0, -1) + ".rsc" : url + ".rsc";

  try {
    const response = await fetch(rscUrl);
    if (!response.ok || !response.body) {
      window.location.href = url;
      return;
    }

    currentContent = createFromReadableStream(response.body);

    if (reactRoot) {
      const root = reactRoot;
      React.startTransition(() => {
        root.render(React.createElement(App));
        window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT));
      });
    }
  } catch {
    // Network error — fall back to full page navigation
    window.location.href = url;
  }
};
