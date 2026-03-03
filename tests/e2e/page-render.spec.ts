import { test, expect } from '@playwright/test'

test.describe('Page rendering', () => {
  test('/ loads with expected content', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/CodeScan/)
    await expect(page.locator('#root')).not.toBeEmpty()
  })

  test('HTML contains proper head metadata', async ({ page }) => {
    await page.goto('/')
    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveAttribute('content', /width=device-width/)
    const charset = page.locator('meta[charset]')
    await expect(charset).toHaveAttribute('charset', 'UTF-8')
  })

  test('response includes security headers', async ({ request }) => {
    const res = await request.get('/')
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
    expect(res.headers()['x-frame-options']).toBe('DENY')
    expect(res.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })
})
