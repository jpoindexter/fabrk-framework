import { buildJsonLdScript } from "./json-ld";

export type {
  Metadata,
  MetadataTitle,
  OpenGraphMetadata,
  TwitterMetadata,
  IconMetadata,
  RobotsMetadata,
  AlternatesMetadata,
  GenerateMetadataContext,
} from "./metadata-types";
import type { Metadata, GenerateMetadataContext } from "./metadata-types";

export async function resolveMetadata(
  mod: Record<string, unknown>,
  context: GenerateMetadataContext
): Promise<Metadata> {
  if (typeof mod.generateMetadata === "function") {
    const result = await mod.generateMetadata(context);
    if (result && typeof result === "object") return result as Metadata;
  }

  if (mod.metadata && typeof mod.metadata === "object") {
    return mod.metadata as Metadata;
  }

  return {};
}

export function mergeMetadata(layers: Metadata[]): Metadata {
  if (layers.length === 0) return {};
  if (layers.length === 1) return layers[0];

  const merged: Metadata = {};
  let titleTemplate: string | undefined;

  for (const layer of layers) {
    if (layer.title !== undefined) {
      if (typeof layer.title === "object") {
        const titleObj = layer.title;
        if (titleObj.template) titleTemplate = titleObj.template;
        if (titleObj.absolute) {
          merged.title = titleObj.absolute;
          titleTemplate = undefined;
        } else if (titleObj.default) {
          merged.title = titleTemplate
            ? titleTemplate.replace("%s", titleObj.default)
            : titleObj.default;
        }
      } else {
        merged.title = titleTemplate
          ? titleTemplate.replace("%s", layer.title)
          : layer.title;
      }
    }

    if (layer.description !== undefined) merged.description = layer.description;
    if (layer.viewport !== undefined) merged.viewport = layer.viewport;
    if (layer.themeColor !== undefined) merged.themeColor = layer.themeColor;

    if (layer.openGraph) merged.openGraph = { ...merged.openGraph, ...layer.openGraph };
    if (layer.twitter) merged.twitter = { ...merged.twitter, ...layer.twitter };
    if (layer.icons) merged.icons = { ...merged.icons, ...layer.icons };
    if (layer.robots) merged.robots = { ...merged.robots, ...layer.robots };
    if (layer.alternates) {
      merged.alternates = {
        ...merged.alternates,
        ...layer.alternates,
        languages: { ...merged.alternates?.languages, ...layer.alternates?.languages },
      };
    }
    if (layer.other) merged.other = { ...merged.other, ...layer.other };
    if (layer.jsonLd !== undefined) merged.jsonLd = layer.jsonLd;
  }

  return merged;
}

