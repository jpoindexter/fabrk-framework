import type { Route } from "./router";
import {
  ErrorBoundary,
  NotFoundBoundary,
  GlobalErrorBoundary,
} from "./error-boundary";

/**
 * Build the React element tree for a matched page route.
 *
 * Nesting order (outermost → innermost):
 *   GlobalErrorBoundary(global-error.tsx)
 *     └── RootLayout
 *         └── ErrorBoundary(error.tsx)
 *             └── NotFoundBoundary(not-found.tsx)
 *                 └── NestedLayout(s)
 *                     └── Suspense(loading.tsx)
 *                         └── PageComponent
 *
 * This function is pure — it does not do I/O. Callers provide
 * pre-loaded components via the `modules` parameter.
 */

export interface PageModules {
  /** The page's default export component. */
  page: React.ComponentType<{ params: Record<string, string>; searchParams?: Record<string, string> }>;
  /** Layout components, ordered root → leaf. */
  layouts: React.ComponentType<{ children: React.ReactNode }>[];
  /** Error boundary fallback component (from nearest error.tsx). */
  errorFallback?: React.ComponentType<{
    error: Error & { digest?: string };
    reset: () => void;
  }>;
  /** Loading fallback component (from nearest loading.tsx). */
  loadingFallback?: React.ComponentType;
  /** Not-found fallback component (from nearest not-found.tsx). */
  notFoundFallback?: React.ComponentType;
  /** Global error fallback (from global-error.tsx at app root). */
  globalErrorFallback?: React.ComponentType<{
    error: Error & { digest?: string };
    reset: () => void;
  }>;
  /** Parallel route slot components — maps slot name to component. */
  slots?: Record<string, React.ComponentType>;
}

export interface BuildPageTreeOptions {
  route: Route;
  params: Record<string, string>;
  searchParams?: Record<string, string>;
  modules: PageModules;
  pathname: string;
  /** React module — passed in to avoid importing React at module scope. */
  React: typeof import("react");
}

/**
 * Build the full React element tree for a page render.
 * Returns a single React element ready to pass to renderToReadableStream.
 */
export function buildPageTree(options: BuildPageTreeOptions): React.ReactElement {
  const { route: _route, params, searchParams, modules, pathname, React } = options;
  const {
    page: Page,
    layouts,
    errorFallback,
    loadingFallback,
    notFoundFallback,
    globalErrorFallback,
    slots,
  } = modules;

  // We use React.createElement throughout to avoid JSX transform issues in SSR

  // Innermost: the page component
  let element: React.ReactElement = React.createElement(Page, { params, searchParams });

  // Wrap in Suspense if loading.tsx exists
  if (loadingFallback) {
    const Loading = loadingFallback;
    element = React.createElement(
      React.Suspense,
      { fallback: React.createElement(Loading) },
      element
    );
  }

  // Wrap in NotFoundBoundary if not-found.tsx exists
  if (notFoundFallback) {
    element = React.createElement(
      NotFoundBoundary,
      { fallback: notFoundFallback, pathname, children: element }
    );
  }

  // Wrap in ErrorBoundary if error.tsx exists
  if (errorFallback) {
    element = React.createElement(
      ErrorBoundary,
      { fallback: errorFallback, pathname, children: element }
    );
  }

  // Wrap in layouts (innermost layout first, then outward)
  // The innermost layout receives parallel route slots as named props
  for (let i = layouts.length - 1; i >= 0; i--) {
    const layoutProps: Record<string, unknown> = { children: element };

    // Pass slot components to the innermost layout
    if (i === layouts.length - 1 && slots) {
      for (const [slotName, SlotComponent] of Object.entries(slots)) {
        layoutProps[slotName] = React.createElement(SlotComponent);
      }
    }

    element = React.createElement(layouts[i], layoutProps as { children: React.ReactNode });
  }

  // Outermost: global error boundary
  if (globalErrorFallback) {
    element = React.createElement(
      GlobalErrorBoundary,
      { fallback: globalErrorFallback, children: element }
    );
  }

  return element;
}
