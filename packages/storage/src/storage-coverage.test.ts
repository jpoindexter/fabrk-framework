import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { validateFile, validateMagicBytes, generateStorageKey, sanitizePath } from './validation'
import { sanitizeFilename } from './validation'
import { createR2Adapter } from './r2/adapter'
import { createLocalAdapter } from './local/adapter'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fabrk-storage-test-'))
}

function removeTmpDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// validateFile — focused unit tests not already covered by index.test.ts
// ---------------------------------------------------------------------------

describe('validateFile – size boundary', () => {
  it('passes at exactly the default max (10 MB)', () => {
    const tenMB = 10 * 1024 * 1024
    expect(
      validateFile({ size: tenMB, contentType: 'application/pdf', filename: 'a.pdf' }).valid
    ).toBe(true)
  })

  it('fails at one byte over the default max', () => {
    const over = 10 * 1024 * 1024 + 1
    const result = validateFile({ size: over, contentType: 'application/pdf', filename: 'a.pdf' })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/exceeds maximum/)
  })

  it('respects a custom maxSize of 1 byte', () => {
    const result = validateFile(
      { size: 2, contentType: 'text/plain', filename: 'tiny.txt' },
      { maxSize: 1 }
    )
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/exceeds maximum/)
  })

  it('formats byte values in the error message', () => {
    const result = validateFile(
      { size: 512, contentType: 'text/plain', filename: 'a.txt' },
      { maxSize: 100 }
    )
    expect(result.error).toMatch(/512 B/)
    expect(result.error).toMatch(/100 B/)
  })

  it('formats KB values in the error message', () => {
    const result = validateFile(
      { size: 2048, contentType: 'text/plain', filename: 'a.txt' },
      { maxSize: 1024 }
    )
    expect(result.error).toMatch(/KB/)
  })

  it('formats MB values in the error message', () => {
    const result = validateFile(
      { size: 20 * 1024 * 1024, contentType: 'text/plain', filename: 'a.txt' },
      { maxSize: 10 * 1024 * 1024 }
    )
    expect(result.error).toMatch(/MB/)
  })
})

describe('validateFile – allowed types', () => {
  it('wildcard subtype match works for image/*', () => {
    expect(
      validateFile(
        { size: 100, contentType: 'image/jpeg', filename: 'photo.jpg' },
        { allowedTypes: ['image/*'] }
      ).valid
    ).toBe(true)
  })

  it('wildcard does not match different top-level type', () => {
    expect(
      validateFile(
        { size: 100, contentType: 'application/pdf', filename: 'doc.pdf' },
        { allowedTypes: ['image/*'] }
      ).valid
    ).toBe(false)
  })

  it('exact match passes when listed', () => {
    expect(
      validateFile(
        { size: 100, contentType: 'application/pdf', filename: 'doc.pdf' },
        { allowedTypes: ['application/pdf'] }
      ).valid
    ).toBe(true)
  })

  it('multiple allowed types — passes when one matches', () => {
    expect(
      validateFile(
        { size: 100, contentType: 'application/zip', filename: 'archive.zip' },
        { allowedTypes: ['image/png', 'application/zip'] }
      ).valid
    ).toBe(true)
  })

  it('error message lists allowed types', () => {
    const result = validateFile(
      { size: 100, contentType: 'video/mp4', filename: 'vid.mp4' },
      { allowedTypes: ['image/png', 'image/jpeg'] }
    )
    expect(result.error).toMatch(/image\/png/)
    expect(result.error).toMatch(/image\/jpeg/)
  })
})

describe('validateFile – blocked types (dangerous defaults)', () => {
  const DANGEROUS = [
    'application/x-executable',
    'application/x-msdownload',
    'application/x-msdos-program',
    'text/html',
    'application/xhtml+xml',
    'image/svg+xml',
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

  for (const mime of DANGEROUS) {
    it(`blocks dangerous type: ${mime}`, () => {
      const result = validateFile(
        { size: 100, contentType: mime, filename: 'file' },
      )
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/blocked/)
    })
  }

  it('custom blockedTypes are added on top of defaults', () => {
    const result = validateFile(
      { size: 100, contentType: 'video/mp4', filename: 'vid.mp4' },
      { blockedTypes: ['video/mp4'] }
    )
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/blocked/)
  })
})

