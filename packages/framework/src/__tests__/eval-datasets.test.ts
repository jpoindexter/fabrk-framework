import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { defineDataset } from '../testing/dataset';
import type { EvalRunRecord } from '../testing/dataset';
import { FileEvalRunStore } from '../testing/file-run-store';
import { defineEval, runEvals } from '../testing/evals';
import { exactMatch } from '../testing/scorers';
import { mockLLM } from '../testing/mock-llm';

describe('eval datasets', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `fabrk-eval-test-${Date.now()}`);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('defineDataset returns correct shape', () => {
    const ds = defineDataset('my-suite', [{ input: 'hello', expected: 'hi' }]);
    expect(ds.name).toBe('my-suite');
    expect(ds.version).toBe(1);
    expect(ds.cases).toHaveLength(1);
    expect(ds.createdAt).toBeInstanceOf(Date);
  });

  it('runEvals without opts is fully backward compatible', async () => {
    const mock = mockLLM().setDefault('hello');
    const suite = defineEval({
      name: 'basic',
      agent: { mock },
      cases: [{ input: 'say hello', expected: 'hello' }],
      scorers: [exactMatch()],
    });
    const result = await runEvals(suite);
    expect(result.pass).toBe(true);
    expect(result.passRate).toBe(1);
  });

  it('runEvals with store and dataset calls store.save', async () => {
    const mock = mockLLM().setDefault('hello');
    const suite = defineEval({
      name: 'with-store',
      agent: { mock },
      cases: [{ input: 'say hello', expected: 'hello' }],
      scorers: [exactMatch()],
    });
    const saveSpy = vi.fn().mockResolvedValue(undefined);
    const storeMock = {
      save: saveSpy,
      history: vi.fn().mockResolvedValue([]),
      getLatest: vi.fn().mockResolvedValue(null),
    };
    const dataset = defineDataset('with-store', suite.cases);
    await runEvals(suite, { dataset, store: storeMock });
    expect(saveSpy).toHaveBeenCalledOnce();
    const saved = saveSpy.mock.calls[0][0] as EvalRunRecord;
    expect(saved.datasetName).toBe('with-store');
    expect(saved.datasetVersion).toBe(1);
    expect(saved.passRate).toBe(1);
    expect(saved.pass).toBe(true);
  });

  it('FileEvalRunStore.save writes JSON file', async () => {
    const store = new FileEvalRunStore(tmpDir);
    const run: EvalRunRecord = {
      datasetName: 'test-ds',
      datasetVersion: 1,
      runAt: new Date('2026-01-01T00:00:00Z'),
      passRate: 0.8,
      pass: false,
      results: [],
    };
    await store.save(run);
    const history = await store.history('test-ds');
    expect(history).toHaveLength(1);
    expect(history[0].passRate).toBe(0.8);
    expect(history[0].pass).toBe(false);
  });

  it('FileEvalRunStore.history returns empty array for missing dir', async () => {
    const store = new FileEvalRunStore(join(tmpDir, 'nonexistent'));
    const history = await store.history('missing');
    expect(history).toEqual([]);
  });

  it('FileEvalRunStore.getLatest returns null for empty store', async () => {
    const store = new FileEvalRunStore(tmpDir);
    const result = await store.getLatest('empty');
    expect(result).toBeNull();
  });

  it('FileEvalRunStore.getLatest returns full run record', async () => {
    const store = new FileEvalRunStore(tmpDir);
    const run: EvalRunRecord = {
      datasetName: 'full-ds',
      datasetVersion: 2,
      runAt: new Date('2026-02-01T00:00:00Z'),
      passRate: 1.0,
      pass: true,
      results: [{ input: 'a', output: 'b', pass: true, scores: [], toolCalls: [] }],
    };
    await store.save(run);
    const latest = await store.getLatest('full-ds');
    expect(latest?.datasetVersion).toBe(2);
    expect(latest?.results).toHaveLength(1);
  });

  it('emits regression warning when previously passing case now fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mock = mockLLM().setDefault('wrong answer');
    const suite = defineEval({
      name: 'regression-test',
      agent: { mock },
      cases: [{ input: 'question', expected: 'correct answer' }],
      scorers: [exactMatch()],
    });
    const prevRecord: EvalRunRecord = {
      datasetName: 'regression-test',
      datasetVersion: 1,
      runAt: new Date(),
      passRate: 1.0,
      pass: true,
      results: [{ input: 'question', output: 'correct answer', expected: 'correct answer', pass: true, scores: [], toolCalls: [] }],
    };
    await runEvals(suite, { compareWith: prevRecord });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[eval regression]'));
    warnSpy.mockRestore();
  });

  it('no warning when case failed before and fails now', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mock = mockLLM().setDefault('wrong');
    const suite = defineEval({
      name: 'no-regression',
      agent: { mock },
      cases: [{ input: 'q', expected: 'right' }],
      scorers: [exactMatch()],
    });
    const prevRecord: EvalRunRecord = {
      datasetName: 'no-regression',
      datasetVersion: 1,
      runAt: new Date(),
      passRate: 0,
      pass: false,
      results: [{ input: 'q', output: 'wrong', expected: 'right', pass: false, scores: [], toolCalls: [] }],
    };
    await runEvals(suite, { compareWith: prevRecord });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
