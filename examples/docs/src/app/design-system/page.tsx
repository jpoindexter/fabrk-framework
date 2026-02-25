'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import { DocLayout, Section, CodeBlock } from '@/components/doc-layout'

const COLOR_TOKENS = [
  { token: 'background', class: 'bg-background', label: 'BACKGROUND' },
  { token: 'foreground', class: 'bg-foreground', label: 'FOREGROUND' },
  { token: 'card', class: 'bg-card', label: 'CARD' },
  { token: 'card-foreground', class: 'bg-card-foreground', label: 'CARD FG' },
  { token: 'primary', class: 'bg-primary', label: 'PRIMARY' },
  { token: 'primary-foreground', class: 'bg-primary-foreground', label: 'PRIMARY FG' },
  { token: 'secondary', class: 'bg-secondary', label: 'SECONDARY' },
  { token: 'secondary-foreground', class: 'bg-secondary-foreground', label: 'SECONDARY FG' },
  { token: 'muted', class: 'bg-muted', label: 'MUTED' },
  { token: 'muted-foreground', class: 'bg-muted-foreground', label: 'MUTED FG' },
  { token: 'accent', class: 'bg-accent', label: 'ACCENT' },
  { token: 'accent-foreground', class: 'bg-accent-foreground', label: 'ACCENT FG' },
  { token: 'destructive', class: 'bg-destructive', label: 'DESTRUCTIVE' },
  { token: 'border', class: 'bg-border', label: 'BORDER' },
  { token: 'input', class: 'bg-input', label: 'INPUT' },
  { token: 'ring', class: 'bg-ring', label: 'RING' },
]

const TEXT_TOKENS = [
  { class: 'text-foreground', label: 'text-foreground', example: 'Primary text' },
  { class: 'text-muted-foreground', label: 'text-muted-foreground', example: 'Secondary / helper text' },
  { class: 'text-primary', label: 'text-primary', example: 'Accent / highlight text' },
  { class: 'text-destructive', label: 'text-destructive', example: 'Error / danger text' },
  { class: 'text-card-foreground', label: 'text-card-foreground', example: 'Inside card surfaces' },
]

const TYPOGRAPHY_SCALE = [
  { label: 'H1 PAGE TITLE', class: 'text-2xl font-bold uppercase', example: 'THE FIRST UI FRAMEWORK' },
  { label: 'H2 SECTION', class: 'text-lg font-semibold uppercase', example: '[GETTING STARTED]' },
  { label: 'H3 SUBSECTION', class: 'text-sm font-semibold uppercase', example: '[INSTALL]' },
  { label: 'BODY', class: 'text-sm', example: 'Stop generating 500 lines of custom components.' },
  { label: 'SMALL / HELPER', class: 'text-xs text-muted-foreground', example: 'Optional helper text shown below inputs' },
  { label: 'CODE', class: 'text-xs font-mono', example: 'import { Button } from "@fabrk/components"' },
  { label: 'LABEL / BADGE', class: 'text-xs font-bold uppercase', example: '[ACTIVE]   [STATUS]   [v0.2.0]' },
  { label: 'BUTTON', class: 'text-xs font-bold uppercase', example: '> SUBMIT   > GET STARTED   > SAVE CHANGES' },
]

const BORDER_RULES = [
  {
    rule: 'Full border → always add mode.radius',
    correct: '<Card className={cn("border border-border", mode.radius)}>',
    wrong: '<Card className="border border-border rounded-lg">',
  },
  {
    rule: 'Partial border → NEVER add mode.radius',
    correct: '<div className="border-t border-border">',
    wrong: '<div className={cn("border-t border-border", mode.radius)}>',
  },
  {
    rule: 'Table cells → NEVER add mode.radius',
    correct: '<td className="px-3 py-2 border-b border-border">',
    wrong: '<td className={cn("px-3 py-2", mode.radius)}>',
  },
  {
    rule: 'Switch/toggle → always rounded-full',
    correct: '<span className="rounded-full">',
    wrong: '<span className={cn(mode.radius)}>',
  },
]

