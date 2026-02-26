import { describe, it, expect } from "vitest";
import { loadFabrkConfig, defineFabrkConfig } from "../config/fabrk-config";

describe("fabrk config", () => {
  it("defineFabrkConfig returns typed config", () => {
    const config = defineFabrkConfig({
      ai: {
        defaultModel: "claude-sonnet-4-5-20250514",
        budget: { daily: 10 },
      },
    });
    expect(config.ai?.defaultModel).toBe("claude-sonnet-4-5-20250514");
    expect(config.ai?.budget?.daily).toBe(10);
  });

  it("defineFabrkConfig preserves all fields", () => {
    const config = defineFabrkConfig({
      ai: { defaultModel: "gpt-4o", fallback: ["claude-sonnet-4-5-20250514"] },
      auth: { provider: "nextauth", apiKeys: true, mfa: true },
      security: { csrf: true, csp: true, rateLimit: { windowMs: 60000, max: 100 } },
      deploy: { target: "vercel" },
    });
    expect(config.auth?.provider).toBe("nextauth");
    expect(config.security?.rateLimit?.max).toBe(100);
    expect(config.deploy?.target).toBe("vercel");
  });

  it("loads fabrk.config.ts — returns empty when no config", async () => {
    const config = await loadFabrkConfig("/tmp/test-no-config-" + Date.now());
    expect(config).toEqual({});
  });
});
