import { describe, it, expect, vi } from "vitest";
import { fabrkPlugin } from "../runtime/plugin";

describe("RSC Integration", () => {
  describe("fabrkPlugin RSC option", () => {
    it("returns rsc-integration plugin when rsc is not disabled", () => {
      const plugins = fabrkPlugin();
      const names = plugins.map((p) => p.name);
      expect(names).toContain("fabrk:rsc-integration");
    });

    it("omits rsc-integration plugin when rsc is false", () => {
      const plugins = fabrkPlugin({ rsc: false });
      const names = plugins.map((p) => p.name);
      expect(names).not.toContain("fabrk:rsc-integration");
    });

    it("always includes router and virtual-entries plugins", () => {
      const plugins = fabrkPlugin({ rsc: false });
      const names = plugins.map((p) => p.name);
      expect(names).toContain("fabrk:router");
      expect(names).toContain("fabrk:virtual-entries");
    });

    it("includes 4 plugins with RSC enabled", () => {
      const plugins = fabrkPlugin();
      expect(plugins).toHaveLength(4);
    });

    it("includes 3 plugins with RSC disabled", () => {
      const plugins = fabrkPlugin({ rsc: false });
      expect(plugins).toHaveLength(3);
    });
  });

  describe("virtual entry modules", () => {
    it("resolves virtual:fabrk/entry-rsc", () => {
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;
      const resolveId = virtualPlugin.resolveId as (id: string) => string | null;

      expect(resolveId.call({} as never, "virtual:fabrk/entry-rsc")).toBe(
        "\0virtual:fabrk/entry-rsc"
      );
    });

    it("resolves virtual:fabrk/entry-ssr", () => {
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;
      const resolveId = virtualPlugin.resolveId as (id: string) => string | null;

      expect(resolveId.call({} as never, "virtual:fabrk/entry-ssr")).toBe(
        "\0virtual:fabrk/entry-ssr"
      );
    });

    it("resolves virtual:fabrk/entry-client", () => {
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;
      const resolveId = virtualPlugin.resolveId as (id: string) => string | null;

      expect(resolveId.call({} as never, "virtual:fabrk/entry-client")).toBe(
        "\0virtual:fabrk/entry-client"
      );
    });

    it("loads entry-client with hydration code", () => {
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
      expect(code).toContain("rscStream");
      expect(code).toContain("createFromReadableStream");
    });

    it("loads entry-ssr with renderToHtml export", () => {
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const configHook = plugins.find((p) => p.name === "fabrk:router")!.config as (
        c: { root?: string }
      ) => unknown;
      configHook.call({} as never, { root: "/tmp/test" });

      const load = virtualPlugin.load as (id: string) => string | null;
      const code = load.call({} as never, "\0virtual:fabrk/entry-ssr");

      expect(code).toContain("renderToHtml");
      expect(code).toContain("injectRSCPayload");
      expect(code).toContain("createFromReadableStream");
      expect(code).toContain("renderToReadableStream");
    });

    it("loads entry-rsc with renderRsc export", () => {
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const configHook = plugins.find((p) => p.name === "fabrk:router")!.config as (
        c: { root?: string }
      ) => unknown;
      configHook.call({} as never, { root: "/tmp/test" });

      const load = virtualPlugin.load as (id: string) => string | null;
      const code = load.call({} as never, "\0virtual:fabrk/entry-rsc");

      expect(code).toContain("renderRsc");
      expect(code).toContain("createClientManifest");
      expect(code).toContain("renderToReadableStream");
    });

    it("does not resolve unknown virtual modules", () => {
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const virtualPlugin = plugins.find((p) => p.name === "fabrk:virtual-entries")!;
      const resolveId = virtualPlugin.resolveId as (id: string) => string | null;

      expect(resolveId.call({} as never, "virtual:fabrk/unknown")).toBeNull();
      expect(resolveId.call({} as never, "react")).toBeNull();
    });
  });

  describe("rsc-integration plugin graceful fallback", () => {
    it("config hook does not throw when @vitejs/plugin-rsc is missing", async () => {
      const plugins = fabrkPlugin();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const rscPlugin = plugins.find((p) => p.name === "fabrk:rsc-integration")!;
      const configHook = rscPlugin.config as (config: { plugins?: unknown[] }) => Promise<void>;

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const mockConfig = { plugins: [] };
      await expect(configHook.call({} as never, mockConfig)).resolves.not.toThrow();

      logSpy.mockRestore();
    });
  });
});
