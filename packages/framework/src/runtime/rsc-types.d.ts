declare module "react-server-dom-webpack/client" {
  export function createFromReadableStream(
    stream: ReadableStream,
    options?: { signal?: AbortSignal }
  ): Promise<React.ReactNode>;

  export function createFromFetch(
    promiseForResponse: Promise<Response>,
    options?: { signal?: AbortSignal }
  ): Promise<React.ReactNode>;

  export function encodeReply(
    value: unknown,
    options?: { signal?: AbortSignal }
  ): Promise<FormData>;

  export function createServerReference(
    id: string,
    callServer?: (...args: unknown[]) => Promise<unknown>
  ): (...args: unknown[]) => Promise<unknown>;
}

declare module "react-server-dom-webpack/server" {
  export function renderToReadableStream(
    model: unknown,
    webpackMap: unknown,
    options?: {
      signal?: AbortSignal;
      onError?: (error: unknown) => void;
    }
  ): ReadableStream<Uint8Array>;

  export function decodeReply(
    body: FormData | string,
    webpackMap: unknown
  ): Promise<unknown>;

  export function decodeAction(
    body: FormData,
    serverManifest: unknown
  ): Promise<() => Promise<unknown>>;
}

declare module "rsc-html-stream/server" {
  export function injectRSCPayload(
    rscStream: ReadableStream,
    options?: { nonce?: string }
  ): TransformStream;
}

declare module "rsc-html-stream/client" {
  export const rscStream: ReadableStream;
}

declare module "@vitejs/plugin-rsc/rsc" {
  export function renderToReadableStream(
    element: unknown,
    clientManifest: unknown
  ): ReadableStream<Uint8Array>;

  export function createClientManifest(): unknown;
  export function createServerManifest(): unknown;
}
