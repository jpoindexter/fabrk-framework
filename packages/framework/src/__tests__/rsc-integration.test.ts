import { describe, it, expect } from "vitest";
import { fabrkPlugin } from "../runtime/plugin";

describe("Plugin virtual entries", () => {
  describe("fabrkPlugin base plugins", () => {
    it("always includes router and virtual-entries plugins", () => {
      const plugins = fabrkPlugin();
      const names = plugins.map((p) => p.name);
      expect(names).toContain("fabrk:router");
      expect(names).toContain("fabrk:virtual-entries");
    });

    it("includes 3 plugins (router, virtual-entries, react-refresh)", () => {
      const plugins = fabrkPlugin();
      expect(plugins).toHaveLength(3);
    });

    it("does not include rsc-integration plugin", () => {
      const plugins = fabrkPlugin();
      const names = plugins.map((p) => p.name);
      expect(names).not.toContain("fabrk:rsc-integration");
    });
  });

  describe("virtual module resolution", () => {
    it("resolves virtual:fabrk/entry-client", () => {
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;
      const resolveId = virtualPlugin.resolveId as (id: string) => string | null;

      expect(resolveId.call({} as never, "virtual:fabrk/entry-client")).toBe(
        "\0virtual:fabrk/entry-client"
      );
    });

    it("resolves virtual:fabrk/entry-client-hydrate", () => {
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;
      const resolveId = virtualPlugin.resolveId as (id: string) => string | null;

      expect(resolveId.call({} as never, "virtual:fabrk/entry-client-hydrate")).toBe(
        "\0virtual:fabrk/entry-client-hydrate"
      );
    });

    it("resolves virtual:fabrk/routes", () => {
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;
      const resolveId = virtualPlugin.resolveId as (id: string) => string | null;

      expect(resolveId.call({} as never, "virtual:fabrk/routes")).toBe(
        "\0virtual:fabrk/routes"
      );
    });

    it("does not resolve unknown virtual modules", () => {
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;
      const resolveId = virtualPlugin.resolveId as (id: string) => string | null;

      expect(resolveId.call({} as never, "virtual:fabrk/unknown")).toBeNull();
      expect(resolveId.call({} as never, "react")).toBeNull();
    });

    it("does not resolve removed RSC virtual modules", () => {
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;
      const resolveId = virtualPlugin.resolveId as (id: string) => string | null;

      expect(resolveId.call({} as never, "virtual:fabrk/entry-rsc")).toBeNull();
      expect(resolveId.call({} as never, "virtual:fabrk/entry-ssr")).toBeNull();
    });
  });

  describe("virtual module loading", () => {
    it("loads entry-client with hydrateRoot and SPA navigation", () => {
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const configHook = plugins.find((p) => p.name === "fabrk:router")!.config as (
        c: { root?: string }
      ) => unknown;
      configHook.call({} as never, { root: "/tmp/test" });

      const load = virtualPlugin.load as (id: string) => string | null;
      const code = load.call({} as never, "\0virtual:fabrk/entry-client");

      expect(code).toContain("hydrateRoot");
      expect(code).toContain("import.meta.hot");
    });

    it("loads entry-client-hydrate with route-based hydration", () => {
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const configHook = plugins.find((p) => p.name === "fabrk:router")!.config as (
        c: { root?: string }
      ) => unknown;
      configHook.call({} as never, { root: "/tmp/test" });

      const load = virtualPlugin.load as (id: string) => string | null;
      const code = load.call({} as never, "\0virtual:fabrk/entry-client-hydrate");

      expect(code).toContain("hydrateRoot");
      expect(code).toContain("virtual:fabrk/routes");
      expect(code).toContain("__FABRK_NAVIGATE__");
    });

    it("returns null for removed RSC virtual modules", () => {
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const configHook = plugins.find((p) => p.name === "fabrk:router")!.config as (
        c: { root?: string }
      ) => unknown;
      configHook.call({} as never, { root: "/tmp/test" });

      const load = virtualPlugin.load as (id: string) => string | null;

      expect(load.call({} as never, "\0virtual:fabrk/entry-rsc")).toBeNull();
      expect(load.call({} as never, "\0virtual:fabrk/entry-ssr")).toBeNull();
    });
  });
});
