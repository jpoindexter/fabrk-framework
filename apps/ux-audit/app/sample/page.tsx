"use client";

import '../globals.css';
import type { RoadmapItem } from '../../src/heuristics.js';
import { getSampleAuditResult } from '../../src/mock-data.js';

const SEV: Record<string, { bg: string; color: string }> = {
  P0: { bg: '#FFF0F0', color: '#C20000' },
  P1: { bg: '#FFF4EC', color: '#C15000' },
  P2: { bg: '#FFFBEB', color: '#9A6B00' },
  P3: { bg: '#F5F5F4', color: '#666462' },
  pass: { bg: '#F0FAF4', color: '#1A7A3E' },
};

const EFFORT: Record<string, string> = { low: 'Low effort', medium: 'Medium effort', high: 'High effort' };

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

export default function SamplePage() {
  const audit = getSampleAuditResult();
  const { yourProduct, competitors, gapAnalysis, roadmap } = audit;

  return (
    <div style={{ background: '#F8F8F6', minHeight: '100vh', fontFamily: 'Manrope, sans-serif', color: '#111110' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #E4E4E2', background: '#F8F8F6' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
          <a href="/" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: '#111110', textDecoration: 'none' }}>
            AUDIT
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '3px 8px', background: '#FFFBEB', color: '#9A6B00', borderRadius: 2 }}>SAMPLE REPORT</span>
            <a
              href="/#form"
              style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', background: '#111110', color: '#fff', textDecoration: 'none', borderRadius: 3 }}
            >
              Run your audit
            </a>
          </div>
        </div>
      </nav>

      {/* Sample banner */}
      <div style={{ borderBottom: '1px solid #E4E4E2', background: '#FFFBEB', padding: '10px 32px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <p style={{ fontSize: 12, color: '#9A6B00', margin: 0 }}>
            This is a sample audit report using representative mock data. <a href="/#form" style={{ color: '#9A6B00', fontWeight: 600 }}>Run a real audit →</a>
          </p>
        </div>
      </div>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '48px 32px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>

          {/* Header */}
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 10px' }}>Audit complete</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 12px' }}>{yourProduct.url}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <ScoreBar score={yourProduct.overall} />
              <span style={{ fontSize: 12, color: '#6B6B69' }}>Overall score</span>
            </div>
            <p style={{ fontSize: 14, color: '#6B6B69', lineHeight: 1.65, maxWidth: 620, margin: 0 }}>{yourProduct.summary}</p>
          </div>

          {/* Heuristic scores */}
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 16px' }}>Heuristic scores</p>
            <div style={{ border: '1px solid #E4E4E2', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
              {yourProduct.scores.map((s, i) => (
                <div
                  key={s.id}
                  style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, padding: '14px 18px', borderBottom: i < yourProduct.scores.length - 1 ? '1px solid #F2F2F0' : 'none', alignItems: 'start' }}
                >
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
                  <div style={{ paddingTop: 2 }}>
                    <ScoreBar score={s.score} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gap analysis */}
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 16px' }}>Gap analysis</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#1A7A3E', margin: '0 0 10px' }}>You have the edge</p>
                {gapAnalysis.youWin.map((w, i) => (
                  <div key={i} style={{ border: '1px solid #D1FAE5', borderRadius: 3, padding: '10px 14px', marginBottom: 8, background: '#F0FAF4' }}>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#1A7A3E', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{w.heuristic}</p>
                    <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.5 }}>{w.detail}</p>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#C15000', margin: '0 0 10px' }}>Competitors have the edge</p>
                {gapAnalysis.theyWin.map((w, i) => (
                  <div key={i} style={{ border: '1px solid #FED7AA', borderRadius: 3, padding: '10px 14px', marginBottom: 8, background: '#FFF7ED' }}>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#C15000', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{w.heuristic}</p>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#9A6B00', margin: '0 0 4px' }}>{w.competitor}</p>
                    <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.5 }}>{w.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Roadmap */}
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px' }}>Prioritized roadmap</p>
            <p style={{ fontSize: 12, color: '#6B6B69', margin: '0 0 16px' }}>Sorted by priority, then effort</p>
            <div>
              {roadmap.map((item, i) => <RoadmapRow key={i} item={item} />)}
            </div>
          </div>

          {/* Competitor summaries */}
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B6B69', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 16px' }}>Competitor evaluations</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {competitors.map((comp, i) => (
                <div key={i} style={{ border: '1px solid #E4E4E2', borderRadius: 4, padding: '16px 18px', background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: '#111110' }}>{comp.url}</span>
                    <ScoreBar score={comp.overall} />
                  </div>
                  <p style={{ fontSize: 12, color: '#6B6B69', lineHeight: 1.6, margin: 0 }}>{comp.summary}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ borderTop: '1px solid #E4E4E2', paddingTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.01em' }}>Ready to audit your product?</p>
              <p style={{ fontSize: 13, color: '#6B6B69', margin: 0 }}>$149 for a single competitor · $299 for up to 3 · One-time</p>
            </div>
            <a
              href="/#form"
              style={{ padding: '9px 20px', background: '#111110', color: '#fff', textDecoration: 'none', borderRadius: 3, fontSize: 13, fontWeight: 600 }}
            >
              Run your audit →
            </a>
          </div>

        </div>
      </main>
    </div>
  );
}
