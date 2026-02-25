export { createS3Adapter } from './s3/adapter'
export { createR2Adapter } from './r2/adapter'
export { createLocalAdapter } from './local/adapter'

export { validateFile, generateStorageKey, sanitizePath, validateMagicBytes } from './validation'

export type {
  S3AdapterConfig,
  R2AdapterConfig,
  LocalAdapterConfig,
  FileValidationOptions,
} from './types'
