import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLocalAdapter } from './local/adapter'
import { createS3Adapter } from './s3/adapter'
import { createR2Adapter } from './r2/adapter'
import { validateFile, generateStorageKey } from './validation'
import type { StorageAdapter } from '@fabrk/core'

// Mock fs module for local adapter tests
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
  },
}))

// ============================================================================
// ADAPTER INTERFACE CONTRACT
// ============================================================================

describe('Storage Adapter Interface Contract', () => {
  describe('createLocalAdapter', () => {
    let adapter: StorageAdapter

    beforeEach(() => {
      adapter = createLocalAdapter({ directory: '/tmp/test-uploads' })
    })

    it('should return an object with name and version', () => {
      expect(adapter.name).toBe('local')
      expect(adapter.version).toBe('1.0.0')
    })

    it('should implement isConfigured', () => {
      expect(typeof adapter.isConfigured).toBe('function')
      expect(adapter.isConfigured()).toBe(true)
    })

    it('should implement upload', () => {
      expect(typeof adapter.upload).toBe('function')
    })

    it('should implement getSignedUrl', () => {
      expect(typeof adapter.getSignedUrl).toBe('function')
    })

    it('should implement delete', () => {
      expect(typeof adapter.delete).toBe('function')
    })

    it('should implement exists', () => {
      expect(typeof adapter.exists).toBe('function')
    })

    it('should implement initialize', () => {
      expect(typeof adapter.initialize).toBe('function')
    })

    it('should report not configured when directory is empty', () => {
      const emptyAdapter = createLocalAdapter({ directory: '' })
      expect(emptyAdapter.isConfigured()).toBe(false)
    })
  })

  describe('createS3Adapter', () => {
    let adapter: StorageAdapter

    beforeEach(() => {
      adapter = createS3Adapter({
        bucket: 'test-bucket',
        region: 'us-east-1',
      })
    })

    it('should return an object with name and version', () => {
      expect(adapter.name).toBe('s3')
      expect(adapter.version).toBe('1.0.0')
    })

    it('should implement isConfigured', () => {
      expect(typeof adapter.isConfigured).toBe('function')
      expect(adapter.isConfigured()).toBe(true)
    })

    it('should implement all StorageAdapter methods', () => {
      expect(typeof adapter.upload).toBe('function')
      expect(typeof adapter.getSignedUrl).toBe('function')
      expect(typeof adapter.delete).toBe('function')
      expect(typeof adapter.exists).toBe('function')
      expect(typeof adapter.initialize).toBe('function')
    })

    it('should report not configured when bucket is missing', () => {
      const badAdapter = createS3Adapter({ bucket: '', region: 'us-east-1' })
      expect(badAdapter.isConfigured()).toBe(false)
    })

    it('should report not configured when region is missing', () => {
      const badAdapter = createS3Adapter({ bucket: 'test', region: '' })
      expect(badAdapter.isConfigured()).toBe(false)
    })
  })

  describe('createR2Adapter', () => {
    let adapter: StorageAdapter

    beforeEach(() => {
      adapter = createR2Adapter({
        bucket: 'test-bucket',
        accountId: 'test-account-id',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
      })
    })

    it('should return an object with name r2', () => {
      expect(adapter.name).toBe('r2')
      expect(adapter.version).toBe('1.0.0')
    })

    it('should implement all StorageAdapter methods', () => {
      expect(typeof adapter.isConfigured).toBe('function')
      expect(typeof adapter.upload).toBe('function')
      expect(typeof adapter.getSignedUrl).toBe('function')
      expect(typeof adapter.delete).toBe('function')
      expect(typeof adapter.exists).toBe('function')
    })

    it('should report configured when all required fields are present', () => {
      expect(adapter.isConfigured()).toBe(true)
    })
  })
})

// ============================================================================
// LOCAL ADAPTER BEHAVIOR
// ============================================================================

