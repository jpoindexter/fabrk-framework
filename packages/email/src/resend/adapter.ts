/**
 * Resend Email Adapter
 *
 * Implements EmailAdapter using the Resend API.
 * Resend is provided as an optional peer dependency.
 *
 * @example
 * ```ts
 * import { createResendAdapter } from '@fabrk/email'
 *
 * const email = createResendAdapter({
 *   apiKey: process.env.RESEND_API_KEY!,
 *   from: 'noreply@yourapp.com',
 * })
 *
 * registry.register('email', email)
 *
 * await email.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Welcome to the app</h1>',
 * })
 * ```
 */

import type { EmailAdapter } from '@fabrk/core'
import type { EmailOptions, EmailResult, EmailTemplateData } from '@fabrk/core'
import type { ResendAdapterConfig } from '../types'
import { renderTemplate } from '../templates/render'
import { sanitizeSubject } from '../utils'

export function createResendAdapter(config: ResendAdapterConfig): EmailAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let resend: any = null

  async function getResend() {
    if (!resend) {
      try {
        const mod = await import('resend')
        const Resend = ((mod as Record<string, unknown>).Resend || (mod as Record<string, unknown>).default) as new (apiKey: string) => Record<string, unknown>
        resend = new Resend(config.apiKey)
      } catch {
        throw new Error(
          '@fabrk/email: resend package is required for ResendAdapter. Install it with: pnpm add resend'
        )
      }
    }
    return resend
  }

  return {
    name: 'resend',
    version: '1.0.0',

    async initialize() {
      await getResend()
    },

    isConfigured(): boolean {
      return Boolean(config.apiKey && config.from)
    },

    async send(options: EmailOptions): Promise<EmailResult> {
      const r = await getResend()

      try {
        const result = await r.emails.send({
          from: config.from,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: sanitizeSubject(options.subject),
          html: options.html,
          text: options.text,
          reply_to: options.replyTo ?? config.replyTo,
          cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
          bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
          headers: options.headers,
          tags: options.tags,
        })

        return {
          id: result.data?.id ?? '',
          success: !result.error,
          error: result.error?.message,
        }
      } catch (err) {
        return {
          id: '',
          success: false,
          error: err instanceof Error ? err.message : 'Failed to send email',
        }
      }
    },

    async sendTemplate(
      to: string | string[],
      template: EmailTemplateData
    ): Promise<EmailResult> {
      const { subject, html } = renderTemplate(template)

      return this.send({
        to,
        subject,
        html,
      })
    },
  }
}
