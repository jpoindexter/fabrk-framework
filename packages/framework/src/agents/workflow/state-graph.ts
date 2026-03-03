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

export interface StateGraphConfig<S> {
  nodes: GraphNode<S>[];
  edges: GraphEdge[];
  initial: string;
  initialState: S;
  /** Maximum number of node executions before yielding an error event. Default: 50 */
  maxCycles?: number;
}

export type StateGraphEventType = 'node-enter' | 'node-exit' | 'edge' | 'done' | 'error';

export interface StateGraphEvent<S> {
  type: StateGraphEventType;
  node?: string;
  nextNode?: string;
  state: S;
  output?: unknown;
  error?: string;
  cycles: number;
}

export function defineStateGraph<S>(config: StateGraphConfig<S>): {
  run(input: unknown): AsyncGenerator<StateGraphEvent<S>>;
} {
  const maxCycles = config.maxCycles ?? 50;
  const nodeMap = new Map<string, GraphNode<S>>(
    config.nodes.map((n) => [n.name, n])
  );

  return {
    async *run(initialInput: unknown): AsyncGenerator<StateGraphEvent<S>> {
      let currentNode = config.initial;
      let state = config.initialState;
      let input = initialInput;
      let cycles = 0;

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

        yield { type: 'node-enter', node: currentNode, state, cycles };

        let result: NodeResult<S>;
        try {
          result = await node.run(input, state);
        } catch (err) {
          yield { type: 'error', error: String(err), state, cycles };
          return;
        }

        yield { type: 'node-exit', node: currentNode, output: result.output, state: result.state, cycles };

        state = result.state;

        // Resolve next node: check for a conditional edge override first,
        // then fall back to the value returned by the node itself.
        const edge = config.edges.find((e) => e.from === currentNode);
        const resolvedNext: string = edge
          ? typeof edge.to === 'function'
            ? edge.to(result.output, state)
            : edge.to
          : result.nextNode;

        if (resolvedNext === 'END') {
          yield { type: 'done', output: result.output, state, cycles };
          return;
        }

        yield { type: 'edge', node: currentNode, nextNode: resolvedNext, state, cycles };

        input = result.output;
        currentNode = resolvedNext;
        cycles++;
      }
    },
  };
}
