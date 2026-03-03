import { describe, it, expect } from "vitest";
import React from "react";
import { buildPageTree } from "../runtime/page-builder";
import {
  ErrorBoundary,
  NotFoundBoundary,
  GlobalErrorBoundary,
} from "../runtime/error-boundary";
import type { Route } from "../runtime/router";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEl = React.ReactElement<any>;

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    pattern: "/",
    regex: /^\/$/,
    paramNames: [],
    filePath: "/app/page.tsx",
    layoutPaths: [],
    type: "page",
    ...overrides,
  };
}

function MockPage(_props: { params: Record<string, string>; searchParams?: Record<string, string> }) {
  return null;
}
function MockLayout(_props: { children: React.ReactNode }) { return null; }
function MockRootLayout(_props: { children: React.ReactNode }) { return null; }
function MockError(_props: { error: Error; reset: () => void }) { return null; }
function MockLoading() { return null; }
function MockNotFound() { return null; }
function MockSlot() { return null; }

const BASE_OPTS = {
  route: makeRoute(),
  params: {},
  pathname: "/",
  React,
};

function build(overrides: Parameters<typeof buildPageTree>[0]): AnyEl {
  return buildPageTree(overrides) as AnyEl;
}

describe("buildPageTree", () => {
  describe("basic page", () => {
    it("returns page element with no wrappers", () => {
      const el = build({
        ...BASE_OPTS,
        modules: { page: MockPage, layouts: [] },
      });
      expect(el.type).toBe(MockPage);
      expect(el.props.params).toEqual({});
      expect(el.props.searchParams).toBeUndefined();
    });
  });

  describe("page with one layout", () => {
    it("wraps page in single layout", () => {
      const el = build({
        ...BASE_OPTS,
        modules: { page: MockPage, layouts: [MockLayout] },
      });
      expect(el.type).toBe(MockLayout);
      expect(el.props.children.type).toBe(MockPage);
    });
  });

  describe("page with multiple layouts", () => {
    it("nests layouts root-outermost", () => {
      const el = build({
        ...BASE_OPTS,
        modules: { page: MockPage, layouts: [MockRootLayout, MockLayout] },
      });
      // outermost: root layout
      expect(el.type).toBe(MockRootLayout);
      // middle: inner layout
      const middle = el.props.children;
      expect(middle.type).toBe(MockLayout);
      // innermost: page
      expect(middle.props.children.type).toBe(MockPage);
    });
  });

  describe("loading boundary", () => {
    it("wraps page in Suspense with loading fallback", () => {
      const el = build({
        ...BASE_OPTS,
        modules: { page: MockPage, layouts: [], loadingFallback: MockLoading },
      });
      expect(el.type).toBe(React.Suspense);
      expect(el.props.fallback.type).toBe(MockLoading);
      expect(el.props.children.type).toBe(MockPage);
    });
  });

  describe("error boundary", () => {
    it("wraps in ErrorBoundary with correct props", () => {
      const el = build({
        ...BASE_OPTS,
        modules: { page: MockPage, layouts: [], errorFallback: MockError },
      });
      expect(el.type).toBe(ErrorBoundary);
      expect(el.props.fallback).toBe(MockError);
      expect(el.props.pathname).toBe("/");
      expect(el.props.children.type).toBe(MockPage);
    });
  });

  describe("not-found boundary", () => {
    it("wraps in NotFoundBoundary with correct props", () => {
      const el = build({
        ...BASE_OPTS,
        modules: { page: MockPage, layouts: [], notFoundFallback: MockNotFound },
      });
      expect(el.type).toBe(NotFoundBoundary);
      expect(el.props.fallback).toBe(MockNotFound);
      expect(el.props.pathname).toBe("/");
      expect(el.props.children.type).toBe(MockPage);
    });
  });

  describe("all boundaries", () => {
    it("nests in correct order: GlobalError > Layout > Error > NotFound > Suspense > Page", () => {
      const el = build({
        ...BASE_OPTS,
        modules: {
          page: MockPage,
          layouts: [MockLayout],
          errorFallback: MockError,
          loadingFallback: MockLoading,
          notFoundFallback: MockNotFound,
          globalErrorFallback: MockError,
        },
      });

      // Outermost: GlobalErrorBoundary
      expect(el.type).toBe(GlobalErrorBoundary);
      expect(el.props.fallback).toBe(MockError);

      // Layout
      const layout = el.props.children;
      expect(layout.type).toBe(MockLayout);

      // ErrorBoundary
      const errorBoundary = layout.props.children;
      expect(errorBoundary.type).toBe(ErrorBoundary);
      expect(errorBoundary.props.fallback).toBe(MockError);

      // NotFoundBoundary
      const notFoundBoundary = errorBoundary.props.children;
      expect(notFoundBoundary.type).toBe(NotFoundBoundary);
      expect(notFoundBoundary.props.fallback).toBe(MockNotFound);

      // Suspense
      const suspense = notFoundBoundary.props.children;
      expect(suspense.type).toBe(React.Suspense);
      expect(suspense.props.fallback.type).toBe(MockLoading);

      // Page
      expect(suspense.props.children.type).toBe(MockPage);
    });
  });

  describe("parallel slots", () => {
    it("passes slot components as props to innermost layout only", () => {
      const el = build({
        ...BASE_OPTS,
        modules: {
          page: MockPage,
          layouts: [MockRootLayout, MockLayout],
          slots: { sidebar: MockSlot },
        },
      });

      // Root layout — no slot props
      expect(el.type).toBe(MockRootLayout);
      expect(el.props.sidebar).toBeUndefined();

      // Inner layout — receives slot as prop
      const inner = el.props.children;
      expect(inner.type).toBe(MockLayout);
      expect(inner.props.sidebar).toBeDefined();
      expect(inner.props.sidebar.type).toBe(MockSlot);
    });

    it("passes slot to single layout when only one exists", () => {
      const el = build({
        ...BASE_OPTS,
        modules: {
          page: MockPage,
          layouts: [MockLayout],
          slots: { sidebar: MockSlot },
        },
      });

      expect(el.type).toBe(MockLayout);
      expect(el.props.sidebar).toBeDefined();
      expect(el.props.sidebar.type).toBe(MockSlot);
      expect(el.props.children.type).toBe(MockPage);
    });
  });

  describe("params and searchParams forwarding", () => {
    it("forwards params and searchParams to page", () => {
      const params = { id: "42" };
      const searchParams = { tab: "settings" };

      const el = build({
        ...BASE_OPTS,
        params,
        searchParams,
        modules: { page: MockPage, layouts: [] },
      });

      expect(el.type).toBe(MockPage);
      expect(el.props.params).toBe(params);
      expect(el.props.searchParams).toBe(searchParams);
    });

    it("passes params through layout wrappers to page", () => {
      const params = { slug: "hello" };

      const el = build({
        ...BASE_OPTS,
        params,
        modules: { page: MockPage, layouts: [MockLayout] },
      });

      expect(el.props.children.type).toBe(MockPage);
      expect(el.props.children.props.params).toBe(params);
    });
  });

  describe("global error boundary only", () => {
    it("wraps tree in GlobalErrorBoundary as outermost element", () => {
      const el = build({
        ...BASE_OPTS,
        modules: {
          page: MockPage,
          layouts: [],
          globalErrorFallback: MockError,
        },
      });

      expect(el.type).toBe(GlobalErrorBoundary);
      expect(el.props.fallback).toBe(MockError);
      expect(el.props.children.type).toBe(MockPage);
    });

    it("GlobalErrorBoundary has no pathname prop", () => {
      const el = build({
        ...BASE_OPTS,
        modules: {
          page: MockPage,
          layouts: [],
          globalErrorFallback: MockError,
        },
      });

      expect(el.type).toBe(GlobalErrorBoundary);
      expect(el.props.pathname).toBeUndefined();
    });
  });
});
