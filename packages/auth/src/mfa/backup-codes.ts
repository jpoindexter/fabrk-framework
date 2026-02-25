/**
 * Backup Code Generation and Verification
 *
 * Generates one-time-use backup codes for MFA recovery.
 * Codes are formatted as 8-character alphanumeric strings
 * grouped in pairs for readability.
 *
 * @example
 * ```ts
 * import { generateBackupCodes, verifyBackupCode } from '@fabrk/auth'
 *
 * const codes = generateBackupCodes(10)
 * // ['A1B2-C3D4', 'E5F6-G7H8', ...]
 *
 * // Store hashed codes
 * const hashed = await hashBackupCodes(codes)
 *
 * // Verify (consumes the code)
 * const { valid, remaining } = await verifyBackupCode('A1B2-C3D4', hashedCodes)
 * ```
 */

import { timingSafeEqual } from '@fabrk/core'

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
    codes.map((c) => hashCode(c.toUpperCase().replace(/[-\s]/g, '')))
  )
}

/**
 * Verify a backup code against a set of hashed codes
 *
 * Returns the index of the matched code (-1 if not found).
 * The caller is responsible for removing the used code from storage.
 */
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
  const codeHash = await hashCode(normalizedCode)

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

async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(code)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
