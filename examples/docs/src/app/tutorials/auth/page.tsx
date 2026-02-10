'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

export default function AuthTutorialPage() {
  return (
    <DocLayout
      title="ADD AUTHENTICATION"
      description="Add full authentication to your FABRK app in 7 steps. NextAuth sessions, API keys, MFA with TOTP, backup codes, and route protection. Every code block is copy-paste ready."
    >
      <InfoCard title="WHAT YOU WILL BUILD">
        A complete authentication system with NextAuth session login (GitHub + Google),
        API key generation and validation, two-factor authentication via TOTP with QR codes,
        one-time backup codes for account recovery, and middleware to protect your routes.
        Estimated time: 15 minutes.
      </InfoCard>

      {/* STEP 1 -- SCAFFOLD */}
      <Section title="STEP 1 -- SCAFFOLD">
        <p className="text-sm text-muted-foreground mb-4">
          Use the FABRK CLI to scaffold a new project, then enable authentication
          in your <code className="text-primary">fabrk.config.ts</code>.
        </p>
        <CodeBlock title="terminal">{`npx create-fabrk-app my-app
cd my-app
pnpm install`}</CodeBlock>
        <p className="text-sm text-muted-foreground mt-3 mb-4">
          Open <code className="text-primary">fabrk.config.ts</code> at your project root
          and configure the auth section. This tells FABRK which providers and features to wire up.
        </p>
        <CodeBlock title="fabrk.config.ts">{`import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  app: {
    name: 'My App',
    url: 'http://localhost:3000',
  },
  auth: {
    providers: ['github', 'google'],
    sessionStrategy: 'jwt',
    pages: {
      signIn: '/login',
    },
  },
  security: {
    csrf: true,
    rateLimit: true,
  },
})`}</CodeBlock>
        <InfoCard title="TIP">
          The auth config accepts <code className="text-primary">providers</code>,{' '}
          <code className="text-primary">sessionStrategy</code>, and{' '}
          <code className="text-primary">pages</code> fields.
          All are optional with sensible defaults. You can also add{' '}
          <code className="text-primary">credentials</code> or{' '}
          <code className="text-primary">magic-link</code> providers.
        </InfoCard>
      </Section>

      {/* STEP 2 -- NEXTAUTH SETUP */}
      <Section title="STEP 2 -- NEXTAUTH SETUP">
        <p className="text-sm text-muted-foreground mb-4">
          Create your <code className="text-primary">auth.ts</code> file using{' '}
          <code className="text-primary">createNextAuthAdapter</code>.
          The adapter wraps Auth.js v5 with a unified interface that works with
          all FABRK middleware and utilities.
        </p>
        <CodeBlock title="src/lib/auth.ts">{`import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'

// 1. Create the NextAuth instance (standard Auth.js v5)
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
})`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4 mb-4">
          Now create the FABRK auth adapter. This wraps your NextAuth{' '}
          <code className="text-primary">auth()</code> function so FABRK middleware
          can retrieve sessions, validate API keys, and manage MFA through one interface.
        </p>
        <CodeBlock title="src/lib/fabrk-auth.ts">{`import { createNextAuthAdapter } from '@fabrk/auth'
import { auth } from './auth'

// 2. Wrap with FABRK adapter
export const authAdapter = createNextAuthAdapter({
  authInstance: auth,
  providers: ['github', 'google'],
  sessionStrategy: 'jwt',
})

// Use authAdapter for all FABRK auth operations:
// - authAdapter.getSession(request)
// - authAdapter.validateApiKey(key)
// - authAdapter.createApiKey({ userId, name, scopes })
// - authAdapter.setupMfa(userId)
// - authAdapter.verifyMfa(userId, code)`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4 mb-4">
          Wire up the NextAuth route handler so sign-in and sign-out endpoints work.
        </p>
        <CodeBlock title="src/app/api/auth/[...nextauth]/route.ts">{`import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers`}</CodeBlock>
        <InfoCard title="ADAPTER PATTERN">
          The <code className="text-primary">createNextAuthAdapter</code> returns a unified{' '}
          <code className="text-primary">AuthAdapter</code> interface. You pass your{' '}
          <code className="text-primary">auth()</code> function via{' '}
          <code className="text-primary">authInstance</code> so FABRK can call it for real
          session retrieval. This decouples your app from any specific auth library.
        </InfoCard>
      </Section>

      {/* STEP 3 -- API KEYS */}
      <Section title="STEP 3 -- API KEYS">
        <p className="text-sm text-muted-foreground mb-4">
          Generate and validate API keys for programmatic access.
          Keys use the format <code className="text-primary">prefix_env_random</code> (e.g.,{' '}
          <code className="text-primary">fabrk_live_a1b2c3...</code>) and are hashed with
          SHA-256 before storage. The raw key is only returned once at creation time.
        </p>
        <CodeBlock title="src/app/api/keys/route.ts">{`import { generateApiKey, hashApiKey, createApiKeyValidator } from '@fabrk/auth'
import { authAdapter } from '@/lib/fabrk-auth'
import { withAuth } from '@fabrk/auth'

// POST /api/keys — Create a new API key (requires session)
export const POST = withAuth(authAdapter, async (req, session) => {
  const { name, scopes } = await req.json()

  const result = await authAdapter.createApiKey({
    userId: session.userId,
    name,
    scopes: scopes ?? ['read'],
  })

  // Return the raw key — this is the ONLY time it is visible
  return Response.json({
    id: result.id,
    key: result.key,
    prefix: result.prefix,
    message: 'Save this key securely. It will not be shown again.',
  })
})`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4 mb-4">
          For standalone usage without the full adapter, you can generate and hash keys directly.
        </p>
        <CodeBlock title="standalone api key generation">{`import { generateApiKey, hashApiKey } from '@fabrk/auth'

// Generate a key with custom prefix and environment
const { key, prefix, hash } = await generateApiKey({
  prefix: 'myapp',
  environment: 'live',   // 'live' or 'test'
  keyLength: 32,          // bytes of randomness
})

// key:    "myapp_live_a1b2c3d4e5f6g7h8..."
// prefix: "myapp_live_a1b2c3"  (display prefix)
// hash:   "sha256:..."          (store this in your database)

// To validate later, hash the incoming key and compare:
const incomingHash = await hashApiKey(someKeyFromRequest)
// Look up incomingHash in your database`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4 mb-4">
          Use <code className="text-primary">createApiKeyValidator</code> for scope-based
          permission checking with wildcard support.
        </p>
        <CodeBlock title="api key validation with scopes">{`import { createApiKeyValidator, InMemoryApiKeyStore } from '@fabrk/auth'

// In production, use PrismaApiKeyStore or your own store
const store = new InMemoryApiKeyStore()
const validator = createApiKeyValidator(store)

// Validate a key
const keyInfo = await validator.validate('fabrk_live_abc123...')

if (keyInfo) {
  // Check single scope
  if (validator.hasScope(keyInfo, 'write')) {
    // Authorized for write operations
  }

  // Check multiple scopes
  if (validator.hasAllScopes(keyInfo, ['read', 'write'])) {
    // Authorized for both read and write
  }

  // Wildcard scope '*' grants all permissions
}`}</CodeBlock>
        <InfoCard title="DESIGN RULE">
          Never store raw API keys in your database. Always store the SHA-256 hash.
          The <code className="text-primary">InMemoryApiKeyStore</code> is for development
          only. In production, use a persistent store like{' '}
          <code className="text-primary">PrismaApiKeyStore</code> from{' '}
          <code className="text-primary">@fabrk/store-prisma</code>.
        </InfoCard>
      </Section>

      {/* STEP 4 -- MFA SETUP */}
      <Section title="STEP 4 -- MFA SETUP">
        <p className="text-sm text-muted-foreground mb-4">
          Add two-factor authentication with TOTP (RFC 6238). Users scan a QR code
          with their authenticator app, then verify with a 6-digit code. FABRK provides
          both the crypto functions and ready-to-use UI components.
        </p>
        <CodeBlock title="src/app/api/mfa/setup/route.ts">{`import {
  generateTotpSecret,
  generateTotpUri,
  verifyTotp,
} from '@fabrk/auth'
import { withAuth } from '@fabrk/auth'
import { authAdapter } from '@/lib/fabrk-auth'

// POST /api/mfa/setup — Start MFA enrollment
export const POST = withAuth(authAdapter, async (req, session) => {
  // Generate a TOTP secret (base32 encoded)
  const secret = generateTotpSecret()

  // Generate the otpauth:// URI for QR code display
  const uri = generateTotpUri(secret, session.email!, 'My App')

  // Store the secret temporarily (verify before persisting)
  // In production, store in your database with a "pending" flag

  return Response.json({ secret, qrCodeUri: uri })
})

// POST /api/mfa/verify — Verify a TOTP code
export const PUT = withAuth(authAdapter, async (req, session) => {
  const { code, secret } = await req.json()

  // Verify the 6-digit code against the secret
  // Checks current time step +/- 1 for clock skew tolerance
  const valid = await verifyTotp(secret, code)

  if (valid) {
    // Mark MFA as enabled for this user in your database
    return Response.json({ verified: true })
  }

  return Response.json({ verified: false }, { status: 400 })
})`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4 mb-4">
          Use the <code className="text-primary">MfaSetupDialog</code> and{' '}
          <code className="text-primary">MfaCard</code> components from{' '}
          <code className="text-primary">@fabrk/components</code> for a complete
          MFA management UI. The dialog handles the 3-step flow: QR scan, code verification,
          and backup code display.
        </p>
        <CodeBlock title="src/app/settings/security.tsx">{`'use client'

import { useState } from 'react'
import { MfaCard, MfaSetupDialog } from '@fabrk/components'

export function SecuritySettings({ user }: { user: { mfaEnabled: boolean } }) {
  const [showSetup, setShowSetup] = useState(false)
  const [mfaData, setMfaData] = useState<{
    secret: string
    qrCodeUri: string
    backupCodes: string[]
  } | null>(null)

  const handleEnableMfa = async () => {
    // Call your API to generate TOTP secret
    const res = await fetch('/api/mfa/setup', { method: 'POST' })
    const data = await res.json()
    setMfaData({
      secret: data.secret,
      qrCodeUri: data.qrCodeUri,
      backupCodes: data.backupCodes ?? [],
    })
    setShowSetup(true)
  }

  const handleVerify = async (code: string): Promise<boolean> => {
    const res = await fetch('/api/mfa/verify', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, secret: mfaData?.secret }),
    })
    return res.ok
  }

  return (
    <>
      {/* MfaCard — shows current 2FA status with enable/disable controls */}
      <MfaCard
        twoFactorEnabled={user.mfaEnabled}
        isEnabling2FA={false}
        isDisabling2FA={false}
        onEnable2FA={handleEnableMfa}
        onDisable2FA={() => fetch('/api/mfa/disable', { method: 'POST' })}
        onViewBackupCodes={() => {/* open backup codes modal */}}
      />

      {/* MfaSetupDialog — 3-step enrollment: QR > verify > backup codes */}
      {mfaData && (
        <MfaSetupDialog
          open={showSetup}
          onOpenChange={setShowSetup}
          qrCodeUri={mfaData.qrCodeUri}
          totpSecret={mfaData.secret}
          backupCodes={mfaData.backupCodes}
          onVerify={handleVerify}
          onComplete={() => {
            // Refresh user data to show MFA as enabled
            window.location.reload()
          }}
        />
      )}
    </>
  )
}`}</CodeBlock>
        <InfoCard title="RENDER PROPS FOR OPTIONAL DEPS">
          The <code className="text-primary">MfaSetupDialog</code> accepts a{' '}
          <code className="text-primary">renderQrCode</code> render prop for the QR code display.
          This keeps the QR code library (like <code className="text-primary">qrcode.react</code>)
          as an optional dependency instead of bundling it.
          Pass <code className="text-primary">{`renderQrCode={(uri) => <QRCodeSVG value={uri} />}`}</code> to
          use your preferred QR library.
        </InfoCard>
      </Section>

      {/* STEP 5 -- BACKUP CODES */}
      <Section title="STEP 5 -- BACKUP CODES">
        <p className="text-sm text-muted-foreground mb-4">
          Generate one-time-use backup codes for account recovery when a user loses
          access to their authenticator app. Codes use the{' '}
          <code className="text-primary">XXXX-XXXX</code> format with ambiguous characters
          (I, O, 0, 1) removed for readability.
        </p>
        <CodeBlock title="src/app/api/mfa/backup-codes/route.ts">{`import {
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
} from '@fabrk/auth'
import { withAuth } from '@fabrk/auth'
import { authAdapter } from '@/lib/fabrk-auth'

// POST /api/mfa/backup-codes — Generate backup codes
export const POST = withAuth(authAdapter, async (req, session) => {
  // Generate 10 backup codes (format: XXXX-XXXX)
  const codes = generateBackupCodes(10)
  // e.g. ['A3B7-K9M2', 'D5F8-P4R6', ...]

  // Hash all codes with SHA-256 for storage
  const hashedCodes = await hashBackupCodes(codes)

  // Store hashedCodes in your database for this user
  // await db.user.update({ where: { id: session.userId },
  //   data: { backupCodes: hashedCodes } })

  // Return the raw codes — user saves these (shown only once)
  return Response.json({ codes })
})

// POST /api/mfa/backup-codes/verify — Verify a backup code
export const PUT = withAuth(authAdapter, async (req, session) => {
  const { code } = await req.json()

  // Retrieve stored hashed codes from your database
  const storedHashes: string[] = [] // await db.user...

  // Verify the submitted code
  const { valid, matchedIndex } = await verifyBackupCode(code, storedHashes)

  if (valid) {
    // Remove the used code (each code is single-use)
    storedHashes.splice(matchedIndex, 1)
    // Update the database with remaining codes
    // await db.user.update(...)

    return Response.json({ verified: true, remaining: storedHashes.length })
  }

  return Response.json({ verified: false }, { status: 400 })
})`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4 mb-4">
          Use the <code className="text-primary">BackupCodesModal</code> component to display
          codes with copy, download, and regenerate actions.
        </p>
        <CodeBlock title="backup codes modal usage">{`'use client'

import { useState } from 'react'
import { BackupCodesModal } from '@fabrk/components'

export function BackupCodesButton({ codes }: { codes: string[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}>&gt; VIEW BACKUP CODES</button>

      <BackupCodesModal
        open={open}
        onOpenChange={setOpen}
        codes={codes}
        onRegenerate={async () => {
          // Call your API to generate new codes
          const res = await fetch('/api/mfa/backup-codes', { method: 'POST' })
          const data = await res.json()
          return data.codes
        }}
        onCopySuccess={(msg) => console.log(msg)}
        onError={(msg) => console.error(msg)}
      />
    </>
  )
}`}</CodeBlock>
        <InfoCard title="DESIGN RULE">
          Backup codes use <code className="text-primary">ABCDEFGHJKLMNPQRSTUVWXYZ23456789</code> --
          the characters I, O, 0, and 1 are excluded to prevent user confusion.
          Each code is single-use. The caller is responsible for removing used codes
          from storage after verification.
        </InfoCard>
      </Section>

      {/* STEP 6 -- MIDDLEWARE */}
      <Section title="STEP 6 -- MIDDLEWARE">
        <p className="text-sm text-muted-foreground mb-4">
          Protect your API routes with <code className="text-primary">withAuth</code>,{' '}
          <code className="text-primary">withApiKey</code>, and{' '}
          <code className="text-primary">withAuthOrApiKey</code> middleware.
          Each wraps a route handler and returns a 401 if authentication fails.
        </p>
        <CodeBlock title="src/app/api/protected/route.ts">{`import { withAuth, withApiKey, withAuthOrApiKey } from '@fabrk/auth'
import { authAdapter } from '@/lib/fabrk-auth'

// Session-only: requires a valid NextAuth session
export const GET = withAuth(authAdapter, async (req, session) => {
  // session.userId, session.email, session.name are available
  return Response.json({
    user: session.userId,
    email: session.email,
  })
})

// API key only: requires a valid API key in headers
// Looks for Authorization: Bearer <key> or X-API-Key: <key>
export const POST = withApiKey(
  authAdapter,
  async (req, keyInfo) => {
    // keyInfo.id, keyInfo.name, keyInfo.scopes are available
    return Response.json({
      key: keyInfo.name,
      scopes: keyInfo.scopes,
    })
  },
  { requiredScopes: ['write'] }  // Require specific scopes
)

// Either session OR API key: accepts both authentication methods
export const PUT = withAuthOrApiKey(authAdapter, async (req, { session, apiKey }) => {
  if (session) {
    return Response.json({ type: 'session', user: session.userId })
  }
  if (apiKey) {
    return Response.json({ type: 'api-key', key: apiKey.name })
  }
  // This never executes — middleware returns 401 if neither is present
  return Response.json({ error: 'Unreachable' }, { status: 500 })
})`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4 mb-4">
          Here is how clients send API keys in requests.
        </p>
        <CodeBlock title="client usage">{`// Option 1: Authorization header (recommended)
fetch('/api/protected', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer fabrk_live_a1b2c3d4...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ data: 'hello' }),
})

// Option 2: X-API-Key header
fetch('/api/protected', {
  method: 'POST',
  headers: {
    'X-API-Key': 'fabrk_live_a1b2c3d4...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ data: 'hello' }),
})`}</CodeBlock>
        <InfoCard title="TIP">
          The <code className="text-primary">withApiKey</code> middleware checks the{' '}
          <code className="text-primary">Authorization: Bearer</code> header first,
          then falls back to <code className="text-primary">X-API-Key</code>.
          Scope checking supports wildcards: a key with scope{' '}
          <code className="text-primary">*</code> passes all scope checks.
          If a required scope is missing, the middleware returns 403 (Forbidden)
          instead of 401 (Unauthorized).
        </InfoCard>
      </Section>

      {/* COMPLETE EXAMPLE */}
      <Section title="COMPLETE EXAMPLE">
        <p className="text-sm text-muted-foreground mb-4">
          Here is a full authentication settings page combining session auth, MFA management,
          and backup codes into a single file. Copy this for a complete working security page.
        </p>
        <CodeBlock title="src/app/settings/security/page.tsx">{`'use client'

import { useState, useEffect } from 'react'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import { MfaCard, MfaSetupDialog, BackupCodesModal } from '@fabrk/components'

interface User {
  id: string
  email: string
  name: string
  mfaEnabled: boolean
}

export default function SecurityPage() {
  const [user, setUser] = useState<User | null>(null)
  const [showMfaSetup, setShowMfaSetup] = useState(false)
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [mfaData, setMfaData] = useState<{
    secret: string
    qrCodeUri: string
    backupCodes: string[]
  } | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  useEffect(() => {
    // Fetch current user
    fetch('/api/user').then((r) => r.json()).then(setUser)
  }, [])

  if (!user) {
    return (
      <div className="p-6">
        <p className={cn('text-sm text-muted-foreground', mode.font)}>
          Loading...
        </p>
      </div>
    )
  }

  const handleEnableMfa = async () => {
    const res = await fetch('/api/mfa/setup', { method: 'POST' })
    const data = await res.json()
    setMfaData(data)
    setShowMfaSetup(true)
  }

  const handleDisableMfa = async () => {
    await fetch('/api/mfa/disable', { method: 'POST' })
    setUser({ ...user, mfaEnabled: false })
  }

  const handleVerifyMfa = async (code: string): Promise<boolean> => {
    const res = await fetch('/api/mfa/verify', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, secret: mfaData?.secret }),
    })
    return res.ok
  }

  const handleViewBackupCodes = async () => {
    const res = await fetch('/api/mfa/backup-codes')
    const data = await res.json()
    setBackupCodes(data.codes)
    setShowBackupCodes(true)
  }

  const handleRegenerateCodes = async (): Promise<string[]> => {
    const res = await fetch('/api/mfa/backup-codes', { method: 'POST' })
    const data = await res.json()
    setBackupCodes(data.codes)
    return data.codes
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className={cn('text-xl font-bold uppercase', mode.font)}>
          SECURITY SETTINGS
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your authentication and two-factor security.
        </p>
      </div>

      {/* MFA Card — shows 2FA status with enable/disable controls */}
      <MfaCard
        twoFactorEnabled={user.mfaEnabled}
        isEnabling2FA={false}
        isDisabling2FA={false}
        onEnable2FA={handleEnableMfa}
        onDisable2FA={handleDisableMfa}
        onViewBackupCodes={handleViewBackupCodes}
      />

      {/* MFA Setup Dialog — 3-step flow: QR > verify > backup */}
      {mfaData && (
        <MfaSetupDialog
          open={showMfaSetup}
          onOpenChange={setShowMfaSetup}
          qrCodeUri={mfaData.qrCodeUri}
          totpSecret={mfaData.secret}
          backupCodes={mfaData.backupCodes}
          onVerify={handleVerifyMfa}
          onComplete={() => setUser({ ...user, mfaEnabled: true })}
        />
      )}

      {/* Backup Codes Modal — view, copy, download, regenerate */}
      <BackupCodesModal
        open={showBackupCodes}
        onOpenChange={setShowBackupCodes}
        codes={backupCodes}
        onRegenerate={handleRegenerateCodes}
      />
    </div>
  )
}`}</CodeBlock>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-6 mb-3', mode.font)}>
          ENVIRONMENT VARIABLES
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Set these environment variables for your auth providers.
        </p>
        <CodeBlock title=".env.local">{`# NextAuth
NEXTAUTH_SECRET="your-secret-here"  # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Database (for persistent stores)
DATABASE_URL="postgresql://..."`}</CodeBlock>

        <InfoCard title="NEXT STEPS">
          <ul className="space-y-1 mt-1">
            <li>Add a <a href="/tutorials/dashboard" className="text-primary underline">Dashboard</a> with the dashboard tutorial</li>
            <li>Use <code className="text-primary">PrismaApiKeyStore</code> from <code className="text-primary">@fabrk/store-prisma</code> for persistent API key storage</li>
            <li>Add rate limiting with <code className="text-primary">@fabrk/security</code> to protect auth endpoints</li>
            <li>Enable CSRF protection in your <code className="text-primary">fabrk.config.ts</code> security section</li>
            <li>Add audit logging to track authentication events</li>
          </ul>
        </InfoCard>
      </Section>
    </DocLayout>
  )
}
