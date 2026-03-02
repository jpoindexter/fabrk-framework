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
});
