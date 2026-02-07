import { describe, it, expect } from 'vitest'
import { generateApiKey, hashApiKey } from './generator'

describe('generateApiKey', () => {
  it('should generate a key with default prefix and environment', async () => {
    const result = await generateApiKey()

    expect(result.key).toMatch(/^fabrk_live_/)
    expect(result.prefix).toMatch(/^fabrk_live_/)
    expect(result.hash).toMatch(/^sha256:/)
  })

  it('should use custom prefix and environment', async () => {
    const result = await generateApiKey({
      prefix: 'myapp',
      environment: 'test',
    })

    expect(result.key).toMatch(/^myapp_test_/)
    expect(result.prefix).toMatch(/^myapp_test_/)
  })

  it('should generate unique keys', async () => {
    const key1 = await generateApiKey()
    const key2 = await generateApiKey()

    expect(key1.key).not.toBe(key2.key)
    expect(key1.hash).not.toBe(key2.hash)
  })

  it('should create a display prefix with 6 chars of random part', async () => {
    const result = await generateApiKey()

    const parts = result.prefix.split('_')
    // prefix = "fabrk", env = "live", display = 6 chars
    expect(parts).toHaveLength(3)
    expect(parts[2]).toHaveLength(6)
  })

  it('should generate key of sufficient length', async () => {
    const result = await generateApiKey({ keyLength: 32 })

    // Key format: prefix_env_randomPart
    const randomPart = result.key.split('_').slice(2).join('_')
    expect(randomPart.length).toBeGreaterThanOrEqual(32)
  })
})

describe('hashApiKey', () => {
  it('should return sha256-prefixed hash', async () => {
    const hash = await hashApiKey('test_key')
    expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/)
  })

  it('should produce consistent hashes', async () => {
    const hash1 = await hashApiKey('same_key')
    const hash2 = await hashApiKey('same_key')

    expect(hash1).toBe(hash2)
  })

  it('should produce different hashes for different keys', async () => {
    const hash1 = await hashApiKey('key_a')
    const hash2 = await hashApiKey('key_b')

    expect(hash1).not.toBe(hash2)
  })
})
