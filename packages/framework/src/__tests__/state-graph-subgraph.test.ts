import { describe, it, expect } from 'vitest';
import { createStateGraph, subgraphNode } from '../agents/workflow/state-graph';

describe('subgraphNode — nested StateGraph as node', () => {
  it('runs child graph to completion and returns done output', async () => {
    const child = createStateGraph({ count: 0 })
      .addNode('inc', async (_, s) => ({ nextNode: 'END', state: { count: s.count + 1 }, output: s.count + 1 }))
      .setInitial('inc')
      .compile();

    const parentNode = subgraphNode('sub', child, (_state: { result: number }) => 0);
    const result = await parentNode.run(null, { result: 0 });

    expect(result.output).toBe(1);
  });

  it('passes parent state to getInput to derive child input', async () => {
    let capturedInput: unknown;
    const child = createStateGraph({ val: '' })
      .addNode('capture', async (input, s) => {
        capturedInput = input;
        return { nextNode: 'END', state: s, output: input };
      })
      .setInitial('capture')
      .compile();

    const parentNode = subgraphNode('sub', child, (state: { data: string }) => state.data);
    await parentNode.run(null, { data: 'hello-from-parent' });

    expect(capturedInput).toBe('hello-from-parent');
  });

  it('mapOutput patches parent state with child output', async () => {
    const child = createStateGraph({ x: 0 })
      .addNode('run', async () => ({ nextNode: 'END', state: { x: 42 }, output: 42 }))
      .setInitial('run')
      .compile();

    const parentNode = subgraphNode(
      'sub',
      child,
      (_: { result: number }) => null,
      (output: unknown, state: { result: number }) => ({ result: output as number })
    );
    const result = await parentNode.run(null, { result: 0 });

    expect(result.state).toEqual({ result: 42 });
  });

  it('without mapOutput, parent state is unchanged by subgraph', async () => {
    const child = createStateGraph({ x: 0 })
      .addNode('run', async () => ({ nextNode: 'END', state: { x: 99 }, output: 'done' }))
      .setInitial('run')
      .compile();

    const parentNode = subgraphNode('sub', child, (_: { name: string }) => null);
    const result = await parentNode.run(null, { name: 'parent' });

    expect(result.state).toEqual({ name: 'parent' });
  });

  it('child graph error propagates as parent node error', async () => {
    const child = createStateGraph({})
      .addNode('fail', async () => { throw new Error('child-error'); })
      .setInitial('fail')
      .compile();

    const parentNode = subgraphNode('sub', child, () => null);
    await expect(parentNode.run(null, {})).rejects.toThrow('child-error');
  });

  it('parent graph proceeds to next node after subgraph completes', async () => {
    const visited: string[] = [];

    const child = createStateGraph({ n: 0 })
      .addNode('c', async (_, s) => { visited.push('child'); return { nextNode: 'END', state: s, output: 'child-done' }; })
      .setInitial('c')
      .compile();

    const events: string[] = [];
    const parent = createStateGraph({ val: '' })
      .addSubgraph('sub', child, () => null, (out: unknown) => ({ val: out as string }))
      .addNode('after', async (_, s) => { visited.push('after'); return { nextNode: 'END', state: s, output: s.val }; })
      .setInitial('sub')
      .addEdge('sub', 'after')
      .compile();

    for await (const event of parent.run(null)) {
      events.push(event.type);
    }

    expect(visited).toEqual(['child', 'after']);
    expect(events).toContain('done');
  });

  it('addSubgraph() fluent method adds subgraph node to builder', async () => {
    const child = createStateGraph({ n: 0 })
      .addNode('c', async () => ({ nextNode: 'END', state: { n: 7 }, output: 7 }))
      .setInitial('c')
      .compile();

    const events: Array<{ type: string; output?: unknown }> = [];
    const parent = createStateGraph({ result: 0 })
      .addSubgraph('sub', child, () => null, (out: unknown) => ({ result: out as number }))
      .setInitial('sub')
      .compile();

    for await (const event of parent.run(null)) {
      events.push({ type: event.type, output: event.output });
    }

    const done = events.find((e) => e.type === 'done');
    expect(done?.output).toBe(7);
  });

  it('nested subgraph (grandchild) executes correctly', async () => {
    const grandchild = createStateGraph({ v: 0 })
      .addNode('g', async () => ({ nextNode: 'END', state: { v: 100 }, output: 100 }))
      .setInitial('g')
      .compile();

    const child = createStateGraph({ w: 0 })
      .addSubgraph('gc', grandchild, () => null, (out: unknown) => ({ w: out as number }))
      .setInitial('gc')
      .compile();

    const parent = createStateGraph({ result: 0 })
      .addSubgraph('c', child, () => null, (out: unknown) => ({ result: out as number }))
      .setInitial('c')
      .compile();

    const events: Array<{ type: string; output?: unknown }> = [];
    for await (const event of parent.run(null)) {
      events.push(event);
    }

    const done = events.find((e) => e.type === 'done');
    expect(done?.output).toBe(100);
  });

  it('subgraph node name appears in parent node-enter/node-exit events', async () => {
    const child = createStateGraph({})
      .addNode('c', async () => ({ nextNode: 'END', state: {}, output: 'x' }))
      .setInitial('c')
      .compile();

    const parent = createStateGraph({})
      .addSubgraph('my-sub', child, () => null)
      .setInitial('my-sub')
      .compile();

    const nodeNames: string[] = [];
    for await (const event of parent.run(null)) {
      if (event.type === 'node-enter' || event.type === 'node-exit') {
        nodeNames.push(event.node ?? '');
      }
    }

    expect(nodeNames).toContain('my-sub');
  });

  it('child graph done event fires even for single-node child', async () => {
    const child = createStateGraph({ ok: false })
      .addNode('only', async () => ({ nextNode: 'END', state: { ok: true }, output: 'single' }))
      .setInitial('only')
      .compile();

    const parentNode = subgraphNode('sub', child, () => null);
    const result = await parentNode.run(null, {});

    expect(result.output).toBe('single');
  });
});
