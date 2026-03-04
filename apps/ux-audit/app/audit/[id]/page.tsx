"use client";

import { useEffect, useState } from 'react';
import type { AuditResult, RoadmapItem } from '../../../src/heuristics.js';

const SEV: Record<string, { bg: string; color: string }> = {
  P0: { bg: '#FFF0F0', color: '#C20000' },
  P1: { bg: '#FFF4EC', color: '#C15000' },
  P2: { bg: '#FFFBEB', color: '#9A6B00' },
  P3: { bg: '#F5F5F4', color: '#666462' },
  pass: { bg: '#F0FAF4', color: '#1A7A3E' },
};

const EFFORT: Record<string, string> = { low: 'Low effort', medium: 'Medium effort', high: 'High effort' };

const STEPS = [
  'Queued',
  'Capturing screenshots at 1440×900',
  'Evaluating 10 heuristic categories',
  'Comparing against competitors',
  'Building prioritized roadmap',
];

function ScoreBar({ score }: { score: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} style={{ height: 3, width: 18, background: n <= Math.round(score) ? '#111110' : '#E4E4E2', borderRadius: 1 }} />
      ))}
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', marginLeft: 2 }}>{score.toFixed(1)}</span>
    </div>
  );
}

function SevBadge({ sev }: { sev: string }) {
  return (
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '2px 6px', background: SEV[sev]?.bg ?? '#F5F5F4', color: SEV[sev]?.color ?? '#666', borderRadius: 2 }}>
      {sev}
    </span>
  );
}

function RoadmapRow({ item }: { item: RoadmapItem }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 16, padding: '16px 0', borderBottom: '1px solid #F2F2F0', alignItems: 'start' }}>
      <SevBadge sev={item.priority} />
      <div>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.heuristic}</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#111110', margin: '0 0 4px' }}>{item.finding}</p>
        <p style={{ fontSize: 12, color: '#6B6B69', margin: 0, lineHeight: 1.55 }}>{item.action}</p>
      </div>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', flexShrink: 0, paddingTop: 2 }}>{EFFORT[item.effort]}</span>
    </div>
  );
}

