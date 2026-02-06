# FABRK Framework

> The first UI framework designed for AI coding agents

FABRK is a production-ready framework that enables AI coding assistants (Claude Code, Cursor, GitHub Copilot, v0.dev) to build full-stack applications in minutes using pre-built components, AI tooling, and a terminal-inspired design system.

## Why FABRK?

**Problem:**
- Human: "Build me a dashboard"
- AI: *Writes 500 lines of custom components from scratch*
- Result: 30 minutes, inconsistent design, no cost tracking

**With FABRK:**
- Human: "Build me a dashboard"
- AI: *Imports 5 components from @fabrk*
- Result: 2 minutes, consistent design, built-in features

## Features

- **70+ Components** - Importable UI primitives and charts
- **AI Toolkit** - Cost tracking, validation, testing for AI APIs
- **18 Terminal Themes** - Consistent design system
- **Multi-Provider Support** - Stripe, Polar, Lemonsqueezy
- **Type-Safe** - Full TypeScript support
- **Zero Config** - Works out of the box

## Quick Start

```bash
npx create-fabrk-app my-app
cd my-app
npm install
npm run dev
```

## Packages

- `@fabrk/core` - Framework runtime and hooks
- `@fabrk/components` - 70+ UI components
- `@fabrk/ai` - AI development toolkit
- `@fabrk/design-system` - Themes and tokens
- `@fabrk/config` - Type-safe configuration
- `create-fabrk-app` - CLI scaffolding tool

## Templates

- **basic** - Minimal starter (components + design system)
- **ai-saas** - Full AI SaaS (cost tracking, validation)
- **dashboard** - Admin dashboard (charts, metrics)

## For AI Agents

FABRK is designed to be used by AI coding assistants. Each package includes `AGENTS.md` context files that document:

- All components with props and usage
- Design system rules and patterns
- Hooks and API surface
- Code examples

## License

MIT

## Links

- [Documentation](https://fabrk.dev)
- [Examples](https://github.com/fabrk-framework/examples)
- [Discord](https://discord.gg/fabrk)
