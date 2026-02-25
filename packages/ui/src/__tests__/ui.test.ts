import { describe, it, expect } from 'vitest'
import {
  getRegistry,
  findComponent,
  listCategory,
  listCategories,
  listComponents,
  resolveDeps,
} from '../index'

// =============================================================================
// getRegistry
// =============================================================================

describe('getRegistry', () => {
  it('should return the full registry object', () => {
    const registry = getRegistry()
    expect(registry).toBeDefined()
    expect(registry.name).toBe('@fabrk/ui')
    expect(registry.version).toBe('0.1.0')
  })

  it('should have categories object', () => {
    const registry = getRegistry()
    expect(registry.categories).toBeDefined()
    expect(typeof registry.categories).toBe('object')
  })

  it('should have components array', () => {
    const registry = getRegistry()
    expect(Array.isArray(registry.components)).toBe(true)
    expect(registry.components.length).toBeGreaterThan(0)
  })

  it('should have expected categories', () => {
    const registry = getRegistry()
    expect(registry.categories['ui']).toBeDefined()
    expect(registry.categories['charts']).toBeDefined()
    expect(registry.categories['ai']).toBeDefined()
    expect(registry.categories['admin']).toBeDefined()
    expect(registry.categories['security']).toBeDefined()
    expect(registry.categories['organization']).toBeDefined()
    expect(registry.categories['seo']).toBeDefined()
  })

  it('each category should have a string description', () => {
    const registry = getRegistry()
    for (const [, description] of Object.entries(registry.categories)) {
      expect(typeof description).toBe('string')
      expect(description.length).toBeGreaterThan(0)
    }
  })

  it('each component should have required fields', () => {
    const registry = getRegistry()
    for (const comp of registry.components) {
      expect(typeof comp.name).toBe('string')
      expect(comp.name.length).toBeGreaterThan(0)
      expect(typeof comp.category).toBe('string')
      expect(typeof comp.file).toBe('string')
      expect(Array.isArray(comp.deps)).toBe(true)
    }
  })

  it('each component category should be a valid category key', () => {
    const registry = getRegistry()
    const validCategories = Object.keys(registry.categories)
    for (const comp of registry.components) {
      expect(validCategories).toContain(comp.category)
    }
  })

  it('component names should be unique', () => {
    const registry = getRegistry()
    const names = registry.components.map(c => c.name)
    const unique = new Set(names)
    expect(unique.size).toBe(names.length)
  })
})

// =============================================================================
// findComponent
// =============================================================================

describe('findComponent', () => {
  it('should find a component by name', () => {
    const button = findComponent('button')
    expect(button).toBeDefined()
    expect(button!.name).toBe('button')
    expect(button!.category).toBe('ui')
    expect(button!.file).toBe('registry/ui/button.tsx')
  })

  it('should find a chart component', () => {
    const barChart = findComponent('bar-chart')
    expect(barChart).toBeDefined()
    expect(barChart!.name).toBe('bar-chart')
    expect(barChart!.category).toBe('charts')
    expect(barChart!.deps).toContain('recharts')
  })

  it('should find an AI component', () => {
    const chat = findComponent('chat')
    expect(chat).toBeDefined()
    expect(chat!.name).toBe('chat')
    expect(chat!.category).toBe('ai')
  })

  it('should find admin components', () => {
    const auditLog = findComponent('audit-log')
    expect(auditLog).toBeDefined()
    expect(auditLog!.category).toBe('admin')
  })

  it('should find security components', () => {
    const mfa = findComponent('mfa-card')
    expect(mfa).toBeDefined()
    expect(mfa!.category).toBe('security')
  })

  it('should find organization components', () => {
    const orgSwitcher = findComponent('org-switcher')
    expect(orgSwitcher).toBeDefined()
    expect(orgSwitcher!.category).toBe('organization')
  })

  it('should find SEO components', () => {
    const schema = findComponent('schema-script')
    expect(schema).toBeDefined()
    expect(schema!.category).toBe('seo')
  })

  it('should return undefined for non-existent component', () => {
    const result = findComponent('nonexistent-component')
    expect(result).toBeUndefined()
  })

  it('should return undefined for empty string', () => {
    const result = findComponent('')
    expect(result).toBeUndefined()
  })

  it('should be case-sensitive', () => {
    const result = findComponent('Button')
    expect(result).toBeUndefined()
  })
})

