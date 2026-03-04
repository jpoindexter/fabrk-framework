import React from "react";
import { buildJsonLdScript, JsonLdScript, type JsonLdData } from "./json-ld";

export interface MetadataTitle {
  /** Default title when no child overrides. */
  default: string;
  /** Template with %s placeholder, e.g. "%s | My Site". */
  template?: string;
  /** If set, ignores template entirely. */
  absolute?: string;
}

export interface OpenGraphMetadata {
  title?: string;
  description?: string;
  url?: string;
  siteName?: string;
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  }>;
  locale?: string;
  type?: string;
}

export interface TwitterMetadata {
  card?: "summary" | "summary_large_image" | "app" | "player";
  title?: string;
  description?: string;
  images?: string[];
  creator?: string;
  site?: string;
}

export interface IconMetadata {
  icon?: string | Array<{ url: string; sizes?: string; type?: string }>;
  apple?: string | Array<{ url: string; sizes?: string }>;
}

export interface RobotsMetadata {
  index?: boolean;
  follow?: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  googleBot?: {
    index?: boolean;
    follow?: boolean;
    maxSnippet?: number;
    maxImagePreview?: "none" | "standard" | "large";
  };
}

export interface AlternatesMetadata {
  canonical?: string;
  languages?: Record<string, string>;
}

export interface Metadata {
  title?: string | MetadataTitle;
  description?: string;
  openGraph?: OpenGraphMetadata;
  twitter?: TwitterMetadata;
  icons?: IconMetadata;
  robots?: RobotsMetadata;
  alternates?: AlternatesMetadata;
  viewport?: string;
  themeColor?: string;
  /** Arbitrary key-value pairs for <meta name="key" content="value"> tags. */
  other?: Record<string, string>;
  /** JSON-LD structured data. Single object or array of objects. */
  jsonLd?: JsonLdData | JsonLdData[];
}

export interface GenerateMetadataContext {
  params: Record<string, string>;
  searchParams?: Record<string, string>;
}

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

    if (layer.openGraph) {
      merged.openGraph = { ...merged.openGraph, ...layer.openGraph };
    }
    if (layer.twitter) {
      merged.twitter = { ...merged.twitter, ...layer.twitter };
    }
    if (layer.icons) {
      merged.icons = { ...merged.icons, ...layer.icons };
    }
    if (layer.robots) {
      merged.robots = { ...merged.robots, ...layer.robots };
    }
    if (layer.alternates) {
      merged.alternates = {
        ...merged.alternates,
        ...layer.alternates,
        languages: {
          ...merged.alternates?.languages,
          ...layer.alternates?.languages,
        },
      };
    }
    if (layer.other) {
      merged.other = { ...merged.other, ...layer.other };
    }
    if (layer.jsonLd !== undefined) {
      merged.jsonLd = layer.jsonLd;
    }
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

/**
 * Renders <head> tags. React 19 auto-hoists <title>, <meta>, <link> to <head>.
 */
