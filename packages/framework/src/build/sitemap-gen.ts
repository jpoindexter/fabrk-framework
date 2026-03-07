import fs from "node:fs";
import path from "node:path";
import type { Route } from "../runtime/router";
import { stripTrailingSlashes } from "../runtime/server-helpers";

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export interface SitemapOptions {
  baseUrl: string;
  routes: Route[];
  modules?: Map<string, Record<string, unknown>>;
  outDir: string;
}

export async function generateSitemap(options: SitemapOptions): Promise<void> {
  const { baseUrl, routes, modules, outDir } = options;
  const normalizedBase = stripTrailingSlashes(baseUrl);

  const entries: SitemapEntry[] = [];

  for (const route of routes) {
    if (route.type !== "page") continue;

    if (route.pattern.includes(":")) {
      const mod = modules?.get(route.filePath);
      if (!mod) continue;

      if (typeof mod.sitemap === "function") {
        const dynamicEntries = await mod.sitemap();
        if (Array.isArray(dynamicEntries)) {
          for (const entry of dynamicEntries) {
            if (entry && typeof entry.loc === "string") {
              entries.push({
                loc: `${normalizedBase}${entry.loc}`,
                lastmod: entry.lastmod,
                changefreq: entry.changefreq,
                priority: entry.priority,
              });
            }
          }
        }
        continue;
      }

      continue;
    }

    const mod = modules?.get(route.filePath);
    if (mod?.sitemap === false) continue;

    entries.push({
      loc: `${normalizedBase}${route.pattern === "/" ? "/" : route.pattern}`,
      changefreq: "weekly",
      priority: route.pattern === "/" ? 1.0 : 0.7,
    });
  }

  const xml = buildSitemapXml(entries);
  const robots = buildRobotsTxt(normalizedBase);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "sitemap.xml"), xml, "utf-8");
  fs.writeFileSync(path.join(outDir, "robots.txt"), robots, "utf-8");
}

function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries.map((entry) => {
    const parts = [`    <loc>${escapeXml(entry.loc)}</loc>`];
    if (entry.lastmod) parts.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
    if (entry.changefreq) parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    if (entry.priority !== undefined) parts.push(`    <priority>${entry.priority}</priority>`);
    return `  <url>\n${parts.join("\n")}\n  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

function buildRobotsTxt(baseUrl: string): string {
  // Strip newlines and carriage returns to prevent robots.txt directive injection.
  // A baseUrl containing \n could inject arbitrary User-agent/Disallow lines.
  // eslint-disable-next-line no-control-regex
  const safeBase = baseUrl.replace(/[\r\n\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
  return `User-agent: *
Allow: /

Sitemap: ${safeBase}/sitemap.xml
`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
