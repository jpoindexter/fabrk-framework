"use client";

import { useSyncExternalStore, useRef } from "react";
import {
  patchHistory,
  getPrefetchResponse,
  storePrefetchResponse,
  NAVIGATE_EVENT,
} from "./navigation-state";

function subscribePathname(callback: () => void): () => void {
  window.addEventListener("popstate", callback);
  window.addEventListener(NAVIGATE_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(NAVIGATE_EVENT, callback);
  };
}

function getPathname(): string {
  return typeof window !== "undefined" ? window.location.pathname : "/";
}

function getServerPathname(): string {
  return "/";
}

export function usePathname(): string {
  return useSyncExternalStore(subscribePathname, getPathname, getServerPathname);
}

function getSearch(): string {
  return typeof window !== "undefined" ? window.location.search : "";
}

function getServerSearch(): string {
  return "";
}

export function useSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(subscribePathname, getSearch, getServerSearch);
  return new URLSearchParams(search);
}

function getParams(): Record<string, string> {
  return typeof window !== "undefined"
    ? window.__FABRK_PARAMS__ ?? {}
    : {};
}

function getServerParams(): Record<string, string> {
  return {};
}

export function useParams(): Record<string, string> {
  return useSyncExternalStore(subscribePathname, getParams, getServerParams);
}

export interface FabrkRouter {
  push(url: string, options?: NavigateOptions): void;
  replace(url: string, options?: NavigateOptions): void;
  back(): void;
  forward(): void;
  refresh(): void;
  prefetch(url: string): void;
}

export interface NavigateOptions {
  scroll?: boolean;
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

async function navigateImpl(
  url: string,
  mode: "push" | "replace",
  options?: NavigateOptions
): Promise<void> {
  if (!isSafeUrl(url)) return;

  const scroll = options?.scroll ?? true;

  const currentState = history.state ?? {};
  history.replaceState(
    { ...currentState, __fabrkScrollY: window.scrollY },
    ""
  );

  if (mode === "push") {
    history.pushState({}, "", url);
  } else {
    history.replaceState({}, "", url);
  }

  if (window.__FABRK_RSC_NAVIGATE__) {
    await window.__FABRK_RSC_NAVIGATE__(url);
  } else {
    const cached = getPrefetchResponse(url);
    if (!cached) {
      try {
        const res = await fetch(url, {
          headers: { "X-Fabrk-Navigate": "1", "X-Fabrk-Navigation": "soft" },
        });
        if (res.ok) {
          storePrefetchResponse(url, await res.text());
        }
      } catch { /* hard navigation is the fallback for RSC-less mode */ }
      window.location.href = url;
      return;
    }
  }

  window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT));
  if (scroll) {
    window.scrollTo(0, 0);
  }
}

export function prefetchUrl(url: string): void {
  if (getPrefetchResponse(url)) return;
  if (!isSafeUrl(url)) return;

  const schedule =
    typeof requestIdleCallback !== "undefined" ? requestIdleCallback : setTimeout;

  schedule(() => {
    fetch(url, {
      headers: { "X-Fabrk-Prefetch": "1", "X-Fabrk-Navigation": "soft" },
    })
      .then(async (res) => {
        if (res.ok) {
          storePrefetchResponse(url, await res.text());
        }
      })
      .catch(() => {});
  });
}

export function useRouter(): FabrkRouter {
  patchHistory();

  const routerRef = useRef<FabrkRouter | null>(null);

  if (!routerRef.current) {
    routerRef.current = {
      push: (url: string, opts?: NavigateOptions) => {
        navigateImpl(url, "push", opts);
      },
      replace: (url: string, opts?: NavigateOptions) => {
        navigateImpl(url, "replace", opts);
      },
      back: () => history.back(),
      forward: () => history.forward(),
      refresh: () => {
        navigateImpl(window.location.href, "replace");
      },
      prefetch: prefetchUrl,
    };
  }

  return routerRef.current;
}

let navigating = false;
const navListeners = new Set<() => void>();

export function setNavigating(value: boolean): void {
  navigating = value;
  for (const listener of navListeners) listener();
}

function subscribeNav(callback: () => void): () => void {
  navListeners.add(callback);
  return () => navListeners.delete(callback);
}

function getNavigating(): boolean {
  return navigating;
}

function getServerNavigating(): boolean {
  return false;
}

export function useLinkStatus(): { pending: boolean } {
  const pending = useSyncExternalStore(
    subscribeNav,
    getNavigating,
    getServerNavigating
  );
  return { pending };
}
