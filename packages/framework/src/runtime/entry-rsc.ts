import {
  renderToReadableStream,
  createClientManifest,
} from "@vitejs/plugin-rsc/rsc";

// Accepts either a bare element or an options object for backwards compat.
export function renderRsc(
  elementOrOptions: React.ReactElement | { element: React.ReactElement },
): ReadableStream<Uint8Array> {
  const element =
    "element" in elementOrOptions ? elementOrOptions.element : elementOrOptions;
  const clientManifest = createClientManifest();
  return renderToReadableStream(element, clientManifest);
}

export { createClientManifest };
