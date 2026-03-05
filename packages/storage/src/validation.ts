import type { FileValidationOptions } from './types'
import { posix } from 'path'
import { randomBytes } from 'crypto'

export const DEFAULT_MAX_SIZE = 10 * 1024 * 1024 // 10MB

const DANGEROUS_TYPES = [
  'application/x-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'text/html',
  'application/xhtml+xml',
  'image/svg+xml',        // SVG can contain inline scripts
  'application/javascript',
  'text/javascript',
  'application/x-sh',
  'text/x-shellscript',
  'text/xml',
  'application/xml',
  'application/x-httpd-php',
  'text/x-php',
  'application/wasm',
  'text/x-python',
  'application/x-perl',
  'application/x-ruby',
  'application/x-java-archive',
]

export function validateFile(
  file: { size: number; contentType: string; filename: string },
  options: FileValidationOptions = {}
): { valid: boolean; error?: string } {
  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size ${formatBytes(file.size)} exceeds maximum ${formatBytes(maxSize)}`,
    }
  }

  if (options.allowedTypes?.length) {
    const isAllowed = options.allowedTypes.some((type) => {
      if (type.endsWith('/*')) {
        return file.contentType.startsWith(type.replace('/*', '/'))
      }
      return file.contentType === type
    })

    if (!isAllowed) {
      return {
        valid: false,
        error: `File type ${file.contentType} is not allowed. Allowed: ${options.allowedTypes.join(', ')}`,
      }
    }
  }

  const blockedTypes = [...DANGEROUS_TYPES, ...(options.blockedTypes ?? [])]
  if (blockedTypes.includes(file.contentType)) {
    return {
      valid: false,
      error: `File type ${file.contentType} is blocked`,
    }
  }

  if (file.filename.includes('..') || file.filename.includes('/') || file.filename.includes('\\')) {
    return {
      valid: false,
      error: 'Invalid filename',
    }
  }

  return { valid: true }
}

/**
 * Known magic byte signatures for common file types.
 * Used by `validateMagicBytes` to verify that file content matches
 * the declared MIME type.
 */
const MAGIC_BYTES: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF" prefix
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // "%PDF"
  { mime: 'application/zip', bytes: [0x50, 0x4B, 0x03, 0x04] },
]

/**
 * Validate that the first bytes of `data` match the expected magic bytes
 * for the declared `contentType`.
 *
 * Returns `true` if the content type is not in the known list (pass-through)
 * or if the magic bytes match. Returns `false` only when the content type
 * IS known and the bytes do NOT match (likely a disguised file).
 *
 * **Note:** For comprehensive server-side file-type detection, consider using
 * a dedicated library such as `file-type` at the application level.
 */
export function validateMagicBytes(
  data: Uint8Array | Buffer,
  contentType: string
): boolean {
  const expected = MAGIC_BYTES.find((m) => m.mime === contentType)
  if (!expected) return true // Unknown type — skip magic check

  if (data.length < expected.bytes.length) return false

  return expected.bytes.every((b, i) => data[i] === b)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function generateStorageKey(
  filename: string,
  path?: string
): string {
  const safe = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')

  const timestamp = Date.now()
  const nonce = randomBytes(6).toString('hex')
  const ext = safe.includes('.') ? `.${safe.split('.').pop()}` : ''
  const name = safe.includes('.') ? safe.slice(0, safe.lastIndexOf('.')) : safe

  const key = `${name}_${timestamp}_${nonce}${ext}`
  return path ? `${path.replace(/^\/|\/$/g, '')}/${key}` : key
}

/**
 * Sanitize a filename component only (no path separators, no timestamp prefix).
 * Used when the caller provides an explicit path so the filename is sanitized
 * without adding the timestamp that generateStorageKey() appends.
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
}

/**
 * Sanitize a storage path to prevent directory traversal attacks.
 *
 * - Normalizes backslashes to forward slashes
 * - Resolves `.` and `..` segments via posix.normalize
 * - Strips leading `/` so the result is always relative
 * - Rejects any path that still contains `..` after normalization
 *   (which would escape the storage root)
 *
 * Works cross-platform because we normalize to POSIX separators first.
 */
/**
 * Buffer an entire ReadableStream, enforcing a size cap to prevent OOM DoS.
 * Aborts reading and throws if the accumulated size exceeds `maxBytes`.
 */
export async function readStreamToBuffer(stream: ReadableStream, maxBytes: number): Promise<Buffer> {
  const chunks: Uint8Array[] = []
  let totalSize = 0
  const reader = stream.getReader()
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
  return Buffer.concat(chunks)
}

export function sanitizePath(input: string): string {
  // Reject null bytes which can truncate paths at the OS level
  if (input.includes('\0')) {
    throw new Error('Null byte in storage path')
  }

  let normalized = input.replace(/\\/g, '/')

  normalized = posix.normalize(normalized)

  // Strip leading slashes (could be multiple after normalize)
  normalized = normalized.replace(/^\/+/, '')

  if (normalized === '..' || normalized.startsWith('../') || normalized.includes('/../') || normalized.endsWith('/..')) {
    throw new Error(`Path traversal detected: "${input}"`)
  }

  if (normalized === '' || normalized === '.') {
    throw new Error(`Invalid storage path: "${input}"`)
  }

  return normalized
}
