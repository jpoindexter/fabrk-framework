import { stripTrailingSlashes } from "./server-helpers";

export interface I18nConfig {
  locales: string[];
  defaultLocale: string;
  localePrefix?: "always" | "as-needed" | "never";
  localeDetection?: boolean;
}

const LOCALE_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

function isValidLocale(locale: string, config: I18nConfig): boolean {
  return config.locales.includes(locale);
}

export function extractLocale(
  pathname: string,
  config: I18nConfig
): { locale: string; pathname: string } {
  const mode = config.localePrefix ?? "as-needed";

  if (mode === "never") {
    return { locale: config.defaultLocale, pathname };
  }

  const segments = pathname.split("/");
  const candidate = segments[1] ?? "";

  if (candidate && LOCALE_RE.test(candidate) && isValidLocale(candidate, config)) {
    const stripped = "/" + segments.slice(2).join("/");
    const normalizedPath = stripped === "/" ? "/" : stripTrailingSlashes(stripped);
    return { locale: candidate, pathname: normalizedPath };
  }

  return { locale: config.defaultLocale, pathname };
}

export function detectLocale(
  acceptLanguage: string | null,
  config: I18nConfig
): string {
  if (!acceptLanguage) return config.defaultLocale;

  const entries = acceptLanguage
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      const qMatch = /;q=([\d.]+)/.exec(trimmed);
      const q = qMatch ? parseFloat(qMatch[1]) : 1.0;
      const lang = trimmed.replace(/;q=[\d.]+/, "").trim();
      return { lang, q };
    })
    .filter((e) => Number.isFinite(e.q) && e.q >= 0)
    .sort((a, b) => b.q - a.q);

  for (const { lang } of entries) {
    if (isValidLocale(lang, config)) return lang;
    const base = lang.split("-")[0];
    if (base && isValidLocale(base, config)) return base;
  }

  return config.defaultLocale;
}

export function localePath(
  pathname: string,
  locale: string,
  config: I18nConfig
): string {
  const mode = config.localePrefix ?? "as-needed";
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (mode === "never") return normalized;

  if (mode === "as-needed" && locale === config.defaultLocale) {
    return normalized;
  }

  return `/${locale}${normalized === "/" ? "" : normalized}`;
}

export function createI18nMiddleware(
  config: I18nConfig
): (request: Request) => Response | null {
  const mode = config.localePrefix ?? "as-needed";
  const detect = config.localeDetection !== false;

  return (request: Request): Response | null => {
    if (mode === "never") return null;

    const url = new URL(request.url);

    if (mode === "always") {
      const segments = url.pathname.split("/");
      const firstSeg = segments[1] ?? "";

      if (!isValidLocale(firstSeg, config)) {
        const detected = detect
          ? detectLocale(request.headers.get("Accept-Language"), config)
          : config.defaultLocale;
        const target = localePath(url.pathname, detected, config);
        const redirectUrl = new URL(target + url.search, request.url);
        return Response.redirect(redirectUrl.toString(), 307);
      }
      return null;
    }

    const segments = url.pathname.split("/");
    const firstSeg = segments[1] ?? "";
    if (firstSeg === config.defaultLocale) {
      const stripped = "/" + segments.slice(2).join("/");
      const normalizedStripped = stripped === "/" ? "/" : stripTrailingSlashes(stripped);
      const redirectUrl = new URL(normalizedStripped + url.search, request.url);
      return Response.redirect(redirectUrl.toString(), 307);
    }

    const hasLocalePrefix = firstSeg !== "" && isValidLocale(firstSeg, config);
    if (!hasLocalePrefix && detect) {
      const detected = detectLocale(request.headers.get("Accept-Language"), config);
      if (detected !== config.defaultLocale) {
        const target = localePath(url.pathname, detected, config);
        const redirectUrl = new URL(target + url.search, request.url);
        return Response.redirect(redirectUrl.toString(), 307);
      }
    }

    return null;
  };
}
