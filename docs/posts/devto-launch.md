---
title: i spent 15 years in ux, relearned dev with ai, and built a framework because ai keeps generating inconsistent code
published: false
description: how a ux designer with zero framework experience used claude code to build 13 npm packages, 109+ components, and an entire vite 7 runtime over a few months of sporadic hacking
tags: react, typescript, ai, opensource
canonical_url:
cover_image:
---

## some context on me

i spent about 15 years doing ux and product design at companies like apple and google. last year i decided to actually get back into development seriously. ive done some coding before but never at a professional level, and i figured with ai coding agents (claude code, cursor etc) the barrier to building real stuff was lower than ever.

i was right about that. but i noticed something that kept bugging me.

## the inconsistency problem

ai generated code is wildly inconsistent. and i dont mean buggy, i mean *inconsistent*. ask an ai agent to build you a dashboard on monday, you get one version with one set of patterns. ask it on tuesday, completely different structure. different component architecture. different styling approach. random inline styles mixed with tailwind classes. hardcoded colors everywhere. slight variations in how it handles responsive layouts.

if you come from a design systems background this is maddening. the entire point of design systems is that things are consistent. shared tokens, reusable components, documented patterns. humans learned this lesson years ago. ai agents apparently did not.

the output is often fine in isolation. each individual generation works. but across a project you end up with five slightly different sidebar implementations, three different approaches to data tables, inconsistent color usage, and a codebase that looks like it was built by five different developers who never talked to each other.

which, i mean, it kind of was.

## from boilerplate to framework

meanwhile i kept building the same saas stuff over and over. every project needed auth. every project needed payments. dashboards, charts, theme systems, security middleware. same patterns, same code, different project.

so first i made a boilerplate. consolidated all that repeated infrastructure into one nextjs starter. it was useful for me. not many other people cared, which is fair, the world has plenty of nextjs boilerplates.

then i had a thought: what if i turned it into an actual framework. not just a boilerplate you clone, but real npm packages you install. a design system that enforces consistency. components that ai agents can import instead of generate.

i had zero framework building experience. literally none. but i had claude code and random pockets of free time over a few months.

## what came out of it

13 npm packages published under `@fabrk/*`. here's what they cover:

**ui layer**
- `@fabrk/components` has 109+ react components. dashboard shells, data tables, kpi cards, charts (11 types), forms, admin panels, ai chat ui, security components, org management
- `@fabrk/design-system` has 18 themes with runtime css variable switching. no build step needed, swap themes at runtime

**infrastructure**
- `@fabrk/auth` does nextauth adapter, api key management with sha256 hashing, mfa with totp and backup codes
- `@fabrk/payments` wraps stripe, polar, and lemon squeezy behind the same adapter interface
- `@fabrk/email` does resend plus a console adapter for dev
- `@fabrk/storage` does s3, cloudflare r2, and local filesystem behind one interface
- `@fabrk/security` handles csrf, csp, rate limiting, audit logging, gdpr data export, bot protection

**ai stuff**
- `@fabrk/ai` has llm provider abstraction, cost tracking with budget guards, streaming, prompt builder, embeddings

**the runtime**
- `@fabrk/framework` is its own vite 7 runtime with file system routing, ssr streaming, middleware, ai agents as first class primitives, mcp server, and a dev dashboard

plus config, core utilities, prisma store adapters, and a cli scaffolding tool.

## the adapter pattern

the thing im most proud of architecturally is how the adapter pattern runs through everything. payments? stripe, polar, lemon squeezy, all behind one `PaymentAdapter` interface. storage? s3, r2, local, same `StorageAdapter`. auth, email, same pattern.

want to switch from stripe to polar? change one config value. the interface is identical.

and every store (teams, api keys, audit log, jobs, webhooks, feature flags) has an in memory default. the entire stack runs locally with zero external accounts. no database needed, no stripe test keys, no s3 bucket. just `pnpm dev` and everything works.

