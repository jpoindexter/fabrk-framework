"use client";

import './globals.css';
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
  const priceLabel = competitorCount <= 1 ? 'Single competitor' : `${competitorCount} competitors`;

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
    <div className="font-sans min-h-screen" style={{ background: '#F8F7F4', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #E8E6E1' }} className="px-8 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="font-serif text-lg font-semibold text-gray-900" style={{ fontFamily: 'Lora, Georgia, serif' }}>
          ux audit
        </span>
        <div className="flex items-center gap-4">
          <a href="#how" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">How it works</a>
          <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Pricing</a>
          <a
            href="#audit"
            className="text-sm font-medium px-4 py-2 rounded-full text-white transition-colors"
            style={{ background: '#7C3AED' }}
          >
            Run an audit
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-24 pb-20 text-center">
        <p className="text-sm font-medium mb-6 tracking-wide uppercase" style={{ color: '#7C3AED' }}>
          Nielsen Norman Heuristics · Calibrated to BigTech Standards
        </p>
        <h1
          className="text-5xl md:text-6xl font-bold leading-tight text-gray-900 mb-6"
          style={{ fontFamily: 'Lora, Georgia, serif' }}
        >
          The UX audit your agency<br />
          <span style={{ color: '#7C3AED' }}>charges $10K for.</span><br />
          In 10 minutes.
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10">
          Heuristic evaluation across 10 categories. Side-by-side competitor comparison.
          Severity-coded gap analysis. Prioritized roadmap.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="#audit"
            className="px-8 py-3.5 rounded-full text-white font-medium text-base transition-colors"
            style={{ background: '#7C3AED' }}
          >
            Start your audit
          </a>
          <a href="#how" className="px-8 py-3.5 rounded-full text-gray-700 font-medium text-base border border-gray-300 hover:border-gray-400 transition-colors">
            See how it works
          </a>
        </div>
      </section>

      {/* Social proof strip */}
      <div style={{ borderTop: '1px solid #E8E6E1', borderBottom: '1px solid #E8E6E1', background: '#FDFCFA' }}
        className="py-5 text-center">
        <p className="text-sm text-gray-400">
          Calibrated to production standards from&nbsp;&nbsp;
          <span className="font-medium text-gray-600">Apple</span>&nbsp;·&nbsp;
          <span className="font-medium text-gray-600">Google</span>&nbsp;·&nbsp;
          <span className="font-medium text-gray-600">YouTube</span>
        </p>
      </div>

      {/* How it works */}
      <section id="how" className="max-w-5xl mx-auto px-8 py-24">
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 text-center mb-3">How it works</p>
        <h2 className="font-serif text-3xl font-bold text-center text-gray-900 mb-16"
          style={{ fontFamily: 'Lora, Georgia, serif' }}>
          From URL to actionable report in under 10 minutes
        </h2>
        <div className="grid grid-cols-3 gap-12">
          {[
            { n: '01', title: 'Submit your URLs', body: 'Enter your product URL and up to 3 competitor URLs. Tell us who your users are and which flows matter most.' },
            { n: '02', title: 'AI evaluates & compares', body: 'We screenshot every product at 1440×900, then run Claude Opus vision evaluation across all 10 Nielsen Norman heuristics.' },
            { n: '03', title: 'Get your roadmap', body: 'Receive a severity-coded gap analysis (P0–P3) and a prioritized improvement roadmap sorted by impact and effort.' },
          ].map(step => (
            <div key={step.n} className="space-y-3">
              <span className="text-4xl font-serif font-bold" style={{ color: '#E8E6E1', fontFamily: 'Lora, Georgia, serif' }}>{step.n}</span>
              <h3 className="font-semibold text-gray-900 text-base">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Audit form */}
      <section id="audit" style={{ background: '#FDFCFA', borderTop: '1px solid #E8E6E1', borderBottom: '1px solid #E8E6E1' }}
        className="py-24">
        <div className="max-w-2xl mx-auto px-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 text-center mb-3">Run your audit</p>
          <h2 className="font-serif text-3xl font-bold text-center text-gray-900 mb-12"
            style={{ fontFamily: 'Lora, Georgia, serif' }}>
            Start with your product URL
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">Your product URL</label>
              <input
                type="url"
                required
                value={yourUrl}
                onChange={e => setYourUrl(e.target.value)}
                placeholder="https://yourproduct.com"
                className="w-full px-4 py-3 rounded-lg text-sm text-gray-900 placeholder-gray-400 transition-colors"
                style={{ border: '1px solid #D1CEC8', background: '#fff', outline: 'none' }}
                onFocus={e => (e.target.style.borderColor = '#7C3AED')}
                onBlur={e => (e.target.style.borderColor = '#D1CEC8')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">
                Competitor URLs <span className="text-gray-400 font-normal">— up to 3</span>
              </label>
              <div className="space-y-2">
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
                    className="w-full px-4 py-3 rounded-lg text-sm text-gray-900 placeholder-gray-400 transition-colors"
                    style={{ border: '1px solid #D1CEC8', background: '#fff', outline: 'none' }}
                    onFocus={e => (e.target.style.borderColor = '#7C3AED')}
                    onBlur={e => (e.target.style.borderColor = '#D1CEC8')}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">Primary user type</label>
                <input
                  type="text"
                  required
                  value={userType}
                  onChange={e => setUserType(e.target.value)}
                  placeholder="e.g. Startup founder"
                  className="w-full px-4 py-3 rounded-lg text-sm text-gray-900 placeholder-gray-400"
                  style={{ border: '1px solid #D1CEC8', background: '#fff', outline: 'none' }}
                  onFocus={e => (e.target.style.borderColor = '#7C3AED')}
                  onBlur={e => (e.target.style.borderColor = '#D1CEC8')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">Your email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-4 py-3 rounded-lg text-sm text-gray-900 placeholder-gray-400"
                  style={{ border: '1px solid #D1CEC8', background: '#fff', outline: 'none' }}
                  onFocus={e => (e.target.style.borderColor = '#7C3AED')}
                  onBlur={e => (e.target.style.borderColor = '#D1CEC8')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">Key flows to evaluate</label>
              <textarea
                required
                value={keyFlows}
                onChange={e => setKeyFlows(e.target.value)}
                placeholder="e.g. Onboarding, dashboard overview, primary CTA flow"
                rows={3}
                className="w-full px-4 py-3 rounded-lg text-sm text-gray-900 placeholder-gray-400 resize-none"
                style={{ border: '1px solid #D1CEC8', background: '#fff', outline: 'none' }}
                onFocus={e => (e.target.style.borderColor = '#7C3AED')}
                onBlur={e => (e.target.style.borderColor = '#D1CEC8')}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
            )}

            <div id="pricing" className="flex items-center justify-between pt-2">
              <div>
                <p className="text-2xl font-bold text-gray-900">{price}</p>
                <p className="text-sm text-gray-400">{priceLabel} · one-time</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3.5 rounded-full text-white font-medium text-sm transition-opacity"
                style={{ background: '#7C3AED', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Redirecting…' : 'Run audit →'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Methodology footer note */}
      <section className="max-w-4xl mx-auto px-8 py-20 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4">Methodology</p>
        <p className="text-sm text-gray-500 leading-relaxed max-w-2xl mx-auto">
          Every audit applies Nielsen Norman's 10 usability heuristics, calibrated to production standards
          at Apple, Google, and YouTube. Scores are 1–5 with severity ratings P0 (blocks tasks) through P3 (polish).
          Screenshots at 1440×900. Evaluation via Claude Opus. Report ready in 5–10 minutes.
        </p>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E8E6E1' }} className="py-8">
        <div className="max-w-6xl mx-auto px-8 flex items-center justify-between">
          <span className="font-serif text-sm text-gray-400" style={{ fontFamily: 'Lora, Georgia, serif' }}>ux audit</span>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} · UX Audit</p>
        </div>
      </footer>
    </div>
  );
}
