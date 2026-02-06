/**
 * Semantic Design Tokens
 *
 * Role-based tokens that components reference.
 * These are resolved by the active theme.
 */

// =============================================================================
// SEMANTIC TOKEN TYPES
// =============================================================================

export interface ColorTokens {
  bg: {
    base: string;
    surface: string;
    surfaceRaised: string;
    surfaceSunken: string;
    muted: string;
    accent: string;
    accentMuted: string;
    accentHover: string;
    danger: string;
    dangerMuted: string;
    success: string;
    successMuted: string;
    warning: string;
    warningMuted: string;
    info: string;
    infoMuted: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    disabled: string;
    inverse: string;
    accent: string;
    accentHover: string;
    danger: string;
    dangerOnColor: string; // NEW: Text on danger background
    success: string;
    successOnColor: string; // NEW: Text on success background
    warning: string;
    warningOnColor: string; // NEW: Text on warning background
    info: string;
    infoOnColor: string; // NEW: Text on info background
  };
  border: {
    default: string;
    muted: string;
    strong: string;
    accent: string;
    danger: string;
    success: string;
    warning: string; // NEW: Warning border
    focus: string;
  };
  icon: {
    // NEW: Icon colors
    primary: string;
    secondary: string;
    muted: string;
    accent: string;
    danger: string;
    success: string;
    warning: string;
    info: string;
  };
}

export interface RadiusTokens {
  button: string;
  input: string;
  card: string;
  modal: string;
  badge: string;
  avatar: string;
}

export interface ShadowTokens {
  card: string;
  dropdown: string;
  modal: string;
  button: string;
}

export interface FontTokens {
  body: string;
  heading: string;
  code: string;
  ui: string;
}

export interface TextTransformTokens {
  button: 'uppercase' | 'capitalize' | 'none';
  label: 'uppercase' | 'capitalize' | 'none';
  heading: 'uppercase' | 'capitalize' | 'none';
}

export interface SpacingTokens {
  component: {
    paddingXs: string;
    paddingSm: string;
    paddingMd: string;
    paddingLg: string;
    paddingXl: string;
    gapXs: string;
    gapSm: string;
    gapMd: string;
    gapLg: string;
  };
  section: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  page: {
    padding: string;
  };
}

// NEW: Typography text styles
export interface TextStyle {
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
}

export interface TypographyTokens {
  display: TextStyle; // Hero headlines
  h1: TextStyle; // Page titles
  h2: TextStyle; // Section titles
  h3: TextStyle; // Subsection titles
  h4: TextStyle; // Component titles
  h5: TextStyle; // Minor headings
  h6: TextStyle; // Smallest headings
  body: {
    l: TextStyle; // 18px body text
    m: TextStyle; // 16px body text (default)
    s: TextStyle; // 14px body text
  };
  label: TextStyle; // Form labels
  caption: TextStyle; // Captions, metadata
  code: {
    m: TextStyle; // 14px code
    s: TextStyle; // 12px code
  };
}

// NEW: State tokens
export interface StateTokens {
  hover: {
    bgOpacity: string; // 0.08 (8% overlay)
    borderOpacity: string; // 0.5 (50% stronger)
    opacity: string; // 0.90 (hover state)
  };
  active: {
    bgOpacity: string; // 0.12 (12% overlay)
    borderOpacity: string; // 0.7 (70% stronger)
  };
  focus: {
    ringWidth: string; // 2px
    ringOffset: string; // 2px
  };
  disabled: {
    opacity: string; // 0.38 (WCAG-compliant)
  };
  completed: {
    opacity: string; // 0.60 (completed state)
  };
  muted: {
    opacity: string; // 0.50 (muted/dimmed state)
  };
  subtle: {
    opacity: string; // 0.40 (very subtle/faint state)
  };
  secondary: {
    opacity: string; // 0.70 (secondary/subdued state)
  };
}

// =============================================================================
// SEMANTIC TOKEN INTERFACE
// =============================================================================

export interface SemanticTokens {
  color: ColorTokens;
  radius: RadiusTokens;
  shadow: ShadowTokens;
  font: FontTokens;
  textTransform: TextTransformTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens; // NEW
  state: StateTokens; // NEW
}

// =============================================================================
// CSS VARIABLE NAMES (for mapping)
// =============================================================================

