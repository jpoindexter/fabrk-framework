import { useEffect, useRef, createElement, type ReactElement } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Strategy = "beforeInteractive" | "afterInteractive" | "lazyOnload";

export interface ScriptProps {
  /** URL of the external script. */
  src: string;
  /** Loading strategy. Default: "afterInteractive". */
  strategy?: Strategy;
  /** Callback after successful load. */
  onLoad?: () => void;
  /** Callback on load failure. */
  onError?: (error: Error) => void;
  /** Unique ID — also used for dedup. */
  id?: string;
  /** Pass-through async attribute. Default: true for injected scripts. */
  async?: boolean;
  /** Pass-through defer attribute. */
  defer?: boolean;
  /** Arbitrary data-* attributes. */
  [key: `data-${string}`]: string | undefined;
}

// ---------------------------------------------------------------------------
// Dedup tracking (module-level singleton)
// ---------------------------------------------------------------------------

const loadedScripts = new Set<string>();

function scriptKey(src: string, id?: string): string {
  return id ?? src;
}

// ---------------------------------------------------------------------------
// DOM injection
// ---------------------------------------------------------------------------

function injectScript(
  props: ScriptProps,
  onLoad?: () => void,
  onError?: (error: Error) => void,
): void {
  const key = scriptKey(props.src, props.id);
  if (loadedScripts.has(key)) {
    onLoad?.();
    return;
  }

  const el = document.createElement("script");
  el.src = props.src;
  if (props.id) el.id = props.id;
  if (props.async !== false) el.async = true;
  if (props.defer) el.defer = true;

  // Forward data-* attributes
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith("data-") && typeof v === "string") {
      el.setAttribute(k, v);
    }
  }

  el.addEventListener("load", () => {
    loadedScripts.add(key);
    onLoad?.();
  });
  el.addEventListener("error", () => {
    onError?.(new Error(`Failed to load script: ${props.src}`));
  });

  document.head.appendChild(el);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Load an external script with configurable strategy.
 *
 * - `beforeInteractive` — renders a `<script>` tag in SSR output (blocking).
 * - `afterInteractive` — injects via DOM after hydration (default).
 * - `lazyOnload` — defers injection to idle callback / setTimeout.
 *
 * Duplicate scripts (same src or id) are automatically skipped.
 *
 * ```tsx
 * <Script src="https://cdn.example.com/analytics.js" strategy="lazyOnload" />
 * ```
 */
export function Script(props: ScriptProps): ReactElement | null {
  const { strategy = "afterInteractive", onLoad, onError } = props;
  const injected = useRef(false);

  useEffect(() => {
    if (strategy === "beforeInteractive") return;
    if (injected.current) return;
    injected.current = true;

    if (strategy === "lazyOnload") {
      const schedule =
        typeof requestIdleCallback === "function"
          ? requestIdleCallback
          : (cb: () => void) => setTimeout(cb, 1);
      schedule(() => injectScript(props, onLoad, onError));
    } else {
      injectScript(props, onLoad, onError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // beforeInteractive: emit a real <script> tag during SSR
  if (strategy === "beforeInteractive") {
    return createElement("script", {
      src: props.src,
      id: props.id,
      async: props.async !== false ? true : undefined,
      defer: props.defer ? true : undefined,
    });
  }

  return null;
}
