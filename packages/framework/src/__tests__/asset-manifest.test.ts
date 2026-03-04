import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readManifest, getEntryAssets, buildAssetTags } from "../runtime/asset-manifest";

describe("asset-manifest", () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-")); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  function writeManifest(content: object) {
    const viteDir = path.join(tmpDir, ".vite");
    fs.mkdirSync(viteDir, { recursive: true });
    fs.writeFileSync(path.join(viteDir, "manifest.json"), JSON.stringify(content));
  }

  it("returns null when manifest does not exist", () => {
    expect(readManifest(tmpDir)).toBeNull();
  });

  it("returns parsed manifest when file exists", () => {
    const m = { "src/main.ts": { file: "assets/main-abc.js", isEntry: true } };
    writeManifest(m);
    expect(readManifest(tmpDir)).toEqual(m);
  });

  it("getEntryAssets extracts entry script paths", () => {
    const m = { "src/main.ts": { file: "assets/main-abc.js", isEntry: true, css: [] } };
    writeManifest(m);
    const { scripts, styles } = getEntryAssets(readManifest(tmpDir)!);
    expect(scripts).toEqual(["/assets/main-abc.js"]);
    expect(styles).toEqual([]);
  });

  it("getEntryAssets extracts CSS from entry chunks", () => {
    const m = { "src/main.ts": { file: "assets/main.js", isEntry: true, css: ["assets/main.css"] } };
    writeManifest(m);
    const { scripts, styles } = getEntryAssets(readManifest(tmpDir)!);
    expect(styles).toEqual(["/assets/main.css"]);
  });

  it("buildAssetTags returns empty string for null", () => {
    expect(buildAssetTags(null)).toBe("");
  });

  it("buildAssetTags injects script and link tags", () => {
    const m = { "main": { file: "assets/main.js", isEntry: true, css: ["assets/main.css"] } };
    writeManifest(m);
    const tags = buildAssetTags(readManifest(tmpDir));
    expect(tags).toContain('<script type="module" src="/assets/main.js">');
    expect(tags).toContain('<link rel="stylesheet" href="/assets/main.css"');
  });
});