const CONVENTIONS = [
  { element: 'UI Labels / Badges', casing: 'UPPERCASE in brackets', example: '[ACTIVE]  [STATUS]  [v0.2.0]  [ON THIS PAGE]' },
  { element: 'Buttons', casing: 'UPPERCASE with > prefix', example: '> SUBMIT  > GET STARTED  > SAVE CHANGES' },
  { element: 'H1 / H2 Headlines', casing: 'UPPERCASE', example: 'THE FIRST UI FRAMEWORK' },
  { element: 'Body text', casing: 'Normal sentence case', example: 'Get started by installing the package.' },
  { element: 'Error messages', casing: 'Normal sentence case', example: 'Something went wrong. Please try again.' },
]

export default function DesignSystemPage() {
  return (
    <DocLayout
      title="DESIGN SYSTEM"
      description="Token-driven, theme-aware design system. 18 themes, runtime switching via CSS variables, and a terminal-inspired aesthetic. Never hardcode colors."
    >
      {/* Color Tokens */}
      <Section id="colors" title="COLOR TOKENS">
        <p className="text-sm text-muted-foreground mb-6">
          All colors come from semantic CSS variables. Never use Tailwind color utilities like{' '}
          <code className="text-primary text-xs">bg-blue-500</code> — always use tokens so components
          adapt to theme switching.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {COLOR_TOKENS.map((t) => (
            <div key={t.token} className={cn('border border-border overflow-hidden', mode.radius)}>
              <div className={cn('h-10', t.class)} />
              <div className="px-2 py-1.5 bg-card">
                <div className={cn('text-xs font-bold text-foreground', mode.font)}>{t.label}</div>
                <div className="text-xs text-muted-foreground font-mono">{t.token}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <div className={cn('text-xs font-bold text-muted-foreground uppercase mb-2', mode.font)}>
            TEXT COLORS
          </div>
          <div className={cn('border border-border bg-card divide-y divide-border', mode.radius)}>
            {TEXT_TOKENS.map((t) => (
              <div key={t.class} className="flex items-center justify-between px-4 py-2">
                <span className={cn('text-sm', t.class)}>{t.example}</span>
                <code className="text-xs text-muted-foreground font-mono">{t.label}</code>
              </div>
            ))}
          </div>
        </div>

        <CodeBlock title="CORRECT — always use semantic tokens">{`// ✅ Adapts to all 18 themes
className="bg-primary text-primary-foreground"
className="bg-card border-border"
className="text-muted-foreground"

// ❌ Hardcoded — breaks theme switching
className="bg-blue-500 text-white"
className="bg-gray-100 text-gray-900"`}</CodeBlock>
      </Section>

      {/* Typography */}
      <Section id="typography" title="TYPOGRAPHY SCALE">
        <p className="text-sm text-muted-foreground mb-6">
          Terminal aesthetic uses monospace font via <code className="text-primary text-xs">mode.font</code>.
          Apply it to headings, labels, buttons, and badge text. Body text uses the default sans-serif.
        </p>
        <div className={cn('border border-border bg-card divide-y divide-border mb-6', mode.radius)}>
          {TYPOGRAPHY_SCALE.map((t) => (
            <div key={t.label} className="px-4 py-3 flex items-baseline justify-between gap-4">
              <span className={cn(t.class, t.label.startsWith('H') || t.label === 'LABEL / BADGE' || t.label === 'BUTTON' ? mode.font : '')}>{t.example}</span>
              <code className="text-xs text-muted-foreground font-mono shrink-0">{t.label}</code>
            </div>
          ))}
        </div>
        <CodeBlock title="FONT USAGE">{`import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'

// Headlines + labels → mode.font (monospace)
<h1 className={cn("text-2xl font-bold uppercase", mode.font)}>
  PAGE TITLE
</h1>

// Badges + status labels
<span className={cn("text-xs uppercase", mode.font)}>[ACTIVE]</span>

// Body text → no mode.font needed (default sans)
<p className="text-sm text-muted-foreground">
  Description text here.
</p>`}</CodeBlock>
      </Section>

      {/* mode object */}
      <Section id="mode" title="THE MODE OBJECT">
        <p className="text-sm text-muted-foreground mb-4">
          <code className="text-primary text-xs">mode</code> from{' '}
          <code className="text-primary text-xs">@fabrk/design-system</code> is the primary interface
          for theme-aware styling. It exposes Tailwind class strings that update with the active theme.
        </p>
        <div className={cn('border border-border bg-card divide-y divide-border mb-6', mode.radius)}>
          {[
            { key: 'mode.radius', value: mode.radius || 'rounded-none', desc: 'Border radius — apply to every full-border element' },
            { key: 'mode.font', value: mode.font || 'font-mono', desc: 'Font family — apply to headings, labels, buttons' },
            { key: 'mode.textTransform', value: mode.textTransform || 'uppercase', desc: 'Text transform — uppercase for terminal aesthetic' },
          ].map((item) => (
            <div key={item.key} className="px-4 py-3 grid grid-cols-3 gap-2">
              <code className={cn('text-xs text-primary', mode.font)}>{item.key}</code>
              <code className="text-xs text-foreground font-mono">{item.value}</code>
              <span className="text-xs text-muted-foreground">{item.desc}</span>
            </div>
          ))}
        </div>
        <CodeBlock title="IMPORT">{`import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'

// Full border card — needs mode.radius
<div className={cn("border border-border bg-card p-4", mode.radius)}>

// Heading — needs mode.font
<h2 className={cn("text-lg font-bold uppercase", mode.font)}>
  [SECTION TITLE]
</h2>

// Button — needs both
<button className={cn(
  "border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs font-bold uppercase",
  mode.font, mode.radius
)}>
  {'>'} SUBMIT
</button>`}</CodeBlock>
      </Section>

      {/* Border Rules */}
      <Section id="borders" title="BORDER & RADIUS RULES">
        <p className="text-sm text-muted-foreground mb-4">
          The most common source of visual bugs. Follow these rules exactly.
        </p>
        <div className="space-y-4 mb-6">
          {BORDER_RULES.map((r) => (
            <div key={r.rule} className={cn('border border-border bg-card p-4', mode.radius)}>
              <div className={cn('text-xs font-bold text-foreground mb-3', mode.font)}>
                {r.rule}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">✅ CORRECT</div>
                  <pre className="text-xs text-primary bg-primary/5 border border-primary/20 p-2 overflow-x-auto">{r.correct}</pre>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">❌ WRONG</div>
                  <pre className="text-xs text-destructive bg-destructive/5 border border-destructive/20 p-2 overflow-x-auto">{r.wrong}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Terminal Conventions */}
      <Section id="conventions" title="TERMINAL CONVENTIONS">
        <p className="text-sm text-muted-foreground mb-4">
          FABRK uses a consistent terminal-inspired text style. Apply these conventions
          to all UI text, labels, and interactive elements.
        </p>
        <div className={cn('border border-border bg-card divide-y divide-border mb-6', mode.radius)}>
          <div className="grid grid-cols-3 px-4 py-2 bg-muted">
            <span className={cn('text-xs font-bold text-muted-foreground uppercase', mode.font)}>ELEMENT</span>
            <span className={cn('text-xs font-bold text-muted-foreground uppercase', mode.font)}>RULE</span>
            <span className={cn('text-xs font-bold text-muted-foreground uppercase', mode.font)}>EXAMPLE</span>
          </div>
          {CONVENTIONS.map((c) => (
            <div key={c.element} className="grid grid-cols-3 px-4 py-3 gap-2">
              <span className="text-xs text-foreground">{c.element}</span>
              <span className="text-xs text-muted-foreground">{c.casing}</span>
              <code className={cn('text-xs text-primary', mode.font)}>{c.example}</code>
            </div>
          ))}
        </div>
        <div className={cn('border border-border bg-card p-4', mode.radius)}>
          <div className={cn('text-xs font-bold text-muted-foreground mb-3', mode.font)}>NEVER USE UNDERSCORES IN UI TEXT</div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-muted-foreground mb-1">✅ CORRECT</div>
              <div className={cn('text-primary space-y-1', mode.font)}>
                <div>[API KEY]</div>
                <div>[LAST SEEN]</div>
                <div>[CREATED AT]</div>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">❌ WRONG</div>
              <div className={cn('text-destructive space-y-1', mode.font)}>
                <div>[api_key]</div>
                <div>[last_seen]</div>
                <div>[created_at]</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Themes */}
      <Section id="themes" title="18 THEMES">
        <p className="text-sm text-muted-foreground mb-6">
          All themes use the same semantic CSS variables. Switch themes at runtime with{' '}
          <code className="text-primary text-xs">setColorTheme()</code> from{' '}
          <code className="text-primary text-xs">useThemeContext()</code>.
          Use the theme switcher in the sidebar to preview any theme on this page right now.
        </p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { group: 'CRT', themes: ['green', 'amber', 'blue', 'red', 'purple'] },
            { group: 'RETRO', themes: ['gameboy', 'c64', 'gbpocket', 'vic20', 'atari', 'spectrum'] },
            { group: 'FUTURE', themes: ['cyberpunk', 'phosphor', 'holographic', 'navigator', 'blueprint', 'infrared'] },
            { group: 'LIGHT', themes: ['bw'] },
          ].map((group) => (
            <div key={group.group} className={cn('border border-border bg-card p-3', mode.radius)}>
              <div className={cn('text-xs font-bold text-muted-foreground mb-2', mode.font)}>
                [{group.group}]
              </div>
              <div className="space-y-0.5">
                {group.themes.map((t) => (
                  <div key={t} className={cn('text-xs text-foreground', mode.font)}>
                    {t.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <CodeBlock title="THEME USAGE">{`import { useThemeContext } from '@fabrk/design-system'

function MyComponent() {
  const { colorTheme, setColorTheme } = useThemeContext()

  return (
    <button onClick={() => setColorTheme('cyberpunk')}>
      Switch to CYBERPUNK
    </button>
  )
}

// Wrap your app in ThemeWrapper (already done in layout.tsx)
// Theme persists to localStorage via storageKey`}</CodeBlock>
      </Section>

      {/* Do / Don't */}
      <Section id="rules" title="QUICK REFERENCE">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={cn('border border-border bg-card p-4', mode.radius)}>
            <div className={cn('text-xs font-bold text-primary mb-3', mode.font)}>✅ ALWAYS</div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>Use semantic tokens: <code className="text-foreground">bg-primary</code>, <code className="text-foreground">text-foreground</code></li>
              <li>Add <code className="text-foreground">mode.radius</code> to full-border elements</li>
              <li>Add <code className="text-foreground">mode.font</code> to headings, labels, buttons</li>
              <li>UPPERCASE button text with <code className="text-foreground">{'>'}</code> prefix</li>
              <li>UPPERCASE labels in <code className="text-foreground">[BRACKETS]</code></li>
              <li>Use spaces in labels: <code className="text-foreground">[API KEY]</code></li>
            </ul>
          </div>
          <div className={cn('border border-border bg-card p-4', mode.radius)}>
            <div className={cn('text-xs font-bold text-destructive mb-3', mode.font)}>❌ NEVER</div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>Hardcode colors: <code className="text-destructive">bg-blue-500</code>, <code className="text-destructive">text-white</code></li>
              <li>Add <code className="text-destructive">mode.radius</code> to partial borders or table cells</li>
              <li>Use <code className="text-destructive">rounded-lg</code> directly (bypass mode.radius)</li>
              <li>Use underscores in UI text: <code className="text-destructive">[api_key]</code></li>
              <li>Mix theme tokens: <code className="text-destructive">bg-green-900</code> with semantic tokens</li>
            </ul>
          </div>
        </div>
      </Section>
    </DocLayout>
  )
}