export function MetadataHead({ metadata }: { metadata: Metadata }): React.ReactElement {
  const elements: React.ReactElement[] = [];
  let key = 0;

  const title = resolveTitle(metadata);
  if (title) {
    elements.push(React.createElement("title", { key: key++ }, title));
  }

  if (metadata.description) {
    elements.push(
      React.createElement("meta", {
        key: key++,
        name: "description",
        content: metadata.description,
      })
    );
  }

  if (metadata.viewport) {
    elements.push(
      React.createElement("meta", {
        key: key++,
        name: "viewport",
        content: metadata.viewport,
      })
    );
  }

  if (metadata.themeColor) {
    elements.push(
      React.createElement("meta", {
        key: key++,
        name: "theme-color",
        content: metadata.themeColor,
      })
    );
  }

  if (metadata.openGraph) {
    const og = metadata.openGraph;
    if (og.title) {
      elements.push(
        React.createElement("meta", {
          key: key++,
          property: "og:title",
          content: og.title,
        })
      );
    }
    if (og.description) {
      elements.push(
        React.createElement("meta", {
          key: key++,
          property: "og:description",
          content: og.description,
        })
      );
    }
    if (og.url) {
      elements.push(
        React.createElement("meta", {
          key: key++,
          property: "og:url",
          content: og.url,
        })
      );
    }
    if (og.siteName) {
      elements.push(
        React.createElement("meta", {
          key: key++,
          property: "og:site_name",
          content: og.siteName,
        })
      );
    }
    if (og.type) {
      elements.push(
        React.createElement("meta", {
          key: key++,
          property: "og:type",
          content: og.type,
        })
      );
    }
    if (og.locale) {
      elements.push(
        React.createElement("meta", {
          key: key++,
          property: "og:locale",
          content: og.locale,
        })
      );
    }
    if (og.images) {
      for (const img of og.images) {
        elements.push(
          React.createElement("meta", {
            key: key++,
            property: "og:image",
            content: img.url,
          })
        );
        if (img.width) {
          elements.push(
            React.createElement("meta", {
              key: key++,
              property: "og:image:width",
              content: String(img.width),
            })
          );
        }
        if (img.height) {
          elements.push(
            React.createElement("meta", {
              key: key++,
              property: "og:image:height",
              content: String(img.height),
            })
          );
        }
        if (img.alt) {
          elements.push(
            React.createElement("meta", {
              key: key++,
              property: "og:image:alt",
              content: img.alt,
            })
          );
        }
      }
    }
  }

  if (metadata.twitter) {
    const tw = metadata.twitter;
    if (tw.card) {
      elements.push(
        React.createElement("meta", {
          key: key++,
          name: "twitter:card",
          content: tw.card,
        })
      );
    }
    if (tw.title) {
      elements.push(
        React.createElement("meta", {
          key: key++,
          name: "twitter:title",
          content: tw.title,
        })
      );
    }
    if (tw.description) {
      elements.push(
        React.createElement("meta", {
          key: key++,
          name: "twitter:description",
          content: tw.description,
        })
      );
    }
    if (tw.creator) {
      elements.push(
        React.createElement("meta", {
          key: key++,
          name: "twitter:creator",
          content: tw.creator,
        })
      );
    }
    if (tw.site) {
      elements.push(
        React.createElement("meta", {
          key: key++,
          name: "twitter:site",
          content: tw.site,
        })
      );
    }
    if (tw.images) {
      for (const img of tw.images) {
        elements.push(
          React.createElement("meta", {
            key: key++,
            name: "twitter:image",
            content: img,
          })
        );
      }
    }
  }

  if (metadata.icons) {
    const icons = metadata.icons;
    if (typeof icons.icon === "string") {
      elements.push(
        React.createElement("link", {
          key: key++,
          rel: "icon",
          href: icons.icon,
        })
      );
    } else if (Array.isArray(icons.icon)) {
      for (const ic of icons.icon) {
        elements.push(
          React.createElement("link", {
            key: key++,
            rel: "icon",
            href: ic.url,
            sizes: ic.sizes,
            type: ic.type,
          })
        );
      }
    }
    if (typeof icons.apple === "string") {
      elements.push(
        React.createElement("link", {
          key: key++,
          rel: "apple-touch-icon",
          href: icons.apple,
        })
      );
    } else if (Array.isArray(icons.apple)) {
      for (const ic of icons.apple) {
        elements.push(
          React.createElement("link", {
            key: key++,
            rel: "apple-touch-icon",
            href: ic.url,
            sizes: ic.sizes,
          })
        );
      }
    }
  }

  if (metadata.robots) {
    const parts: string[] = [];
    if (metadata.robots.index === false) parts.push("noindex");
    if (metadata.robots.follow === false) parts.push("nofollow");
    if (metadata.robots.noarchive) parts.push("noarchive");
    if (metadata.robots.nosnippet) parts.push("nosnippet");
    if (parts.length > 0) {
      elements.push(
        React.createElement("meta", {
          key: key++,
          name: "robots",
          content: parts.join(", "),
        })
      );
    }
    if (metadata.robots.googleBot) {
      const botParts: string[] = [];
      if (metadata.robots.googleBot.index === false) botParts.push("noindex");
      if (metadata.robots.googleBot.follow === false) botParts.push("nofollow");
      if (metadata.robots.googleBot.maxSnippet !== undefined) {
        botParts.push(`max-snippet:${metadata.robots.googleBot.maxSnippet}`);
      }
      if (metadata.robots.googleBot.maxImagePreview) {
        botParts.push(
          `max-image-preview:${metadata.robots.googleBot.maxImagePreview}`
        );
      }
      if (botParts.length > 0) {
        elements.push(
          React.createElement("meta", {
            key: key++,
            name: "googlebot",
            content: botParts.join(", "),
          })
        );
      }
    }
  }

  if (metadata.alternates) {
    if (metadata.alternates.canonical) {
      elements.push(
        React.createElement("link", {
          key: key++,
          rel: "canonical",
          href: metadata.alternates.canonical,
        })
      );
    }
    if (metadata.alternates.languages) {
      for (const [lang, href] of Object.entries(
        metadata.alternates.languages
      )) {
        elements.push(
          React.createElement("link", {
            key: key++,
            rel: "alternate",
            hrefLang: lang,
            href,
          })
        );
      }
    }
  }

  if (metadata.other) {
    for (const [name, content] of Object.entries(metadata.other)) {
      elements.push(
        React.createElement("meta", { key: key++, name, content })
      );
    }
  }

  if (metadata.jsonLd) {
    elements.push(
      React.createElement(JsonLdScript, { key: key++, data: metadata.jsonLd })
    );
  }

  return React.createElement(React.Fragment, null, ...elements);
}

