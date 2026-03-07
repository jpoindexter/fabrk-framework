# r/reactjs

**title:** i spent 15 years in ux at faang companies, relearned dev this past year with ai, and built a framework because ai keeps generating inconsistent slop

---

so heres my deal. i spent about 15 years doing ux and product design at places like apple and google. last year i decided to get back into actual development and ive been using ai coding agents (claude code, cursor etc) to build stuff.

the thing that kept driving me nuts was how inconsistent ai generated code is. ask it to build a dashboard monday, you get one version. ask it tuesday, completely different structure. different component patterns, different styling approaches, random inline styles mixed with tailwind, hardcoded colors everywhere. just... slop. every time.

coming from ux i know modularization and design systems solve this exact problem for humans. consistent tokens, reusable components, shared patterns. but ai agents dont do that. they generate from scratch every single time.

i was also building basically the same saas stuff over and over. auth, payments, dashboards, charts, themes. so first i made a boilerplate out of it. that was cool but nobody really cared about another nextjs boilerplate.

so i figured why not try to turn it into an actual framework. i had zero framework building experience. just started hacking at it here and there over the past few months using claude code to help me build it. and heres what came out of it

**the idea:** instead of an ai agent generating 500 lines of custom dashboard code from scratch, it should be able to do this

```typescript
import { DashboardShell, KpiCard, BarChart, DataTable } from '@fabrk/components'
import { mode } from '@fabrk/design-system'

export default function Dashboard() {
  return (
    <DashboardShell sidebarItems={nav} user={user} onSignOut={signOut}>
      <KpiCard title="REVENUE" value="$12,340" change={12.5} trend="up" />
      <BarChart data={data} xAxisKey="month" series={[{ dataKey: 'revenue' }]} />
      <DataTable columns={cols} data={users} searchKey="name" />
    </DashboardShell>
  )
}
```

consistent styling. theme aware. the agent doesnt need to figure out how the sidebar collapses on mobile or how chart tooltips work. it just imports and composes.

every package ships AGENTS.md files so ai coding agents can discover whats available instead of hallucinating their own version.

**whats in it:**

13 npm packages, all work standalone or together

- `@fabrk/components` 109+ ui components, 11 chart types, dashboard shells, data tables
- `@fabrk/design-system` 18 themes with runtime css variable switching
- `@fabrk/auth` nextauth adapter, api keys, mfa with totp
- `@fabrk/payments` stripe, polar, lemon squeezy same adapter interface
- `@fabrk/ai` llm providers, cost tracking, streaming, budget enforcement
- `@fabrk/security` csrf, csp, rate limiting, audit logging
- `@fabrk/framework` own vite 7 runtime with file system routing + ssr

everything uses adapter pattern. three payment providers behind one interface, swap with a config change. every store has an in memory default so the whole stack runs with zero external accounts during dev.

the runtime deploys to node, cloudflare workers, deno, bun. but you dont need the runtime, each package works independently with whatever framework you already use.

its early. ive built some small demo apps with it but nothing huge yet. 3,221 tests though which im pretty proud of. 12 rounds of security auditing. MIT licensed.

```bash
npx create-fabrk-app my-app
# or just grab what you need
pnpm add @fabrk/components @fabrk/design-system
```

docs: https://framework.fabrk.dev
github: https://github.com/jpoindexter/fabrk-framework
npm: https://www.npmjs.com/org/fabrk

would love to hear what people think. especially curious if anyone else has been frustrated with ai generated code consistency and whether the AGENTS.md approach makes sense to you

---

# r/webdev

**title:** ux designer turned developer, built a framework because ai coding tools keep generating inconsistent garbage

---

bit of a weird background for this. i spent 15 years doing ux/product design at faang companies. decided to get back into dev this past year and have been using ai coding agents heavily to build stuff.

heres the thing nobody talks about. ai generated code is wildly inconsistent. same prompt, different day, completely different output. the components look different, the styling is different, the patterns are different. if you come from a design systems background this is maddening.

so i started building. first a boilerplate, then when nobody cared about that i decided to try turning it into an actual framework. zero framework building experience, just vibes and claude code.

the thesis: next.js caliber dx but deploys anywhere, no vercel lock in. and built so ai agents can import pre built components instead of generating from scratch.

what came out of a few months of sporadic hacking:

- 13 npm packages (components, design system, auth, payments, ai, security, storage, email, config, core, store adapters, framework runtime, cli)
- 109+ ui components with 18 themes
- own vite 7 runtime with file system routing and ssr
- adapter pattern everywhere so you can swap providers without rewrites
- deploys to node, cloudflare workers, deno, bun
- 3,221 tests
- every package has AGENTS.md files so ai tools can discover whats available

all packages work standalone. dont need the framework, just grab `@fabrk/components` for your existing react project if thats all you want.

its early stage. ive built small demo apps but im sharing because i think the core ideas are interesting even if the execution is still rough:

1. ai agents should import not generate
2. everything behind adapter interfaces so nothing is locked in
3. design tokens not hardcoded colors so themes actually work
4. in memory defaults for everything so dev setup is zero config

links:
- https://framework.fabrk.dev
- https://github.com/jpoindexter/fabrk-framework
- https://www.npmjs.com/org/fabrk

feedback welcome, especially from people who are building with ai agents and have opinions on the inconsistency problem

---

# r/SideProject

**title:** spent the past year relearning dev after 15 years in ux, heres the framework i accidentally built

---

so my background is ux and product design at faang companies for about 15 years. last year i decided to actually learn to code properly (had done some before but not seriously) and ive been using ai coding agents to help me build stuff.

