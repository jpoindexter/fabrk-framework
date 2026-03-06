export interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  headers?: Record<string, string>
  tags?: Array<{ name: string; value: string }>
}

export interface EmailResult {
  id: string
  success: boolean
  error?: string
}

export interface EmailTemplateData {
  template: string
  data: Record<string, unknown>
}
