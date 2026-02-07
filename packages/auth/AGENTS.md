# @fabrk/auth — AGENTS.md

> Authentication adapters, API keys, and MFA for the FABRK framework

## Overview

| | |
|---|---|
| **Package** | `@fabrk/auth` |
| **Language** | TypeScript |
| **Features** | NextAuth adapter, API key generation/validation, TOTP MFA, backup codes |
| **Pattern** | Provider-agnostic adapter (implements `AuthAdapter` from `@fabrk/core`) |

## Quick Start

```ts
import { generateApiKey, createApiKeyValidator, generateTotpSecret, verifyTotp } from '@fabrk/auth'

// Generate an API key
const { key, prefix, hash } = await generateApiKey()
// key: "fabrk_live_a1b2c3d4..."

// Validate API keys
const validator = createApiKeyValidator(apiKeyStore)
const keyInfo = await validator.validate(key)

// MFA setup
const secret = generateTotpSecret()
const uri = generateTotpUri(secret, 'user@app.com', 'MyApp')
const valid = await verifyTotp(secret, '123456')
```

## Exports

### Adapters
| Export | Type | Description |
|--------|------|-------------|
| `createNextAuthAdapter` | Function | Creates a NextAuth-based auth adapter |

### API Keys
| Export | Type | Description |
|--------|------|-------------|
| `generateApiKey` | Function | Generate `fabrk_live_xxx` format keys with SHA-256 hash |
| `hashApiKey` | Function | SHA-256 hash an API key for storage |
| `createApiKeyValidator` | Function | Create a validator that checks keys against a store |

### MFA
| Export | Type | Description |
|--------|------|-------------|
| `generateTotpSecret` | Function | Generate base32-encoded TOTP secret |
| `generateTotpUri` | Function | Generate `otpauth://` URI for QR codes |
| `verifyTotp` | Function | Verify a 6-digit TOTP code (RFC 6238) |
| `generateBackupCodes` | Function | Generate XXXX-XXXX format backup codes |
| `hashBackupCodes` | Function | SHA-256 hash backup codes for storage |
| `verifyBackupCode` | Function | Verify a backup code against hashed set |

### Middleware
| Export | Type | Description |
|--------|------|-------------|
| `withAuth` | Function | Require authenticated session |
| `withApiKey` | Function | Require valid API key |
| `withAuthOrApiKey` | Function | Accept either auth method |

### Stores
| Export | Type | Description |
|--------|------|-------------|
| `InMemoryAuthStore` | Class | In-memory session store for dev |
| `InMemoryApiKeyStore` | Class | In-memory API key store for dev |

## Key Design Decisions

- **Web Crypto API** throughout — no Node.js-specific dependencies
- **Base62 encoding** for API keys (alphanumeric, URL-safe)
- **TOTP** uses RFC 6238 with ±1 window for clock skew tolerance
- **Backup codes** exclude ambiguous characters (I, O, 0, 1)
- Raw API keys are **never stored** — only SHA-256 hashes

## Commands

```bash
pnpm build        # Build with tsup (ESM + CJS + DTS)
pnpm dev          # Watch mode
pnpm test         # Run tests (generator, backup codes)
```
