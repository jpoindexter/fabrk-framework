import { AsyncLocalStorage } from "node:async_hooks";

const store = new AsyncLocalStorage<{ request: Request }>();

/** Runs fn with the given request available to cookies() and headers(). */
export function runWithContext<T>(request: Request, fn: () => T): T {
  return store.run({ request }, fn);
}

/**
 * Returns a Map of parsed cookies from the current request.
 * Returns empty Map when called outside a request context.
 */
export function cookies(): Map<string, string> {
  const ctx = store.getStore();
  const map = new Map<string, string>();
  if (!ctx) return map;
  const header = ctx.request.headers.get("cookie") ?? "";
  if (!header) return map;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key) map.set(key, val);
  }
  return map;
}

/**
 * Returns a copy of the request headers for the current request.
 * Returns empty Headers when called outside a request context.
 */
export function headers(): Headers {
  const ctx = store.getStore();
  return ctx ? new Headers(ctx.request.headers) : new Headers();
}
