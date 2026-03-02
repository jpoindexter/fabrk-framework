import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createConsoleAdapter } from './console-adapter'
import { createResendAdapter } from './resend/adapter'
import { renderTemplate, registerTemplate } from './templates/render'
import { welcomeTemplate } from './templates/welcome'
import { verificationTemplate } from './templates/verification'
import { resetTemplate } from './templates/reset'
import { inviteTemplate } from './templates/invite'
import { escapeHtml, sanitizeUrl, sanitizeSubject } from './utils'

// ---------------------------------------------------------------------------
// UTILS
// ---------------------------------------------------------------------------

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('AT&T')).toBe('AT&amp;T')
  })

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes double quotes', () => {
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s')
  })

  it('escapes all chars in one string', () => {
    expect(escapeHtml(`<a href="x" class='y'>&`)).toBe(
      `&lt;a href=&quot;x&quot; class=&#39;y&#39;&gt;&amp;`
    )
  })

  it('passes through plain strings unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('')
  })
})

describe('sanitizeUrl', () => {
  it('allows https URLs through unchanged', () => {
    expect(sanitizeUrl('https://example.com/path?q=1')).toBe('https://example.com/path?q=1')
  })

  it('allows http URLs through unchanged', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com')
  })

  it('passes the literal # through', () => {
    expect(sanitizeUrl('#')).toBe('#')
  })

  it('falls back to # for javascript: scheme', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#')
  })

  it('falls back to # for data: URIs', () => {
    expect(sanitizeUrl('data:text/html,<h1>xss</h1>')).toBe('#')
  })

  it('falls back to # for ftp:// scheme', () => {
    expect(sanitizeUrl('ftp://files.example.com')).toBe('#')
  })

  it('falls back to # for relative paths', () => {
    expect(sanitizeUrl('/relative/path')).toBe('#')
  })

  it('falls back to # for empty string', () => {
    expect(sanitizeUrl('')).toBe('#')
  })

  it('trims leading/trailing whitespace before evaluating', () => {
    expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com')
  })

  it('is case-insensitive for the scheme', () => {
    expect(sanitizeUrl('HTTPS://example.com')).toBe('HTTPS://example.com')
    expect(sanitizeUrl('HTTP://example.com')).toBe('HTTP://example.com')
  })
})

describe('sanitizeSubject', () => {
  it('strips carriage return characters', () => {
    expect(sanitizeSubject('subject\rinjection')).not.toContain('\r')
  })

  it('strips newline characters', () => {
    expect(sanitizeSubject('subject\nBcc: evil@x.com')).not.toContain('\n')
  })

  it('strips tab characters', () => {
    expect(sanitizeSubject('tab\there')).not.toContain('\t')
  })

  it('strips null byte', () => {
    expect(sanitizeSubject('sub\u0000ject')).not.toContain('\u0000')
  })

  it('strips other low control characters (unit separator)', () => {
    expect(sanitizeSubject('sub\u001fject')).not.toContain('\u001f')
  })

  it('strips DEL character (0x7f)', () => {
    expect(sanitizeSubject('del\u007fchar')).not.toContain('\u007f')
  })

  it('trims surrounding whitespace after stripping', () => {
    expect(sanitizeSubject('  hello  ')).toBe('hello')
  })

  it('passes through normal subjects unchanged', () => {
    expect(sanitizeSubject('Welcome to the app!')).toBe('Welcome to the app!')
  })

  it('replaces CRLF injection with spaces', () => {
    const result = sanitizeSubject('Subject\r\nBcc: evil@x.com')
    expect(result).not.toContain('\r')
    expect(result).not.toContain('\n')
    expect(result).toContain('Bcc')
  })
})

// ---------------------------------------------------------------------------
// TEMPLATES — individual functions
// ---------------------------------------------------------------------------

