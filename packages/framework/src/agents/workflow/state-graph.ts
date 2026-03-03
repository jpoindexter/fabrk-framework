export interface NodeResult<S> {
  nextNode: string | 'END';
  state: S;
  output?: unknown;
}

export interface GraphNode<S> {
  name: string;
  run: (input: unknown, state: S) => Promise<NodeResult<S>>;
}

export interface GraphEdge {
  from: string;
  to: string | ((output: unknown, state: unknown) => string);
}

export type StateReducers<S> = {
  [K in keyof S]?: (current: S[K], update: S[K]) => S[K];
};

export interface StateGraphConfig<S> {
  nodes: GraphNode<S>[];
  edges: GraphEdge[];
  initial: string;
  initialState: S;
  /** Maximum number of node executions before yielding an error event. Default: 50 */
  maxCycles?: number;
  reducers?: StateReducers<S>;
  interruptBefore?: string[];
  interruptAfter?: string[];
}

export type StateGraphEventType = 'node-enter' | 'node-exit' | 'edge' | 'done' | 'error' | 'interrupt';

export interface StateGraphEvent<S> {
  type: StateGraphEventType;
  node?: string;
  nextNode?: string;
  state: S;
  output?: unknown;
  error?: string;
  cycles: number;
  interruptType?: 'before' | 'after' | 'node';
  value?: unknown;
}

export interface Command<S = unknown> {
  goto: string;
  update?: Partial<S>;
}

export interface CompileOptions {
  interruptBefore?: string[];
  interruptAfter?: string[];
}

export interface CompiledStateGraph<S> {
  run(input: unknown, opts?: { resumeFrom?: { node: string; command: Command<S> } }): AsyncGenerator<StateGraphEvent<S>>;
}

/**
 * Thrown inside a graph node to pause execution at that point.
 * Caught by the graph runner which yields an 'interrupt' event and stops.
 * Resume by calling graph.run(input, { resumeFrom: { node, command } }).
 */
export class GraphInterrupt {
  constructor(public readonly value: unknown) {}
}

/**
 * Call inside any graph node to pause graph execution and surface a value to the caller.
 * The graph will yield an `{ type: 'interrupt', interruptType: 'node', value }` event and stop.
 *
 * To resume: call `graph.run(input, { resumeFrom: { node: 'nodeName', command: { goto: 'nextNode' } } })`
 *
 * @example
 *   async function reviewNode(input, state) {
 *     interrupt({ question: 'Approve this action?', toolCall: state.pendingTool });
 *     // execution never reaches here in the interrupted run
 *   }
 */
export function interrupt(value: unknown): never {
  throw new GraphInterrupt(value);
}

export function defineStateGraph<S>(config: StateGraphConfig<S>): {
  run(input: unknown, opts?: { resumeFrom?: { node: string; command: Command<S> } }): AsyncGenerator<StateGraphEvent<S>>;
} {
  const maxCycles = config.maxCycles ?? 50;
  const nodeMap = new Map<string, GraphNode<S>>(
    config.nodes.map((n) => [n.name, n])
  );
  const interruptBefore = new Set(config.interruptBefore ?? []);
  const interruptAfter = new Set(config.interruptAfter ?? []);

  return {
    async *run(initialInput: unknown, opts?: { resumeFrom?: { node: string; command: Command<S> } }): AsyncGenerator<StateGraphEvent<S>> {
      let currentNode = config.initial;
      let state = config.initialState;
      let input = initialInput;
      let cycles = 0;

      // If resuming from an interrupt, jump to the target node with patched state
      if (opts?.resumeFrom) {
        currentNode = opts.resumeFrom.node;
        if (opts.resumeFrom.command.update) {
          state = { ...config.initialState, ...opts.resumeFrom.command.update };
        }
      }

      while (true) {
        if (cycles >= maxCycles) {
          yield { type: 'error', error: `Max cycles (${maxCycles}) exceeded`, state, cycles };
          return;
        }

        const node = nodeMap.get(currentNode);
        if (!node) {
          yield { type: 'error', error: `Node "${currentNode}" not found`, state, cycles };
          return;
        }

        if (interruptBefore.has(currentNode)) {
          yield { type: 'interrupt', node: currentNode, state, cycles, interruptType: 'before', value: undefined };
          return;
        }

        yield { type: 'node-enter', node: currentNode, state, cycles };

        let result: NodeResult<S>;
        try {
          result = await node.run(input, state);
        } catch (err) {
          if (err instanceof GraphInterrupt) {
            yield { type: 'interrupt', node: currentNode, interruptType: 'node', value: err.value, state, cycles };
            return;
          }
          yield { type: 'error', error: err instanceof Error ? err.message : String(err), state, cycles };
          return;
        }

        yield { type: 'node-exit', node: currentNode, output: result.output, state: result.state, cycles };

        if (interruptAfter.has(currentNode)) {
          yield { type: 'interrupt', node: currentNode, state: result.state, cycles, interruptType: 'after', value: result.output };
          return;
        }

        if (config.reducers) {
          const next = { ...state };
          for (const key of Object.keys(result.state as object) as Array<keyof S>) {
            const reducer = config.reducers[key];
            next[key] = reducer
              ? reducer(state[key], (result.state as S)[key])
              : (result.state as S)[key];
          }
          state = next as S;
        } else {
          state = result.state;
        }

        // Resolve next node: check for a conditional edge override first,
        // then fall back to the value returned by the node itself.
        const edge = config.edges.find((e) => e.from === currentNode);
        const resolvedNext: string = edge
          ? typeof edge.to === 'function'
            ? edge.to(result.output, state)
            : edge.to
          : result.nextNode;

        // If resuming from an interrupt and this is the resume node (cycles === 0),
        // use command.goto to override the next node.
        const isResumeNode = opts?.resumeFrom && currentNode === opts.resumeFrom.node && cycles === 0;
        const finalNext = isResumeNode && opts?.resumeFrom?.command.goto
          ? opts.resumeFrom.command.goto
          : resolvedNext;

        if (finalNext === 'END') {
          yield { type: 'done', output: result.output, state, cycles };
          return;
        }

        yield { type: 'edge', node: currentNode, nextNode: finalNext, state, cycles };

        input = result.output;
        currentNode = finalNext;
        cycles++;
      }
    },
  };
}