// =============================================================================
// listCategory
// =============================================================================

describe('listCategory', () => {
  it('should list all UI components', () => {
    const uiComponents = listCategory('ui')
    expect(uiComponents.length).toBeGreaterThan(0)
    for (const comp of uiComponents) {
      expect(comp.category).toBe('ui')
    }
  })

  it('should list all chart components', () => {
    const charts = listCategory('charts')
    expect(charts.length).toBeGreaterThan(0)
    for (const comp of charts) {
      expect(comp.category).toBe('charts')
    }
    const names = charts.map(c => c.name)
    expect(names).toContain('bar-chart')
    expect(names).toContain('line-chart')
    expect(names).toContain('pie-chart')
    expect(names).toContain('sparkline')
  })

  it('should list all AI components', () => {
    const aiComponents = listCategory('ai')
    expect(aiComponents.length).toBeGreaterThan(0)
    const names = aiComponents.map(c => c.name)
    expect(names).toContain('chat')
    expect(names).toContain('chat-input')
  })

  it('should list admin components', () => {
    const adminComponents = listCategory('admin')
    expect(adminComponents.length).toBeGreaterThan(0)
    const names = adminComponents.map(c => c.name)
    expect(names).toContain('audit-log')
    expect(names).toContain('metrics-card')
    expect(names).toContain('system-health')
  })

  it('should list security components', () => {
    const secComponents = listCategory('security')
    expect(secComponents.length).toBeGreaterThan(0)
    const names = secComponents.map(c => c.name)
    expect(names).toContain('mfa-card')
    expect(names).toContain('backup-codes-modal')
  })

  it('should return empty array for non-existent category', () => {
    const result = listCategory('nonexistent')
    expect(result).toEqual([])
  })

  it('should return empty array for empty string', () => {
    const result = listCategory('')
    expect(result).toEqual([])
  })

  it('all returned components should have proper structure', () => {
    const components = listCategory('ui')
    for (const comp of components) {
      expect(comp.name).toBeDefined()
      expect(comp.category).toBe('ui')
      expect(comp.file).toBeDefined()
      expect(Array.isArray(comp.deps)).toBe(true)
    }
  })
})

// =============================================================================
// listCategories
// =============================================================================

describe('listCategories', () => {
  it('should return all category names', () => {
    const categories = listCategories()
    expect(categories).toContain('ui')
    expect(categories).toContain('charts')
    expect(categories).toContain('ai')
    expect(categories).toContain('admin')
    expect(categories).toContain('security')
    expect(categories).toContain('organization')
    expect(categories).toContain('seo')
  })

  it('should return exactly 7 categories', () => {
    const categories = listCategories()
    expect(categories).toHaveLength(7)
  })

  it('should return strings', () => {
    const categories = listCategories()
    for (const cat of categories) {
      expect(typeof cat).toBe('string')
    }
  })
})

// =============================================================================
// listComponents
// =============================================================================

describe('listComponents', () => {
  it('should return all component names', () => {
    const names = listComponents()
    expect(names.length).toBeGreaterThan(0)
  })

  it('should return strings', () => {
    const names = listComponents()
    for (const name of names) {
      expect(typeof name).toBe('string')
    }
  })

  it('should contain well-known components', () => {
    const names = listComponents()
    expect(names).toContain('button')
    expect(names).toContain('card')
    expect(names).toContain('input')
    expect(names).toContain('dialog')
    expect(names).toContain('table')
    expect(names).toContain('bar-chart')
    expect(names).toContain('chat')
  })

  it('should have unique names', () => {
    const names = listComponents()
    const unique = new Set(names)
    expect(unique.size).toBe(names.length)
  })

  it('should match the count of registry components', () => {
    const names = listComponents()
    const registry = getRegistry()
    expect(names.length).toBe(registry.components.length)
  })
})

