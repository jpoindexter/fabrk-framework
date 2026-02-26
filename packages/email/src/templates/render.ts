/**
 * Email Template Renderer
 *
 * Simple template rendering system. Templates are plain functions
 * that return { subject, html } given a data object.
 */

import type { EmailTemplateData } from '@fabrk/core'
import { verificationTemplate } from './verification'
import { resetTemplate } from './reset'
import { welcomeTemplate } from './welcome'
import { inviteTemplate } from './invite'

export interface RenderedEmail {
  subject: string
  html: string
}

type TemplateRenderer = (data: Record<string, unknown>) => RenderedEmail

const templates: Record<string, TemplateRenderer> = {
  verification: verificationTemplate,
  reset: resetTemplate,
  welcome: welcomeTemplate,
  invite: inviteTemplate,
}

export function registerTemplate(name: string, renderer: TemplateRenderer): void {
  templates[name] = renderer
}

export function renderTemplate(template: EmailTemplateData): RenderedEmail {
  const renderer = templates[template.template]
  if (!renderer) {
    throw new Error(`Unknown email template: ${template.template}`)
  }
  return renderer(template.data)
}
