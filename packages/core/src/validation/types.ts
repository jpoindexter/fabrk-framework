export type Severity = 'critical' | 'high' | 'medium' | 'low'

export interface ValidationIssue {
  file: string
  line: number | string
  issue: string
  severity: Severity
}

export interface ValidationReport {
  issues: ValidationIssue[]
  passed: boolean
  summary: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
  }
}

export interface ValidatorOptions {
  srcDir?: string
  ignorePatterns?: string[]
}

export interface ComponentMeta {
  name: string
  tier: number
  category: string
  bundleSize: string
  usage: number
  stability: 'stable' | 'beta' | 'experimental'
  mobileReady: boolean
}

export interface ComponentRegistry {
  components: Record<string, ComponentMeta>
  getByTier: (tier: number) => ComponentMeta[]
  getByCategory: (category: string) => ComponentMeta[]
  getAll: () => ComponentMeta[]
}
