# @fabrk/storage — Agent Reference

File storage adapters for S3, Cloudflare R2, and local filesystem. All three
implement the `StorageAdapter` interface from `@fabrk/core`.

## Install

```bash
pnpm add @fabrk/storage
# Peer deps for S3 / R2:
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## Adapters

### S3

```ts
import { createS3Adapter } from '@fabrk/storage'

const storage = createS3Adapter({
  bucket: 'my-bucket',
  region: 'us-east-1',
  // accessKeyId / secretAccessKey optional — defaults to env vars
  // AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
  // endpoint?: string        // for S3-compatible services (MinIO, etc.)
  // forcePathStyle?: boolean // required for some S3-compatible services
  // defaultExpiresIn?: 3600  // signed URL TTL in seconds
})
```

### R2 (Cloudflare)

R2 is a thin wrapper over the S3 adapter with the Cloudflare endpoint pre-configured.

```ts
import { createR2Adapter } from '@fabrk/storage'

const storage = createR2Adapter({
  bucket: 'my-bucket',
  accountId: process.env.CF_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  // publicUrl?: 'https://cdn.example.com'  // for public-read URLs
  // defaultExpiresIn?: 3600
})
```

### Local (development)

```ts
import { createLocalAdapter } from '@fabrk/storage'

const storage = createLocalAdapter({
  directory: './uploads',
  baseUrl: 'http://localhost:3000/uploads',
  // maxFileSize?: 10 * 1024 * 1024  // 10MB default
  // signingSecret?: string           // stable HMAC secret for signed URLs
})
```

Provide a `signingSecret` if signed URLs must survive process restarts.

---

## Common Interface (`StorageAdapter` from `@fabrk/core`)

```ts
interface StorageAdapter {
  name: string          // 's3' | 'r2' | 'local'
  isConfigured(): boolean
  upload(options: UploadOptions): Promise<UploadResult>
  getSignedUrl(options: SignedUrlOptions): Promise<SignedUrlResult>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}
```

**`UploadOptions` fields:**
- `file` — `Blob | File | ArrayBuffer | ReadableStream`
- `filename: string`
- `contentType?: string`
- `path?: string` — storage prefix (e.g. `'avatars/user-123'`)
- `public?: boolean` — set ACL public-read on S3
- `maxSize?: number` — per-upload size limit in bytes
- `allowedTypes?: string[]` — e.g. `['image/*', 'application/pdf']`
- `metadata?: Record<string, string>`

**`SignedUrlOptions` fields:** `key`, `expiresIn?` (seconds), `contentDisposition?`

---

## Validation Utilities

```ts
import { validateFile, validateMagicBytes, generateStorageKey, sanitizePath } from '@fabrk/storage'

// Check size + MIME type before uploading
const result = validateFile(
  { size: file.size, contentType: file.type, filename: file.name },
  { maxSize: 5 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] }
)
if (!result.valid) throw new Error(result.error)

// Verify magic bytes match declared MIME type (prevents disguised uploads)
const buffer = Buffer.from(await file.arrayBuffer())
if (!validateMagicBytes(buffer, file.type)) throw new Error('File content mismatch')

// Generate a collision-resistant storage key
const key = generateStorageKey('avatar.png', 'avatars/user-123')
// => 'avatars/user-123/avatar_1712345678000_a1b2c3.png'

// Sanitize a path to prevent directory traversal
const safe = sanitizePath(userInput) // throws on '..' traversal or null bytes
```

`validateFile` blocks dangerous MIME types by default: `text/html`, `image/svg+xml`,
`application/javascript`, `application/wasm`, executables, and shell scripts.
Magic-byte checking is supported for PNG, JPEG, GIF, WebP, PDF, and ZIP.

---

## Example — File Upload API Route

```ts
// app/api/upload/route.ts
import { createS3Adapter } from '@fabrk/storage'

const storage = createS3Adapter({
  bucket: process.env.S3_BUCKET!,
  region: process.env.AWS_REGION!,
})

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File

  const result = await storage.upload({
    file,
    filename: file.name,
    contentType: file.type,
    path: 'uploads',
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['image/*', 'application/pdf'],
  })

  return Response.json({ key: result.key, url: result.url })
}
```

---

## Key Types

| Type | Fields |
|------|--------|
| `UploadResult` | `key`, `url?`, `size`, `contentType?` |
| `SignedUrlResult` | `url`, `expiresAt` |
| `FileValidationOptions` | `maxSize?`, `allowedTypes?`, `blockedTypes?` |

Config types: `S3AdapterConfig`, `R2AdapterConfig`, `LocalAdapterConfig`
