# @fabrk/storage

Storage adapters for the FABRK framework, supporting AWS S3, Cloudflare R2, and local filesystem.

## Installation

```bash
npm install @fabrk/storage
```

Then install the provider SDK you need:

```bash
# For S3 or R2
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Local filesystem adapter has no extra dependencies
```

## Usage

```tsx
import { createS3Adapter } from '@fabrk/storage'

const storage = createS3Adapter({
  bucket: process.env.S3_BUCKET!,
  region: process.env.AWS_REGION!,
})

// Upload a file
const result = await storage.upload({
  file: fileBlob,
  filename: 'photo.jpg',
  contentType: 'image/jpeg',
  path: 'uploads/avatars',
  public: true,
})

// Generate a signed download URL
const { url, expiresAt } = await storage.getSignedUrl({
  key: result.key,
  expiresIn: 3600,
})

// Check existence and delete
const exists = await storage.exists(result.key)
await storage.delete(result.key)
```

### Cloudflare R2

```tsx
import { createR2Adapter } from '@fabrk/storage'

const storage = createR2Adapter({
  bucket: process.env.R2_BUCKET!,
  accountId: process.env.CF_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
})
```

### Local filesystem

```tsx
import { createLocalAdapter } from '@fabrk/storage'

const storage = createLocalAdapter({
  directory: './uploads',
  baseUrl: '/api/files',
  maxFileSize: 5 * 1024 * 1024, // 5MB
})
```

## Features

- **S3 adapter** - Full AWS S3 integration with upload, signed URLs, delete, and existence checks, plus support for S3-compatible services via custom endpoints
- **R2 adapter** - Cloudflare R2 support built on top of the S3 adapter with automatic R2 endpoint configuration
- **Local filesystem adapter** - File storage on the local disk for development and testing, with automatic directory creation
- **Unified interface** - All adapters implement the same `StorageAdapter` interface from `@fabrk/core` (upload, getSignedUrl, delete, exists)
- **File validation** - Built-in size limits (default 10MB), MIME type allowlists/blocklists, dangerous file type blocking, and path traversal prevention
- **Storage key generation** - Automatic filename sanitization and timestamp-based collision prevention via `generateStorageKey`
- **Lazy loading** - AWS SDK is loaded on first use, so unused adapters add zero overhead
- **Stream support** - Upload accepts Blob, ArrayBuffer, or ReadableStream inputs

## API

| Export | Description |
|--------|-------------|
| `createS3Adapter(config)` | Create an AWS S3 storage adapter |
| `createR2Adapter(config)` | Create a Cloudflare R2 storage adapter |
| `createLocalAdapter(config)` | Create a local filesystem storage adapter |
| `validateFile(file, options?)` | Validate file size, type, and filename |
| `generateStorageKey(filename, path?)` | Generate a safe, unique storage key |
| `S3AdapterConfig` | S3 configuration type |
| `R2AdapterConfig` | R2 configuration type |
| `LocalAdapterConfig` | Local adapter configuration type |
| `FileValidationOptions` | File validation options type |

## Documentation

[View full documentation](https://github.com/jpoindexter/fabrk-framework)

## License

MIT
