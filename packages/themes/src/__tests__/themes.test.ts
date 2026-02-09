import { describe, it, expect } from 'vitest'
import {
  // Theme provider (only types/React components — tested via existence)
  // Mode object
  mode,
  // Themes
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
  // Tokens
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
} from '../index'

// =============================================================================
// MODE OBJECT
// =============================================================================

describe('mode', () => {
  it('should be defined with core shape properties', () => {
    expect(mode).toBeDefined()
    expect(mode.radius).toBe('rounded-dynamic')
    expect(mode.font).toBe('font-body')
    expect(mode.shadow).toBe('shadow-sm')
    expect(mode.buttonPrefix).toBe('> ')
    expect(mode.labelFormat).toBe('brackets')
    expect(mode.cardHeader).toBe('bracketed')
    expect(mode.textTransform).toBe('uppercase')
    expect(mode.borderWidth).toBe('border')
  })

  it('should have inputStyle from terminalClasses', () => {
    expect(mode.inputStyle).toBe(terminalClasses.input)
  })

  it('should have color tokens', () => {
    expect(mode.color).toBeDefined()
    expect(mode.color.bg.base).toBe('bg-background')
    expect(mode.color.bg.surface).toBe('bg-card')
    expect(mode.color.bg.accent).toBe('bg-accent')
    expect(mode.color.bg.danger).toBe('bg-destructive')
    expect(mode.color.bg.success).toBe('bg-success')
    expect(mode.color.bg.warning).toBe('bg-warning')
    expect(mode.color.bg.info).toBe('bg-info')
    expect(mode.color.bg.muted).toBe('bg-muted')
    expect(mode.color.bg.secondary).toBe('bg-secondary')
  })

  it('should have text color tokens', () => {
    expect(mode.color.text.primary).toBe('text-foreground')
    expect(mode.color.text.secondary).toBe('text-card-foreground')
    expect(mode.color.text.muted).toBe('text-muted-foreground')
    expect(mode.color.text.inverse).toBe('text-accent-foreground')
    expect(mode.color.text.accent).toBe('text-accent')
    expect(mode.color.text.danger).toBe('text-destructive')
    expect(mode.color.text.success).toBe('text-success')
    expect(mode.color.text.warning).toBe('text-warning')
    expect(mode.color.text.info).toBe('text-info')
  })

  it('should have border color tokens', () => {
    expect(mode.color.border.default).toBe('border-border')
    expect(mode.color.border.focus).toBe('border-ring')
    expect(mode.color.border.accent).toBe('border-primary')
    expect(mode.color.border.danger).toBe('border-destructive')
    expect(mode.color.border.success).toBe('border-success')
    expect(mode.color.border.warning).toBe('border-warning')
  })

  it('should have icon color tokens', () => {
    expect(mode.color.icon.primary).toBe('text-foreground')
    expect(mode.color.icon.muted).toBe('text-muted-foreground')
    expect(mode.color.icon.accent).toBe('text-accent')
    expect(mode.color.icon.danger).toBe('text-destructive')
    expect(mode.color.icon.success).toBe('text-success')
  })

  it('should have spacing tokens', () => {
    expect(mode.spacing.button.sm).toBe('px-2 py-1')
    expect(mode.spacing.button.md).toBe('px-4 py-2')
    expect(mode.spacing.button.lg).toBe('px-6 py-4')
    expect(mode.spacing.input).toBe('px-4 py-2')
    expect(mode.spacing.card).toBe('p-4')
    expect(mode.spacing.badge.sm).toBe('px-2 py-0.5')
    expect(mode.spacing.badge.md).toBe('px-2 py-1')
  })

  it('should have typography tokens', () => {
    expect(mode.typography.display.xl).toBe('text-display-xl')
    expect(mode.typography.headline.l).toBe('text-headline-l')
    expect(mode.typography.title.l).toBe('text-title-l')
    expect(mode.typography.body.l).toBe('text-body-l')
    expect(mode.typography.body.m).toBe('text-body-m')
    expect(mode.typography.body.s).toBe('text-body-s')
    expect(mode.typography.label.l).toBe('text-label-l')
    expect(mode.typography.code.l).toBe('text-code-l')
  })

  it('should have legacy typography aliases', () => {
    expect(mode.typography.button).toContain('text-label-m')
    expect(mode.typography.caption).toContain('text-caption')
    expect(mode.typography.micro).toBe('text-2xs')
    expect(mode.typography.caps).toContain('uppercase')
    expect(mode.typography.input).toBe('text-body-m')
  })

  it('should have sizing tokens', () => {
    expect(mode.sizing.panel).toBe('h-panel')
    expect(mode.sizing.panelSm).toBe('h-panel-sm')
    expect(mode.sizing.sidebar).toBe('w-sidebar')
    expect(mode.sizing.auth).toBe('max-w-auth')
    expect(mode.sizing.touch).toContain('min-h-touch')
  })

  it('should have zIndex tokens', () => {
    expect(mode.zIndex.banner).toBe('z-banner')
    expect(mode.zIndex.modal).toBe('z-modal')
  })

  it('should have state tokens', () => {
    expect(mode.state.hover.bg).toContain('hover:')
    expect(mode.state.hover.card).toContain('hover:')
    expect(mode.state.focus.ring).toContain('focus-visible:ring')
    expect(mode.state.disabled.opacity).toBe('disabled:opacity-50')
    expect(mode.state.disabled.cursor).toBe('disabled:cursor-not-allowed')
    expect(mode.state.completed.opacity).toBe('opacity-60')
    expect(mode.state.muted.opacity).toBe('opacity-50')
    expect(mode.state.subtle.opacity).toBe('opacity-40')
    expect(mode.state.secondary.opacity).toBe('opacity-70')
  })
})

