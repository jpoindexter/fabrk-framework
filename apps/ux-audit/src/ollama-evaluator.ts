import { HEURISTICS } from './heuristics.js';
import type { HeuristicScore, ProductEvaluation, GapAnalysis, RoadmapItem } from './heuristics.js';

const BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5:7b';

const SYSTEM_PROMPT = `You are a senior UX evaluator with 15 years of experience shipping product at Apple, Google, and YouTube. You apply Nielsen Norman heuristics calibrated to BigTech design standards.

For each heuristic, score 1–5 (1=critical failure, 5=exemplary) and assign severity:
- P0: Blocks user task completion
- P1: Significant friction, users struggle
- P2: Noticeable issue, workaround exists
- P3: Minor polish issue
- pass: Meets or exceeds standard

Be specific and actionable. Reference real characteristics of the product. No generic advice. Return only valid JSON, no markdown fences.`;

async function ollamaChat(messages: Array<{ role: string; content: string }>): Promise<string> {
  const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.3,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? '';
}

function extractJson(text: string): string {
  // Strip markdown fences if model adds them anyway
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const braced = text.match(/\{[\s\S]*\}/);
  if (braced) return braced[0];
  return text.trim();
}

export async function evaluateUrl(
  url: string,
  userType: string,
  keyFlows: string,
): Promise<Omit<ProductEvaluation, 'url' | 'screenshot'>> {
  const prompt = `Evaluate the UX of: ${url}
User type: ${userType}
Key flows to assess: ${keyFlows}

Evaluate all 10 Nielsen Norman heuristics based on your knowledge of this product. Return JSON exactly:
{
  "scores": [
    {
      "id": "<heuristic_id>",
      "score": <1-5>,
      "severity": "<P0|P1|P2|P3|pass>",
      "finding": "<specific observation about this product>",
      "recommendation": "<specific, actionable fix — empty string if severity is pass>"
    }
  ],
  "overall": <1-5 float>,
  "summary": "<2-3 sentences on the product's UX overall>"
}

Heuristic IDs (use exactly): ${HEURISTICS.map(h => h.id).join(', ')}`;

  const text = await ollamaChat([{ role: 'user', content: prompt }]);
  const parsed = JSON.parse(extractJson(text)) as {
    scores: HeuristicScore[];
    overall: number;
    summary: string;
  };

  return parsed;
}

export async function buildGapAnalysis(
  yourEval: ProductEvaluation,
  competitorEvals: ProductEvaluation[],
): Promise<{ gapAnalysis: GapAnalysis; roadmap: RoadmapItem[] }> {
  const prompt = `Compare these UX evaluations and return gap analysis + prioritized roadmap as JSON.

YOUR PRODUCT (${yourEval.url}):
${JSON.stringify(yourEval.scores.map(s => ({ id: s.id, score: s.score, severity: s.severity, finding: s.finding })), null, 2)}

COMPETITORS:
${competitorEvals.map(c => `${c.url}:\n${JSON.stringify(c.scores.map(s => ({ id: s.id, score: s.score, severity: s.severity })), null, 2)}`).join('\n\n')}

Return JSON exactly:
{
  "gapAnalysis": {
    "youWin": [{ "heuristic": "<name>", "detail": "<how you're ahead>" }],
    "theyWin": [{ "heuristic": "<name>", "competitor": "<url>", "detail": "<how they're ahead>" }],
    "comparable": [{ "heuristic": "<name>" }]
  },
  "roadmap": [
    {
      "priority": "<P0|P1|P2|P3>",
      "heuristic": "<name>",
      "finding": "<specific issue>",
      "action": "<specific fix>",
      "effort": "<low|medium|high>"
    }
  ]
}

Sort roadmap: P0 first, then by effort (low before high within same priority).`;

  const text = await ollamaChat([{ role: 'user', content: prompt }]);
  return JSON.parse(extractJson(text));
}

export async function isAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