// =============================================================================
// resolveDeps
// =============================================================================

describe('resolveDeps', () => {
  it('should resolve deps for a single component', () => {
    const deps = resolveDeps(['bar-chart'])
    expect(deps).toContain('recharts')
  })

  it('should resolve deps for multiple components', () => {
    const deps = resolveDeps(['bar-chart', 'dialog'])
    expect(deps).toContain('recharts')
    expect(deps).toContain('@radix-ui/react-dialog')
  })

  it('should return empty array for component with no deps', () => {
    const deps = resolveDeps(['badge'])
    expect(deps).toEqual([])
  })

  it('should return empty array for empty input', () => {
    const deps = resolveDeps([])
    expect(deps).toEqual([])
  })

  it('should return empty array for non-existent component', () => {
    const deps = resolveDeps(['nonexistent'])
    expect(deps).toEqual([])
  })

  it('should deduplicate shared deps', () => {
    // Multiple components share lucide-react
    const deps = resolveDeps(['alert', 'checkbox', 'pagination'])
    const lucideCount = deps.filter(d => d === 'lucide-react').length
    expect(lucideCount).toBe(1)
  })

  it('should handle mix of existing and non-existing components', () => {
    const deps = resolveDeps(['button', 'nonexistent', 'bar-chart'])
    // button has no deps, nonexistent is skipped, bar-chart has recharts
    expect(deps).toContain('recharts')
  })

  it('should collect deps from checkbox correctly', () => {
    const deps = resolveDeps(['checkbox'])
    expect(deps).toContain('@radix-ui/react-checkbox')
    expect(deps).toContain('lucide-react')
  })

  it('should collect all deps from data-table', () => {
    const deps = resolveDeps(['data-table'])
    expect(deps).toContain('@tanstack/react-table')
    expect(deps).toContain('lucide-react')
  })

  it('should collect chart deps from multiple chart components', () => {
    const deps = resolveDeps(['bar-chart', 'line-chart', 'pie-chart', 'sparkline'])
    // All chart components use recharts, but it should appear once
    const rechartsCount = deps.filter(d => d === 'recharts').length
    expect(rechartsCount).toBe(1)
  })
})

// =============================================================================
// REGISTRY DATA INTEGRITY
// =============================================================================

describe('registry data integrity', () => {
  it('all component files should be in their category directory', () => {
    const registry = getRegistry()
    for (const comp of registry.components) {
      expect(comp.file).toContain(`registry/${comp.category}/`)
    }
  })

  it('all component files should end with .tsx', () => {
    const registry = getRegistry()
    for (const comp of registry.components) {
      expect(comp.file).toMatch(/\.tsx$/)
    }
  })

  it('chart components should depend on recharts', () => {
    const charts = listCategory('charts')
    for (const chart of charts) {
      expect(chart.deps).toContain('recharts')
    }
  })

  it('components with no deps should have empty array', () => {
    const badge = findComponent('badge')
    expect(badge!.deps).toEqual([])

    const card = findComponent('card')
    expect(card!.deps).toEqual([])

    const skeleton = findComponent('skeleton')
    expect(skeleton!.deps).toEqual([])
  })

  it('UI category should have the most components', () => {
    const categories = listCategories()
    let maxCategory = ''
    let maxCount = 0
    for (const cat of categories) {
      const count = listCategory(cat).length
      if (count > maxCount) {
        maxCount = count
        maxCategory = cat
      }
    }
    expect(maxCategory).toBe('ui')
  })
})
