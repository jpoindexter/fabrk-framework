import fs from "node:fs";
import path from "node:path";
import type { Route } from "../runtime/router";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export interface SitemapOptions {
  /** Base URL of the site (e.g. "https://example.com"). */
  baseUrl: string;
  /** Routes discovered by the router. */
  routes: Route[];
  /** Loaded route modules (for dynamic sitemap exports). */
  modules?: Map<string, Record<string, unknown>>;
  /** Output directory (e.g. dist/client). */
  outDir: string;
}

// ---------------------------------------------------------------------------
// Sitemap generation
// ---------------------------------------------------------------------------

/**
 * Generate sitemap.xml and robots.txt in the output directory.
 *
 * Route modules can export a `sitemap()` function for dynamic entries,
 * or export `sitemap = false` to exclude the route.
 */
export async function generateSitemap(options: SitemapOptions): Promise<void> {
  const { baseUrl, routes, modules, outDir } = options;
  const normalizedBase = baseUrl.replace(/\/+$/, "");

  const entries: SitemapEntry[] = [];

  for (const route of routes) {
    // Only include page routes, not API routes
    if (route.type !== "page") continue;

    // Skip dynamic routes without generateStaticParams
    if (route.pattern.includes(":")) {
      const mod = modules?.get(route.filePath);
      if (!mod) continue;

      // Check for custom sitemap export
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

      // Skip dynamic routes with no sitemap export
      continue;
    }

    // Check for sitemap = false to exclude route
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
  return `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
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
