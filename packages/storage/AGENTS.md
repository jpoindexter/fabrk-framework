# @fabrk/storage — AGENTS.md

> File storage adapters for the FABRK framework

## Overview

| | |
|---|---|
| **Package** | `@fabrk/storage` |
| **Language** | TypeScript |
| **Adapters** | AWS S3, Cloudflare R2, Local filesystem |
| **Pattern** | Provider-agnostic adapter (implements `StorageAdapter` from `@fabrk/core`) |

## Quick Start

```ts
import { createS3Adapter } from '@fabrk/storage'

const storage = createS3Adapter({
  bucket: process.env.S3_BUCKET!,
  region: process.env.AWS_REGION!,
})

// Upload a file
const result = await storage.upload({
  file: buffer,
  filename: 'photo.jpg',
  contentType: 'image/jpeg',
})

// Get signed URL for private access
const { url } = await storage.getSignedUrl({ key: result.key })
```

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `createS3Adapter` | Function | AWS S3 storage adapter |
| `createR2Adapter` | Function | Cloudflare R2 adapter (S3-compatible) |
| `createLocalAdapter` | Function | Local filesystem adapter (dev) |
| `validateFile` | Function | Validate file type and size |
| `generateStorageKey` | Function | Generate unique storage keys |

## Adapter Methods

All adapters implement `StorageAdapter`:

- `isConfigured()` — Check if configured
- `upload(options)` — Upload a file
- `getSignedUrl(options)` — Get pre-signed URL
- `delete(key)` — Delete a file
- `exists(key)` — Check if file exists

## Peer Dependencies

- `@aws-sdk/client-s3` — Required for S3/R2 adapters
- `@aws-sdk/s3-request-presigner` — Required for signed URLs

## Commands

```bash
pnpm build        # Build with tsup (ESM + CJS + DTS)
pnpm dev          # Watch mode
```
