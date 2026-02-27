# r/webdev — post saturday march 1

**title:** [Showoff Saturday] extracted my production boilerplate into npm packages, then cloudflare shipped the exact runtime i was building

---

ive been shipping saas products off the same nextjs boilerplate for years. every project started with copying the repo, ripping out the old business logic, keeping all the infra — auth, payments, dashboards, charts, themes etc. it grew to like 109 components, 18 themes, mfa, payment adapters, ai cost tracking, security stuff.

problem is bug fixes dont propagate across copies. fix something in one project, forget about the others. so i started extracting everything into packages. components, auth, payments, email, storage, security — 13 packages in a pnpm monorepo.

the whole thing is designed to be agnostic. payments? stripe, polar, lemon squeezy — same adapter interface, swap with a config change. storage? s3, r2, local filesystem — same api. auth? nextauth, api keys, mfa — all behind the same interface. every store has an in-memory default so you can run the whole stack with zero external accounts. web crypto api only so it runs on any edge runtime.

all the packages work standalone — drop `@fabrk/components` into any react project, use `@fabrk/auth` with nextjs, whatever. no lock-in.

separately i was building a runtime layer — vite + ssr on cloudflare workers. then cloudflare released [vinext](https://github.com/cloudflare/vinext), basically the exact same thing. had to be honest with myself — the runtime wasnt where my value was. so the `@fabrk/framework` meta-package uses vinext and bundles everything together. but thats just one option, all the packages work independently with whatever you already use.

sent them a [PR](https://github.com/cloudflare/vinext/pull/146) fixing pnpm hoisting issues i hit.

every package has AGENTS.md files that any llm can read — not tied to a specific ai tool. the idea is agents should import components instead of generating everything from scratch.

```bash
npx create-fabrk-app my-app
# or just add what you need
pnpm add @fabrk/components @fabrk/design-system
```

- [docs](https://framework.fabrk.dev)
- [live demo](https://framework.fabrk.dev/demo)
- [github](https://github.com/jpoindexter/fabrk-framework)

would love feedback, especially on the agent-friendly docs approach — curious if anyone else is thinking about that
