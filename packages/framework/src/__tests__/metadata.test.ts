import { describe, it, expect } from "vitest";
import {
  resolveMetadata,
  mergeMetadata,
  resolveTitle,
  buildMetadataHtml,
  type Metadata,
} from "../runtime/metadata";

describe("resolveMetadata", () => {
  it("returns static metadata export", async () => {
    const mod = {
      metadata: { title: "Hello", description: "World" },
    };
    const result = await resolveMetadata(mod, { params: {} });
    expect(result.title).toBe("Hello");
    expect(result.description).toBe("World");
  });

  it("calls generateMetadata when available", async () => {
    const mod = {
      metadata: { title: "Static" },
      generateMetadata: async ({ params }: { params: Record<string, string> }) => ({
        title: `Post: ${params.slug}`,
      }),
    };
    const result = await resolveMetadata(mod, { params: { slug: "hello" } });
    expect(result.title).toBe("Post: hello");
  });

  it("prefers generateMetadata over static metadata", async () => {
    const mod = {
      metadata: { title: "Static" },
      generateMetadata: async () => ({ title: "Dynamic" }),
    };
    const result = await resolveMetadata(mod, { params: {} });
    expect(result.title).toBe("Dynamic");
  });

  it("returns empty object when no metadata", async () => {
    const result = await resolveMetadata({}, { params: {} });
    expect(result).toEqual({});
  });
});

describe("mergeMetadata", () => {
  it("returns empty for empty array", () => {
    expect(mergeMetadata([])).toEqual({});
  });

  it("returns single metadata as-is", () => {
    const m: Metadata = { title: "Test", description: "Desc" };
    expect(mergeMetadata([m])).toEqual(m);
  });

  it("child title overrides parent", () => {
    const parent: Metadata = { title: "Parent" };
    const child: Metadata = { title: "Child" };
    const merged = mergeMetadata([parent, child]);
    expect(resolveTitle(merged)).toBe("Child");
  });

  it("applies title template from parent", () => {
    const root: Metadata = {
      title: { default: "Home", template: "%s | My Site" },
    };
    const page: Metadata = { title: "About" };
    const merged = mergeMetadata([root, page]);
    expect(resolveTitle(merged)).toBe("About | My Site");
  });

  it("absolute title skips template", () => {
    const root: Metadata = {
      title: { default: "Home", template: "%s | My Site" },
    };
    const page: Metadata = { title: { default: "", absolute: "Override" } };
    const merged = mergeMetadata([root, page]);
    expect(resolveTitle(merged)).toBe("Override");
  });

  it("deep merges openGraph", () => {
    const parent: Metadata = {
      openGraph: { siteName: "My Site", type: "website" },
    };
    const child: Metadata = {
      openGraph: { title: "Page Title", description: "Page desc" },
    };
    const merged = mergeMetadata([parent, child]);
    expect(merged.openGraph?.siteName).toBe("My Site");
    expect(merged.openGraph?.title).toBe("Page Title");
    expect(merged.openGraph?.type).toBe("website");
  });

  it("deep merges twitter", () => {
    const parent: Metadata = {
      twitter: { site: "@mysite", card: "summary_large_image" },
    };
    const child: Metadata = {
      twitter: { title: "Page Title" },
    };
    const merged = mergeMetadata([parent, child]);
    expect(merged.twitter?.site).toBe("@mysite");
    expect(merged.twitter?.title).toBe("Page Title");
  });

  it("child description overrides parent", () => {
    const parent: Metadata = { description: "Parent desc" };
    const child: Metadata = { description: "Child desc" };
    const merged = mergeMetadata([parent, child]);
    expect(merged.description).toBe("Child desc");
  });

  it("merges alternates languages", () => {
    const parent: Metadata = {
      alternates: { languages: { en: "/en", fr: "/fr" } },
    };
    const child: Metadata = {
      alternates: { canonical: "/page", languages: { de: "/de" } },
    };
    const merged = mergeMetadata([parent, child]);
    expect(merged.alternates?.canonical).toBe("/page");
    expect(merged.alternates?.languages?.en).toBe("/en");
    expect(merged.alternates?.languages?.de).toBe("/de");
  });

  it("three-layer merge with template propagation", () => {
    const root: Metadata = {
      title: { default: "Home", template: "%s | My Site" },
      description: "Root desc",
    };
    const section: Metadata = {
      title: { default: "Blog", template: "%s - Blog | My Site" },
    };
    const page: Metadata = {
      title: "Hello World",
      description: "A blog post",
    };
    const merged = mergeMetadata([root, section, page]);
    expect(resolveTitle(merged)).toBe("Hello World - Blog | My Site");
    expect(merged.description).toBe("A blog post");
  });
});

