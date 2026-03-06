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
  jsonLd?: import("./json-ld").JsonLdData | import("./json-ld").JsonLdData[];
}

export interface GenerateMetadataContext {
  params: Record<string, string>;
  searchParams?: Record<string, string>;
}
