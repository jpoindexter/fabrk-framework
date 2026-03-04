"use client";

import { useEffect, useState } from 'react';
import type { AuditResult, RoadmapItem } from '../../../src/heuristics.js';

const SEVERITY_COLORS: Record<string, string> = {
  P0: 'text-red-400 border-red-900',
  P1: 'text-orange-400 border-orange-900',
  P2: 'text-yellow-400 border-yellow-900',
  P3: 'text-zinc-400 border-zinc-700',
  pass: 'text-green-400 border-green-900',
};

const EFFORT_LABEL = { low: 'LOW EFFORT', medium: 'MED EFFORT', high: 'HIGH EFFORT' };

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map(n => (
        <div
          key={n}
          className={`h-1.5 w-6 ${n <= Math.round(score) ? 'bg-white' : 'bg-zinc-700'}`}
        />
      ))}
      <span className="text-xs text-zinc-500 ml-1">{score.toFixed(1)}</span>
    </div>
  );
}

function RoadmapCard({ item }: { item: RoadmapItem }) {
  return (
    <div className={`border px-5 py-4 space-y-2 ${SEVERITY_COLORS[item.priority]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-widest font-bold">{item.priority}</span>
        <span className="text-xs text-zinc-600">{EFFORT_LABEL[item.effort]}</span>
      </div>
      <p className="text-xs text-zinc-400">{item.heuristic}</p>
      <p className="text-sm text-white">{item.finding}</p>
      <p className="text-xs text-zinc-400 border-t border-zinc-800 pt-2 mt-2">&gt; {item.action}</p>
    </div>
  );
}

export default function AuditPage({ params }: { params: { id: string } }) {
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    async function poll() {
      try {
        const res = await fetch(`/api/audit?id=${params.id}`);
        if (!res.ok) { setError('Audit not found'); return; }
        const data = await res.json() as AuditResult;
        setAudit(data);
        if (data.status === 'complete' || data.status === 'failed') {
          clearInterval(timer);
        }
      } catch {
        setError('Failed to fetch audit status');
      }
    }

    poll();
    timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [params.id]);

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <header className="border-b border-zinc-800 px-8 py-5 flex items-center justify-between">
        <a href="/" className="text-sm tracking-widest text-zinc-400 hover:text-white transition-colors">
          [ UX AUDIT ]
        </a>
        <span className="text-xs text-zinc-600">{params.id.slice(0, 8).toUpperCase()}</span>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-16">
        {error && (
          <p className="text-red-400 border border-red-900 bg-red-950 px-4 py-3 text-sm">{error}</p>
        )}

        {!audit && !error && (
          <div className="text-zinc-500 text-sm tracking-widest animate-pulse">[ LOADING... ]</div>
        )}

        {audit?.status === 'pending' && (
          <div className="space-y-4">
            <p className="text-sm tracking-widest text-zinc-400">[ PAYMENT RECEIVED — QUEUED ]</p>
            <p className="text-xs text-zinc-600">Your audit will begin processing shortly.</p>
          </div>
        )}

        {audit?.status === 'processing' && (
          <div className="space-y-4">
            <p className="text-sm tracking-widest text-zinc-400 animate-pulse">[ PROCESSING — CAPTURING SCREENSHOTS ]</p>
            <p className="text-xs text-zinc-600">Evaluating UX across 10 heuristic categories. 5–10 minutes.</p>
          </div>
        )}

        {audit?.status === 'failed' && (
          <div className="space-y-4">
            <p className="text-sm tracking-widest text-red-400">[ AUDIT FAILED ]</p>
            <p className="text-xs text-zinc-500">{audit.error}</p>
            <p className="text-xs text-zinc-600">Contact support with audit ID: {params.id}</p>
          </div>
        )}

        {audit?.status === 'complete' && audit.yourProduct && (
          <div className="space-y-16">
            {/* Overview */}
            <div className="space-y-2">
              <p className="text-xs tracking-widest text-zinc-500">[ AUDIT COMPLETE ]</p>
              <h1 className="text-2xl font-bold">{audit.yourProduct.url}</h1>
              <div className="flex items-center gap-4 pt-1">
                <ScoreBar score={audit.yourProduct.overall} />
                <span className="text-xs text-zinc-500">OVERALL SCORE</span>
              </div>
              <p className="text-sm text-zinc-400 mt-3 max-w-2xl leading-relaxed">
                {audit.yourProduct.summary}
              </p>
            </div>

            {/* Heuristic scores */}
            <div className="space-y-4">
              <p className="text-xs tracking-widest text-zinc-500">[ HEURISTIC SCORES ]</p>
              <div className="divide-y divide-zinc-800 border border-zinc-800">
                {audit.yourProduct.scores.map(s => (
                  <div key={s.id} className="px-5 py-4 grid grid-cols-[1fr_auto] gap-4 items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold tracking-wider px-2 py-0.5 border ${SEVERITY_COLORS[s.severity]}`}>
                          {s.severity}
                        </span>
                        <span className="text-sm text-white capitalize">{s.id.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{s.finding}</p>
                      {s.severity !== 'pass' && (
                        <p className="text-xs text-zinc-600">&gt; {s.recommendation}</p>
                      )}
                    </div>
                    <ScoreBar score={s.score} />
                  </div>
                ))}
              </div>
            </div>

            {/* Competitor comparison */}
            {audit.competitors.length > 0 && audit.gapAnalysis && (
              <div className="space-y-4">
                <p className="text-xs tracking-widest text-zinc-500">[ GAP ANALYSIS ]</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <p className="text-xs text-green-400 tracking-widest">[ YOU WIN ]</p>
                    {audit.gapAnalysis.youWin.length === 0
                      ? <p className="text-xs text-zinc-600">—</p>
                      : audit.gapAnalysis.youWin.map((w, i) => (
                          <div key={i} className="border border-green-900 px-4 py-3 space-y-1">
                            <p className="text-xs font-bold text-green-400">{w.heuristic}</p>
                            <p className="text-xs text-zinc-400">{w.detail}</p>
                          </div>
                        ))}
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs text-red-400 tracking-widest">[ THEY WIN ]</p>
                    {audit.gapAnalysis.theyWin.length === 0
                      ? <p className="text-xs text-zinc-600">—</p>
                      : audit.gapAnalysis.theyWin.map((w, i) => (
                          <div key={i} className="border border-red-900 px-4 py-3 space-y-1">
                            <p className="text-xs font-bold text-red-400">{w.heuristic}</p>
                            <p className="text-xs text-zinc-300">{w.competitor}</p>
                            <p className="text-xs text-zinc-400">{w.detail}</p>
                          </div>
                        ))}
                  </div>
                </div>
              </div>
            )}

            {/* Roadmap */}
            {audit.roadmap && audit.roadmap.length > 0 && (
              <div className="space-y-4">
                <p className="text-xs tracking-widest text-zinc-500">[ PRIORITIZED ROADMAP ]</p>
                <div className="space-y-3">
                  {audit.roadmap.map((item, i) => (
                    <RoadmapCard key={i} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Competitor screenshots */}
            {audit.competitors.length > 0 && (
              <div className="space-y-8">
                <p className="text-xs tracking-widest text-zinc-500">[ COMPETITOR EVALUATIONS ]</p>
                {audit.competitors.map((comp, i) => (
                  <div key={i} className="space-y-4 border-t border-zinc-800 pt-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold">{comp.url}</h3>
                      <ScoreBar score={comp.overall} />
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{comp.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
