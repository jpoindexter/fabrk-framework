import type { RenderedEmail } from './render'

export function verificationTemplate(data: Record<string, unknown>): RenderedEmail {
  const url = data.verificationUrl as string ?? '#'
  const name = data.name as string ?? 'there'

  return {
    subject: 'Verify your email address',
    html: `
      <div style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="text-transform: uppercase; font-size: 18px;">[EMAIL VERIFICATION]</h1>
        <p>Hi ${name},</p>
        <p>Click the link below to verify your email address:</p>
        <p>
          <a href="${url}" style="color: #00ff00; text-decoration: underline;">${url}</a>
        </p>
        <p>This link expires in 24 hours.</p>
        <p style="color: #666; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `.trim(),
  }
}
