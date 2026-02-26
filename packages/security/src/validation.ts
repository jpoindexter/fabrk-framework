export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export function stripHtml(input: string): string {
  // Match complete tags AND unclosed tags (no closing >) at end of string
  // to prevent bypass via partial tags like `<script` with no closing `>`.
  return input.replace(/<[^>]*(>|$)/gm, '')
}

export function sanitizeUrl(input: string): string | null {
  try {
    const url = new URL(input)
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

export function sanitizeRedirectUrl(
  input: string,
  allowedHosts: string[]
): string | null {
  if (!input || typeof input !== 'string') return null

  // Decode URL encoding before validation to catch bypass attempts such as
  // /%2F which passes the raw startsWith('/') + !startsWith('//') checks but
  // decodes to //evil.com — an open redirect.
  let decoded: string
  try {
    decoded = decodeURIComponent(input)
  } catch {
    // Invalid percent-encoding — reject
    return null
  }

  // Allow relative URLs — validate both the decoded and raw forms (belt-and-suspenders),
  // then strip CR/LF from the raw value to prevent HTTP response splitting.
  if (input.startsWith('/') && !input.startsWith('//')) {
    // Decoded form must also be a safe relative path
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return null
    return input.replace(/[\r\n]/g, '')
  }

  try {
    const url = new URL(input)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null
    }
    if (!allowedHosts.includes(url.hostname)) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}
