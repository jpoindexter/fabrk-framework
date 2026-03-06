import type { ToolDefinition } from "../tools/define-tool";
import { textResult } from "../tools/define-tool";

type LTStore = {
  set: (ns: string, k: string, v: string) => Promise<void>;
  search: (ns: string, q: string, n: number) => Promise<unknown[]>;
};

export type LongTermConfig = {
  store: LTStore;
  namespace?: string;
  autoInjectTool?: boolean;
};

export function buildLongTermMemoryTools(longTermConfig: LongTermConfig, agentName: string): ToolDefinition[] {
  if (longTermConfig.autoInjectTool === false) return [];

  const ltStore = longTermConfig.store;
  const ltNamespace = longTermConfig.namespace || agentName;

  return [
    {
      name: "memory_store",
      description: "Store a value in long-term memory across threads. Use this to persist important information for future conversations.",
      schema: {
        type: "object",
        properties: {
          key: { type: "string", description: "The key to store the value under" },
          value: { type: "string", description: "The value to store" },
        },
        required: ["key", "value"],
      },
      handler: async (input) => {
        const key = String(input.key ?? "");
        const value = String(input.value ?? "");
        await ltStore.set(ltNamespace, key, value);
        return textResult(`Stored "${key}" in long-term memory.`);
      },
    },
    {
      name: "memory_recall",
      description: "Search long-term memory for relevant information from past conversations.",
      schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query to find relevant memories" },
        },
        required: ["query"],
      },
      handler: async (input) => {
        const query = String(input.query ?? "");
        const results = await ltStore.search(ltNamespace, query, 5);
        if (results.length === 0) return textResult("No relevant memories found.");
        return textResult(JSON.stringify(results));
      },
    },
  ];
}
