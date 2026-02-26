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
});
