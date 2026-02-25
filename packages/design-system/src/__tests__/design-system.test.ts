import { describe, it, expect } from 'vitest'
import {
  formatButtonText,
  formatLabelText,
  formatCardHeader,
  formatStatusText,
  formatLabel,
  formatCardTitle,
  isSharpMode,
  hasRoundedCorners,
  terminalClasses,
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

// =============================================================================
// TERMINAL THEME UTILITY FUNCTIONS
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
// BACKWARDS COMPATIBILITY ALIASES
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
// HASHMARK PRESET
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
// PRIMITIVES
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
// CSS VARIABLE NAMES
// =============================================================================

describe('cssVariableNames', () => {
  it('all CSS variable names should start with "--"', () => {
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
    expect(leaves.length).toBeGreaterThan(50)
  })
})

// =============================================================================
// CHART COLORS
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
