import { describe, it, expect } from "vitest";
import { buildJsonLdScript, type JsonLdData } from "../runtime/json-ld";
import { buildMetadataHtml, type Metadata } from "../runtime/metadata";

describe("buildJsonLdScript", () => {
  it("wraps data in script tag with application/ld+json type", () => {
    const data: JsonLdData = { "@type": "Organization", name: "Acme" };
    const result = buildJsonLdScript(data);
    expect(result).toContain('<script type="application/ld+json">');
    expect(result).toContain("</script>");
  });

  it("auto-injects @context when missing", () => {
    const data: JsonLdData = { "@type": "Organization", name: "Acme" };
    const result = buildJsonLdScript(data);
    expect(result).toContain("https://schema.org");
  });

  it("preserves existing @context", () => {
    const data: JsonLdData = {
      "@context": "https://custom.org",
      "@type": "Thing",
      name: "Test",
    };
    const result = buildJsonLdScript(data);
    expect(result).toContain("https://custom.org");
    expect(result).not.toContain("https://schema.org");
  });

  it("handles array of data objects", () => {
    const data: JsonLdData[] = [
      { "@type": "Organization", name: "Acme" },
      { "@type": "Product", name: "Widget" },
    ];
    const result = buildJsonLdScript(data);
    const parsed = JSON.parse(
      result.replace(/<script type="application\/ld\+json">/, "").replace(/<\/script>/, "")
        .replace(/\\u003c/g, "<").replace(/\\u003e/g, ">").replace(/\\u0026/g, "&")
    );
    expect(parsed).toHaveLength(2);
    expect(parsed[0]["@type"]).toBe("Organization");
    expect(parsed[1]["@type"]).toBe("Product");
  });

  it("escapes < > & in JSON content to prevent XSS", () => {
    const data: JsonLdData = { "@type": "Article", headline: "A < B > C & D" };
    const result = buildJsonLdScript(data);
    // The wrapper tag itself contains <script, but the JSON content must not
    const jsonContent = result
      .replace('<script type="application/ld+json">', "")
      .replace("</script>", "");
    expect(jsonContent).not.toContain("<");
    expect(jsonContent).not.toContain(">");
    expect(jsonContent).not.toContain("&");
    expect(jsonContent).toContain("\\u003c");
    expect(jsonContent).toContain("\\u003e");
    expect(jsonContent).toContain("\\u0026");
  });
});

describe("buildMetadataHtml with jsonLd", () => {
  it("includes JSON-LD script tag when jsonLd is set", () => {
    const metadata: Metadata = {
      title: "Test",
      jsonLd: { "@type": "Organization", name: "Acme" },
    };
    const html = buildMetadataHtml(metadata);
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain("Organization");
  });

  it("omits JSON-LD when not set", () => {
    const metadata: Metadata = { title: "Test" };
    const html = buildMetadataHtml(metadata);
    expect(html).not.toContain("application/ld+json");
  });

  it("supports array of JSON-LD objects", () => {
    const metadata: Metadata = {
      jsonLd: [
        { "@type": "Organization", name: "A" },
        { "@type": "Product", name: "B" },
      ],
    };
    const html = buildMetadataHtml(metadata);
    expect(html).toContain("Organization");
    expect(html).toContain("Product");
  });
});
