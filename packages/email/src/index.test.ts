import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createConsoleAdapter,
  createResendAdapter,
  renderTemplate,
  registerTemplate,
} from './index'

// ============================================================================
// CONSOLE ADAPTER
// ============================================================================

describe('createConsoleAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should be configured and have correct name/version', () => {
    const adapter = createConsoleAdapter()
    expect(adapter.name).toBe('console')
    expect(adapter.version).toBe('1.0.0')
    expect(adapter.isConfigured()).toBe(true)
  })

  it('should send email, increment IDs, and log content', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()

    const r1 = await adapter.send({
      to: ['a@example.com', 'b@example.com'],
      subject: 'Test Subject',
      text: 'Body text here',
    })
    const r2 = await adapter.send({ to: 'c@d.com', subject: 'S2' })

    expect(r1.success).toBe(true)
    expect(r1.id).toBe('console_1')
    expect(r2.id).toBe('console_2')

    const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join('\n')
    expect(allOutput).toContain('a@example.com')
    expect(allOutput).toContain('b@example.com')
    expect(allOutput).toContain('Test Subject')
    expect(allOutput).toContain('Body text here')
  })

  it('should send a template email via sendTemplate', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()

    const result = await adapter.sendTemplate('user@example.com', {
      template: 'welcome',
      data: { name: 'Alice', appName: 'TestApp', dashboardUrl: 'https://example.com' },
    })

    expect(result.success).toBe(true)
    expect(result.id).toBeDefined()
  })
})

// ============================================================================
// RESEND ADAPTER
// ============================================================================

describe('createResendAdapter', () => {
  it('should report configured/unconfigured correctly', () => {
    expect(createResendAdapter({ apiKey: 'key', from: 'a@b.com' }).isConfigured()).toBe(true)
    expect(createResendAdapter({ apiKey: '', from: 'a@b.com' }).isConfigured()).toBe(false)
    expect(createResendAdapter({ apiKey: 'key', from: '' }).isConfigured()).toBe(false)
  })

  it('should return error result for invalid API key', async () => {
    const adapter = createResendAdapter({ apiKey: 'test-key', from: 'noreply@test.com' })
    const result = await adapter.send({ to: 'user@example.com', subject: 'Test' })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

describe('renderTemplate', () => {
  it('should render verification template with data and defaults', () => {
    const withData = renderTemplate({
      template: 'verification',
      data: { name: 'Alice', verificationUrl: 'https://example.com/verify' },
    })
    expect(withData.subject).toBe('Verify your email address')
    expect(withData.html).toContain('Alice')
    expect(withData.html).toContain('https://example.com/verify')

    const withDefaults = renderTemplate({ template: 'verification', data: {} })
    expect(withDefaults.html).toContain('there')
  })

  it('should render reset template', () => {
    const result = renderTemplate({
      template: 'reset',
      data: { name: 'Bob', resetUrl: 'https://example.com/reset' },
    })
    expect(result.subject).toBe('Reset your password')
    expect(result.html).toContain('Bob')
  })

  it('should render welcome template', () => {
    const result = renderTemplate({
      template: 'welcome',
      data: { name: 'Carol', appName: 'MyApp', dashboardUrl: 'https://example.com/dash' },
    })
    expect(result.subject).toBe('Welcome to MyApp')
    expect(result.html).toContain('Carol')
  })

  it('should render invite template', () => {
    const result = renderTemplate({
      template: 'invite',
      data: { orgName: 'Acme Corp', inviterName: 'Dave', role: 'admin', inviteUrl: 'https://example.com/invite' },
    })
    expect(result.subject).toBe("You've been invited to join Acme Corp")
    expect(result.html).toContain('Dave')
    expect(result.html).toContain('admin')
  })

  it('should throw for unknown template name', () => {
    expect(() =>
      renderTemplate({ template: 'nonexistent', data: {} })
    ).toThrow('Unknown email template: nonexistent')
  })
})

// ============================================================================
// CUSTOM TEMPLATE REGISTRATION
// ============================================================================

describe('registerTemplate', () => {
  it('should register, render, and override custom templates', () => {
    registerTemplate('custom-test', (data) => ({
      subject: `Custom: ${data.title}`,
      html: `<p>${data.body}</p>`,
    }))

    const result = renderTemplate({
      template: 'custom-test',
      data: { title: 'Hello', body: 'World' },
    })
    expect(result.subject).toBe('Custom: Hello')
    expect(result.html).toBe('<p>World</p>')

    registerTemplate('custom-test', () => ({ subject: 'Overridden', html: '<p>Overridden</p>' }))
    const overridden = renderTemplate({ template: 'custom-test', data: {} })
    expect(overridden.subject).toBe('Overridden')
  })
})
