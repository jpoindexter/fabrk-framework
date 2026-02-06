# create-fabrk-app

CLI tool to scaffold new FABRK applications.

## Usage

```bash
npx create-fabrk-app my-app
cd my-app
npm install
npm run dev
```

## Templates

**Basic** - Minimal starter with core components
```bash
npx create-fabrk-app my-app --template basic
```

**AI SaaS** - Full AI features with cost tracking
```bash
npx create-fabrk-app my-app --template ai-saas
```

**Dashboard** - Analytics-focused with charts and KPIs
```bash
npx create-fabrk-app my-app --template dashboard
```

## What's Included

All templates include:
- Next.js 15 with App Router
- React 19 with Server Components
- FABRK components and design system
- Tailwind CSS v4
- TypeScript
- ESLint configuration

AI SaaS template adds:
- @fabrk/ai toolkit
- Cost tracking hooks
- Multi-provider support
- Budget management
- Example AI routes

Dashboard template adds:
- Charts and data visualization
- KPI components
- Analytics dashboard layout
- Data table components

## Options

```bash
npx create-fabrk-app <project-name> [options]

Options:
  -t, --template <name>  Template to use (basic|ai-saas|dashboard)
  --no-install          Skip dependency installation
  --no-git              Skip git initialization
  -h, --help            Display help
```

## Documentation

[View full documentation](https://github.com/jpoindexter/fabrk-framework)

## License

MIT
