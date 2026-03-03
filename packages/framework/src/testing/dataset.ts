import type { EvalCase, EvalCaseResult } from './evals.js';

export interface EvalDataset {
  name: string;
  version: number;
  cases: EvalCase[];
  createdAt: Date;
}

export interface EvalRunRecord {
  datasetName: string;
  datasetVersion: number;
  runAt: Date;
  passRate: number;
  pass: boolean;
  results: EvalCaseResult[];
}

export interface EvalRunSummary {
  datasetName: string;
  datasetVersion: number;
  runAt: string; // ISO string
  passRate: number;
  pass: boolean;
}

export interface EvalRunStore {
  save(run: EvalRunRecord): Promise<void>;
  history(datasetName: string): Promise<EvalRunSummary[]>;
  getLatest(datasetName: string): Promise<EvalRunRecord | null>;
}

export function defineDataset(name: string, cases: EvalCase[]): EvalDataset {
  return { name, version: 1, cases, createdAt: new Date() };
}
