import { describe, it, expect } from 'vitest'
import { generateBackupCodes, hashBackupCodes, verifyBackupCode } from './backup-codes'

describe('generateBackupCodes', () => {
  it('should generate the requested number of codes', () => {
    const codes = generateBackupCodes(10)
    expect(codes).toHaveLength(10)
  })

  it('should default to 10 codes', () => {
    const codes = generateBackupCodes()
    expect(codes).toHaveLength(10)
  })

  it('should format codes as XXXX-XXXX', () => {
    const codes = generateBackupCodes(5)
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)
    }
  })

  it('should exclude ambiguous characters (I, O, 0, 1)', () => {
    // Generate many codes to increase chance of catching issues
    const codes = generateBackupCodes(50)
    for (const code of codes) {
      expect(code).not.toMatch(/[IO01]/)
    }
  })

  it('should generate unique codes', () => {
    const codes = generateBackupCodes(20)
    const unique = new Set(codes)
    // While not guaranteed, collisions in 20 codes should be extremely rare
    expect(unique.size).toBe(20)
  })
})

describe('hashBackupCodes', () => {
  it('should hash all codes', async () => {
    const codes = ['ABCD-EFGH', 'IJKL-MNOP']
    const hashed = await hashBackupCodes(codes)

    expect(hashed).toHaveLength(2)
    expect(hashed[0]).not.toBe('ABCD-EFGH')
    expect(hashed[0]).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('verifyBackupCode', () => {
  it('should verify a valid code', async () => {
    const codes = generateBackupCodes(5)
    const hashed = await hashBackupCodes(codes)

    const result = await verifyBackupCode(codes[0], hashed)
    expect(result.valid).toBe(true)
    expect(result.matchedIndex).toBe(0)
  })

  it('should reject an invalid code', async () => {
    const codes = generateBackupCodes(5)
    const hashed = await hashBackupCodes(codes)

    const result = await verifyBackupCode('ZZZZ-ZZZZ', hashed)
    expect(result.valid).toBe(false)
    expect(result.matchedIndex).toBe(-1)
  })

  it('should be case-insensitive', async () => {
    const codes = generateBackupCodes(1)
    const hashed = await hashBackupCodes(codes)

    const result = await verifyBackupCode(codes[0].toLowerCase(), hashed)
    expect(result.valid).toBe(true)
  })

  it('should find correct index for middle code', async () => {
    const codes = generateBackupCodes(5)
    const hashed = await hashBackupCodes(codes)

    const result = await verifyBackupCode(codes[2], hashed)
    expect(result.valid).toBe(true)
    expect(result.matchedIndex).toBe(2)
  })
})
