export interface ScorerResult {
  score: number;
  pass: boolean;
  reason?: string;
}

export type Scorer = (params: {
  input: string;
  output: string;
  expected?: string;
  toolCalls?: Array<{ name: string; input: Record<string, unknown> }>;
}) => ScorerResult | Promise<ScorerResult>;

export function exactMatch(): Scorer {
  return ({ output, expected }) => {
    if (expected === undefined) {
      return { score: 0, pass: false, reason: "No expected value provided" };
    }
    const pass = output === expected;
    return { score: pass ? 1 : 0, pass, reason: pass ? undefined : `Expected "${expected}", got "${output}"` };
  };
}

export function includes(substring: string): Scorer {
  return ({ output }) => {
    const pass = output.includes(substring);
    return { score: pass ? 1 : 0, pass, reason: pass ? undefined : `Output does not include "${substring}"` };
  };
}

export function llmAsJudge(options: {
  prompt?: string;
  judge: (systemPrompt: string, userMessage: string) => Promise<string>;
}): Scorer {
  return async ({ input, output, expected }) => {
    const systemPrompt = options.prompt ||
      "You are an evaluation judge. Score the assistant's output on a scale from 0 to 1. " +
      "Respond with ONLY a JSON object: {\"score\": <number>, \"reason\": \"<explanation>\"}";

    const userMessage = [
      `User input: ${input}`,
      expected ? `Expected output: ${expected}` : null,
      `Actual output: ${output}`,
      "Rate the quality of the actual output.",
    ].filter(Boolean).join("\n");

    const response = await options.judge(systemPrompt, userMessage);

    try {
      const parsed = JSON.parse(response) as { score: number; reason?: string };
      const score = Math.max(0, Math.min(1, parsed.score));
      return { score, pass: score >= 0.5, reason: parsed.reason };
    } catch {
      return { score: 0, pass: false, reason: "Judge returned invalid JSON" };
    }
  };
}

export function toolCallSequence(expected: string[]): Scorer {
  return ({ toolCalls }) => {
    const actual = (toolCalls ?? []).map((tc) => tc.name);
    if (actual.length !== expected.length) {
      return {
        score: 0,
        pass: false,
        reason: `Expected ${expected.length} tool calls [${expected.join(", ")}], got ${actual.length} [${actual.join(", ")}]`,
      };
    }
    for (let i = 0; i < expected.length; i++) {
      if (actual[i] !== expected[i]) {
        return {
          score: 0,
          pass: false,
          reason: `Tool call ${i}: expected "${expected[i]}", got "${actual[i]}"`,
        };
      }
    }
    return { score: 1, pass: true };
  };
}

export function jsonSchema(schema: {
  required?: string[];
  properties?: Record<string, { type?: string }>;
}): Scorer {
  return ({ output }) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(output);
    } catch {
      return { score: 0, pass: false, reason: "Output is not valid JSON" };
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { score: 0, pass: false, reason: "Output must be a JSON object" };
    }

    const obj = parsed as Record<string, unknown>;

    if (schema.required) {
      for (const key of schema.required) {
        if (!Object.hasOwn(obj, key)) {
          return { score: 0, pass: false, reason: `Missing required field: ${key}` };
        }
      }
    }

    if (schema.properties) {
      for (const [key, spec] of Object.entries(schema.properties)) {
        if (Object.hasOwn(obj, key) && spec.type) {
          const actual = Array.isArray(obj[key]) ? "array" : typeof obj[key];
          if (actual !== spec.type) {
            return { score: 0, pass: false, reason: `Field "${key}" expected type "${spec.type}", got "${actual}"` };
          }
        }
      }
    }

    return { score: 1, pass: true };
  };
}
