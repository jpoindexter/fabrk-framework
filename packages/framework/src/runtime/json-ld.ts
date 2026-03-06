import React from "react";

export interface JsonLdOrganization {
  "@type": "Organization";
  "@context"?: string;
  name: string;
  url?: string;
  logo?: string;
  sameAs?: string[];
}

export interface JsonLdProduct {
  "@type": "Product";
  "@context"?: string;
  name: string;
  description?: string;
  image?: string | string[];
  brand?: { "@type": "Brand"; name: string };
  offers?: {
    "@type": "Offer";
    price: number | string;
    priceCurrency: string;
    availability?: string;
    url?: string;
  };
}

export interface JsonLdArticle {
  "@type": "Article" | "BlogPosting" | "NewsArticle";
  "@context"?: string;
  headline: string;
  author?: { "@type": "Person"; name: string; url?: string } | string;
  datePublished?: string;
  dateModified?: string;
  image?: string | string[];
  description?: string;
  publisher?: { "@type": "Organization"; name: string; logo?: { "@type": "ImageObject"; url: string } };
}

export interface JsonLdBreadcrumb {
  "@type": "BreadcrumbList";
  "@context"?: string;
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item?: string;
  }>;
}

export type JsonLdData = Record<string, unknown>;

function escapeJsonLd(json: string): string {
  return json.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function normalizeData(data: JsonLdData): JsonLdData {
  if (!data["@context"]) {
    return { "@context": "https://schema.org", ...data };
  }
  return data;
}

export function buildJsonLdScript(data: JsonLdData | JsonLdData[]): string {
  const items = Array.isArray(data) ? data.map(normalizeData) : normalizeData(data);
  const json = escapeJsonLd(JSON.stringify(items));
  return `<script type="application/ld+json">${json}</script>`;
}

/**
 * React component for JSON-LD structured data.
 * Uses dangerouslySetInnerHTML which is safe here because:
 * - Input is always JSON.stringify'd (no raw HTML)
 * - The data comes from developer-defined metadata, not user input
 * - This is the standard React pattern for injecting JSON-LD (used by Next.js)
 */
export function JsonLdScript({
  data,
}: {
  data: JsonLdData | JsonLdData[];
}): React.ReactElement {
  const items = Array.isArray(data) ? data.map(normalizeData) : normalizeData(data);
  const json = escapeJsonLd(JSON.stringify(items));
  return React.createElement("script", {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: json },
  });
}
