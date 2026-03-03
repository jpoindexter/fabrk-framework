import { describe, it, expect, vi } from "vitest";
import { fabrkPlugin } from "../runtime/plugin";

describe("HMR / React Fast Refresh", () => {
  it("includes fabrk:react-refresh plugin", () => {
    const plugins = fabrkPlugin({ rsc: false });
    const names = plugins.map((p) => p.name);
    expect(names).toContain("fabrk:react-refresh");
  });

  it("adds react plugins when @vitejs/plugin-react is available", async () => {
    const plugins = fabrkPlugin({ rsc: false });
    const refreshPlugin = plugins.find((p) => p.name === "fabrk:react-refresh")!;
    const configHook = refreshPlugin.config as (config: { plugins?: unknown[] }) => Promise<void>;

    const mockConfig: { plugins: unknown[] } = { plugins: [] };
    await configHook.call({} as never, mockConfig);

    // @vitejs/plugin-react is installed as devDep — should inject its plugins
    expect(mockConfig.plugins.length).toBeGreaterThan(0);
  });

  it("entry-client code includes import.meta.hot.accept()", () => {
    const plugins = fabrkPlugin({ rsc: false });
    const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;

    const configHook = plugins.find((p) => p.name === "fabrk:router")!.config as (
      c: { root?: string },
    ) => unknown;
    configHook.call({} as never, { root: "/tmp/test" });

    const load = virtualPlugin.load as (id: string) => string | null;
    const code = load.call({} as never, "\0virtual:fabrk/entry-client");

    expect(code).toContain("import.meta.hot");
    expect(code).toContain("import.meta.hot.accept()");
  });

  it("entry-client HMR guard uses optional chaining", () => {
    const plugins = fabrkPlugin({ rsc: false });
    const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;

    const configHook = plugins.find((p) => p.name === "fabrk:router")!.config as (
      c: { root?: string },
    ) => unknown;
    configHook.call({} as never, { root: "/tmp/test" });

    const load = virtualPlugin.load as (id: string) => string | null;
    const code = load.call({} as never, "\0virtual:fabrk/entry-client");

    // Verify the guard checks `if (import.meta.hot)` before `.accept()`
    expect(code).toMatch(/if\s*\(import\.meta\.hot\)/);
  });
});
