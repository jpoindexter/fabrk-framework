import Anthropic from '@anthropic-ai/sdk';
import { HEURISTICS } from './heuristics.js';
import type { HeuristicScore, ProductEvaluation, GapAnalysis, RoadmapItem } from './heuristics.js';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a senior UX evaluator with 15 years of experience shipping product at Apple, Google, and YouTube. You apply Nielsen Norman heuristics calibrated to BigTech design standards.

For each heuristic, score 1–5 (1=critical failure, 5=exemplary) and assign severity:
- P0: Blocks user task completion
- P1: Significant friction, users struggle
- P2: Noticeable issue, workaround exists
- P3: Minor polish issue
- pass: Meets or exceeds standard

Be specific and actionable. Reference what you actually see in the screenshot. No generic advice.`;

function buildEvalPrompt(url: string, userType: string, keyFlows: string): string {
  return `Evaluate the UX of: ${url}
User type: ${userType}
Key flows to assess: ${keyFlows}

Evaluate all 10 Nielsen Norman heuristics. Return JSON exactly:
{
  "scores": [
    {
      "id": "<heuristic_id>",
      "score": <1-5>,
      "severity": "<P0|P1|P2|P3|pass>",
      "finding": "<specific observation from screenshot>",
      "recommendation": "<specific, actionable fix>"
    }
  ],
  "overall": <1-5 float>,
  "summary": "<2-3 sentences on the product's UX overall>"
}

Heuristic IDs: ${HEURISTICS.map(h => h.id).join(', ')}`;
}

export async function evaluateScreenshot(
  url: string,
  screenshotBase64: string,
  userType: string,
  keyFlows: string,
): Promise<Omit<ProductEvaluation, 'url' | 'screenshot'>> {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: screenshotBase64,
            },
          },
          {
            type: 'text',
            text: buildEvalPrompt(url, userType, keyFlows),
          },
        ],
      },
    ],
  });

  const text = response.content.find(c => c.type === 'text')?.text ?? '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude returned no JSON');

  const parsed = JSON.parse(jsonMatch[0]) as {
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
${JSON.stringify(yourEval.scores, null, 2)}

COMPETITORS:
${competitorEvals.map(c => `${c.url}:\n${JSON.stringify(c.scores, null, 2)}`).join('\n\n')}

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

Sort roadmap: P0 first, then by effort (low effort before high within same priority).`;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find(c => c.type === 'text')?.text ?? '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude returned no JSON');

  return JSON.parse(jsonMatch[0]);
}
