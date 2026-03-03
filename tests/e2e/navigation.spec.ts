import { test, expect } from '@playwright/test'

test.describe('Client-side navigation', () => {
  test('page loads and root element is interactive', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#root')).toBeVisible()
  })

  test('browser back/forward preserves state', async ({ page }) => {
    await page.goto('/')
    const initialUrl = page.url()

    // Navigate away (hash change or pushState)
    await page.evaluate(() => history.pushState(null, '', '/test-nav'))
    expect(page.url()).toContain('/test-nav')

    await page.goBack()
    expect(page.url()).toBe(initialUrl)

    await page.goForward()
    expect(page.url()).toContain('/test-nav')
  })

  test('direct URL access returns valid HTML', async ({ request }) => {
    const res = await request.get('/')
    expect(res.status()).toBe(200)
    const html = await res.text()
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<div id="root">')
  })
})
