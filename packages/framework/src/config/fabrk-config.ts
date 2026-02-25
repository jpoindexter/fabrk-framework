import path from "node:path";
import fs from "node:fs";

export interface FabrkAIConfig {
  defaultModel?: string;
  fallback?: string[];
  budget?: {
    daily?: number;
    perSession?: number;
    alertThreshold?: number;
  };
}

export interface FabrkConfig {
  /** AI configuration */
  ai?: FabrkAIConfig;
  /** Auth mode for agents */
  auth?: {
    provider?: "nextauth" | "custom";
    apiKeys?: boolean;
    mfa?: boolean;
  };
  /** Security settings */
  security?: {
    csrf?: boolean;
    csp?: boolean;
    rateLimit?: { windowMs?: number; max?: number };
  };
  /** Deployment target */
  deploy?: {
    target?: "workers" | "node" | "vercel";
  };
}

/**
 * Type helper for fabrk.config.ts. Provides autocompletion.
 */
export function defineFabrkConfig(config: FabrkConfig): FabrkConfig {
  return config;
}

/**
 * Load fabrk.config.ts from a project root.
 * Falls back to next.config.js/mjs for migration compatibility.
 */
export async function loadFabrkConfig(root: string): Promise<FabrkConfig> {
  const configPath = path.join(root, "fabrk.config.ts");
  const configPathJs = path.join(root, "fabrk.config.js");

  if (fs.existsSync(configPath) || fs.existsSync(configPathJs)) {
    try {
      const mod = await import(configPath);
      return mod.default || mod;
    } catch {
      return {};
    }
  }

  return {};
}
