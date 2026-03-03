import { describe, it, expect } from "vitest";
import {
  extractLocale,
  detectLocale,
  localePath,
  createI18nMiddleware,
  type I18nConfig,
} from "../runtime/i18n";

const BASE_CONFIG: I18nConfig = {
  locales: ["en", "fr", "de"],
  defaultLocale: "en",
};

// ---------------------------------------------------------------------------
// extractLocale
// ---------------------------------------------------------------------------

describe("extractLocale", () => {
  it("strips non-default locale prefix (as-needed)", () => {
    const result = extractLocale("/fr/about", BASE_CONFIG);
    expect(result).toEqual({ locale: "fr", pathname: "/about" });
  });

  it("returns default locale when no prefix (as-needed)", () => {
    const result = extractLocale("/about", BASE_CONFIG);
    expect(result).toEqual({ locale: "en", pathname: "/about" });
  });

  it("handles root path with locale prefix", () => {
    const result = extractLocale("/de", BASE_CONFIG);
    expect(result).toEqual({ locale: "de", pathname: "/" });
  });

  it("handles root path without locale prefix", () => {
    const result = extractLocale("/", BASE_CONFIG);
    expect(result).toEqual({ locale: "en", pathname: "/" });
  });

  it("ignores unknown locale — keeps full path", () => {
    const result = extractLocale("/es/about", BASE_CONFIG);
    expect(result).toEqual({ locale: "en", pathname: "/es/about" });
  });

  it("strips default locale prefix too", () => {
    const result = extractLocale("/en/about", BASE_CONFIG);
    expect(result).toEqual({ locale: "en", pathname: "/about" });
  });

  it("handles deep paths", () => {
    const result = extractLocale("/fr/docs/api/v2", BASE_CONFIG);
    expect(result).toEqual({ locale: "fr", pathname: "/docs/api/v2" });
  });

  describe('localePrefix: "always"', () => {
    const config: I18nConfig = { ...BASE_CONFIG, localePrefix: "always" };

    it("strips locale prefix from default locale", () => {
      const result = extractLocale("/en/about", config);
      expect(result).toEqual({ locale: "en", pathname: "/about" });
    });

    it("strips locale prefix from non-default locale", () => {
      const result = extractLocale("/fr/about", config);
      expect(result).toEqual({ locale: "fr", pathname: "/about" });
    });

    it("returns default when no prefix present", () => {
      const result = extractLocale("/about", config);
      expect(result).toEqual({ locale: "en", pathname: "/about" });
    });
  });

  describe('localePrefix: "never"', () => {
    const config: I18nConfig = { ...BASE_CONFIG, localePrefix: "never" };

    it("always returns default locale and original path", () => {
      const result = extractLocale("/fr/about", config);
      expect(result).toEqual({ locale: "en", pathname: "/fr/about" });
    });

    it("root path", () => {
      const result = extractLocale("/", config);
      expect(result).toEqual({ locale: "en", pathname: "/" });
    });
  });

  it("strips trailing slashes from extracted pathname", () => {
    const result = extractLocale("/fr/about/", BASE_CONFIG);
    expect(result).toEqual({ locale: "fr", pathname: "/about" });
  });
});

// ---------------------------------------------------------------------------
// detectLocale
// ---------------------------------------------------------------------------

describe("detectLocale", () => {
  it("returns default for null header", () => {
    expect(detectLocale(null, BASE_CONFIG)).toBe("en");
  });

  it("returns default for empty string", () => {
    expect(detectLocale("", BASE_CONFIG)).toBe("en");
  });

  it("matches exact locale", () => {
    expect(detectLocale("fr", BASE_CONFIG)).toBe("fr");
  });

  it("matches highest quality locale", () => {
    expect(detectLocale("de;q=0.5, fr;q=0.9", BASE_CONFIG)).toBe("fr");
  });

  it("falls back to base language (fr-FR → fr)", () => {
    expect(detectLocale("fr-FR", BASE_CONFIG)).toBe("fr");
  });

  it("returns default when no match", () => {
    expect(detectLocale("ja,zh;q=0.5", BASE_CONFIG)).toBe("en");
  });

  it("handles complex Accept-Language header", () => {
    expect(detectLocale("en-US,en;q=0.9,de;q=0.8,fr;q=0.7", BASE_CONFIG)).toBe("en");
  });

  it("picks first match among equal quality", () => {
    expect(detectLocale("fr,de", BASE_CONFIG)).toBe("fr");
  });

  it("ignores invalid quality values", () => {
    expect(detectLocale("fr;q=abc, de;q=0.9", BASE_CONFIG)).toBe("de");
  });

  it("implicit q=1 beats explicit lower q", () => {
    expect(detectLocale("de, fr;q=0.5", BASE_CONFIG)).toBe("de");
  });
});

// ---------------------------------------------------------------------------
// localePath
// ---------------------------------------------------------------------------

