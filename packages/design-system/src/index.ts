/**
 * Design System
 *
 * Token-driven, themeable design system for modern SaaS applications.
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  COMPONENTS                                                     │
 * │  Reference semantic tokens only                                 │
 * │  Never reference raw values or theme-specific tokens            │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  SEMANTIC TOKENS                                                │
 * │  Role-based naming (bg-surface, text-primary)                   │
 * │  Resolved by active theme                                       │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  THEMES                                                         │
 * │  Map semantic tokens to primitive values                        │
 * │  Terminal (monospace, sharp, structured)                        │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  PRIMITIVES                                                     │
 * │  Raw values (colors, sizes)                                     │
 * │  Shared across all themes                                       │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * @see ./spec/overview.md for philosophy
 * @see ./spec/foundations.md for token definitions
 * @see ./spec/themes.md for theme system
 */

// =============================================================================
// TOKEN EXPORTS
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

export { cssVariableNames } from './tokens/semantic';

export {
  CHART_FALLBACK_COLORS,
  getChartColors,
  getChartColor,
  getChartColorVars,
} from './tokens/chart-colors';

// =============================================================================
// THEME EXPORTS
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
  formatStatusText,
} from './themes';

export type { ThemeName, ThemeUtils } from './themes';

// =============================================================================
// PROVIDER EXPORTS
// =============================================================================

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

// =============================================================================
// BACKWARDS COMPATIBILITY LAYER
// =============================================================================
// The following exports maintain compatibility with the 100+ components
// that import from @/design-system using the old API.

import {
  CURRENT_THEME,
  terminalClasses,
  formatButtonText,
  formatLabelText,
  formatCardHeader,
} from './themes';

/**
 * Visual mode configuration interface (for backwards compatibility)
 */
export interface ModeConfig {
  radius: string;
  font: string;
  shadow: string;
  buttonPrefix: string;
  labelFormat: 'brackets' | 'plain';
  cardHeader: 'bracketed' | 'simple' | 'minimal';
  textTransform: 'uppercase' | 'normal';
  inputStyle: string;
  borderWidth: string;

  // NEW - Extended token system
  color: {
    bg: {
      base: string;
      surface: string;
      surfaceRaised: string;
      elevated: string;
      accent: string;
      accentMuted: string;
      accentHover: string;
      primarySubtle: string;
      primaryLight: string;
      successSubtle: string;
      danger: string;
      dangerMuted: string;
      success: string;
      successMuted: string;
      warning: string;
      warningMuted: string;
      info: string;
      infoMuted: string;
      muted: string;
      mutedSubtle: string;
      mutedLight: string;
      mutedMedium: string;
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
      infoOnColor: string;
    };
    border: {
      default: string;
      focus: string;
      accent: string;
      danger: string;
      success: string;
      warning: string;
      accentSubtle: string;
      mutedSubtle: string;
    };
    icon: {
      primary: string;
      secondary: string;
      muted: string;
      accent: string;
      danger: string;
      success: string;
      warning: string;
      info: string;
    };
  };

  spacing: {
    button: {
      sm: string;
      md: string;
      lg: string;
    };
    input: string;
    card: string;
    badge: {
      sm: string;
      md: string;
    };
  };

  /**
   * Typography tokens following M3 type scale
   * @see https://m3.material.io/styles/typography/type-scale-tokens
   */
  typography: {
    // Display - Hero/marketing (88px → 36px)
    display: {
      xl: string; // 88px/96px
      l: string; // 57px/64px
      m: string; // 45px/52px
      s: string; // 36px/44px
    };
    // Headline - Page titles (32px → 24px)
    headline: {
      l: string; // 32px/40px
      m: string; // 28px/36px
      s: string; // 24px/32px
    };
    // Title - Section headers (22px → 14px)
    title: {
      l: string; // 22px/30px
      m: string; // 16px/24px
      s: string; // 14px/20px
    };
    // Body - Running text (16px → 12px)
    body: {
      l: string; // 16px/24px
      m: string; // 14px/20px
      s: string; // 12px/16px
    };
    // Label - UI components (14px → 11px)
    label: {
      l: string; // 14px/20px
      m: string; // 12px/16px
      s: string; // 11px/16px
    };
    // Code - Terminal output (16px → 12px)
    code: {
      l: string; // 16px/24px
      m: string; // 14px/20px
      s: string; // 12px/16px
    };
    // Legacy aliases (backwards compatibility)
    button: string;
    caption: string;
    micro: string;
    caps: string;
    input: string;
  };

