import { timingSafeEqual, hashPayload } from '@fabrk/core'

export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I, O, 0, 1 to avoid confusion

  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)

    let code = ''
    for (let j = 0; j < 8; j++) {
      code += chars[bytes[j] % chars.length]
    }

    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`)
  }

  return codes
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  // Normalize each code (strip dashes + whitespace, uppercase) before hashing
  // so that stored hashes are consistent with the normalization applied during
  // verification. This ensures "ABCD-EFGH" and "ABCDEFGH" hash identically.
  return Promise.all(
    codes.map((c) => hashPayload(c.toUpperCase().replace(/[-\s]/g, '')))
  )
}

export async function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): Promise<{ valid: boolean; matchedIndex: number }> {
  // Validate backup code format before expensive hash comparison.
  // Backup codes are 9-char strings in "XXXX-XXXX" format (8 alphanum + 1 dash).
  // Reject clearly invalid inputs as a DoS prevention measure.
  if (!code || code.length > 32) {
    return { valid: false, matchedIndex: -1 }
  }

  // Normalize: uppercase, strip whitespace AND dashes so that both
  // "ABCD-EFGH" and "ABCDEFGH" hash to the same value.
  const normalizedCode = code.toUpperCase().replace(/[-\s]/g, '')
  const codeHash = await hashPayload(normalizedCode)

  // Use constant-time comparison to prevent timing attacks on hash lookup
  let matchedIndex = -1
  for (let i = 0; i < hashedCodes.length; i++) {
    if (await timingSafeEqual(codeHash, hashedCodes[i])) {
      matchedIndex = i
    }
  }

  return {
    valid: matchedIndex !== -1,
    matchedIndex,
  }
}
