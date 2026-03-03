import { writeFile, readFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { EvalRunRecord, EvalRunStore, EvalRunSummary } from './dataset.js';

export class FileEvalRunStore implements EvalRunStore {
  constructor(private dir = './fabrk-eval-runs') {}

  async save(run: EvalRunRecord): Promise<void> {
    const datasetDir = join(this.dir, run.datasetName);
    await mkdir(datasetDir, { recursive: true });
    const ts = new Date(run.runAt).toISOString().replace(/[:.]/g, '-');
    await writeFile(join(datasetDir, `run-${ts}.json`), JSON.stringify(run, null, 2));
  }

  async history(datasetName: string): Promise<EvalRunSummary[]> {
    const datasetDir = join(this.dir, datasetName);
    let files: string[];
    try {
      files = await readdir(datasetDir);
    } catch {
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
      } catch {
        // skip malformed
      }
    }
    return summaries;
  }

  async getLatest(datasetName: string): Promise<EvalRunRecord | null> {
    const datasetDir = join(this.dir, datasetName);
    let files: string[];
    try {
      files = await readdir(datasetDir);
    } catch {
      return null;
    }
    const sorted = files.filter((f) => f.endsWith('.json')).sort();
    if (sorted.length === 0) return null;
    const target = sorted[sorted.length - 1];
    return JSON.parse(await readFile(join(datasetDir, target), 'utf-8')) as EvalRunRecord;
  }
}
