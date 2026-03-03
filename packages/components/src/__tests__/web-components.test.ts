// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock customElements since jsdom doesn't fully support it
const mockRegistry = new Map<string, CustomElementConstructor>();

beforeEach(() => {
  mockRegistry.clear();

  vi.stubGlobal("customElements", {
    define: vi.fn((name: string, constructor: CustomElementConstructor) => {
      mockRegistry.set(name, constructor);
    }),
    get: vi.fn((name: string) => mockRegistry.get(name)),
  });
});

describe("Web Components Wrapper", () => {
  it("defineWebComponent registers a custom element", async () => {
    const { defineWebComponent } = await import("../web-components/define-web-component");
    const MockComponent = () => null;

    defineWebComponent("test-element", MockComponent);

    expect(customElements.define).toHaveBeenCalledOnce();
    expect(customElements.define).toHaveBeenCalledWith(
      "test-element",
      expect.any(Function),
    );
  });

  it("does not re-register if tag already exists", async () => {
    const { defineWebComponent } = await import("../web-components/define-web-component");
    const MockComponent = () => null;

    defineWebComponent("existing-element", MockComponent);
    defineWebComponent("existing-element", MockComponent);

    expect(customElements.define).toHaveBeenCalledOnce();
  });

  it("kebab-case attributes map to observedAttributes", async () => {
    const { defineWebComponent } = await import("../web-components/define-web-component");
    const MockComponent = () => null;

    defineWebComponent("my-comp", MockComponent, ["class-name", "data-value"]);

    const ElementClass = mockRegistry.get("my-comp");
    expect(ElementClass).toBeDefined();

    const observed = (ElementClass as unknown as { observedAttributes: string[] }).observedAttributes;
    expect(observed).toContain("class-name");
    expect(observed).toContain("data-value");
  });

  it("connectedCallback exists on registered element", async () => {
    const { defineWebComponent } = await import("../web-components/define-web-component");
    const MockComponent = () => null;

    defineWebComponent("shadow-element", MockComponent);

    const ElementClass = mockRegistry.get("shadow-element");
    expect(ElementClass).toBeDefined();
    expect(ElementClass?.prototype.connectedCallback).toBeDefined();
  });

  it("disconnectedCallback exists on registered element", async () => {
    const { defineWebComponent } = await import("../web-components/define-web-component");
    const MockComponent = () => null;

    defineWebComponent("cleanup-element", MockComponent);

    const ElementClass = mockRegistry.get("cleanup-element");
    expect(ElementClass).toBeDefined();
    expect(ElementClass?.prototype.disconnectedCallback).toBeDefined();
  });

  it("observedAttributes are correctly passed through", async () => {
    const { defineWebComponent } = await import("../web-components/define-web-component");
    const MockComponent = () => null;

    defineWebComponent("attr-element", MockComponent, ["variant", "size", "disabled"]);

    const ElementClass = mockRegistry.get("attr-element");
    const observed = (ElementClass as unknown as { observedAttributes: string[] }).observedAttributes;
    expect(observed).toEqual(["variant", "size", "disabled"]);
  });

  it("empty observedAttributes defaults to empty array", async () => {
    const { defineWebComponent } = await import("../web-components/define-web-component");
    const MockComponent = () => null;

    defineWebComponent("no-attr-element", MockComponent);

    const ElementClass = mockRegistry.get("no-attr-element");
    const observed = (ElementClass as unknown as { observedAttributes: string[] }).observedAttributes;
    expect(observed).toEqual([]);
  });

  it("exports defineWebComponent for custom wrapping", async () => {
    const mod = await import("../web-components/index");
    expect(typeof mod.defineWebComponent).toBe("function");
  });

  it("individual register functions are exported", async () => {
    const mod = await import("../web-components/index");
    expect(typeof mod.registerFabrkButton).toBe("function");
    expect(typeof mod.registerFabrkBadge).toBe("function");
    expect(typeof mod.registerFabrkCard).toBe("function");
    expect(typeof mod.registerFabrkInput).toBe("function");
  });

  it("registerAllFabrkComponents function is exported", async () => {
    const mod = await import("../web-components/index");
    expect(typeof mod.registerAllFabrkComponents).toBe("function");
  });
});
