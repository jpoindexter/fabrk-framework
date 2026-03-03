import { describe, it, expect, beforeEach } from "vitest";
import {
  definePromptVersion,
  resolvePrompt,
  abTestPrompt,
  clearPromptRegistry,
} from "../agents/prompt-registry";

beforeEach(() => {
  clearPromptRegistry();
});

describe("definePromptVersion", () => {
  it("throws when versions array is empty", () => {
    expect(() => definePromptVersion("p", [])).toThrow();
  });

  it("throws when version id is empty string", () => {
    expect(() =>
      definePromptVersion("p", [{ id: "", version: "v1", template: "t" }])
    ).toThrow();
  });

  it("throws on non-finite weight", () => {
    expect(() =>
      definePromptVersion("p", [{ id: "a", version: "v1", template: "t", weight: NaN }])
    ).toThrow();
    expect(() =>
      definePromptVersion("p", [{ id: "a", version: "v1", template: "t", weight: Infinity }])
    ).toThrow();
    expect(() =>
      definePromptVersion("p", [{ id: "a", version: "v1", template: "t", weight: -1 }])
    ).toThrow();
  });

  it("stores versions for later retrieval", () => {
    definePromptVersion("p", [
      { id: "a", version: "v1", template: "hello" },
      { id: "b", version: "v2", template: "world" },
    ]);
    expect(resolvePrompt("p")).toBe("world");
  });
});

describe("resolvePrompt", () => {
  beforeEach(() => {
    definePromptVersion("greet", [
      { id: "old", version: "v1", template: "Hi there" },
      { id: "new", version: "v2", template: "Hey!" },
    ]);
  });

  it("throws when prompt name not registered", () => {
    expect(() => resolvePrompt("missing")).toThrow();
  });

  it("returns latest version template when no versionId", () => {
    expect(resolvePrompt("greet")).toBe("Hey!");
  });

  it("returns specific version by id", () => {
    expect(resolvePrompt("greet", { versionId: "old" })).toBe("Hi there");
  });

  it("returns specific version by version string", () => {
    expect(resolvePrompt("greet", { versionId: "v1" })).toBe("Hi there");
  });

  it("throws when versionId not found", () => {
    expect(() => resolvePrompt("greet", { versionId: "nonexistent" })).toThrow();
  });
});

describe("abTestPrompt", () => {
  it("throws when prompt name not registered", () => {
    expect(() => abTestPrompt("missing", "user-1")).toThrow();
  });

  it("returns deterministic result for same userId", () => {
    definePromptVersion("ab", [
      { id: "x", version: "v1", template: "X" },
      { id: "y", version: "v2", template: "Y" },
    ]);
    const first = abTestPrompt("ab", "user-42");
    const second = abTestPrompt("ab", "user-42");
    expect(first.versionId).toBe(second.versionId);
    expect(first.template).toBe(second.template);
  });

  it("returns different results for different userIds (across a batch)", () => {
    definePromptVersion("ab", [
      { id: "x", version: "v1", template: "X" },
      { id: "y", version: "v2", template: "Y" },
    ]);
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      seen.add(abTestPrompt("ab", `user-${i}`).versionId);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("respects weights — higher weight versions appear more frequently", () => {
    definePromptVersion("weighted", [
      { id: "A", version: "v1", template: "A", weight: 9 },
      { id: "B", version: "v2", template: "B", weight: 1 },
    ]);
    let countA = 0;
    for (let i = 0; i < 50; i++) {
      if (abTestPrompt("weighted", `u-${i}`).versionId === "A") countA++;
    }
    expect(countA).toBeGreaterThanOrEqual(35);
  });

  it("single version always returns that version", () => {
    definePromptVersion("solo", [{ id: "only", version: "v1", template: "sole" }]);
    for (let i = 0; i < 10; i++) {
      expect(abTestPrompt("solo", `user-${i}`).versionId).toBe("only");
    }
  });
});
