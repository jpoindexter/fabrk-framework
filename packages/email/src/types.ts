export interface ResendAdapterConfig {
  /** Resend API key */
  apiKey: string
  /** Default from address */
  from: string
  /** Reply-to address */
  replyTo?: string
}

export interface ConsoleAdapterConfig {
  /** Default from address (for display) */
  from?: string
  /** Whether to log full HTML */
  logHtml?: boolean
}
