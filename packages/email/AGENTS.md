# @fabrk/email — Agent Reference

Email for FABRK apps. Provides a Resend adapter for production and a console
adapter for development, plus four built-in HTML templates and utilities for
safe HTML rendering.

---

## Install

```bash
pnpm add @fabrk/email
# Required for Resend adapter only:
pnpm add resend
```

---

## Adapters

Both adapters implement the `EmailAdapter` interface from `@fabrk/core` and
register with the plugin registry.

### Resend (production)

```ts
import { createResendAdapter } from '@fabrk/email'

const email = createResendAdapter({
  apiKey: process.env.RESEND_API_KEY!,
  from: 'ACME <noreply@acme.com>',
  replyTo: 'support@acme.com',   // optional
})

registry.register('email', email)
```

**`ResendAdapterConfig`**

| Field | Type | Required |
|-------|------|----------|
| `apiKey` | `string` | Yes |
| `from` | `string` | Yes |
| `replyTo` | `string` | No |

### Console (development)

Logs emails to stdout. Zero config, always available.

```ts
import { createConsoleAdapter } from '@fabrk/email'

const email = createConsoleAdapter({
  from: 'dev@localhost',   // optional, displayed in logs
  logHtml: false,          // set true to print full HTML
})

registry.register('email', email)
```

---

## Sending Email

Both adapters expose the same `send()` and `sendTemplate()` methods.

### `send()` — raw HTML

```ts
const result = await email.send({
  to: 'user@example.com',        // string or string[]
  subject: 'Your receipt',
  html: '<h1>Thanks for your order</h1>',
  text: 'Thanks for your order', // optional plain-text fallback
  replyTo: 'billing@acme.com',   // optional
  cc: 'manager@acme.com',        // optional
  bcc: 'archive@acme.com',       // optional
  headers: { 'X-Order-ID': '42' }, // optional
  tags: [{ name: 'category', value: 'receipt' }], // optional Resend tags
})

// result: { id: string, success: boolean, error?: string }
if (!result.success) console.error(result.error)
```

### `sendTemplate()` — built-in or custom template

```ts
const result = await email.sendTemplate('user@example.com', {
  template: 'welcome',
  data: {
    name: 'Jason',
    appName: 'ACME',
    dashboardUrl: 'https://acme.com/dashboard',
  },
})
```

---

## Built-in Templates

| Template key | Data fields |
|-------------|------------|
| `welcome` | `name`, `appName`, `dashboardUrl` |
| `verification` | `name`, `verificationUrl`, `appName` |
| `reset` | `name`, `resetUrl`, `appName` |
| `invite` | `inviterName`, `orgName`, `inviteUrl`, `appName` |

All templates produce terminal-aesthetic HTML (monospace font, uppercase
headings, `[BRACKET]` labels) matching the FABRK design system.

---

## Custom Templates

Register your own template with `registerTemplate`, then send it with
`sendTemplate`.

```ts
import { registerTemplate, renderTemplate } from '@fabrk/email'
import { escapeHtml, sanitizeUrl } from '@fabrk/email'

registerTemplate('invoice', (data) => ({
  subject: `Invoice #${escapeHtml(String(data.invoiceId))}`,
  html: `
    <div style="font-family: monospace;">
      <h1>[INVOICE]</h1>
      <p>Amount due: ${escapeHtml(String(data.amount))}</p>
      <a href="${sanitizeUrl(String(data.payUrl))}">&gt; PAY NOW</a>
    </div>
  `,
}))

await email.sendTemplate('user@example.com', {
  template: 'invoice',
  data: { invoiceId: '1001', amount: '$49.00', payUrl: 'https://pay.acme.com/1001' },
})

// Or render without sending (e.g. to preview in browser):
const { subject, html } = renderTemplate({ template: 'invoice', data: { ... } })
```

`RenderedEmail`: `{ subject: string, html: string }`

---

## Security Utilities

These are exported and should be used whenever interpolating user-provided
data into email content.

```ts
import { escapeHtml, sanitizeUrl, sanitizeSubject } from '@fabrk/email'

// Escape user data before embedding in HTML
escapeHtml('<script>xss</script>')    // '&lt;script&gt;xss&lt;/script&gt;'
// Escapes: & < > " '

// Sanitize hrefs — blocks javascript:, data:, and other schemes
sanitizeUrl('javascript:alert(1)')    // '#'
sanitizeUrl('https://example.com')    // 'https://example.com' (unchanged)
sanitizeUrl('/relative/path')         // '#' (relative URLs not allowed)

// Prevent header injection in subject lines
sanitizeSubject("Order\r\nBcc: attacker@evil.com")  // 'Order  Bcc: attacker@evil.com'
```

Always call `escapeHtml()` on names, user-input strings, and any dynamic value
rendered inside HTML. Always call `sanitizeUrl()` on link `href` values.
The built-in templates already do this for you.

---

## Types (from `@fabrk/core`)

| Type | Fields |
|------|--------|
| `EmailOptions` | `to`, `subject`, `html?`, `text?`, `replyTo?`, `cc?`, `bcc?`, `headers?`, `tags?` |
| `EmailResult` | `id: string`, `success: boolean`, `error?: string` |
| `EmailAdapter` | `name`, `send()`, `sendTemplate()`, `isConfigured()`, `initialize?()` |
| `EmailTemplateData` | `template: string`, `data: Record<string, unknown>` |

---

## Example: Send Welcome Email After Sign-Up

```ts
// app/api/auth/register/route.ts
import { createResendAdapter, welcomeTemplate } from '@fabrk/email'

const email = createResendAdapter({
  apiKey: process.env.RESEND_API_KEY!,
  from: 'ACME <welcome@acme.com>',
})

export async function POST(request: Request) {
  const { name, email: userEmail } = await request.json()

  // ... create user in database ...

  const result = await email.sendTemplate(userEmail, {
    template: 'welcome',
    data: {
      name,
      appName: 'ACME',
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    },
  })

  if (!result.success) {
    console.error('[email] Failed to send welcome email:', result.error)
    // Non-fatal — user was created, email failure should not block sign-up
  }

  return Response.json({ ok: true })
}
```

Switch to the console adapter in development:

```ts
const email =
  process.env.NODE_ENV === 'production'
    ? createResendAdapter({ apiKey: process.env.RESEND_API_KEY!, from: 'noreply@acme.com' })
    : createConsoleAdapter({ logHtml: false })
```
