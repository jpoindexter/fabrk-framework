import { describe, it, expect, vi, beforeEach } from "vitest";

describe("useFormState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("exports useFormState function", async () => {
    vi.doMock("react", () => ({
      useState: (init: unknown) => [init, vi.fn()],
      useCallback: (fn: unknown) => fn,
      useRef: (init: unknown) => ({ current: init }),
    }));

    const { useFormState } = await import("../client/use-form-state");
    const result = useFormState("test_action");

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
    expect(result.pending).toBe(false);
    expect(typeof result.submit).toBe("function");
  });

  it("submit sends FormData with $ACTION_ID to /_fabrk/action", async () => {
    const setData = vi.fn();
    const setError = vi.fn();
    const setPending = vi.fn();
    let callIdx = 0;

    vi.doMock("react", () => ({
      useState: (init: unknown) => {
        const idx = callIdx++;
        if (idx === 0) return [init, setData]; // data
        if (idx === 1) return [init, setError]; // error
        return [init, setPending]; // pending
      },
      useCallback: (fn: unknown) => fn,
      useRef: (init: unknown) => ({ current: init }),
    }));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: { saved: true } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { useFormState } = await import("../client/use-form-state");
    const { submit } = useFormState("my_action");

    const fd = new FormData();
    fd.set("name", "test");
    await submit(fd);

    expect(mockFetch).toHaveBeenCalledWith("/_fabrk/action", {
      method: "POST",
      body: expect.any(FormData),
    });

    const sentFd = mockFetch.mock.calls[0][1].body as FormData;
    expect(sentFd.get("$ACTION_ID")).toBe("my_action");
    expect(sentFd.get("name")).toBe("test");
    expect(setData).toHaveBeenCalledWith({ saved: true });

    vi.unstubAllGlobals();
  });

  it("sets error on non-ok response", async () => {
    const setError = vi.fn();
    let callIdx = 0;

    vi.doMock("react", () => ({
      useState: (init: unknown) => {
        const idx = callIdx++;
        if (idx === 1) return [init, setError];
        return [init, vi.fn()];
      },
      useCallback: (fn: unknown) => fn,
      useRef: (init: unknown) => ({ current: init }),
    }));

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Not found" }),
    }));

    const { useFormState } = await import("../client/use-form-state");
    const { submit } = useFormState("bad_action");
    await submit(new FormData());

    expect(setError).toHaveBeenCalledWith("Not found");

    vi.unstubAllGlobals();
  });

  it("sets network error on fetch failure", async () => {
    const setError = vi.fn();
    let callIdx = 0;

    vi.doMock("react", () => ({
      useState: (init: unknown) => {
        const idx = callIdx++;
        if (idx === 1) return [init, setError];
        return [init, vi.fn()];
      },
      useCallback: (fn: unknown) => fn,
      useRef: (init: unknown) => ({ current: init }),
    }));

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const { useFormState } = await import("../client/use-form-state");
    const { submit } = useFormState("action");
    await submit(new FormData());

    expect(setError).toHaveBeenCalledWith("Network error");

    vi.unstubAllGlobals();
  });

  it("prevents concurrent submissions via pendingRef", async () => {
    const setPending = vi.fn();
    let callIdx = 0;

    vi.doMock("react", () => ({
      useState: (init: unknown) => {
        const idx = callIdx++;
        if (idx === 2) return [init, setPending];
        return [init, vi.fn()];
      },
      useCallback: (fn: unknown) => fn,
      useRef: (init: unknown) => ({ current: init }),
    }));

    let resolveFetch!: (v: unknown) => void;
    const fetchPromise = new Promise((r) => { resolveFetch = r; });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(fetchPromise));

    const { useFormState } = await import("../client/use-form-state");
    const { submit } = useFormState("action");

    // First call starts
    const first = submit(new FormData());
    // Second call should be ignored (pendingRef is true)
    const second = submit(new FormData());

    resolveFetch({ ok: true, json: () => Promise.resolve({ result: null }) });
    await first;
    await second;

    // fetch called only once
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});

describe("Form component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("renders a form with method POST and action endpoint", async () => {
    const mockReact = {
      useState: (init: unknown) => [init, vi.fn()],
      useCallback: (fn: unknown) => fn,
      useRef: (init: unknown) => ({ current: init }),
      forwardRef: (render: unknown) => render,
      createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({
        type,
        props: { ...(props as Record<string, unknown>), children },
      }),
      default: null as unknown,
    };
    mockReact.default = mockReact;
    vi.doMock("react", () => mockReact);

    const { Form } = await import("../client/form");
    const render = Form as unknown as (
      props: Record<string, unknown>,
      ref: null,
    ) => { type: string; props: Record<string, unknown> };
    const element = render({ actionId: "my_action", children: null }, null);

    expect(element.type).toBe("form");
    expect(element.props.method).toBe("POST");
    expect(element.props.action).toBe("/_fabrk/action");
  });

  it("includes hidden $ACTION_ID input", async () => {
    const mockReact = {
      useState: (init: unknown) => [init, vi.fn()],
      useCallback: (fn: unknown) => fn,
      useRef: (init: unknown) => ({ current: init }),
      forwardRef: (render: unknown) => render,
      createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({
        type,
        props: { ...(props as Record<string, unknown>), children },
      }),
      default: null as unknown,
    };
    mockReact.default = mockReact;
    vi.doMock("react", () => mockReact);

    const { Form } = await import("../client/form");
    const render = Form as unknown as (
      props: Record<string, unknown>,
      ref: null,
    ) => { type: string; props: { children: unknown[] } };
    const element = render({ actionId: "submit_form", children: null }, null);

    const children = Array.isArray(element.props.children)
      ? element.props.children
      : [element.props.children];

    const hiddenInput = children.find(
      (c: unknown) =>
        typeof c === "object" &&
        c !== null &&
        (c as Record<string, unknown>).type === "input",
    ) as { props: Record<string, unknown> } | undefined;

    expect(hiddenInput).toBeDefined();
    expect(hiddenInput!.props.type).toBe("hidden");
    expect(hiddenInput!.props.name).toBe("$ACTION_ID");
    expect(hiddenInput!.props.value).toBe("submit_form");
  });

  it("sets aria-busy when pending", async () => {
    let callIdx = 0;
    const mockReact = {
      useState: (init: unknown) => {
        const idx = callIdx++;
        if (idx === 2) return [true, vi.fn()];
        return [init, vi.fn()];
      },
      useCallback: (fn: unknown) => fn,
      useRef: (init: unknown) => ({ current: init }),
      forwardRef: (render: unknown) => render,
      createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({
        type,
        props: { ...(props as Record<string, unknown>), children },
      }),
      default: null as unknown,
    };
    mockReact.default = mockReact;
    vi.doMock("react", () => mockReact);

    const { Form } = await import("../client/form");
    const render = Form as unknown as (
      props: Record<string, unknown>,
      ref: null,
    ) => { type: string; props: Record<string, unknown> };
    const element = render({ actionId: "action", children: null }, null);

    expect(element.props["aria-busy"]).toBe(true);
  });

  it("re-exports useFormState", async () => {
    const mockReact = {
      useState: (init: unknown) => [init, vi.fn()],
      useCallback: (fn: unknown) => fn,
      useRef: (init: unknown) => ({ current: init }),
      forwardRef: (render: unknown) => render,
      createElement: vi.fn(),
      default: null as unknown,
    };
    mockReact.default = mockReact;
    vi.doMock("react", () => mockReact);

    const formModule = await import("../client/form");
    expect(typeof formModule.useFormState).toBe("function");
  });
});
