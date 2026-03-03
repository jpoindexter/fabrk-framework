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
  pendingApproval?: {
    approvalId: string;
    toolName: string;
    input: Record<string, unknown>;
    expiresAt?: number;
  };
}

export interface CheckpointStore {
  save(id: string, state: CheckpointState): Promise<void>;
  load(id: string): Promise<CheckpointState | null>;
  delete(id: string): Promise<void>;
  /** Push to iteration-keyed history without overwriting current. */
  append(checkpoint: CheckpointState): Promise<void>;
  /** All historical checkpoints for a session, sorted by iteration ascending. */
  listHistory(agentName: string, sessionId: string): Promise<CheckpointState[]>;
  /** Restore a historical checkpoint as current; throws if not found. */
  rollback(agentName: string, sessionId: string, targetIteration: number): Promise<CheckpointState>;
}

const MAX_CHECKPOINTS = 1000;
const MAX_HISTORY_PER_SESSION = 100;

export class InMemoryCheckpointStore implements CheckpointStore {
  private store = new Map<string, CheckpointState>();
  private history = new Map<string, CheckpointState[]>();

  async save(id: string, state: CheckpointState): Promise<void> {
    if (!this.store.has(id) && this.store.size >= MAX_CHECKPOINTS) {
      const oldest = this.store.keys().next();
      if (!oldest.done) this.store.delete(oldest.value);
    }
    const updated = { ...state, updatedAt: Date.now() };
    this.store.set(id, updated);
    // Also push to history, keyed by agentName:sessionId derived from checkpoint fields
    this._pushHistory(state.agentName, id, updated);
  }

  async load(id: string): Promise<CheckpointState | null> {
    return this.store.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async append(checkpoint: CheckpointState): Promise<void> {
    // Push to history only — does NOT update current store
    this._pushHistory(checkpoint.agentName, checkpoint.id, { ...checkpoint });
  }

  async listHistory(agentName: string, sessionId: string): Promise<CheckpointState[]> {
    const key = `${agentName}:${sessionId}`;
    const entries = this.history.get(key) ?? [];
    return [...entries].sort((a, b) => a.iteration - b.iteration);
  }

  async rollback(agentName: string, sessionId: string, targetIteration: number): Promise<CheckpointState> {
    const key = `${agentName}:${sessionId}`;
    const entries = this.history.get(key) ?? [];
    const target = entries.find((c) => c.iteration === targetIteration);
    if (!target) {
      throw new Error(
        `Checkpoint iteration ${targetIteration} not found for ${agentName}:${sessionId}`
      );
    }
    // Restore as current (use the checkpoint's id as store key)
    await this.save(target.id, target);
    return target;
  }

  get size(): number {
    return this.store.size;
  }

  private _pushHistory(agentName: string, sessionId: string, state: CheckpointState): void {
    const key = `${agentName}:${sessionId}`;
    if (!this.history.has(key)) {
      this.history.set(key, []);
    }
    const entries = this.history.get(key)!;
    entries.push(state);
    // Evict oldest when over the cap
    if (entries.length > MAX_HISTORY_PER_SESSION) {
      entries.shift();
    }
  }
}

export function generateCheckpointId(): string {
  return crypto.randomUUID();
}
