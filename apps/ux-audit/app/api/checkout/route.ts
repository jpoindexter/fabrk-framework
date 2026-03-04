import Stripe from 'stripe';
import { createAudit } from '../../../src/store.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');

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

  const competitorCount = Math.min(competitorUrls.filter(Boolean).length, 3);
  const price = competitorCount <= 1 ? 14900 : 29900; // $149 / $299

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: price,
          product_data: {
            name: competitorCount <= 1
              ? 'UX Audit — Single Competitor'
              : 'UX Audit — Deep (3 Competitors)',
            description: `Heuristic evaluation of ${yourUrl} vs ${competitorCount} competitor(s)`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      auditId,
      yourUrl,
      competitorUrls: JSON.stringify(competitorUrls.filter(Boolean).slice(0, 3)),
      userType,
      keyFlows,
      email,
    },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:5173'}/audit/${auditId}?paid=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:5173'}/?cancelled=1`,
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
