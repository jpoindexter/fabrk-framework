 
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
    // realpath resolves symlinks; return the path unchanged in tests (no symlinks)
    realpath: vi.fn().mockImplementation((p: string) => Promise.resolve(p)),
  },
}))

describe('adapter configuration', () => {
  it('local adapter: name, version, isConfigured', () => {
    const adapter = createLocalAdapter({ directory: '/tmp/test-uploads' })
    expect(adapter.name).toBe('local')
    expect(adapter.version).toBe('1.0.0')
    expect(adapter.isConfigured()).toBe(true)
    expect(createLocalAdapter({ directory: '' }).isConfigured()).toBe(false)
  })

  it('s3 adapter: name, version, isConfigured', () => {
    const adapter = createS3Adapter({ bucket: 'test-bucket', region: 'us-east-1' })
    expect(adapter.name).toBe('s3')
    expect(adapter.isConfigured()).toBe(true)
    expect(createS3Adapter({ bucket: '', region: 'us-east-1' }).isConfigured()).toBe(false)
    expect(createS3Adapter({ bucket: 'test', region: '' }).isConfigured()).toBe(false)
  })

  it('r2 adapter: name, version, isConfigured', () => {
    const adapter = createR2Adapter({
      bucket: 'test-bucket', accountId: 'test-account-id',
      accessKeyId: 'test-key', secretAccessKey: 'test-secret',
    })
    expect(adapter.name).toBe('r2')
    expect(adapter.isConfigured()).toBe(true)
  })
})

describe('Local Adapter', () => {
  let adapter: StorageAdapter

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = createLocalAdapter({ directory: '/tmp/test-uploads', baseUrl: '/api/files' })
  })

  it('should create the storage directory on initialize', async () => {
    const { promises: fs } = await import('fs')
    await adapter.initialize!()
    expect(fs.mkdir).toHaveBeenCalledWith('/tmp/test-uploads', { recursive: true })
  })

  it('should upload files with path and generate key without path', async () => {
    const { promises: fs } = await import('fs')
    const file = new Blob(['hello world'], { type: 'text/plain' })

    const result = await adapter.upload({ file, filename: 'test.txt', contentType: 'text/plain', path: 'documents' })
    expect(result.key).toBe('documents/test.txt')
    expect(result.url).toContain('/api/files/documents/test.txt')
    expect(result.size).toBe(11)
    expect(fs.writeFile).toHaveBeenCalled()

    const autoKey = await adapter.upload({ file, filename: 'test.txt', contentType: 'text/plain' })
    expect(autoKey.key).toContain('test_')
    expect(autoKey.key).toContain('.txt')
  })

  it('should reject files exceeding max size', async () => {
    const smallAdapter = createLocalAdapter({ directory: '/tmp/test', maxFileSize: 5 })
    const file = new Blob(['too large file content'], { type: 'text/plain' })

    await expect(smallAdapter.upload({ file, filename: 'big.txt', contentType: 'text/plain' })).rejects.toThrow(/exceeds maximum/)
  })

  it('should handle ArrayBuffer input', async () => {
    const buffer = new TextEncoder().encode('hello').buffer as ArrayBuffer
    const result = await adapter.upload({ file: buffer, filename: 'data.bin', contentType: 'application/octet-stream', path: 'bin' })
    expect(result.key).toBe('bin/data.bin')
    expect(result.size).toBe(5)
  })

  it('should return signed URL with expiry', async () => {
    const result = await adapter.getSignedUrl({ key: 'docs/file.pdf' })
    expect(result.url).toContain('/api/files/docs/file.pdf')
    expect(result.url).toContain('expires=')
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('should delete files and handle ENOENT gracefully', async () => {
    const { promises: fs } = await import('fs')
    await adapter.delete('uploads/file.txt')
    expect(fs.unlink).toHaveBeenCalledWith('/tmp/test-uploads/uploads/file.txt')

    const unlinkMock = fs.unlink as ReturnType<typeof vi.fn>
    unlinkMock.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    await expect(adapter.delete('nonexistent.txt')).resolves.toBeUndefined()

    unlinkMock.mockRejectedValueOnce(Object.assign(new Error('EACCES'), { code: 'EACCES' }))
    await expect(adapter.delete('protected.txt')).rejects.toThrow('EACCES')
  })

  it('should check file existence', async () => {
    expect(await adapter.exists('file.txt')).toBe(true)

    const { promises: fs } = await import('fs')
    const accessMock = fs.access as ReturnType<typeof vi.fn>
    accessMock.mockRejectedValueOnce(new Error('ENOENT'))
    expect(await adapter.exists('missing.txt')).toBe(false)
  })
})

describe('validateFile', () => {
  it('should pass valid files and reject oversized files', () => {
    expect(validateFile({ size: 1024, contentType: 'text/plain', filename: 'test.txt' }).valid).toBe(true)
    expect(validateFile({ size: 20 * 1024 * 1024, contentType: 'text/plain', filename: 'big.txt' }, { maxSize: 10 * 1024 * 1024 }).valid).toBe(false)
    expect(validateFile({ size: 11 * 1024 * 1024, contentType: 'text/plain', filename: 'big.txt' }).valid).toBe(false) // default 10MB
  })

  it('should enforce allowed and blocked content types', () => {
    expect(validateFile({ size: 100, contentType: 'application/pdf', filename: 'doc.pdf' }, { allowedTypes: ['image/*', 'text/plain'] }).valid).toBe(false)
    expect(validateFile({ size: 100, contentType: 'image/png', filename: 'photo.png' }, { allowedTypes: ['image/*'] }).valid).toBe(true)
    expect(validateFile({ size: 100, contentType: 'text/plain', filename: 'note.txt' }, { allowedTypes: ['text/plain'] }).valid).toBe(true)
    expect(validateFile({ size: 100, contentType: 'application/x-executable', filename: 'malware' }).valid).toBe(false)
    expect(validateFile({ size: 100, contentType: 'application/zip', filename: 'archive.zip' }, { blockedTypes: ['application/zip'] }).valid).toBe(false)
  })

  it('should reject filenames with path traversal', () => {
    expect(validateFile({ size: 100, contentType: 'text/plain', filename: '../etc/passwd' }).valid).toBe(false)
    expect(validateFile({ size: 100, contentType: 'text/plain', filename: 'path/file.txt' }).valid).toBe(false)
    expect(validateFile({ size: 100, contentType: 'text/plain', filename: 'path\\file.txt' }).valid).toBe(false)
    expect(validateFile({ size: 100, contentType: 'text/plain', filename: '../secret.txt' }).error).toBe('Invalid filename')
  })
})

describe('generateStorageKey', () => {
  it('should generate key with timestamp, nonce, and sanitize special chars', () => {
    expect(generateStorageKey('photo.jpg')).toMatch(/^photo_\d+_[a-f0-9]+\.jpg$/)
    expect(generateStorageKey('my file (1).txt')).toMatch(/^my_file_1__\d+_[a-f0-9]+\.txt$/)
    expect(generateStorageKey('a___b.txt')).toMatch(/^a_b_\d+_[a-f0-9]+\.txt$/)
  })

  it('should prepend path, strip slashes, and handle extensionless files', () => {
    expect(generateStorageKey('test.txt', 'uploads/images')).toMatch(/^uploads\/images\/test_\d+_[a-f0-9]+\.txt$/)
    expect(generateStorageKey('test.txt', '/uploads/')).toMatch(/^uploads\/test_\d+_[a-f0-9]+\.txt$/)
    expect(generateStorageKey('README')).toMatch(/^README_\d+_[a-f0-9]+$/)
  })
})
