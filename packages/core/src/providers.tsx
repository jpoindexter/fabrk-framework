/**
 * Provider components for FABRK framework
 *
 * FabrkProvider wraps the framework context (plugins, config, features).
 * Design system theming is separate — compose with ThemeProvider from @fabrk/design-system.
 */

'use client';

import { useMemo, type ReactNode } from 'react';
import { FabrkContextProvider } from './context';
import { PluginRegistry } from './plugins';
import type { FabrkConfig } from './types';
import { fabrkConfigSchema } from './types';
import type { FeatureModules } from './auto-wire';

export interface FabrkProviderProps {
  /** Child components */
  children: ReactNode;
  /** Framework configuration */
  config?: FabrkConfig;
  /** Pre-configured plugin registry */
  registry?: PluginRegistry;
  /** Auto-wired feature modules from initFabrk() */
  features?: FeatureModules;
}

/**
 * Root provider for FABRK applications
 *
 * Wraps the framework context including:
 * - FabrkContext - Plugin registry and framework config
 *
 * For theming, compose with ThemeProvider from @fabrk/design-system:
 *
 * @example
 * ```tsx
 * // app/layout.tsx — Framework only (no design system)
 * import { FabrkProvider } from '@fabrk/core'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <FabrkProvider>
 *           {children}
 *         </FabrkProvider>
 *       </body>
 *     </html>
 *   )
 * }
 *
 * // With design system (opt-in)
 * import { FabrkProvider } from '@fabrk/core'
 * import { ThemeProvider } from '@fabrk/design-system'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <FabrkProvider config={{ payments: { adapter: 'stripe' } }}>
 *       <ThemeProvider defaultColorTheme="green">
 *         {children}
 *       </ThemeProvider>
 *     </FabrkProvider>
 *   )
 * }
 * ```
 */
export function FabrkProvider({
  children,
  config = {},
  registry: externalRegistry,
  features,
}: FabrkProviderProps) {
  const validatedConfig = useMemo(() => fabrkConfigSchema.parse(config), [config]);
  const registry = useMemo(() => externalRegistry ?? new PluginRegistry(), [externalRegistry]);

  return (
    <FabrkContextProvider value={{ config: validatedConfig, registry, features }}>
      {children}
    </FabrkContextProvider>
  );
}
