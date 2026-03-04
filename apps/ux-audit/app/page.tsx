"use client";

import './globals.css';
import { useState } from 'react';

const SEV: Record<string, { bg: string; color: string }> = {
  P0: { bg: '#FFF0F0', color: '#C20000' },
  P1: { bg: '#FFF4EC', color: '#C15000' },
  P2: { bg: '#FFFBEB', color: '#9A6B00' },
  P3: { bg: '#F5F5F4', color: '#666462' },
  pass: { bg: '#F0FAF4', color: '#1A7A3E' },
};

const PREVIEW = [
  { label: 'visibility', score: 4.0, sev: 'pass' },
  { label: 'user control', score: 2.5, sev: 'P1' },
  { label: 'flexibility', score: 2.0, sev: 'P1' },
  { label: 'error recovery', score: 2.5, sev: 'P1' },
  { label: 'consistency', score: 4.0, sev: 'pass' },
  { label: 'error prevention', score: 3.0, sev: 'P2' },
];

const INPUT: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #E4E4E2',
  borderRadius: 3,
  fontSize: 14,
  color: '#111110',
  background: '#fff',
  outline: 'none',
  fontFamily: 'Manrope, sans-serif',
  transition: 'border-color 0.12s',
};

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#111110',
  marginBottom: 6,
  letterSpacing: '0.01em',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={LABEL}>{label}</label>
      {children}
    </div>
  );
}

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
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yourUrl, competitorUrls: competitors, userType, keyFlows, email }),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? 'Failed to start audit');
      window.location.href = `/audit/${data.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div style={{ background: '#F8F8F6', minHeight: '100vh', fontFamily: 'Manrope, sans-serif', color: '#111110' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #E4E4E2', background: '#F8F8F6', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: '#111110' }}>
            AUDIT
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="/sample" style={{ fontSize: 13, color: '#6B6B69', textDecoration: 'none' }}>Sample report</a>
            <a href="#how" style={{ fontSize: 13, color: '#6B6B69', textDecoration: 'none' }}>How it works</a>
            <a
              href="#form"
              style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', background: '#111110', color: '#fff', textDecoration: 'none', borderRadius: 3 }}
            >
              Run audit
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '72px 32px 72px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 72, alignItems: 'start' }}>

          {/* Left */}
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20, margin: '0 0 20px' }}>
              Nielsen Norman · 10 categories · BigTech calibrated
            </p>
            <h1 style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.08, margin: '0 0 18px', letterSpacing: '-0.025em', color: '#111110' }}>
              Know where your UX<br />is losing users.
            </h1>
            <p style={{ fontSize: 15, color: '#6B6B69', lineHeight: 1.65, maxWidth: 400, margin: '0 0 36px' }}>
              Heuristic evaluation across 10 categories. Side-by-side competitor comparison.
              Severity-coded gap analysis with a prioritized roadmap. Under 10 minutes.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <a
                href="#form"
                style={{ padding: '9px 20px', background: '#111110', color: '#fff', textDecoration: 'none', borderRadius: 3, fontSize: 13, fontWeight: 600 }}
              >
                Run your audit
              </a>
              <a
                href="/sample"
                style={{ padding: '9px 20px', border: '1px solid #E4E4E2', color: '#111110', textDecoration: 'none', borderRadius: 3, fontSize: 13, fontWeight: 500 }}
              >
                See sample report
              </a>
            </div>
          </div>

          {/* Right: score preview */}
          <div style={{ border: '1px solid #E4E4E2', background: '#fff', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #E4E4E2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAF8' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6B6B69' }}>yourproduct.com</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#111110' }}>3.2 / 5.0</span>
            </div>
            {PREVIEW.map(({ label, score, sev }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid #F2F2F0' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', width: 96, flexShrink: 0 }}>
                  {label}
                </span>
                <div style={{ display: 'flex', gap: 2, flex: 1 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <div key={n} style={{ height: 3, flex: 1, background: n <= Math.round(score) ? '#111110' : '#E4E4E2', borderRadius: 1 }} />
                  ))}
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#111110', width: 22, textAlign: 'right', flexShrink: 0 }}>
                  {score.toFixed(1)}
                </span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '2px 5px', background: SEV[sev].bg, color: SEV[sev].color, borderRadius: 2, width: 30, textAlign: 'center', flexShrink: 0 }}>
                  {sev}
                </span>
              </div>
            ))}
            <div style={{ padding: '9px 14px', background: '#FAFAF8' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#C15000' }}>3 issues require immediate attention</span>
            </div>
          </div>
        </div>
      </section>

      {/* Calibrated strip */}
      <div style={{ borderTop: '1px solid #E4E4E2', borderBottom: '1px solid #E4E4E2' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '12px 32px', display: 'flex', alignItems: 'center', gap: 28 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
            Calibrated to
          </span>
          {['Apple', 'Google', 'YouTube', 'Stripe', 'Linear'].map(name => (
            <span key={name} style={{ fontSize: 13, fontWeight: 500, color: '#6B6B69' }}>{name}</span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section id="how" style={{ maxWidth: 1080, margin: '0 auto', padding: '72px 32px' }}>
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>Process</p>
          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.015em', margin: 0 }}>How it works</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#E4E4E2', border: '1px solid #E4E4E2', borderRadius: 4, overflow: 'hidden' }}>
          {[
            { n: '01', title: 'Submit your URLs', body: 'Enter your product URL and up to 3 competitor URLs. Tell us your primary user type and the key flows you want evaluated.' },
            { n: '02', title: 'AI evaluates', body: 'Screenshots are captured at 1440×900 and evaluated against all 10 Nielsen Norman heuristics, calibrated to production standards at BigTech companies.' },
            { n: '03', title: 'Get your roadmap', body: 'Receive a severity-coded gap analysis (P0–P3) and a prioritized improvement roadmap sorted by impact-to-effort ratio.' },
          ].map(step => (
            <div key={step.n} style={{ background: '#F8F8F6', padding: '28px 28px 28px' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6B6B69', display: 'block', marginBottom: 14 }}>{step.n}</span>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', color: '#111110' }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: '#6B6B69', lineHeight: 1.6, margin: 0 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing table */}
      <div style={{ borderTop: '1px solid #E4E4E2' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#E4E4E2', border: '1px solid #E4E4E2', borderRadius: 4, overflow: 'hidden', maxWidth: 560 }}>
          {[
            { plan: 'Solo', price: '$149', desc: 'Your product + 1 competitor', features: ['10 heuristic categories', 'Side-by-side gap analysis', 'Prioritized roadmap'] },
            { plan: 'Deep Dive', price: '$299', desc: 'Your product + up to 3 competitors', features: ['Everything in Solo', 'Multi-competitor comparison', 'Broader gap analysis'] },
          ].map(tier => (
            <div key={tier.plan} style={{ background: '#fff', padding: '24px' }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6B6B69', margin: '0 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{tier.plan}</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 600, color: '#111110', margin: '0 0 4px', letterSpacing: '-0.02em' }}>{tier.price}</p>
              <p style={{ fontSize: 12, color: '#6B6B69', margin: '0 0 16px' }}>{tier.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tier.features.map(f => (
                  <li key={f} style={{ fontSize: 12, color: '#6B6B69', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#1A7A3E', fontSize: 10 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <section id="form" style={{ borderTop: '1px solid #E4E4E2', background: '#fff' }}>
        <div style={{ maxWidth: 580, margin: '0 auto', padding: '64px 32px' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>Run your audit</p>
          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.015em', margin: '0 0 36px' }}>Start with your product URL</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field label="Your product URL">
              <input
                type="url"
                required
                value={yourUrl}
                onChange={e => setYourUrl(e.target.value)}
                placeholder="https://yourproduct.com"
                style={INPUT}
                onFocus={e => (e.currentTarget.style.borderColor = '#111110')}
                onBlur={e => (e.currentTarget.style.borderColor = '#E4E4E2')}
              />
            </Field>

            <div>
              <label style={LABEL}>Competitor URLs <span style={{ fontWeight: 400, color: '#6B6B69' }}>— up to 3</span></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                    style={INPUT}
                    onFocus={e => (e.currentTarget.style.borderColor = '#111110')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#E4E4E2')}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Primary user type">
                <input
                  type="text"
                  required
                  value={userType}
                  onChange={e => setUserType(e.target.value)}
                  placeholder="e.g. Startup founder"
                  style={INPUT}
                  onFocus={e => (e.currentTarget.style.borderColor = '#111110')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#E4E4E2')}
                />
              </Field>
              <Field label="Your email">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  style={INPUT}
                  onFocus={e => (e.currentTarget.style.borderColor = '#111110')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#E4E4E2')}
                />
              </Field>
            </div>

            <Field label="Key flows to evaluate">
              <textarea
                required
                value={keyFlows}
                onChange={e => setKeyFlows(e.target.value)}
                placeholder="e.g. Onboarding, dashboard overview, primary CTA flow"
                rows={3}
                style={{ ...INPUT, resize: 'none' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#111110')}
                onBlur={e => (e.currentTarget.style.borderColor = '#E4E4E2')}
              />
            </Field>

            {error && (
              <div style={{ padding: '10px 14px', background: '#FFF0F0', border: '1px solid #FECACA', borderRadius: 3, fontSize: 13, color: '#C20000' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #E4E4E2' }}>
              <div>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 600, margin: '0 0 2px', color: '#111110', letterSpacing: '-0.02em' }}>{price}</p>
                <p style={{ fontSize: 11, color: '#6B6B69', margin: 0 }}>
                  {competitorCount <= 1 ? 'single competitor' : `${competitorCount} competitors`} · one-time
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{ padding: '9px 20px', background: '#111110', color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Starting…' : 'Run audit →'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E4E4E2' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6B6B69' }}>AUDIT</span>
          <p style={{ fontSize: 12, color: '#6B6B69', margin: 0 }}>© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
