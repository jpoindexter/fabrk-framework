import { describe, it, expect } from "vitest";
import { safeJsonStringify } from "../runtime/safe-json";

describe("safeJsonStringify", () => {
  it("serializes basic objects", () => {
    const result = safeJsonStringify({ name: "test", count: 42 });
    expect(JSON.parse(result)).toEqual({ name: "test", count: 42 });
  });

  it("escapes < and > to prevent script tag injection", () => {
    const result = safeJsonStringify({ html: "</script><script>alert(1)" });
    expect(result).not.toContain("</script>");
    expect(result).toContain("\\u003c");
    expect(result).toContain("\\u003e");
    // Still valid JSON when parsed
    expect(JSON.parse(result)).toEqual({ html: "</script><script>alert(1)" });
  });

  it("escapes & to prevent HTML entity issues", () => {
    const result = safeJsonStringify({ text: "foo & bar" });
    expect(result).not.toContain("&");
    expect(result).toContain("\\u0026");
    expect(JSON.parse(result)).toEqual({ text: "foo & bar" });
  });

  it("handles undefined", () => {
    expect(safeJsonStringify(undefined)).toBe("undefined");
  });

  it("handles null", () => {
    expect(safeJsonStringify(null)).toBe("null");
  });

  it("handles arrays", () => {
    const result = safeJsonStringify(["<script>", "normal"]);
    expect(result).not.toContain("<script>");
    expect(JSON.parse(result)).toEqual(["<script>", "normal"]);
  });

  it("handles nested objects", () => {
    const result = safeJsonStringify({ a: { b: "<img onerror=alert(1)>" } });
    expect(result).not.toContain("<");
    expect(JSON.parse(result).a.b).toBe("<img onerror=alert(1)>");
  });
});
