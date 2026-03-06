import { writeFile, readFile, mkdir, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { EvalRunRecord, EvalRunStore, EvalRunSummary } from './dataset.js';

export class FileEvalRunStore implements EvalRunStore {
  constructor(private dir = './fabrk-eval-runs') {}

  async save(run: EvalRunRecord): Promise<void> {
    const base = resolve(this.dir);
    const datasetDir = resolve(base, run.datasetName);
    // Prevent path traversal if datasetName contains '..' segments.
    if (!datasetDir.startsWith(base + '/') && datasetDir !== base) {
      throw new Error(`Invalid dataset name: "${run.datasetName}"`);
    }
    await mkdir(datasetDir, { recursive: true });
    const ts = new Date(run.runAt).toISOString().replace(/[:.]/g, '-');
    await writeFile(join(datasetDir, `run-${ts}.json`), JSON.stringify(run, null, 2));
  }

  async history(datasetName: string): Promise<EvalRunSummary[]> {
    const datasetDir = join(this.dir, datasetName);
    let files: string[];
    try {
      files = await readdir(datasetDir);
    } catch (err) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.warn('[fabrk] failed to read eval run directory:', err);
      }
      return [];
    }
    const summaries: EvalRunSummary[] = [];
    for (const f of files.filter((f) => f.endsWith('.json')).sort()) {
      try {
        const raw = JSON.parse(await readFile(join(datasetDir, f), 'utf-8')) as EvalRunRecord;
        summaries.push({
          datasetName: raw.datasetName,
          datasetVersion: raw.datasetVersion,
          runAt: new Date(raw.runAt).toISOString(),
          passRate: raw.passRate,
          pass: raw.pass,
        });
      } catch (err) {
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
          console.warn('[fabrk] failed to parse eval run file:', f, err);
        }
      }
    }
    return summaries;
  }

  async getLatest(datasetName: string): Promise<EvalRunRecord | null> {
    const datasetDir = join(this.dir, datasetName);
    let files: string[];
    try {
      files = await readdir(datasetDir);
    } catch (err) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.warn('[fabrk] failed to read latest eval run:', err);
      }
      return null;
    }
    const sorted = files.filter((f) => f.endsWith('.json')).sort();
    if (sorted.length === 0) return null;
    const target = sorted[sorted.length - 1];
    return JSON.parse(await readFile(join(datasetDir, target), 'utf-8')) as EvalRunRecord;
  }
}