describe('validateFile – filename validation', () => {
  it('rejects filenames with ..',  () => {
    expect(
      validateFile({ size: 10, contentType: 'text/plain', filename: '../escape.txt' }).valid
    ).toBe(false)
  })

  it('rejects filenames with forward slash', () => {
    expect(
      validateFile({ size: 10, contentType: 'text/plain', filename: 'subdir/file.txt' }).valid
    ).toBe(false)
  })

  it('rejects filenames with backslash', () => {
    expect(
      validateFile({ size: 10, contentType: 'text/plain', filename: 'sub\\file.txt' }).valid
    ).toBe(false)
  })

  it('accepts a plain valid filename', () => {
    expect(
      validateFile({ size: 10, contentType: 'text/plain', filename: 'my-file_v2.txt' }).valid
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// validateMagicBytes
// ---------------------------------------------------------------------------

describe('validateMagicBytes', () => {
  it('passes for unknown MIME type (no entry in table)', () => {
    const data = new Uint8Array([0x00, 0x01, 0x02, 0x03])
    expect(validateMagicBytes(data, 'application/octet-stream')).toBe(true)
  })

  it('passes for correct PNG magic bytes', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00])
    expect(validateMagicBytes(png, 'image/png')).toBe(true)
  })

  it('rejects wrong bytes for PNG', () => {
    const notPng = new Uint8Array([0xff, 0xd8, 0xff, 0x00])
    expect(validateMagicBytes(notPng, 'image/png')).toBe(false)
  })

  it('passes for correct JPEG magic bytes', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
    expect(validateMagicBytes(jpeg, 'image/jpeg')).toBe(true)
  })

  it('rejects wrong bytes for JPEG', () => {
    const bad = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    expect(validateMagicBytes(bad, 'image/jpeg')).toBe(false)
  })

  it('passes for correct GIF magic bytes', () => {
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
    expect(validateMagicBytes(gif, 'image/gif')).toBe(true)
  })

  it('passes for correct WebP (RIFF prefix)', () => {
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00])
    expect(validateMagicBytes(webp, 'image/webp')).toBe(true)
  })

  it('passes for correct PDF magic bytes (%PDF)', () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])
    expect(validateMagicBytes(pdf, 'application/pdf')).toBe(true)
  })

  it('passes for correct ZIP magic bytes', () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00])
    expect(validateMagicBytes(zip, 'application/zip')).toBe(true)
  })

  it('returns false when data is shorter than expected magic bytes', () => {
    const tooShort = new Uint8Array([0x89, 0x50]) // PNG needs 4 bytes
    expect(validateMagicBytes(tooShort, 'image/png')).toBe(false)
  })

  it('accepts a Node.js Buffer as input', () => {
    const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00])
    expect(validateMagicBytes(pngBuf, 'image/png')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// sanitizePath
// ---------------------------------------------------------------------------

describe('sanitizePath', () => {
  it('passes a clean relative path', () => {
    expect(sanitizePath('uploads/user123/photo.jpg')).toBe('uploads/user123/photo.jpg')
  })

  it('strips a leading slash', () => {
    expect(sanitizePath('/uploads/file.txt')).toBe('uploads/file.txt')
  })

  it('strips multiple leading slashes', () => {
    expect(sanitizePath('///uploads/file.txt')).toBe('uploads/file.txt')
  })

  it('resolves mid-path dots without traversal', () => {
    expect(sanitizePath('uploads/./images/photo.jpg')).toBe('uploads/images/photo.jpg')
  })

  it('throws on path traversal with ../', () => {
    expect(() => sanitizePath('../etc/passwd')).toThrow(/traversal|Invalid/)
  })

  it('throws on path traversal embedded in the middle', () => {
    expect(() => sanitizePath('uploads/../../etc/passwd')).toThrow(/traversal|Invalid/)
  })

  it('throws on a bare .. component', () => {
    expect(() => sanitizePath('..')).toThrow(/traversal|Invalid/)
  })

  it('throws on Windows-style traversal (backslashes)', () => {
    expect(() => sanitizePath('..\\etc\\passwd')).toThrow(/traversal|Invalid/)
  })

  it('throws on null byte in path', () => {
    expect(() => sanitizePath('uploads/file\x00.txt')).toThrow(/Null byte/)
  })

  it('throws on empty string', () => {
    expect(() => sanitizePath('')).toThrow(/Invalid/)
  })

  it('throws on a single dot (empty after normalize)', () => {
    expect(() => sanitizePath('.')).toThrow(/Invalid/)
  })

  it('preserves trailing slash (posix.normalize behaviour)', () => {
    // posix.normalize('uploads/images/') === 'uploads/images/' — trailing slash is kept
    const result = sanitizePath('uploads/images/')
    expect(result).toBe('uploads/images/')
  })
})

// ---------------------------------------------------------------------------
// sanitizeFilename
// ---------------------------------------------------------------------------

describe('sanitizeFilename', () => {
  it('replaces special chars with underscore and collapses runs', () => {
    // 'my file (1).txt' → 'my_file_(1).txt' → 'my_file__1_.txt' → collapsed → 'my_file_1_.txt'
    // space→_, (→_, )→_; consecutive _ are collapsed: __1_ stays as _1_ after collapse
    expect(sanitizeFilename('my file (1).txt')).toBe('my_file_1_.txt')
  })

  it('collapses consecutive underscores', () => {
    expect(sanitizeFilename('a___b.txt')).toBe('a_b.txt')
  })

  it('preserves alphanumeric, dots, hyphens', () => {
    expect(sanitizeFilename('report-2024.v2.pdf')).toBe('report-2024.v2.pdf')
  })

  it('sanitizes a filename with path separator chars', () => {
    const result = sanitizeFilename('../etc/passwd')
    // sanitizeFilename only replaces chars outside [a-zA-Z0-9._-], so '/' becomes '_'
    // but '.' is allowed — dots remain. validateFile is the guard against '..' filenames.
    expect(result).not.toContain('/')
    // Dots are preserved by sanitizeFilename — the '..' traversal guard lives in validateFile
    expect(result).toContain('..')
    // The path separator is gone
    expect(result).toContain('_etc_passwd')
  })
})

// ---------------------------------------------------------------------------
// generateStorageKey — supplemental to index.test.ts
// ---------------------------------------------------------------------------

describe('generateStorageKey – supplemental', () => {
  it('produces unique keys on successive calls', () => {
    const k1 = generateStorageKey('photo.jpg')
    const k2 = generateStorageKey('photo.jpg')
    expect(k1).not.toBe(k2)
  })

  it('key format: <name>_<ts>_<hex>.<ext>', () => {
    const key = generateStorageKey('document.pdf')
    expect(key).toMatch(/^document_\d+_[a-f0-9]{12}\.pdf$/)
  })

  it('handles filenames with multiple dots — only last segment is the extension', () => {
    const key = generateStorageKey('archive.tar.gz')
    // Extension is .gz; name is everything before the last dot: 'archive.tar'
    expect(key).toMatch(/\.gz$/)
    // name part preserves 'archive.tar' (dots are allowed in the sanitize step)
    expect(key).toContain('archive.tar')
  })

  it('handles a filename with no extension', () => {
    const key = generateStorageKey('Makefile')
    expect(key).toMatch(/^Makefile_\d+_[a-f0-9]+$/)
    expect(key).not.toContain('.')
  })

  it('strips leading and trailing slashes from path', () => {
    const key = generateStorageKey('file.txt', '/uploads/')
    expect(key.startsWith('uploads/')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Local adapter — real filesystem (tmp dir)
// ---------------------------------------------------------------------------

describe('Local adapter – real filesystem', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = makeTmpDir()
  })

  afterEach(() => {
    removeTmpDir(tmpDir)
  })

  it('initialize creates the directory', async () => {
    const dir = path.join(tmpDir, 'new-subdir')
    const adapter = createLocalAdapter({ directory: dir })
    await adapter.initialize!()
    expect(fs.existsSync(dir)).toBe(true)
  })

  it('isConfigured returns true with a directory, false when empty', () => {
    expect(createLocalAdapter({ directory: tmpDir }).isConfigured()).toBe(true)
    expect(createLocalAdapter({ directory: '' }).isConfigured()).toBe(false)
  })

  it('uploads a Blob and reads back the correct bytes', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir })
    const content = 'hello fabrk'
    const file = new Blob([content], { type: 'text/plain' })
    const result = await adapter.upload({ file, filename: 'hello.txt', contentType: 'text/plain', path: 'docs' })

    expect(result.key).toBe('docs/hello.txt')
    expect(result.size).toBe(content.length)
    const written = fs.readFileSync(path.join(tmpDir, 'docs', 'hello.txt'), 'utf8')
    expect(written).toBe(content)
  })

  it('uploads an ArrayBuffer', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir })
    const encoder = new TextEncoder()
    const buf = encoder.encode('buffer data').buffer as ArrayBuffer
    const result = await adapter.upload({
      file: buf,
      filename: 'data.bin',
      contentType: 'application/octet-stream',
      path: 'bin',
    })
    expect(result.size).toBe(11)
    expect(result.key).toBe('bin/data.bin')
  })

  it('uploads via ReadableStream', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir })
    const bytes = new TextEncoder().encode('streamed content')
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes)
        controller.close()
      },
    })
    const result = await adapter.upload({
      file: stream,
      filename: 'streamed.txt',
      contentType: 'text/plain',
      path: 'stream',
    })
    expect(result.size).toBe(bytes.length)
  })

  it('auto-generates a timestamped key when no path is given', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir })
    const file = new Blob(['x'], { type: 'text/plain' })
    const result = await adapter.upload({ file, filename: 'auto.txt', contentType: 'text/plain' })
    expect(result.key).toMatch(/^auto_\d+_[a-f0-9]+\.txt$/)
  })

  it('appends baseUrl to the upload result url', async () => {
    const adapter = createLocalAdapter({
      directory: tmpDir,
      baseUrl: 'https://cdn.example.com',
    })
    const file = new Blob(['data'], { type: 'text/plain' })
    const result = await adapter.upload({ file, filename: 'img.txt', contentType: 'text/plain', path: 'p' })
    expect(result.url).toBe('https://cdn.example.com/p/img.txt')
  })

  it('url is undefined when no baseUrl configured', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir })
    const file = new Blob(['data'], { type: 'text/plain' })
    const result = await adapter.upload({ file, filename: 'no-url.txt', contentType: 'text/plain' })
    expect(result.url).toBeUndefined()
  })

  it('rejects files over the maxFileSize config limit', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir, maxFileSize: 4 })
    const file = new Blob(['12345'], { type: 'text/plain' })
    await expect(
      adapter.upload({ file, filename: 'big.txt', contentType: 'text/plain' })
    ).rejects.toThrow(/exceeds maximum/)
  })

  it('respects per-call maxSize override', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir })
    const file = new Blob(['12345'], { type: 'text/plain' })
    await expect(
      adapter.upload({ file, filename: 'big.txt', contentType: 'text/plain', maxSize: 3 })
    ).rejects.toThrow(/exceeds maximum/)
  })

  it('rejects a stream that exceeds maxSize mid-stream', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir, maxFileSize: 3 })
    const chunk = new Uint8Array([1, 2, 3, 4, 5])
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(chunk)
        controller.close()
      },
    })
    await expect(
      adapter.upload({ file: stream, filename: 'stream.bin', contentType: 'application/octet-stream' })
    ).rejects.toThrow(/exceeds maximum/)
  })

  it('rejects disallowed content types', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir })
    const file = new Blob(['<html></html>'], { type: 'text/html' })
    await expect(
      adapter.upload({ file, filename: 'index.html', contentType: 'text/html' })
    ).rejects.toThrow()
  })

  it('rejects when file content does not match declared content type', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir })
    // Not a real PNG — just garbage bytes
    const fakePng = new Blob([new Uint8Array([0x00, 0x01, 0x02, 0x03])], { type: 'image/png' })
    await expect(
      adapter.upload({ file: fakePng, filename: 'fake.png', contentType: 'image/png' })
    ).rejects.toThrow(/does not match declared type/)
  })

  it('accepts a real PNG with correct magic bytes', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir })
    // Minimal valid PNG header (89 50 4E 47 0D 0A 1A 0A)
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const file = new Blob([pngHeader], { type: 'image/png' })
    const result = await adapter.upload({
      file,
      filename: 'real.png',
      contentType: 'image/png',
      path: 'images',
    })
    expect(result.key).toBe('images/real.png')
  })

  it('exists returns true for an uploaded file', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir })
    const file = new Blob(['exists-check'], { type: 'text/plain' })
    const { key } = await adapter.upload({ file, filename: 'present.txt', contentType: 'text/plain', path: 'e' })
    expect(await adapter.exists!(key)).toBe(true)
  })

  it('exists returns false for a missing file', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir })
    expect(await adapter.exists!('nonexistent/file.txt')).toBe(false)
  })

  it('delete removes the file', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir })
    const file = new Blob(['bye'], { type: 'text/plain' })
    const { key } = await adapter.upload({ file, filename: 'del.txt', contentType: 'text/plain', path: 'del' })
    await adapter.delete!(key)
    expect(fs.existsSync(path.join(tmpDir, key))).toBe(false)
  })

  it('delete is idempotent — does not throw for a missing file', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir })
    await expect(adapter.delete!('does/not/exist.txt')).resolves.toBeUndefined()
  })

  it('getSignedUrl with baseUrl includes expires and sig params', async () => {
    const adapter = createLocalAdapter({
      directory: tmpDir,
      baseUrl: 'https://cdn.example.com',
      signingSecret: 'test-secret-stable',
    })
    const result = await adapter.getSignedUrl!({ key: 'uploads/file.pdf' })
    expect(result.url).toContain('uploads/file.pdf')
    expect(result.url).toContain('expires=')
    expect(result.url).toContain('sig=')
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('getSignedUrl respects custom expiresIn', async () => {
    const adapter = createLocalAdapter({
      directory: tmpDir,
      baseUrl: 'https://cdn.example.com',
      signingSecret: 'test-secret',
    })
    const before = Date.now()
    const result = await adapter.getSignedUrl!({ key: 'uploads/x.pdf', expiresIn: 7200 })
    const expiresAt = result.expiresAt.getTime()
    expect(expiresAt).toBeGreaterThanOrEqual(before + 7200 * 1000 - 100)
    expect(expiresAt).toBeLessThanOrEqual(before + 7200 * 1000 + 2000)
  })

  it('getSignedUrl without baseUrl returns the sanitized key as url', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir })
    const result = await adapter.getSignedUrl!({ key: 'uploads/file.txt' })
    expect(result.url).toBe('uploads/file.txt')
  })

  it('stable signingSecret produces deterministic signatures', async () => {
    const cfg = { directory: tmpDir, baseUrl: 'https://cdn.example.com', signingSecret: 'stable-secret' }
    const a1 = createLocalAdapter(cfg)
    const a2 = createLocalAdapter(cfg)

    // Freeze time so expires is the same
    const now = 1700000000000
    vi.setSystemTime(now)
    const r1 = await a1.getSignedUrl!({ key: 'file.txt', expiresIn: 3600 })
    const r2 = await a2.getSignedUrl!({ key: 'file.txt', expiresIn: 3600 })
    vi.useRealTimers()

    const sig1 = new URL(r1.url).searchParams.get('sig')
    const sig2 = new URL(r2.url).searchParams.get('sig')
    expect(sig1).toBe(sig2)
  })

  it('upload rejects path traversal in the path option', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir })
    const file = new Blob(['x'], { type: 'text/plain' })
    await expect(
      adapter.upload({ file, filename: 'file.txt', contentType: 'text/plain', path: '../../escape' })
    ).rejects.toThrow(/traversal|Invalid/)
  })

  it('upload rejects path traversal in filename via validateFile', async () => {
    const adapter = createLocalAdapter({ directory: tmpDir })
    const file = new Blob(['x'], { type: 'text/plain' })
    await expect(
      adapter.upload({ file, filename: '../etc/passwd', contentType: 'text/plain' })
    ).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// S3 adapter — mock AWS SDK
// ---------------------------------------------------------------------------

// Shared mock state accessible from tests
const mockS3Send = vi.fn()
const mockGetSignedUrl = vi.fn()

vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    send = mockS3Send
  }
  class PutObjectCommand {
    constructor(public input: unknown) {}
  }
  class GetObjectCommand {
    constructor(public input: unknown) {}
  }
  class DeleteObjectCommand {
    constructor(public input: unknown) {}
  }
  class HeadObjectCommand {
    constructor(public input: unknown) {}
  }
  return { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand }
})

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}))

