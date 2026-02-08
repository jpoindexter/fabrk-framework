import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createConsoleAdapter,
  createResendAdapter,
  renderTemplate,
  registerTemplate,
  verificationTemplate,
  resetTemplate,
  welcomeTemplate,
  inviteTemplate,
} from './index'

// ============================================================================
// CONSOLE ADAPTER
// ============================================================================

describe('createConsoleAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should return an object with the EmailAdapter interface', () => {
    const adapter = createConsoleAdapter()

    expect(adapter.name).toBe('console')
    expect(adapter.version).toBe('1.0.0')
    expect(typeof adapter.isConfigured).toBe('function')
    expect(typeof adapter.send).toBe('function')
    expect(typeof adapter.sendTemplate).toBe('function')
  })

  it('should always report as configured', () => {
    const adapter = createConsoleAdapter()
    expect(adapter.isConfigured()).toBe(true)
  })

  it('should send an email and return a success result', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()

    const result = await adapter.send({
      to: 'user@example.com',
      subject: 'Test Subject',
      text: 'Hello world',
    })

    expect(result.success).toBe(true)
    expect(result.id).toBe('console_1')
    expect(consoleSpy).toHaveBeenCalled()
  })

  it('should increment email IDs on successive sends', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()

    const r1 = await adapter.send({ to: 'a@b.com', subject: 'S1' })
    const r2 = await adapter.send({ to: 'c@d.com', subject: 'S2' })

    expect(r1.id).toBe('console_1')
    expect(r2.id).toBe('console_2')
  })

  it('should log recipient, subject, and text body', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()

    await adapter.send({
      to: 'user@example.com',
      subject: 'Test Subject',
      text: 'Body text here',
    })

    const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join('\n')
    expect(allOutput).toContain('user@example.com')
    expect(allOutput).toContain('Test Subject')
    expect(allOutput).toContain('Body text here')
  })

  it('should handle array of recipients', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()

    await adapter.send({
      to: ['a@example.com', 'b@example.com'],
      subject: 'Multi',
    })

    const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join('\n')
    expect(allOutput).toContain('a@example.com')
    expect(allOutput).toContain('b@example.com')
  })

  it('should log CC when provided', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()

    await adapter.send({
      to: 'user@example.com',
      subject: 'With CC',
      cc: 'cc@example.com',
    })

    const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join('\n')
    expect(allOutput).toContain('cc@example.com')
  })

  it('should log reply-to when provided', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()

    await adapter.send({
      to: 'user@example.com',
      subject: 'With Reply',
      replyTo: 'reply@example.com',
    })

    const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join('\n')
    expect(allOutput).toContain('reply@example.com')
  })

  it('should use custom from address in log output', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter({ from: 'custom@myapp.com' })

    await adapter.send({ to: 'user@example.com', subject: 'Test' })

    const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join('\n')
    expect(allOutput).toContain('custom@myapp.com')
  })

  it('should use default from address when not configured', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()

    await adapter.send({ to: 'user@example.com', subject: 'Test' })

    const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join('\n')
    expect(allOutput).toContain('noreply@localhost')
  })

  it('should not log HTML by default', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()

    await adapter.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<h1>Secret HTML</h1>',
    })

    const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join('\n')
    expect(allOutput).not.toContain('Secret HTML')
  })

  it('should log HTML when logHtml is enabled', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter({ logHtml: true })

    await adapter.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<h1>Visible HTML</h1>',
    })

    const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join('\n')
    expect(allOutput).toContain('Visible HTML')
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
  it('should return an object with the EmailAdapter interface', () => {
    const adapter = createResendAdapter({ apiKey: 'test-key', from: 'noreply@test.com' })

    expect(adapter.name).toBe('resend')
    expect(adapter.version).toBe('1.0.0')
    expect(typeof adapter.isConfigured).toBe('function')
    expect(typeof adapter.send).toBe('function')
    expect(typeof adapter.sendTemplate).toBe('function')
  })

  it('should report configured when apiKey and from are provided', () => {
    const adapter = createResendAdapter({ apiKey: 'test-key', from: 'noreply@test.com' })
    expect(adapter.isConfigured()).toBe(true)
  })

  it('should report not configured when apiKey is empty', () => {
    const adapter = createResendAdapter({ apiKey: '', from: 'noreply@test.com' })
    expect(adapter.isConfigured()).toBe(false)
  })

  it('should report not configured when from is empty', () => {
    const adapter = createResendAdapter({ apiKey: 'test-key', from: '' })
    expect(adapter.isConfigured()).toBe(false)
  })

  it('should throw when resend package is not available', async () => {
    const adapter = createResendAdapter({ apiKey: 'test-key', from: 'noreply@test.com' })

    // The resend package uses require() which will fail in test environment
    // without the actual package properly configured with an API key.
    // We test that send() handles errors gracefully.
    const result = await adapter.send({
      to: 'user@example.com',
      subject: 'Test',
    })

    // Either throws or returns error result (resend may be installed as devDep)
    // If resend IS installed (it is as devDep), it will try to call the API
    // and fail with an invalid API key, returning success: false
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

describe('renderTemplate', () => {
  describe('verification template', () => {
    it('should render with provided data', () => {
      const result = renderTemplate({
        template: 'verification',
        data: { name: 'Alice', verificationUrl: 'https://example.com/verify' },
      })

      expect(result.subject).toBe('Verify your email address')
      expect(result.html).toContain('Alice')
      expect(result.html).toContain('https://example.com/verify')
    })

    it('should use defaults when data is missing', () => {
      const result = renderTemplate({
        template: 'verification',
        data: {},
      })

      expect(result.subject).toBe('Verify your email address')
      expect(result.html).toContain('there')
      expect(result.html).toContain('#')
    })
  })

  describe('reset template', () => {
    it('should render with provided data', () => {
      const result = renderTemplate({
        template: 'reset',
        data: { name: 'Bob', resetUrl: 'https://example.com/reset' },
      })

      expect(result.subject).toBe('Reset your password')
      expect(result.html).toContain('Bob')
      expect(result.html).toContain('https://example.com/reset')
    })

    it('should use defaults when data is missing', () => {
      const result = renderTemplate({
        template: 'reset',
        data: {},
      })

      expect(result.subject).toBe('Reset your password')
      expect(result.html).toContain('there')
    })
  })

  describe('welcome template', () => {
    it('should render with provided data', () => {
      const result = renderTemplate({
        template: 'welcome',
        data: { name: 'Carol', appName: 'MyApp', dashboardUrl: 'https://example.com/dash' },
      })

      expect(result.subject).toBe('Welcome to MyApp')
      expect(result.html).toContain('Carol')
      expect(result.html).toContain('https://example.com/dash')
    })

    it('should use defaults when data is missing', () => {
      const result = renderTemplate({
        template: 'welcome',
        data: {},
      })

      expect(result.subject).toBe('Welcome to the app')
      expect(result.html).toContain('there')
    })
  })

  describe('invite template', () => {
    it('should render with provided data', () => {
      const result = renderTemplate({
        template: 'invite',
        data: {
          orgName: 'Acme Corp',
          inviterName: 'Dave',
          role: 'admin',
          inviteUrl: 'https://example.com/invite',
        },
      })

      expect(result.subject).toBe("You've been invited to join Acme Corp")
      expect(result.html).toContain('Dave')
      expect(result.html).toContain('Acme Corp')
      expect(result.html).toContain('admin')
      expect(result.html).toContain('https://example.com/invite')
    })

    it('should use defaults when data is missing', () => {
      const result = renderTemplate({
        template: 'invite',
        data: {},
      })

      expect(result.subject).toBe("You've been invited to join an organization")
      expect(result.html).toContain('Someone')
      expect(result.html).toContain('member')
    })
  })

  describe('error cases', () => {
    it('should throw for unknown template name', () => {
      expect(() =>
        renderTemplate({ template: 'nonexistent', data: {} })
      ).toThrow('Unknown email template: nonexistent')
    })
  })
})

// ============================================================================
// CUSTOM TEMPLATE REGISTRATION
// ============================================================================

describe('registerTemplate', () => {
  it('should register and render a custom template', () => {
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
  })

  it('should override existing templates', () => {
    registerTemplate('override-test', () => ({
      subject: 'Original',
      html: '<p>Original</p>',
    }))

    registerTemplate('override-test', () => ({
      subject: 'Overridden',
      html: '<p>Overridden</p>',
    }))

    const result = renderTemplate({
      template: 'override-test',
      data: {},
    })

    expect(result.subject).toBe('Overridden')
  })
})

// ============================================================================
// DIRECT TEMPLATE FUNCTION EXPORTS
// ============================================================================

describe('template function exports', () => {
  it('should export verificationTemplate as a function', () => {
    expect(typeof verificationTemplate).toBe('function')
    const result = verificationTemplate({ name: 'Test' })
    expect(result.subject).toBeDefined()
    expect(result.html).toBeDefined()
  })

  it('should export resetTemplate as a function', () => {
    expect(typeof resetTemplate).toBe('function')
    const result = resetTemplate({ name: 'Test' })
    expect(result.subject).toBeDefined()
    expect(result.html).toBeDefined()
  })

  it('should export welcomeTemplate as a function', () => {
    expect(typeof welcomeTemplate).toBe('function')
    const result = welcomeTemplate({ name: 'Test' })
    expect(result.subject).toBeDefined()
    expect(result.html).toBeDefined()
  })

  it('should export inviteTemplate as a function', () => {
    expect(typeof inviteTemplate).toBe('function')
    const result = inviteTemplate({ orgName: 'Test Org' })
    expect(result.subject).toBeDefined()
    expect(result.html).toBeDefined()
  })
})
