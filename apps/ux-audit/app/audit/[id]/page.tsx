"use client";

import { useEffect, useState } from 'react';
import type { AuditResult, RoadmapItem } from '../../../src/heuristics.js';

const SEVERITY_BG: Record<string, string> = {
  P0: '#FEF2F2',
  P1: '#FFF7ED',
  P2: '#FEFCE8',
  P3: '#F8F7F4',
  pass: '#F0FDF4',
};
const SEVERITY_TEXT: Record<string, string> = {
  P0: '#DC2626',
  P1: '#EA580C',
  P2: '#CA8A04',
  P3: '#6B7280',
  pass: '#16A34A',
};
const EFFORT_LABEL: Record<string, string> = {
  low: 'Low effort',
  medium: 'Medium effort',
  high: 'High effort',
};

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map(n => (
        <div
          key={n}
          className="h-1.5 w-5 rounded-full"
          style={{ background: n <= Math.round(score) ? '#7C3AED' : '#E8E6E1' }}
        />
      ))}
      <span className="text-xs text-gray-400 ml-1">{score.toFixed(1)}</span>
    </div>
  );
}

function RoadmapCard({ item }: { item: RoadmapItem }) {
  return (
    <div
      className="rounded-xl px-5 py-4 space-y-2"
      style={{ background: SEVERITY_BG[item.priority], border: `1px solid ${SEVERITY_TEXT[item.priority]}22` }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: SEVERITY_TEXT[item.priority] + '18', color: SEVERITY_TEXT[item.priority] }}
        >
          {item.priority}
        </span>
        <span className="text-xs text-gray-400">{EFFORT_LABEL[item.effort]}</span>
      </div>
      <p className="text-xs text-gray-500">{item.heuristic}</p>
      <p className="text-sm font-medium text-gray-900">{item.finding}</p>
      <p className="text-xs text-gray-500 pt-1">{item.action}</p>
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
        if (data.status === 'complete' || data.status === 'failed') clearInterval(timer);
      } catch {
        setError('Failed to fetch audit status');
      }
    }

    poll();
    timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [params.id]);

  return (
    <div className="min-h-screen" style={{ background: '#F8F7F4', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <nav style={{ borderBottom: '1px solid #E8E6E1', background: '#FDFCFA' }} className="px-8 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <a href="/" className="font-serif text-lg font-semibold text-gray-900 hover:text-gray-600 transition-colors"
          style={{ fontFamily: 'Lora, Georgia, serif' }}>
          ux audit
        </a>
        <span className="text-xs text-gray-400">{params.id.slice(0, 8).toUpperCase()}</span>
      </nav>

      <main className="max-w-4xl mx-auto px-8 py-16 space-y-16">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-600">{error}</div>
        )}

        {!audit && !error && (
          <div className="text-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-400">Loading your audit…</p>
          </div>
        )}

        {audit?.status === 'pending' && (
          <div className="text-center py-24 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin mx-auto" />
            <p className="text-base font-medium text-gray-900">Payment received — queued</p>
            <p className="text-sm text-gray-400">Your audit will begin processing shortly.</p>
          </div>
        )}

        {audit?.status === 'processing' && (
          <div className="text-center py-24 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin mx-auto" />
            <p className="text-base font-medium text-gray-900">Capturing screenshots and evaluating…</p>
            <p className="text-sm text-gray-400">Evaluating 10 heuristic categories. Usually 5–10 minutes.</p>
          </div>
        )}

        {audit?.status === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-5 space-y-2">
            <p className="font-medium text-red-700">Audit failed</p>
            <p className="text-sm text-red-500">{audit.error}</p>
            <p className="text-xs text-gray-400">Audit ID: {params.id}</p>
          </div>
        )}

        {audit?.status === 'complete' && audit.yourProduct && (
          <>
            {/* Header */}
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Audit complete</p>
              <h1 className="font-serif text-3xl font-bold text-gray-900"
                style={{ fontFamily: 'Lora, Georgia, serif' }}>
                {audit.yourProduct.url}
              </h1>
              <div className="flex items-center gap-4">
                <ScoreBar score={audit.yourProduct.overall} />
                <span className="text-xs text-gray-400">Overall score</span>
              </div>
              <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">{audit.yourProduct.summary}</p>
            </div>

            {/* Heuristic scores */}
            <div className="space-y-4">
              <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Heuristic scores</p>
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E6E1', background: '#FDFCFA' }}>
                {audit.yourProduct.scores.map((s, i) => (
                  <div
                    key={s.id}
                    className="px-6 py-4 grid grid-cols-[1fr_auto] gap-6 items-start"
                    style={{ borderBottom: i < audit.yourProduct!.scores.length - 1 ? '1px solid #E8E6E1' : 'none' }}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: SEVERITY_TEXT[s.severity] + '18', color: SEVERITY_TEXT[s.severity] }}
                        >
                          {s.severity}
                        </span>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {s.id.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{s.finding}</p>
                      {s.severity !== 'pass' && (
                        <p className="text-xs text-gray-400">{s.recommendation}</p>
                      )}
                    </div>
                    <div className="pt-1">
                      <ScoreBar score={s.score} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gap analysis */}
            {audit.competitors.length > 0 && audit.gapAnalysis && (
              <div className="space-y-4">
                <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Gap analysis</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-green-600">You have the edge</p>
                    {audit.gapAnalysis.youWin.length === 0
                      ? <p className="text-xs text-gray-400">No clear advantages identified.</p>
                      : audit.gapAnalysis.youWin.map((w, i) => (
                          <div key={i} className="rounded-xl px-4 py-3 space-y-1"
                            style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                            <p className="text-xs font-semibold text-green-700">{w.heuristic}</p>
                            <p className="text-xs text-gray-600">{w.detail}</p>
                          </div>
                        ))}
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-red-500">Competitors have the edge</p>
                    {audit.gapAnalysis.theyWin.length === 0
                      ? <p className="text-xs text-gray-400">No competitor advantages identified.</p>
                      : audit.gapAnalysis.theyWin.map((w, i) => (
                          <div key={i} className="rounded-xl px-4 py-3 space-y-1"
                            style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                            <p className="text-xs font-semibold text-red-600">{w.heuristic}</p>
                            <p className="text-xs text-gray-500">{w.competitor}</p>
                            <p className="text-xs text-gray-600">{w.detail}</p>
                          </div>
                        ))}
                  </div>
                </div>
              </div>
            )}

            {/* Roadmap */}
            {audit.roadmap && audit.roadmap.length > 0 && (
              <div className="space-y-4">
                <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Prioritized roadmap</p>
                <div className="space-y-3">
                  {audit.roadmap.map((item, i) => <RoadmapCard key={i} item={item} />)}
                </div>
              </div>
            )}

            {/* Competitor summaries */}
            {audit.competitors.length > 0 && (
              <div className="space-y-6">
                <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Competitor evaluations</p>
                {audit.competitors.map((comp, i) => (
                  <div key={i} className="rounded-2xl px-6 py-5 space-y-3"
                    style={{ background: '#FDFCFA', border: '1px solid #E8E6E1' }}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{comp.url}</p>
                      <ScoreBar score={comp.overall} />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{comp.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