describe('Local Adapter', () => {
  let adapter: StorageAdapter

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = createLocalAdapter({
      directory: '/tmp/test-uploads',
      baseUrl: '/api/files',
    })
  })

  describe('initialize', () => {
    it('should create the storage directory', async () => {
      const { promises: fs } = await import('fs')
      await adapter.initialize!()
      expect(fs.mkdir).toHaveBeenCalledWith('/tmp/test-uploads', { recursive: true })
    })
  })

  describe('upload', () => {
    it('should write file and return result with key and url', async () => {
      const { promises: fs } = await import('fs')
      const file = new Blob(['hello world'], { type: 'text/plain' })

      const result = await adapter.upload({
        file,
        filename: 'test.txt',
        contentType: 'text/plain',
        path: 'documents',
      })

      expect(result.key).toBe('documents/test.txt')
      expect(result.url).toContain('/api/files/documents/test.txt')
      expect(result.size).toBe(11)
      expect(result.contentType).toBe('text/plain')
      expect(fs.writeFile).toHaveBeenCalled()
    })

    it('should generate storage key when no path is provided', async () => {
      const file = new Blob(['data'], { type: 'text/plain' })

      const result = await adapter.upload({
        file,
        filename: 'test.txt',
        contentType: 'text/plain',
      })

      // Key should be generated with timestamp
      expect(result.key).toContain('test_')
      expect(result.key).toContain('.txt')
    })

    it('should reject files exceeding max size', async () => {
      const adapter = createLocalAdapter({
        directory: '/tmp/test',
        maxFileSize: 5,
      })

      const file = new Blob(['too large file content'], { type: 'text/plain' })

      await expect(
        adapter.upload({
          file,
          filename: 'big.txt',
          contentType: 'text/plain',
        })
      ).rejects.toThrow(/exceeds maximum/)
    })

    it('should handle ArrayBuffer input', async () => {
      const encoder = new TextEncoder()
      const buffer = encoder.encode('hello').buffer as ArrayBuffer

      const result = await adapter.upload({
        file: buffer,
        filename: 'data.bin',
        contentType: 'application/octet-stream',
        path: 'bin',
      })

      expect(result.key).toBe('bin/data.bin')
      expect(result.size).toBe(5)
    })
  })

  describe('getSignedUrl', () => {
    it('should return a URL with expiry parameter', async () => {
      const result = await adapter.getSignedUrl({ key: 'docs/file.pdf' })

      expect(result.url).toContain('/api/files/docs/file.pdf')
      expect(result.url).toContain('expires=')
      expect(result.expiresAt).toBeInstanceOf(Date)
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should respect custom expiresIn', async () => {
      const before = Date.now()
      const result = await adapter.getSignedUrl({
        key: 'file.txt',
        expiresIn: 60,
      })

      const expectedExpiry = before + 60 * 1000
      // Allow 1 second of tolerance
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000)
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000)
    })

    it('should return key directly when no baseUrl configured', async () => {
      const noBaseAdapter = createLocalAdapter({ directory: '/tmp/test' })
      const result = await noBaseAdapter.getSignedUrl({ key: 'file.txt' })
      expect(result.url).toBe('file.txt')
    })
  })

  describe('delete', () => {
    it('should call fs.unlink with the correct path', async () => {
      const { promises: fs } = await import('fs')
      await adapter.delete('uploads/file.txt')
      expect(fs.unlink).toHaveBeenCalledWith('/tmp/test-uploads/uploads/file.txt')
    })

    it('should not throw when file does not exist', async () => {
      const { promises: fs } = await import('fs')
      const unlinkMock = fs.unlink as ReturnType<typeof vi.fn>
      unlinkMock.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))

      await expect(adapter.delete('nonexistent.txt')).resolves.toBeUndefined()
    })

    it('should rethrow non-ENOENT errors', async () => {
      const { promises: fs } = await import('fs')
      const unlinkMock = fs.unlink as ReturnType<typeof vi.fn>
      unlinkMock.mockRejectedValueOnce(Object.assign(new Error('EACCES'), { code: 'EACCES' }))

      await expect(adapter.delete('protected.txt')).rejects.toThrow('EACCES')
    })
  })

  describe('exists', () => {
    it('should return true when file exists', async () => {
      const result = await adapter.exists('file.txt')
      expect(result).toBe(true)
    })

    it('should return false when file does not exist', async () => {
      const { promises: fs } = await import('fs')
      const accessMock = fs.access as ReturnType<typeof vi.fn>
      accessMock.mockRejectedValueOnce(new Error('ENOENT'))

      const result = await adapter.exists('missing.txt')
      expect(result).toBe(false)
    })
  })
})

// ============================================================================
// S3 ADAPTER ERROR CASES
// ============================================================================

describe('S3 Adapter Error Cases', () => {
  it('should reject upload of files that fail validation', async () => {
    const adapter = createS3Adapter({
      bucket: 'test-bucket',
      region: 'us-east-1',
    })

    const file = new Blob(['data'], { type: 'text/plain' })

    await expect(
      adapter.upload({
        file,
        filename: '../etc/passwd',
        contentType: 'text/plain',
      })
    ).rejects.toThrow('Invalid filename')
  })

  it('should reject upload of dangerous file types', async () => {
    const adapter = createS3Adapter({
      bucket: 'test-bucket',
      region: 'us-east-1',
    })

    const file = new Blob(['data'], { type: 'application/x-executable' })

    await expect(
      adapter.upload({
        file,
        filename: 'malware',
        contentType: 'application/x-executable',
      })
    ).rejects.toThrow('blocked')
  })

  it('should reject upload exceeding max size', async () => {
    const adapter = createS3Adapter({
      bucket: 'test-bucket',
      region: 'us-east-1',
    })

    const file = new Blob(['x'.repeat(100)], { type: 'text/plain' })

    await expect(
      adapter.upload({
        file,
        filename: 'big.txt',
        contentType: 'text/plain',
        maxSize: 10,
      })
    ).rejects.toThrow('exceeds maximum')
  })
})

