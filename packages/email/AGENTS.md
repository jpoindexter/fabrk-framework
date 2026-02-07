# @fabrk/email — AGENTS.md

> Email adapters and templates for the FABRK framework

## Overview

| | |
|---|---|
| **Package** | `@fabrk/email` |
| **Language** | TypeScript |
| **Adapters** | Resend, Console (dev mode) |
| **Templates** | Verification, Reset, Welcome, Invite |
| **Pattern** | Provider-agnostic adapter (implements `EmailAdapter` from `@fabrk/core`) |

## Quick Start

```ts
import { createResendAdapter, verificationTemplate } from '@fabrk/email'

const email = createResendAdapter({
  apiKey: process.env.RESEND_API_KEY!,
  from: 'noreply@yourapp.com',
})

// Send raw email
await email.send({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Welcome!</p>',
})

// Send template email
await email.sendTemplate('user@example.com', {
  template: 'verification',
  data: { verificationUrl: 'https://...' },
})
```

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `createResendAdapter` | Function | Resend email adapter (production) |
| `createConsoleAdapter` | Function | Console logger adapter (development) |
| `registerTemplate` | Function | Register a custom email template |
| `renderTemplate` | Function | Render a template by name |
| `verificationTemplate` | Object | Email verification template |
| `resetTemplate` | Object | Password reset template |
| `welcomeTemplate` | Object | Welcome email template |
| `inviteTemplate` | Object | Organization invite template |

## Peer Dependencies

- `resend` — Required for Resend adapter (optional)

## Commands

```bash
pnpm build        # Build with tsup (ESM + CJS + DTS)
pnpm dev          # Watch mode
```
