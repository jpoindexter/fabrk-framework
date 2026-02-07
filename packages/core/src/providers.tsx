/**
 * Provider components for FABRK framework
 *
 * Wraps design system theme provider and framework context providers.
 */

'use client';

import { useMemo, type ReactNode } from 'react';
import { ThemeProvider, type ColorThemeName } from '@fabrk/design-system';
import { FabrkContextProvider } from './context';
import { PluginRegistry } from './plugins';
import type { FabrkConfig } from './types';
import { fabrkConfigSchema } from './types';
import type { FeatureModules } from './auto-wire';

export interface FabrkProviderProps {
  /** Child components */
  children: ReactNode;
  /** Default color theme (defaults to "green") */
  defaultColorTheme?: ColorThemeName;
  /** Storage key prefix for theme persistence */
  storageKeyPrefix?: string;
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
 * Wraps all framework providers including:
 * - ThemeProvider - Design system color theme management
 * - FabrkContext - Plugin registry and framework config
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { FabrkProvider } from '@fabrk/core'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <FabrkProvider defaultColorTheme="green">
 *           {children}
 *         </FabrkProvider>
 *       </body>
 *     </html>
 *   )
 * }
 *
 * // With plugins
 * import { FabrkProvider, PluginRegistry } from '@fabrk/core'
 *
 * const registry = new PluginRegistry()
 * registry.register('payment', stripeAdapter)
 * registry.register('auth', nextAuthAdapter)
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <FabrkProvider
 *       config={{ payments: { provider: 'stripe' } }}
 *       registry={registry}
 *     >
 *       {children}
 *     </FabrkProvider>
 *   )
 * }
 * ```
 */
export function FabrkProvider({
  children,
  defaultColorTheme = 'green',
  storageKeyPrefix = 'fabrk-theme',
  config = {},
  registry: externalRegistry,
  features,
}: FabrkProviderProps) {
  const validatedConfig = useMemo(() => fabrkConfigSchema.parse(config), [config]);
  const registry = useMemo(() => externalRegistry ?? new PluginRegistry(), [externalRegistry]);

  return (
    <ThemeProvider
      defaultColorTheme={defaultColorTheme}
      storageKeyPrefix={storageKeyPrefix}
    >
      <FabrkContextProvider config={validatedConfig} registry={registry} features={features}>
        {children}
      </FabrkContextProvider>
    </ThemeProvider>
  );
}
