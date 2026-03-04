import { createAudit, updateAudit } from '../../../src/store.js';
import { getMockEvaluation, getMockCompetitorEvaluation, getMockGapAnalysis } from '../../../src/mock-data.js';
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
  void runMockPipeline(auditId, yourUrl, filtered, userType, keyFlows);

  return new Response(JSON.stringify({ id: auditId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function runMockPipeline(
  auditId: string,
  yourUrl: string,
  competitorUrls: string[],
  _userType: string,
  _keyFlows: string,
): Promise<void> {
  try {
    await delay(600);
    updateAudit(auditId, { status: 'processing' });

    await delay(2800); // simulate screenshot capture
    await delay(3200); // simulate Claude evaluation

    const yourProduct: ProductEvaluation = {
      url: yourUrl,
      screenshot: '',
      ...getMockEvaluation(0),
    };

    const competitors: ProductEvaluation[] = competitorUrls.map((url, i) => ({
      url,
      screenshot: '',
      ...getMockCompetitorEvaluation(i),
    }));

    await delay(1500); // simulate gap analysis

    const { gapAnalysis, roadmap } = getMockGapAnalysis(yourProduct, competitors);

    updateAudit(auditId, {
      status: 'complete',
      yourProduct,
      competitors,
      gapAnalysis,
      roadmap,
      completedAt: new Date().toISOString(),
    });
  } catch (err) {
    updateAudit(auditId, { status: 'failed', error: String(err) });
  }
}

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
