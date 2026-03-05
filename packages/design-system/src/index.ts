/**
 * @fabrk/design-system — token-driven, themeable design system.
 */

// TOKEN EXPORTS

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
} from './tokens/primitives';

export type {
  SemanticTokens,
  ColorTokens,
  RadiusTokens,
  ShadowTokens,
  FontTokens,
  TextTransformTokens,
  SpacingTokens,
} from './tokens/semantic';

export {
  CHART_FALLBACK_COLORS,
  getChartColors,
  getChartColor,
  getChartColorVars,
} from './tokens/chart-colors';

// THEME EXPORTS

export {
  themes,
  themeClasses,
  THEME_NAMES,
  DEFAULT_THEME,
  terminalTheme,
  terminalClasses,
  formatButtonText,
  formatLabelText,
  formatCardHeader,
} from './themes';

export type { ThemeName } from './themes';

// PROVIDER EXPORTS

export {
  ThemeProvider,
  useThemeContext,
  useOptionalThemeContext,
  ThemeScript,
} from './providers';

export type {
  ThemeContextValue,
  ThemeProviderProps,
  ThemeScriptProps,
  ColorThemeName,
} from './providers';

// MODE EXPORTS

export { mode } from './mode';
export type { ModeConfig } from './mode';
