import { describe, it, expect } from "vitest";
import { createAuthGuard } from "../middleware/auth-guard.js";

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
    expect(result!.status).toBe(401);
    const body = await result!.json();
    expect(body.error).toContain("Authorization");
  });

  it("passes when auth is 'required' and Bearer token present", async () => {
    const guard = createAuthGuard("required");
    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
      headers: { Authorization: "Bearer sk-test-123" },
    });
    const result = await guard(req);
    expect(result).toBeNull();
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
    expect(result!.status).toBe(403);
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
    expect(result!.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(result!.headers.get("X-Frame-Options")).toBe("DENY");
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
    expect(result!.status).toBe(403);
  });
});
