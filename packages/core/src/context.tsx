/**
 * FABRK Framework Context
 *
 * Provides the FabrkContext for accessing the plugin registry,
 * framework config, and registered adapters throughout the React tree.
 */

'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { PluginRegistry } from './plugins'
import type { FabrkConfig } from './types'
import type { FeatureModules } from './auto-wire'

// CONTEXT

export interface FabrkContextValue {
  /** Framework configuration */
  config: FabrkConfig
  /** Plugin registry with all registered adapters */
  registry: PluginRegistry
  /** Auto-wired feature modules (notifications, teams, flags, webhooks, jobs) */
  features?: FeatureModules
}

const FabrkContext = createContext<FabrkContextValue | null>(null)

// HOOKS

/**
 * Access the FABRK framework context
 *
 * Provides access to the plugin registry, config, and all registered adapters.
 *
 * @throws Error if used outside of FabrkProvider
 *
 * @example
 * ```tsx
 * function BillingPage() {
 *   const { registry } = useFabrk()
 *   const payments = registry.getPayment()
 *
 *   if (!payments?.isConfigured()) {
 *     return <p>Payments not configured</p>
 *   }
 *
 *   return <CheckoutButton />
 * }
 * ```
 */
export function useFabrk(): FabrkContextValue {
  const context = useContext(FabrkContext)
  if (!context) {
    throw new Error('useFabrk must be used within a <FabrkProvider>')
  }
  return context
}

/**
 * Optionally access the FABRK framework context
 *
 * Returns null if not inside a FabrkProvider. Useful for components
 * that work both inside and outside the framework.
 */
export function useOptionalFabrk(): FabrkContextValue | null {
  return useContext(FabrkContext)
}

// PROVIDER

export interface FabrkContextProviderProps {
  children: ReactNode
  config: FabrkConfig
  registry: PluginRegistry
  features?: FeatureModules
}

/**
 * Internal context provider component
 *
 * Used by the main FabrkProvider in providers.tsx. Not intended for direct use.
 */
export function FabrkContextProvider({
  children,
  config,
  registry,
  features,
}: FabrkContextProviderProps) {
  return (
    <FabrkContext.Provider value={{ config, registry, features }}>
      {children}
    </FabrkContext.Provider>
  )
}
