# @fabrk/auth

Authentication adapters for the FABRK framework. Supports NextAuth, API keys, and MFA (TOTP + backup codes).

## Installation

```bash
npm install @fabrk/auth
```

## Usage

```tsx
import { createNextAuthAdapter } from '@fabrk/auth'
import { auth } from './lib/auth' // your NextAuth v5 auth()

const authAdapter = createNextAuthAdapter({
  authInstance: auth,
  providers: ['google', 'credentials'],
  sessionStrategy: 'jwt',
})

// Get session
const session = await authAdapter.getSession(request)
```

### API Keys

```tsx
import { generateApiKey, hashApiKey, createApiKeyValidator } from '@fabrk/auth'

// Generate a key (format: fabrk_live_xxxxx)
const { key, prefix, hash } = await generateApiKey({
  prefix: 'fabrk',
  environment: 'live',
})

// Validate a key
const validator = createApiKeyValidator(apiKeyStore)
const keyInfo = await validator.validate(key)

if (keyInfo && validator.hasScope(keyInfo, 'write')) {
  // Authorized
}
```

### MFA (TOTP + Backup Codes)

```tsx
import {
  generateTotpSecret,
  generateTotpUri,
  verifyTotp,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
} from '@fabrk/auth'

// Setup TOTP
const secret = generateTotpSecret()
const uri = generateTotpUri(secret, 'user@example.com', 'MyApp')
// Display URI as QR code in authenticator app

// Verify a 6-digit code
const valid = await verifyTotp(secret, '123456')

// Generate backup codes (format: XXXX-XXXX)
const codes = generateBackupCodes(10)
const hashed = await hashBackupCodes(codes)

// Verify a backup code
const { valid: isValid, matchedIndex } = await verifyBackupCode('A1B2-C3D4', hashed)
```

### Middleware

```tsx
import { withAuth, withApiKey, withAuthOrApiKey } from '@fabrk/auth'

// Require session auth
export const POST = withAuth(authAdapter, async (req, session) => {
  return Response.json({ user: session.userId })
})

// Require API key with scopes
export const GET = withApiKey(authAdapter, async (req, keyInfo) => {
  return Response.json({ key: keyInfo.name })
}, { requiredScopes: ['read'] })

// Accept either session or API key
export const PUT = withAuthOrApiKey(authAdapter, async (req, { session, apiKey }) => {
  return Response.json({ authenticated: true })
})
```

## Features

- **NextAuth Adapter** - Wraps Auth.js v5 with a unified `AuthAdapter` interface; accepts your `auth()` function for real session retrieval
- **API Key Generation** - Cryptographically secure keys in `prefix_env_random` format with SHA-256 hashing for storage
- **API Key Validation** - Hash-based lookup with scope/permission checking and wildcard support
- **TOTP (RFC 6238)** - Time-based one-time passwords with configurable time window for clock skew tolerance
- **Backup Codes** - One-time-use recovery codes formatted as `XXXX-XXXX` with ambiguous characters removed
- **Auth Middleware** - `withAuth`, `withApiKey`, and `withAuthOrApiKey` route wrappers for session and API key protection
- **In-Memory Stores** - `InMemoryAuthStore` and `InMemoryApiKeyStore` for development and testing
- **Web Crypto API** - All cryptographic operations use the Web Crypto API with no Node.js-specific dependencies

## Documentation

[View full documentation](https://github.com/jpoindexter/fabrk-framework)

## License

MIT
