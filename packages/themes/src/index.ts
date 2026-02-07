/**
 * @fabrk/themes
 *
 * Opt-in design system theming for FABRK applications.
 * This is separate from the framework core — like how shadcn/ui is separate from Next.js.
 *
 * Usage:
 * ```tsx
 * import { FabrkProvider } from '@fabrk/core'
 * import { ThemeProvider, mode } from '@fabrk/themes'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <FabrkProvider>
 *       <ThemeProvider defaultColorTheme="green">
 *         {children}
 *       </ThemeProvider>
 *     </FabrkProvider>
 *   )
 * }
 * ```
 */

// =============================================================================
// THEME PROVIDER
// =============================================================================

export {
  ThemeProvider,
  useThemeContext,
  useOptionalThemeContext,
  ThemeScript,
} from '@fabrk/design-system'

export type {
  ThemeContextValue,
  ThemeProviderProps,
  ThemeScriptProps,
  ColorThemeName,
} from '@fabrk/design-system'

// =============================================================================
// MODE OBJECT (Design tokens for components)
// =============================================================================

export { mode } from '@fabrk/design-system'
export type { ModeConfig } from '@fabrk/design-system'

// =============================================================================
// THEMES
// =============================================================================

export {
  themes,
  themeClasses,
  themeUtils,
  THEME_NAMES,
  DEFAULT_THEME,
  CURRENT_THEME,
  getActiveTheme,
  getActiveThemeClasses,
  getActiveThemeUtils,
  terminalTheme,
  terminalClasses,
  formatButtonText,
  formatLabelText,
  formatCardHeader,
  formatLabel,
  formatCardTitle,
  isSharpMode,
  hasRoundedCorners,
} from '@fabrk/design-system'

export type { ThemeName, ThemeUtils } from '@fabrk/design-system'

// =============================================================================
// TOKENS
// =============================================================================

export {
  primitives,
  colors,
  space,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  radius,
  shadow,
  duration,
  easing,
  breakpoint,
  container,
  zIndex,
  borderWidth,
  accessibility,
  cssVariableNames,
  CHART_FALLBACK_COLORS,
  getChartColors,
  getChartColor,
  getChartColorVars,
} from '@fabrk/design-system'

export type {
  SemanticTokens,
  ColorTokens,
  RadiusTokens,
  ShadowTokens,
  FontTokens,
  TextTransformTokens,
  SpacingTokens,
} from '@fabrk/design-system'
