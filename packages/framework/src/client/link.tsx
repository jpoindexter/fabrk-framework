"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type AnchorHTMLAttributes,
  type MouseEvent,
} from "react";
import { prefetchUrl, navigateImpl } from "./navigation";
import { patchHistory } from "./navigation-state";

let observer: IntersectionObserver | null = null;
const observedElements = new Map<Element, () => void>();

function getObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;
  if (observer) return observer;

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const callback = observedElements.get(entry.target);
          if (callback) {
            callback();
            if (observer) observer.unobserve(entry.target);
            observedElements.delete(entry.target);
          }
        }
      }
    },
    { rootMargin: "250px" }
  );

  return observer;
}

export interface LinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  /** Use replaceState instead of pushState. */
  replace?: boolean;
  /** Scroll to top after navigation. Defaults to true. */
  scroll?: boolean;
  /** Prefetch strategy: "viewport" (default), "hover", or false. */
  prefetch?: "viewport" | "hover" | false;
}

const DANGEROUS_SCHEMES = new Set(["javascript:", "data:", "vbscript:"]);

function isExternalUrl(href: string): boolean {
  if (href.startsWith("/") || href.startsWith("#") || href.startsWith("?")) {
    return false;
  }
  try {
    const url = new URL(href, window.location.origin);
    return url.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function isDangerousScheme(href: string): boolean {
  const lower = href.toLowerCase().trim();
  for (const scheme of DANGEROUS_SCHEMES) {
    if (lower.startsWith(scheme)) return true;
  }
  return false;
}

function shouldNavigate(event: MouseEvent<HTMLAnchorElement>): boolean {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  if (event.button !== 0) return false;
  if (event.defaultPrevented) return false;
  return true;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  function Link(
    {
      href,
      replace: useReplace = false,
      scroll = true,
      prefetch: prefetchStrategy = "viewport",
      onClick,
      onMouseEnter,
      children,
      target,
      ...rest
    },
    ref
  ) {
    const elementRef = useRef<HTMLAnchorElement | null>(null);

    patchHistory();

    const handleClick = useCallback(
      (event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);

        if (event.defaultPrevented) return;
        if (!shouldNavigate(event)) return;
        if (target && target !== "_self") return;
        if (isDangerousScheme(href)) {
          event.preventDefault();
          return;
        }
        if (isExternalUrl(href)) return;

        event.preventDefault();

        navigateImpl(href, useReplace ? "replace" : "push", { scroll });
      },
      [href, useReplace, scroll, onClick, target]
    );

    const handleMouseEnter = useCallback(
      (event: MouseEvent<HTMLAnchorElement>) => {
        onMouseEnter?.(event);
        if (prefetchStrategy === "hover" && !isExternalUrl(href)) {
          prefetchUrl(href);
        }
      },
      [href, prefetchStrategy, onMouseEnter]
    );

    useEffect(() => {
      if (prefetchStrategy !== "viewport") return;
      if (isExternalUrl(href) || isDangerousScheme(href)) return;

      const el = elementRef.current;
      const obs = getObserver();
      if (!el || !obs) return;

      observedElements.set(el, () => prefetchUrl(href));
      obs.observe(el);

      return () => {
        obs.unobserve(el);
        observedElements.delete(el);
      };
    }, [href, prefetchStrategy]);

    const setRef = useCallback(
      (node: HTMLAnchorElement | null) => {
        elementRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    return React.createElement(
      "a",
      {
        ...rest,
        href,
        ref: setRef,
        target,
        onClick: handleClick,
        onMouseEnter: handleMouseEnter,
      },
      children
    );
  }
);
