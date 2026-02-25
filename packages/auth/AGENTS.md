# @fabrk/auth — Agent Reference

Authentication for FABRK apps. Provides a NextAuth v5 adapter, API key
management, and TOTP-based MFA with backup codes. All crypto uses the Web
Crypto API — no Node.js-specific dependencies.

---

## Install

```bash
pnpm add @fabrk/auth
# Only needed if using NextAuth sessions:
pnpm add next-auth
```

---

## NextAuth Adapter

Wraps NextAuth (Auth.js v5) as a FABRK `AuthAdapter`.

```ts
import { createNextAuthAdapter } from '@fabrk/auth'
import { auth } from './lib/auth'   // your NextAuth auth() function

const authAdapter = createNextAuthAdapter({
  authInstance: auth,               // required for session support
  providers: ['google', 'github', 'credentials', 'magic-link'],
  sessionStrategy: 'jwt',           // 'jwt' | 'database'
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
})

registry.register('auth', authAdapter)
```

`createNextAuthAdapter` bundles API key management and MFA in the same adapter
instance. Pass a custom `apiKeyStore` to use a persistent store in production
(defaults to `InMemoryApiKeyStore`).

**`NextAuthAdapterConfig`**

| Field | Type | Default |
|-------|------|---------|
| `authInstance` | `() => Promise<any>` | — |
| `apiKeyStore` | `ApiKeyStore` | `InMemoryApiKeyStore` |
| `providers` | `Array<'google'\|'github'\|'credentials'\|'magic-link'>` | — |
| `sessionStrategy` | `'jwt' \| 'database'` | — |
| `secret` | `string` | — |
| `pages` | `{ signIn?, signOut?, error?, verifyRequest? }` | — |

---

## API Keys

Keys are formatted `<prefix>_<env>_<base62>`. The raw key is returned only once
at creation; only the SHA-256 hash is stored.

```ts
import { generateApiKey, hashApiKey, createApiKeyValidator } from '@fabrk/auth'
import { InMemoryApiKeyStore } from '@fabrk/auth'

// Generate
const { key, prefix, hash } = await generateApiKey({
  prefix: 'myapp',       // default: 'fabrk'
  environment: 'live',   // 'live' | 'test', default: 'live'
  keyLength: 32,         // bytes, minimum 16
})
// key:    "myapp_live_A1B2C3..."   ← show to user ONCE, never store
// prefix: "myapp_live_A1B2C3"      ← safe to display in UI
// hash:   "sha256:..."             ← store this

// Validate
const store = new InMemoryApiKeyStore()
const validator = createApiKeyValidator(store)
const keyInfo = await validator.validate(key)        // ApiKeyInfo | null

if (keyInfo && validator.hasScope(keyInfo, 'write')) { /* authorized */ }
validator.hasAllScopes(keyInfo, ['read', 'write'])   // boolean
```

**`ApiKeyGeneratorConfig`**

| Field | Type | Default |
|-------|------|---------|
| `prefix` | `string` | `'fabrk'` |
| `environment` | `'live' \| 'test'` | `'live'` |
| `keyLength` | `number` (bytes) | `32` |

---

## MFA / TOTP

RFC 6238 TOTP. Built-in brute-force lockout (5 failed attempts locks for 5 min).

```ts
import {
  generateTotpSecret, generateTotpUri, verifyTotp,
  generateBackupCodes, hashBackupCodes, verifyBackupCode,
} from '@fabrk/auth'

// --- Setup ---
const secret = generateTotpSecret()   // base32 string, default 20 bytes
const uri = generateTotpUri(secret, 'user@example.com', 'MyApp')
// Show uri as a QR code for the user's authenticator app

const codes = generateBackupCodes(10)             // ['ABCD-EFGH', ...]
const hashedCodes = await hashBackupCodes(codes)   // store in database
// Display plain codes to the user ONCE, then discard

// --- Verify TOTP ---
const valid = await verifyTotp(secret, '123456')  // boolean
// Checks ±1 time window (30 s) by default; max window is capped at ±5

// --- Verify backup code (one-time use) ---
const { valid: bValid, matchedIndex } = await verifyBackupCode('ABCD-EFGH', hashedCodes)
if (bValid) hashedCodes.splice(matchedIndex, 1)   // caller removes consumed code
```

Via the adapter (handles lockout internally):

```ts
const setup = await authAdapter.setupMfa(userId)
// { secret, qrCodeUrl, backupCodes }

const result = await authAdapter.verifyMfa(userId, '123456')
// { verified: boolean, usedBackupCode?: boolean }

// Re-enrollment requires explicit opt-in (verify user identity first)
await authAdapter.setupMfa(userId, /* force */ true)
```

---

## Route Protection Middleware

```ts
import { withAuth, withApiKey, withAuthOrApiKey } from '@fabrk/auth'

// Session only
export const GET = withAuth(authAdapter, async (req, session) => {
  return Response.json({ userId: session.userId })
})

// API key with scope enforcement
export const POST = withApiKey(authAdapter, async (req, keyInfo) => {
  return Response.json({ keyName: keyInfo.name })
}, { requiredScopes: ['write'] })

// Accept either (useful for M2M + user routes)
export const DELETE = withAuthOrApiKey(authAdapter, async (req, { session, apiKey }) => {
  const actor = session?.userId ?? apiKey?.id
  return Response.json({ actor })
}, { requiredScopes: ['admin'] })
```

API key is read from `Authorization: Bearer <key>` or `X-API-Key: <key>`.
Scopes apply only to API key auth. For session-based role checks, inspect
`session.role` inside your handler.

---

## Stores

| Store | Use case |
|-------|----------|
| `InMemoryAuthStore` | Dev/testing — sessions held in a `Map` |
| `InMemoryApiKeyStore` | Dev/testing — timing-safe lookup, tracks `lastUsedAt` |
| Custom `ApiKeyStore` | Production — implement `getByHash`, `create`, `revoke`, `listByUser`, `updateLastUsed` |

---

## Key Types (from `@fabrk/core`)

| Type | Fields |
|------|--------|
| `Session` | `userId`, `email`, `name`, `role`, `expiresAt`, `metadata` |
| `ApiKeyInfo` | `id`, `prefix`, `name`, `scopes`, `createdAt`, `active`, `expiresAt`, `lastUsedAt` |
| `MfaSetupResult` | `secret`, `qrCodeUrl`, `backupCodes` |
| `MfaVerifyResult` | `verified`, `usedBackupCode` |
| `AuthStore` | `getSession`, `createSession`, `deleteSession` |
| `ApiKeyStore` | `getByHash`, `create`, `revoke`, `listByUser`, `updateLastUsed` |

---

## Example: API Key Validation in Next.js Middleware

```ts
// middleware.ts
import { createNextAuthAdapter } from '@fabrk/auth'
import { prismaApiKeyStore } from './lib/stores'

const auth = createNextAuthAdapter({ apiKeyStore: prismaApiKeyStore })

export async function middleware(request: Request): Promise<Response> {
  const key = request.headers.get('X-API-Key')
  if (!key) return new Response('Unauthorized', { status: 401 })

  const keyInfo = await auth.validateApiKey(key)
  if (!keyInfo) return new Response('Invalid API key', { status: 401 })

  if (!keyInfo.scopes.includes('*') && !keyInfo.scopes.includes('read')) {
    return new Response('Forbidden', { status: 403 })
  }

  return Response.next()
}

export const config = { matcher: '/api/:path*' }
```
