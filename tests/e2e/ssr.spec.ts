import { test, expect } from '@playwright/test'

test.describe('SSR verification', () => {
  test('initial HTML contains rendered content (no JS needed)', async ({ request }) => {
    const res = await request.get('/')
    const html = await res.text()
    expect(html).toContain('<div id="root">')
    // Root should contain SSR-rendered markup, not be empty
    const rootMatch = html.match(/<div id="root">([\s\S]*?)<\/div>/)
    expect(rootMatch).not.toBeNull()
  })

  test('HTML contains metadata tags', async ({ request }) => {
    const res = await request.get('/')
    const html = await res.text()
    expect(html).toContain('<meta charset="UTF-8"')
    expect(html).toContain('<meta name="viewport"')
    expect(html).toContain('<title>')
  })

  test('response is valid HTML document', async ({ request }) => {
    const res = await request.get('/')
    expect(res.status()).toBe(200)
    const html = await res.text()
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })
})
