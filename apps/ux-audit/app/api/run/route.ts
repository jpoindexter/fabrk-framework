import { createAudit, updateAudit } from '../../../src/store.js';
import { getMockEvaluation, getMockCompetitorEvaluation, getMockGapAnalysis } from '../../../src/mock-data.js';
import * as ollama from '../../../src/ollama-evaluator.js';
import type { ProductEvaluation } from '../../../src/heuristics.js';

export async function POST(req: Request): Promise<Response> {
  const body = await req.json() as {
    yourUrl: string;
    competitorUrls: string[];
    userType: string;
    keyFlows: string;
    email: string;
  };

  const { yourUrl, competitorUrls, userType, keyFlows, email } = body;

  if (!yourUrl || !email) {
    return new Response(JSON.stringify({ error: 'yourUrl and email are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const auditId = crypto.randomUUID();
  createAudit(auditId, {
    status: 'pending',
    yourProduct: null,
    competitors: [],
    gapAnalysis: null,
    roadmap: null,
    createdAt: new Date().toISOString(),
  });

  const filtered = competitorUrls.filter(Boolean).slice(0, 3);
  void runPipeline(auditId, yourUrl, filtered, userType, keyFlows);

  return new Response(JSON.stringify({ id: auditId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function runPipeline(
  auditId: string,
  yourUrl: string,
  competitorUrls: string[],
  userType: string,
  keyFlows: string,
): Promise<void> {
  try {
    await delay(600);
    updateAudit(auditId, { status: 'processing' });

    const useOllama = await ollama.isAvailable();
    console.log(`[audit] using ${useOllama ? 'Ollama' : 'mock'} evaluator`);

    let yourProduct: ProductEvaluation;
    let competitors: ProductEvaluation[];

    if (useOllama) {
      // Evaluate all URLs in parallel
      const [yourEval, ...competitorEvals] = await Promise.all([
        ollama.evaluateUrl(yourUrl, userType, keyFlows),
        ...competitorUrls.map(url => ollama.evaluateUrl(url, userType, keyFlows)),
      ]);

      yourProduct = { url: yourUrl, screenshot: '', ...yourEval };
      competitors = competitorUrls.map((url, i) => ({ url, screenshot: '', ...competitorEvals[i] }));

      const { gapAnalysis, roadmap } = competitorUrls.length > 0
        ? await ollama.buildGapAnalysis(yourProduct, competitors)
        : { gapAnalysis: { youWin: [], theyWin: [], comparable: [] }, roadmap: [] };

      updateAudit(auditId, { status: 'complete', yourProduct, competitors, gapAnalysis, roadmap, completedAt: new Date().toISOString() });
    } else {
      // Mock pipeline with realistic delays
      await delay(2800);
      await delay(3200);

      yourProduct = { url: yourUrl, screenshot: '', ...getMockEvaluation(0) };
      competitors = competitorUrls.map((url, i) => ({ url, screenshot: '', ...getMockCompetitorEvaluation(i) }));

      await delay(1500);

      const { gapAnalysis, roadmap } = getMockGapAnalysis(yourProduct, competitors);
      updateAudit(auditId, { status: 'complete', yourProduct, competitors, gapAnalysis, roadmap, completedAt: new Date().toISOString() });
    }
  } catch (err) {
    console.error('[audit] pipeline error:', err);
    updateAudit(auditId, { status: 'failed', error: String(err) });
  }
}

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
