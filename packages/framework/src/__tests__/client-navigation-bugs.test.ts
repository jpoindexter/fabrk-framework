import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- 1d: shouldSkipPath ---

describe("1d: shouldSkipPath last-segment check", () => {
  let shouldSkipPath: (pathname: string) => boolean;

  beforeEach(async () => {
    ({ shouldSkipPath } = await import("../runtime/plugin"));
  });

  it("skips /@vite paths", () => {
    expect(shouldSkipPath("/@vite/client")).toBe(true);
  });

  it("skips /__ paths", () => {
    expect(shouldSkipPath("/__ai")).toBe(true);
  });

  it("skips /node_modules/ paths", () => {
    expect(shouldSkipPath("/node_modules/react/index.js")).toBe(true);
  });

  it("skips static files with extensions", () => {
    expect(shouldSkipPath("/styles/main.css")).toBe(true);
    expect(shouldSkipPath("/images/logo.png")).toBe(true);
    expect(shouldSkipPath("/script.js")).toBe(true);
    expect(shouldSkipPath("/favicon.ico")).toBe(true);
  });

  it("allows .rsc endpoints", () => {
    expect(shouldSkipPath("/about.rsc")).toBe(false);
    expect(shouldSkipPath("/dashboard/settings.rsc")).toBe(false);
  });

  it("allows dotted path segments that are not file extensions", () => {
    expect(shouldSkipPath("/api/v1.0/data")).toBe(false);
    expect(shouldSkipPath("/api/v2.1/users")).toBe(false);
  });

  it("allows clean URL paths", () => {
    expect(shouldSkipPath("/about")).toBe(false);
    expect(shouldSkipPath("/dashboard/settings")).toBe(false);
    expect(shouldSkipPath("/")).toBe(false);
  });

  it("allows dotted directory with clean final segment", () => {
    expect(shouldSkipPath("/api/v1.0/users/profile")).toBe(false);
  });
});

// --- Browser environment mock for client-side tests ---

function setupBrowserMocks() {
  const events = new Map<string, Set<EventListener>>();
  const scrollCalls: Array<{ x: number; y: number }> = [];
  let rafCallback: FrameRequestCallback | null = null;

  const mockWindow = {
    location: {
      origin: "http://localhost:3000",
      pathname: "/",
      href: "http://localhost:3000/",
      search: "",
    },
    scrollY: 0,
    scrollTo: vi.fn((x: number, y: number) => scrollCalls.push({ x, y })),
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      if (!events.has(type)) events.set(type, new Set());
      events.get(type)!.add(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      events.get(type)?.delete(listener);
    }),
    dispatchEvent: vi.fn((event: Event) => {
      const listeners = events.get(event.type);
      if (listeners) {
        for (const listener of listeners) listener(event);
      }
      return true;
    }),
    __FABRK_PREFETCH_CACHE__: new Map(),
    __FABRK_RSC_NAVIGATE__: undefined as
      | ((url: string) => Promise<void>)
      | undefined,
    __FABRK_PARAMS__: undefined as Record<string, string> | undefined,
  };

  const historyStates: Array<{ data: unknown; url?: string }> = [
    { data: null, url: "/" },
  ];
  let historyIndex = 0;

  const mockHistory = {
    state: null as unknown,
    pushState: vi.fn((data: unknown, _unused: string, url?: string) => {
      historyIndex++;
      historyStates.splice(historyIndex, Infinity, { data, url });
      mockHistory.state = data;
      if (url) mockWindow.location.pathname = url;
    }),
    replaceState: vi.fn((data: unknown, _unused: string, url?: string) => {
      historyStates[historyIndex] = { data, url };
      mockHistory.state = data;
      if (url) mockWindow.location.pathname = url;
    }),
    back: vi.fn(() => {
      if (historyIndex > 0) {
        historyIndex--;
        const entry = historyStates[historyIndex];
        mockHistory.state = entry.data;
        if (entry.url) mockWindow.location.pathname = entry.url;
        mockWindow.dispatchEvent(
          new PopStateEvent("popstate", { state: entry.data })
        );
      }
    }),
    forward: vi.fn(),
  };

  // @ts-expect-error -- partial mock
  globalThis.window = mockWindow;
  // @ts-expect-error -- partial mock
  globalThis.history = mockHistory;
  // @ts-expect-error -- partial mock
  globalThis.document = {
    getElementById: vi.fn(),
  };
  globalThis.CustomEvent = class CustomEvent extends Event {
    detail: unknown;
    constructor(type: string, init?: CustomEventInit) {
      super(type, init);
      this.detail = init?.detail;
    }
  } as unknown as typeof CustomEvent;
  globalThis.PopStateEvent = class MockPopStateEvent extends Event {
    state: unknown;
    constructor(type: string, init?: PopStateEventInit) {
      super(type, init);
      this.state = init?.state;
    }
  } as unknown as typeof PopStateEvent;
  globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
    rafCallback = cb;
    return 1;
  });
  globalThis.DOMParser = class {
    parseFromString(html: string, _type: string) {
      const rootMatch = html.match(
        /<div id="root">([\s\S]*?)<\/div>/
      );
      return {
        getElementById: (id: string) => {
          if (id === "root" && rootMatch) {
            return { innerHTML: rootMatch[1] };
          }
          return null;
        },
      };
    }
  } as unknown as typeof DOMParser;
  globalThis.URL = URL;

  return {
    mockWindow,
    mockHistory,
    events,
    scrollCalls,
    flushRaf() {
      if (rafCallback) {
        rafCallback(performance.now());
        rafCallback = null;
      }
    },
  };
}

