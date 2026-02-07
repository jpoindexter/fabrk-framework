/**
 * File Validation Utilities
 *
 * Validates file size, type, and content before upload.
 */

import type { FileValidationOptions } from './types'

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024 // 10MB

const DANGEROUS_TYPES = [
  'application/x-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
]

export function validateFile(
  file: { size: number; contentType: string; filename: string },
  options: FileValidationOptions = {}
): { valid: boolean; error?: string } {
  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size ${formatBytes(file.size)} exceeds maximum ${formatBytes(maxSize)}`,
    }
  }

  // Check allowed types
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

  // Check blocked types
  const blockedTypes = [...DANGEROUS_TYPES, ...(options.blockedTypes ?? [])]
  if (blockedTypes.includes(file.contentType)) {
    return {
      valid: false,
      error: `File type ${file.contentType} is blocked`,
    }
  }

  // Check filename for path traversal
  if (file.filename.includes('..') || file.filename.includes('/') || file.filename.includes('\\')) {
    return {
      valid: false,
      error: 'Invalid filename',
    }
  }

  return { valid: true }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Generate a safe storage key from a filename
 */
export function generateStorageKey(
  filename: string,
  path?: string
): string {
  // Sanitize filename
  const safe = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')

  // Add timestamp to prevent collisions
  const timestamp = Date.now()
  const ext = safe.includes('.') ? `.${safe.split('.').pop()}` : ''
  const name = safe.includes('.') ? safe.slice(0, safe.lastIndexOf('.')) : safe

  const key = `${name}_${timestamp}${ext}`
  return path ? `${path.replace(/^\/|\/$/g, '')}/${key}` : key
}
