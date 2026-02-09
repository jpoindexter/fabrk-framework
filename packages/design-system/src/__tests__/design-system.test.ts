import { describe, it, expect } from 'vitest'
import {
  // Mode object (backwards compat layer)
  mode,
  formatLabel,
  formatCardTitle,
  isSharpMode,
  hasRoundedCorners,
  // Theme system
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
  // Tokens
  cssVariableNames,
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
  // Chart colors
  CHART_FALLBACK_COLORS,
  getChartColors,
  getChartColor,
  getChartColorVars,
  // Presets
  hashmarkVariables,
  generateHashmarkCss,
} from '../index'

import type {
  ModeConfig,
  SemanticTokens,
  ColorTokens,
  RadiusTokens,
  ShadowTokens,
  FontTokens,
  TextTransformTokens,
  SpacingTokens,
} from '../index'

// =============================================================================
// 1. MODE OBJECT
// =============================================================================

describe('mode object', () => {
  it('should be defined and satisfy the ModeConfig interface', () => {
    const m: ModeConfig = mode
    expect(m).toBeDefined()
  })

  // --- Top-level scalars ---

  it('should have a radius string', () => {
    expect(typeof mode.radius).toBe('string')
    expect(mode.radius.length).toBeGreaterThan(0)
  })

  it('should have a font string', () => {
    expect(typeof mode.font).toBe('string')
    expect(mode.font.length).toBeGreaterThan(0)
  })

  it('should have a shadow string', () => {
    expect(typeof mode.shadow).toBe('string')
  })

  it('should have buttonPrefix "> "', () => {
    expect(mode.buttonPrefix).toBe('> ')
  })

  it('should have labelFormat "brackets"', () => {
    expect(mode.labelFormat).toBe('brackets')
  })

  it('should have cardHeader "bracketed"', () => {
    expect(mode.cardHeader).toBe('bracketed')
  })

  it('should have textTransform "uppercase"', () => {
    expect(mode.textTransform).toBe('uppercase')
  })

  it('should have inputStyle string', () => {
    expect(typeof mode.inputStyle).toBe('string')
    expect(mode.inputStyle.length).toBeGreaterThan(0)
  })

  it('should have borderWidth string', () => {
    expect(typeof mode.borderWidth).toBe('string')
  })

  // --- color.bg ---

  it('should have all color.bg tokens as non-empty strings', () => {
    const bgKeys: (keyof typeof mode.color.bg)[] = [
      'base', 'surface', 'surfaceRaised', 'elevated',
      'accent', 'accentMuted', 'accentHover',
      'primarySubtle', 'primaryLight', 'successSubtle',
      'danger', 'dangerMuted', 'success', 'successMuted',
      'warning', 'warningMuted', 'info', 'infoMuted',
      'muted', 'mutedSubtle', 'mutedLight', 'mutedMedium',
      'secondary',
    ]
    for (const key of bgKeys) {
      expect(mode.color.bg[key], `color.bg.${key}`).toBeTruthy()
      expect(typeof mode.color.bg[key]).toBe('string')
    }
  })

  // --- color.text ---

  it('should have all color.text tokens as non-empty strings', () => {
    const textKeys: (keyof typeof mode.color.text)[] = [
      'primary', 'secondary', 'muted', 'inverse', 'accent',
      'danger', 'dangerOnColor', 'success', 'successOnColor',
      'warning', 'warningOnColor', 'info', 'infoOnColor',
    ]
    for (const key of textKeys) {
      expect(mode.color.text[key], `color.text.${key}`).toBeTruthy()
      expect(typeof mode.color.text[key]).toBe('string')
    }
  })

  // --- color.border ---

  it('should have all color.border tokens as non-empty strings', () => {
    const borderKeys: (keyof typeof mode.color.border)[] = [
      'default', 'focus', 'accent', 'danger', 'success',
      'warning', 'accentSubtle', 'mutedSubtle',
    ]
    for (const key of borderKeys) {
      expect(mode.color.border[key], `color.border.${key}`).toBeTruthy()
      expect(typeof mode.color.border[key]).toBe('string')
    }
  })

  // --- color.icon ---

  it('should have all color.icon tokens as non-empty strings', () => {
    const iconKeys: (keyof typeof mode.color.icon)[] = [
      'primary', 'secondary', 'muted', 'accent',
      'danger', 'success', 'warning', 'info',
    ]
    for (const key of iconKeys) {
      expect(mode.color.icon[key], `color.icon.${key}`).toBeTruthy()
      expect(typeof mode.color.icon[key]).toBe('string')
    }
  })

  // --- spacing ---

  it('should have spacing.button sizes (sm, md, lg)', () => {
    expect(mode.spacing.button.sm).toBeTruthy()
    expect(mode.spacing.button.md).toBeTruthy()
    expect(mode.spacing.button.lg).toBeTruthy()
  })

  it('should have spacing.input and card', () => {
    expect(mode.spacing.input).toBeTruthy()
    expect(mode.spacing.card).toBeTruthy()
  })

  it('should have spacing.badge sizes (sm, md)', () => {
    expect(mode.spacing.badge.sm).toBeTruthy()
    expect(mode.spacing.badge.md).toBeTruthy()
  })

  // --- typography ---

  it('should have typography.display sizes (xl, l, m, s)', () => {
    expect(mode.typography.display.xl).toBeTruthy()
    expect(mode.typography.display.l).toBeTruthy()
    expect(mode.typography.display.m).toBeTruthy()
    expect(mode.typography.display.s).toBeTruthy()
  })

  it('should have typography.headline sizes (l, m, s)', () => {
    expect(mode.typography.headline.l).toBeTruthy()
    expect(mode.typography.headline.m).toBeTruthy()
    expect(mode.typography.headline.s).toBeTruthy()
  })

  it('should have typography.title sizes (l, m, s)', () => {
    expect(mode.typography.title.l).toBeTruthy()
    expect(mode.typography.title.m).toBeTruthy()
    expect(mode.typography.title.s).toBeTruthy()
  })

  it('should have typography.body sizes (l, m, s)', () => {
    expect(mode.typography.body.l).toBeTruthy()
    expect(mode.typography.body.m).toBeTruthy()
    expect(mode.typography.body.s).toBeTruthy()
  })

  it('should have typography.label sizes (l, m, s)', () => {
    expect(mode.typography.label.l).toBeTruthy()
    expect(mode.typography.label.m).toBeTruthy()
    expect(mode.typography.label.s).toBeTruthy()
  })

  it('should have typography.code sizes (l, m, s)', () => {
    expect(mode.typography.code.l).toBeTruthy()
    expect(mode.typography.code.m).toBeTruthy()
    expect(mode.typography.code.s).toBeTruthy()
  })

  it('should have legacy typography aliases (button, caption, micro, caps, input)', () => {
    expect(mode.typography.button).toBeTruthy()
    expect(mode.typography.caption).toBeTruthy()
    expect(mode.typography.micro).toBeTruthy()
    expect(mode.typography.caps).toBeTruthy()
    expect(mode.typography.input).toBeTruthy()
  })

  // --- sizing ---

  it('should have all sizing tokens', () => {
    const sizingKeys: (keyof typeof mode.sizing)[] = [
      'panel', 'panelSm', 'sidebar', 'auth', 'dropdown',
      'select', 'dropdownHeight', 'textareaHeight', 'touch',
    ]
    for (const key of sizingKeys) {
      expect(mode.sizing[key], `sizing.${key}`).toBeTruthy()
      expect(typeof mode.sizing[key]).toBe('string')
    }
  })

  // --- zIndex ---

  it('should have zIndex.banner and zIndex.modal', () => {
    expect(mode.zIndex.banner).toBeTruthy()
    expect(mode.zIndex.modal).toBeTruthy()
  })

  // --- state ---

  it('should have state.hover tokens', () => {
    const hoverKeys: (keyof typeof mode.state.hover)[] = [
      'bg', 'text', 'card', 'cardSubtle', 'link',
      'linkOpacity', 'listItem', 'opacity',
      'borderWarning', 'textWarning', 'borderAccent', 'textAccent',
    ]
    for (const key of hoverKeys) {
      expect(mode.state.hover[key], `state.hover.${key}`).toBeTruthy()
    }
  })

  it('should have state.focus.ring', () => {
    expect(mode.state.focus.ring).toBeTruthy()
  })

  it('should have state.disabled tokens', () => {
    expect(mode.state.disabled.opacity).toBeTruthy()
    expect(mode.state.disabled.cursor).toBeTruthy()
  })

  it('should have state opacity tokens (completed, muted, subtle, secondary)', () => {
    expect(mode.state.completed.opacity).toBeTruthy()
    expect(mode.state.muted.opacity).toBeTruthy()
    expect(mode.state.subtle.opacity).toBeTruthy()
    expect(mode.state.secondary.opacity).toBeTruthy()
  })
})

