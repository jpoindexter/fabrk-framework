import {
  lazy,
  Suspense,
  useState,
  useEffect,
  createElement,
  type ReactNode,
  type ComponentType,
} from "react";

export interface DynamicOptions {
  /** Component to render while loading. */
  loading?: () => ReactNode;
  /** Set to false to skip SSR and only render on the client. Default: true. */
  ssr?: boolean;
}

/**
 * Dynamically import a component with optional loading fallback.
 *
 * ```tsx
 * const HeavyChart = dynamic(() => import("./heavy-chart"), {
 *   loading: () => <Skeleton />,
 * });
 *
 * // Client-only (no SSR):
 * const BrowserOnly = dynamic(() => import("./map"), { ssr: false });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dynamic<P extends Record<string, any> = Record<string, any>>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  options: DynamicOptions = {},
): ComponentType<P> {
  const { loading, ssr = true } = options;

  if (!ssr) {
    // Client-only: render nothing during SSR, load after mount
    function ClientOnlyDynamic(props: P) {
      const [Component, setComponent] = useState<ComponentType<P> | null>(null);

      useEffect(() => {
        let cancelled = false;
        loader().then((mod) => {
          if (!cancelled) setComponent(() => mod.default);
        });
        return () => {
          cancelled = true;
        };
      }, []);

      if (!Component) {
        return loading ? loading() : null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return createElement(Component as any, props);
    }
    ClientOnlyDynamic.displayName = "DynamicClientOnly";
    return ClientOnlyDynamic;
  }

  const LazyComponent = lazy(loader);

  function DynamicComponent(props: P) {
    const fallback = loading ? loading() : null;
    return createElement(
      Suspense,
      { fallback },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(LazyComponent as any, props),
    );
  }
  DynamicComponent.displayName = "Dynamic";
  return DynamicComponent;
}