// =============================================================================
// THEME CONSTANTS
// =============================================================================

describe('theme constants', () => {
  it('THEME_NAMES should contain terminal', () => {
    expect(THEME_NAMES).toContain('terminal')
    expect(THEME_NAMES).toHaveLength(1)
  })

  it('DEFAULT_THEME should be terminal', () => {
    expect(DEFAULT_THEME).toBe('terminal')
  })

  it('CURRENT_THEME should be terminal', () => {
    expect(CURRENT_THEME).toBe('terminal')
  })
})

// =============================================================================
// THEME REGISTRY
// =============================================================================

describe('themes', () => {
  it('should have terminal theme', () => {
    expect(themes.terminal).toBeDefined()
    expect(themes.terminal).toBe(terminalTheme)
  })

  it('terminal theme should have correct structure', () => {
    const theme = themes.terminal
    expect(theme.color).toBeDefined()
    expect(theme.radius).toBeDefined()
    expect(theme.shadow).toBeDefined()
    expect(theme.font).toBeDefined()
    expect(theme.textTransform).toBeDefined()
    expect(theme.spacing).toBeDefined()
    expect(theme.typography).toBeDefined()
    expect(theme.state).toBeDefined()
  })

  it('terminal theme should use mono font', () => {
    expect(terminalTheme.font.body).toContain('monospace')
    expect(terminalTheme.font.heading).toContain('monospace')
    expect(terminalTheme.font.code).toContain('monospace')
    expect(terminalTheme.font.ui).toContain('monospace')
  })

  it('terminal theme should have uppercase text transforms', () => {
    expect(terminalTheme.textTransform.button).toBe('uppercase')
    expect(terminalTheme.textTransform.label).toBe('uppercase')
    expect(terminalTheme.textTransform.heading).toBe('uppercase')
  })

  it('terminal theme should have no radius (sharp corners)', () => {
    expect(terminalTheme.radius.button).toBe('0')
    expect(terminalTheme.radius.input).toBe('0')
    expect(terminalTheme.radius.card).toBe('0')
    expect(terminalTheme.radius.modal).toBe('0')
    expect(terminalTheme.radius.avatar).toBe('0')
  })

  it('terminal theme should have no card shadow', () => {
    expect(terminalTheme.shadow.card).toBe('none')
    expect(terminalTheme.shadow.button).toBe('none')
  })

  it('terminal theme should have proper state tokens', () => {
    expect(terminalTheme.state.disabled.opacity).toBe('0.38')
    expect(terminalTheme.state.completed.opacity).toBe('0.60')
    expect(terminalTheme.state.muted.opacity).toBe('0.50')
    expect(terminalTheme.state.subtle.opacity).toBe('0.40')
    expect(terminalTheme.state.secondary.opacity).toBe('0.70')
  })
})

