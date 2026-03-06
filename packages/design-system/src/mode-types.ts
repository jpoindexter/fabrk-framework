/**
 * Sub-interfaces for ModeConfig — broken out by token category.
 */

export interface ModeColorBg {
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
}

export interface ModeColorText {
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
}

export interface ModeColorBorder {
  default: string;
  focus: string;
  accent: string;
  danger: string;
  success: string;
  warning: string;
  accentSubtle: string;
  mutedSubtle: string;
}

export interface ModeColorIcon {
  primary: string;
  secondary: string;
  muted: string;
  accent: string;
  danger: string;
  success: string;
  warning: string;
  info: string;
}

export interface ModeColor {
  bg: ModeColorBg;
  text: ModeColorText;
  border: ModeColorBorder;
  icon: ModeColorIcon;
}

export interface ModeSpacing {
  button: { sm: string; md: string; lg: string };
  input: string;
  card: string;
  badge: { sm: string; md: string };
}

export interface ModeTypography {
  display: { xl: string; l: string; m: string; s: string };
  headline: { l: string; m: string; s: string };
  title: { l: string; m: string; s: string };
  body: { l: string; m: string; s: string };
  label: { l: string; m: string; s: string };
  code: { l: string; m: string; s: string };
  caption: string;
  button: string;
  micro: string;
  caps: string;
  input: string;
}

export interface ModeSizing {
  panel: string;
  panelSm: string;
  sidebar: string;
  auth: string;
  dropdown: string;
  select: string;
  dropdownHeight: string;
  textareaHeight: string;
  touch: string;
}

export interface ModeSketch {
  border: string;
  hLine: string;
  container: string;
  itemHover: string;
}

export interface ModeIcon {
  xs: string;
  sm: string;
  md: string;
  lg: string;
}

export interface ModeZIndex {
  banner: string;
  modal: string;
}
