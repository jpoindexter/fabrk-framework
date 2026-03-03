import type { LLMMessage } from "@fabrk/ai";

export type CheckpointStatus = "running" | "paused" | "completed" | "error";

export interface CheckpointState {
  id: string;
  agentName: string;
  messages: LLMMessage[];
  iteration: number;
  toolResults: Array<{ name: string; output: string }>;
  status: CheckpointStatus;
  createdAt: number;
  updatedAt: number;
}

export interface CheckpointStore {
  save(id: string, state: CheckpointState): Promise<void>;
  load(id: string): Promise<CheckpointState | null>;
  delete(id: string): Promise<void>;
}

const MAX_CHECKPOINTS = 1000;

export class InMemoryCheckpointStore implements CheckpointStore {
  private store = new Map<string, CheckpointState>();

  async save(id: string, state: CheckpointState): Promise<void> {
    if (!this.store.has(id) && this.store.size >= MAX_CHECKPOINTS) {
      const oldest = this.store.keys().next();
      if (!oldest.done) this.store.delete(oldest.value);
    }
    this.store.set(id, { ...state, updatedAt: Date.now() });
  }

  async load(id: string): Promise<CheckpointState | null> {
    return this.store.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  get size(): number {
    return this.store.size;
  }
}

export function generateCheckpointId(): string {
  return crypto.randomUUID();
}