two things kept bugging me:

1. ai generates code differently every single time. same prompt different day, totally different components, different patterns, different styling. coming from design systems this drove me insane
2. i kept building the same saas infrastructure over and over. auth, payments, dashboards, charts, themes

first i made a boilerplate out of it. worked fine for me but honestly not many people were interested. ok fair.

then i thought... what if i tried to turn this into an actual framework. i had no idea how to build a framework. literally zero experience with that. but i had claude code and a lot of free time scattered across a few months.

and somehow it turned into this:

13 packages on npm covering ui components (109+), design system (18 themes), auth (nextauth + mfa), payments (stripe/polar/lemon squeezy), ai cost tracking, security middleware, and an actual vite 7 runtime with file system routing and ssr.

the thing im most proud of is probably the adapter pattern running through everything. want to switch from stripe to polar? change one config value. want to switch from s3 to cloudflare r2? same. every external dependency has an in memory fallback so you can run the whole thing locally with zero accounts or api keys.

and every package has AGENTS.md files that give ai coding agents context about whats available. the idea being they import components instead of generating 500 lines of custom code every time.

its early. ive only built small demo apps with it. 3,221 tests which honestly shocked me. the framework runtime works but its not battle tested on anything big. the whole thing was built by me and claude code over random bursts of time.

```bash
npx create-fabrk-app my-app
```

- docs: https://framework.fabrk.dev
- github: https://github.com/jpoindexter/fabrk-framework
- npm: https://www.npmjs.com/org/fabrk

wanted to share because honestly this has been one of the most fun things ive done. going from zero framework knowledge to having 13 published npm packages in a few months is wild. the ai assisted development workflow is genuinely powerful even when the output is inconsistent, which is kind of the irony of the whole project.

feedback appreciated. especially if you think the concept makes sense or if im solving a problem nobody actually has

---

# r/ClaudeAI

**title:** built a full ui framework using claude code over the past few months, heres what that experience was like

---

figured this community would appreciate this story. i spent 15 years doing ux at faang companies, decided to relearn dev this past year, and have been using claude code as my primary building tool.

the project started because i kept noticing how inconsistent ai generated code is. ask claude to build a dashboard monday, one result. ask tuesday, totally different structure. different patterns, different components, different styling approaches. coming from a design systems background where consistency is literally your job, this was driving me crazy.

so i decided to try building a framework that solves this. the idea: give ai agents a library of pre built, theme aware components so they import instead of generate.

i had zero framework building experience. none. i just started hacking at it with claude code, spending random chunks of time over a few months. and it turned into something way bigger than i expected.

**what claude code and i built together:**

- 13 npm packages published under @fabrk/*
- 109+ react components with 18 themes
- own vite 7 runtime with file system routing and ssr streaming
- auth package (nextauth, api keys, mfa)
- payments package (stripe, polar, lemon squeezy behind one interface)
- ai package (cost tracking, budget guards, llm provider abstraction)
- security package (csrf, csp, rate limiting, audit logging)
- 3,221 tests
- 12 rounds of security auditing where i basically tried to break everything

every package includes AGENTS.md files, structured docs that any llm can read to understand the api surface. when claude reads these before generating code it actually uses the existing components instead of making up its own.

**what the experience was like:**

honestly wild. going from zero framework experience to 13 published packages in a few months would have been impossible without ai. but its not like claude just built it for me. the architecture decisions, the adapter pattern design, the design system rules, the security hardening, knowing what good modular software looks like from my ux background... all that was human judgment. claude was the execution engine.

the irony isnt lost on me that i built a framework to fix ai inconsistency using ai that is itself inconsistent. you just have to be opinionated about what you want and keep pushing.

its early stage. small demo apps built, nothing huge. but i wanted to share because:

1. claude code is genuinely powerful for building ambitious things
2. the inconsistency problem is real and i think AGENTS.md is an interesting approach
3. you dont need to be a framework expert to build one anymore, which is both exciting and terrifying

- docs: https://framework.fabrk.dev
- github: https://github.com/jpoindexter/fabrk-framework

curious what this community thinks. has anyone else tried using claude to build something way outside their expertise?

---

# r/nextjs

**title:** built an alternative vite 7 runtime with the same file system routing because i wanted to deploy without vercel

---

not here to trash next.js, i literally built this project starting from a nextjs boilerplate. but i kept wanting to deploy to cloudflare workers and the whole vercel dependency was getting in the way.

so as part of a larger framework project i built a vite 7 based runtime that does file system routing, ssr with streaming, middleware, api routes. same conventions you know from next (`app/page.tsx`, `app/api/route.ts`, layouts, dynamic segments) but built on vite and deployable to any runtime that supports fetch.

```
app/
├── page.tsx              → /
├── dashboard/page.tsx    → /dashboard
├── dashboard/[id]/page.tsx → /dashboard/:id
├── api/users/route.ts    → /api/users
└── layout.tsx            → shared layout
```

deploys to node, cloudflare workers, deno, bun. same code everywhere.

the runtime is part of a bigger thing (13 packages with components, auth, payments, ai, security) but the routing/ssr layer is what next.js people might find interesting.

fair warning: its early stage. ive built demo apps with it, not production apps. 3,221 tests and the routing/ssr works solidly but its not battle tested at scale.

my background is actually ux/design not engineering so this whole thing has been a learning experience using ai coding tools to build way beyond my initial skill level.

- docs: https://framework.fabrk.dev
- github: https://github.com/jpoindexter/fabrk-framework

honest question: how many of you are actually happy with vercel or are you looking for alternatives? curious about the demand
