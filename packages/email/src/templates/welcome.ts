import type { RenderedEmail } from './render'
import { escapeHtml, sanitizeUrl, sanitizeSubject } from '../utils'

export function welcomeTemplate(data: Record<string, unknown>): RenderedEmail {
  const name = escapeHtml(data.name as string ?? 'there')
  const dashboardUrl = sanitizeUrl(data.dashboardUrl as string ?? '#')

  return {
    subject: `Welcome to ${sanitizeSubject((data.appName as string) ?? 'the app')}`,
    html: `
      <div style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="text-transform: uppercase; font-size: 18px;">[WELCOME]</h1>
        <p>Hi ${name},</p>
        <p>Your account has been created successfully. You're ready to get started.</p>
        <p>
          <a href="${escapeHtml(dashboardUrl)}" style="color: #00ff00; text-decoration: underline;">&gt; GO TO DASHBOARD</a>
        </p>
        <p style="color: #666; font-size: 12px;">Powered by FABRK Framework</p>
      </div>
    `.trim(),
  }
}
