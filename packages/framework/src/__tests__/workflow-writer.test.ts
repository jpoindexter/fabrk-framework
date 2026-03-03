import { describe, it, expect } from 'vitest';
import { defineWorkflow } from '../agents/workflow/define-workflow';
import { runWorkflow, createWorkflowStream } from '../agents/workflow/runner';

describe('createWorkflowStream()', () => {
  it('returns a readable stream and writer pair', () => {
    const { stream, writer } = createWorkflowStream();
    expect(stream).toBeInstanceOf(ReadableStream);
    expect(writer).toBeDefined();
    expect(typeof writer.write).toBe('function');
    writer.close();
  });

  it('chunks written to writer are readable from stream', async () => {
    const { stream, writer } = createWorkflowStream();

    // Writer and reader must run concurrently — TransformStream requires a
    // consumer attached before writes will complete (no unbounded buffering).
    const chunks: string[] = [];
    const [, , result] = await Promise.all([
      writer.write('hello'),
      writer.write(' world'),
      (async () => {
        const reader = stream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        return chunks;
      })(),
      writer.close(),
    ]);
    expect((result as string[]).join('')).toBe('hello world');
  });
});

describe('runWorkflow with writer', () => {
  it('writer is available on ctx in step', async () => {
    let receivedWriter: WritableStreamDefaultWriter<string> | undefined;
    const def = defineWorkflow('test', [{
      id: 'step1',
      type: 'agent',
      run: async (ctx) => {
        receivedWriter = ctx.writer;
        return 'done';
      },
    }]);

    const { writer } = createWorkflowStream();
    await runWorkflow(def, 'input', {}, { writer });
    expect(receivedWriter).toBe(writer);
    writer.close();
  });

  it('ctx.writer is undefined when not passed', async () => {
    let writerValue: unknown = 'sentinel';
    const def = defineWorkflow('test', [{
      id: 'step1',
      type: 'agent',
      run: async (ctx) => {
        writerValue = ctx.writer;
        return 'done';
      },
    }]);
    await runWorkflow(def, 'input');
    expect(writerValue).toBeUndefined();
  });

  it('step writes chunks that are readable from stream', async () => {
    const def = defineWorkflow('test', [{
      id: 'streamer',
      type: 'agent',
      run: async (ctx) => {
        if (ctx.writer) {
          await ctx.writer.write('chunk1');
          await ctx.writer.write('chunk2');
        }
        return 'done';
      },
    }]);

    const { stream, writer } = createWorkflowStream();
    const resultPromise = runWorkflow(def, 'input', {}, { writer });

    const chunks: string[] = [];
    const reader = stream.getReader();

    const [result] = await Promise.all([
      resultPromise.then(r => { writer.close(); return r; }),
      (async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      })(),
    ]);

    expect(result.status).toBe('completed');
    expect(chunks.join('')).toContain('chunk1');
    expect(chunks.join('')).toContain('chunk2');
  });

  it('workflow returns completed even when step uses writer', async () => {
    const def = defineWorkflow('test', [{
      id: 's1',
      type: 'agent',
      run: async (ctx) => {
        if (ctx.writer) await ctx.writer.write('data');
        return 'result';
      },
    }]);
    const { stream, writer } = createWorkflowStream();

    // Drain concurrently — workflow writes must be consumed as they happen.
    const [result] = await Promise.all([
      runWorkflow(def, 'input', {}, { writer }).then(r => { writer.close(); return r; }),
      (async () => {
        const reader = stream.getReader();
        while (!(await reader.read()).done) { /* drain */ }
      })(),
    ]);
    expect(result.status).toBe('completed');
  });
});
