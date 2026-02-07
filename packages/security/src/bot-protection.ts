/**
 * Bot Protection
 *
 * Heuristic-based bot detection for request filtering.
 * Checks User-Agent, request patterns, and honeypot fields.
 *
 * @example
 * ```ts
 * import { detectBot } from '@fabrk/security'
 *
 * const result = detectBot(request)
 * if (result.isBot) {
 *   return new Response('Forbidden', { status: 403 })
 * }
 * ```
 */

export interface BotDetectionResult {
  isBot: boolean
  confidence: number // 0-1
  reason?: string
  category?: 'crawler' | 'scraper' | 'automation' | 'unknown'
}

const KNOWN_BOT_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /mediapartners/i,
  /lighthouse/i,
  /pagespeed/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
]

const KNOWN_GOOD_BOTS = [
  /googlebot/i,
  /bingbot/i,
  /yandexbot/i,
  /duckduckbot/i,
  /slackbot/i,
  /twitterbot/i,
  /facebookexternalhit/i,
  /linkedinbot/i,
]

/**
 * Detect if a request is from a bot
 */
export function detectBot(request: Request): BotDetectionResult {
  const userAgent = request.headers.get('User-Agent') ?? ''
  let confidence = 0
  let reason: string | undefined
  let category: BotDetectionResult['category']

  // No User-Agent header
  if (!userAgent) {
    return {
      isBot: true,
      confidence: 0.8,
      reason: 'Missing User-Agent header',
      category: 'automation',
    }
  }

  // Check known good bots (allow these)
  for (const pattern of KNOWN_GOOD_BOTS) {
    if (pattern.test(userAgent)) {
      return {
        isBot: true,
        confidence: 0.9,
        reason: `Known bot: ${userAgent.slice(0, 50)}`,
        category: 'crawler',
      }
    }
  }

  // Check known bot patterns
  for (const pattern of KNOWN_BOT_PATTERNS) {
    if (pattern.test(userAgent)) {
      confidence = Math.max(confidence, 0.7)
      reason = `Bot pattern detected in User-Agent`
      category = 'crawler'
    }
  }

  // Check for missing common headers
  if (!request.headers.get('Accept-Language')) {
    confidence = Math.max(confidence, 0.3)
    if (!reason) reason = 'Missing Accept-Language header'
    if (!category) category = 'automation'
  }

  if (!request.headers.get('Accept')) {
    confidence = Math.max(confidence, 0.4)
    if (!reason) reason = 'Missing Accept header'
    if (!category) category = 'automation'
  }

  return {
    isBot: confidence >= 0.7,
    confidence,
    reason,
    category,
  }
}

/**
 * Validate a honeypot field (should be empty if submitted by a human)
 */
export function validateHoneypot(
  formData: FormData | Record<string, string>,
  fieldName: string = '__hp_field'
): boolean {
  if (formData instanceof FormData) {
    const value = formData.get(fieldName)
    return !value || value === ''
  }

  return !formData[fieldName] || formData[fieldName] === ''
}
