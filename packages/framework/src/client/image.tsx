"use client";

import React, { forwardRef, useMemo, type ImgHTMLAttributes } from "react";

export interface ImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> {
  /** Image source: relative path for local, URL for remote. */
  src: string;
  /** Image width in pixels. Required unless `fill` is true. */
  width?: number;
  /** Image height in pixels. Required unless `fill` is true. */
  height?: number;
  /** Alt text — required for accessibility. */
  alt: string;
  /** Quality 1-100. Defaults to 75. */
  quality?: number;
  /** Fill mode: image takes parent's dimensions via absolute positioning. */
  fill?: boolean;
  /** Priority: adds fetchpriority="high" and disables lazy loading. */
  priority?: boolean;
  /** Object-fit when using fill mode. */
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  /** Responsive sizes attribute. */
  sizes?: string;
  /** Blur placeholder data URL. */
  blurDataURL?: string;
  /** Placeholder strategy. */
  placeholder?: "blur" | "empty";
}

const DEFAULT_QUALITY = 75;
const DEFAULT_WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
const DEVICE_WIDTHS = [640, 750, 828, 1080, 1200, 1920];

/**
 * Build optimization endpoint URL.
 * SSRF protection: only relative URLs are routed through the optimizer.
 * Remote URLs are rendered directly (CDN handles optimization).
 */
function buildOptimizedUrl(
  src: string,
  width: number,
  quality: number
): string {
  if (isRelativeUrl(src)) {
    return `/_fabrk/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
  }
  return src;
}

function isRelativeUrl(src: string): boolean {
  return src.startsWith("/") && !src.startsWith("//");
}

function buildSrcSet(
  src: string,
  quality: number,
  targetWidth?: number
): string {
  if (!isRelativeUrl(src)) return "";

  const widths = targetWidth
    ? DEFAULT_WIDTHS.filter((w) => w >= targetWidth * 0.5 && w <= targetWidth * 2)
    : DEVICE_WIDTHS;

  if (widths.length === 0) return "";

  return widths
    .map((w) => `${buildOptimizedUrl(src, w, quality)} ${w}w`)
    .join(", ");
}

/**
 * Sanitize blur data URL to prevent CSS injection.
 * Only allows base64-encoded data: URIs with image MIME types.
 */
function sanitizeBlurDataURL(url: string): string | undefined {
  if (!url) return undefined;

  const lower = url.toLowerCase().trim();
  const validPrefix = /^data:image\/(png|jpeg|jpg|gif|webp|avif|svg\+xml);base64,/;
  if (!validPrefix.test(lower)) return undefined;

  const base64Part = url.slice(url.indexOf(",") + 1);
  if (!/^[A-Za-z0-9+/=]+$/.test(base64Part)) return undefined;

  return url;
}

export const Image = forwardRef<HTMLImageElement, ImageProps>(
  function Image(
    {
      src,
      width,
      height,
      alt,
      quality = DEFAULT_QUALITY,
      fill = false,
      priority = false,
      objectFit = "cover",
      sizes,
      blurDataURL,
      placeholder,
      style,
      className,
      ...rest
    },
    ref
  ) {
    const optimizedSrc = useMemo(
      () => buildOptimizedUrl(src, width ?? 1080, quality),
      [src, width, quality]
    );

    const srcSet = useMemo(
      () => buildSrcSet(src, quality, width),
      [src, quality, width]
    );

    const computedSizes = sizes ?? (fill ? "100vw" : width ? `${width}px` : undefined);

    const fillStyles: React.CSSProperties = fill
      ? {
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit,
        }
      : {};

    const sanitizedBlur =
      placeholder === "blur" && blurDataURL
        ? sanitizeBlurDataURL(blurDataURL)
        : undefined;

    const placeholderStyles: React.CSSProperties = sanitizedBlur
      ? {
          backgroundImage: `url(${sanitizedBlur})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }
      : {};

    const combinedStyle: React.CSSProperties = {
      ...fillStyles,
      ...placeholderStyles,
      ...style,
    };

    const imgProps: Record<string, unknown> = {
      ...rest,
      ref,
      src: optimizedSrc,
      alt,
      className,
      style: Object.keys(combinedStyle).length > 0 ? combinedStyle : style,
      loading: priority ? "eager" : "lazy",
      decoding: priority ? "sync" : "async",
    };

    if (!fill && width) imgProps.width = width;
    if (!fill && height) imgProps.height = height;
    if (srcSet) imgProps.srcSet = srcSet;
    if (computedSizes) imgProps.sizes = computedSizes;
    if (priority) imgProps.fetchPriority = "high";

    return React.createElement("img", imgProps);
  }
);

const MAX_WIDTH = 3840;
const MIN_WIDTH = 16;
const MAX_QUALITY = 100;
const MIN_QUALITY = 1;

export interface ImageParams {
  url: string;
  width: number;
  quality: number;
}

/**
 * Parse and validate image optimization params from URL search params.
 * Returns null if params are invalid.
 */
export function parseImageParams(
  searchParams: URLSearchParams
): ImageParams | null {
  const url = searchParams.get("url");
  const w = searchParams.get("w");
  const q = searchParams.get("q");

  if (!url || !w) return null;

  // SSRF protection: only allow relative URLs
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  // Path traversal protection
  if (url.includes("..")) return null;

  const width = parseInt(w, 10);
  if (!Number.isFinite(width) || width < MIN_WIDTH || width > MAX_WIDTH) {
    return null;
  }

  const quality = q ? parseInt(q, 10) : DEFAULT_QUALITY;
  if (
    !Number.isFinite(quality) ||
    quality < MIN_QUALITY ||
    quality > MAX_QUALITY
  ) {
    return null;
  }

  return { url, width, quality };
}

/**
 * Content negotiation for image format.
 * Priority: AVIF > WebP > JPEG
 */
export function negotiateImageFormat(
  acceptHeader: string | null
): "avif" | "webp" | "jpeg" {
  if (!acceptHeader) return "jpeg";
  if (acceptHeader.includes("image/avif")) return "avif";
  if (acceptHeader.includes("image/webp")) return "webp";
  return "jpeg";
}
