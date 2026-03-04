import { describe, it, expect } from "vitest";
import { runWithContext, cookies, headers as getHeaders } from "../runtime/server-context";

describe("server-context", () => {
  it("cookies() returns empty map outside context", () => {
    expect(cookies().size).toBe(0);
  });

  it("cookies() parses Cookie header inside context", () => {
    const req = new Request("http://localhost/", { headers: { cookie: "session=abc; theme=dark" } });
    let result: Map<string, string> = new Map();
    runWithContext(req, () => { result = cookies(); });
    expect(result.get("session")).toBe("abc");
    expect(result.get("theme")).toBe("dark");
  });

  it("cookies() returns empty map when no Cookie header", () => {
    const req = new Request("http://localhost/");
    let result: Map<string, string> = new Map();
    runWithContext(req, () => { result = cookies(); });
    expect(result.size).toBe(0);
  });

  it("headers() returns empty Headers outside context", () => {
    expect(getHeaders().get("x-custom")).toBeNull();
  });

  it("headers() returns request headers inside context", () => {
    const req = new Request("http://localhost/", { headers: { "x-custom": "val" } });
    let result: Headers = new Headers();
    runWithContext(req, () => { result = getHeaders(); });
    expect(result.get("x-custom")).toBe("val");
  });

  it("nested runWithContext does not leak outer context into inner result", () => {
    const outer = new Request("http://localhost/", { headers: { cookie: "a=1" } });
    const inner = new Request("http://localhost/", { headers: { cookie: "b=2" } });
    runWithContext(outer, () => {
      let outerCookies!: Map<string, string>;
      runWithContext(inner, () => { /* inner context only */ });
      outerCookies = cookies();
      expect(outerCookies.get("a")).toBe("1");
      expect(outerCookies.has("b")).toBe(false);
    });
  });
});
