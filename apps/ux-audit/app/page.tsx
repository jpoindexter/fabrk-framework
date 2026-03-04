"use client";

import { useState } from 'react';

export default function HomePage() {
  const [yourUrl, setYourUrl] = useState('');
  const [competitors, setCompetitors] = useState(['', '', '']);
  const [userType, setUserType] = useState('');
  const [keyFlows, setKeyFlows] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const competitorCount = competitors.filter(Boolean).length;
  const price = competitorCount <= 1 ? '$149' : '$299';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yourUrl, competitorUrls: competitors, userType, keyFlows, email }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Header */}
      <header className="border-b border-zinc-800 px-8 py-5 flex items-center justify-between">
        <span className="text-sm tracking-widest text-zinc-400">[ UX AUDIT ]</span>
        <span className="text-xs text-zinc-600">CALIBRATED TO APPLE / GOOGLE / YOUTUBE STANDARDS</span>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-20">
        {/* Hero */}
        <div className="mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4 leading-tight">
            THE UX AUDIT YOUR<br />AGENCY CHARGES $10K FOR.<br />
            <span className="text-zinc-400">IN 10 MINUTES.</span>
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">
            Heuristic evaluation across 10 Nielsen Norman categories. Side-by-side competitor comparison.
            Severity-coded gap analysis. Prioritized roadmap. PDF report.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="text-xs tracking-widest text-zinc-400 block">[ YOUR PRODUCT URL ]</label>
            <input
              type="url"
              required
              value={yourUrl}
              onChange={e => setYourUrl(e.target.value)}
              placeholder="https://yourproduct.com"
              className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs tracking-widest text-zinc-400 block">
              [ COMPETITOR URLS ] <span className="text-zinc-600 normal-case">— up to 3</span>
            </label>
            {competitors.map((url, i) => (
              <input
                key={i}
                type="url"
                value={url}
                onChange={e => {
                  const next = [...competitors];
                  next[i] = e.target.value;
                  setCompetitors(next);
                }}
                placeholder={`https://competitor${i + 1}.com`}
                className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
              />
            ))}
          </div>

          <div className="space-y-3">
            <label className="text-xs tracking-widest text-zinc-400 block">[ PRIMARY USER TYPE ]</label>
            <input
              type="text"
              required
              value={userType}
              onChange={e => setUserType(e.target.value)}
              placeholder="e.g. Startup founder, B2B product manager"
              className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs tracking-widest text-zinc-400 block">[ KEY FLOWS TO EVALUATE ]</label>
            <textarea
              required
              value={keyFlows}
              onChange={e => setKeyFlows(e.target.value)}
              placeholder="e.g. Onboarding, dashboard overview, main action (create report)"
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors resize-none"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs tracking-widest text-zinc-400 block">[ YOUR EMAIL — REPORT DELIVERY ]</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@yourcompany.com"
              className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm border border-red-900 bg-red-950 px-4 py-3">{error}</p>
          )}

          <div className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{price}</p>
              <p className="text-xs text-zinc-500">
                {competitorCount <= 1 ? '1 competitor · single report' : `${competitorCount} competitors · deep analysis`}
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-white text-black px-8 py-3 text-sm font-bold tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '> REDIRECTING...' : '> RUN AUDIT'}
            </button>
          </div>
        </form>

        {/* Social proof / methodology */}
        <div className="mt-24 pt-12 border-t border-zinc-800 space-y-6 text-xs text-zinc-500">
          <p className="tracking-widest text-zinc-600">[ METHODOLOGY ]</p>
          <p className="leading-relaxed">
            Evaluations are based on Nielsen Norman's 10 usability heuristics, calibrated to production standards
            at Apple, Google, and YouTube. Each category is scored 1–5 with severity ratings (P0–P3).
            Gap analysis compares your scores against competitors on each axis.
            Roadmap items are sorted by severity and implementation effort.
          </p>
          <p className="leading-relaxed">
            Screenshots captured at 1440×900. AI evaluation via Claude Opus.
            Report generated within 5–10 minutes of payment.
          </p>
        </div>
      </main>
    </div>
  );
}
