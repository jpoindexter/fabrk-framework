/* eslint-disable @typescript-eslint/no-explicit-any */
import type { StorageAdapter } from '@fabrk/core'
import type { UploadOptions, UploadResult, SignedUrlOptions, SignedUrlResult } from '@fabrk/core'
import type { S3AdapterConfig } from '../types'
import { validateFile, validateMagicBytes, generateStorageKey, sanitizePath, sanitizeFilename } from '../validation'

export function createS3Adapter(config: S3AdapterConfig): StorageAdapter {
  let s3Client: any = null
  let S3Client: any = null
  let PutObjectCommand: any = null
  let GetObjectCommand: any = null
  let DeleteObjectCommand: any = null
  let HeadObjectCommand: any = null
  let getSignedUrlFn: any = null

  function getClient() {
    if (!s3Client) {
      try {
        const s3Module = require('@aws-sdk/client-s3')
        S3Client = s3Module.S3Client
        PutObjectCommand = s3Module.PutObjectCommand
        GetObjectCommand = s3Module.GetObjectCommand
        DeleteObjectCommand = s3Module.DeleteObjectCommand
        HeadObjectCommand = s3Module.HeadObjectCommand

        s3Client = new S3Client({
          region: config.region,
          ...(config.accessKeyId && config.secretAccessKey
            ? {
                credentials: {
                  accessKeyId: config.accessKeyId,
                  secretAccessKey: config.secretAccessKey,
                },
              }
            : {}),
          ...(config.endpoint ? { endpoint: config.endpoint } : {}),
          ...(config.forcePathStyle ? { forcePathStyle: true } : {}),
        })

        try {
          const presignerModule = require('@aws-sdk/s3-request-presigner')
          getSignedUrlFn = presignerModule.getSignedUrl
        } catch {
          // Presigner is optional
        }
      } catch {
        throw new Error(
          '@fabrk/storage: @aws-sdk/client-s3 is required for S3Adapter. Install with: pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner'
        )
      }
    }
    return s3Client
  }

  return {
    name: 's3',
    version: '1.0.0',

    async initialize() {
      getClient()
    },

    isConfigured(): boolean {
      return Boolean(config.bucket && config.region)
    },

    async upload(options: UploadOptions): Promise<UploadResult> {
      const client = getClient()

      // When a path is provided, sanitize the filename separately (without the timestamp
      // that generateStorageKey adds) so the caller gets a deterministic key.
      const key = options.path
        ? `${sanitizePath(options.path)}/${sanitizeFilename(options.filename)}`
        : generateStorageKey(options.filename)

      // Convert to buffer for S3 (must happen before size computation
      // so ReadableStream inputs are fully buffered)
      let body: any
      if (options.file instanceof Blob) {
        const maxBytes = options.maxSize ?? (10 * 1024 * 1024)
        if (options.file.size > maxBytes) {
          throw new Error(`File size ${options.file.size} bytes exceeds maximum ${maxBytes} bytes`)
        }
        body = Buffer.from(await options.file.arrayBuffer())
      } else if (options.file instanceof ArrayBuffer) {
        const maxBytes = options.maxSize ?? (10 * 1024 * 1024)
        if (options.file.byteLength > maxBytes) {
          throw new Error(`File size ${options.file.byteLength} bytes exceeds maximum ${maxBytes} bytes`)
        }
        body = Buffer.from(options.file)
      } else {
        // Abort streaming early when accumulated size exceeds the limit to prevent
        // an attacker from exhausting process memory with a large stream (OOM DoS).
        const maxBytes = options.maxSize ?? (10 * 1024 * 1024) // 10MB default
        const chunks: Uint8Array[] = []
        let totalSize = 0
        const reader = (options.file as ReadableStream).getReader()
        let done = false
        while (!done) {
          const result = await reader.read()
          done = result.done
          if (result.value) {
            totalSize += result.value.length
            if (totalSize > maxBytes) {
              reader.cancel()
              throw new Error(`File exceeds maximum size of ${maxBytes} bytes`)
            }
            chunks.push(result.value)
          }
        }
        body = Buffer.concat(chunks)
      }

      // Compute size AFTER buffering so all input types (including
      // ReadableStream) use the actual buffer length
      const size = body.length

      const validation = validateFile(
        {
          size,
          contentType: options.contentType,
          filename: options.filename,
        },
        {
          maxSize: options.maxSize,
          allowedTypes: options.allowedTypes,
        }
      )

      if (!validation.valid) {
        throw new Error(validation.error)
      }

      if (options.contentType) {
        if (!validateMagicBytes(body, options.contentType)) {
          throw new Error(`File content does not match declared type ${options.contentType}`)
        }
      }

      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: options.contentType,
          Metadata: options.metadata ?? {},
          ...(options.public ? { ACL: 'public-read' } : {}),
        })
      )

      let url: string | undefined
      if (options.public) {
        if (config.endpoint) {
          const base = config.endpoint.replace(/\/$/, '')
          url = `${base}/${config.bucket}/${key}`
        } else {
          url = `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`
        }
      }

      return {
        key,
        url,
        size,
        contentType: options.contentType,
      }
    },

    async getSignedUrl(options: SignedUrlOptions): Promise<SignedUrlResult> {
      const client = getClient()

      if (!getSignedUrlFn) {
        throw new Error(
          '@fabrk/storage: @aws-sdk/s3-request-presigner is required for signed URLs. Install with: pnpm add @aws-sdk/s3-request-presigner'
        )
      }

      const safeKey = sanitizePath(options.key)
      const expiresIn = options.expiresIn ?? config.defaultExpiresIn ?? 3600

      const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: safeKey,
        ...(options.contentDisposition
          ? { ResponseContentDisposition: options.contentDisposition }
          : {}),
      })

      const url = await getSignedUrlFn(client, command, { expiresIn })

      return {
        url,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      }
    },

    async delete(key: string): Promise<void> {
      const client = getClient()
      const safeKey = sanitizePath(key)

      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: safeKey,
        })
      )
    },

    async exists(key: string): Promise<boolean> {
      const client = getClient()
      const safeKey = sanitizePath(key)

      try {
        await client.send(
          new HeadObjectCommand({
            Bucket: config.bucket,
            Key: safeKey,
          })
        )
        return true
      } catch {
        return false
      }
    },
  }
}
