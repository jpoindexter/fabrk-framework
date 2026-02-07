import type { ComponentMeta, ComponentRegistry } from './types'

export function createComponentRegistry(
  components: Record<string, ComponentMeta>
): ComponentRegistry {
  return {
    components,
    getByTier(tier: number) {
      return Object.values(components).filter((c) => c.tier === tier)
    },
    getByCategory(category: string) {
      return Object.values(components).filter((c) => c.category === category)
    },
    getAll() {
      return Object.values(components)
    },
  }
}