export function resolveTitle(metadata: Metadata): string | undefined {
  if (!metadata.title) return undefined;
  if (typeof metadata.title === "string") return metadata.title;
  if (metadata.title.absolute) return metadata.title.absolute;
  return metadata.title.default;
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildRobotsContent(robots: NonNullable<Metadata["robots"]>): { robots?: string; googleBot?: string } {
  const parts: string[] = [];
  if (robots.index === false) parts.push("noindex");
  if (robots.follow === false) parts.push("nofollow");
  if (robots.noarchive) parts.push("noarchive");
  if (robots.nosnippet) parts.push("nosnippet");

  let googleBot: string | undefined;
  if (robots.googleBot) {
    const botParts: string[] = [];
    if (robots.googleBot.index === false) botParts.push("noindex");
    if (robots.googleBot.follow === false) botParts.push("nofollow");
    if (robots.googleBot.maxSnippet !== undefined) botParts.push(`max-snippet:${robots.googleBot.maxSnippet}`);
    if (robots.googleBot.maxImagePreview) botParts.push(`max-image-preview:${robots.googleBot.maxImagePreview}`);
    if (botParts.length > 0) googleBot = botParts.join(", ");
  }

  return {
    robots: parts.length > 0 ? parts.join(", ") : undefined,
    googleBot,
  };
}

export function buildMetadataHtml(metadata: Metadata): string {
  const parts: string[] = [];

  const title = resolveTitle(metadata);
  if (title) parts.push(`<title>${escapeAttr(title)}</title>`);
  if (metadata.description) parts.push(`<meta name="description" content="${escapeAttr(metadata.description)}" />`);
  if (metadata.viewport) parts.push(`<meta name="viewport" content="${escapeAttr(metadata.viewport)}" />`);
  if (metadata.themeColor) parts.push(`<meta name="theme-color" content="${escapeAttr(metadata.themeColor)}" />`);

  if (metadata.openGraph) {
    const og = metadata.openGraph;
    if (og.title) parts.push(`<meta property="og:title" content="${escapeAttr(og.title)}" />`);
    if (og.description) parts.push(`<meta property="og:description" content="${escapeAttr(og.description)}" />`);
    if (og.url) parts.push(`<meta property="og:url" content="${escapeAttr(og.url)}" />`);
    if (og.siteName) parts.push(`<meta property="og:site_name" content="${escapeAttr(og.siteName)}" />`);
    if (og.type) parts.push(`<meta property="og:type" content="${escapeAttr(og.type)}" />`);
    if (og.locale) parts.push(`<meta property="og:locale" content="${escapeAttr(og.locale)}" />`);
    if (og.images) {
      for (const img of og.images) {
        parts.push(`<meta property="og:image" content="${escapeAttr(img.url)}" />`);
        if (img.width) parts.push(`<meta property="og:image:width" content="${img.width}" />`);
        if (img.height) parts.push(`<meta property="og:image:height" content="${img.height}" />`);
        if (img.alt) parts.push(`<meta property="og:image:alt" content="${escapeAttr(img.alt)}" />`);
      }
    }
  }

  if (metadata.twitter) {
    const tw = metadata.twitter;
    if (tw.card) parts.push(`<meta name="twitter:card" content="${escapeAttr(tw.card)}" />`);
    if (tw.title) parts.push(`<meta name="twitter:title" content="${escapeAttr(tw.title)}" />`);
    if (tw.description) parts.push(`<meta name="twitter:description" content="${escapeAttr(tw.description)}" />`);
    if (tw.creator) parts.push(`<meta name="twitter:creator" content="${escapeAttr(tw.creator)}" />`);
    if (tw.site) parts.push(`<meta name="twitter:site" content="${escapeAttr(tw.site)}" />`);
    if (tw.images) {
      for (const img of tw.images) parts.push(`<meta name="twitter:image" content="${escapeAttr(img)}" />`);
    }
  }

  if (metadata.icons) {
    const icons = metadata.icons;
    if (typeof icons.icon === "string") {
      parts.push(`<link rel="icon" href="${escapeAttr(icons.icon)}" />`);
    } else if (Array.isArray(icons.icon)) {
      for (const ic of icons.icon) {
        let tag = `<link rel="icon" href="${escapeAttr(ic.url)}"`;
        if (ic.sizes) tag += ` sizes="${escapeAttr(ic.sizes)}"`;
        if (ic.type) tag += ` type="${escapeAttr(ic.type)}"`;
        parts.push(tag + " />");
      }
    }
    if (typeof icons.apple === "string") {
      parts.push(`<link rel="apple-touch-icon" href="${escapeAttr(icons.apple)}" />`);
    } else if (Array.isArray(icons.apple)) {
      for (const ic of icons.apple) {
        let tag = `<link rel="apple-touch-icon" href="${escapeAttr(ic.url)}"`;
        if (ic.sizes) tag += ` sizes="${escapeAttr(ic.sizes)}"`;
        parts.push(tag + " />");
      }
    }
  }

  if (metadata.robots) {
    const { robots: robotsContent, googleBot } = buildRobotsContent(metadata.robots);
    if (robotsContent) parts.push(`<meta name="robots" content="${escapeAttr(robotsContent)}" />`);
    if (googleBot) parts.push(`<meta name="googlebot" content="${escapeAttr(googleBot)}" />`);
  }

  if (metadata.alternates) {
    if (metadata.alternates.canonical) {
      parts.push(`<link rel="canonical" href="${escapeAttr(metadata.alternates.canonical)}" />`);
    }
    if (metadata.alternates.languages) {
      for (const [lang, href] of Object.entries(metadata.alternates.languages)) {
        parts.push(`<link rel="alternate" hreflang="${escapeAttr(lang)}" href="${escapeAttr(href)}" />`);
      }
    }
  }

  if (metadata.other) {
    for (const [name, content] of Object.entries(metadata.other)) {
      parts.push(`<meta name="${escapeAttr(name)}" content="${escapeAttr(content)}" />`);
    }
  }

  if (metadata.jsonLd) parts.push(buildJsonLdScript(metadata.jsonLd));

  return parts.join("\n  ");
}
