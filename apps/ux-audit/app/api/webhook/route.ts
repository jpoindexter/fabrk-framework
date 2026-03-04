import Stripe from 'stripe';
import { updateAudit } from '../../../src/store.js';
import { screenshot } from '../../../src/screenshotter.js';
import { evaluateScreenshot, buildGapAnalysis } from '../../../src/evaluator.js';
import type { ProductEvaluation } from '../../../src/heuristics.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export async function POST(req: Request): Promise<Response> {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response('ok', { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const { auditId, yourUrl, competitorUrls, userType, keyFlows } = session.metadata ?? {};

  if (!auditId || !yourUrl) {
    return new Response('Missing metadata', { status: 400 });
  }

  // Kick off async — respond to Stripe immediately
  runAudit(auditId, yourUrl, JSON.parse(competitorUrls ?? '[]'), userType ?? '', keyFlows ?? '').catch(
    (err) => {
      console.error('[ux-audit] pipeline error:', err);
      updateAudit(auditId, { status: 'failed', error: String(err) });
    },
  );

  return new Response('ok', { status: 200 });
}

async function runAudit(
  auditId: string,
  yourUrl: string,
  competitorUrls: string[],
  userType: string,
  keyFlows: string,
): Promise<void> {
  updateAudit(auditId, { status: 'processing' });

  // Screenshot + evaluate all URLs in parallel
  const allUrls = [yourUrl, ...competitorUrls.slice(0, 3)];
  const results = await Promise.all(
    allUrls.map(async (url) => {
      const img = await screenshot(url);
      const evaluation = await evaluateScreenshot(url, img, userType, keyFlows);
      return { url, screenshot: img, ...evaluation } satisfies ProductEvaluation;
    }),
  );

  const [yourProduct, ...competitors] = results;

  const { gapAnalysis, roadmap } = competitors.length > 0
    ? await buildGapAnalysis(yourProduct, competitors)
    : { gapAnalysis: { youWin: [], theyWin: [], comparable: [] }, roadmap: [] };

  updateAudit(auditId, {
    status: 'complete',
    yourProduct,
    competitors,
    gapAnalysis,
    roadmap,
    completedAt: new Date().toISOString(),
  });
}