export class StateGraphBuilder<S> {
  private _nodes: GraphNode<S>[] = [];
  private _edges: GraphEdge[] = [];
  private _initial?: string;
  private _initialState: S;
  private _reducers?: StateReducers<S>;
  private _maxCycles?: number;

  constructor(initialState: S, reducers?: StateReducers<S>) {
    this._initialState = initialState;
    this._reducers = reducers;
  }

  addNode(name: string, fn: (input: unknown, state: S) => Promise<NodeResult<S>>): this {
    this._nodes.push({ name, run: fn });
    return this;
  }

  addEdge(from: string, to: string): this {
    this._edges.push({ from, to });
    return this;
  }

  addConditionalEdges(
    from: string,
    router: (output: unknown, state: S) => string,
    map?: Record<string, string>
  ): this {
    this._edges.push({
      from,
      to: map
        ? (output: unknown, state: unknown) => {
            const key = router(output, state as S);
            return map[key] ?? key;
          }
        : (output: unknown, state: unknown) => router(output, state as S),
    });
    return this;
  }

  addSubgraph<ChildState>(
    name: string,
    graph: CompiledStateGraph<ChildState>,
    getInput: (state: S) => unknown,
    mapOutput?: (output: unknown, state: S) => Partial<S>
  ): this {
    this._nodes.push(subgraphNode<S, ChildState>(name, graph, getInput, mapOutput));
    return this;
  }

  setInitial(name: string): this { this._initial = name; return this; }
  setMaxCycles(n: number): this { this._maxCycles = n; return this; }

  compile(opts?: CompileOptions): CompiledStateGraph<S> {
    if (!this._initial) throw new Error('[fabrk] StateGraph: call setInitial() before compile()');
    return defineStateGraph<S>({
      nodes: this._nodes,
      edges: this._edges,
      initial: this._initial,
      initialState: this._initialState,
      maxCycles: this._maxCycles,
      reducers: this._reducers,
      interruptBefore: opts?.interruptBefore,
      interruptAfter: opts?.interruptAfter,
    });
  }
}

export function createStateGraph<S>(initialState: S, reducers?: StateReducers<S>): StateGraphBuilder<S> {
  return new StateGraphBuilder<S>(initialState, reducers);
}

export const MessagesAnnotation = {
  defaultState: (): { messages: string[] } => ({ messages: [] }),
  reducers: {
    messages: (current: string[], update: string[]) => [...current, ...update],
  } as StateReducers<{ messages: string[] }>,
} as const;

/**
 * Wraps a compiled StateGraph as a node in a parent graph.
 * The subgraph receives a derived input (via getInput), runs to completion,
 * and returns the `done` event's output as this node's output.
 * State from the subgraph is NOT merged into the parent's state unless mapOutput is provided.
 *
 * @example
 *   const child = createStateGraph({ count: 0 })
 *     .addNode("inc", async (_, s) => ({ nextNode: "END", state: { count: s.count + 1 }, output: s.count + 1 }))
 *     .setInitial("inc").compile();
 *
 *   const parent = createStateGraph({ result: 0 })
 *     .addSubgraph("process", child, (s) => s.result, (out, s) => ({ result: out as number }))
 *     .setInitial("process").compile();
 */
export function subgraphNode<ParentState, ChildState>(
  name: string,
  graph: CompiledStateGraph<ChildState>,
  getInput: (state: ParentState) => unknown,
  mapOutput?: (output: unknown, parentState: ParentState) => Partial<ParentState>
): GraphNode<ParentState> {
  return {
    name,
    async run(_input: unknown, state: ParentState): Promise<NodeResult<ParentState>> {
      const subInput = getInput(state);
      let finalOutput: unknown = undefined;

      for await (const event of graph.run(subInput)) {
        if (event.type === 'done') {
          finalOutput = event.output;
        } else if (event.type === 'error') {
          throw new Error(`[fabrk] Subgraph "${name}" error: ${event.error}`);
        } else if (event.type === 'interrupt') {
          throw new Error(`[fabrk] Subgraph "${name}" interrupted: ${JSON.stringify(event.value)}`);
        }
      }

      const outputPatch = mapOutput ? mapOutput(finalOutput, state) : {};
      return {
        nextNode: 'END',
        state: { ...state, ...outputPatch },
        output: finalOutput,
      };
    },
  };
}