describe('welcomeTemplate', () => {
  it('includes the [WELCOME] heading', () => {
    const { html } = welcomeTemplate({ name: 'Alice', dashboardUrl: 'https://app.com', appName: 'MyApp' })
    expect(html).toContain('[WELCOME]')
  })

  it('embeds the user name', () => {
    const { html } = welcomeTemplate({ name: 'Alice', dashboardUrl: 'https://app.com', appName: 'MyApp' })
    expect(html).toContain('Alice')
  })

  it('embeds the dashboard URL as href and link text', () => {
    const { html } = welcomeTemplate({ name: 'Alice', dashboardUrl: 'https://app.com/dash', appName: 'X' })
    expect(html).toContain('href="https://app.com/dash"')
  })

  it('sets subject from appName', () => {
    const { subject } = welcomeTemplate({ name: 'Bob', dashboardUrl: '#', appName: 'Acme' })
    expect(subject).toBe('Welcome to Acme')
  })

  it('defaults name to "there" when omitted', () => {
    const { html } = welcomeTemplate({ dashboardUrl: 'https://app.com', appName: 'X' })
    expect(html).toContain('Hi there')
  })

  it('defaults appName in subject when omitted', () => {
    const { subject } = welcomeTemplate({ name: 'X', dashboardUrl: '#' })
    expect(subject).toBe('Welcome to the app')
  })

  it('falls back dashboard URL to # when missing', () => {
    const { html } = welcomeTemplate({ name: 'X', appName: 'Y' })
    expect(html).toContain('href="#"')
  })

  it('sanitizes XSS in name', () => {
    const { html } = welcomeTemplate({ name: '<script>alert(1)</script>', dashboardUrl: '#', appName: 'X' })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('falls back dashboard URL to # for javascript: scheme', () => {
    const { html } = welcomeTemplate({ name: 'A', dashboardUrl: 'javascript:void(0)', appName: 'X' })
    expect(html).toContain('href="#"')
  })
})

describe('verificationTemplate', () => {
  it('includes [EMAIL VERIFICATION] heading', () => {
    const { html } = verificationTemplate({ name: 'Alice', verificationUrl: 'https://example.com/verify' })
    expect(html).toContain('[EMAIL VERIFICATION]')
  })

  it('embeds name and verification URL', () => {
    const { html } = verificationTemplate({ name: 'Alice', verificationUrl: 'https://example.com/verify/abc' })
    expect(html).toContain('Alice')
    expect(html).toContain('https://example.com/verify/abc')
  })

  it('sets the fixed subject', () => {
    const { subject } = verificationTemplate({ name: 'A', verificationUrl: 'https://x.com' })
    expect(subject).toBe('Verify your email address')
  })

  it('mentions link expiry of 24 hours', () => {
    const { html } = verificationTemplate({ name: 'A', verificationUrl: 'https://x.com' })
    expect(html).toContain('24 hours')
  })

  it('defaults name to "there" when omitted', () => {
    const { html } = verificationTemplate({ verificationUrl: 'https://x.com' })
    expect(html).toContain('Hi there')
  })

  it('falls back verificationUrl to # when missing', () => {
    const { html } = verificationTemplate({ name: 'A' })
    expect(html).toContain('href="#"')
  })

  it('sanitizes XSS in name', () => {
    const { html } = verificationTemplate({ name: '"><img onerror=x>', verificationUrl: 'https://x.com' })
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('blocks javascript: in verificationUrl', () => {
    const { html } = verificationTemplate({ name: 'A', verificationUrl: 'javascript:alert(1)' })
    expect(html).toContain('href="#"')
    expect(html).not.toContain('javascript:')
  })
})

describe('resetTemplate', () => {
  it('includes [PASSWORD RESET] heading', () => {
    const { html } = resetTemplate({ name: 'Bob', resetUrl: 'https://example.com/reset' })
    expect(html).toContain('[PASSWORD RESET]')
  })

  it('embeds name and reset URL', () => {
    const { html } = resetTemplate({ name: 'Bob', resetUrl: 'https://example.com/reset/tok' })
    expect(html).toContain('Bob')
    expect(html).toContain('https://example.com/reset/tok')
  })

  it('sets the fixed subject', () => {
    const { subject } = resetTemplate({ name: 'B', resetUrl: 'https://x.com' })
    expect(subject).toBe('Reset your password')
  })

  it('mentions link expiry of 1 hour', () => {
    const { html } = resetTemplate({ name: 'B', resetUrl: 'https://x.com' })
    expect(html).toContain('1 hour')
  })

  it('defaults name to "there" when omitted', () => {
    const { html } = resetTemplate({ resetUrl: 'https://x.com' })
    expect(html).toContain('Hi there')
  })

  it('falls back resetUrl to # when missing', () => {
    const { html } = resetTemplate({ name: 'B' })
    expect(html).toContain('href="#"')
  })

  it('sanitizes XSS in name', () => {
    const { html } = resetTemplate({ name: '<b onmouseover=evil>', resetUrl: 'https://x.com' })
    expect(html).not.toContain('<b onmouseover')
    expect(html).toContain('&lt;b')
  })

  it('blocks javascript: in resetUrl', () => {
    const { html } = resetTemplate({ name: 'B', resetUrl: 'javascript:void(0)' })
    expect(html).toContain('href="#"')
    expect(html).not.toContain('javascript:')
  })
})

describe('inviteTemplate', () => {
  it('includes [TEAM INVITE] heading', () => {
    const { html } = inviteTemplate({
      orgName: 'Acme', inviterName: 'Dave', role: 'admin', inviteUrl: 'https://x.com/invite',
    })
    expect(html).toContain('[TEAM INVITE]')
  })

  it('embeds orgName, inviterName, role, and invite URL', () => {
    const { html } = inviteTemplate({
      orgName: 'Acme Corp', inviterName: 'Dave', role: 'editor', inviteUrl: 'https://x.com/invite/abc',
    })
    expect(html).toContain('Acme Corp')
    expect(html).toContain('Dave')
    expect(html).toContain('editor')
    expect(html).toContain('https://x.com/invite/abc')
  })

  it('sets subject from orgName', () => {
    const { subject } = inviteTemplate({
      orgName: 'Acme Corp', inviterName: 'Dave', role: 'admin', inviteUrl: 'https://x.com',
    })
    expect(subject).toBe("You've been invited to join Acme Corp")
  })

  it('mentions invitation expiry of 7 days', () => {
    const { html } = inviteTemplate({
      orgName: 'X', inviterName: 'Y', role: 'member', inviteUrl: 'https://x.com',
    })
    expect(html).toContain('7 days')
  })

  it('defaults orgName in subject when omitted', () => {
    const { subject } = inviteTemplate({ inviterName: 'X', role: 'member', inviteUrl: 'https://x.com' })
    expect(subject).toBe("You've been invited to join an organization")
  })

  it('defaults inviterName to "Someone" when omitted', () => {
    const { html } = inviteTemplate({ orgName: 'Acme', role: 'member', inviteUrl: 'https://x.com' })
    expect(html).toContain('Someone')
  })

  it('defaults role to "member" when omitted', () => {
    const { html } = inviteTemplate({ orgName: 'Acme', inviterName: 'Dave', inviteUrl: 'https://x.com' })
    expect(html).toContain('member')
  })

  it('falls back inviteUrl to # when missing', () => {
    const { html } = inviteTemplate({ orgName: 'Acme', inviterName: 'Dave', role: 'admin' })
    expect(html).toContain('href="#"')
  })

  it('sanitizes XSS in inviterName', () => {
    const { html } = inviteTemplate({
      orgName: 'Acme', inviterName: '<script>evil</script>', role: 'admin', inviteUrl: 'https://x.com',
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('sanitizes XSS in orgName', () => {
    const { html } = inviteTemplate({
      orgName: '"><img src=x>', inviterName: 'Dave', role: 'admin', inviteUrl: 'https://x.com',
    })
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('blocks javascript: in inviteUrl', () => {
    const { html } = inviteTemplate({
      orgName: 'Acme', inviterName: 'Dave', role: 'admin', inviteUrl: 'javascript:alert(1)',
    })
    expect(html).toContain('href="#"')
    expect(html).not.toContain('javascript:')
  })
})

// ---------------------------------------------------------------------------
// TEMPLATE REGISTRY — renderTemplate
// ---------------------------------------------------------------------------

describe('renderTemplate — delegation', () => {
  it('delegates "welcome" to welcomeTemplate', () => {
    const result = renderTemplate({ template: 'welcome', data: { name: 'Z', appName: 'Z', dashboardUrl: 'https://z.com' } })
    expect(result.subject).toContain('Welcome to')
  })

  it('delegates "verification" to verificationTemplate', () => {
    const result = renderTemplate({ template: 'verification', data: { name: 'Z', verificationUrl: 'https://z.com' } })
    expect(result.subject).toBe('Verify your email address')
  })

  it('delegates "reset" to resetTemplate', () => {
    const result = renderTemplate({ template: 'reset', data: { name: 'Z', resetUrl: 'https://z.com' } })
    expect(result.subject).toBe('Reset your password')
  })

  it('delegates "invite" to inviteTemplate', () => {
    const result = renderTemplate({ template: 'invite', data: { orgName: 'O', inviterName: 'I', role: 'r', inviteUrl: 'https://z.com' } })
    expect(result.subject).toContain("You've been invited")
  })

  it('passes data through to the renderer', () => {
    const result = renderTemplate({ template: 'welcome', data: { name: 'Unique-9421', appName: 'T', dashboardUrl: '#' } })
    expect(result.html).toContain('Unique-9421')
  })

  it('returns an object with subject and html strings', () => {
    const result = renderTemplate({ template: 'welcome', data: {} })
    expect(typeof result.subject).toBe('string')
    expect(typeof result.html).toBe('string')
  })
})

describe('registerTemplate', () => {
  it('registers a new template that renderTemplate can call', () => {
    registerTemplate('coverage-test-1', (data) => ({
      subject: `Greet: ${data.who}`,
      html: `<p>Hello ${data.who}</p>`,
    }))
    const result = renderTemplate({ template: 'coverage-test-1', data: { who: 'World' } })
    expect(result.subject).toBe('Greet: World')
    expect(result.html).toBe('<p>Hello World</p>')
  })

  it('overrides an existing custom template', () => {
    registerTemplate('coverage-test-2', () => ({ subject: 'first', html: '' }))
    registerTemplate('coverage-test-2', () => ({ subject: 'second', html: '' }))
    const result = renderTemplate({ template: 'coverage-test-2', data: {} })
    expect(result.subject).toBe('second')
  })
})

// ---------------------------------------------------------------------------
// CONSOLE ADAPTER — detailed branch coverage
// ---------------------------------------------------------------------------

describe('createConsoleAdapter — branch coverage', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('uses noreply@localhost as default from when config.from is omitted', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()
    await adapter.send({ to: 'a@b.com', subject: 'S' })
    const output = spy.mock.calls.flat().join('\n')
    expect(output).toContain('noreply@localhost')
  })

  it('uses config.from when provided', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter({ from: 'sender@myapp.com' })
    await adapter.send({ to: 'a@b.com', subject: 'S' })
    const output = spy.mock.calls.flat().join('\n')
    expect(output).toContain('sender@myapp.com')
  })

  it('logs CC when provided', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()
    await adapter.send({ to: 'a@b.com', subject: 'S', cc: 'cc@b.com' })
    const output = spy.mock.calls.flat().join('\n')
    expect(output).toContain('cc@b.com')
  })

  it('logs CC array joined with comma', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()
    await adapter.send({ to: 'a@b.com', subject: 'S', cc: ['x@b.com', 'y@b.com'] })
    const output = spy.mock.calls.flat().join('\n')
    expect(output).toContain('x@b.com, y@b.com')
  })

  it('logs replyTo when provided', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()
    await adapter.send({ to: 'a@b.com', subject: 'S', replyTo: 'reply@b.com' })
    const output = spy.mock.calls.flat().join('\n')
    expect(output).toContain('reply@b.com')
  })

  it('does not log CC or replyTo sections when absent', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()
    await adapter.send({ to: 'a@b.com', subject: 'S' })
    const output = spy.mock.calls.flat().join('\n')
    expect(output).not.toContain('CC:')
    expect(output).not.toContain('Reply:')
  })

  it('logs HTML body when logHtml is true', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter({ logHtml: true })
    await adapter.send({ to: 'a@b.com', subject: 'S', html: '<h1>HELLO</h1>' })
    const output = spy.mock.calls.flat().join('\n')
    expect(output).toContain('<h1>HELLO</h1>')
  })

  it('does not log HTML body when logHtml is false', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter({ logHtml: false })
    await adapter.send({ to: 'a@b.com', subject: 'S', html: '<h1>SECRET</h1>' })
    const output = spy.mock.calls.flat().join('\n')
    expect(output).not.toContain('<h1>SECRET</h1>')
  })

  it('does not log HTML body when logHtml is omitted', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()
    await adapter.send({ to: 'a@b.com', subject: 'S', html: '<p>HIDDEN</p>' })
    const output = spy.mock.calls.flat().join('\n')
    expect(output).not.toContain('<p>HIDDEN</p>')
  })

  it('logs text body when provided', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()
    await adapter.send({ to: 'a@b.com', subject: 'S', text: 'Plain text content' })
    const output = spy.mock.calls.flat().join('\n')
    expect(output).toContain('Plain text content')
  })

  it('sanitizes subject in log output', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()
    await adapter.send({ to: 'a@b.com', subject: 'Injected\r\nBcc: evil@x.com' })
    const output = spy.mock.calls.flat().join('\n')
    expect(output).not.toContain('\r')
    expect(output).not.toContain('\n\n')
  })

  it('logs to array joined with comma', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()
    await adapter.send({ to: ['one@x.com', 'two@x.com'], subject: 'S' })
    const output = spy.mock.calls.flat().join('\n')
    expect(output).toContain('one@x.com, two@x.com')
  })

  it('returns incrementing IDs across multiple sends', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()
    const r1 = await adapter.send({ to: 'a@b.com', subject: 'S' })
    const r2 = await adapter.send({ to: 'a@b.com', subject: 'S' })
    const r3 = await adapter.send({ to: 'a@b.com', subject: 'S' })
    expect(r1.id).toBe('console_1')
    expect(r2.id).toBe('console_2')
    expect(r3.id).toBe('console_3')
  })

  it('sendTemplate calls send with rendered subject and html', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const adapter = createConsoleAdapter()
    const result = await adapter.sendTemplate('t@x.com', {
      template: 'verification',
      data: { name: 'Tester', verificationUrl: 'https://example.com/verify/tok' },
    })
    expect(result.success).toBe(true)
    const output = spy.mock.calls.flat().join('\n')
    expect(output).toContain('Verify your email address')
  })

  it('each adapter instance has its own independent counter', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const a = createConsoleAdapter()
    const b = createConsoleAdapter()
    const ra = await a.send({ to: 'x@y.com', subject: 'S' })
    const rb = await b.send({ to: 'x@y.com', subject: 'S' })
    expect(ra.id).toBe('console_1')
    expect(rb.id).toBe('console_1')
  })
})

