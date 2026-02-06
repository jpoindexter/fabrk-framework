# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

We take the security of FABRK framework seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do NOT:

- Open a public GitHub issue for security vulnerabilities
- Discuss the vulnerability in public forums, social media, or mailing lists

### Please DO:

**Report security vulnerabilities via GitHub Security Advisories:**

1. Go to https://github.com/jpoindexter/fabrk-framework/security/advisories/new
2. Provide a detailed description of the vulnerability
3. Include steps to reproduce the issue
4. Suggest a fix if possible

**Alternatively, email security reports to:**

- Email: jason@fabrk.dev (or repository owner's email)
- Subject: [SECURITY] Brief description of the issue

### What to Include in Your Report:

- Type of vulnerability (e.g., XSS, SQL injection, authentication bypass)
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability and how an attacker might exploit it

## Response Timeline

- **Initial Response**: Within 48 hours of report submission
- **Status Update**: Within 7 days with assessment and planned fix timeline
- **Fix Release**: Severity-dependent (critical: 7-14 days, high: 14-30 days, medium/low: 30-90 days)

## Disclosure Policy

- Security vulnerabilities will be disclosed publicly after a fix is released
- We will credit researchers who responsibly disclose vulnerabilities (unless they prefer to remain anonymous)
- We follow a coordinated disclosure timeline of 90 days from initial report

## Security Update Process

1. Vulnerability is reported and confirmed
2. Fix is developed in a private repository
3. Security advisory is prepared
4. Patch is released with security advisory
5. CVE is requested (if applicable)
6. Public disclosure is made

## Security Best Practices for Users

When using FABRK framework:

- Always use the latest stable version
- Keep all dependencies up to date
- Follow Next.js and React security best practices
- Validate and sanitize user inputs
- Use environment variables for sensitive data (never commit `.env` files)
- Review AI provider API keys security best practices
- Enable HTTPS in production
- Implement proper authentication and authorization

## Known Security Considerations

### AI Provider API Keys

- Never expose API keys in client-side code
- Use environment variables and server-side endpoints
- Implement rate limiting on AI endpoints
- Monitor API usage and costs
- Rotate API keys regularly

### Cost Tracking

- Cost tracking data may contain usage patterns
- Implement proper access controls for cost dashboards
- Sanitize user inputs in AI prompts

## Security-Related Configuration

### Environment Variables

Always use `.env.local` for sensitive data (not committed to git):

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...
```

### Recommended Security Headers

For Next.js applications using FABRK, configure security headers in `next.config.js`:

```js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ]
  },
}
```

## Bug Bounty Program

We do not currently offer a bug bounty program. However, we greatly appreciate security researchers who responsibly disclose vulnerabilities and will publicly acknowledge their contributions.

## Contact

For security concerns or questions about this policy:

- GitHub Security: https://github.com/jpoindexter/fabrk-framework/security
- General Security Questions: Open a discussion in GitHub Discussions

---

**Last Updated**: 2026-02-06
