export interface S3AdapterConfig {
  /** S3 bucket name */
  bucket: string
  /** AWS region */
  region: string
  /** Access key ID (defaults to env AWS_ACCESS_KEY_ID) */
  accessKeyId?: string
  /** Secret access key (defaults to env AWS_SECRET_ACCESS_KEY) */
  secretAccessKey?: string
  /** Custom endpoint (for S3-compatible services) */
  endpoint?: string
  /** Force path style (required for some S3-compatible services) */
  forcePathStyle?: boolean
  /** Default signed URL expiry in seconds */
  defaultExpiresIn?: number
}

export interface R2AdapterConfig {
  /** R2 bucket name */
  bucket: string
  /** Cloudflare account ID */
  accountId: string
  /** R2 access key ID */
  accessKeyId: string
  /** R2 secret access key */
  secretAccessKey: string
  /** Custom public URL for the bucket */
  publicUrl?: string
  /** Default signed URL expiry in seconds */
  defaultExpiresIn?: number
}

export interface LocalAdapterConfig {
  /** Root directory for file storage */
  directory: string
  /** Base URL for serving files */
  baseUrl?: string
  /** Max file size in bytes (default: 10MB) */
  maxFileSize?: number
  /**
   * HMAC secret used to sign local URLs (prevents expiry tampering).
   * If not provided, a random secret is generated per adapter instance
   * (URLs will not survive restarts). Provide a stable secret in production.
   */
  signingSecret?: string
}

export interface FileValidationOptions {
  /** Max file size in bytes */
  maxSize?: number
  /** Allowed MIME types */
  allowedTypes?: string[]
  /** Blocked MIME types */
  blockedTypes?: string[]
}