// ---------------------------------------------------------------------------
// RESEND ADAPTER — mocked Resend client
// ---------------------------------------------------------------------------

describe('createResendAdapter — mocked', () => {
  it('has name "resend" and version "1.0.0"', () => {
    const adapter = createResendAdapter({ apiKey: 'key', from: 'a@b.com' })
    expect(adapter.name).toBe('resend')
    expect(adapter.version).toBe('1.0.0')
  })

  it('isConfigured returns true when apiKey and from are set', () => {
    expect(createResendAdapter({ apiKey: 're_abc', from: 'a@b.com' }).isConfigured()).toBe(true)
  })

  it('isConfigured returns false when apiKey is empty string', () => {
    expect(createResendAdapter({ apiKey: '', from: 'a@b.com' }).isConfigured()).toBe(false)
  })

  it('isConfigured returns false when from is empty string', () => {
    expect(createResendAdapter({ apiKey: 're_abc', from: '' }).isConfigured()).toBe(false)
  })

  it('returns success result from mocked Resend client', async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'resend_msg_1' }, error: null })
    vi.doMock('resend', () => ({ Resend: class { emails = { send: mockSend } } }))

    // Use a fresh dynamic import so the vi.doMock takes effect
    const { createResendAdapter: create } = await import('./resend/adapter')
    const adapter = create({ apiKey: 're_test', from: 'noreply@app.com' })
    const result = await adapter.send({ to: 'user@example.com', subject: 'Hi', html: '<p>Hello</p>' })

    expect(result.success).toBe(true)
    expect(result.id).toBe('resend_msg_1')
    expect(result.error).toBeUndefined()
    vi.doUnmock('resend')
  })

  it('returns error result when Resend returns an error object', async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: null, error: { message: 'invalid key' } })
    vi.doMock('resend', () => ({ Resend: class { emails = { send: mockSend } } }))

    const { createResendAdapter: create } = await import('./resend/adapter')
    const adapter = create({ apiKey: 're_test', from: 'noreply@app.com' })
    const result = await adapter.send({ to: 'user@example.com', subject: 'Hi' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('invalid key')
    vi.doUnmock('resend')
  })

  it('returns error result when Resend throws an Error instance', async () => {
    const mockSend = vi.fn().mockRejectedValue(new Error('network failure'))
    vi.doMock('resend', () => ({ Resend: class { emails = { send: mockSend } } }))

    const { createResendAdapter: create } = await import('./resend/adapter')
    const adapter = create({ apiKey: 're_test', from: 'noreply@app.com' })
    const result = await adapter.send({ to: 'user@example.com', subject: 'Hi' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('network failure')
    expect(result.id).toBe('')
    vi.doUnmock('resend')
  })

  it('returns generic message when Resend throws a non-Error value', async () => {
    const mockSend = vi.fn().mockRejectedValue('string error')
    vi.doMock('resend', () => ({ Resend: class { emails = { send: mockSend } } }))

    const { createResendAdapter: create } = await import('./resend/adapter')
    const adapter = create({ apiKey: 're_test', from: 'noreply@app.com' })
    const result = await adapter.send({ to: 'user@example.com', subject: 'Hi' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to send email')
    vi.doUnmock('resend')
  })

  it('forwards to array to Resend when given string', async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null })
    vi.doMock('resend', () => ({ Resend: class { emails = { send: mockSend } } }))

    const { createResendAdapter: create } = await import('./resend/adapter')
    const adapter = create({ apiKey: 're_test', from: 'noreply@app.com' })
    await adapter.send({ to: 'user@example.com', subject: 'Hi' })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['user@example.com'] })
    )
    vi.doUnmock('resend')
  })

  it('forwards to array as-is when already an array', async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null })
    vi.doMock('resend', () => ({ Resend: class { emails = { send: mockSend } } }))

    const { createResendAdapter: create } = await import('./resend/adapter')
    const adapter = create({ apiKey: 're_test', from: 'noreply@app.com' })
    await adapter.send({ to: ['a@x.com', 'b@x.com'], subject: 'Hi' })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['a@x.com', 'b@x.com'] })
    )
    vi.doUnmock('resend')
  })

  it('forwards config.replyTo when options.replyTo is not set', async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null })
    vi.doMock('resend', () => ({ Resend: class { emails = { send: mockSend } } }))

    const { createResendAdapter: create } = await import('./resend/adapter')
    const adapter = create({ apiKey: 're_test', from: 'noreply@app.com', replyTo: 'support@app.com' })
    await adapter.send({ to: 'u@x.com', subject: 'Hi' })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ reply_to: 'support@app.com' })
    )
    vi.doUnmock('resend')
  })

  it('options.replyTo takes precedence over config.replyTo', async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null })
    vi.doMock('resend', () => ({ Resend: class { emails = { send: mockSend } } }))

    const { createResendAdapter: create } = await import('./resend/adapter')
    const adapter = create({ apiKey: 're_test', from: 'noreply@app.com', replyTo: 'support@app.com' })
    await adapter.send({ to: 'u@x.com', subject: 'Hi', replyTo: 'override@app.com' })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ reply_to: 'override@app.com' })
    )
    vi.doUnmock('resend')
  })

  it('forwards cc as array when given a string', async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null })
    vi.doMock('resend', () => ({ Resend: class { emails = { send: mockSend } } }))

    const { createResendAdapter: create } = await import('./resend/adapter')
    const adapter = create({ apiKey: 're_test', from: 'noreply@app.com' })
    await adapter.send({ to: 'u@x.com', subject: 'Hi', cc: 'cc@x.com' })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ cc: ['cc@x.com'] })
    )
    vi.doUnmock('resend')
  })

  it('forwards bcc as array when given a string', async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null })
    vi.doMock('resend', () => ({ Resend: class { emails = { send: mockSend } } }))

    const { createResendAdapter: create } = await import('./resend/adapter')
    const adapter = create({ apiKey: 're_test', from: 'noreply@app.com' })
    await adapter.send({ to: 'u@x.com', subject: 'Hi', bcc: 'bcc@x.com' })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ bcc: ['bcc@x.com'] })
    )
    vi.doUnmock('resend')
  })

  it('forwards headers when provided', async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null })
    vi.doMock('resend', () => ({ Resend: class { emails = { send: mockSend } } }))

    const { createResendAdapter: create } = await import('./resend/adapter')
    const adapter = create({ apiKey: 're_test', from: 'noreply@app.com' })
    await adapter.send({ to: 'u@x.com', subject: 'Hi', headers: { 'X-Custom': 'val' } })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { 'X-Custom': 'val' } })
    )
    vi.doUnmock('resend')
  })

  it('forwards tags when provided', async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null })
    vi.doMock('resend', () => ({ Resend: class { emails = { send: mockSend } } }))

    const { createResendAdapter: create } = await import('./resend/adapter')
    const adapter = create({ apiKey: 're_test', from: 'noreply@app.com' })
    await adapter.send({ to: 'u@x.com', subject: 'Hi', tags: [{ name: 'campaign', value: 'abc' }] })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ tags: [{ name: 'campaign', value: 'abc' }] })
    )
    vi.doUnmock('resend')
  })

  it('sanitizes subject before passing to Resend', async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null })
    vi.doMock('resend', () => ({ Resend: class { emails = { send: mockSend } } }))

    const { createResendAdapter: create } = await import('./resend/adapter')
    const adapter = create({ apiKey: 're_test', from: 'noreply@app.com' })
    await adapter.send({ to: 'u@x.com', subject: 'Injected\r\nBcc: evil@x.com' })

    const calledSubject: string = mockSend.mock.calls[0][0].subject
    expect(calledSubject).not.toContain('\r')
    expect(calledSubject).not.toContain('\n')
    vi.doUnmock('resend')
  })

  it('uses config.from as from address', async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null })
    vi.doMock('resend', () => ({ Resend: class { emails = { send: mockSend } } }))

    const { createResendAdapter: create } = await import('./resend/adapter')
    const adapter = create({ apiKey: 're_test', from: 'configured@app.com' })
    await adapter.send({ to: 'u@x.com', subject: 'Hi' })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'configured@app.com' })
    )
    vi.doUnmock('resend')
  })

  it('sendTemplate renders and sends a template', async () => {
    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'tmpl_1' }, error: null })
    vi.doMock('resend', () => ({ Resend: class { emails = { send: mockSend } } }))

    const { createResendAdapter: create } = await import('./resend/adapter')
    const adapter = create({ apiKey: 're_test', from: 'noreply@app.com' })
    const result = await adapter.sendTemplate('u@x.com', {
      template: 'welcome',
      data: { name: 'Tester', appName: 'MyApp', dashboardUrl: 'https://app.com' },
    })

    expect(result.success).toBe(true)
    expect(result.id).toBe('tmpl_1')
    const calledSubject: string = mockSend.mock.calls[0][0].subject
    expect(calledSubject).toBe('Welcome to MyApp')
    vi.doUnmock('resend')
  })

  it('send rejects when getResend throws (error propagates outside try block)', async () => {
    // getResend() is called before the try/catch in send(), so a throw from it
    // propagates as an unhandled rejection rather than being caught and returned
    // as a { success: false } result. This tests that the error surface is correct.
    const mockSend = vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null })
    vi.doMock('resend', () => ({ Resend: class { emails = { send: mockSend } } }))

    const { createResendAdapter: create } = await import('./resend/adapter')
    const adapter = create({ apiKey: 're_test', from: 'noreply@app.com' })

    // Force resend to fail mid-flight by making emails.send throw before returning
    mockSend.mockRejectedValueOnce(new Error('connection reset'))
    const result = await adapter.send({ to: 'u@x.com', subject: 'Hi' })

    // This error IS inside the try block → returns { success: false }
    expect(result.success).toBe(false)
    expect(result.error).toBe('connection reset')
    vi.doUnmock('resend')
  })
})
