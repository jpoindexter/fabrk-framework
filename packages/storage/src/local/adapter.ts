/**
 * Local Filesystem Storage Adapter
 *
 * Implements StorageAdapter using the local filesystem.
 * Useful for development and testing.
 *
 * @example
 * ```ts
 * import { createLocalAdapter } from '@fabrk/storage'
 *
 * const storage = createLocalAdapter({
 *   directory: './uploads',
 *   baseUrl: '/api/files',
 * })
 * ```
 */

import type { StorageAdapter } from '@fabrk/core'
import type { UploadOptions, UploadResult, SignedUrlOptions, SignedUrlResult } from '@fabrk/core'
import type { LocalAdapterConfig } from '../types'
import { validateFile, generateStorageKey } from '../validation'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'

export function createLocalAdapter(config: LocalAdapterConfig): StorageAdapter {
  return {
    name: 'local',
    version: '1.0.0',

    async initialize() {
      // Ensure storage directory exists
      await fs.mkdir(config.directory, { recursive: true })
    },

    isConfigured(): boolean {
      return Boolean(config.directory)
    },

    async upload(options: UploadOptions): Promise<UploadResult> {
      // Get file size
      let size: number
      let data: Buffer

      if (options.file instanceof Blob) {
        size = options.file.size
        data = Buffer.from(await options.file.arrayBuffer())
      } else if (options.file instanceof ArrayBuffer) {
        size = options.file.byteLength
        data = Buffer.from(options.file)
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
        data = Buffer.concat(chunks)
        size = data.length
      }

      // Validate
      const validation = validateFile(
        {
          size,
          contentType: options.contentType,
          filename: options.filename,
        },
        {
          maxSize: options.maxSize ?? config.maxFileSize,
          allowedTypes: options.allowedTypes,
        }
      )

      if (!validation.valid) {
        throw new Error(validation.error)
      }

      const key = options.path
        ? `${options.path.replace(/^\/|\/$/g, '')}/${options.filename}`
        : generateStorageKey(options.filename)

      const filePath = join(config.directory, key)

      // Ensure directory exists
      await fs.mkdir(dirname(filePath), { recursive: true })

      // Write file
      await fs.writeFile(filePath, data)

      const url = config.baseUrl
        ? `${config.baseUrl.replace(/\/$/, '')}/${key}`
        : undefined

      return {
        key,
        url,
        size,
        contentType: options.contentType,
      }
    },

    async getSignedUrl(options: SignedUrlOptions): Promise<SignedUrlResult> {
      // Local adapter doesn't support true signed URLs
      // Return a direct URL with an expiry timestamp
      const expiresIn = options.expiresIn ?? 3600
      const expiresAt = new Date(Date.now() + expiresIn * 1000)

      const url = config.baseUrl
        ? `${config.baseUrl.replace(/\/$/, '')}/${options.key}?expires=${expiresAt.getTime()}`
        : options.key

      return { url, expiresAt }
    },

    async delete(key: string): Promise<void> {
      const filePath = join(config.directory, key)
      try {
        await fs.unlink(filePath)
      } catch (err: any) {
        if (err.code !== 'ENOENT') throw err
      }
    },

    async exists(key: string): Promise<boolean> {
      const filePath = join(config.directory, key)
      try {
        await fs.access(filePath)
        return true
      } catch {
        return false
      }
    },
  }
}