// --- 1b: Scroll restoration ---

describe("1b: scroll restoration on popstate", () => {
  let env: ReturnType<typeof setupBrowserMocks>;
  let _resetPatched: () => void;
  let patchHistory: () => void;

  beforeEach(async () => {
    env = setupBrowserMocks();
    vi.resetModules();
    ({ patchHistory, _resetPatched } = await import(
      "../client/navigation-state"
    ));
    _resetPatched();
  });

  afterEach(() => {
    _resetPatched();
    // @ts-expect-error -- cleanup
    delete globalThis.window;
    // @ts-expect-error -- cleanup
    delete globalThis.history;
    // @ts-expect-error -- cleanup
    delete globalThis.document;
  });

  it("restores scroll position from history state on popstate", () => {
    patchHistory();

    const popstateEvent = new PopStateEvent("popstate", {
      state: { __fabrkScrollY: 250 },
    });
    env.mockWindow.dispatchEvent(popstateEvent);
    env.flushRaf();

    expect(env.mockWindow.scrollTo).toHaveBeenCalledWith(0, 250);
  });

  it("scrolls to 0 when no scroll position in state", () => {
    patchHistory();

    const popstateEvent = new PopStateEvent("popstate", { state: null });
    env.mockWindow.dispatchEvent(popstateEvent);
    env.flushRaf();

    expect(env.mockWindow.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("scrolls to 0 when state has no __fabrkScrollY", () => {
    patchHistory();

    const popstateEvent = new PopStateEvent("popstate", {
      state: { other: "data" },
    });
    env.mockWindow.dispatchEvent(popstateEvent);
    env.flushRaf();

    expect(env.mockWindow.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("uses requestAnimationFrame for scroll restoration", () => {
    patchHistory();

    const popstateEvent = new PopStateEvent("popstate", {
      state: { __fabrkScrollY: 100 },
    });
    env.mockWindow.dispatchEvent(popstateEvent);

    // Before rAF fires, scrollTo should not have been called
    expect(env.mockWindow.scrollTo).not.toHaveBeenCalled();

    env.flushRaf();
    expect(env.mockWindow.scrollTo).toHaveBeenCalledWith(0, 100);
  });
});

// --- 1a: SPA navigation without RSC ---

describe("1a: navigateImpl non-RSC SPA swap", () => {
  let env: ReturnType<typeof setupBrowserMocks>;
  let navigateImpl: (
    url: string,
    mode: "push" | "replace",
    options?: { scroll?: boolean }
  ) => Promise<void>;
  let _resetPatched: () => void;

  beforeEach(async () => {
    env = setupBrowserMocks();
    vi.resetModules();
    ({ _resetPatched } = await import("../client/navigation-state"));
    _resetPatched();
    ({ navigateImpl } = await import("../client/navigation"));
  });

  afterEach(() => {
    _resetPatched();
    vi.restoreAllMocks();
    // @ts-expect-error -- cleanup
    delete globalThis.window;
    // @ts-expect-error -- cleanup
    delete globalThis.history;
    // @ts-expect-error -- cleanup
    delete globalThis.document;
  });

  it("swaps #root content from fetched HTML in non-RSC mode", async () => {
    const rootEl = { innerHTML: "old content" };
    (globalThis.document as unknown as { getElementById: ReturnType<typeof vi.fn> })
      .getElementById = vi.fn((id: string) =>
        id === "root" ? rootEl : null
      );

    env.mockWindow.__FABRK_RSC_NAVIGATE__ = undefined;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          '<html><body><div id="root">new content</div></body></html>'
        ),
    });
    globalThis.fetch = fetchMock;

    await navigateImpl("/about", "push");

    expect(rootEl.innerHTML).toBe("new content");
    expect(fetchMock).toHaveBeenCalledWith("/about", {
      headers: { "X-Fabrk-Navigate": "1", "X-Fabrk-Navigation": "soft" },
    });
  });

  it("falls back to window.location.href on fetch error", async () => {
    env.mockWindow.__FABRK_RSC_NAVIGATE__ = undefined;

    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network"));

    let locationSet = false;
    Object.defineProperty(env.mockWindow.location, "href", {
      set: () => {
        locationSet = true;
      },
      get: () => "http://localhost:3000/",
      configurable: true,
    });

    await navigateImpl("/about", "push");
    expect(locationSet).toBe(true);
  });

  it("dispatches NAVIGATE_EVENT after successful swap", async () => {
    const rootEl = { innerHTML: "" };
    (globalThis.document as unknown as { getElementById: ReturnType<typeof vi.fn> })
      .getElementById = vi.fn(() => rootEl);

    env.mockWindow.__FABRK_RSC_NAVIGATE__ = undefined;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve('<html><body><div id="root">ok</div></body></html>'),
    });

    await navigateImpl("/about", "push");

    expect(env.mockWindow.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "fabrk:navigate" })
    );
  });

  it("scrolls to top after navigation by default", async () => {
    const rootEl = { innerHTML: "" };
    (globalThis.document as unknown as { getElementById: ReturnType<typeof vi.fn> })
      .getElementById = vi.fn(() => rootEl);

    env.mockWindow.__FABRK_RSC_NAVIGATE__ = undefined;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve('<html><body><div id="root">ok</div></body></html>'),
    });

    await navigateImpl("/about", "push");

    expect(env.mockWindow.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("does not scroll to top when scroll: false", async () => {
    const rootEl = { innerHTML: "" };
    (globalThis.document as unknown as { getElementById: ReturnType<typeof vi.fn> })
      .getElementById = vi.fn(() => rootEl);

    env.mockWindow.__FABRK_RSC_NAVIGATE__ = undefined;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve('<html><body><div id="root">ok</div></body></html>'),
    });

    await navigateImpl("/about", "push", { scroll: false });

    expect(env.mockWindow.scrollTo).not.toHaveBeenCalled();
  });

  it("saves current scroll position before navigating", async () => {
    const rootEl = { innerHTML: "" };
    (globalThis.document as unknown as { getElementById: ReturnType<typeof vi.fn> })
      .getElementById = vi.fn(() => rootEl);

    env.mockWindow.__FABRK_RSC_NAVIGATE__ = undefined;
    env.mockWindow.scrollY = 300;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve('<html><body><div id="root">ok</div></body></html>'),
    });

    await navigateImpl("/about", "push");

    // replaceState should have been called with scroll position
    expect(env.mockHistory.replaceState).toHaveBeenCalledWith(
      expect.objectContaining({ __fabrkScrollY: 300 }),
      ""
    );
  });

  it("delegates to RSC navigate when available", async () => {
    const rscNavigate = vi.fn().mockResolvedValue(undefined);
    env.mockWindow.__FABRK_RSC_NAVIGATE__ = rscNavigate;

    await navigateImpl("/about", "push");

    expect(rscNavigate).toHaveBeenCalledWith("/about");
  });

  it("rejects cross-origin URLs", async () => {
    globalThis.fetch = vi.fn();

    await navigateImpl("http://evil.com/steal", "push");

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// --- 1c: NAVIGATE_EVENT dispatch in entry-client ---

describe("1c: entry-client dispatches NAVIGATE_EVENT", () => {
  it("virtual ENTRY_CLIENT_CODE includes NAVIGATE_EVENT dispatch in startTransition", async () => {
    // We can't execute the virtual module, but we can verify the source code
    // contains the fix by importing the plugin and checking the generated code
    const pluginModule = await import("../runtime/plugin");
    const plugins = pluginModule.fabrkPlugin({ rsc: false });

    // Find the virtual entries plugin
    const virtualPlugin = plugins.find(
      (p) => p.name === "fabrk:virtual-entries"
    );
    expect(virtualPlugin).toBeDefined();

    // Load the virtual entry-client code
    const loadFn = virtualPlugin!.load as (id: string) => string | null;
    const code = loadFn("\0virtual:fabrk/entry-client");
    expect(code).toBeDefined();
    expect(code).toContain("NAVIGATE_EVENT");
    expect(code).toContain('window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT))');
    expect(code).toContain("startTransition");
  });
});

// --- 1c: Link delegates to navigateImpl ---

describe("1c: Link uses navigateImpl for unified navigation", () => {
  it("link.tsx imports navigateImpl", async () => {
    // Verify the module exports relationship — Link should use navigateImpl
    // We verify this at the source level since we can't render React in node env
    const fs = await import("node:fs");
    const linkSource = fs.readFileSync(
      new URL("../client/link.tsx", import.meta.url).pathname,
      "utf-8"
    );

    expect(linkSource).toContain("navigateImpl");
    expect(linkSource).toContain('import { prefetchUrl, navigateImpl } from "./navigation"');
    // Should NOT contain duplicate pushState/replaceState logic
    expect(linkSource).not.toContain("history.pushState");
    expect(linkSource).not.toContain("history.replaceState");
    // Should NOT contain un-awaited __FABRK_RSC_NAVIGATE__
    expect(linkSource).not.toContain("__FABRK_RSC_NAVIGATE__");
  });
});