export function buildMetadataHtml(metadata: Metadata): string {
  const parts: string[] = [];

  const title = resolveTitle(metadata);
  if (title) {
    parts.push(`<title>${escapeAttr(title)}</title>`);
  }

  if (metadata.description) {
    parts.push(
      `<meta name="description" content="${escapeAttr(metadata.description)}" />`
    );
  }

  if (metadata.viewport) {
    parts.push(
      `<meta name="viewport" content="${escapeAttr(metadata.viewport)}" />`
    );
  }

  if (metadata.themeColor) {
    parts.push(
      `<meta name="theme-color" content="${escapeAttr(metadata.themeColor)}" />`
    );
  }

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
      for (const img of tw.images) {
        parts.push(`<meta name="twitter:image" content="${escapeAttr(img)}" />`);
      }
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
        tag += " />";
        parts.push(tag);
      }
    }
    if (typeof icons.apple === "string") {
      parts.push(`<link rel="apple-touch-icon" href="${escapeAttr(icons.apple)}" />`);
    } else if (Array.isArray(icons.apple)) {
      for (const ic of icons.apple) {
        let tag = `<link rel="apple-touch-icon" href="${escapeAttr(ic.url)}"`;
        if (ic.sizes) tag += ` sizes="${escapeAttr(ic.sizes)}"`;
        tag += " />";
        parts.push(tag);
      }
    }
  }

  if (metadata.robots) {
    const robotsParts: string[] = [];
    if (metadata.robots.index === false) robotsParts.push("noindex");
    if (metadata.robots.follow === false) robotsParts.push("nofollow");
    if (metadata.robots.noarchive) robotsParts.push("noarchive");
    if (metadata.robots.nosnippet) robotsParts.push("nosnippet");
    if (robotsParts.length > 0) {
      parts.push(`<meta name="robots" content="${escapeAttr(robotsParts.join(", "))}" />`);
    }
    if (metadata.robots.googleBot) {
      const botParts: string[] = [];
      if (metadata.robots.googleBot.index === false) botParts.push("noindex");
      if (metadata.robots.googleBot.follow === false) botParts.push("nofollow");
      if (metadata.robots.googleBot.maxSnippet !== undefined) {
        botParts.push(`max-snippet:${metadata.robots.googleBot.maxSnippet}`);
      }
      if (metadata.robots.googleBot.maxImagePreview) {
        botParts.push(`max-image-preview:${metadata.robots.googleBot.maxImagePreview}`);
      }
      if (botParts.length > 0) {
        parts.push(`<meta name="googlebot" content="${escapeAttr(botParts.join(", "))}" />`);
      }
    }
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

  if (metadata.jsonLd) {
    parts.push(buildJsonLdScript(metadata.jsonLd));
  }

  return parts.join("\n  ");
}