this matters even more for ai agents. they can scaffold and run your app without having to set up a bunch of credentials first.

## making it work for ai agents

this is the part im most curious about feedback on.

every package ships an `AGENTS.md` file. its structured markdown that lists every export, every prop, every type, with usage examples. any llm can read it. not tied to claude or cursor or copilot.

when an ai agent reads AGENTS.md before generating code, instead of writing 80 lines of custom sidebar it does this:

```typescript
import { DashboardShell } from '@fabrk/components'

<DashboardShell sidebarItems={items} user={user} onSignOut={signOut}>
  {children}
</DashboardShell>
```

one import instead of 80 lines. consistent with every other page. theme aware across all 18 themes. the agent spends its context window on your actual business logic instead of reinventing data tables.

the design system enforces consistency too. semantic tokens only (no hardcoded `bg-blue-500`), specific rules about borders and radius, terminal inspired aesthetic with uppercase labels and bracket notation. the ai agent cant drift because the system constrains it.

## the runtime

i also built a vite 7 runtime because i wanted the dx of nextjs without being locked into vercel. same file system routing conventions:

```
app/
├── page.tsx              → /
├── dashboard/page.tsx    → /dashboard
├── dashboard/[id]/page.tsx → /dashboard/:id
├── api/users/route.ts    → /api/users
└── layout.tsx            → shared layout
```

ssr with streaming, middleware chain, and it deploys to node, cloudflare workers, deno, and bun. same code everywhere.

it also has ai agents as first class routing primitives. `defineAgent()` and `defineTool()` create agent routes with built in cost tracking, memory, and mcp support.

but you dont need any of this. every individual package works standalone with whatever framework you already use.

## honest assessment

its early. ive built small demo apps but nothing big in production. the runtime works solidly (3,221 tests) but hasnt been battle tested at scale. the component library is comprehensive but could use more real world usage feedback.

the whole thing was built by me and claude code over sporadic bursts of time across a few months. going from zero framework experience to 13 published npm packages is honestly still surreal to me.

## what i learned

**ai coding agents are genuinely powerful for building ambitious things.** i could not have built this without claude code. a ux designer building their own vite runtime? no chance without ai assistance.

**but ai needs constraints to produce consistent output.** this is the whole thesis of the project. give the agent a design system, component library, and structured docs, and the output is dramatically more consistent than "build me a dashboard" from scratch.

**the adapter pattern is worth the upfront work.** having three payment providers behind one interface felt like over engineering until i needed to add a fourth.

**security is a bottomless pit.** i ran 12 rounds of adversarial security auditing. each round found stuff the previous ones missed. redos in regex patterns. incomplete character escaping. missing headers on error paths. path traversal edge cases. if youre building a framework, budget serious time for this.

**in memory defaults eliminate friction.** making every external dependency optional during dev was the single biggest dx improvement. `pnpm dev` just works, no setup.

## try it

```bash
# full framework
npx create-fabrk-app my-app
cd my-app && pnpm install && pnpm dev

# or just grab individual packages
pnpm add @fabrk/components @fabrk/design-system @fabrk/core
```

**the numbers:**
- 13 packages on npm
- 109+ components, 15 hooks, 11 chart types
- 18 themes with runtime switching
- 3,221 tests
- 12 rounds of security auditing
- typescript strict, mit licensed
- deploys to node, cloudflare workers, deno, bun

**links:**
- [docs](https://framework.fabrk.dev) (40+ pages, component gallery, live demo)
- [github](https://github.com/jpoindexter/fabrk-framework)
- [npm](https://www.npmjs.com/org/fabrk)
- [live demo](https://framework.fabrk.dev/demo)

if nothing else, the AGENTS.md approach is something anyone can try. add a markdown file to your npm package listing your exports with props and examples. see if ai agents start using your api more accurately. costs nothing, takes an hour.

id love feedback on any of this. whether the concept resonates, whether the packages are useful, whether im solving a problem nobody actually has. all of it.
