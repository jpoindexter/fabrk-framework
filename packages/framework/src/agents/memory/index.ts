import type { MemoryStore } from "./types";
import { InMemoryMemoryStore } from "./in-memory-store";

let store: MemoryStore = new InMemoryMemoryStore();

export function setMemoryStore(s: MemoryStore): void {
  store = s;
}

export function getMemoryStore(): MemoryStore {
  return store;
}

export { InMemoryMemoryStore } from "./in-memory-store";
export { SemanticMemoryStore, type SemanticMemoryOptions } from "./semantic-store";
export type { MemoryStore, Thread, ThreadMessage } from "./types";
