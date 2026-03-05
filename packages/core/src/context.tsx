'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { PluginRegistry } from './plugins'
import type { FabrkConfig } from './types'
import type { FeatureModules } from './auto-wire'

// CONTEXT

export interface FabrkContextValue {
  config: FabrkConfig
  registry: PluginRegistry
  features?: FeatureModules
}

const FabrkContext = createContext<FabrkContextValue | null>(null)

export function useFabrk(): FabrkContextValue {
  const context = useContext(FabrkContext)
  if (!context) {
    throw new Error('useFabrk must be used within a <FabrkProvider>')
  }
  return context
}

export function useOptionalFabrk(): FabrkContextValue | null {
  return useContext(FabrkContext)
}

/** @internal */
export function FabrkContextProvider({
  children,
  value,
}: {
  children: ReactNode
  value: FabrkContextValue
}) {
  return (
    <FabrkContext.Provider value={value}>
      {children}
    </FabrkContext.Provider>
  )
}
