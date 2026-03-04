import fs from "node:fs";
import path from "node:path";

export interface ManifestEntry {
  file: string;
  src?: string;
  isEntry?: boolean;
  css?: string[];
  imports?: string[];
}

export type Manifest = Record<string, ManifestEntry>;

export function readManifest(distDir: string): Manifest | null {
  try {
    const raw = fs.readFileSync(path.join(distDir, ".vite", "manifest.json"), "utf-8");
    return JSON.parse(raw) as Manifest;
  } catch {
    return null;
  }
}

export function getEntryAssets(manifest: Manifest): { scripts: string[]; styles: string[] } {
  const scripts: string[] = [];
  const styles: string[] = [];
  for (const entry of Object.values(manifest)) {
    if (entry.isEntry) {
      scripts.push(`/${entry.file}`);
      for (const css of entry.css ?? []) styles.push(`/${css}`);
    }
  }
  return { scripts, styles };
}

/** Returns HTML link + script tags for all entry assets. Empty string when manifest is null. */
export function buildAssetTags(manifest: Manifest | null): string {
  if (!manifest) return "";
  const { scripts, styles } = getEntryAssets(manifest);
  return [
    ...styles.map((href) => `  <link rel="stylesheet" href="${href}" />`),
    ...scripts.map((src) => `  <script type="module" src="${src}"></script>`),
  ].join("\n");
}
