/**
 * Provider components for FABRK framework
 *
 * Wraps design system theme provider and other framework providers.
 */

'use client';

import { ReactNode } from 'react';
import { ThemeProvider, type ColorThemeName } from '@fabrk/design-system';

export interface FabrkProviderProps {
  /** Child components */
  children: ReactNode;
  /** Default color theme (defaults to "green") */
  defaultColorTheme?: ColorThemeName;
  /** Storage key prefix for theme persistence */
  storageKeyPrefix?: string;
}

/**
 * Root provider for FABRK applications
 *
 * Wraps all framework providers including:
 * - ThemeProvider - Design system color theme management
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
 * ```
 */
export function FabrkProvider({
  children,
  defaultColorTheme = 'green',
  storageKeyPrefix = 'fabrk-theme',
}: FabrkProviderProps) {
  return (
    <ThemeProvider
      defaultColorTheme={defaultColorTheme}
      storageKeyPrefix={storageKeyPrefix}
    >
      {children}
    </ThemeProvider>
  );
}
