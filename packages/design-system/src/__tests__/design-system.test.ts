import { describe, it, expect } from 'vitest'
import {
  formatButtonText,
  formatLabelText,
  formatCardHeader,
  formatStatusText,
  terminalClasses,
  // Chart colors
  CHART_FALLBACK_COLORS,
  getChartColors,
  getChartColor,
  getChartColorVars,
  // Presets
  hashmarkVariables,
  generateHashmarkCss,
} from '../index'

// TERMINAL THEME UTILITY FUNCTIONS

describe('terminal theme utility functions', () => {
  it('formatButtonText should prepend "> " and uppercase', () => {
    expect(formatButtonText('Save Changes')).toBe('> SAVE CHANGES')
    expect(formatButtonText('SUBMIT')).toBe('> SUBMIT')
    expect(formatButtonText('')).toBe('> ')
  })

  it('formatLabelText should wrap in brackets and uppercase with colon', () => {
    expect(formatLabelText('Email')).toBe('[EMAIL]:')
    expect(formatLabelText('first name')).toBe('[FIRST NAME]:')
  })

  it('formatCardHeader should wrap title in brackets with optional hex code', () => {
    expect(formatCardHeader('Settings')).toBe('[ SETTINGS ]')
    expect(formatCardHeader('Settings', '00')).toBe('[ [0x00] SETTINGS ]')
    expect(formatCardHeader('')).toBe('[  ]')
  })

  it('formatStatusText should wrap in brackets and uppercase', () => {
    expect(formatStatusText('Active')).toBe('[ACTIVE]')
    expect(formatStatusText('pending')).toBe('[PENDING]')
  })

  it('terminalClasses should have correct radius and text values', () => {
    expect(terminalClasses.radius).toBe('rounded-dynamic')
    expect(terminalClasses.text).toBe('uppercase')
    expect(terminalClasses.font).toBe('font-body')
    expect(terminalClasses.cardHeader).toBe('font-mono text-xs text-muted-foreground')
    expect(terminalClasses.label).toBe('font-mono text-xs text-muted-foreground uppercase')
    expect(terminalClasses.button).toBe('rounded-dynamic font-mono uppercase')
    expect(terminalClasses.input).toBe('rounded-dynamic font-mono border-border')
    expect(terminalClasses.card).toBe('rounded-dynamic border border-border')
    expect(terminalClasses.badge).toBe('rounded-dynamic font-mono text-xs uppercase')
  })
})

// HASHMARK PRESET

describe('hashmark preset', () => {
  it('should have all required CSS variable keys', () => {
    const requiredKeys = [
      '--background', '--foreground', '--card', '--card-foreground',
      '--primary', '--primary-foreground', '--secondary', '--secondary-foreground',
      '--muted', '--muted-foreground', '--accent', '--accent-foreground',
      '--destructive', '--destructive-foreground', '--border', '--input', '--ring', '--radius',
      '--success', '--success-foreground', '--warning', '--warning-foreground',
      '--info', '--info-foreground',
      '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
    ]
    for (const key of requiredKeys) {
      expect(hashmarkVariables, key).toHaveProperty(key)
    }
  })

  it('should use emerald primary, sharp corners, and zinc dark background', () => {
    expect(hashmarkVariables['--primary']).toBe('#10b981')
    expect(hashmarkVariables['--accent']).toBe('#10b981')
    expect(hashmarkVariables['--radius']).toBe('0rem')
    expect(hashmarkVariables['--background']).toBe('#09090b')
  })

  it('generateHashmarkCss v3 should contain @tailwind directives and @layer base', () => {
    const css = generateHashmarkCss('v3')
    expect(css.length).toBeGreaterThan(0)
    expect(css).toContain('@tailwind base')
    expect(css).toContain('@layer base')
    expect(css).toContain('monospace')
  })

  it('generateHashmarkCss v4 should contain @import, @theme, :root, and --color-* mappings', () => {
    const css = generateHashmarkCss('v4')
    expect(css.length).toBeGreaterThan(0)
    expect(css).toContain('@import "tailwindcss"')
    expect(css).toContain('@theme inline')
    expect(css).toContain(':root')
    expect(css).toContain('--color-background')
    expect(css).toContain('--color-primary')
    expect(css).toContain('--color-success')
    expect(css).toContain('monospace')
    expect(css).toContain('::selection')
  })

  it('v4 should be default when no argument is passed', () => {
    expect(generateHashmarkCss()).toBe(generateHashmarkCss('v4'))
  })

  it('generated v4 CSS should contain all variable values from hashmarkVariables', () => {
    const css = generateHashmarkCss('v4')
    for (const [key, value] of Object.entries(hashmarkVariables)) {
      expect(css, `Should contain ${key}: ${value}`).toContain(key)
      expect(css, `Should contain value ${value}`).toContain(value)
    }
  })
})

// CHART COLORS

describe('chart colors', () => {
  it('getChartColors should return 9 fallback colors in Node (no window)', () => {
    const result = getChartColors()
    expect(result).toHaveLength(9)
    expect(result[0]).toBe(CHART_FALLBACK_COLORS[0])
  })

  it('getChartColor should return color by index and wrap around', () => {
    expect(getChartColor(0)).toBe(CHART_FALLBACK_COLORS[0])
    expect(getChartColor(9)).toBe(CHART_FALLBACK_COLORS[0])
  })

  it('getChartColorVars should return 9 oklch() CSS variable references', () => {
    const vars = getChartColorVars()
    expect(vars).toHaveLength(9)
    for (const v of vars) {
      expect(v).toMatch(/^oklch\(var\(--chart-\d+\)\)$/)
    }
  })
})
