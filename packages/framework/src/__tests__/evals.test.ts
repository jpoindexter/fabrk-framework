import { describe, it, expect } from "vitest";
import { defineEval, runEvals } from "../testing/evals";
import { exactMatch, includes, toolCallSequence, jsonSchema, llmAsJudge } from "../testing/scorers";
import { mockLLM } from "../testing/mock-llm";
import { defineTool, textResult } from "../tools/define-tool";

describe("scorers", () => {
  describe("exactMatch", () => {
    const scorer = exactMatch();

    it("passes when output equals expected", async () => {
      const result = await scorer({ input: "hi", output: "hello", expected: "hello" });
      expect(result).toEqual({ score: 1, pass: true, reason: undefined });
    });

    it("fails when output differs from expected", async () => {
      const result = await scorer({ input: "hi", output: "hello", expected: "goodbye" });
      expect(result.pass).toBe(false);
      expect(result.score).toBe(0);
    });

    it("fails when no expected value provided", async () => {
      const result = await scorer({ input: "hi", output: "hello" });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain("No expected");
    });
  });

  describe("includes", () => {
    it("passes when output includes substring", async () => {
      const scorer = includes("world");
      const result = await scorer({ input: "hi", output: "hello world" });
      expect(result.pass).toBe(true);
    });

    it("fails when output does not include substring", async () => {
      const scorer = includes("planet");
      const result = await scorer({ input: "hi", output: "hello world" });
      expect(result.pass).toBe(false);
    });
  });

  describe("toolCallSequence", () => {
    it("passes when tool calls match expected sequence", async () => {
      const scorer = toolCallSequence(["search", "format"]);
      const result = await scorer({
        input: "hi",
        output: "done",
        toolCalls: [
          { name: "search", input: { q: "test" } },
          { name: "format", input: { style: "table" } },
        ],
      });
      expect(result.pass).toBe(true);
    });

    it("fails on wrong order", async () => {
      const scorer = toolCallSequence(["search", "format"]);
      const result = await scorer({
        input: "hi",
        output: "done",
        toolCalls: [
          { name: "format", input: {} },
          { name: "search", input: {} },
        ],
      });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('expected "search"');
    });

    it("fails on wrong count", async () => {
      const scorer = toolCallSequence(["search"]);
      const result = await scorer({
        input: "hi",
        output: "done",
        toolCalls: [
          { name: "search", input: {} },
          { name: "format", input: {} },
        ],
      });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain("Expected 1");
    });

    it("handles missing toolCalls", async () => {
      const scorer = toolCallSequence(["search"]);
      const result = await scorer({ input: "hi", output: "done" });
      expect(result.pass).toBe(false);
    });
  });

  describe("jsonSchema", () => {
    it("passes valid JSON matching schema", async () => {
      const scorer = jsonSchema({
        required: ["name"],
        properties: { name: { type: "string" }, age: { type: "number" } },
      });
      const result = await scorer({
        input: "hi",
        output: JSON.stringify({ name: "Alice", age: 30 }),
      });
      expect(result.pass).toBe(true);
    });

    it("fails on invalid JSON", async () => {
      const scorer = jsonSchema({});
      const result = await scorer({ input: "hi", output: "not json" });
      expect(result.pass).toBe(false);
    });

    it("fails on missing required field", async () => {
      const scorer = jsonSchema({ required: ["name"] });
      const result = await scorer({ input: "hi", output: JSON.stringify({ age: 30 }) });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain("name");
    });

    it("fails on wrong type", async () => {
      const scorer = jsonSchema({ properties: { age: { type: "number" } } });
      const result = await scorer({ input: "hi", output: JSON.stringify({ age: "thirty" }) });
      expect(result.pass).toBe(false);
    });
  });

  describe("llmAsJudge", () => {
    it("parses judge response and returns score", async () => {
      const scorer = llmAsJudge({
        judge: async () => JSON.stringify({ score: 0.8, reason: "Good answer" }),
      });
      const result = await scorer({ input: "hi", output: "hello", expected: "hello" });
      expect(result.score).toBe(0.8);
      expect(result.pass).toBe(true);
      expect(result.reason).toBe("Good answer");
    });

    it("fails gracefully on invalid judge response", async () => {
      const scorer = llmAsJudge({
        judge: async () => "not json at all",
      });
      const result = await scorer({ input: "hi", output: "hello" });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain("invalid JSON");
    });

    it("clamps score to 0-1 range", async () => {
      const scorer = llmAsJudge({
        judge: async () => JSON.stringify({ score: 5.0, reason: "Great" }),
      });
      const result = await scorer({ input: "hi", output: "hello" });
      expect(result.score).toBe(1);
    });
  });
});

describe("defineEval", () => {
  it("returns the suite unchanged", () => {
    const mock = mockLLM();
    const suite = defineEval({
      name: "test-suite",
      agent: { mock },
      cases: [{ input: "hi", expected: "hello" }],
      scorers: [exactMatch()],
    });
    expect(suite.name).toBe("test-suite");
    expect(suite.cases).toHaveLength(1);
  });
});

