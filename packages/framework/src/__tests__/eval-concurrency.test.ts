import { describe, it, expect } from "vitest";
import { defineEval, runEvals } from "../testing/evals";
import { mockLLM } from "../testing/mock-llm";
import type { Scorer } from "../testing/scorers";

// A scorer that always passes, used as a baseline.
const alwaysPass: Scorer = () => ({ score: 1, pass: true });

// Pad index to avoid substring ambiguity (e.g. "case-01" vs "case-1").
function padIdx(i: number) {
  return String(i).padStart(3, "0");
}

// Build N unique cases so each case maps to a unique mock response.
function buildCases(n: number) {
  return Array.from({ length: n }, (_, i) => ({ input: `case-${padIdx(i)}` }));
}

// Build a mockLLM that responds to every case-NNN input with "ok-NNN".
function buildMock(n: number) {
  let m = mockLLM();
  for (let i = 0; i < n; i++) {
    m = m.onMessage(`case-${padIdx(i)}`).respondWith(`ok-${padIdx(i)}`);
  }
  return m;
}

describe("runEvals concurrency option", () => {
  it("concurrency: 1 (default) runs cases sequentially and preserves order", async () => {
    const n = 4;
    const mock = buildMock(n);
    const suite = defineEval({
      name: "sequential",
      agent: { mock },
      cases: buildCases(n),
      scorers: [alwaysPass],
    });

    const result = await runEvals(suite, { concurrency: 1 });

    expect(result.results).toHaveLength(n);
    for (let i = 0; i < n; i++) {
      expect(result.results[i].input).toBe(`case-${padIdx(i)}`);
      expect(result.results[i].output).toBe(`ok-${padIdx(i)}`);
    }
    expect(result.pass).toBe(true);
  });

  it("concurrency: 3 runs up to 3 cases simultaneously", async () => {
    const n = 6;
    let concurrent = 0;
    let maxConcurrent = 0;

    // A slow scorer that tracks concurrent executions.
    const slowScorer: Scorer = async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise<void>((r) => setTimeout(r, 10));
      concurrent--;
      return { score: 1, pass: true };
    };

    const mock = buildMock(n);
    const suite = defineEval({
      name: "parallel-3",
      agent: { mock },
      cases: buildCases(n),
      scorers: [slowScorer],
    });

    const result = await runEvals(suite, { concurrency: 3 });

    expect(result.results).toHaveLength(n);
    expect(result.pass).toBe(true);
    // With 6 cases in chunks of 3, each chunk runs 3 scorers concurrently.
    expect(maxConcurrent).toBe(3);
  });

  it("concurrency: 100 is capped at 20", async () => {
    const n = 25;
    let concurrent = 0;
    let maxConcurrent = 0;

    const trackingScorer: Scorer = async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise<void>((r) => setTimeout(r, 5));
      concurrent--;
      return { score: 1, pass: true };
    };

    const mock = buildMock(n);
    const suite = defineEval({
      name: "capped",
      agent: { mock },
      cases: buildCases(n),
      scorers: [trackingScorer],
    });

    const result = await runEvals(suite, { concurrency: 100 });

    expect(result.results).toHaveLength(n);
    // Cap is 20 — first chunk runs exactly 20, second chunk runs 5.
    expect(maxConcurrent).toBeLessThanOrEqual(20);
  });

  it("results array length equals input cases length regardless of concurrency", async () => {
    const counts = [1, 3, 7, 13];
    for (const n of counts) {
      const mock = buildMock(n);
      const suite = defineEval({
        name: `length-${n}`,
        agent: { mock },
        cases: buildCases(n),
        scorers: [alwaysPass],
      });

      const result = await runEvals(suite, { concurrency: 4 });
      expect(result.results).toHaveLength(n);
    }
  });

  it("backward compat: no opts runs sequentially (same as concurrency: 1)", async () => {
    const n = 3;
    const mock = buildMock(n);
    const suite = defineEval({
      name: "no-opts",
      agent: { mock },
      cases: buildCases(n),
      scorers: [alwaysPass],
    });

    const result = await runEvals(suite);

    expect(result.results).toHaveLength(n);
    for (let i = 0; i < n; i++) {
      expect(result.results[i].input).toBe(`case-${padIdx(i)}`);
    }
    expect(result.pass).toBe(true);
  });
});
