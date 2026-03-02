import { DocLayout, Section } from '@/components/doc-layout'
import { STATS } from '@/data/stats'

export default function AboutPage() {
  return (
    <DocLayout
      title="ABOUT FABRK"
      description="The story behind the framework. How a production boilerplate became the first UI framework designed for AI coding agents."
    >
      <Section id="origin" title="THE ORIGIN">
        <p className="text-sm text-muted-foreground mb-4">
          FABRK started as a production boilerplate called{' '}
          <span className="text-foreground font-semibold">fabrk.dev</span> &mdash;
          a Next.js starter that I built and refined over years of shipping real SaaS
          products. Every time I started a new project, I&apos;d pull in the same patterns:
          auth flows, payment integrations, dashboard shells, data tables, theme systems,
          AI tooling. The boilerplate grew into something genuinely useful.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          It wasn&apos;t a framework. It wasn&apos;t a library. It was a living codebase
          that I kept copying, tweaking, and deploying. {STATS.components} components,{' '}
          {STATS.themes} themes, full auth with MFA, Stripe and Polar payment adapters,
          AI cost tracking, security hardening &mdash; all battle-tested in production.
        </p>
      </Section>

      <Section id="extraction" title="THE EXTRACTION">
        <p className="text-sm text-muted-foreground mb-4">
          Copying a boilerplate works until it doesn&apos;t. Bug fixes in one project
          didn&apos;t propagate to others. Improvements were siloed. I was maintaining
          the same code in multiple places &mdash; the exact problem a framework solves.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          So I started extracting. Components became{' '}
          <code className="text-primary">@fabrk/components</code>. Auth became{' '}
          <code className="text-primary">@fabrk/auth</code>. Payments, email, storage,
          security &mdash; each concern got its own package with a clean interface.
          The design system with its {STATS.themes} themes became{' '}
          <code className="text-primary">@fabrk/design-system</code>. The config system
          used Zod for type-safe validation across 12 sections.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Every external service went behind an adapter interface. Stripe, Polar, Lemon
          Squeezy &mdash; same API. S3, R2, local filesystem &mdash; same API. Every
          data store got an in-memory default so you could run the whole stack with zero
          external accounts. The monorepo took shape: {STATS.packages} packages, each
          with a focused responsibility.
        </p>
      </Section>

      <Section id="runtime" title="OWN RUNTIME">
        <p className="text-sm text-muted-foreground mb-4">
          The framework needed a runtime &mdash; routing, SSR, streaming, the works. Rather
          than depend on someone else&apos;s, I built fabrk&apos;s own: a Vite 7 plugin with
          file-system routing, SSR/RSC streaming, middleware, and a generic fetch handler
          that works on any runtime.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Node, Cloudflare Workers, Deno, Bun &mdash; deploy wherever you want. The{' '}
          <span className="text-foreground font-semibold">@fabrk/framework</span> package owns the
          full stack now. Runtime plus all the batteries.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          The result:{' '}
          <span className="text-foreground font-semibold">
            @fabrk/framework = own runtime + batteries (everything else)
          </span>.
        </p>
      </Section>

      <Section id="today" title="WHAT FABRK IS TODAY">
        <p className="text-sm text-muted-foreground mb-4">
          FABRK Framework is {STATS.packages} packages. {STATS.components} components.{' '}
          {STATS.themes} themes. Auth with MFA. Three payment providers. AI cost tracking
          and streaming. Email templates. File storage. Security middleware. A CLI that
          scaffolds production-ready apps in seconds.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          But the thing that makes it different isn&apos;t the feature count. It&apos;s
          who it&apos;s built for.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          FABRK is the first UI framework designed specifically for AI coding agents.
          Claude Code, Cursor, GitHub Copilot, v0.dev &mdash; these tools are how apps
          get built now. When an AI agent can import a complete dashboard shell, a
          pre-built auth flow, or a payment integration instead of generating hundreds
          of lines from scratch, the quality goes up and the time goes down.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Every package includes <code className="text-primary">AGENTS.md</code> files
          documenting all components, props, and usage examples specifically for AI
          consumption. Every interface is designed to be discoverable by an LLM reading
          the type signatures. Every adapter pattern means an AI agent can wire up
          Stripe or S3 by changing one config line instead of writing integration code.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-primary">{STATS.packages}</div>
            <div className="text-xs text-muted-foreground uppercase mt-1">PACKAGES</div>
          </div>
          <div className="border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-primary">{STATS.components}</div>
            <div className="text-xs text-muted-foreground uppercase mt-1">COMPONENTS</div>
          </div>
          <div className="border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-primary">{STATS.themes}</div>
            <div className="text-xs text-muted-foreground uppercase mt-1">THEMES</div>
          </div>
          <div className="border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-primary">{STATS.tests}</div>
            <div className="text-xs text-muted-foreground uppercase mt-1">TESTS</div>
          </div>
        </div>
      </Section>

      <Section id="who" title="WHO BUILT THIS">
        <p className="text-sm text-muted-foreground mb-4">
          I&apos;m Jason Poindexter. I build SaaS products and the tools to build them
          faster. FABRK is the distillation of years of shipping &mdash; every pattern
          that worked, extracted and packaged so the next project starts further ahead.
        </p>
        <p className="text-sm text-muted-foreground">
          <a
            href="https://github.com/jpoindexter"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
          >
            github.com/jpoindexter
          </a>
        </p>
      </Section>
    </DocLayout>
  )
}
