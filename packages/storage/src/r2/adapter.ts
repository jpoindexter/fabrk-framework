/**
 * Cloudflare R2 Storage Adapter
 *
 * Implements StorageAdapter using Cloudflare R2.
 * R2 is S3-compatible, so this adapter extends the S3 adapter
 * with R2-specific configuration.
 *
 * @example
 * ```ts
 * import { createR2Adapter } from '@fabrk/storage'
 *
 * const storage = createR2Adapter({
 *   bucket: process.env.R2_BUCKET!,
 *   accountId: process.env.CF_ACCOUNT_ID!,
 *   accessKeyId: process.env.R2_ACCESS_KEY_ID!,
 *   secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
 * })
 * ```
 */

import type { StorageAdapter } from '@fabrk/core'
import type { R2AdapterConfig } from '../types'
import { createS3Adapter } from '../s3/adapter'

export function createR2Adapter(config: R2AdapterConfig): StorageAdapter {
  const s3Adapter = createS3Adapter({
    bucket: config.bucket,
    region: 'auto',
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    defaultExpiresIn: config.defaultExpiresIn,
  })

  // Override name and version
  return {
    ...s3Adapter,
    name: 'r2',
    version: '1.0.0',
  }
}
