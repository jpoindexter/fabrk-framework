import { describe, it, expect } from 'vitest'
import { checkDesignTokens, isDesignSystemCompliant } from '../enforce'

describe('checkDesignTokens', () => {
  it('returns empty array for semantic tokens', () => {
    expect(checkDesignTokens('bg-primary text-foreground border-border')).toEqual([])
    expect(checkDesignTokens('bg-card bg-muted text-muted-foreground')).toEqual([])
    expect(checkDesignTokens('bg-destructive text-destructive text-success')).toEqual([])
    expect(checkDesignTokens('p-4 flex items-center gap-2 rounded-md')).toEqual([])
  })

  it('flags hardcoded color shades', () => {
    const violations = checkDesignTokens('bg-blue-500')
    expect(violations).toHaveLength(1)
    expect(violations[0].class).toBe('bg-blue-500')
    expect(violations[0].suggestion).toContain('bg-primary')
  })

  it('flags text hardcoded colors', () => {
    const violations = checkDesignTokens('text-gray-500')
    expect(violations).toHaveLength(1)
    expect(violations[0].class).toBe('text-gray-500')
  })

  it('flags border hardcoded colors', () => {
    const violations = checkDesignTokens('border-red-300')
    expect(violations).toHaveLength(1)
    expect(violations[0].class).toBe('border-red-300')
  })

  it('flags bg-white and text-black', () => {
    const violations = checkDesignTokens('bg-white text-black')
    expect(violations).toHaveLength(2)
    expect(violations.map((v) => v.class)).toEqual(['bg-white', 'text-black'])
  })

  it('flags ring and fill hardcoded colors', () => {
    expect(checkDesignTokens('ring-blue-500')).toHaveLength(1)
    expect(checkDesignTokens('fill-green-400')).toHaveLength(1)
  })

  it('flags gradient stop hardcoded colors', () => {
    expect(checkDesignTokens('from-blue-500 to-purple-600')).toHaveLength(2)
  })

  it('strips responsive prefixes before checking', () => {
    const violations = checkDesignTokens('sm:bg-blue-500 hover:text-gray-900')
    expect(violations).toHaveLength(2)
    expect(violations[0].class).toBe('sm:bg-blue-500')
    expect(violations[1].class).toBe('hover:text-gray-900')
  })

  it('strips multiple stacked prefixes', () => {
    const violations = checkDesignTokens('dark:hover:bg-red-500')
    expect(violations).toHaveLength(1)
    expect(violations[0].class).toBe('dark:hover:bg-red-500')
  })

  it('does not flag non-color utility classes', () => {
    expect(checkDesignTokens('p-4 m-2 flex items-center gap-4 rounded-lg font-medium')).toEqual([])
    expect(checkDesignTokens('w-full h-screen max-w-lg')).toEqual([])
    expect(checkDesignTokens('opacity-50 transition-all duration-200')).toEqual([])
  })

  it('returns multiple violations for multiple hardcoded classes', () => {
    const violations = checkDesignTokens('bg-blue-500 text-white border-gray-200')
    expect(violations).toHaveLength(3)
  })

  it('handles empty string', () => {
    expect(checkDesignTokens('')).toEqual([])
  })

  it('handles extra whitespace', () => {
    const violations = checkDesignTokens('  bg-blue-500   text-white  ')
    expect(violations).toHaveLength(2)
  })

  it('includes suggestion for each violation', () => {
    const violations = checkDesignTokens('bg-gray-100')
    expect(violations[0].suggestion).toBeDefined()
    expect(typeof violations[0].suggestion).toBe('string')
  })
})

describe('isDesignSystemCompliant', () => {
  it('returns true for compliant classes', () => {
    expect(isDesignSystemCompliant('bg-primary text-foreground')).toBe(true)
    expect(isDesignSystemCompliant('p-4 flex gap-2')).toBe(true)
  })

  it('returns false for hardcoded classes', () => {
    expect(isDesignSystemCompliant('bg-blue-500')).toBe(false)
    expect(isDesignSystemCompliant('text-white')).toBe(false)
  })
})
