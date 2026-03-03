import { test, expect } from '@playwright/test'

test.describe('API routes', () => {
  const agentUrl = '/api/agents/assistant'

  test('POST to agent endpoint returns JSON', async ({ request }) => {
    const res = await request.post(agentUrl, {
      data: {
        messages: [{ role: 'user', content: 'hello' }],
      },
    })
    // Agent may return 200 or a structured error — either way, JSON
    const contentType = res.headers()['content-type'] ?? ''
    expect(
      contentType.includes('application/json') ||
      contentType.includes('text/event-stream')
    ).toBe(true)
  })

  test('GET to agent endpoint returns 405', async ({ request }) => {
    const res = await request.get(agentUrl)
    expect(res.status()).toBe(405)
  })

  test('POST with empty body returns 400', async ({ request }) => {
    const res = await request.post(agentUrl, {
      data: {},
    })
    expect(res.status()).toBe(400)
  })
})
