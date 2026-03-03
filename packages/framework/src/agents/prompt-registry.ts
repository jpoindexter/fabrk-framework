export interface PromptVersion {
  id: string;
  version: string;
  template: string;
  /** Traffic weight for A/B routing. Default: 1. */
  weight?: number;
}

const registry = new Map<string, PromptVersion[]>();

export function definePromptVersion(name: string, versions: PromptVersion[]): void {
  if (!versions.length) {
    throw new Error(`[fabrk] definePromptVersion: at least one version required for "${name}"`);
  }
  for (const v of versions) {
    if (!v.id || typeof v.id !== "string") throw new Error(`[fabrk] definePromptVersion: invalid id in "${name}"`);
    if (!v.version || typeof v.version !== "string") throw new Error(`[fabrk] definePromptVersion: invalid version in "${name}"`);
    if (typeof v.template !== "string") throw new Error(`[fabrk] definePromptVersion: invalid template in "${name}"`);
    if (v.weight !== undefined && (!Number.isFinite(v.weight) || v.weight <= 0)) {
      throw new Error(`[fabrk] definePromptVersion: weight must be a positive finite number in "${name}"`);
    }
  }
  registry.set(name, versions);
}

export function resolvePrompt(name: string, opts?: { versionId?: string }): string {
  const versions = registry.get(name);
  if (!versions) throw new Error(`[fabrk] Prompt not found: "${name}"`);
  if (!opts?.versionId) return versions[versions.length - 1].template;
  const match = versions.find((v) => v.id === opts.versionId || v.version === opts.versionId);
  if (!match) throw new Error(`[fabrk] Prompt version not found: "${name}"@${opts.versionId}`);
  return match.template;
}

export function abTestPrompt(name: string, userId: string): { versionId: string; template: string } {
  const versions = registry.get(name);
  if (!versions) throw new Error(`[fabrk] Prompt not found: "${name}"`);
  const key = name + ":" + userId;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) ^ key.charCodeAt(i);
  }
  hash = hash >>> 0;
  const totalWeight = versions.reduce((sum, v) => sum + (v.weight ?? 1), 0);
  let slot = hash % totalWeight;
  for (const v of versions) {
    const w = v.weight ?? 1;
    if (slot < w) return { versionId: v.id, template: v.template };
    slot -= w;
  }
  const last = versions[versions.length - 1];
  return { versionId: last.id, template: last.template };
}

export function clearPromptRegistry(): void {
  registry.clear();
}
