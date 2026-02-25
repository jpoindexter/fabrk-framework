import type { RenderedEmail } from './render'
import { escapeHtml, sanitizeUrl } from '../utils'

export function resetTemplate(data: Record<string, unknown>): RenderedEmail {
  const url = sanitizeUrl(data.resetUrl as string ?? '#')
  const name = escapeHtml(data.name as string ?? 'there')

  return {
    subject: 'Reset your password',
    html: `
      <div style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="text-transform: uppercase; font-size: 18px;">[PASSWORD RESET]</h1>
        <p>Hi ${name},</p>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p>
          <a href="${escapeHtml(url)}" style="color: #00ff00; text-decoration: underline;">${escapeHtml(url)}</a>
        </p>
        <p>This link expires in 1 hour.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `.trim(),
  }
}