// =============================================================================
// 2. THEME REGISTRY
// =============================================================================

describe('theme registry', () => {
  it('THEME_NAMES should contain "terminal"', () => {
    expect(THEME_NAMES).toContain('terminal')
  })

  it('DEFAULT_THEME should be "terminal"', () => {
    expect(DEFAULT_THEME).toBe('terminal')
  })

  it('CURRENT_THEME should be "terminal"', () => {
    expect(CURRENT_THEME).toBe('terminal')
  })

  it('themes registry should have a terminal entry', () => {
    expect(themes.terminal).toBeDefined()
  })

  it('getActiveTheme should return a valid SemanticTokens object', () => {
    const theme = getActiveTheme()
    expect(theme).toBeDefined()
    // Verify all top-level SemanticTokens fields exist
    expect(theme.color).toBeDefined()
    expect(theme.radius).toBeDefined()
    expect(theme.shadow).toBeDefined()
    expect(theme.font).toBeDefined()
    expect(theme.textTransform).toBeDefined()
    expect(theme.spacing).toBeDefined()
    expect(theme.typography).toBeDefined()
    expect(theme.state).toBeDefined()
  })

  it('getActiveTheme should return the same object as terminalTheme', () => {
    expect(getActiveTheme()).toBe(terminalTheme)
  })

  it('getActiveThemeClasses should return terminalClasses', () => {
    expect(getActiveThemeClasses()).toBe(terminalClasses)
  })

  it('themeClasses.terminal should equal terminalClasses', () => {
    expect(themeClasses.terminal).toBe(terminalClasses)
  })

  it('getActiveThemeUtils should return an object with all format functions', () => {
    const utils = getActiveThemeUtils()
    expect(typeof utils.formatButtonText).toBe('function')
    expect(typeof utils.formatLabelText).toBe('function')
    expect(typeof utils.formatCardHeader).toBe('function')
    expect(typeof utils.formatStatusText).toBe('function')
  })

  it('themeUtils.terminal should match getActiveThemeUtils', () => {
    expect(themeUtils.terminal).toEqual(getActiveThemeUtils())
  })

  it('all registered themes should have required SemanticTokens fields', () => {
    for (const name of THEME_NAMES) {
      const theme = themes[name]
      expect(theme.color, `${name}.color`).toBeDefined()
      expect(theme.color.bg, `${name}.color.bg`).toBeDefined()
      expect(theme.color.text, `${name}.color.text`).toBeDefined()
      expect(theme.color.border, `${name}.color.border`).toBeDefined()
      expect(theme.color.icon, `${name}.color.icon`).toBeDefined()
      expect(theme.radius, `${name}.radius`).toBeDefined()
      expect(theme.shadow, `${name}.shadow`).toBeDefined()
      expect(theme.font, `${name}.font`).toBeDefined()
      expect(theme.textTransform, `${name}.textTransform`).toBeDefined()
      expect(theme.spacing, `${name}.spacing`).toBeDefined()
      expect(theme.typography, `${name}.typography`).toBeDefined()
      expect(theme.state, `${name}.state`).toBeDefined()
    }
  })
})