export const cssVariableNames = {
  color: {
    bg: {
      base: '--color-bg-base',
      surface: '--color-bg-surface',
      surfaceRaised: '--color-bg-surface-raised',
      surfaceSunken: '--color-bg-surface-sunken',
      muted: '--color-bg-muted',
      accent: '--color-bg-accent',
      accentMuted: '--color-bg-accent-muted',
      accentHover: '--color-bg-accent-hover',
      danger: '--color-bg-danger',
      dangerMuted: '--color-bg-danger-muted',
      success: '--color-bg-success',
      successMuted: '--color-bg-success-muted',
      warning: '--color-bg-warning',
      warningMuted: '--color-bg-warning-muted',
      info: '--color-bg-info',
      infoMuted: '--color-bg-info-muted',
    },
    text: {
      primary: '--color-text-primary',
      secondary: '--color-text-secondary',
      muted: '--color-text-muted',
      disabled: '--color-text-disabled',
      inverse: '--color-text-inverse',
      accent: '--color-text-accent',
      accentHover: '--color-text-accent-hover',
      danger: '--color-text-danger',
      dangerOnColor: '--color-text-danger-on-color',
      success: '--color-text-success',
      successOnColor: '--color-text-success-on-color',
      warning: '--color-text-warning',
      warningOnColor: '--color-text-warning-on-color',
      info: '--color-text-info',
      infoOnColor: '--color-text-info-on-color',
    },
    border: {
      default: '--color-border-default',
      muted: '--color-border-muted',
      strong: '--color-border-strong',
      accent: '--color-border-accent',
      danger: '--color-border-danger',
      success: '--color-border-success',
      warning: '--color-border-warning',
      focus: '--color-border-focus',
    },
    icon: {
      primary: '--color-icon-primary',
      secondary: '--color-icon-secondary',
      muted: '--color-icon-muted',
      accent: '--color-icon-accent',
      danger: '--color-icon-danger',
      success: '--color-icon-success',
      warning: '--color-icon-warning',
      info: '--color-icon-info',
    },
  },
  radius: {
    button: '--radius-button',
    input: '--radius-input',
    card: '--radius-card',
    modal: '--radius-modal',
    badge: '--radius-badge',
    avatar: '--radius-avatar',
  },
  shadow: {
    card: '--shadow-card',
    dropdown: '--shadow-dropdown',
    modal: '--shadow-modal',
    button: '--shadow-button',
  },
  font: {
    body: '--font-body',
    heading: '--font-heading',
    code: '--font-code',
    ui: '--font-ui',
  },
  typography: {
    display: {
      fontSize: '--typography-display-size',
      fontWeight: '--typography-display-weight',
      lineHeight: '--typography-display-leading',
      letterSpacing: '--typography-display-tracking',
    },
    h1: {
      fontSize: '--typography-h1-size',
      fontWeight: '--typography-h1-weight',
      lineHeight: '--typography-h1-leading',
      letterSpacing: '--typography-h1-tracking',
    },
    h2: {
      fontSize: '--typography-h2-size',
      fontWeight: '--typography-h2-weight',
      lineHeight: '--typography-h2-leading',
      letterSpacing: '--typography-h2-tracking',
    },
    h3: {
      fontSize: '--typography-h3-size',
      fontWeight: '--typography-h3-weight',
      lineHeight: '--typography-h3-leading',
      letterSpacing: '--typography-h3-tracking',
    },
    h4: {
      fontSize: '--typography-h4-size',
      fontWeight: '--typography-h4-weight',
      lineHeight: '--typography-h4-leading',
      letterSpacing: '--typography-h4-tracking',
    },
    h5: {
      fontSize: '--typography-h5-size',
      fontWeight: '--typography-h5-weight',
      lineHeight: '--typography-h5-leading',
      letterSpacing: '--typography-h5-tracking',
    },
    h6: {
      fontSize: '--typography-h6-size',
      fontWeight: '--typography-h6-weight',
      lineHeight: '--typography-h6-leading',
      letterSpacing: '--typography-h6-tracking',
    },
    body: {
      l: {
        fontSize: '--typography-body-l-size',
        fontWeight: '--typography-body-l-weight',
        lineHeight: '--typography-body-l-leading',
        letterSpacing: '--typography-body-l-tracking',
      },
      m: {
        fontSize: '--typography-body-m-size',
        fontWeight: '--typography-body-m-weight',
        lineHeight: '--typography-body-m-leading',
        letterSpacing: '--typography-body-m-tracking',
      },
      s: {
        fontSize: '--typography-body-s-size',
        fontWeight: '--typography-body-s-weight',
        lineHeight: '--typography-body-s-leading',
        letterSpacing: '--typography-body-s-tracking',
      },
    },
    label: {
      fontSize: '--typography-label-size',
      fontWeight: '--typography-label-weight',
      lineHeight: '--typography-label-leading',
      letterSpacing: '--typography-label-tracking',
    },
    caption: {
      fontSize: '--typography-caption-size',
      fontWeight: '--typography-caption-weight',
      lineHeight: '--typography-caption-leading',
      letterSpacing: '--typography-caption-tracking',
    },
    code: {
      m: {
        fontSize: '--typography-code-m-size',
        fontWeight: '--typography-code-m-weight',
        lineHeight: '--typography-code-m-leading',
        letterSpacing: '--typography-code-m-tracking',
      },
      s: {
        fontSize: '--typography-code-s-size',
        fontWeight: '--typography-code-s-weight',
        lineHeight: '--typography-code-s-leading',
        letterSpacing: '--typography-code-s-tracking',
      },
    },
  },
  state: {
    hover: {
      bgOpacity: '--state-hover-bg-opacity',
      borderOpacity: '--state-hover-border-opacity',
      opacity: '--state-hover-opacity',
    },
    active: {
      bgOpacity: '--state-active-bg-opacity',
      borderOpacity: '--state-active-border-opacity',
    },
    focus: {
      ringWidth: '--state-focus-ring-width',
      ringOffset: '--state-focus-ring-offset',
    },
    disabled: {
      opacity: '--state-disabled-opacity',
    },
    completed: {
      opacity: '--state-completed-opacity',
    },
    muted: {
      opacity: '--state-muted-opacity',
    },
    subtle: {
      opacity: '--state-subtle-opacity',
    },
    secondary: {
      opacity: '--state-secondary-opacity',
    },
  },
} as const;

export default cssVariableNames;
