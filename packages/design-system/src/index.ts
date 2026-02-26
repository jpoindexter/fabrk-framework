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

import {
  terminalClasses,
  formatButtonText,
  formatLabelText,
  formatCardHeader,
} from './themes';

/**
 * Mode configuration — maps theme tokens to Tailwind classes.
 * Only includes properties actively used by components.
 */
export interface ModeConfig {
  radius: string;
  font: string;
  textTransform: 'uppercase' | 'normal';

  color: {
    bg: {
      base: string;
      surface: string;
      surfaceRaised: string;
      elevated: string;
      accent: string;
      accentMuted: string;
      primaryLight: string;
      danger: string;
      dangerMuted: string;
      success: string;
      successMuted: string;
      warning: string;
      warningMuted: string;
      infoMuted: string;
      muted: string;
      secondary: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      inverse: string;
      accent: string;
      danger: string;
      dangerOnColor: string;
      success: string;
      successOnColor: string;
      warning: string;
      warningOnColor: string;
      info: string;
    };
    border: {
      default: string;
      accent: string;
      danger: string;
      success: string;
      warning: string;
    };
  };

  spacing: {
    button: { sm: string; md: string; lg: string };
    input: string;
    card: string;
    badge: { sm: string; md: string };
  };

  typography: {
    body: { m: string };
    button: string;
    caption: string;
    input: string;
    label: string;
  };

  state: {
    hover: { bg: string; text: string; card: string; opacity: string };
    focus: { ring: string };
    disabled: { opacity: string; cursor: string };
    muted: { opacity: string };
    subtle: { opacity: string };
    secondary: { opacity: string };
  };
}

/**
 * Current mode configuration — used by 100+ components.
 * Maps the theme system to Tailwind utility classes.
 */
export const mode: ModeConfig = {
  radius: terminalClasses.radius,
  font: terminalClasses.font,
  textTransform: 'uppercase',

  color: {
    bg: {
      base: 'bg-background',
      surface: 'bg-card',
      surfaceRaised: 'bg-card',
      elevated: 'bg-popover',
      accent: 'bg-accent',
      accentMuted: 'bg-accent/10',
      primaryLight: 'bg-primary/10',
      danger: 'bg-destructive',
      dangerMuted: 'bg-destructive/10',
      success: 'bg-success',
      successMuted: 'bg-success/10',
      warning: 'bg-warning',
      warningMuted: 'bg-warning/10',
      infoMuted: 'bg-info/10',
      muted: 'bg-muted',
      secondary: 'bg-secondary',
    },
    text: {
      primary: 'text-foreground',
      secondary: 'text-card-foreground',
      muted: 'text-muted-foreground',
      inverse: 'text-accent-foreground',
      accent: 'text-accent',
      danger: 'text-destructive',
      dangerOnColor: 'text-destructive-foreground',
      success: 'text-success',
      successOnColor: 'text-success-foreground',
      warning: 'text-warning',
      warningOnColor: 'text-warning-foreground',
      info: 'text-info',
    },
    border: {
      default: 'border-border',
      accent: 'border-primary',
      danger: 'border-destructive',
      success: 'border-success',
      warning: 'border-warning',
    },
  },

  spacing: {
    button: { sm: 'px-2 py-1', md: 'px-4 py-2', lg: 'px-6 py-4' },
    input: 'px-4 py-2',
    card: 'p-4',
    badge: { sm: 'px-2 py-0.5', md: 'px-2 py-1' },
  },

  typography: {
    body: { m: 'text-body-m' },
    button: 'text-label-m font-medium',
    caption: 'text-caption text-muted-foreground',
    input: 'text-body-m',
    label: 'text-label-m',
  },

  state: {
    hover: {
      bg: 'hover:bg-primary/90',
      text: 'hover:text-foreground',
      card: 'hover:bg-muted/50',
      opacity: 'hover:opacity-90',
    },
    focus: {
      ring: 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    },
    disabled: { opacity: 'disabled:opacity-50', cursor: 'disabled:cursor-not-allowed' },
    muted: { opacity: 'opacity-50' },
    subtle: { opacity: 'opacity-40' },
    secondary: { opacity: 'opacity-70' },
  },
};