// =============================================================================
// 3. CSS VARIABLE NAMES
// =============================================================================

describe('cssVariableNames', () => {
  it('should have color.bg entries matching ColorTokens.bg', () => {
    const bgKeys: (keyof ColorTokens['bg'])[] = [
      'base', 'surface', 'surfaceRaised', 'surfaceSunken', 'muted',
      'accent', 'accentMuted', 'accentHover',
      'danger', 'dangerMuted', 'success', 'successMuted',
      'warning', 'warningMuted', 'info', 'infoMuted',
    ]
    for (const key of bgKeys) {
      expect(cssVariableNames.color.bg[key], `color.bg.${key}`).toBeDefined()
      expect(cssVariableNames.color.bg[key]).toMatch(/^--/)
    }
  })

  it('should have color.text entries matching ColorTokens.text', () => {
    const textKeys: (keyof ColorTokens['text'])[] = [
      'primary', 'secondary', 'muted', 'disabled', 'inverse',
      'accent', 'accentHover', 'danger', 'dangerOnColor',
      'success', 'successOnColor', 'warning', 'warningOnColor',
      'info', 'infoOnColor',
    ]
    for (const key of textKeys) {
      expect(cssVariableNames.color.text[key], `color.text.${key}`).toBeDefined()
      expect(cssVariableNames.color.text[key]).toMatch(/^--/)
    }
  })

  it('should have color.border entries matching ColorTokens.border', () => {
    const borderKeys: (keyof ColorTokens['border'])[] = [
      'default', 'muted', 'strong', 'accent', 'danger', 'success', 'warning', 'focus',
    ]
    for (const key of borderKeys) {
      expect(cssVariableNames.color.border[key], `color.border.${key}`).toBeDefined()
      expect(cssVariableNames.color.border[key]).toMatch(/^--/)
    }
  })

  it('should have color.icon entries matching ColorTokens.icon', () => {
    const iconKeys: (keyof ColorTokens['icon'])[] = [
      'primary', 'secondary', 'muted', 'accent',
      'danger', 'success', 'warning', 'info',
    ]
    for (const key of iconKeys) {
      expect(cssVariableNames.color.icon[key], `color.icon.${key}`).toBeDefined()
      expect(cssVariableNames.color.icon[key]).toMatch(/^--/)
    }
  })

  it('should have radius entries matching RadiusTokens', () => {
    const radiusKeys: (keyof RadiusTokens)[] = [
      'button', 'input', 'card', 'modal', 'badge', 'avatar',
    ]
    for (const key of radiusKeys) {
      expect(cssVariableNames.radius[key], `radius.${key}`).toBeDefined()
      expect(cssVariableNames.radius[key]).toMatch(/^--/)
    }
  })

  it('should have shadow entries matching ShadowTokens', () => {
    const shadowKeys: (keyof ShadowTokens)[] = [
      'card', 'dropdown', 'modal', 'button',
    ]
    for (const key of shadowKeys) {
      expect(cssVariableNames.shadow[key], `shadow.${key}`).toBeDefined()
      expect(cssVariableNames.shadow[key]).toMatch(/^--/)
    }
  })

  it('should have font entries matching FontTokens', () => {
    const fontKeys: (keyof FontTokens)[] = ['body', 'heading', 'code', 'ui']
    for (const key of fontKeys) {
      expect(cssVariableNames.font[key], `font.${key}`).toBeDefined()
      expect(cssVariableNames.font[key]).toMatch(/^--/)
    }
  })

  it('should have typography entries for all heading levels', () => {
    const headings = ['display', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const
    for (const h of headings) {
      const entry = cssVariableNames.typography[h] as Record<string, string>
      expect(entry.fontSize, `typography.${h}.fontSize`).toMatch(/^--/)
      expect(entry.fontWeight, `typography.${h}.fontWeight`).toMatch(/^--/)
      expect(entry.lineHeight, `typography.${h}.lineHeight`).toMatch(/^--/)
      expect(entry.letterSpacing, `typography.${h}.letterSpacing`).toMatch(/^--/)
    }
  })

  it('should have typography entries for body, label, caption, and code', () => {
    // body (l, m, s)
    for (const size of ['l', 'm', 's'] as const) {
      const entry = cssVariableNames.typography.body[size]
      expect(entry.fontSize).toMatch(/^--/)
    }
    // label, caption
    expect(cssVariableNames.typography.label.fontSize).toMatch(/^--/)
    expect(cssVariableNames.typography.caption.fontSize).toMatch(/^--/)
    // code (m, s)
    for (const size of ['m', 's'] as const) {
      expect(cssVariableNames.typography.code[size].fontSize).toMatch(/^--/)
    }
  })

  it('should have state entries for hover, active, focus, disabled, completed, muted, subtle, secondary', () => {
    expect(cssVariableNames.state.hover.bgOpacity).toMatch(/^--/)
    expect(cssVariableNames.state.hover.borderOpacity).toMatch(/^--/)
    expect(cssVariableNames.state.hover.opacity).toMatch(/^--/)
    expect(cssVariableNames.state.active.bgOpacity).toMatch(/^--/)
    expect(cssVariableNames.state.active.borderOpacity).toMatch(/^--/)
    expect(cssVariableNames.state.focus.ringWidth).toMatch(/^--/)
    expect(cssVariableNames.state.focus.ringOffset).toMatch(/^--/)
    expect(cssVariableNames.state.disabled.opacity).toMatch(/^--/)
    expect(cssVariableNames.state.completed.opacity).toMatch(/^--/)
    expect(cssVariableNames.state.muted.opacity).toMatch(/^--/)
    expect(cssVariableNames.state.subtle.opacity).toMatch(/^--/)
    expect(cssVariableNames.state.secondary.opacity).toMatch(/^--/)
  })

  it('all CSS variable names should start with "--"', () => {
    // Recursively collect all leaf string values
    function collectLeaves(obj: Record<string, unknown>, path = ''): string[] {
      const results: string[] = []
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key
        if (typeof value === 'string') {
          results.push(currentPath)
          expect(value, currentPath).toMatch(/^--/)
        } else if (typeof value === 'object' && value !== null) {
          results.push(...collectLeaves(value as Record<string, unknown>, currentPath))
        }
      }
      return results
    }
    const leaves = collectLeaves(cssVariableNames as unknown as Record<string, unknown>)
    // Sanity check: we should have a decent number of CSS variables
    expect(leaves.length).toBeGreaterThan(50)
  })
})

