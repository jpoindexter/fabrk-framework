import { describe, it, expect, vi, afterEach } from "vitest";
import { createAuthGuard } from "../middleware/auth-guard";

describe("createAuthGuard", () => {
  it("passes when auth is 'none'", async () => {
    const guard = createAuthGuard("none");
    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
    });
    const result = await guard(req);
    expect(result).toBeNull();
  });

  it("rejects 401 when auth is 'required' and no Bearer token", async () => {
    const guard = createAuthGuard("required");
    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
    });
    const result = await guard(req);
    expect(result).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result!.status).toBe(401);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const body = await result!.json();
    expect(body.error).toContain("Authorization");
  });

  it("returns 500 when auth is 'required', Bearer token present, but validateToken not configured", async () => {
    const guard = createAuthGuard("required");
    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
      headers: { Authorization: "Bearer sk-test-123" },
    });
    const result = await guard(req);
    expect(result).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result!.status).toBe(500);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const body = await result!.json();
    expect(body.error).toContain("misconfiguration");
  });

  it("passes when auth is 'optional' and no token", async () => {
    const guard = createAuthGuard("optional");
    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
    });
    const result = await guard(req);
    expect(result).toBeNull();
  });

  it("passes when auth is 'optional' and valid Bearer token present", async () => {
    const guard = createAuthGuard("optional");
    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
      headers: { Authorization: "Bearer sk-test-123" },
    });
    const result = await guard(req);
    expect(result).toBeNull();
  });

  it("rejects malformed Bearer token", async () => {
    const guard = createAuthGuard("required");
    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    const result = await guard(req);
    expect(result).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result!.status).toBe(401);
  });

  it("rejects empty Bearer token", async () => {
    const guard = createAuthGuard("required");
    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
      headers: { Authorization: "Bearer " },
    });
    const result = await guard(req);
    expect(result).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result!.status).toBe(401);
  });

  it("validates token with validateToken callback", async () => {
    const guard = createAuthGuard({
      mode: "required",
      validateToken: (token) => token === "valid-token",
    });

    const validReq = new Request("http://localhost/api/agents/chat", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
    });
    expect(await guard(validReq)).toBeNull();

    const invalidReq = new Request("http://localhost/api/agents/chat", {
      method: "POST",
      headers: { Authorization: "Bearer bad-token" },
    });
    const result = await guard(invalidReq);
    expect(result).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result!.status).toBe(403);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const body = await result!.json();
    expect(body.error).toBe("Invalid token");
  });

  it("supports async validateToken", async () => {
    const guard = createAuthGuard({
      mode: "required",
      validateToken: async (token) => {
        await new Promise((r) => setTimeout(r, 1));
        return token === "async-valid";
      },
    });

    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
      headers: { Authorization: "Bearer async-valid" },
    });
    expect(await guard(req)).toBeNull();
  });

  it("skips validateToken when auth is 'optional' and no token", async () => {
    let called = false;
    const guard = createAuthGuard({
      mode: "optional",
      validateToken: () => {
        called = true;
        return false;
      },
    });

    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
    });
    expect(await guard(req)).toBeNull();
    expect(called).toBe(false);
  });

  it("propagates error when validateToken throws", async () => {
    const guard = createAuthGuard({
      mode: "required",
      validateToken: () => {
        throw new Error("DB connection failed");
      },
    });

    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
      headers: { Authorization: "Bearer some-token" },
    });
    await expect(guard(req)).rejects.toThrow("DB connection failed");
  });

  it("includes security headers on error responses", async () => {
    const guard = createAuthGuard("required");
    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
    });
    const result = await guard(req);
    expect(result).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result!.headers.get("X-Content-Type-Options")).toBe("nosniff");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result!.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("returns 500 with misconfiguration error when mode is 'required' and no validateToken configured", async () => {
    const guard = createAuthGuard("required");
    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
      headers: { Authorization: "Bearer any-token" },
    });
    const result = await guard(req);
    expect(result).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result!.status).toBe(500);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const body = await result!.json();
    expect(body.error).toContain("validateToken is required");
  });

  it("does not warn in 'optional' mode without validateToken", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const guard = createAuthGuard("optional");
    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
      headers: { Authorization: "Bearer any-token" },
    });
    await guard(req);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not warn when validateToken is provided in 'required' mode", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const guard = createAuthGuard({
      mode: "required",
      validateToken: () => true,
    });
    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
      headers: { Authorization: "Bearer valid" },
    });
    await guard(req);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("validates token in 'optional' mode when token is provided", async () => {
    const guard = createAuthGuard({
      mode: "optional",
      validateToken: (token) => token === "good",
    });

    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
      headers: { Authorization: "Bearer bad" },
    });
    const result = await guard(req);
    expect(result).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result!.status).toBe(403);
  });
});
