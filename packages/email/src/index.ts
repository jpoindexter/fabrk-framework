/**
 * @fabrk/email
 *
 * Email adapters for the FABRK framework.
 * Supports Resend and console (dev) adapters.
 */

export { createResendAdapter } from './resend/adapter'
export { createConsoleAdapter } from './console-adapter'

export { registerTemplate, renderTemplate } from './templates/render'
export type { RenderedEmail } from './templates/render'
export { verificationTemplate } from './templates/verification'
export { resetTemplate } from './templates/reset'
export { welcomeTemplate } from './templates/welcome'
export { inviteTemplate } from './templates/invite'

export { escapeHtml, sanitizeUrl, sanitizeSubject } from './utils'

export type { ResendAdapterConfig, ConsoleAdapterConfig } from './types'