// =============================================================================
// 4. TERMINAL THEME
// =============================================================================

describe('terminal theme', () => {
  it('should implement all SemanticTokens color.bg fields', () => {
    const bg = terminalTheme.color.bg
    expect(bg.base).toBeTruthy()
    expect(bg.surface).toBeTruthy()
    expect(bg.surfaceRaised).toBeTruthy()
    expect(bg.surfaceSunken).toBeTruthy()
    expect(bg.muted).toBeTruthy()
    expect(bg.accent).toBeTruthy()
    expect(bg.accentMuted).toBeTruthy()
    expect(bg.accentHover).toBeTruthy()
    expect(bg.danger).toBeTruthy()
    expect(bg.dangerMuted).toBeTruthy()
    expect(bg.success).toBeTruthy()
    expect(bg.successMuted).toBeTruthy()
    expect(bg.warning).toBeTruthy()
    expect(bg.warningMuted).toBeTruthy()
    expect(bg.info).toBeTruthy()
    expect(bg.infoMuted).toBeTruthy()
  })

  it('should implement all SemanticTokens color.text fields', () => {
    const text = terminalTheme.color.text
    expect(text.primary).toBeTruthy()
    expect(text.secondary).toBeTruthy()
    expect(text.muted).toBeTruthy()
    expect(text.disabled).toBeTruthy()
    expect(text.inverse).toBeTruthy()
    expect(text.accent).toBeTruthy()
    expect(text.accentHover).toBeTruthy()
    expect(text.danger).toBeTruthy()
    expect(text.dangerOnColor).toBeTruthy()
    expect(text.success).toBeTruthy()
    expect(text.successOnColor).toBeTruthy()
    expect(text.warning).toBeTruthy()
    expect(text.warningOnColor).toBeTruthy()
    expect(text.info).toBeTruthy()
    expect(text.infoOnColor).toBeTruthy()
  })

  it('should implement all SemanticTokens color.border fields', () => {
    const border = terminalTheme.color.border
    expect(border.default).toBeTruthy()
    expect(border.muted).toBeTruthy()
    expect(border.strong).toBeTruthy()
    expect(border.accent).toBeTruthy()
    expect(border.danger).toBeTruthy()
    expect(border.success).toBeTruthy()
    expect(border.warning).toBeTruthy()
    expect(border.focus).toBeTruthy()
  })

  it('should implement all SemanticTokens color.icon fields', () => {
    const icon = terminalTheme.color.icon
    expect(icon.primary).toBeTruthy()
    expect(icon.secondary).toBeTruthy()
    expect(icon.muted).toBeTruthy()
    expect(icon.accent).toBeTruthy()
    expect(icon.danger).toBeTruthy()
    expect(icon.success).toBeTruthy()
    expect(icon.warning).toBeTruthy()
    expect(icon.info).toBeTruthy()
  })

  it('should implement all RadiusTokens fields', () => {
    const r = terminalTheme.radius
    expect(r.button).toBeDefined()
    expect(r.input).toBeDefined()
    expect(r.card).toBeDefined()
    expect(r.modal).toBeDefined()
    expect(r.badge).toBeDefined()
    expect(r.avatar).toBeDefined()
  })

  it('should use primitives.radius.none for terminal sharp corners', () => {
    expect(terminalTheme.radius.button).toBe('0')
    expect(terminalTheme.radius.input).toBe('0')
    expect(terminalTheme.radius.card).toBe('0')
    expect(terminalTheme.radius.modal).toBe('0')
    expect(terminalTheme.radius.avatar).toBe('0')
  })

  it('should implement all ShadowTokens fields', () => {
    const s = terminalTheme.shadow
    expect(s.card).toBeDefined()
    expect(s.dropdown).toBeDefined()
    expect(s.modal).toBeDefined()
    expect(s.button).toBeDefined()
  })

  it('should implement all FontTokens fields with mono fonts', () => {
    const f = terminalTheme.font
    expect(f.body).toContain('monospace')
    expect(f.heading).toContain('monospace')
    expect(f.code).toContain('monospace')
    expect(f.ui).toContain('monospace')
  })

  it('should use uppercase text transforms', () => {
    expect(terminalTheme.textTransform.button).toBe('uppercase')
    expect(terminalTheme.textTransform.label).toBe('uppercase')
    expect(terminalTheme.textTransform.heading).toBe('uppercase')
  })

  it('should implement SpacingTokens with component, section, and page', () => {
    expect(terminalTheme.spacing.component.paddingXs).toBeTruthy()
    expect(terminalTheme.spacing.component.paddingSm).toBeTruthy()
    expect(terminalTheme.spacing.component.paddingMd).toBeTruthy()
    expect(terminalTheme.spacing.component.paddingLg).toBeTruthy()
    expect(terminalTheme.spacing.component.paddingXl).toBeTruthy()
    expect(terminalTheme.spacing.component.gapXs).toBeTruthy()
    expect(terminalTheme.spacing.component.gapSm).toBeTruthy()
    expect(terminalTheme.spacing.component.gapMd).toBeTruthy()
    expect(terminalTheme.spacing.component.gapLg).toBeTruthy()
    expect(terminalTheme.spacing.section.sm).toBeTruthy()
    expect(terminalTheme.spacing.section.md).toBeTruthy()
    expect(terminalTheme.spacing.section.lg).toBeTruthy()
    expect(terminalTheme.spacing.section.xl).toBeTruthy()
    expect(terminalTheme.spacing.page.padding).toBeTruthy()
  })

  it('should implement TypographyTokens with all heading levels', () => {
    const headings = ['display', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const
    for (const h of headings) {
      const entry = terminalTheme.typography[h]
      expect(entry.fontSize, `${h}.fontSize`).toBeTruthy()
      expect(entry.fontWeight, `${h}.fontWeight`).toBeTruthy()
      expect(entry.lineHeight, `${h}.lineHeight`).toBeTruthy()
      expect(entry.letterSpacing, `${h}.letterSpacing`).toBeDefined()
    }
  })

  it('should implement TypographyTokens body (l, m, s)', () => {
    for (const size of ['l', 'm', 's'] as const) {
      const entry = terminalTheme.typography.body[size]
      expect(entry.fontSize).toBeTruthy()
      expect(entry.fontWeight).toBeTruthy()
      expect(entry.lineHeight).toBeTruthy()
      expect(entry.letterSpacing).toBeDefined()
    }
  })

  it('should implement TypographyTokens label and caption', () => {
    expect(terminalTheme.typography.label.fontSize).toBeTruthy()
    expect(terminalTheme.typography.caption.fontSize).toBeTruthy()
  })

  it('should implement TypographyTokens code (m, s)', () => {
    for (const size of ['m', 's'] as const) {
      const entry = terminalTheme.typography.code[size]
      expect(entry.fontSize).toBeTruthy()
    }
  })

  it('should implement all StateTokens', () => {
    expect(terminalTheme.state.hover.bgOpacity).toBeTruthy()
    expect(terminalTheme.state.hover.borderOpacity).toBeTruthy()
    expect(terminalTheme.state.hover.opacity).toBeTruthy()
    expect(terminalTheme.state.active.bgOpacity).toBeTruthy()
    expect(terminalTheme.state.active.borderOpacity).toBeTruthy()
    expect(terminalTheme.state.focus.ringWidth).toBeTruthy()
    expect(terminalTheme.state.focus.ringOffset).toBeTruthy()
    expect(terminalTheme.state.disabled.opacity).toBeTruthy()
    expect(terminalTheme.state.completed.opacity).toBeTruthy()
    expect(terminalTheme.state.muted.opacity).toBeTruthy()
    expect(terminalTheme.state.subtle.opacity).toBeTruthy()
    expect(terminalTheme.state.secondary.opacity).toBeTruthy()
  })
})

// =============================================================================
// 5. TERMINAL THEME UTILITY FUNCTIONS
// =============================================================================

describe('terminal theme utility functions', () => {
  describe('formatButtonText', () => {
    it('should prepend "> " and uppercase', () => {
      expect(formatButtonText('Save Changes')).toBe('> SAVE CHANGES')
    })

    it('should handle already-uppercase text', () => {
      expect(formatButtonText('SUBMIT')).toBe('> SUBMIT')
    })

    it('should handle empty string', () => {
      expect(formatButtonText('')).toBe('> ')
    })
  })

  describe('formatLabelText', () => {
    it('should wrap in brackets and uppercase with colon', () => {
      expect(formatLabelText('Email')).toBe('[EMAIL]:')
    })

    it('should handle multi-word label', () => {
      expect(formatLabelText('first name')).toBe('[FIRST NAME]:')
    })
  })

  describe('formatCardHeader', () => {
    it('should wrap title in brackets and uppercase', () => {
      expect(formatCardHeader('Settings')).toBe('[ SETTINGS ]')
    })

    it('should include hex code when provided', () => {
      expect(formatCardHeader('Settings', '00')).toBe('[ [0x00] SETTINGS ]')
    })

    it('should handle empty title', () => {
      expect(formatCardHeader('')).toBe('[  ]')
    })
  })

  describe('formatStatusText', () => {
    it('should wrap in brackets and uppercase', () => {
      expect(formatStatusText('Active')).toBe('[ACTIVE]')
    })

    it('should handle lowercase input', () => {
      expect(formatStatusText('pending')).toBe('[PENDING]')
    })
  })

  describe('terminalClasses', () => {
    it('should have all expected class keys', () => {
      expect(terminalClasses.radius).toBeTruthy()
      expect(terminalClasses.font).toBeTruthy()
      expect(terminalClasses.text).toBeTruthy()
      expect(terminalClasses.cardHeader).toBeTruthy()
      expect(terminalClasses.label).toBeTruthy()
      expect(terminalClasses.button).toBeTruthy()
      expect(terminalClasses.input).toBeTruthy()
      expect(terminalClasses.card).toBeTruthy()
      expect(terminalClasses.badge).toBeTruthy()
    })

    it('radius should be "rounded-dynamic"', () => {
      expect(terminalClasses.radius).toBe('rounded-dynamic')
    })

    it('text should be "uppercase"', () => {
      expect(terminalClasses.text).toBe('uppercase')
    })
  })
})

// =============================================================================
// 6. BACKWARDS COMPATIBILITY ALIASES
// =============================================================================

describe('backwards compatibility aliases', () => {
  it('formatLabel should be same reference as formatLabelText', () => {
    expect(formatLabel).toBe(formatLabelText)
  })

  it('formatCardTitle should be same reference as formatCardHeader', () => {
    expect(formatCardTitle).toBe(formatCardHeader)
  })

  it('isSharpMode should return true (terminal is always sharp)', () => {
    expect(isSharpMode()).toBe(true)
  })

  it('hasRoundedCorners should return false', () => {
    expect(hasRoundedCorners()).toBe(false)
  })
})

// =============================================================================
// 7. HASHMARK PRESET
// =============================================================================

describe('hashmark preset', () => {
  describe('hashmarkVariables', () => {
    it('should have all required base CSS variable keys', () => {
      const requiredKeys = [
        '--background', '--foreground',
        '--card', '--card-foreground',
        '--popover', '--popover-foreground',
        '--primary', '--primary-foreground',
        '--secondary', '--secondary-foreground',
        '--muted', '--muted-foreground',
        '--accent', '--accent-foreground',
        '--destructive', '--destructive-foreground',
        '--border', '--input', '--ring', '--radius',
      ]
      for (const key of requiredKeys) {
        expect(hashmarkVariables).toHaveProperty(key)
        expect((hashmarkVariables as Record<string, string>)[key], key).toBeTruthy()
      }
    })

    it('should have status color CSS variables', () => {
      const statusKeys = [
        '--success', '--success-foreground',
        '--warning', '--warning-foreground',
        '--info', '--info-foreground',
      ]
      for (const key of statusKeys) {
        expect(hashmarkVariables).toHaveProperty(key)
      }
    })

    it('should have chart color CSS variables (chart-1 through chart-5)', () => {
      for (let i = 1; i <= 5; i++) {
        expect(hashmarkVariables).toHaveProperty(`--chart-${i}`)
      }
    })

    it('should use emerald as primary/accent color (#10b981)', () => {
      expect(hashmarkVariables['--primary']).toBe('#10b981')
      expect(hashmarkVariables['--accent']).toBe('#10b981')
      expect(hashmarkVariables['--ring']).toBe('#10b981')
    })

    it('should use sharp corners (--radius 0rem)', () => {
      expect(hashmarkVariables['--radius']).toBe('0rem')
    })

    it('should use zinc dark background (#09090b)', () => {
      expect(hashmarkVariables['--background']).toBe('#09090b')
    })
  })

  describe('generateHashmarkCss', () => {
    it('should return a non-empty string for v3 format', () => {
      const css = generateHashmarkCss('v3')
      expect(typeof css).toBe('string')
      expect(css.length).toBeGreaterThan(0)
    })

    it('should return a non-empty string for v4 format', () => {
      const css = generateHashmarkCss('v4')
      expect(typeof css).toBe('string')
      expect(css.length).toBeGreaterThan(0)
    })

    it('v4 should default when no argument is passed', () => {
      const cssDefault = generateHashmarkCss()
      const cssV4 = generateHashmarkCss('v4')
      expect(cssDefault).toBe(cssV4)
    })

    it('v3 format should contain @tailwind directives and @layer base', () => {
      const css = generateHashmarkCss('v3')
      expect(css).toContain('@tailwind base')
      expect(css).toContain('@tailwind components')
      expect(css).toContain('@tailwind utilities')
      expect(css).toContain('@layer base')
    })

    it('v4 format should contain @import "tailwindcss" and @theme inline', () => {
      const css = generateHashmarkCss('v4')
      expect(css).toContain('@import "tailwindcss"')
      expect(css).toContain('@theme inline')
    })

    it('v4 format should include :root block with all variables', () => {
      const css = generateHashmarkCss('v4')
      expect(css).toContain(':root')
      expect(css).toContain('--background')
      expect(css).toContain('--primary')
      expect(css).toContain('--accent')
      expect(css).toContain('--radius')
    })

    it('v4 format should include --color-* theme mappings', () => {
      const css = generateHashmarkCss('v4')
      expect(css).toContain('--color-background')
      expect(css).toContain('--color-primary')
      expect(css).toContain('--color-accent')
      expect(css).toContain('--color-destructive')
      expect(css).toContain('--color-success')
      expect(css).toContain('--color-warning')
      expect(css).toContain('--color-info')
    })

    it('v4 format should include body styles with monospace font', () => {
      const css = generateHashmarkCss('v4')
      expect(css).toContain('body')
      expect(css).toContain('monospace')
    })

    it('v3 format should include body with monospace font', () => {
      const css = generateHashmarkCss('v3')
      expect(css).toContain('body')
      expect(css).toContain('monospace')
    })

    it('v4 format should include selection styles', () => {
      const css = generateHashmarkCss('v4')
      expect(css).toContain('::selection')
    })

    it('generated CSS should contain all variable values from hashmarkVariables', () => {
      const css = generateHashmarkCss('v4')
      for (const [key, value] of Object.entries(hashmarkVariables)) {
        expect(css, `Should contain ${key}: ${value}`).toContain(key)
        expect(css, `Should contain value ${value}`).toContain(value)
      }
    })
  })
})

// =============================================================================
// 8. PRIMITIVES
// =============================================================================

describe('primitives', () => {
  it('should bundle all sub-modules', () => {
    expect(primitives.colors).toBe(colors)
    expect(primitives.space).toBe(space)
    expect(primitives.fontFamily).toBe(fontFamily)
    expect(primitives.fontSize).toBe(fontSize)
    expect(primitives.fontWeight).toBe(fontWeight)
    expect(primitives.lineHeight).toBe(lineHeight)
    expect(primitives.letterSpacing).toBe(letterSpacing)
    expect(primitives.radius).toBe(radius)
    expect(primitives.shadow).toBe(shadow)
    expect(primitives.duration).toBe(duration)
    expect(primitives.easing).toBe(easing)
    expect(primitives.breakpoint).toBe(breakpoint)
    expect(primitives.container).toBe(container)
    expect(primitives.zIndex).toBe(zIndex)
    expect(primitives.borderWidth).toBe(borderWidth)
    expect(primitives.accessibility).toBe(accessibility)
  })

  it('colors should have gray, primary, red, green, amber, blue palettes', () => {
    expect(colors.gray).toBeDefined()
    expect(colors.primary).toBeDefined()
    expect(colors.red).toBeDefined()
    expect(colors.green).toBeDefined()
    expect(colors.amber).toBeDefined()
    expect(colors.blue).toBeDefined()
    expect(colors.white).toBe('#ffffff')
    expect(colors.black).toBe('#000000')
  })

  it('each color palette should have 50 through 950 steps', () => {
    const palettes = [colors.gray, colors.primary, colors.red, colors.green, colors.amber, colors.blue]
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
    for (const palette of palettes) {
      for (const step of steps) {
        expect((palette as Record<number, string>)[step]).toBeTruthy()
      }
    }
  })

  it('space should have 8-point grid values', () => {
    expect(space[0]).toBe('0')
    expect(space[1]).toBe('0.25rem')
    expect(space[2]).toBe('0.5rem')
    expect(space[4]).toBe('1rem')
    expect(space[8]).toBe('2rem')
  })

  it('fontFamily should have sans, mono, display', () => {
    expect(fontFamily.sans).toContain('sans-serif')
    expect(fontFamily.mono).toContain('monospace')
    expect(fontFamily.display).toContain('sans-serif')
  })

  it('radius should have none through full', () => {
    expect(radius.none).toBe('0')
    expect(radius.full).toBe('9999px')
    expect(radius.sm).toBeTruthy()
    expect(radius.md).toBeTruthy()
    expect(radius.lg).toBeTruthy()
  })

  it('shadow should have none through 2xl and inner', () => {
    expect(shadow.none).toBe('none')
    expect(shadow.sm).toBeTruthy()
    expect(shadow.md).toBeTruthy()
    expect(shadow.lg).toBeTruthy()
    expect(shadow.xl).toBeTruthy()
    expect(shadow['2xl']).toBeTruthy()
    expect(shadow.inner).toBeTruthy()
  })

  it('zIndex should have behind through max', () => {
    expect(zIndex.behind).toBe(-1)
    expect(zIndex.base).toBe(0)
    expect(zIndex.max).toBe(9999)
    expect(zIndex.modal).toBeGreaterThan(zIndex.overlay)
  })

  it('accessibility should define touch targets and focus ring', () => {
    expect(accessibility.touchTarget.min).toBe('44px')
    expect(accessibility.focusRing.width).toBe('2px')
    expect(accessibility.focusRing.offset).toBe('2px')
  })
})

// =============================================================================
// 9. CHART COLORS
// =============================================================================

describe('chart colors', () => {
  it('CHART_FALLBACK_COLORS should have 9 entries', () => {
    expect(CHART_FALLBACK_COLORS).toHaveLength(9)
  })

  it('all fallback colors should be hex strings', () => {
    for (const color of CHART_FALLBACK_COLORS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('getChartColors should return fallback array in Node (no window)', () => {
    const result = getChartColors()
    expect(result).toHaveLength(9)
    // In node environment, should return fallbacks
    expect(result[0]).toBe(CHART_FALLBACK_COLORS[0])
  })

  it('getChartColor should return a color by index', () => {
    const color = getChartColor(0)
    expect(color).toBe(CHART_FALLBACK_COLORS[0])
  })

  it('getChartColor should wrap around on out-of-range index', () => {
    const color = getChartColor(9)
    expect(color).toBe(CHART_FALLBACK_COLORS[0])
  })

  it('getChartColorVars should return 9 oklch() CSS variable references', () => {
    const vars = getChartColorVars()
    expect(vars).toHaveLength(9)
    for (const v of vars) {
      expect(v).toMatch(/^oklch\(var\(--chart-\d+\)\)$/)
    }
  })
})

// =============================================================================
// 10. PACKAGE EXPORTS
// =============================================================================

describe('package exports', () => {
  it('should export mode object', () => {
    expect(mode).toBeDefined()
  })

  it('should export theme system', () => {
    expect(themes).toBeDefined()
    expect(getActiveTheme).toBeDefined()
    expect(terminalTheme).toBeDefined()
    expect(terminalClasses).toBeDefined()
  })

  it('should export token definitions', () => {
    expect(cssVariableNames).toBeDefined()
    expect(primitives).toBeDefined()
  })

  it('should export preset system', () => {
    expect(hashmarkVariables).toBeDefined()
    expect(generateHashmarkCss).toBeDefined()
  })

  it('should export chart color utilities', () => {
    expect(CHART_FALLBACK_COLORS).toBeDefined()
    expect(getChartColors).toBeDefined()
    expect(getChartColor).toBeDefined()
    expect(getChartColorVars).toBeDefined()
  })

  it('should export formatting functions', () => {
    expect(formatButtonText).toBeDefined()
    expect(formatLabelText).toBeDefined()
    expect(formatCardHeader).toBeDefined()
    expect(formatStatusText).toBeDefined()
    expect(formatLabel).toBeDefined()
    expect(formatCardTitle).toBeDefined()
  })

  it('should export helper functions', () => {
    expect(isSharpMode).toBeDefined()
    expect(hasRoundedCorners).toBeDefined()
  })
})
