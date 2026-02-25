/** Component registry — metadata and resolution for the `fabrk add` CLI. */

import registryData from '../registry.json'

export interface RegistryComponent {
  name: string
  category: string
  file: string
  deps: string[]
}

export interface Registry {
  name: string
  version: string
  categories: Record<string, string>
  components: RegistryComponent[]
}

/**
 * Get the full component registry
 */
export function getRegistry(): Registry {
  return registryData as Registry
}

/**
 * Find a component by name in the registry
 */
export function findComponent(name: string): RegistryComponent | undefined {
  const registry = getRegistry()
  return registry.components.find(c => c.name === name)
}

/**
 * List all components in a category
 */
export function listCategory(category: string): RegistryComponent[] {
  const registry = getRegistry()
  return registry.components.filter(c => c.category === category)
}

/**
 * List all available categories
 */
export function listCategories(): string[] {
  const registry = getRegistry()
  return Object.keys(registry.categories)
}

/**
 * Get all component names
 */
export function listComponents(): string[] {
  const registry = getRegistry()
  return registry.components.map(c => c.name)
}

/**
 * Resolve dependencies for a set of components
 */
export function resolveDeps(componentNames: string[]): string[] {
  const registry = getRegistry()
  const allDeps = new Set<string>()

  for (const name of componentNames) {
    const comp = registry.components.find(c => c.name === name)
    if (comp) {
      for (const dep of comp.deps) {
        allDeps.add(dep)
      }
    }
  }

  return Array.from(allDeps)
}
