'use client';

import { useMemo, type ReactNode } from 'react';
import { FabrkContextProvider } from './context';
import { PluginRegistry } from './plugins';
import type { FabrkConfig } from './types';
import { fabrkConfigSchema } from './types';
import type { FeatureModules } from './auto-wire';

export interface FabrkProviderProps {
  children: ReactNode;
  config?: FabrkConfig;
  registry?: PluginRegistry;
  features?: FeatureModules;
}

export function FabrkProvider({
  children,
  config = {},
  registry: externalRegistry,
  features,
}: FabrkProviderProps) {
  const validatedConfig = useMemo(() => fabrkConfigSchema.parse(config), [config]);
  const registry = useMemo(() => externalRegistry ?? new PluginRegistry(), [externalRegistry]);

  return (
    <FabrkContextProvider value={{ config: validatedConfig, registry, features }}>
      {children}
    </FabrkContextProvider>
  );
}
