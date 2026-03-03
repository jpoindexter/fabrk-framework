import { describe, it, expect } from 'vitest';
import {
  createStateGraph,
  MessagesAnnotation,
  type StateReducers,
} from '../agents/workflow/state-graph';

describe('createStateGraph fluent builder', () => {
  it('builds and runs a single-node graph to END', async () => {
    const g = createStateGraph({ count: 0 })
      .addNode('a', async (_, s) => ({ nextNode: 'END', state: { count: s.count + 1 } }))
      .setInitial('a')
      .compile();

    const events = [];
    for await (const ev of g.run(null)) events.push(ev);

    expect(events.at(-1)?.type).toBe('done');
    expect(events.at(-1)?.state).toEqual({ count: 1 });
  });

  it('routes via addConditionalEdges with router function', async () => {
    const visited: string[] = [];
    const g = createStateGraph({ step: 0 })
      .addNode('a', async (_, s) => { visited.push('a'); return { nextNode: 'b', state: { step: 1 } }; })
      .addNode('b', async (_, s) => { visited.push('b'); return { nextNode: 'END', state: { step: 2 } }; })
      .setInitial('a')
      .addConditionalEdges('a', (_, s) => s.step === 1 ? 'b' : 'END')
      .compile();

    for await (const _ of g.run(null)) { /* drain */ }
    expect(visited).toEqual(['a', 'b']);
  });

  it('uses named routing map in addConditionalEdges', async () => {
    const visited: string[] = [];
    const g = createStateGraph({ val: 0 })
      .addNode('a', async (_, s) => { visited.push('a'); return { nextNode: 'next', state: { val: 1 } }; })
      .addNode('b', async (_, s) => { visited.push('b'); return { nextNode: 'END', state: s }; })
      .setInitial('a')
      .addConditionalEdges('a', () => 'next', { next: 'b', stop: 'END' })
      .compile();

    for await (const _ of g.run(null)) { /* drain */ }
    expect(visited).toEqual(['a', 'b']);
  });

  it('merges array state via reducer', async () => {
    const reducers: StateReducers<{ messages: string[] }> = {
      messages: (cur, upd) => [...cur, ...upd],
    };
    const g = createStateGraph({ messages: ['hello'] }, reducers)
      .addNode('a', async (_, s) => ({ nextNode: 'END', state: { messages: ['world'] } }))
      .setInitial('a')
      .compile();

    const events = [];
    for await (const ev of g.run(null)) events.push(ev);
    const done = events.find(e => e.type === 'done');
    expect(done?.state).toEqual({ messages: ['hello', 'world'] });
  });

  it('replaces non-reduced keys', async () => {
    const g = createStateGraph({ a: 1, b: 'x' }, { a: (c, u) => c + u })
      .addNode('n', async (_, s) => ({ nextNode: 'END', state: { a: 10, b: 'y' } }))
      .setInitial('n')
      .compile();

    const events = [];
    for await (const ev of g.run(null)) events.push(ev);
    const done = events.find(e => e.type === 'done');
    expect(done?.state.a).toBe(11);  // reduced: 1 + 10
    expect(done?.state.b).toBe('y'); // replaced
  });

  it('emits node-enter, node-exit, done events', async () => {
    const g = createStateGraph({})
      .addNode('x', async (_, s) => ({ nextNode: 'END', state: s }))
      .setInitial('x')
      .compile();

    const types: string[] = [];
    for await (const ev of g.run(null)) types.push(ev.type);
    expect(types).toContain('node-enter');
    expect(types).toContain('node-exit');
    expect(types).toContain('done');
  });

  it('passes interruptBefore to config', async () => {
    const compiled = createStateGraph({})
      .addNode('a', async (_, s) => ({ nextNode: 'b', state: s }))
      .addNode('b', async (_, s) => ({ nextNode: 'END', state: s }))
      .setInitial('a')
      .compile({ interruptBefore: ['b'] });

    const events = [];
    for await (const ev of compiled.run(null)) events.push(ev);
    // interruptBefore logic is implemented by Agent B — here we just verify compile doesn't throw
    expect(events.length).toBeGreaterThan(0);
  });

  it('throws if setInitial() not called before compile()', () => {
    const builder = createStateGraph({});
    expect(() => builder.compile()).toThrow('[fabrk] StateGraph: call setInitial() before compile()');
  });

  it('two parallel run() calls are independent', async () => {
    const g = createStateGraph({ count: 0 })
      .addNode('a', async (_, s) => ({ nextNode: 'END', state: { count: s.count + 1 } }))
      .setInitial('a')
      .compile();

    const [r1, r2] = await Promise.all([
      (async () => { const evs = []; for await (const e of g.run(null)) evs.push(e); return evs; })(),
      (async () => { const evs = []; for await (const e of g.run(null)) evs.push(e); return evs; })(),
    ]);
    expect(r1.at(-1)?.state).toEqual({ count: 1 });
    expect(r2.at(-1)?.state).toEqual({ count: 1 });
  });
});

describe('MessagesAnnotation', () => {
  it('defaultState returns { messages: [] }', () => {
    expect(MessagesAnnotation.defaultState()).toEqual({ messages: [] });
  });

  it('reducer appends arrays', () => {
    const reducer = MessagesAnnotation.reducers.messages;
    if (!reducer) throw new Error('reducer missing');
    const merged = reducer(['a', 'b'], ['c']);
    expect(merged).toEqual(['a', 'b', 'c']);
  });

  it('can be used with createStateGraph', async () => {
    const g = createStateGraph(MessagesAnnotation.defaultState(), MessagesAnnotation.reducers)
      .addNode('a', async (_, s) => ({ nextNode: 'END', state: { messages: ['hello'] } }))
      .setInitial('a')
      .compile();
    const events = [];
    for await (const ev of g.run(null)) events.push(ev);
    expect(events.at(-1)?.state.messages).toEqual(['hello']);
  });
});
