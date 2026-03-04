/**
 * In-memory audit store — swap for Supabase/Redis in production.
 */
import type { AuditResult } from './heuristics.js';

const audits = new Map<string, AuditResult>();

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
