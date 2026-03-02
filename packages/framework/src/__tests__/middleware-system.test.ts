import { describe, it, expect } from "vitest";
import {
  compileMatcher,
  matchesMiddleware,
  runMiddleware,
  extractMiddleware,
  type MiddlewareHandler,
  type MiddlewareModule,
} from "../runtime/middleware";

// ---------------------------------------------------------------------------
// compileMatcher
// ---------------------------------------------------------------------------

describe("compileMatcher", () => {
  it("matches exact paths", () => {
    const re = compileMatcher("/dashboard");
    expect(re.test("/dashboard")).toBe(true);
    expect(re.test("/dashboard/")).toBe(true);
    expect(re.test("/other")).toBe(false);
  });

  it("matches single dynamic segment", () => {
    const re = compileMatcher("/blog/:slug");
    expect(re.test("/blog/hello")).toBe(true);
    expect(re.test("/blog/hello-world")).toBe(true);
    expect(re.test("/blog/")).toBe(false);
    expect(re.test("/blog/a/b")).toBe(false);
  });

  it("matches wildcard segment", () => {
    const re = compileMatcher("/api/:path*");
    expect(re.test("/api/users")).toBe(true);
    expect(re.test("/api/users/123")).toBe(true);
    expect(re.test("/api/users/123/posts")).toBe(true);
  });

  it("matches root path", () => {
    const re = compileMatcher("/");
    expect(re.test("/")).toBe(true);
  });

  it("rejects patterns with nested quantifiers (ReDoS)", () => {
    expect(() => compileMatcher("/(a+)+")).toThrow("ReDoS");
    expect(() => compileMatcher("/(*+)")).toThrow("ReDoS");
  });
});

// ---------------------------------------------------------------------------
// matchesMiddleware
// ---------------------------------------------------------------------------

describe("matchesMiddleware", () => {
  it("returns true when no matchers (matches all)", () => {
    expect(matchesMiddleware("/anything", undefined)).toBe(true);
    expect(matchesMiddleware("/anything", [])).toBe(true);
  });

  it("returns true when pathname matches any matcher", () => {
    const matchers = [compileMatcher("/api/:path*"), compileMatcher("/admin")];
    expect(matchesMiddleware("/api/users", matchers)).toBe(true);
    expect(matchesMiddleware("/admin", matchers)).toBe(true);
    expect(matchesMiddleware("/admin/", matchers)).toBe(true);
  });

  it("returns false when pathname matches none", () => {
    const matchers = [compileMatcher("/api/:path*")];
    expect(matchesMiddleware("/blog/hello", matchers)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// runMiddleware
// ---------------------------------------------------------------------------

describe("runMiddleware", () => {
  it("returns null response when handler returns null", async () => {
    const handler: MiddlewareHandler = async () => null;
    const req = new Request("http://localhost/test");
    const result = await runMiddleware(req, handler);
    expect(result.response).toBeNull();
  });

  it("returns null response when handler returns undefined", async () => {
    const handler: MiddlewareHandler = async () => undefined;
    const req = new Request("http://localhost/test");
    const result = await runMiddleware(req, handler);
    expect(result.response).toBeNull();
  });

  it("returns direct Response when handler returns one", async () => {
    const handler: MiddlewareHandler = async () =>
      new Response("blocked", { status: 403 });
    const req = new Request("http://localhost/test");
    const result = await runMiddleware(req, handler);
    expect(result.response).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.response!.status).toBe(403);
  });

  it("returns redirect response for redirectUrl", async () => {
    const handler: MiddlewareHandler = async () => ({
      continue: false,
      redirectUrl: "/login",
    });
    const req = new Request("http://localhost/dashboard");
    const result = await runMiddleware(req, handler);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.response!.status).toBe(307);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.response!.headers.get("Location")).toBe("/login");
  });

  it("returns rewrite info", async () => {
    const handler: MiddlewareHandler = async () => ({
      continue: true,
      rewriteUrl: "/internal/api",
    });
    const req = new Request("http://localhost/public/api");
    const result = await runMiddleware(req, handler);
    expect(result.response).toBeNull();
    expect(result.rewriteUrl).toBe("/internal/api");
  });

  it("returns custom response from result.response", async () => {
    const handler: MiddlewareHandler = async () => ({
      continue: false,
      response: new Response("custom", { status: 418 }),
    });
    const req = new Request("http://localhost/test");
    const result = await runMiddleware(req, handler);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.response!.status).toBe(418);
  });

  it("skips handler when matchers don't match", async () => {
    let called = false;
    const handler: MiddlewareHandler = async () => {
      called = true;
      return new Response("blocked", { status: 403 });
    };
    const matchers = [compileMatcher("/api/:path*")];
    const req = new Request("http://localhost/blog/hello");
    const result = await runMiddleware(req, handler, matchers);
    expect(result.response).toBeNull();
    expect(called).toBe(false);
  });

  it("runs handler when matchers match", async () => {
    const handler: MiddlewareHandler = async () =>
      new Response("ok", { status: 200 });
    const matchers = [compileMatcher("/api/:path*")];
    const req = new Request("http://localhost/api/users");
    const result = await runMiddleware(req, handler, matchers);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.response!.status).toBe(200);
  });

  it("returns 200 when continue is false with no response/redirect", async () => {
    const handler: MiddlewareHandler = async () => ({
      continue: false,
    });
    const req = new Request("http://localhost/test");
    const result = await runMiddleware(req, handler);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.response!.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// extractMiddleware
// ---------------------------------------------------------------------------

describe("extractMiddleware", () => {
  it("extracts handler and compiles matchers", () => {
    const handler: MiddlewareHandler = async () => null;
    const mod: MiddlewareModule = {
      default: handler,
      config: { matcher: ["/api/:path*", "/admin"] },
    };
    const result = extractMiddleware(mod);
    expect(result.handler).toBe(handler);
    expect(result.matchers).toHaveLength(2);
  });

  it("returns undefined matchers when no config", () => {
    const handler: MiddlewareHandler = async () => null;
    const mod: MiddlewareModule = { default: handler };
    const result = extractMiddleware(mod);
    expect(result.matchers).toBeUndefined();
  });

  it("throws when default export is not a function", () => {
    const mod = { default: "not a function" } as unknown as MiddlewareModule;
    expect(() => extractMiddleware(mod)).toThrow("must export a default function");
  });
});