function ProcessingScreen({ status }: { status: 'pending' | 'processing' }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (status === 'pending') { setStep(0); return; }
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed < 2800) setStep(1);
      else if (elapsed < 5600) setStep(2);
      else if (elapsed < 7200) setStep(3);
      else setStep(4);
    }, 400);
    return () => clearInterval(interval);
  }, [status]);

  return (
    <div style={{ maxWidth: 480, margin: '80px auto 0', padding: '0 32px' }}>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 32px' }}>
        {status === 'pending' ? 'Queued' : 'Processing'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: i < STEPS.length - 1 ? '1px solid #F2F2F0' : 'none' }}>
              <div style={{ width: 20, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {done ? (
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#1A7A3E' }}>✓</span>
                ) : active ? (
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #111110', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E4E4E2' }} />
                )}
              </div>
              <span style={{ fontSize: 13, color: done ? '#6B6B69' : active ? '#111110' : '#B0B0AE', fontWeight: active ? 600 : 400 }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AuditPage({ params }: { params: { id: string } }) {
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    async function poll() {
      try {
        const res = await fetch(`/api/audit?id=${params.id}`);
        if (!res.ok) { setError('Audit not found'); return; }
        const data = await res.json() as AuditResult;
        setAudit(data);
        if (data.status === 'complete' || data.status === 'failed') clearInterval(timer);
      } catch {
        setError('Failed to fetch audit status');
      }
    }
    poll();
    timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [params.id]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ background: '#F8F8F6', minHeight: '100vh', fontFamily: 'Manrope, sans-serif', color: '#111110' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #E4E4E2', background: '#F8F8F6' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
          <a href="/" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: '#111110', textDecoration: 'none' }}>
            AUDIT
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {audit?.status === 'complete' && (
              <button
                onClick={copyLink}
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6B6B69', background: 'none', border: '1px solid #E4E4E2', borderRadius: 3, padding: '5px 12px', cursor: 'pointer' }}
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            )}
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', letterSpacing: '0.06em' }}>
              {params.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '0 32px 80px' }}>

        {error && (
          <div style={{ marginTop: 40, padding: '12px 16px', background: '#FFF0F0', border: '1px solid #FECACA', borderRadius: 3, fontSize: 13, color: '#C20000' }}>{error}</div>
        )}

        {!audit && !error && <ProcessingScreen status="pending" />}

        {(audit?.status === 'pending' || audit?.status === 'processing') && (
          <ProcessingScreen status={audit.status} />
        )}

        {audit?.status === 'failed' && (
          <div style={{ marginTop: 40, padding: '16px 20px', background: '#FFF0F0', border: '1px solid #FECACA', borderRadius: 3 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#C20000', margin: '0 0 4px' }}>Audit failed</p>
            <p style={{ fontSize: 12, color: '#C20000', margin: '0 0 8px' }}>{audit.error}</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', margin: 0 }}>{params.id}</p>
          </div>
        )}

        {audit?.status === 'complete' && audit.yourProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 56, paddingTop: 48 }}>

            <div>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 10px' }}>Audit complete</p>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 12px' }}>{audit.yourProduct.url}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <ScoreBar score={audit.yourProduct.overall} />
                <span style={{ fontSize: 12, color: '#6B6B69' }}>Overall score</span>
              </div>
              <p style={{ fontSize: 14, color: '#6B6B69', lineHeight: 1.65, maxWidth: 620, margin: '0 0 20px' }}>{audit.yourProduct.summary}</p>
              {audit.yourProduct.screenshot && (
                <div style={{ border: '1px solid #E4E4E2', borderRadius: 4, overflow: 'hidden', maxWidth: 720 }}>
                  <img src={`data:image/png;base64,${audit.yourProduct.screenshot}`} alt={`Screenshot of ${audit.yourProduct.url}`} style={{ width: '100%', display: 'block' }} />
                </div>
              )}
            </div>

            <div>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 16px' }}>Heuristic scores</p>
              <div style={{ border: '1px solid #E4E4E2', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
                {audit.yourProduct.scores.map((s, i) => (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, padding: '14px 18px', borderBottom: i < audit.yourProduct!.scores.length - 1 ? '1px solid #F2F2F0' : 'none', alignItems: 'start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <SevBadge sev={s.severity} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#111110', textTransform: 'capitalize' }}>
                          {s.id.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#6B6B69', margin: '0 0 4px', lineHeight: 1.55 }}>{s.finding}</p>
                      {s.severity !== 'pass' && s.recommendation && (
                        <p style={{ fontSize: 11, color: '#9A9A98', margin: 0, lineHeight: 1.5 }}>{s.recommendation}</p>
                      )}
                    </div>
                    <div style={{ paddingTop: 2 }}><ScoreBar score={s.score} /></div>
                  </div>
                ))}
              </div>
            </div>

            {audit.competitors.length > 0 && audit.gapAnalysis && (
              <div>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 16px' }}>Gap analysis</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#1A7A3E', margin: '0 0 10px' }}>You have the edge</p>
                    {audit.gapAnalysis.youWin.length === 0
                      ? <p style={{ fontSize: 12, color: '#6B6B69' }}>No clear advantages identified.</p>
                      : audit.gapAnalysis.youWin.map((w, i) => (
                          <div key={i} style={{ border: '1px solid #D1FAE5', borderRadius: 3, padding: '10px 14px', marginBottom: 8, background: '#F0FAF4' }}>
                            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#1A7A3E', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{w.heuristic}</p>
                            <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.5 }}>{w.detail}</p>
                          </div>
                        ))}
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#C15000', margin: '0 0 10px' }}>Competitors have the edge</p>
                    {audit.gapAnalysis.theyWin.length === 0
                      ? <p style={{ fontSize: 12, color: '#6B6B69' }}>No competitor advantages identified.</p>
                      : audit.gapAnalysis.theyWin.map((w, i) => (
                          <div key={i} style={{ border: '1px solid #FED7AA', borderRadius: 3, padding: '10px 14px', marginBottom: 8, background: '#FFF7ED' }}>
                            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#C15000', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{w.heuristic}</p>
                            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#9A6B00', margin: '0 0 4px' }}>{w.competitor}</p>
                            <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.5 }}>{w.detail}</p>
                          </div>
                        ))}
                  </div>
                </div>
              </div>
            )}

            {audit.roadmap && audit.roadmap.length > 0 && (
              <div>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px' }}>Prioritized roadmap</p>
                <p style={{ fontSize: 12, color: '#6B6B69', margin: '0 0 16px' }}>Sorted by priority, then effort</p>
                <div>{audit.roadmap.map((item, i) => <RoadmapRow key={i} item={item} />)}</div>
              </div>
            )}

            {audit.competitors.length > 0 && (
              <div>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 16px' }}>Competitor evaluations</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {audit.competitors.map((comp, i) => (
                    <div key={i} style={{ border: '1px solid #E4E4E2', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
                      {comp.screenshot && (
                        <img src={`data:image/png;base64,${comp.screenshot}`} alt={`Screenshot of ${comp.url}`} style={{ width: '100%', display: 'block', borderBottom: '1px solid #E4E4E2' }} />
                      )}
                      <div style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: '#111110' }}>{comp.url}</span>
                          <ScoreBar score={comp.overall} />
                        </div>
                        <p style={{ fontSize: 12, color: '#6B6B69', lineHeight: 1.6, margin: 0 }}>{comp.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
