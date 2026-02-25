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

import { timingSafeEqual } from '../crypto-utils'

/**
 * Generate a set of backup codes
 */
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

    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`)
  }

  return codes
}

/**
 * Hash backup codes for storage using SHA-256
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map(hashCode))
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
  const normalizedCode = code.toUpperCase().replace(/\s/g, '')
  const codeHash = await hashCode(normalizedCode)

  // Use constant-time comparison to prevent timing attacks on hash lookup
  let matchedIndex = -1
  for (let i = 0; i < hashedCodes.length; i++) {
    if (timingSafeEqual(codeHash, hashedCodes[i])) {
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
