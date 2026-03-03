/**
 * Type-safe navigation utilities.
 *
 * Usage with codegen'd route types:
 *   import type { RoutePattern, ExtractParams } from "virtual:fabrk/route-types";
 *   const params = useParams<"/blog/[slug]">();
 *   // params: { slug: string }
 */

export function useParams<_T extends string>(): Record<string, string | string[] | undefined> {
  if (typeof window === "undefined") return {};
  const segments = window.location.pathname.split("/").filter(Boolean);
  const params: Record<string, string> = {};
  for (let i = 0; i < segments.length; i++) {
    params[`$${i}`] = segments[i];
  }
  return params;
}

export interface TypedLinkProps<_T extends string> {
  href: string;
  params?: Record<string, string | string[]>;
  children?: unknown;
  className?: string;
  prefetch?: boolean;
}

export function buildHref(
  pattern: string,
  params?: Record<string, string | string[]>,
): string {
  if (!params) return pattern;
  let href = pattern;
  for (const [key, value] of Object.entries(params)) {
    const arrayVal = Array.isArray(value) ? value.join("/") : value;
    href = href
      .replace(`[[...${key}]]`, arrayVal)
      .replace(`[...${key}]`, arrayVal)
      .replace(`[${key}]`, arrayVal);
  }
  return href;
}
