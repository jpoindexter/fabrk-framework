---
title: i built a ui framework then cloudflare shipped the runtime i was building
published: false
tags: react, typescript, cloudflare, ai
---

## the boilerplate problem

ive been shipping saas products for years and every single one started the same way — clone my nextjs boilerplate, delete the old business logic, keep all the infra. auth flows, payment integrations, dashboard shell, charts, theme system, security middleware. same stuff every time.

over time it grew into something pretty substantial. 109+ components, 18 themes, auth with mfa, three payment providers, ai cost tracking. all production tested across multiple products.

but boilerplates rot. id fix a bug in one projects auth flow then realize three other projects had the same bug. maintaining the same code in five places is the exact problem packages solve.

## extracting it

so i started pulling things apart into 13 packages. the core principle was agnostic everywhere:

- payments? stripe, polar, lemon squeezy — same adapter interface. swap with a config change
- storage? s3, r2, local filesystem — same api
- auth? nextauth, api keys, mfa — same interface
- every store has an in-memory default so the whole thing runs with zero external accounts
- web crypto api only — no node crypto, runs on any edge runtime

all the packages work standalone. drop `@fabrk/components` into any react project. use `@fabrk/auth` with nextjs. use `@fabrk/payments` with remix. no lock-in to a specific framework or runtime — pick the packages you need, ignore the rest.

## then cloudflare released vinext

separately i was building a runtime layer. wanted vite-based ssr on cloudflare workers — edge deployment, no cold starts. got a decent prototype working.

then [vinext](https://github.com/cloudflare/vinext) dropped. vite 7, react 19, ssr on workers, nextjs api compat. basically exactly what i was building.

had to be honest with myself. the runtime wasnt where my unique value was. so the `@fabrk/framework` meta-package uses vinext for the runtime and bundles everything together — thats one way to use it if you want the full stack on cloudflare workers. but all the individual packages work independently with whatever framework you already use.

sent them a [pr fixing pnpm issues](https://github.com/cloudflare/vinext/pull/146) i hit during integration.

## agent-friendly, not agent-specific

the ai angle follows the same agnostic philosophy. every package includes `AGENTS.md` files — structured docs that any llm can read. not tied to claude or cursor or copilot. any agent that can read markdown and import npm packages can use it.

```typescript
import { DashboardShell, KpiCard, BarChart, DataTable } from '@fabrk/components'

export default function Dashboard() {
  return (
    <DashboardShell sidebarItems={items} user={user} onSignOut={signOut}>
      <KpiCard title="REVENUE" value="$12,340" change={12.5} trend="up" />
      <BarChart data={data} xAxisKey="month" series={[{ dataKey: 'revenue' }]} />
      <DataTable columns={columns} data={users} searchKey="name" />
    </DashboardShell>
  )
}
```

the agent reads AGENTS.md, gets enough context to use the library, spends its context window on your actual business logic instead of reinventing data tables. works the same whether youre using claude code, cursor, copilot, or whatever comes next.

## links

- [docs](https://framework.fabrk.dev)
- [live demo](https://framework.fabrk.dev/demo)
- [github](https://github.com/jpoindexter/fabrk-framework)
- [npm](https://www.npmjs.com/org/fabrk)

the framework is early. but the core idea — agnostic at every layer, from payment providers to ai agents to the runtime itself — feels right. use the whole stack or just the pieces you need.
