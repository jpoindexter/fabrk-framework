export interface UploadOptions {
  file: ArrayBuffer | Blob | ReadableStream
  filename: string
  contentType: string
  path?: string
  public?: boolean
  maxSize?: number
  allowedTypes?: string[]
  metadata?: Record<string, string>
}

export interface UploadResult {
  key: string
  url?: string
  size: number
  contentType: string
}

export interface SignedUrlOptions {
  key: string
  expiresIn?: number
  contentDisposition?: string
}

export interface SignedUrlResult {
  url: string
  expiresAt: Date
}

export interface RateLimitOptions {
  identifier: string
  limit: string
  max?: number
  windowSeconds?: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: Date
  retryAfter?: number
}