describe("runEvals", () => {
  it("evaluates cases against scorers", async () => {
    const mock = mockLLM()
      .onMessage("hello").respondWith("Hello back!")
      .onMessage("goodbye").respondWith("See you later!");

    const suite = defineEval({
      name: "greeting-eval",
      agent: { mock },
      cases: [
        { input: "hello", expected: "Hello back!" },
        { input: "goodbye", expected: "See you later!" },
      ],
      scorers: [exactMatch()],
    });

    const result = await runEvals(suite);
    expect(result.name).toBe("greeting-eval");
    expect(result.results).toHaveLength(2);
    expect(result.passRate).toBe(1);
    expect(result.pass).toBe(true);
  });

  it("reports failures correctly", async () => {
    const mock = mockLLM().setDefault("wrong answer");

    const suite = defineEval({
      name: "fail-eval",
      agent: { mock },
      cases: [{ input: "hi", expected: "correct answer" }],
      scorers: [exactMatch()],
    });

    const result = await runEvals(suite);
    expect(result.passRate).toBe(0);
    expect(result.pass).toBe(false);
    expect(result.results[0].pass).toBe(false);
    expect(result.results[0].output).toBe("wrong answer");
  });

  it("supports threshold for partial passes", async () => {
    const mock = mockLLM()
      .onMessage("first").respondWith("correct")
      .onMessage("second").respondWith("wrong");

    const suite = defineEval({
      name: "threshold-eval",
      agent: { mock },
      cases: [
        { input: "first", expected: "correct" },
        { input: "second", expected: "right" },
      ],
      scorers: [exactMatch()],
      threshold: 0.5,
    });

    const result = await runEvals(suite);
    expect(result.passRate).toBe(0.5);
    expect(result.pass).toBe(true);
  });

  it("runs multiple scorers per case", async () => {
    const mock = mockLLM().setDefault("Hello world");

    const suite = defineEval({
      name: "multi-scorer",
      agent: { mock },
      cases: [{ input: "hi", expected: "Hello world" }],
      scorers: [exactMatch(), includes("world")],
    });

    const result = await runEvals(suite);
    expect(result.results[0].scores).toHaveLength(2);
    expect(result.results[0].scores.every((s) => s.pass)).toBe(true);
  });

  it("case fails if any scorer fails", async () => {
    const mock = mockLLM().setDefault("Hello world");

    const suite = defineEval({
      name: "strict-eval",
      agent: { mock },
      cases: [{ input: "hi", expected: "wrong" }],
      scorers: [exactMatch(), includes("Hello")],
    });

    const result = await runEvals(suite);
    expect(result.results[0].pass).toBe(false);
    expect(result.results[0].scores[0].pass).toBe(false);
    expect(result.results[0].scores[1].pass).toBe(true);
  });

  it("evaluates tool call sequences", async () => {
    const searchTool = defineTool({
      name: "search",
      description: "Search",
      schema: { type: "object", properties: { q: { type: "string" } } },
      handler: async () => textResult("results"),
    });

    // MockLLM re-evaluates the last user message on each call.
    // Use maxIterations=1 so the agent does one tool-call round, then hits
    // the max-iterations cap. The test agent still collects the tool call.
    const mock = mockLLM()
      .onMessage("find").callTool("search", { q: "test" });

    const suite = defineEval({
      name: "tool-eval",
      agent: { mock, tools: [searchTool], maxIterations: 1 },
      cases: [{ input: "find something" }],
      scorers: [toolCallSequence(["search"])],
    });

    const result = await runEvals(suite);
    expect(result.pass).toBe(true);
    expect(result.results[0].toolCalls).toContainEqual(
      expect.objectContaining({ name: "search" }),
    );
  });

  it("evaluates JSON schema output", async () => {
    const mock = mockLLM().setDefault(JSON.stringify({ name: "Alice", age: 30 }));

    const suite = defineEval({
      name: "json-eval",
      agent: { mock },
      cases: [{ input: "give me user data" }],
      scorers: [jsonSchema({ required: ["name", "age"], properties: { name: { type: "string" }, age: { type: "number" } } })],
    });

    const result = await runEvals(suite);
    expect(result.pass).toBe(true);
  });

  it("handles empty cases array", async () => {
    const mock = mockLLM();
    const suite = defineEval({
      name: "empty",
      agent: { mock },
      cases: [],
      scorers: [exactMatch()],
    });

    const result = await runEvals(suite);
    expect(result.results).toHaveLength(0);
    expect(result.passRate).toBe(0);
    expect(result.pass).toBe(false);
  });

  it("uses system prompt when provided", async () => {
    const mock = mockLLM().setDefault("OK");
    const suite = defineEval({
      name: "prompt-eval",
      agent: { mock, systemPrompt: "Be helpful" },
      cases: [{ input: "hi" }],
      scorers: [includes("OK")],
    });

    const result = await runEvals(suite);
    expect(result.pass).toBe(true);

    const calls = mock.getCalls();
    expect(calls[0].messages[0]).toEqual({ role: "system", content: "Be helpful" });
  });
});
