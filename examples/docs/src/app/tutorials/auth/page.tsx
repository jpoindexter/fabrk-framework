'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

export default function AuthTutorialPage() {
  return (
    <DocLayout
      title="ADD AUTHENTICATION"
      description="Add full auth to your FABRK app in 7 steps: NextAuth sessions, API keys, MFA with TOTP, backup codes, and route protection."
    >
      <InfoCard title="WHAT YOU WILL BUILD">
        A complete auth system with NextAuth login (GitHub + Google), SHA-256 hashed API keys,
        TOTP two-factor authentication, one-time backup codes, and middleware for route protection.
        Estimated time: 15 minutes.
      </InfoCard>

      {/* STEP 1 -- SCAFFOLD */}
      <Section title="STEP 1 -- SCAFFOLD">
        <p className="text-sm text-muted-foreground mb-4">
          Scaffold a new project, then enable auth in your config.
        </p>
        <CodeBlock title="terminal">{`npx create-fabrk-app my-app && cd my-app && pnpm install`}</CodeBlock>
        <CodeBlock title="fabrk.config.ts">{`import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  app: { name: 'My App', url: 'http://localhost:3000' },
  auth: { providers: ['github', 'google'], sessionStrategy: 'jwt', pages: { signIn: '/login' } },
  security: { csrf: true, rateLimit: true },
})`}</CodeBlock>
      </Section>

      {/* STEP 2 -- NEXTAUTH ADAPTER */}
      <Section title="STEP 2 -- NEXTAUTH ADAPTER">
        <p className="text-sm text-muted-foreground mb-4">
          Create your Auth.js v5 instance, then wrap it with the FABRK adapter for a unified
          interface across sessions, API keys, and MFA.
        </p>
        <CodeBlock title="src/lib/auth.ts">{`import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({ clientId: process.env.GITHUB_CLIENT_ID!, clientSecret: process.env.GITHUB_CLIENT_SECRET! }),
    Google({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
})`}</CodeBlock>
        <CodeBlock title="src/lib/fabrk-auth.ts">{`import { createNextAuthAdapter } from '@fabrk/auth'
import { auth } from './auth'

// Wraps auth() so FABRK middleware can retrieve sessions, validate keys, and manage MFA
export const authAdapter = createNextAuthAdapter({
  authInstance: auth, providers: ['github', 'google'], sessionStrategy: 'jwt',
})`}</CodeBlock>
        <CodeBlock title="src/app/api/auth/[...nextauth]/route.ts">{`import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers`}</CodeBlock>
      </Section>

      {/* STEP 3 -- API KEYS */}
      <Section title="STEP 3 -- API KEYS">
        <p className="text-sm text-muted-foreground mb-4">
          Generate SHA-256 hashed API keys. The raw key is returned once at creation
          in <code className="text-primary">prefix_env_random</code> format.
        </p>
        <CodeBlock title="src/app/api/keys/route.ts">{`import { withAuth } from '@fabrk/auth'
import { authAdapter } from '@/lib/fabrk-auth'

export const POST = withAuth(authAdapter, async (req, session) => {
  const { name, scopes } = await req.json()
  const result = await authAdapter.createApiKey({
    userId: session.userId, name, scopes: scopes ?? ['read'],
  })
  return Response.json({ id: result.id, key: result.key, prefix: result.prefix })
})`}</CodeBlock>
        <CodeBlock title="standalone usage">{`import { generateApiKey, createApiKeyValidator } from '@fabrk/auth'

const { key, prefix, hash } = await generateApiKey({ prefix: 'myapp', environment: 'live' })
// key: "myapp_live_a1b2c3d4..." — hash is what you store in your database

const validator = createApiKeyValidator(store)
const info = await validator.validate(key)
if (info && validator.hasScope(info, 'write')) { /* authorized */ }`}</CodeBlock>
        <InfoCard title="DESIGN RULE">
          Never store raw API keys. Always store the SHA-256 hash. Use{' '}
          <code className="text-primary">InMemoryApiKeyStore</code> for dev,{' '}
          <code className="text-primary">PrismaApiKeyStore</code> for production.
        </InfoCard>
      </Section>

      {/* STEP 4 -- MFA (TOTP) */}
      <Section title="STEP 4 -- MFA (TOTP)">
        <p className="text-sm text-muted-foreground mb-4">
          Add TOTP two-factor auth (RFC 6238). FABRK provides both crypto functions and
          ready-to-use <code className="text-primary">MfaCard</code> /{' '}
          <code className="text-primary">MfaSetupDialog</code> components.
        </p>
        <CodeBlock title="src/app/api/mfa/route.ts">{`import { generateTotpSecret, generateTotpUri, verifyTotp, withAuth } from '@fabrk/auth'
import { authAdapter } from '@/lib/fabrk-auth'

export const POST = withAuth(authAdapter, async (req, session) => {
  const secret = generateTotpSecret()
  const uri = generateTotpUri(secret, session.email!, 'My App')
  return Response.json({ secret, qrCodeUri: uri })
})

export const PUT = withAuth(authAdapter, async (req) => {
  const { code, secret } = await req.json()
  const valid = await verifyTotp(secret, code)
  return valid ? Response.json({ verified: true }) : Response.json({ verified: false }, { status: 400 })
})`}</CodeBlock>
        <CodeBlock title="MFA UI components">{`import { MfaCard, MfaSetupDialog } from '@fabrk/components'

// MfaCard shows 2FA status with enable/disable controls
<MfaCard
  twoFactorEnabled={user.mfaEnabled}
  isEnabling2FA={false} isDisabling2FA={false}
  onEnable2FA={handleEnable} onDisable2FA={handleDisable}
  onViewBackupCodes={() => setShowBackupCodes(true)}
/>

// MfaSetupDialog handles 3-step flow: QR scan > verify code > show backup codes
<MfaSetupDialog
  open={showSetup} onOpenChange={setShowSetup}
  qrCodeUri={mfaData.qrCodeUri} totpSecret={mfaData.secret}
  backupCodes={mfaData.backupCodes}
  onVerify={async (code) => (await fetch('/api/mfa', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, secret: mfaData.secret }),
  })).ok}
  onComplete={() => setUser({ ...user, mfaEnabled: true })}
  renderQrCode={(uri) => <QRCodeSVG value={uri} />}  // optional, keeps qrcode.react out of bundle
/>`}</CodeBlock>
      </Section>

      {/* STEP 5 -- BACKUP CODES */}
      <Section title="STEP 5 -- BACKUP CODES">
        <p className="text-sm text-muted-foreground mb-4">
          Generate single-use recovery codes in <code className="text-primary">XXXX-XXXX</code> format.
          Ambiguous characters (I, O, 0, 1) are excluded for readability.
        </p>
        <CodeBlock title="src/app/api/mfa/backup-codes/route.ts">{`import { generateBackupCodes, hashBackupCodes, verifyBackupCode, withAuth } from '@fabrk/auth'
import { authAdapter } from '@/lib/fabrk-auth'

export const POST = withAuth(authAdapter, async (req, session) => {
  const codes = generateBackupCodes(10)   // ['A3B7-K9M2', 'D5F8-P4R6', ...]
  const hashed = await hashBackupCodes(codes)
  // Store hashed in your database, return raw codes (shown once)
  return Response.json({ codes })
})

export const PUT = withAuth(authAdapter, async (req) => {
  const { code } = await req.json()
  const storedHashes: string[] = []  // load from database
  const { valid, matchedIndex } = await verifyBackupCode(code, storedHashes)
  if (valid) { storedHashes.splice(matchedIndex, 1); /* update db */ }
  return valid ? Response.json({ verified: true }) : Response.json({ verified: false }, { status: 400 })
})`}</CodeBlock>
        <CodeBlock title="BackupCodesModal component">{`import { BackupCodesModal } from '@fabrk/components'

<BackupCodesModal
  open={showCodes} onOpenChange={setShowCodes} codes={codes}
  onRegenerate={async () => {
    const res = await fetch('/api/mfa/backup-codes', { method: 'POST' })
    return (await res.json()).codes
  }}
/>`}</CodeBlock>
      </Section>

      {/* STEP 6 -- MIDDLEWARE */}
      <Section title="STEP 6 -- MIDDLEWARE">
        <p className="text-sm text-muted-foreground mb-4">
          Protect routes with <code className="text-primary">withAuth</code>,{' '}
          <code className="text-primary">withApiKey</code>, or{' '}
          <code className="text-primary">withAuthOrApiKey</code>. Each returns 401 on failure.
        </p>
        <CodeBlock title="src/app/api/protected/route.ts">{`import { withAuth, withApiKey, withAuthOrApiKey } from '@fabrk/auth'
import { authAdapter } from '@/lib/fabrk-auth'

// Session only
export const GET = withAuth(authAdapter, async (req, session) => {
  return Response.json({ user: session.userId, email: session.email })
})

// API key only (checks Authorization: Bearer or X-API-Key header)
export const POST = withApiKey(authAdapter, async (req, keyInfo) => {
  return Response.json({ key: keyInfo.name, scopes: keyInfo.scopes })
}, { requiredScopes: ['write'] })  // missing scopes return 403

// Either session or API key
export const PUT = withAuthOrApiKey(authAdapter, async (req, { session, apiKey }) => {
  if (session) return Response.json({ type: 'session', user: session.userId })
  if (apiKey) return Response.json({ type: 'api-key', key: apiKey.name })
  return Response.json({ error: 'Unreachable' }, { status: 500 })
})`}</CodeBlock>
      </Section>

      {/* STEP 7 -- COMPLETE EXAMPLE */}
      <Section title="COMPLETE EXAMPLE">
        <p className="text-sm text-muted-foreground mb-4">
          Full security settings page combining MFA, backup codes, and session auth.
        </p>
        <CodeBlock title="src/app/settings/security/page.tsx">{`'use client'

import { useState, useEffect } from 'react'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import { MfaCard, MfaSetupDialog, BackupCodesModal } from '@fabrk/components'

export default function SecurityPage() {
  const [user, setUser] = useState<{ id: string; mfaEnabled: boolean } | null>(null)
  const [showMfaSetup, setShowMfaSetup] = useState(false)
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [mfaData, setMfaData] = useState<{
    secret: string; qrCodeUri: string; backupCodes: string[]
  } | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  useEffect(() => { fetch('/api/user').then(r => r.json()).then(setUser) }, [])
  if (!user) return <p className={cn('p-6 text-sm text-muted-foreground', mode.font)}>Loading...</p>

  return (
    <div className="p-6 space-y-6">
      <h1 className={cn('text-xl font-bold uppercase', mode.font)}>SECURITY SETTINGS</h1>
      <MfaCard
        twoFactorEnabled={user.mfaEnabled} isEnabling2FA={false} isDisabling2FA={false}
        onEnable2FA={async () => {
          const data = await (await fetch('/api/mfa', { method: 'POST' })).json()
          setMfaData(data); setShowMfaSetup(true)
        }}
        onDisable2FA={async () => {
          await fetch('/api/mfa/disable', { method: 'POST' }); setUser({ ...user, mfaEnabled: false })
        }}
        onViewBackupCodes={async () => {
          const data = await (await fetch('/api/mfa/backup-codes')).json()
          setBackupCodes(data.codes); setShowBackupCodes(true)
        }}
      />
      {mfaData && <MfaSetupDialog
        open={showMfaSetup} onOpenChange={setShowMfaSetup}
        qrCodeUri={mfaData.qrCodeUri} totpSecret={mfaData.secret} backupCodes={mfaData.backupCodes}
        onVerify={async (code) => (await fetch('/api/mfa', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, secret: mfaData.secret }),
        })).ok}
        onComplete={() => setUser({ ...user, mfaEnabled: true })}
      />}
      <BackupCodesModal
        open={showBackupCodes} onOpenChange={setShowBackupCodes} codes={backupCodes}
        onRegenerate={async () => {
          const data = await (await fetch('/api/mfa/backup-codes', { method: 'POST' })).json()
          setBackupCodes(data.codes); return data.codes
        }}
      />
    </div>
  )
}`}</CodeBlock>
        <CodeBlock title=".env.local">{`NEXTAUTH_SECRET="your-secret-here"  # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."`}</CodeBlock>
        <InfoCard title="NEXT STEPS">
          <ul className="space-y-1 mt-1">
            <li>Add a <a href="/tutorials/dashboard" className="text-primary underline">Dashboard</a> with the dashboard tutorial</li>
            <li>Use <code className="text-primary">PrismaApiKeyStore</code> from <code className="text-primary">@fabrk/store-prisma</code> for persistent key storage</li>
            <li>Add rate limiting with <code className="text-primary">@fabrk/security</code> on auth endpoints</li>
            <li>Enable audit logging to track authentication events</li>
          </ul>
        </InfoCard>
      </Section>
    </DocLayout>
  )
}
