# r/SideProject

**title:** spent years copying the same boilerplate between projects, finally turned it into a real framework

---

every saas project i built started by cloning the same nextjs boilerplate and ripping out the old business logic. auth, payments, dashboards, charts, themes — same patterns every time. id been doing this for years and the boilerplate kept getting bigger. 109 components, 18 themes, auth with mfa and backup codes, stripe and polar payment adapters, ai cost tracking, csrf/csp/rate limiting, audit logging. all stuff id actually shipped and iterated on in real products.

the breaking point was realizing bug fixes werent propagating. id fix a race condition in one projects auth flow and the other four projects still had the bug. improvements were siloed. i was literally maintaining the same code in five places which is the exact problem packages exist to solve.

### the extraction

so i spent a few months extracting everything into standalone npm packages. 13 of them:

- **components** — 109+ ui components, 8 chart types, dashboard shell, data tables, org management
- **design system** — 18 themes with runtime css variable switching, no build step needed
- **auth** — nextauth adapter, api key management with sha-256 hashing, mfa with totp and backup codes
- **payments** — stripe, polar, lemon squeezy all behind the same adapter interface
- **ai** — cost tracking with budget guards, streaming, prompt builder, llm provider abstraction
- **security** — csrf, csp, rate limiting, audit logging, gdpr data export, bot protection
- **email, storage, config, core** — plus prisma store adapters

the whole thing is agnostic by design. three payment providers behind the same interface — swap with a config change not a rewrite. three storage providers same deal. every store has an in-memory default so the whole stack runs with zero external accounts during dev. web crypto api only, no node crypto, so it works on any edge runtime.

all the packages work standalone. drop `@fabrk/components` into any react project. use `@fabrk/auth` with nextjs. use `@fabrk/payments` with remix. no lock-in to a specific framework.

### the runtime thing

i also wanted a runtime layer — vite-based ssr, something modern that could replace the nextjs dependency. i started building it, got a prototype working with a vite plugin that handled ssr entry points, route discovery, api shims. then i stopped working on it for a few weeks.

during those few weeks cloudflare released [vinext](https://github.com/cloudflare/vinext). open source, mit licensed. vite 7, react 19, ssr on cloudflare workers, nextjs api compat layer. basically the exact same thing id been working on.

kinda funny honestly. part of me was annoyed but mostly i was relieved. they have a whole team on that problem. i had to be honest that the runtime wasnt where my unique value was — everything on top of it was. the components, the design system, the auth, the payments, the ai toolkit. thats the stuff thats hard to replicate.

so i pivoted. the `@fabrk/framework` meta-package uses vinext for the runtime and bundles all the batteries on top. sent them a [pr](https://github.com/cloudflare/vinext/pull/146) fixing pnpm strict hoisting issues i hit during integration. but again — vinext is just one option. all the individual packages work on their own with whatever framework you already use.

### the ai agent angle

the other thing i spent time on was making everything ai-agent friendly. every package has `AGENTS.md` files — structured docs that any llm can consume. not tied to claude or cursor or copilot. any coding agent that can read markdown and import npm packages can use it.

the idea is that when an agent can `import { DashboardShell, DataTable, BarChart }` instead of generating 500 lines from scratch every time, the output is more consistent and you save a ton of context window. the agent reads AGENTS.md, understands the props and patterns, writes the import. done.

not sure if thats a thing people care about yet but it felt like the right bet.

### where its at

- 13 packages published on npm under `@fabrk/*`
- 858 tests, all passing
- typescript strict, mit licensed
- cli scaffolding tool: `npx create-fabrk-app my-app`
- docs site with live demo, component gallery, 18 theme switcher

links:
- [docs](https://framework.fabrk.dev)
- [live demo](https://framework.fabrk.dev/demo)
- [github](https://github.com/jpoindexter/fabrk-framework)
- [npm](https://www.npmjs.com/org/fabrk)

its still early. would appreciate any feedback — especially on the agent-friendly docs approach and whether the standalone packages vs full framework balance makes sense.