describe("localePath", () => {
  it("no prefix for default locale (as-needed)", () => {
    expect(localePath("/about", "en", BASE_CONFIG)).toBe("/about");
  });

  it("adds prefix for non-default locale (as-needed)", () => {
    expect(localePath("/about", "fr", BASE_CONFIG)).toBe("/fr/about");
  });

  it("handles root path for non-default locale", () => {
    expect(localePath("/", "fr", BASE_CONFIG)).toBe("/fr");
  });

  it("handles root path for default locale", () => {
    expect(localePath("/", "en", BASE_CONFIG)).toBe("/");
  });

  it("normalizes missing leading slash", () => {
    expect(localePath("about", "fr", BASE_CONFIG)).toBe("/fr/about");
  });

  describe('localePrefix: "always"', () => {
    const config: I18nConfig = { ...BASE_CONFIG, localePrefix: "always" };

    it("prefixes default locale", () => {
      expect(localePath("/about", "en", config)).toBe("/en/about");
    });

    it("prefixes non-default locale", () => {
      expect(localePath("/about", "fr", config)).toBe("/fr/about");
    });

    it("handles root for default locale", () => {
      expect(localePath("/", "en", config)).toBe("/en");
    });
  });

  describe('localePrefix: "never"', () => {
    const config: I18nConfig = { ...BASE_CONFIG, localePrefix: "never" };

    it("never adds prefix", () => {
      expect(localePath("/about", "fr", config)).toBe("/about");
    });

    it("never adds prefix for default locale", () => {
      expect(localePath("/about", "en", config)).toBe("/about");
    });
  });
});

// ---------------------------------------------------------------------------
// createI18nMiddleware
// ---------------------------------------------------------------------------

describe("createI18nMiddleware", () => {
  describe('as-needed mode', () => {
    const middleware = createI18nMiddleware(BASE_CONFIG);

    it("returns null when no redirect needed", () => {
      const req = new Request("http://localhost/about");
      expect(middleware(req)).toBeNull();
    });

    it("redirects when default locale is in URL", () => {
      const req = new Request("http://localhost/en/about");
      const res = middleware(req);
      expect(res).toBeInstanceOf(Response);
      expect(res!.status).toBe(307);
      expect(new URL(res!.headers.get("Location")!).pathname).toBe("/about");
    });

    it("redirects to detected locale when Accept-Language prefers non-default", () => {
      const req = new Request("http://localhost/about", {
        headers: { "Accept-Language": "fr" },
      });
      const res = middleware(req);
      expect(res).toBeInstanceOf(Response);
      expect(res!.status).toBe(307);
      expect(new URL(res!.headers.get("Location")!).pathname).toBe("/fr/about");
    });

    it("returns null for non-default locale prefix already present", () => {
      const req = new Request("http://localhost/fr/about");
      expect(middleware(req)).toBeNull();
    });

    it("preserves query params on redirect", () => {
      const req = new Request("http://localhost/en/about?foo=bar");
      const res = middleware(req);
      expect(res).toBeInstanceOf(Response);
      const redirectUrl = new URL(res!.headers.get("Location")!);
      expect(redirectUrl.pathname).toBe("/about");
      expect(redirectUrl.search).toBe("?foo=bar");
    });

    it("strips default locale from root", () => {
      const req = new Request("http://localhost/en");
      const res = middleware(req);
      expect(res).toBeInstanceOf(Response);
      expect(new URL(res!.headers.get("Location")!).pathname).toBe("/");
    });
  });

  describe('always mode', () => {
    const config: I18nConfig = { ...BASE_CONFIG, localePrefix: "always" };
    const middleware = createI18nMiddleware(config);

    it("redirects when no locale prefix", () => {
      const req = new Request("http://localhost/about");
      const res = middleware(req);
      expect(res).toBeInstanceOf(Response);
      expect(res!.status).toBe(307);
      expect(new URL(res!.headers.get("Location")!).pathname).toBe("/en/about");
    });

    it("returns null when locale prefix present", () => {
      const req = new Request("http://localhost/fr/about");
      expect(middleware(req)).toBeNull();
    });

    it("redirects root to locale-prefixed root", () => {
      const req = new Request("http://localhost/");
      const res = middleware(req);
      expect(res).toBeInstanceOf(Response);
      expect(new URL(res!.headers.get("Location")!).pathname).toBe("/en");
    });

    it("uses Accept-Language for redirect target", () => {
      const req = new Request("http://localhost/about", {
        headers: { "Accept-Language": "de" },
      });
      const res = middleware(req);
      expect(res).toBeInstanceOf(Response);
      expect(new URL(res!.headers.get("Location")!).pathname).toBe("/de/about");
    });
  });

  describe('never mode', () => {
    const config: I18nConfig = { ...BASE_CONFIG, localePrefix: "never" };
    const middleware = createI18nMiddleware(config);

    it("always returns null", () => {
      const req = new Request("http://localhost/about");
      expect(middleware(req)).toBeNull();
    });

    it("returns null even with locale-like path", () => {
      const req = new Request("http://localhost/fr/about");
      expect(middleware(req)).toBeNull();
    });
  });

  describe("locale detection disabled", () => {
    const config: I18nConfig = {
      ...BASE_CONFIG,
      localePrefix: "always",
      localeDetection: false,
    };
    const middleware = createI18nMiddleware(config);

    it("redirects to default locale regardless of Accept-Language", () => {
      const req = new Request("http://localhost/about", {
        headers: { "Accept-Language": "de" },
      });
      const res = middleware(req);
      expect(res).toBeInstanceOf(Response);
      expect(new URL(res!.headers.get("Location")!).pathname).toBe("/en/about");
    });
  });
});