describe('themeClasses', () => {
  it('should have terminal classes', () => {
    expect(themeClasses.terminal).toBeDefined()
    expect(themeClasses.terminal).toBe(terminalClasses)
  })
})

describe('terminalClasses', () => {
  it('should have all expected class names', () => {
    expect(terminalClasses.radius).toBe('rounded-dynamic')
    expect(terminalClasses.font).toBe('font-body')
    expect(terminalClasses.text).toBe('uppercase')
    expect(terminalClasses.button).toContain('rounded-dynamic')
    expect(terminalClasses.button).toContain('uppercase')
    expect(terminalClasses.input).toContain('rounded-dynamic')
    expect(terminalClasses.card).toContain('border')
    expect(terminalClasses.badge).toContain('uppercase')
  })
})

// =============================================================================
// THEME ACCESS FUNCTIONS
// =============================================================================

describe('getActiveTheme', () => {
  it('should return the terminal theme', () => {
    const active = getActiveTheme()
    expect(active).toBe(terminalTheme)
  })
})

describe('getActiveThemeClasses', () => {
  it('should return the terminal classes', () => {
    const classes = getActiveThemeClasses()
    expect(classes).toBe(terminalClasses)
  })
})

describe('getActiveThemeUtils', () => {
  it('should return theme utilities object', () => {
    const utils = getActiveThemeUtils()
    expect(utils).toBeDefined()
    expect(typeof utils.formatButtonText).toBe('function')
    expect(typeof utils.formatLabelText).toBe('function')
    expect(typeof utils.formatCardHeader).toBe('function')
    expect(typeof utils.formatStatusText).toBe('function')
  })

  it('should match themeUtils.terminal', () => {
    expect(getActiveThemeUtils()).toBe(themeUtils.terminal)
  })
})

describe('themeUtils', () => {
  it('should have terminal utils', () => {
    expect(themeUtils.terminal).toBeDefined()
    expect(themeUtils.terminal.formatButtonText).toBe(formatButtonText)
    expect(themeUtils.terminal.formatLabelText).toBe(formatLabelText)
    expect(themeUtils.terminal.formatCardHeader).toBe(formatCardHeader)
  })
})

// =============================================================================
// TEXT FORMATTING FUNCTIONS
// =============================================================================

describe('formatButtonText', () => {
  it('should prefix with > and uppercase', () => {
    expect(formatButtonText('Save')).toBe('> SAVE')
    expect(formatButtonText('save changes')).toBe('> SAVE CHANGES')
  })

  it('should handle already uppercase text', () => {
    expect(formatButtonText('SUBMIT')).toBe('> SUBMIT')
  })

  it('should handle empty string', () => {
    expect(formatButtonText('')).toBe('> ')
  })
})

describe('formatLabelText', () => {
  it('should wrap in brackets and uppercase', () => {
    expect(formatLabelText('Email')).toBe('[EMAIL]:')
    expect(formatLabelText('full name')).toBe('[FULL NAME]:')
  })

  it('should handle already uppercase text', () => {
    expect(formatLabelText('STATUS')).toBe('[STATUS]:')
  })

  it('should handle empty string', () => {
    expect(formatLabelText('')).toBe('[]:')
  })
})

describe('formatCardHeader', () => {
  it('should wrap title in brackets and uppercase', () => {
    expect(formatCardHeader('Settings')).toBe('[ SETTINGS ]')
  })

  it('should include hex code when provided', () => {
    expect(formatCardHeader('Settings', '00')).toBe('[ [0x00] SETTINGS ]')
    expect(formatCardHeader('Dashboard', 'FF')).toBe('[ [0xFF] DASHBOARD ]')
  })

  it('should handle empty title', () => {
    expect(formatCardHeader('')).toBe('[  ]')
  })

  it('should handle empty code', () => {
    expect(formatCardHeader('Settings', '')).toBe('[ SETTINGS ]')
  })
})

