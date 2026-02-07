/**
 * S3 Storage Adapter
 *
 * Implements StorageAdapter using AWS S3.
 * @aws-sdk/client-s3 is an optional peer dependency.
 *
 * @example
 * ```ts
 * import { createS3Adapter } from '@fabrk/storage'
 *
 * const storage = createS3Adapter({
 *   bucket: process.env.S3_BUCKET!,
 *   region: process.env.AWS_REGION!,
 * })
 *
 * registry.register('storage', storage)
 * ```
 */

import type { StorageAdapter } from '@fabrk/core'
import type { UploadOptions, UploadResult, SignedUrlOptions, SignedUrlResult } from '@fabrk/core'
import type { S3AdapterConfig } from '../types'
import { validateFile, generateStorageKey } from '../validation'

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

      // Validate file
      const size = options.file instanceof Blob ? options.file.size : (options.file as ArrayBuffer).byteLength
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

      const key = options.path
        ? `${options.path.replace(/^\/|\/$/g, '')}/${options.filename}`
        : generateStorageKey(options.filename)

      // Convert to buffer for S3
      let body: any
      if (options.file instanceof Blob) {
        body = Buffer.from(await options.file.arrayBuffer())
      } else if (options.file instanceof ArrayBuffer) {
        body = Buffer.from(options.file)
      } else {
        // ReadableStream
        const chunks: Uint8Array[] = []
        const reader = (options.file as ReadableStream).getReader()
        let done = false
        while (!done) {
          const result = await reader.read()
          done = result.done
          if (result.value) chunks.push(result.value)
        }
        body = Buffer.concat(chunks)
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

      const url = options.public
        ? `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`
        : undefined

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

      const expiresIn = options.expiresIn ?? config.defaultExpiresIn ?? 3600

      const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: options.key,
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

      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: key,
        })
      )
    },

    async exists(key: string): Promise<boolean> {
      const client = getClient()

      try {
        await client.send(
          new HeadObjectCommand({
            Bucket: config.bucket,
            Key: key,
          })
        )
        return true
      } catch {
        return false
      }
    },
  }
}
