export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface JobOptions {
  type: string
  payload: Record<string, unknown>
  /** Higher = processed first */
  priority?: number
  maxRetries?: number
  delay?: number
  scheduledAt?: Date
}

export interface Job extends JobOptions {
  id: string
  status: JobStatus
  attempts: number
  createdAt: Date
  lastAttemptAt?: Date
  completedAt?: Date
  error?: string
  result?: unknown
}

export interface WebhookConfig {
  id: string
  url: string
  events: string[]
  secret: string
  active: boolean
  createdAt: Date
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  event: string
  statusCode?: number
  success: boolean
  attempts: number
  deliveredAt: Date
  response?: string
}

export interface JobStore {
  enqueue(job: Job): Promise<void>
  dequeue(types?: string[]): Promise<Job | null>
  update(id: string, updates: Partial<Job>): Promise<void>
  getById(id: string): Promise<Job | null>
  getByStatus(status: JobStatus, limit?: number): Promise<Job[]>
}

export interface WebhookStore {
  create(webhook: WebhookConfig): Promise<void>
  getById(id: string): Promise<WebhookConfig | null>
  listByEvent(event: string): Promise<WebhookConfig[]>
  /** List all registered webhooks regardless of event subscription. */
  listAll(): Promise<WebhookConfig[]>
  update(id: string, updates: Partial<WebhookConfig>): Promise<void>
  delete(id: string): Promise<void>
  recordDelivery(delivery: WebhookDelivery): Promise<void>
}
