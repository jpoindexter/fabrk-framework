/**
 * @fabrk/storage
 *
 * Storage adapters for the FABRK framework.
 * Supports S3, Cloudflare R2, and local filesystem.
 */

// Adapters
export { createS3Adapter } from './s3/adapter'
export { createR2Adapter } from './r2/adapter'
export { createLocalAdapter } from './local/adapter'

// Utilities
export { validateFile, generateStorageKey } from './validation'

// Types
export type {
  S3AdapterConfig,
  R2AdapterConfig,
  LocalAdapterConfig,
  FileValidationOptions,
} from './types'
