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

export function getRegistry(): Registry {
  return registryData as Registry
}

export function findComponent(name: string): RegistryComponent | undefined {
  const registry = getRegistry()
  return registry.components.find(c => c.name === name)
}

export function listCategory(category: string): RegistryComponent[] {
  const registry = getRegistry()
  return registry.components.filter(c => c.category === category)
}

export function listCategories(): string[] {
  const registry = getRegistry()
  return Object.keys(registry.categories)
}

export function listComponents(): string[] {
  const registry = getRegistry()
  return registry.components.map(c => c.name)
}

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
