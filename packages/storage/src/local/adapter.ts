import type { StorageAdapter } from '@fabrk/core'
import type { UploadOptions, UploadResult, SignedUrlOptions, SignedUrlResult } from '@fabrk/core'
import type { LocalAdapterConfig } from '../types'
import { validateFile, validateMagicBytes, generateStorageKey, sanitizePath } from '../validation'
import { promises as fs } from 'fs'
import { dirname, resolve, sep } from 'path'
import { createHmac, randomBytes } from 'crypto'

/**
 * Sanitize a filename component only (no path separators, no timestamp prefix).
 * Used when the caller provides an explicit path so the filename is sanitized
 * without adding the timestamp that generateStorageKey() appends.
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
}

export function createLocalAdapter(config: LocalAdapterConfig): StorageAdapter {
  const baseDir = resolve(config.directory)

  // Generate a per-instance signing secret for URL signatures.
  // In production, provide `config.signingSecret` for stability across restarts.
  const signingSecret = config.signingSecret ?? randomBytes(32).toString('hex')

  /**
   * Create an HMAC-SHA256 signature for a local URL to prevent parameter tampering.
   */
  function signUrl(key: string, expires: number): string {
    return createHmac('sha256', signingSecret)
      .update(`${key}:${expires}`)
      .digest('hex')
  }

  /**
   * Resolve a storage key to an absolute path and assert it stays
   * within the configured base directory.
   * Also resolves symlinks asynchronously to prevent escaping baseDir via symlink.
   * Handles environments where baseDir itself is a symlink (e.g. macOS /tmp -> /private/tmp).
   */
  async function safeFilePath(key: string): Promise<string> {
    const sanitized = sanitizePath(key)

    // Resolve the base directory first (handles symlinks like /tmp -> /private/tmp on macOS)
    let resolvedBase: string
    try {
      resolvedBase = await fs.realpath(baseDir)
    } catch {
      resolvedBase = resolve(baseDir)
    }

    const absolute = resolve(resolvedBase, sanitized)

    // Check containment against resolved base
    if (!absolute.startsWith(resolvedBase + sep) && absolute !== resolvedBase) {
      throw new Error(`Path traversal detected: "${key}"`)
    }

    // Now resolve the full path (file may not exist yet for uploads)
    try {
      const real = await fs.realpath(absolute)
      if (!real.startsWith(resolvedBase + sep) && real !== resolvedBase) {
        throw new Error(`Symlink traversal detected: "${key}"`)
      }
      return real
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException
      if (nodeErr?.message?.includes('Symlink traversal') || nodeErr?.message?.includes('Path traversal')) {
        throw err
      }
      if (nodeErr?.code === 'ENOENT') {
        // File doesn't exist yet (upload case) — path already checked above
        return absolute
      }
      throw err
    }
  }

  return {
    name: 'local',
    version: '1.0.0',

    async initialize() {
      await fs.mkdir(config.directory, { recursive: true })
    },

    isConfigured(): boolean {
      return Boolean(config.directory)
    },

    async upload(options: UploadOptions): Promise<UploadResult> {
      let size: number
      let data: Buffer

      if (options.file instanceof Blob) {
        const maxBytes = options.maxSize ?? config.maxFileSize ?? (10 * 1024 * 1024)
        if (options.file.size > maxBytes) {
          throw new Error(`File size ${options.file.size} bytes exceeds maximum ${maxBytes} bytes`)
        }
        size = options.file.size
        data = Buffer.from(await options.file.arrayBuffer())
      } else if (options.file instanceof ArrayBuffer) {
        const maxBytes = options.maxSize ?? config.maxFileSize ?? (10 * 1024 * 1024)
        if (options.file.byteLength > maxBytes) {
          throw new Error(`File size ${options.file.byteLength} bytes exceeds maximum ${maxBytes} bytes`)
        }
        size = options.file.byteLength
        data = Buffer.from(options.file)
      } else {
        // Abort streaming early when accumulated size exceeds the limit to prevent
        // an attacker from exhausting process memory with a large stream (OOM DoS).
        const maxBytes = options.maxSize ?? config.maxFileSize ?? (10 * 1024 * 1024) // 10MB default
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
        data = Buffer.concat(chunks)
        size = data.length
      }

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

      if (options.contentType) {
        if (!validateMagicBytes(data, options.contentType)) {
          throw new Error(`File content does not match declared type ${options.contentType}`)
        }
      }

      // When a path is provided, sanitize the filename separately (without the timestamp
      // that generateStorageKey adds) so the caller gets a deterministic key.
      const key = options.path
        ? `${sanitizePath(options.path)}/${sanitizeFilename(options.filename)}`
        : generateStorageKey(options.filename)

      const filePath = await safeFilePath(key)
      await fs.mkdir(dirname(filePath), { recursive: true })
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
      const safeKey = sanitizePath(options.key)

      const expiresIn = options.expiresIn ?? 3600
      const expiresAt = new Date(Date.now() + expiresIn * 1000)
      const expiresTs = expiresAt.getTime()

      // Sign the URL parameters so expiry cannot be tampered with.
      // Consumers should verify the signature on the serving side using
      // the same signing secret.
      const signature = signUrl(safeKey, expiresTs)

      const url = config.baseUrl
        ? `${config.baseUrl.replace(/\/$/, '')}/${safeKey}?expires=${expiresTs}&sig=${signature}`
        : safeKey

      return { url, expiresAt }
    },

    async delete(key: string): Promise<void> {
      const filePath = await safeFilePath(key)
      try {
        await fs.unlink(filePath)
      } catch (err: unknown) {
        if (err instanceof Error && (err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
      }
    },

    async exists(key: string): Promise<boolean> {
      const filePath = await safeFilePath(key)
      try {
        await fs.access(filePath)
        return true
      } catch {
        return false
      }
    },
  }
}
