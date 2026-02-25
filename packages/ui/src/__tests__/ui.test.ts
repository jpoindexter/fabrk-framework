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
  it('should return a registry with name, version, categories, and components', () => {
    const registry = getRegistry()
    expect(registry.name).toBe('@fabrk/ui')
    expect(registry.version).toBe('0.1.0')
    expect(typeof registry.categories).toBe('object')
    expect(registry.components.length).toBeGreaterThan(0)
  })

  it('should have expected categories', () => {
    const registry = getRegistry()
    for (const cat of ['ui', 'charts', 'ai', 'admin', 'security', 'organization', 'seo']) {
      expect(registry.categories[cat]).toBeDefined()
    }
  })

  it('each component category should be a valid category key', () => {
    const registry = getRegistry()
    const validCategories = Object.keys(registry.categories)
    for (const comp of registry.components) {
      expect(validCategories).toContain(comp.category)
    }
  })
})

// =============================================================================
// findComponent
// =============================================================================

describe('findComponent', () => {
  it('should find components by name across categories', () => {
    const button = findComponent('button')
    expect(button).toBeDefined()
    expect(button!.name).toBe('button')
    expect(button!.category).toBe('ui')

    expect(findComponent('bar-chart')!.category).toBe('charts')
    expect(findComponent('chat')!.category).toBe('ai')
    expect(findComponent('audit-log')!.category).toBe('admin')
    expect(findComponent('mfa-card')!.category).toBe('security')
    expect(findComponent('org-switcher')!.category).toBe('organization')
    expect(findComponent('schema-script')!.category).toBe('seo')
  })

  it('should return undefined for non-existent component', () => {
    expect(findComponent('nonexistent-component')).toBeUndefined()
  })
})

// =============================================================================
// listCategory
// =============================================================================

describe('listCategory', () => {
  it('should list UI components filtered by category', () => {
    const uiComponents = listCategory('ui')
    expect(uiComponents.length).toBeGreaterThan(0)
    for (const comp of uiComponents) {
      expect(comp.category).toBe('ui')
    }
  })

  it('should list chart components including known names', () => {
    const charts = listCategory('charts')
    const names = charts.map(c => c.name)
    expect(names).toContain('bar-chart')
    expect(names).toContain('line-chart')
    expect(names).toContain('pie-chart')
    expect(names).toContain('sparkline')
  })

  it('should return empty array for non-existent category', () => {
    expect(listCategory('nonexistent')).toEqual([])
    expect(listCategory('')).toEqual([])
  })
})

// =============================================================================
// listCategories
// =============================================================================

describe('listCategories', () => {
  it('should return all 7 category names', () => {
    const categories = listCategories()
    expect(categories).toHaveLength(7)
    for (const cat of ['ui', 'charts', 'ai', 'admin', 'security', 'organization', 'seo']) {
      expect(categories).toContain(cat)
    }
  })
})

// =============================================================================
// listComponents
// =============================================================================

describe('listComponents', () => {
  it('should return all component names matching registry count', () => {
    const names = listComponents()
    const registry = getRegistry()
    expect(names.length).toBe(registry.components.length)
  })

  it('should contain well-known components', () => {
    const names = listComponents()
    for (const name of ['button', 'card', 'input', 'dialog', 'table', 'bar-chart', 'chat']) {
      expect(names).toContain(name)
    }
  })
})

// =============================================================================
// resolveDeps
// =============================================================================

describe('resolveDeps', () => {
  it('should resolve deps for single and multiple components', () => {
    expect(resolveDeps(['bar-chart'])).toContain('recharts')

    const deps = resolveDeps(['bar-chart', 'dialog'])
    expect(deps).toContain('recharts')
    expect(deps).toContain('@radix-ui/react-dialog')
  })

  it('should return empty array for no deps, empty input, or nonexistent', () => {
    expect(resolveDeps(['badge'])).toEqual([])
    expect(resolveDeps([])).toEqual([])
    expect(resolveDeps(['nonexistent'])).toEqual([])
  })

  it('should deduplicate shared deps', () => {
    const deps = resolveDeps(['bar-chart', 'line-chart', 'pie-chart', 'sparkline'])
    expect(deps.filter(d => d === 'recharts').length).toBe(1)
  })

  it('should handle mix of existing and non-existing components', () => {
    const deps = resolveDeps(['button', 'nonexistent', 'bar-chart'])
    expect(deps).toContain('recharts')
  })
})
