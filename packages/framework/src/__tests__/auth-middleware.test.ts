import { describe, it, expect, vi } from "vitest";
import { createAuthGuard } from "../middleware/auth";


describe("createAuthGuard", () => {
  it("returns null when validateToken is true (pass through)", async () => {
    const guard = createAuthGuard({ validateToken: async () => true, cookieName: "session" });
    const req = new Request("http://localhost/", { headers: { cookie: "session=valid" } });
    expect(await guard(req)).toBeNull();
  });

  it("redirects to loginPath when no cookie present", async () => {
    const guard = createAuthGuard({ validateToken: async () => false, loginPath: "/login" });
    const req = new Request("http://localhost/protected");
    const res = await guard(req) as Response;
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");
  });

  it("redirects when validateToken returns false", async () => {
    const guard = createAuthGuard({ validateToken: async () => false, loginPath: "/auth" });
    const req = new Request("http://localhost/dash", { headers: { cookie: "session=bad" } });
    const res = await guard(req) as Response;
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/auth");
  });

  it("returns 401 JSON when loginPath not set", async () => {
    const guard = createAuthGuard({ validateToken: async () => false });
    const req = new Request("http://localhost/api/data");
    const res = await guard(req) as Response;
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  it("passes extracted cookie token to validateToken", async () => {
    const validateToken = vi.fn(async () => true);
    const guard = createAuthGuard({ validateToken, cookieName: "auth" });
    const req = new Request("http://localhost/", { headers: { cookie: "auth=my-token" } });
    await guard(req);
    expect(validateToken).toHaveBeenCalledWith("my-token");
  });

  it("reads Authorization Bearer header as fallback", async () => {
    const validateToken = vi.fn(async () => true);
    const guard = createAuthGuard({ validateToken });
    const req = new Request("http://localhost/", { headers: { authorization: "Bearer tok" } });
    await guard(req);
    expect(validateToken).toHaveBeenCalledWith("tok");
  });

  describe("loginPath open redirect prevention", () => {
    it("throws on protocol-relative loginPath (//evil.com)", () => {
      expect(() =>
        createAuthGuard({ validateToken: async () => false, loginPath: "//evil.com" })
      ).toThrow("loginPath must be a relative path");
    });

    it("throws on absolute https:// loginPath", () => {
      expect(() =>
        createAuthGuard({ validateToken: async () => false, loginPath: "https://evil.com" })
      ).toThrow("loginPath must be a relative path");
    });

    it("throws on absolute http:// loginPath", () => {
      expect(() =>
        createAuthGuard({ validateToken: async () => false, loginPath: "http://evil.com" })
      ).toThrow("loginPath must be a relative path");
    });

    it("throws on javascript: loginPath", () => {
      expect(() =>
        createAuthGuard({ validateToken: async () => false, loginPath: "javascript:alert(1)" })
      ).toThrow("loginPath must be a relative path");
    });

    it("throws on control-character-smuggled protocol-relative path", () => {
      expect(() =>
        createAuthGuard({ validateToken: async () => false, loginPath: "\t//evil.com" })
      ).toThrow("loginPath must be a relative path");
    });

    it("accepts a valid relative loginPath", () => {
      expect(() =>
        createAuthGuard({ validateToken: async () => false, loginPath: "/login" })
      ).not.toThrow();
    });

    it("accepts a valid relative loginPath with query string", () => {
      expect(() =>
        createAuthGuard({ validateToken: async () => false, loginPath: "/auth/login?next=/dashboard" })
      ).not.toThrow();
    });
  });
});
