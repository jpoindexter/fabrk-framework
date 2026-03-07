/**
 * Code templates and shared constants for scaffold generation.
 */

// CONSTANTS

export interface TemplateChoice {
  title: string;
  value: string;
  description: string;
}

export const TEMPLATES: TemplateChoice[] = [
  { title: 'Basic', value: 'basic', description: 'Minimal setup with core components' },
  { title: 'AI SaaS', value: 'ai-saas', description: 'Full AI features with cost tracking and validation' },
  { title: 'Dashboard', value: 'dashboard', description: 'Analytics-focused with charts and KPIs' },
];

export const AVAILABLE_THEMES = ['terminal', 'swiss'] as const;

export const FEATURE_MODULES = ['auth', 'payments', 'email', 'storage', 'security', 'ai'] as const;

// CODE TEMPLATES

export function generateComponentTemplate(name: string): string {
  return `'use client'

import { cn } from '@fabrk/core'

export interface ${name}Props {
  className?: string
  children?: React.ReactNode
}

export function ${name}({ className, children }: ${name}Props) {
  return (
    <div
      className={cn(
        'border border-border bg-card p-4',
        className
      )}
    >
      {children}
    </div>
  )
}
`;
}

export function generatePageTemplate(name: string): string {
  return `export default function ${name}Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold tracking-tight">
        ${name.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
      </h1>
    </main>
  )
}
`;
}

export function generateApiTemplate(name: string): string {
  return `import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: '${name} endpoint',
  })
}

export async function POST(request: Request) {
  const body = await request.json()

  return NextResponse.json({
    message: '${name} created',
    data: body,
  })
}
`;
}

export function generateThemeCSS(theme: string): string {
  if (theme === 'terminal') {
    return `/* FABRK Terminal Theme */
@import "tailwindcss";

:root {
  --background: 0 0% 3%;
  --foreground: 120 100% 80%;
  --card: 0 0% 6%;
  --card-foreground: 120 60% 70%;
  --popover: 0 0% 8%;
  --popover-foreground: 120 100% 80%;
  --primary: 120 100% 50%;
  --primary-foreground: 0 0% 0%;
  --secondary: 0 0% 12%;
  --secondary-foreground: 120 60% 70%;
  --muted: 0 0% 12%;
  --muted-foreground: 120 20% 50%;
  --accent: 270 60% 60%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --success: 120 100% 40%;
  --success-foreground: 0 0% 0%;
  --warning: 45 100% 50%;
  --warning-foreground: 0 0% 0%;
  --info: 200 100% 50%;
  --info-foreground: 0 0% 0%;
  --border: 120 20% 20%;
  --input: 0 0% 12%;
  --ring: 120 100% 50%;
  --radius: 0px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}
`;
  }

  // Swiss theme
  return `/* FABRK Swiss Theme */
@import "tailwindcss";

:root {
  --background: 0 0% 98%;
  --foreground: 0 0% 12%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 12%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 12%;
  --primary: 0 0% 12%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 94%;
  --secondary-foreground: 0 0% 12%;
  --muted: 0 0% 94%;
  --muted-foreground: 0 0% 50%;
  --accent: 0 84% 60%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --success: 142 72% 40%;
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%;
  --warning-foreground: 0 0% 0%;
  --info: 217 91% 60%;
  --info-foreground: 0 0% 100%;
  --border: 0 0% 88%;
  --input: 0 0% 94%;
  --ring: 0 0% 12%;
  --radius: 4px;
  font-family: 'Helvetica Neue', 'Arial', sans-serif;
}
`;
}

export function generateAIRules(root: string, manifest: object): string {
  const m = manifest as { name: string; packages: string[]; features: Record<string, boolean>; components: string[]; pages: string[] };
  const enabledFeatures = Object.entries(m.features)
    .filter(([_, v]) => v)
    .map(([k]) => k);

  return `# CLAUDE.md — ${m.name}

## Project Overview
This is a FABRK application built with the modular React meta-framework.

## Stack
- **Framework:** FABRK (wraps Next.js)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS + Design Tokens
- **FABRK Packages:** ${m.packages.join(', ') || 'none'}
- **Features:** ${enabledFeatures.join(', ') || 'none'}

## Commands
\`\`\`bash
fabrk dev          # Start dev server
fabrk build        # Production build
fabrk add <comp>   # Add UI components
fabrk lint         # Check design compliance
\`\`\`

## Design Rules
- Use design tokens only (bg-primary, text-foreground, border-border)
- No hardcoded colors (bg-blue-500, text-gray-100)
- Full borders get mode.radius, partial borders never get radius
- Labels: UPPERCASE in brackets [SECTION]
- Buttons: UPPERCASE with > prefix
- Headlines: UPPERCASE

## Key Files
- \`fabrk.config.ts\` — Framework configuration (single source of truth)
- \`src/components/ui/\` — UI components
- \`src/app/\` — Pages and API routes

## Components (${m.components.length})
${m.components.slice(0, 20).map(c => `- ${c}`).join('\n')}
${m.components.length > 20 ? `\n... and ${m.components.length - 20} more` : ''}

## Pages (${m.pages.length})
${m.pages.map(p => `- ${p}`).join('\n')}
`;
}
