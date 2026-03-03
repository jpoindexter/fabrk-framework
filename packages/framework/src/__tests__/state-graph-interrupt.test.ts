import { describe, it, expect } from 'vitest';
import { createStateGraph, interrupt, GraphInterrupt } from '../agents/workflow/state-graph';

describe('interrupt() in graph nodes', () => {
  it('yields interrupt event with interruptType: node when node calls interrupt()', async () => {
    const g = createStateGraph({})
      .addNode('a', async () => { interrupt('approve?'); })
      .setInitial('a')
      .compile();

    const events = [];
    for await (const ev of g.run(null)) events.push(ev);

    const interruptEv = events.find(e => e.type === 'interrupt');
    expect(interruptEv).toBeDefined();
    expect(interruptEv?.interruptType).toBe('node');
    expect(interruptEv?.value).toBe('approve?');
  });

  it('graph stops after interrupt event (no done event)', async () => {
    const g = createStateGraph({})
      .addNode('a', async () => { interrupt('pause'); })
      .setInitial('a')
      .compile();

    const types: string[] = [];
    for await (const ev of g.run(null)) types.push(ev.type);

    expect(types).not.toContain('done');
    expect(types).toContain('interrupt');
  });

  it('interrupt event contains correct node name', async () => {
    const g = createStateGraph({})
      .addNode('myNode', async () => { interrupt({ msg: 'hello' }); })
      .setInitial('myNode')
      .compile();

    const events = [];
    for await (const ev of g.run(null)) events.push(ev);
    const interruptEv = events.find(e => e.type === 'interrupt');
    expect(interruptEv?.node).toBe('myNode');
  });

  it('interrupt() value is surfaced in event', async () => {
    const payload = { question: 'Confirm?', data: [1, 2, 3] };
    const g = createStateGraph({})
      .addNode('x', async () => { interrupt(payload); })
      .setInitial('x')
      .compile();

    const events = [];
    for await (const ev of g.run(null)) events.push(ev);
    const ev = events.find(e => e.type === 'interrupt');
    expect(ev?.value).toEqual(payload);
  });

  it('GraphInterrupt is exported and instanceof check works', () => {
    expect(() => { throw new GraphInterrupt('test'); }).toThrow(GraphInterrupt);
  });
});

describe('interruptBefore', () => {
  it('yields interrupt event with interruptType: before, nodeB does NOT execute', async () => {
    const visited: string[] = [];
    const g = createStateGraph({})
      .addNode('a', async (_, s) => { visited.push('a'); return { nextNode: 'b', state: s }; })
      .addNode('b', async (_, s) => { visited.push('b'); return { nextNode: 'END', state: s }; })
      .setInitial('a')
      .compile({ interruptBefore: ['b'] });

    const events = [];
    for await (const ev of g.run(null)) events.push(ev);

    expect(visited).toEqual(['a']); // b never ran
    const interruptEv = events.find(e => e.type === 'interrupt');
    expect(interruptEv?.interruptType).toBe('before');
    expect(interruptEv?.node).toBe('b');
  });

  it('nodeA fully executes before interruptBefore triggers on nodeB', async () => {
    let aRan = false;
    const g = createStateGraph({})
      .addNode('a', async (_, s) => { aRan = true; return { nextNode: 'b', state: s }; })
      .addNode('b', async (_, s) => ({ nextNode: 'END', state: s }))
      .setInitial('a')
      .compile({ interruptBefore: ['b'] });

    for await (const _ of g.run(null)) { /* drain */ }
    expect(aRan).toBe(true);
  });
});

describe('interruptAfter', () => {
  it('yields interrupt event with interruptType: after, after nodeA exits', async () => {
    let aRan = false;
    const g = createStateGraph({})
      .addNode('a', async (_, s) => { aRan = true; return { nextNode: 'END', state: s, output: 'a-output' }; })
      .setInitial('a')
      .compile({ interruptAfter: ['a'] });

    const events = [];
    for await (const ev of g.run(null)) events.push(ev);

    expect(aRan).toBe(true);
    const interruptEv = events.find(e => e.type === 'interrupt');
    expect(interruptEv?.interruptType).toBe('after');
    expect(interruptEv?.value).toBe('a-output');
  });
});

describe('resumeFrom', () => {
  it('jumps to named node when resumeFrom provided', async () => {
    const visited: string[] = [];
    const g = createStateGraph({})
      .addNode('a', async (_, s) => { visited.push('a'); return { nextNode: 'b', state: s }; })
      .addNode('b', async (_, s) => { visited.push('b'); return { nextNode: 'END', state: s }; })
      .setInitial('a')
      .compile();

    // Resume directly at 'b', skipping 'a'
    for await (const _ of g.run(null, { resumeFrom: { node: 'b', command: { goto: 'END' } } })) { /* drain */ }
    expect(visited).toEqual(['b']);
    expect(visited).not.toContain('a');
  });

  it('command.update patches state before resume node runs', async () => {
    let stateInB: Record<string, unknown> = {};
    const g = createStateGraph({ count: 0, name: '' })
      .addNode('a', async (_, s) => ({ nextNode: 'b', state: s }))
      .addNode('b', async (_, s) => { stateInB = s as Record<string, unknown>; return { nextNode: 'END', state: s }; })
      .setInitial('a')
      .compile();

    await (async () => {
      for await (const _ of g.run(null, {
        resumeFrom: { node: 'b', command: { goto: 'END', update: { name: 'Alice', count: 42 } } }
      })) { /* drain */ }
    })();

    expect(stateInB['name']).toBe('Alice');
    expect(stateInB['count']).toBe(42);
  });

  it('command.goto END terminates after resume node with done event', async () => {
    const g = createStateGraph({})
      .addNode('b', async (_, s) => ({ nextNode: 'END', state: s }))
      .setInitial('b')
      .compile();

    const types: string[] = [];
    for await (const ev of g.run(null, { resumeFrom: { node: 'b', command: { goto: 'END' } } })) {
      types.push(ev.type);
    }
    expect(types).toContain('done');
  });
});
