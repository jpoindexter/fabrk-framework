import { describe, it, expect } from "vitest";
import {
  notFound,
  redirect,
  permanentRedirect,
  isRedirectError,
  isNotFoundError,
} from "../runtime/server-helpers";
import { FABRK_NOT_FOUND, FABRK_REDIRECT } from "../runtime/error-boundary";

describe("notFound", () => {
  it("throws an error with FABRK_NOT_FOUND digest", () => {
    try {
      notFound();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as { digest: string }).digest).toBe(FABRK_NOT_FOUND);
      return;
    }
    throw new Error("notFound() did not throw");
  });

  it("is identified by isNotFoundError", () => {
    try {
      notFound();
    } catch (err) {
      expect(isNotFoundError(err)).toBe(true);
      return;
    }
  });
});

describe("redirect", () => {
  it("throws an error with FABRK_REDIRECT digest", () => {
    try {
      redirect("/login");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      const e = err as { digest: string; url: string; statusCode: number };
      expect(e.digest).toBe(FABRK_REDIRECT);
      expect(e.url).toBe("/login");
      expect(e.statusCode).toBe(307);
      return;
    }
    throw new Error("redirect() did not throw");
  });

  it("supports custom status codes", () => {
    try {
      redirect("/new-page", 301);
    } catch (err) {
      expect((err as { statusCode: number }).statusCode).toBe(301);
      return;
    }
  });

  it("is identified by isRedirectError", () => {
    try {
      redirect("/foo");
    } catch (err) {
      expect(isRedirectError(err)).toBe(true);
      return;
    }
  });

  it("rejects javascript: URLs", () => {
    expect(() => redirect("javascript:alert(1)")).toThrow("Unsafe redirect URL");
  });

  it("rejects data: URLs", () => {
    expect(() => redirect("data:text/html,<h1>hi</h1>")).toThrow("Unsafe redirect URL");
  });

  it("rejects vbscript: URLs", () => {
    expect(() => redirect("vbscript:foo")).toThrow("Unsafe redirect URL");
  });

  it("rejects absolute https:// URLs (open redirect fix)", () => {
    expect(() => redirect("https://evil.com/steal")).toThrow("Unsafe redirect URL");
  });

  it("rejects absolute http:// URLs (open redirect fix)", () => {
    expect(() => redirect("http://evil.com")).toThrow("Unsafe redirect URL");
  });

  it("allows relative URLs", () => {
    try {
      redirect("/dashboard/settings");
    } catch (err) {
      expect((err as { url: string }).url).toBe("/dashboard/settings");
      return;
    }
  });
});

describe("permanentRedirect", () => {
  it("uses 308 status code", () => {
    try {
      permanentRedirect("/new-location");
    } catch (err) {
      expect((err as { statusCode: number }).statusCode).toBe(308);
      return;
    }
  });
});

describe("isRedirectError / isNotFoundError", () => {
  it("returns false for regular errors", () => {
    expect(isRedirectError(new Error("regular"))).toBe(false);
    expect(isNotFoundError(new Error("regular"))).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isRedirectError("string")).toBe(false);
    expect(isNotFoundError(null)).toBe(false);
    expect(isRedirectError(undefined)).toBe(false);
    expect(isNotFoundError(42)).toBe(false);
  });
});
