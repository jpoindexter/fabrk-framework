/**
 * Design System Primitives
 *
 * Raw, immutable values that themes select from.
 * These are the foundation - never use directly in components.
 * Components should only reference semantic tokens.
 */

export const colors = {
  white: '#ffffff',
  black: '#000000',

  gray: {
    50: 'oklch(98% 0.005 240)',
    100: 'oklch(96% 0.005 240)',
    200: 'oklch(92% 0.005 240)',
    300: 'oklch(87% 0.005 240)',
    400: 'oklch(70% 0.005 240)',
    500: 'oklch(55% 0.005 240)',
    600: 'oklch(45% 0.005 240)',
    700: 'oklch(37% 0.01 240)',
    800: 'oklch(27% 0.01 240)',
    900: 'oklch(21% 0.01 240)',
    950: 'oklch(14% 0.01 240)',
  },

  primary: {
    50: 'oklch(97% 0.02 290)',
    100: 'oklch(94% 0.04 290)',
    200: 'oklch(88% 0.08 290)',
    300: 'oklch(79% 0.14 290)',
    400: 'oklch(70% 0.18 290)',
    500: 'oklch(60% 0.20 290)',
    600: 'oklch(52% 0.22 290)',
    700: 'oklch(45% 0.22 290)',
    800: 'oklch(38% 0.20 290)',
    900: 'oklch(32% 0.18 290)',
    950: 'oklch(22% 0.15 290)',
  },

  red: {
    50: 'oklch(97% 0.02 25)',
    100: 'oklch(94% 0.05 25)',
    200: 'oklch(88% 0.10 25)',
    300: 'oklch(78% 0.16 25)',
    400: 'oklch(68% 0.20 25)',
    500: 'oklch(60% 0.22 25)',
    600: 'oklch(52% 0.24 25)',
    700: 'oklch(45% 0.22 25)',
    800: 'oklch(38% 0.18 25)',
    900: 'oklch(32% 0.14 25)',
    950: 'oklch(22% 0.10 25)',
  },

  green: {
    50: 'oklch(97% 0.02 145)',
    100: 'oklch(94% 0.04 145)',
    200: 'oklch(88% 0.08 145)',
    300: 'oklch(78% 0.12 145)',
    400: 'oklch(70% 0.16 145)',
    500: 'oklch(65% 0.18 145)',
    600: 'oklch(55% 0.18 145)',
    700: 'oklch(48% 0.16 145)',
    800: 'oklch(40% 0.14 145)',
    900: 'oklch(32% 0.12 145)',
    950: 'oklch(22% 0.08 145)',
  },

  amber: {
    50: 'oklch(97% 0.02 85)',
    100: 'oklch(94% 0.05 85)',
    200: 'oklch(90% 0.10 85)',
    300: 'oklch(85% 0.14 80)',
    400: 'oklch(82% 0.16 75)',
    500: 'oklch(80% 0.16 85)',
    600: 'oklch(70% 0.18 75)',
    700: 'oklch(60% 0.16 70)',
    800: 'oklch(50% 0.14 65)',
    900: 'oklch(40% 0.12 60)',
    950: 'oklch(28% 0.08 55)',
  },

  blue: {
    50: 'oklch(97% 0.02 250)',
    100: 'oklch(94% 0.04 250)',
    200: 'oklch(88% 0.08 250)',
    300: 'oklch(78% 0.14 250)',
    400: 'oklch(68% 0.18 250)',
    500: 'oklch(60% 0.18 250)',
    600: 'oklch(52% 0.20 250)',
    700: 'oklch(45% 0.18 250)',
    800: 'oklch(38% 0.16 250)',
    900: 'oklch(32% 0.14 250)',
    950: 'oklch(22% 0.10 250)',
  },
} as const;

export const space = {
  0: '0',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  2: '0.5rem', // 8px
  4: '1rem', // 16px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  32: '8rem', // 128px
  40: '10rem', // 160px
  48: '12rem', // 192px
  64: '16rem', // 256px
} as const;

export const fontFamily = {
  sans: '"Inter", system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
  display: '"Inter", system-ui, sans-serif',
} as const;

/**
 * Font Size Scale
 * Based on M3 Type Scale with terminal-friendly sizes
 * @see https://m3.material.io/styles/typography/type-scale-tokens
 */
export const fontSize = {
  // M3 Label/Caption sizes
  '2xs': '0.625rem', // 10px
  xs: '0.75rem', // 12px - body-s, label-m
  sm: '0.875rem', // 14px - body-m, label-l, title-s
  base: '1rem', // 16px - body-l, title-m

  // M3 Title sizes
  lg: '1.125rem', // 18px
  xl: '1.25rem', // 20px
  '2xl': '1.375rem', // 22px - title-l
  '3xl': '1.5rem', // 24px - headline-s

  // M3 Headline sizes
  '4xl': '1.75rem', // 28px - headline-m
  '5xl': '2rem', // 32px - headline-l
  '6xl': '2.25rem', // 36px - display-s

  // M3 Display sizes
  '7xl': '2.8125rem', // 45px - display-m
  '8xl': '3.5625rem', // 57px - display-l
  '9xl': '5.5rem', // 88px - display-xl
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Line Height Scale
 * M3 uses fixed pixel values for predictable vertical rhythm
 * Ratios kept for backwards compatibility; fixed values preferred
 * @see https://m3.material.io/styles/typography/type-scale-tokens
 */
export const lineHeight = {
  // Ratio-based (backwards compatibility)
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',

  // M3 fixed line-heights (preferred)
  '16': '1rem', // 16px - body-s, label-m, label-s, code-s
  '20': '1.25rem', // 20px - body-m, label-l, title-s, code-m
  '24': '1.5rem', // 24px - body-l, title-m, code-l
  '28': '1.75rem', // 28px - headline-s (responsive)
  '30': '1.875rem', // 30px - title-l
  '32': '2rem', // 32px - headline-s
  '36': '2.25rem', // 36px - headline-m
  '40': '2.5rem', // 40px - headline-l, display-s (responsive)
  '44': '2.75rem', // 44px - display-s
  '52': '3.25rem', // 52px - display-m
  '64': '4rem', // 64px - display-l
  '96': '6rem', // 96px - display-xl
} as const;

export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

export const radius = {
  none: '0',
  sm: '0.125rem', // 2px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  '2xl': '1rem', // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
} as const;

export const shadow = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

export const duration = {
  instant: '0ms',
  fast: '100ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
  slowest: '1000ms',
} as const;

export const easing = {
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

export const breakpoint = {
  xs: '0px',
  sm: '480px',
  md: '640px',
  lg: '768px',
  xl: '1024px',
  '2xl': '1280px',
  '3xl': '1536px',
} as const;

export const container = {
  xs: '320px',
  sm: '480px',
  md: '640px',
  lg: '768px',
  xl: '1024px',
  '2xl': '1280px',
  '3xl': '1536px',
  full: '100%',
  prose: '65ch',
} as const;

export const zIndex = {
  behind: -1,
  base: 0,
  raised: 10,
  dropdown: 20,
  sticky: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  toast: 70,
  tooltip: 80,
  max: 9999,
} as const;

export const borderWidth = {
  none: '0',
  default: '1px',
  2: '2px',
  4: '4px',
} as const;

export const accessibility = {
  touchTarget: {
    min: '44px',
    comfortable: '48px',
  },
  focusRing: {
    width: '2px',
    offset: '2px',
  },
} as const;

export const primitives = {
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
} as const;

export default primitives;