describe('S3 adapter', () => {
  // Import the adapter fresh per suite so module mocks take effect
  let createS3Adapter: typeof import('./s3/adapter').createS3Adapter

  beforeEach(async () => {
    vi.clearAllMocks()
    mockS3Send.mockResolvedValue({})
    // Re-import after clearing to get a fresh closure (client is lazy-initialized)
    const mod = await import('./s3/adapter')
    createS3Adapter = mod.createS3Adapter
  })

  it('isConfigured returns true when bucket and region are set', () => {
    const adapter = createS3Adapter({ bucket: 'my-bucket', region: 'us-east-1' })
    expect(adapter.isConfigured()).toBe(true)
  })

  it('isConfigured returns false when bucket is empty', () => {
    expect(createS3Adapter({ bucket: '', region: 'us-east-1' }).isConfigured()).toBe(false)
  })

  it('isConfigured returns false when region is empty', () => {
    expect(createS3Adapter({ bucket: 'b', region: '' }).isConfigured()).toBe(false)
  })

  it('name and version are correct', () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    expect(adapter.name).toBe('s3')
    expect(adapter.version).toBe('1.0.0')
  })

  it('upload calls PutObjectCommand with correct bucket and key', async () => {
    const adapter = createS3Adapter({ bucket: 'test-bucket', region: 'us-east-1' })
    const file = new Blob(['hello'], { type: 'text/plain' })
    const result = await adapter.upload({ file, filename: 'note.txt', contentType: 'text/plain', path: 'docs' })

    expect(result.key).toBe('docs/note.txt')
    expect(result.size).toBe(5)
    expect(result.contentType).toBe('text/plain')
    expect(mockS3Send).toHaveBeenCalledOnce()

    const sentArg = mockS3Send.mock.calls[0][0]
    expect(sentArg.input.Bucket).toBe('test-bucket')
    expect(sentArg.input.Key).toBe('docs/note.txt')
    expect(sentArg.input.ContentType).toBe('text/plain')
  })

  it('upload without path generates a timestamped key', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    const file = new Blob(['x'], { type: 'text/plain' })
    const result = await adapter.upload({ file, filename: 'auto.txt', contentType: 'text/plain' })
    expect(result.key).toMatch(/^auto_\d+_[a-f0-9]+\.txt$/)
  })

  it('upload with public flag sets ACL and returns public url', async () => {
    const adapter = createS3Adapter({ bucket: 'pub-bucket', region: 'eu-west-1' })
    const file = new Blob(['img'], { type: 'text/plain' })
    const result = await adapter.upload({
      file,
      filename: 'pub.txt',
      contentType: 'text/plain',
      path: 'pub',
      public: true,
    })
    expect(result.url).toBe('https://pub-bucket.s3.eu-west-1.amazonaws.com/pub/pub.txt')
    const sentArg = mockS3Send.mock.calls[0][0]
    expect(sentArg.input.ACL).toBe('public-read')
  })

  it('upload with public flag and custom endpoint builds endpoint-based url', async () => {
    const adapter = createS3Adapter({
      bucket: 'my-bucket',
      region: 'us-east-1',
      endpoint: 'https://minio.example.com',
    })
    const file = new Blob(['x'], { type: 'text/plain' })
    const result = await adapter.upload({
      file,
      filename: 'x.txt',
      contentType: 'text/plain',
      path: 'p',
      public: true,
    })
    expect(result.url).toBe('https://minio.example.com/my-bucket/p/x.txt')
  })

  it('upload via ArrayBuffer', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    const buf = new TextEncoder().encode('bytes').buffer as ArrayBuffer
    const result = await adapter.upload({
      file: buf,
      filename: 'buf.bin',
      contentType: 'application/octet-stream',
      path: 'bin',
    })
    expect(result.size).toBe(5)
    expect(result.key).toBe('bin/buf.bin')
  })

  it('upload via ReadableStream accumulates chunks', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    const chunk1 = new Uint8Array([1, 2, 3])
    const chunk2 = new Uint8Array([4, 5])
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(chunk1)
        controller.enqueue(chunk2)
        controller.close()
      },
    })
    const result = await adapter.upload({
      file: stream,
      filename: 'stream.bin',
      contentType: 'application/octet-stream',
      path: 's',
    })
    expect(result.size).toBe(5)
  })

  it('upload rejects when Blob exceeds maxSize', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    const file = new Blob(['12345'], { type: 'text/plain' })
    await expect(
      adapter.upload({ file, filename: 'big.txt', contentType: 'text/plain', maxSize: 3 })
    ).rejects.toThrow(/exceeds maximum/)
  })

  it('upload rejects when ArrayBuffer exceeds maxSize', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    const buf = new Uint8Array([1, 2, 3, 4, 5]).buffer as ArrayBuffer
    await expect(
      adapter.upload({ file: buf, filename: 'big.bin', contentType: 'application/octet-stream', maxSize: 3 })
    ).rejects.toThrow(/exceeds maximum/)
  })

  it('upload rejects when stream exceeds maxSize', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    const big = new Uint8Array(20)
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(big)
        controller.close()
      },
    })
    await expect(
      adapter.upload({ file: stream, filename: 'big.bin', contentType: 'application/octet-stream', maxSize: 10 })
    ).rejects.toThrow(/exceeds maximum/)
  })

  it('upload rejects dangerous content type', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    const file = new Blob(['<script></script>'], { type: 'application/javascript' })
    await expect(
      adapter.upload({ file, filename: 'evil.js', contentType: 'application/javascript' })
    ).rejects.toThrow()
  })

  it('upload rejects when magic bytes do not match content type', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    const notPng = new Blob([new Uint8Array([0x00, 0x01, 0x02, 0x03])], { type: 'image/png' })
    await expect(
      adapter.upload({ file: notPng, filename: 'fake.png', contentType: 'image/png' })
    ).rejects.toThrow(/does not match declared type/)
  })

  it('delete sends DeleteObjectCommand with correct key', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    await adapter.delete!('uploads/to-delete.txt')

    expect(mockS3Send).toHaveBeenCalledOnce()
    const sent = mockS3Send.mock.calls[0][0]
    expect(sent.input.Bucket).toBe('b')
    expect(sent.input.Key).toBe('uploads/to-delete.txt')
  })

  it('delete sanitizes the key before sending', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    await adapter.delete!('/uploads/file.txt')
    const sent = mockS3Send.mock.calls[0][0]
    expect(sent.input.Key).toBe('uploads/file.txt')
  })

  it('exists returns true when HeadObjectCommand succeeds', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    mockS3Send.mockResolvedValueOnce({ ContentLength: 100 })
    expect(await adapter.exists!('file.txt')).toBe(true)
  })

  it('exists returns false when HeadObjectCommand throws', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    mockS3Send.mockRejectedValueOnce(Object.assign(new Error('Not found'), { $metadata: { httpStatusCode: 404 } }))
    expect(await adapter.exists!('missing.txt')).toBe(false)
  })

  it('getSignedUrl returns url and expiresAt', async () => {
    const adapter = createS3Adapter({
      bucket: 'b',
      region: 'us-east-1',
      defaultExpiresIn: 1800,
    })
    mockGetSignedUrl.mockResolvedValueOnce('https://s3.example.com/signed-url?X-Amz-Signature=abc')

    const result = await adapter.getSignedUrl!({ key: 'docs/file.pdf' })
    expect(result.url).toBe('https://s3.example.com/signed-url?X-Amz-Signature=abc')
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now())
    expect(mockGetSignedUrl).toHaveBeenCalledOnce()
    // expiresIn should use defaultExpiresIn
    const [, , opts] = mockGetSignedUrl.mock.calls[0]
    expect(opts.expiresIn).toBe(1800)
  })

  it('getSignedUrl uses per-call expiresIn over default', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1', defaultExpiresIn: 900 })
    mockGetSignedUrl.mockResolvedValueOnce('https://signed.url')

    await adapter.getSignedUrl!({ key: 'x.pdf', expiresIn: 7200 })
    const [, , opts] = mockGetSignedUrl.mock.calls[0]
    expect(opts.expiresIn).toBe(7200)
  })

  it('getSignedUrl falls back to 3600s when no default provided', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    mockGetSignedUrl.mockResolvedValueOnce('https://signed.url')

    await adapter.getSignedUrl!({ key: 'x.pdf' })
    const [, , opts] = mockGetSignedUrl.mock.calls[0]
    expect(opts.expiresIn).toBe(3600)
  })

  it('getSignedUrl includes contentDisposition when provided', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    mockGetSignedUrl.mockResolvedValueOnce('https://signed.url')

    await adapter.getSignedUrl!({ key: 'file.pdf', contentDisposition: 'attachment; filename="file.pdf"' })

    const [, cmd] = mockGetSignedUrl.mock.calls[0]
    expect(cmd.input.ResponseContentDisposition).toBe('attachment; filename="file.pdf"')
  })

  it('getSignedUrl sanitizes the key', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    mockGetSignedUrl.mockResolvedValueOnce('https://signed.url')

    await adapter.getSignedUrl!({ key: '/uploads/file.pdf' })
    const [, cmd] = mockGetSignedUrl.mock.calls[0]
    expect(cmd.input.Key).toBe('uploads/file.pdf')
  })

  it('upload passes allowedTypes through to validateFile', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    const file = new Blob(['data'], { type: 'application/pdf' })
    await expect(
      adapter.upload({
        file,
        filename: 'doc.pdf',
        contentType: 'application/pdf',
        allowedTypes: ['image/png'],
      })
    ).rejects.toThrow()
  })

  it('upload passes metadata to PutObjectCommand', async () => {
    const adapter = createS3Adapter({ bucket: 'b', region: 'us-east-1' })
    const file = new Blob(['data'], { type: 'text/plain' })
    await adapter.upload({
      file,
      filename: 'tagged.txt',
      contentType: 'text/plain',
      path: 't',
      metadata: { userId: 'u1', org: 'acme' },
    })
    const sent = mockS3Send.mock.calls[0][0]
    expect(sent.input.Metadata).toEqual({ userId: 'u1', org: 'acme' })
  })
})

