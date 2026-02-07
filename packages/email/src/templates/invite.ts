import type { RenderedEmail } from './render'

export function inviteTemplate(data: Record<string, unknown>): RenderedEmail {
  const orgName = data.orgName as string ?? 'an organization'
  const inviterName = data.inviterName as string ?? 'Someone'
  const role = data.role as string ?? 'member'
  const inviteUrl = data.inviteUrl as string ?? '#'

  return {
    subject: `You've been invited to join ${orgName}`,
    html: `
      <div style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="text-transform: uppercase; font-size: 18px;">[TEAM INVITE]</h1>
        <p>${inviterName} has invited you to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
        <p>
          <a href="${inviteUrl}" style="color: #00ff00; text-decoration: underline;">&gt; ACCEPT INVITATION</a>
        </p>
        <p>This invitation expires in 7 days.</p>
        <p style="color: #666; font-size: 12px;">If you don't recognize this invitation, you can safely ignore this email.</p>
      </div>
    `.trim(),
  }
}