  sizing: {
    panel: string; // 600px
    panelSm: string; // 400px
    sidebar: string; // 288px
    auth: string; // 400px max-width for auth pages
    dropdown: string; // 8rem min-width for dropdowns
    select: string; // 5rem min-width for selects
    dropdownHeight: string; // 300px max-height for dropdowns
    textareaHeight: string; // 200px max-height for textareas
    touch: string; // 44px WCAG touch target
  };

  zIndex: {
    banner: string; // Cookie consent, floating notices
    modal: string; // Modals, navigation, toast
  };

  state: {
    hover: {
      bg: string;
      text: string;
      card: string;
      cardSubtle: string;
      link: string;
      linkOpacity: string;
      listItem: string;
      opacity: string;
      borderWarning: string;
      textWarning: string;
      borderAccent: string;
      textAccent: string;
    };
    focus: {
      ring: string;
    };
    disabled: {
      opacity: string;
      cursor: string;
    };
    completed: {
      opacity: string;
    };
    muted: {
      opacity: string;
    };
    subtle: {
      opacity: string;
    };
    secondary: {
      opacity: string;
    };
  };
}

/**
 * Current mode configuration - used by 100+ components
 * This maps the new theme system to the old `mode` API
 */
export const mode: ModeConfig = {
  radius: terminalClasses.radius,
  font: terminalClasses.font,
  shadow: 'shadow-sm',
  buttonPrefix: '> ',
  labelFormat: 'brackets',
  cardHeader: 'bracketed',
  textTransform: 'uppercase',
  inputStyle: terminalClasses.input,
  borderWidth: 'border',

  // Color tokens - map to Tailwind classes
  color: {
    bg: {
      base: 'bg-background',
      surface: 'bg-card',
      surfaceRaised: 'bg-card',
      elevated: 'bg-popover',
      accent: 'bg-accent', // Purple accent for CTAs
      accentMuted: 'bg-accent/10',
      accentHover: 'bg-accent/90',
      primarySubtle: 'bg-primary/5',
      primaryLight: 'bg-primary/10',
      successSubtle: 'bg-success/20',
      danger: 'bg-destructive',
      dangerMuted: 'bg-destructive/10',
      success: 'bg-success',
      successMuted: 'bg-success/10',
      warning: 'bg-warning',
      warningMuted: 'bg-warning/10',
      info: 'bg-info',
      infoMuted: 'bg-info/10',
      muted: 'bg-muted',
      mutedSubtle: 'bg-muted/20',
      mutedLight: 'bg-muted/30',
      mutedMedium: 'bg-muted/50',
      secondary: 'bg-secondary',
    },
    text: {
      primary: 'text-foreground',
      secondary: 'text-card-foreground',
      muted: 'text-muted-foreground',
      inverse: 'text-accent-foreground', // White text for purple buttons
      accent: 'text-accent', // Purple text for links/emphasis
      danger: 'text-destructive',
      dangerOnColor: 'text-destructive-foreground',
      success: 'text-success',
      successOnColor: 'text-success-foreground',
      warning: 'text-warning',
      warningOnColor: 'text-warning-foreground',
      info: 'text-info',
      infoOnColor: 'text-info-foreground',
    },
    border: {
      default: 'border-border',
      focus: 'border-ring',
      accent: 'border-primary',
      danger: 'border-destructive',
      success: 'border-success',
      warning: 'border-warning',
      accentSubtle: 'border-primary/30',
      mutedSubtle: 'border-muted-foreground/30',
    },
    icon: {
      primary: 'text-foreground',
      secondary: 'text-card-foreground',
      muted: 'text-muted-foreground',
      accent: 'text-accent',
      danger: 'text-destructive',
      success: 'text-success',
      warning: 'text-warning',
      info: 'text-info',
    },
  },

  // Spacing tokens - 8-point grid
  spacing: {
    button: {
      sm: 'px-2 py-1',
      md: 'px-4 py-2',
      lg: 'px-6 py-4',
    },
    input: 'px-4 py-2',
    card: 'p-4',
    badge: {
      sm: 'px-2 py-0.5',
      md: 'px-2 py-1',
    },
  },

  // Typography tokens - M3 type scale
  // @see https://m3.material.io/styles/typography/type-scale-tokens
  typography: {
    // Display - Hero/marketing
    display: {
      xl: 'text-display-xl', // 88px/96px
      l: 'text-display-l', // 57px/64px
      m: 'text-display-m', // 45px/52px
      s: 'text-display-s', // 36px/44px
    },
    // Headline - Page titles
    headline: {
      l: 'text-headline-l', // 32px/40px
      m: 'text-headline-m', // 28px/36px
      s: 'text-headline-s', // 24px/32px
    },
    // Title - Section headers
    title: {
      l: 'text-title-l', // 22px/30px
      m: 'text-title-m', // 16px/24px
      s: 'text-title-s', // 14px/20px
    },
    // Body - Running text
    body: {
      l: 'text-body-l', // 16px/24px
      m: 'text-body-m', // 14px/20px
      s: 'text-body-s', // 12px/16px
    },
    // Label - UI components
    label: {
      l: 'text-label-l', // 14px/20px
      m: 'text-label-m', // 12px/16px
      s: 'text-label-s', // 11px/16px
    },
    // Code - Terminal output
    code: {
      l: 'text-code-l', // 16px/24px
      m: 'text-code-m', // 14px/20px
      s: 'text-code-s', // 12px/16px
    },
    // Legacy aliases (backwards compatibility)
    button: 'text-label-m font-medium', // 12px/16px
    caption: 'text-caption text-muted-foreground', // 11px/16px
    micro: 'text-2xs', // 10px
    caps: 'uppercase tracking-caps',
    input: 'text-body-m', // 14px/20px
  },

  // Sizing tokens - 8-point grid compliant
  sizing: {
    panel: 'h-panel', // 600px
    panelSm: 'h-panel-sm', // 400px
    sidebar: 'w-sidebar', // 288px (w-72)
    auth: 'max-w-auth', // 400px max-width for auth pages
    dropdown: 'min-w-dropdown', // 8rem min-width for dropdowns
    select: 'min-w-select', // 5rem min-width for selects
    dropdownHeight: 'max-h-dropdown', // 300px max-height
    textareaHeight: 'max-h-textarea', // 200px max-height
    touch: 'min-h-touch min-w-touch', // 44px WCAG touch target
  },

  // Z-index scale
  zIndex: {
    banner: 'z-banner', // 60 - cookie consent, floating notices
    modal: 'z-modal', // 100 - modals, navigation, toast
  },

  // State tokens
  state: {
    hover: {
      bg: 'hover:bg-primary/90',
      text: 'hover:text-foreground',
      card: 'hover:bg-muted/50',
      cardSubtle: 'hover:bg-muted/30',
      link: 'hover:text-primary',
      linkOpacity: 'hover:opacity-80',
      listItem: 'hover:bg-muted/50',
      opacity: 'hover:opacity-90',
      // Semantic hover states
      borderWarning: 'hover:border-warning',
      textWarning: 'hover:text-warning',
      borderAccent: 'hover:border-primary',
      textAccent: 'hover:text-primary',
    },
    focus: {
      ring: 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    },
    disabled: {
      opacity: 'disabled:opacity-50',
      cursor: 'disabled:cursor-not-allowed',
    },
    completed: {
      opacity: 'opacity-60',
    },
    muted: {
      opacity: 'opacity-50',
    },
    subtle: {
      opacity: 'opacity-40',
    },
    secondary: {
      opacity: 'opacity-70',
    },
  },
};

// =============================================================================
// BACKWARDS COMPATIBILITY ALIASES
// =============================================================================
// These alias the terminal theme functions for backwards compatibility

/**
 * Format a label (alias for formatLabelText from terminal theme)
 */
export const formatLabel = formatLabelText;

/**
 * Format card title (alias for formatCardHeader from terminal theme)
 */
export const formatCardTitle = formatCardHeader;

/**
 * Check if current mode is sharp (terminal)
 */
export function isSharpMode(): boolean {
  return CURRENT_THEME === 'terminal';
}

/**
 * Check if current mode uses rounded corners (always false - terminal only)
 */
export function hasRoundedCorners(): boolean {
  return false;
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const designSystem = {
  mode,
  formatLabel,
  formatButtonText,
  formatCardTitle,
  isSharpMode,
  hasRoundedCorners,
} as const;

export default designSystem;
