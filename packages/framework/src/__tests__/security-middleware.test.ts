import { describe, it, expect } from "vitest";
import { buildSecurityHeaders } from "../middleware/security";

describe("buildSecurityHeaders", () => {
  it("returns default security headers", () => {
    const headers = buildSecurityHeaders();
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe(
      "strict-origin-when-cross-origin"
    );
    expect(headers["X-XSS-Protection"]).toBe("1; mode=block");
  });

  it("adds CSP when enabled", () => {
    const headers = buildSecurityHeaders({ csp: true });
    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
  });

  it("omits CSP when not enabled", () => {
    const headers = buildSecurityHeaders({ csp: false });
    expect(headers["Content-Security-Policy"]).toBeUndefined();
  });
});
