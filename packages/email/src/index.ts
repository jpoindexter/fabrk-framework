/**
 * @fabrk/email
 *
 * Email adapters for the FABRK framework.
 * Supports Resend and console (dev) adapters.
 */

// Adapters
export { createResendAdapter } from './resend/adapter'
export { createConsoleAdapter } from './console-adapter'

// Templates
export { registerTemplate, renderTemplate } from './templates/render'
export type { RenderedEmail } from './templates/render'
export { verificationTemplate } from './templates/verification'
export { resetTemplate } from './templates/reset'
export { welcomeTemplate } from './templates/welcome'
export { inviteTemplate } from './templates/invite'

// Utilities
export { escapeHtml, sanitizeUrl, sanitizeSubject } from './utils'

// Types
export type { ResendAdapterConfig, ConsoleAdapterConfig } from './types'
