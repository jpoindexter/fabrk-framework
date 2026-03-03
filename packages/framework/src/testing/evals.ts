import type { ToolDefinition } from "../tools/define-tool";
import type { Scorer, ScorerResult } from "./scorers";
import type { MockLLM } from "./mock-llm";
import type { EvalDataset, EvalRunRecord, EvalRunStore } from "./dataset.js";

export interface EvalCase {
  input: string;
  expected?: string;
}

export interface EvalSuite {
  name: string;
  agent: {
    systemPrompt?: string;
    tools?: ToolDefinition[];
    mock: MockLLM;
    maxIterations?: number;
  };
  cases: EvalCase[];
  scorers: Scorer[];
  threshold?: number;
}

export interface EvalCaseResult {
  input: string;
  output: string;
  expected?: string;
  toolCalls: Array<{ name: string; input: Record<string, unknown> }>;
  scores: ScorerResult[];
  pass: boolean;
}

export interface EvalSuiteResult {
  name: string;
  results: EvalCaseResult[];
  passRate: number;
  pass: boolean;
}

export function defineEval(suite: EvalSuite): EvalSuite {
  return suite;
}

export async function runEvals(
  suite: EvalSuite,
  opts?: {
    dataset?: EvalDataset;
    store?: EvalRunStore;
    compareWith?: EvalRunRecord;
  },
): Promise<EvalSuiteResult> {
  const { createTestAgent } = await import("./create-test-agent");

  const threshold = suite.threshold ?? 1.0;
  const results: EvalCaseResult[] = [];

  for (const evalCase of suite.cases) {
    const agent = createTestAgent({
      systemPrompt: suite.agent.systemPrompt,
      tools: suite.agent.tools,
      mock: suite.agent.mock,
      maxIterations: suite.agent.maxIterations,
    });

    const agentResult = await agent.send(evalCase.input);
    const scores: ScorerResult[] = [];

    for (const scorer of suite.scorers) {
      const score = await scorer({
        input: evalCase.input,
        output: agentResult.content,
        expected: evalCase.expected,
        toolCalls: agentResult.toolCalls,
      });
      scores.push(score);
    }

    const casePass = scores.every((s) => s.pass);
    results.push({
      input: evalCase.input,
      output: agentResult.content,
      expected: evalCase.expected,
      toolCalls: agentResult.toolCalls,
      scores,
      pass: casePass,
    });
  }

  const passCount = results.filter((r) => r.pass).length;
  const passRate = results.length > 0 ? passCount / results.length : 0;

  const result: EvalSuiteResult = {
    name: suite.name,
    results,
    passRate,
    pass: passRate >= threshold,
  };

  if (opts?.store && opts?.dataset) {
    await opts.store.save({
      datasetName: opts.dataset.name,
      datasetVersion: opts.dataset.version,
      runAt: new Date(),
      passRate: result.passRate,
      pass: result.pass,
      results: result.results,
    });
  }

  if (opts?.compareWith) {
    for (const r of result.results) {
      const prev = opts.compareWith.results.find((p) => p.input === r.input);
      if (prev?.pass && !r.pass) {
        console.warn(`[eval regression] "${r.input.slice(0, 80)}" passed before but fails now`);
      }
    }
  }

  return result;
}