// =============================================================================
// BACKWARDS COMPATIBILITY ALIASES
// =============================================================================

describe('formatLabel (alias)', () => {
  it('should be the same function as formatLabelText', () => {
    expect(formatLabel).toBe(formatLabelText)
  })

  it('should produce the same output', () => {
    expect(formatLabel('Email')).toBe(formatLabelText('Email'))
  })
})

describe('formatCardTitle (alias)', () => {
  it('should be the same function as formatCardHeader', () => {
    expect(formatCardTitle).toBe(formatCardHeader)
  })

  it('should produce the same output', () => {
    expect(formatCardTitle('Settings')).toBe(formatCardHeader('Settings'))
    expect(formatCardTitle('Info', '01')).toBe(formatCardHeader('Info', '01'))
  })
})

describe('isSharpMode', () => {
  it('should return true (terminal is always sharp)', () => {
    expect(isSharpMode()).toBe(true)
  })
})

describe('hasRoundedCorners', () => {
  it('should return false (terminal never has rounded corners)', () => {
    expect(hasRoundedCorners()).toBe(false)
  })
})

// =============================================================================
// PRIMITIVES
// =============================================================================

describe('primitives', () => {
  it('should bundle all token collections', () => {
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
})

describe('colors', () => {
  it('should have white and black', () => {
    expect(colors.white).toBe('#ffffff')
    expect(colors.black).toBe('#000000')
  })

  it('should have gray scale (50-950)', () => {
    expect(colors.gray[50]).toBeDefined()
    expect(colors.gray[500]).toBeDefined()
    expect(colors.gray[950]).toBeDefined()
  })

  it('should have primary scale', () => {
    expect(colors.primary[50]).toBeDefined()
    expect(colors.primary[500]).toBeDefined()
    expect(colors.primary[950]).toBeDefined()
  })

  it('should have semantic color scales', () => {
    expect(colors.red[500]).toBeDefined()
    expect(colors.green[500]).toBeDefined()
    expect(colors.amber[500]).toBeDefined()
    expect(colors.blue[500]).toBeDefined()
  })

  it('should use oklch color format for scales', () => {
    expect(colors.gray[500]).toContain('oklch')
    expect(colors.primary[500]).toContain('oklch')
    expect(colors.red[500]).toContain('oklch')
    expect(colors.green[500]).toContain('oklch')
  })
})

describe('space', () => {
  it('should follow 8-point grid', () => {
    expect(space[0]).toBe('0')
    expect(space[1]).toBe('0.25rem')
    expect(space[2]).toBe('0.5rem')
    expect(space[4]).toBe('1rem')
    expect(space[8]).toBe('2rem')
    expect(space[16]).toBe('4rem')
  })

  it('should have px value', () => {
    expect(space.px).toBe('1px')
  })
})

describe('fontFamily', () => {
  it('should have sans, mono, and display families', () => {
    expect(fontFamily.sans).toContain('Inter')
    expect(fontFamily.mono).toContain('JetBrains Mono')
    expect(fontFamily.display).toContain('Inter')
  })
})

describe('fontSize', () => {
  it('should have size scale from 2xs to 9xl', () => {
    expect(fontSize['2xs']).toBe('0.625rem')
    expect(fontSize.xs).toBe('0.75rem')
    expect(fontSize.sm).toBe('0.875rem')
    expect(fontSize.base).toBe('1rem')
    expect(fontSize.lg).toBe('1.125rem')
    expect(fontSize['9xl']).toBe('5.5rem')
  })
})

describe('fontWeight', () => {
  it('should have standard weights', () => {
    expect(fontWeight.normal).toBe('400')
    expect(fontWeight.medium).toBe('500')
    expect(fontWeight.semibold).toBe('600')
    expect(fontWeight.bold).toBe('700')
  })
})

describe('lineHeight', () => {
  it('should have ratio-based values', () => {
    expect(lineHeight.none).toBe('1')
    expect(lineHeight.tight).toBe('1.25')
    expect(lineHeight.normal).toBe('1.5')
    expect(lineHeight.relaxed).toBe('1.625')
    expect(lineHeight.loose).toBe('2')
  })

  it('should have M3 fixed line-heights', () => {
    expect(lineHeight['16']).toBe('1rem')
    expect(lineHeight['20']).toBe('1.25rem')
    expect(lineHeight['24']).toBe('1.5rem')
    expect(lineHeight['96']).toBe('6rem')
  })
})

describe('letterSpacing', () => {
  it('should have spacing scale', () => {
    expect(letterSpacing.tighter).toBe('-0.05em')
    expect(letterSpacing.normal).toBe('0')
    expect(letterSpacing.widest).toBe('0.1em')
  })
})

describe('radius', () => {
  it('should have radius scale', () => {
    expect(radius.none).toBe('0')
    expect(radius.sm).toBe('0.125rem')
    expect(radius.md).toBe('0.375rem')
    expect(radius.full).toBe('9999px')
  })
})

describe('shadow', () => {
  it('should have shadow scale', () => {
    expect(shadow.none).toBe('none')
    expect(shadow.sm).toBeDefined()
    expect(shadow.md).toBeDefined()
    expect(shadow.lg).toBeDefined()
    expect(shadow.xl).toBeDefined()
    expect(shadow.inner).toContain('inset')
  })
})

describe('duration', () => {
  it('should have timing values', () => {
    expect(duration.instant).toBe('0ms')
    expect(duration.fast).toBe('100ms')
    expect(duration.normal).toBe('200ms')
    expect(duration.slow).toBe('300ms')
    expect(duration.slowest).toBe('1000ms')
  })
})

describe('easing', () => {
  it('should have easing curves', () => {
    expect(easing.linear).toBe('linear')
    expect(easing.in).toContain('cubic-bezier')
    expect(easing.out).toContain('cubic-bezier')
    expect(easing.inOut).toContain('cubic-bezier')
    expect(easing.bounce).toContain('cubic-bezier')
    expect(easing.spring).toContain('cubic-bezier')
  })
})

describe('breakpoint', () => {
  it('should have responsive breakpoints', () => {
    expect(breakpoint.xs).toBe('0px')
    expect(breakpoint.sm).toBe('480px')
    expect(breakpoint.md).toBe('640px')
    expect(breakpoint.lg).toBe('768px')
    expect(breakpoint.xl).toBe('1024px')
  })
})

describe('container', () => {
  it('should have container widths', () => {
    expect(container.xs).toBe('320px')
    expect(container.full).toBe('100%')
    expect(container.prose).toBe('65ch')
  })
})

describe('zIndex', () => {
  it('should have z-index scale', () => {
    expect(zIndex.behind).toBe(-1)
    expect(zIndex.base).toBe(0)
    expect(zIndex.modal).toBe(50)
    expect(zIndex.toast).toBe(70)
    expect(zIndex.tooltip).toBe(80)
    expect(zIndex.max).toBe(9999)
  })

  it('should have correct ordering', () => {
    expect(zIndex.behind).toBeLessThan(zIndex.base)
    expect(zIndex.base).toBeLessThan(zIndex.raised)
    expect(zIndex.raised).toBeLessThan(zIndex.dropdown)
    expect(zIndex.dropdown).toBeLessThan(zIndex.sticky)
    expect(zIndex.sticky).toBeLessThan(zIndex.overlay)
    expect(zIndex.overlay).toBeLessThan(zIndex.modal)
    expect(zIndex.modal).toBeLessThan(zIndex.popover)
    expect(zIndex.popover).toBeLessThan(zIndex.toast)
    expect(zIndex.toast).toBeLessThan(zIndex.tooltip)
  })
})

describe('borderWidth', () => {
  it('should have border width values', () => {
    expect(borderWidth.none).toBe('0')
    expect(borderWidth.default).toBe('1px')
    expect(borderWidth[2]).toBe('2px')
    expect(borderWidth[4]).toBe('4px')
  })
})

describe('accessibility', () => {
  it('should have WCAG touch targets', () => {
    expect(accessibility.touchTarget.min).toBe('44px')
    expect(accessibility.touchTarget.comfortable).toBe('48px')
  })

  it('should have focus ring settings', () => {
    expect(accessibility.focusRing.width).toBe('2px')
    expect(accessibility.focusRing.offset).toBe('2px')
  })
})

// =============================================================================
// CSS VARIABLE NAMES
// =============================================================================

describe('cssVariableNames', () => {
  it('should have color variable names', () => {
    expect(cssVariableNames.color.bg.base).toBe('--color-bg-base')
    expect(cssVariableNames.color.text.primary).toBe('--color-text-primary')
    expect(cssVariableNames.color.border.default).toBe('--color-border-default')
    expect(cssVariableNames.color.icon.primary).toBe('--color-icon-primary')
  })

  it('should have radius variable names', () => {
    expect(cssVariableNames.radius.button).toBe('--radius-button')
    expect(cssVariableNames.radius.card).toBe('--radius-card')
  })

  it('should have shadow variable names', () => {
    expect(cssVariableNames.shadow.card).toBe('--shadow-card')
    expect(cssVariableNames.shadow.modal).toBe('--shadow-modal')
  })

  it('should have font variable names', () => {
    expect(cssVariableNames.font.body).toBe('--font-body')
    expect(cssVariableNames.font.heading).toBe('--font-heading')
  })

  it('should have typography variable names', () => {
    expect(cssVariableNames.typography.display.fontSize).toBe('--typography-display-size')
    expect(cssVariableNames.typography.h1.fontSize).toBe('--typography-h1-size')
    expect(cssVariableNames.typography.body.m.fontSize).toBe('--typography-body-m-size')
    expect(cssVariableNames.typography.code.m.fontSize).toBe('--typography-code-m-size')
  })

  it('should have state variable names', () => {
    expect(cssVariableNames.state.hover.bgOpacity).toBe('--state-hover-bg-opacity')
    expect(cssVariableNames.state.disabled.opacity).toBe('--state-disabled-opacity')
    expect(cssVariableNames.state.focus.ringWidth).toBe('--state-focus-ring-width')
  })
})

// =============================================================================
// CHART COLORS
// =============================================================================

describe('CHART_FALLBACK_COLORS', () => {
  it('should have 9 fallback colors', () => {
    expect(CHART_FALLBACK_COLORS).toHaveLength(9)
  })

  it('should contain hex color values', () => {
    for (const color of CHART_FALLBACK_COLORS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

describe('getChartColors', () => {
  it('should return fallback colors in Node environment (no window)', () => {
    const colors = getChartColors()
    expect(colors).toHaveLength(9)
    expect(colors).toEqual([...CHART_FALLBACK_COLORS])
  })

  it('should return a new array (not the same reference)', () => {
    const a = getChartColors()
    const b = getChartColors()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})

describe('getChartColor', () => {
  it('should return color by index', () => {
    expect(getChartColor(0)).toBe(CHART_FALLBACK_COLORS[0])
    expect(getChartColor(1)).toBe(CHART_FALLBACK_COLORS[1])
    expect(getChartColor(8)).toBe(CHART_FALLBACK_COLORS[8])
  })

  it('should wrap around with modulo for out-of-range indices', () => {
    expect(getChartColor(9)).toBe(CHART_FALLBACK_COLORS[0])
    expect(getChartColor(10)).toBe(CHART_FALLBACK_COLORS[1])
    expect(getChartColor(18)).toBe(CHART_FALLBACK_COLORS[0])
  })
})

describe('getChartColorVars', () => {
  it('should return 9 CSS variable references', () => {
    const vars = getChartColorVars()
    expect(vars).toHaveLength(9)
  })

  it('should use oklch(var(--chart-N)) format', () => {
    const vars = getChartColorVars()
    expect(vars[0]).toBe('oklch(var(--chart-1))')
    expect(vars[1]).toBe('oklch(var(--chart-2))')
    expect(vars[8]).toBe('oklch(var(--chart-9))')
  })
})
