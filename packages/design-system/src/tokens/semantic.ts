/**
 * Semantic Design Tokens
 *
 * Role-based tokens that components reference.
 * These are resolved by the active theme.
 */

// SEMANTIC TOKEN TYPES

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
    muted: string;
    strong: string;
    accent: string;
    danger: string;
    success: string;
    warning: string;
    focus: string;
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

// SEMANTIC TOKEN INTERFACE

export interface SemanticTokens {
  color: ColorTokens;
  radius: RadiusTokens;
  shadow: ShadowTokens;
  font: FontTokens;
  textTransform: TextTransformTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
  state: StateTokens;
}

