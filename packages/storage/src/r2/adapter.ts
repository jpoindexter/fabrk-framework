import type { StorageAdapter } from '@fabrk/core'
import type { R2AdapterConfig } from '../types'
import { createS3Adapter } from '../s3/adapter'

export function createR2Adapter(config: R2AdapterConfig): StorageAdapter {
  // Validate accountId to prevent endpoint injection via special characters
  if (!/^[a-zA-Z0-9-]+$/.test(config.accountId)) {
    throw new Error('Invalid R2 account ID: must be alphanumeric')
  }

  const s3Adapter = createS3Adapter({
    bucket: config.bucket,
    region: 'auto',
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    defaultExpiresIn: config.defaultExpiresIn,
  })

  return {
    ...s3Adapter,
    name: 'r2',
    version: '1.0.0',
  }
}
