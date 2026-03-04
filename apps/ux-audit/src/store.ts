/**
 * In-memory audit store — swap for Supabase/Redis in production.
 *
 * Uses globalThis so the Map survives Vite SSR module re-evaluation
 * (each route handler gets a fresh module namespace, but globalThis is shared).
 */
import type { AuditResult } from './heuristics.js';

declare global {
  // eslint-disable-next-line no-var
  var __uxAudits: Map<string, AuditResult> | undefined;
}

const audits: Map<string, AuditResult> = globalThis.__uxAudits ?? new Map();
globalThis.__uxAudits = audits;

export function createAudit(id: string, initial: Omit<AuditResult, 'id'>): AuditResult {
  const audit: AuditResult = { id, ...initial };
  audits.set(id, audit);
  return audit;
}

export function getAudit(id: string): AuditResult | null {
  return audits.get(id) ?? null;
}

export function updateAudit(id: string, patch: Partial<AuditResult>): AuditResult | null {
  const existing = audits.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  audits.set(id, updated);
  return updated;
}
