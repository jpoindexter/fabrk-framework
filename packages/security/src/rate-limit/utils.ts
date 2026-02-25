/**
 * Sanitize a rate-limit key component to prevent injection.
 * Only allows alphanumeric, dots, hyphens, underscores, and at-signs.
 * Other characters (including colons) are replaced with underscores.
 * Truncated to 256 chars.
 *
 * @remarks Colons are intentionally excluded. Rate-limit keys are typically
 * assembled as "namespace:keyPart" by the caller. Allowing a colon here would
 * let an attacker inject a colon into their identifier (e.g. an IP or user ID)
 * to collide with a different user's rate-limit bucket — a namespace collision
 * attack. Keep colons out of each part so only the caller controls the separator.
 */
export function sanitizeKeyPart(input: string): string {
  return input.replace(/[^a-zA-Z0-9._\-@]/g, '_').slice(0, 256)
}
