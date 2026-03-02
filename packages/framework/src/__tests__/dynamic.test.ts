import { describe, it, expect, vi } from "vitest";
import { dynamic } from "../client/dynamic";

describe("dynamic()", () => {
  it("returns a component function", () => {
    const Comp = dynamic(() => Promise.resolve({ default: () => null }));
    expect(typeof Comp).toBe("function");
  });

  it("sets displayName to Dynamic for SSR components", () => {
    const Comp = dynamic(() => Promise.resolve({ default: () => null }));
    expect(Comp.displayName).toBe("Dynamic");
  });

  it("sets displayName to DynamicClientOnly for client-only components", () => {
    const Comp = dynamic(() => Promise.resolve({ default: () => null }), {
      ssr: false,
    });
    expect(Comp.displayName).toBe("DynamicClientOnly");
  });

  it("accepts loading option", () => {
    const loading = vi.fn(() => null);
    const Comp = dynamic(() => Promise.resolve({ default: () => null }), {
      loading,
    });
    expect(typeof Comp).toBe("function");
  });

  it("defaults ssr to true", () => {
    const Comp = dynamic(() => Promise.resolve({ default: () => null }));
    // SSR path creates a different component (uses React.lazy)
    expect(Comp.displayName).toBe("Dynamic");
  });

  it("creates different components for ssr:true vs ssr:false", () => {
    const loader = () => Promise.resolve({ default: () => null });
    const SsrComp = dynamic(loader, { ssr: true });
    const ClientComp = dynamic(loader, { ssr: false });

    expect(SsrComp.displayName).toBe("Dynamic");
    expect(ClientComp.displayName).toBe("DynamicClientOnly");
    expect(SsrComp).not.toBe(ClientComp);
  });
});
