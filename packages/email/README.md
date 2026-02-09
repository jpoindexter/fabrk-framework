# @fabrk/email

Email adapters and templates for the FABRK framework. Supports Resend for production and a console adapter for development.

## Installation

```bash
npm install @fabrk/email
```

## Usage

```tsx
import { createResendAdapter } from '@fabrk/email'

const email = createResendAdapter({
  apiKey: process.env.RESEND_API_KEY!,
  from: 'noreply@yourapp.com',
})

await email.send({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome to the app</h1>',
})
```

### Console Adapter (Development)

```tsx
import { createConsoleAdapter } from '@fabrk/email'

const email = createConsoleAdapter({ logHtml: true })

// Logs email details to console instead of sending
await email.send({
  to: 'user@example.com',
  subject: 'Test email',
  html: '<p>This prints to your terminal</p>',
})
```

### Templates

Four built-in templates are included. Send them with `sendTemplate`:

```tsx
await email.sendTemplate('user@example.com', {
  template: 'welcome',
  data: { name: 'Alice', appName: 'MyApp', dashboardUrl: '/dashboard' },
})

await email.sendTemplate('user@example.com', {
  template: 'verification',
  data: { name: 'Alice', verificationUrl: 'https://app.com/verify?token=abc' },
})
```

### Custom Templates

Register your own templates with `registerTemplate`:

```tsx
import { registerTemplate } from '@fabrk/email'

registerTemplate('billing', (data) => ({
  subject: `Invoice #${data.invoiceId}`,
  html: `<p>Your invoice for $${data.amount} is ready.</p>`,
}))

await email.sendTemplate('user@example.com', {
  template: 'billing',
  data: { invoiceId: '1234', amount: '29.99' },
})
```

## Features

- **Resend Adapter** - Production email delivery via the Resend API with support for CC, BCC, reply-to, headers, and tags
- **Console Adapter** - Logs emails to the terminal for local development; always available with no configuration
- **Template System** - `renderTemplate` renders named templates with data; `registerTemplate` adds custom templates at runtime
- **Built-in Templates** - Verification, password reset, welcome, and team invite templates with monospace terminal styling
- **Adapter Pattern** - Both adapters implement the `EmailAdapter` interface from `@fabrk/core` for consistent swapping between environments

## Documentation

[View full documentation](https://github.com/jpoindexter/fabrk-framework)

## License

MIT