// ---------------------------------------------------------------------------
// R2 adapter — accountId validation + delegates to S3
// ---------------------------------------------------------------------------

describe('R2 adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockS3Send.mockResolvedValue({})
  })

  const validCfg = {
    bucket: 'my-r2-bucket',
    accountId: 'abc123',
    accessKeyId: 'key',
    secretAccessKey: 'secret',
  }

  it('name and version are set to r2', () => {
    const adapter = createR2Adapter(validCfg)
    expect(adapter.name).toBe('r2')
    expect(adapter.version).toBe('1.0.0')
  })

  it('isConfigured returns true for valid config', () => {
    expect(createR2Adapter(validCfg).isConfigured()).toBe(true)
  })

  it('throws on accountId containing special characters', () => {
    expect(() =>
      createR2Adapter({ ...validCfg, accountId: 'acct/../../inject' })
    ).toThrow(/Invalid R2 account ID/)
  })

  it('throws on accountId containing spaces', () => {
    expect(() =>
      createR2Adapter({ ...validCfg, accountId: 'my account' })
    ).toThrow(/Invalid R2 account ID/)
  })

  it('throws on accountId containing @', () => {
    expect(() =>
      createR2Adapter({ ...validCfg, accountId: 'user@domain.com' })
    ).toThrow(/Invalid R2 account ID/)
  })

  it('allows accountId with hyphens', () => {
    expect(() =>
      createR2Adapter({ ...validCfg, accountId: 'my-account-123' })
    ).not.toThrow()
  })

  it('constructs endpoint from accountId', async () => {
    const adapter = createR2Adapter(validCfg)
    const file = new Blob(['r2 content'], { type: 'text/plain' })
    await adapter.upload({ file, filename: 'r2-file.txt', contentType: 'text/plain', path: 'test' })

    // Verify the underlying S3 client was called (endpoint is set internally to the R2 URL)
    expect(mockS3Send).toHaveBeenCalledOnce()
  })

  it('passes defaultExpiresIn through to underlying S3 adapter', async () => {
    const adapter = createR2Adapter({ ...validCfg, defaultExpiresIn: 600 })
    mockGetSignedUrl.mockResolvedValueOnce('https://r2-signed.url')
    await adapter.getSignedUrl!({ key: 'file.pdf' })
    const [, , opts] = mockGetSignedUrl.mock.calls[0]
    expect(opts.expiresIn).toBe(600)
  })

  it('delete delegates to underlying S3 send', async () => {
    const adapter = createR2Adapter(validCfg)
    await adapter.delete!('uploads/r2-file.txt')
    expect(mockS3Send).toHaveBeenCalledOnce()
    const sent = mockS3Send.mock.calls[0][0]
    expect(sent.input.Key).toBe('uploads/r2-file.txt')
  })

  it('exists returns true when HeadObjectCommand succeeds', async () => {
    const adapter = createR2Adapter(validCfg)
    mockS3Send.mockResolvedValueOnce({})
    expect(await adapter.exists!('file.txt')).toBe(true)
  })

  it('exists returns false when HeadObjectCommand throws', async () => {
    const adapter = createR2Adapter(validCfg)
    mockS3Send.mockRejectedValueOnce(new Error('Not Found'))
    expect(await adapter.exists!('missing.txt')).toBe(false)
  })
})
