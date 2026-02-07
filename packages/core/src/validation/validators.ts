import type { ValidationIssue, Severity } from './types'

function createIssue(file: string, line: number | string, issue: string, severity: Severity): ValidationIssue {
  return { file, line, issue, severity }
}

/** Check for hardcoded color classes (e.g. bg-red-500) */
export function checkHardcodedColors(file: string, content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const pattern = /(?:bg|text|border|ring|from|to|via)-(?:red|blue|green|yellow|purple|pink|orange|indigo|teal|cyan|emerald|violet|fuchsia|rose|amber|lime|sky|stone|zinc|gray|slate|neutral)-\d{2,3}/g
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    // Skip comments and design-system-ignore
    if (line.includes('// design-system-ignore') || line.trim().startsWith('//') || line.trim().startsWith('*')) return
    const matches = line.match(pattern)
    if (matches) {
      issues.push(createIssue(file, i + 1, `Hardcoded color: ${matches[0]}. Use design tokens instead.`, 'medium'))
    }
  })
  return issues
}

/** Check for inline styles without CSS variables */
export function checkInlineStyles(file: string, content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    if (line.includes('// design-system-ignore')) return
    // Match style={{ ... }} but allow CSS custom properties (var(--)
    const styleMatch = line.match(/style=\{\{([^}]+)\}\}/)
    if (styleMatch) {
      const styleContent = styleMatch[1]
      // Allow if all values use CSS variables
      if (!styleContent.includes('var(--') && !styleContent.includes('width:') && !styleContent.includes('height:')) {
        issues.push(createIssue(file, i + 1, 'Inline style without CSS variables detected', 'low'))
      }
    }
  })
  return issues
}

/** Check for eval() usage */
export function checkEvalUsage(file: string, content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return
    if (/\beval\s*\(/.test(line)) {
      issues.push(createIssue(file, i + 1, 'eval() usage detected. This is a security risk.', 'critical'))
    }
  })
  return issues
}

/** Check for dangerouslySetInnerHTML without sanitization */
export function checkDangerousHTML(file: string, content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    if (line.includes('dangerouslySetInnerHTML')) {
      // Check if DOMPurify or sanitize is imported/used nearby
      const hasSanitizer = content.includes('DOMPurify') || content.includes('sanitize') || content.includes('// SECURITY:')
      if (!hasSanitizer) {
        issues.push(createIssue(file, i + 1, 'dangerouslySetInnerHTML without DOMPurify sanitization', 'high'))
      }
    }
  })
  return issues
}

/** Check for hardcoded secrets */
export function checkHardcodedSecrets(file: string, content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const secretPatterns = [
    { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]+['"]/gi, name: 'API key' },
    { pattern: /(?:secret|password|token)\s*[:=]\s*['"][^'"]+['"]/gi, name: 'Secret/password' },
    { pattern: /sk-[a-zA-Z0-9]{20,}/g, name: 'OpenAI API key' },
    { pattern: /sk-ant-[a-zA-Z0-9]{20,}/g, name: 'Anthropic API key' },
  ]
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return
    if (line.includes('process.env') || line.includes('// non-secret')) return
    for (const { pattern, name } of secretPatterns) {
      pattern.lastIndex = 0
      if (pattern.test(line)) {
        issues.push(createIssue(file, i + 1, `Possible hardcoded ${name}. Use environment variables.`, 'critical'))
      }
    }
  })
  return issues
}

/** Check for missing alt text on images */
export function checkAccessibility(file: string, content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    // Check img without alt
    if (/<img\b/.test(line) && !/alt=/.test(line) && !content.slice(0, content.indexOf(line) + line.length + 200).match(/alt=/)) {
      issues.push(createIssue(file, i + 1, 'Image missing alt attribute (WCAG 1.1.1)', 'high'))
    }
  })
  return issues
}

/** Run all validators on a file */
export function validateFile(file: string, content: string): ValidationIssue[] {
  return [
    ...checkHardcodedColors(file, content),
    ...checkInlineStyles(file, content),
    ...checkEvalUsage(file, content),
    ...checkDangerousHTML(file, content),
    ...checkHardcodedSecrets(file, content),
    ...checkAccessibility(file, content),
  ]
}
