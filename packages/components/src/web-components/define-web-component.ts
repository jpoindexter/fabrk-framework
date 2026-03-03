import * as React from "react";
import * as ReactDOMClient from "react-dom/client";

function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function defineWebComponent(
  tagName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ReactComponent: React.ComponentType<any>,
  observedAttributes: string[] = [],
): void {
  if (typeof customElements === "undefined") return;
  if (customElements.get(tagName)) return;

  class FabrkElement extends HTMLElement {
    private _root: ReactDOMClient.Root | null = null;

    static get observedAttributes(): string[] {
      return observedAttributes;
    }

    connectedCallback(): void {
      const shadow = this.attachShadow({ mode: "open" });
      const container = document.createElement("div");
      shadow.appendChild(container);
      this._root = ReactDOMClient.createRoot(container);
      this._render();
    }

    disconnectedCallback(): void {
      if (this._root) {
        this._root.unmount();
        this._root = null;
      }
    }

    attributeChangedCallback(): void {
      this._render();
    }

    private _render(): void {
      if (!this._root) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props: Record<string, any> = {};
      for (const attr of observedAttributes) {
        const value = this.getAttribute(attr);
        if (value !== null) {
          props[kebabToCamel(attr)] = value;
        }
      }

      // Pass children as text content if present
      const textContent = this.textContent?.trim();
      const children = textContent ? textContent : undefined;

      this._root.render(
        React.createElement(ReactComponent, { ...props, children }),
      );
    }
  }

  customElements.define(tagName, FabrkElement);
}
