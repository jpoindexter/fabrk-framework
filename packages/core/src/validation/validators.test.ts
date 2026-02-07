import { describe, it, expect } from 'vitest'
import { checkHardcodedColors, checkInlineStyles, checkEvalUsage, checkDangerousHTML, checkHardcodedSecrets, checkAccessibility, validateFile } from './validators'
import { generateReport, formatReport } from './report'
import { createComponentRegistry } from './registry'

describe('checkHardcodedColors', () => {
  it('detects hardcoded Tailwind colors', () => {
    const content = '<div className="bg-red-500 text-white">'
    const issues = checkHardcodedColors('test.tsx', content)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].severity).toBe('medium')
  })

  it('ignores design-system-ignore comments', () => {
    const content = '<div className="bg-red-500"> // design-system-ignore'
    const issues = checkHardcodedColors('test.tsx', content)
    expect(issues).toHaveLength(0)
  })

  it('ignores comments', () => {
    const content = '// bg-red-500 is used here'
    const issues = checkHardcodedColors('test.tsx', content)
    expect(issues).toHaveLength(0)
  })

  it('passes clean code', () => {
    const content = '<div className="bg-primary text-primary-foreground">'
    const issues = checkHardcodedColors('test.tsx', content)
    expect(issues).toHaveLength(0)
  })
})

describe('checkEvalUsage', () => {
  it('detects eval()', () => {
    const content = 'const result = eval(code)'
    const issues = checkEvalUsage('test.ts', content)
    expect(issues).toHaveLength(1)
    expect(issues[0].severity).toBe('critical')
  })

  it('passes clean code', () => {
    const content = 'const result = evaluate(code)'
    const issues = checkEvalUsage('test.ts', content)
    expect(issues).toHaveLength(0)
  })
})

describe('checkDangerousHTML', () => {
  it('flags dangerouslySetInnerHTML without sanitizer', () => {
    const content = '<div dangerouslySetInnerHTML={{ __html: html }} />'
    const issues = checkDangerousHTML('test.tsx', content)
    expect(issues).toHaveLength(1)
    expect(issues[0].severity).toBe('high')
  })

  it('passes when DOMPurify is used', () => {
    const content = 'import DOMPurify from "dompurify"\n<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />'
    const issues = checkDangerousHTML('test.tsx', content)
    expect(issues).toHaveLength(0)
  })
})

describe('checkHardcodedSecrets', () => {
  it('detects OpenAI-style keys', () => {
    const content = 'const key = "sk-abcdefghijklmnopqrstuvwxyz"'
    const issues = checkHardcodedSecrets('test.ts', content)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].severity).toBe('critical')
  })

  it('passes env references', () => {
    const content = 'const key = process.env.OPENAI_API_KEY'
    const issues = checkHardcodedSecrets('test.ts', content)
    expect(issues).toHaveLength(0)
  })
})

describe('validateFile', () => {
  it('runs all validators', () => {
    const content = 'eval("alert(1)")\n<div className="bg-red-500">'
    const issues = validateFile('test.tsx', content)
    expect(issues.length).toBeGreaterThanOrEqual(2)
  })
})

describe('generateReport', () => {
  it('generates a report with summary', () => {
    const issues = validateFile('test.tsx', 'eval("x")')
    const report = generateReport(issues)
    expect(report.passed).toBe(false)
    expect(report.summary.critical).toBeGreaterThan(0)
  })

  it('passes with no issues', () => {
    const report = generateReport([])
    expect(report.passed).toBe(true)
    expect(report.summary.total).toBe(0)
  })
})

describe('formatReport', () => {
  it('formats report as string', () => {
    const report = generateReport([])
    const text = formatReport(report)
    expect(text).toContain('VALIDATION REPORT')
    expect(text).toContain('PASSED')
  })
})

describe('createComponentRegistry', () => {
  it('creates a queryable registry', () => {
    const registry = createComponentRegistry({
      Button: { name: 'Button', tier: 1, category: 'base', bundleSize: '2kb', usage: 100, stability: 'stable', mobileReady: true },
      Chart: { name: 'Chart', tier: 2, category: 'data', bundleSize: '10kb', usage: 20, stability: 'beta', mobileReady: false },
    })
    expect(registry.getAll()).toHaveLength(2)
    expect(registry.getByTier(1)).toHaveLength(1)
    expect(registry.getByCategory('data')).toHaveLength(1)
  })
})
