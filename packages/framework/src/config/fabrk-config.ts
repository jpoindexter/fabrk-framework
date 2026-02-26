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
  ai?: FabrkAIConfig;
  auth?: {
    provider?: "nextauth" | "custom";
    apiKeys?: boolean;
    mfa?: boolean;
  };
  security?: {
    csrf?: boolean;
    csp?: boolean;
    rateLimit?: { windowMs?: number; max?: number };
  };
  deploy?: {
    target?: "workers" | "node" | "vercel";
  };
}

export function defineFabrkConfig(config: FabrkConfig): FabrkConfig {
  return config;
}

export async function loadFabrkConfig(root: string): Promise<FabrkConfig> {
  const resolvedRoot = path.resolve(root);
  const tsPath = path.join(resolvedRoot, "fabrk.config.ts");
  const jsPath = path.join(resolvedRoot, "fabrk.config.js");

  const importPath = fs.existsSync(tsPath)
    ? tsPath
    : fs.existsSync(jsPath)
      ? jsPath
      : null;

  if (!importPath) return {};

  if (!importPath.startsWith(resolvedRoot + path.sep) && importPath !== resolvedRoot) {
    return {};
  }

  try {
    const mod = await import(importPath);
    return mod.default || mod;
  } catch (err) {
    console.warn(`[fabrk] Failed to load config from ${importPath}:`, err);
    return {};
  }
}
