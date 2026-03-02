import { describe, it, expect } from "vitest";
import { parseImageParams, negotiateImageFormat } from "../client/image";

describe("parseImageParams", () => {
  it("parses valid params", () => {
    const params = new URLSearchParams("url=/images/hero.jpg&w=800&q=80");
    const result = parseImageParams(params);
    expect(result).toEqual({ url: "/images/hero.jpg", width: 800, quality: 80 });
  });

  it("defaults quality to 75", () => {
    const params = new URLSearchParams("url=/img.png&w=640");
    const result = parseImageParams(params);
    expect(result?.quality).toBe(75);
  });

  it("rejects missing url", () => {
    const params = new URLSearchParams("w=800");
    expect(parseImageParams(params)).toBeNull();
  });

  it("rejects missing width", () => {
    const params = new URLSearchParams("url=/img.png");
    expect(parseImageParams(params)).toBeNull();
  });

  it("rejects absolute URLs (SSRF protection)", () => {
    const params = new URLSearchParams(
      "url=https://evil.com/secret&w=800"
    );
    expect(parseImageParams(params)).toBeNull();
  });

  it("rejects protocol-relative URLs", () => {
    const params = new URLSearchParams("url=//evil.com/img.png&w=800");
    expect(parseImageParams(params)).toBeNull();
  });

  it("rejects path traversal", () => {
    const params = new URLSearchParams("url=/../../etc/passwd&w=800");
    expect(parseImageParams(params)).toBeNull();
  });

  it("rejects width below minimum", () => {
    const params = new URLSearchParams("url=/img.png&w=5");
    expect(parseImageParams(params)).toBeNull();
  });

  it("rejects width above maximum", () => {
    const params = new URLSearchParams("url=/img.png&w=5000");
    expect(parseImageParams(params)).toBeNull();
  });

  it("rejects invalid quality", () => {
    const params = new URLSearchParams("url=/img.png&w=800&q=0");
    expect(parseImageParams(params)).toBeNull();
  });

  it("rejects quality above 100", () => {
    const params = new URLSearchParams("url=/img.png&w=800&q=101");
    expect(parseImageParams(params)).toBeNull();
  });

  it("rejects NaN width", () => {
    const params = new URLSearchParams("url=/img.png&w=abc");
    expect(parseImageParams(params)).toBeNull();
  });
});

describe("negotiateImageFormat", () => {
  it("returns avif when accepted", () => {
    expect(negotiateImageFormat("image/avif,image/webp,*/*")).toBe("avif");
  });

  it("returns webp when avif not accepted", () => {
    expect(negotiateImageFormat("image/webp,*/*")).toBe("webp");
  });

  it("returns jpeg as fallback", () => {
    expect(negotiateImageFormat("image/png,*/*")).toBe("jpeg");
  });

  it("returns jpeg for null header", () => {
    expect(negotiateImageFormat(null)).toBe("jpeg");
  });
});