// ============================================================================
// FILE VALIDATION
// ============================================================================

describe('validateFile', () => {
  it('should pass valid file', () => {
    const result = validateFile({
      size: 1024,
      contentType: 'text/plain',
      filename: 'test.txt',
    })
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should reject file exceeding max size', () => {
    const result = validateFile(
      { size: 20 * 1024 * 1024, contentType: 'text/plain', filename: 'big.txt' },
      { maxSize: 10 * 1024 * 1024 }
    )
    expect(result.valid).toBe(false)
    expect(result.error).toContain('exceeds maximum')
  })

  it('should use default max size of 10MB', () => {
    const result = validateFile({
      size: 11 * 1024 * 1024,
      contentType: 'text/plain',
      filename: 'big.txt',
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('exceeds maximum')
  })

  it('should allow file within default max size', () => {
    const result = validateFile({
      size: 9 * 1024 * 1024,
      contentType: 'text/plain',
      filename: 'ok.txt',
    })
    expect(result.valid).toBe(true)
  })

  it('should reject disallowed content types', () => {
    const result = validateFile(
      { size: 100, contentType: 'application/pdf', filename: 'doc.pdf' },
      { allowedTypes: ['image/*', 'text/plain'] }
    )
    expect(result.valid).toBe(false)
    expect(result.error).toContain('not allowed')
  })

  it('should allow content type matching wildcard', () => {
    const result = validateFile(
      { size: 100, contentType: 'image/png', filename: 'photo.png' },
      { allowedTypes: ['image/*'] }
    )
    expect(result.valid).toBe(true)
  })

  it('should allow exact content type match', () => {
    const result = validateFile(
      { size: 100, contentType: 'text/plain', filename: 'note.txt' },
      { allowedTypes: ['text/plain'] }
    )
    expect(result.valid).toBe(true)
  })

  it('should block dangerous file types', () => {
    const result = validateFile({
      size: 100,
      contentType: 'application/x-executable',
      filename: 'malware',
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('blocked')
  })

  it('should block custom blocked types', () => {
    const result = validateFile(
      { size: 100, contentType: 'application/zip', filename: 'archive.zip' },
      { blockedTypes: ['application/zip'] }
    )
    expect(result.valid).toBe(false)
    expect(result.error).toContain('blocked')
  })

  it('should reject filenames with path traversal', () => {
    expect(
      validateFile({ size: 100, contentType: 'text/plain', filename: '../etc/passwd' }).valid
    ).toBe(false)

    expect(
      validateFile({ size: 100, contentType: 'text/plain', filename: 'path/file.txt' }).valid
    ).toBe(false)

    expect(
      validateFile({ size: 100, contentType: 'text/plain', filename: 'path\\file.txt' }).valid
    ).toBe(false)
  })

  it('should return "Invalid filename" error for path traversal', () => {
    const result = validateFile({
      size: 100,
      contentType: 'text/plain',
      filename: '../secret.txt',
    })
    expect(result.error).toBe('Invalid filename')
  })
})

// ============================================================================
// STORAGE KEY GENERATION
// ============================================================================

describe('generateStorageKey', () => {
  it('should generate a key with timestamp', () => {
    const key = generateStorageKey('photo.jpg')
    expect(key).toMatch(/^photo_\d+\.jpg$/)
  })

  it('should sanitize special characters', () => {
    const key = generateStorageKey('my file (1).txt')
    // Spaces and parens become underscores, timestamp is appended
    expect(key).toMatch(/^my_file_1__\d+\.txt$/)
  })

  it('should collapse multiple underscores', () => {
    const key = generateStorageKey('a___b.txt')
    expect(key).toMatch(/^a_b_\d+\.txt$/)
  })

  it('should prepend path when provided', () => {
    const key = generateStorageKey('test.txt', 'uploads/images')
    expect(key).toMatch(/^uploads\/images\/test_\d+\.txt$/)
  })

  it('should strip leading and trailing slashes from path', () => {
    const key = generateStorageKey('test.txt', '/uploads/')
    expect(key).toMatch(/^uploads\/test_\d+\.txt$/)
  })

  it('should handle filenames without extension', () => {
    const key = generateStorageKey('README')
    expect(key).toMatch(/^README_\d+$/)
  })
})