describe("buildMetadataHtml", () => {
  it("renders title tag", () => {
    const html = buildMetadataHtml({ title: "Test Page" });
    expect(html).toContain("<title>Test Page</title>");
  });

  it("renders description meta", () => {
    const html = buildMetadataHtml({ description: "A test page" });
    expect(html).toContain('name="description"');
    expect(html).toContain('content="A test page"');
  });

  it("renders OG tags", () => {
    const html = buildMetadataHtml({
      openGraph: {
        title: "OG Title",
        images: [{ url: "https://example.com/img.png", width: 1200 }],
      },
    });
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('property="og:image:width"');
  });

  it("renders canonical link", () => {
    const html = buildMetadataHtml({
      alternates: { canonical: "https://example.com/page" },
    });
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('href="https://example.com/page"');
  });

  it("escapes special characters in attributes", () => {
    const html = buildMetadataHtml({ title: 'Test "with" <quotes>' });
    expect(html).not.toContain('"with"');
    expect(html).toContain("&quot;with&quot;");
  });

  it("renders hreflang link tags from alternates.languages", () => {
    const html = buildMetadataHtml({
      alternates: {
        canonical: "https://example.com",
        languages: { en: "https://example.com/en", fr: "https://example.com/fr" },
      },
    });
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('hreflang="en"');
    expect(html).toContain('href="https://example.com/en"');
    expect(html).toContain('hreflang="fr"');
    expect(html).toContain('href="https://example.com/fr"');
  });

  it("renders icon link tag from string", () => {
    const html = buildMetadataHtml({ icons: { icon: "/favicon.ico" } });
    expect(html).toContain('rel="icon"');
    expect(html).toContain('href="/favicon.ico"');
  });

  it("renders icon link tags from array with sizes and type", () => {
    const html = buildMetadataHtml({
      icons: {
        icon: [
          { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
          { url: "/icon-16.png", sizes: "16x16" },
        ],
      },
    });
    expect(html).toContain('href="/icon-32.png"');
    expect(html).toContain('sizes="32x32"');
    expect(html).toContain('type="image/png"');
    expect(html).toContain('href="/icon-16.png"');
    expect(html).toContain('sizes="16x16"');
  });

  it("renders apple-touch-icon from string", () => {
    const html = buildMetadataHtml({ icons: { apple: "/apple-icon.png" } });
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('href="/apple-icon.png"');
  });

  it("renders apple-touch-icon from array", () => {
    const html = buildMetadataHtml({
      icons: { apple: [{ url: "/apple-180.png", sizes: "180x180" }] },
    });
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('href="/apple-180.png"');
    expect(html).toContain('sizes="180x180"');
  });

  it("renders robots meta tag", () => {
    const html = buildMetadataHtml({
      robots: { index: false, follow: false, noarchive: true },
    });
    expect(html).toContain('name="robots"');
    expect(html).toContain("noindex");
    expect(html).toContain("nofollow");
    expect(html).toContain("noarchive");
  });

  it("renders googlebot meta tag", () => {
    const html = buildMetadataHtml({
      robots: {
        googleBot: {
          index: false,
          maxSnippet: 150,
          maxImagePreview: "large",
        },
      },
    });
    expect(html).toContain('name="googlebot"');
    expect(html).toContain("noindex");
    expect(html).toContain("max-snippet:150");
    expect(html).toContain("max-image-preview:large");
  });

  it("omits robots tag when no directives are active", () => {
    const html = buildMetadataHtml({ robots: {} });
    expect(html).not.toContain('name="robots"');
    expect(html).not.toContain('name="googlebot"');
  });

  it("renders twitter:image tags", () => {
    const html = buildMetadataHtml({
      twitter: { images: ["https://example.com/a.png", "https://example.com/b.png"] },
    });
    expect(html).toContain('name="twitter:image"');
    expect(html).toContain('content="https://example.com/a.png"');
    expect(html).toContain('content="https://example.com/b.png"');
  });
});
