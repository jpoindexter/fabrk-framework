/**
 * Console Email Adapter
 *
 * Development adapter that logs emails to the console
 * instead of sending them. Useful for local development.
 *
 * @example
 * ```ts
 * import { createConsoleAdapter } from '@fabrk/email'
 *
 * const email = createConsoleAdapter()
 * registry.register('email', email)
 * ```
 */

/* eslint-disable no-console */
import type { EmailAdapter } from '@fabrk/core'
import type { EmailOptions, EmailResult, EmailTemplateData } from '@fabrk/core'
import type { ConsoleAdapterConfig } from './types'
import { renderTemplate } from './templates/render'
import { sanitizeSubject } from './utils'

export function createConsoleAdapter(config: ConsoleAdapterConfig = {}): EmailAdapter {
  let emailCount = 0

  return {
    name: 'console',
    version: '1.0.0',

    isConfigured(): boolean {
      return true // Always available
    },

    async send(options: EmailOptions): Promise<EmailResult> {
      emailCount++
      const id = `console_${emailCount}`

      console.log('\n' + '='.repeat(60))
      console.log('[EMAIL] Console Adapter')
      console.log('='.repeat(60))
      console.log(`  ID:      ${id}`)
      console.log(`  From:    ${config.from ?? 'noreply@localhost'}`)
      console.log(`  To:      ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`)
      console.log(`  Subject: ${sanitizeSubject(options.subject)}`)

      if (options.cc) {
        console.log(`  CC:      ${Array.isArray(options.cc) ? options.cc.join(', ') : options.cc}`)
      }
      if (options.replyTo) {
        console.log(`  Reply:   ${options.replyTo}`)
      }

      if (options.text) {
        console.log('  ---')
        console.log(`  ${options.text}`)
      }

      if (config.logHtml && options.html) {
        console.log('  --- HTML ---')
        console.log(`  ${options.html}`)
      }

      console.log('='.repeat(60) + '\n')

      return {
        id,
        success: true,
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
