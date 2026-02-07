import type { ValidationIssue, ValidationReport } from './types'

export function generateReport(issues: ValidationIssue[]): ValidationReport {
  const summary = {
    total: issues.length,
    critical: issues.filter((i) => i.severity === 'critical').length,
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    low: issues.filter((i) => i.severity === 'low').length,
  }

  // Fail on critical or high
  const passed = summary.critical === 0 && summary.high === 0

  return { issues, passed, summary }
}

export function formatReport(report: ValidationReport): string {
  const lines: string[] = []
  lines.push('VALIDATION REPORT')
  lines.push('='.repeat(40))
  lines.push('')
  lines.push(`Total Issues: ${report.summary.total}`)
  lines.push(`  Critical: ${report.summary.critical}`)
  lines.push(`  High: ${report.summary.high}`)
  lines.push(`  Medium: ${report.summary.medium}`)
  lines.push(`  Low: ${report.summary.low}`)
  lines.push('')

  if (report.issues.length > 0) {
    const criticalAndHigh = report.issues.filter(
      (i) => i.severity === 'critical' || i.severity === 'high'
    )
    for (const issue of criticalAndHigh) {
      const icon = issue.severity === 'critical' ? 'CRITICAL' : 'HIGH'
      lines.push(`[${icon}] ${issue.issue}`)
      lines.push(`   File: ${issue.file}:${issue.line}`)
      lines.push('')
    }
  }

  lines.push(report.passed ? 'PASSED' : 'FAILED')
  return lines.join('\n')
}
