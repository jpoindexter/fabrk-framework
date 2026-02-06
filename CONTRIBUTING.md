# Contributing to FABRK Framework

Thank you for your interest in contributing to FABRK!

## Development Setup

1. **Prerequisites**
   - Node.js 22+
   - pnpm 9+

2. **Clone and Install**
   ```bash
   git clone https://github.com/jpoindexter/fabrk-framework.git
   cd fabrk-framework
   pnpm install
   ```

3. **Build Packages**
   ```bash
   pnpm build
   ```

## Monorepo Structure

```
fabrk-framework/
├── packages/
│   ├── core/              # Framework runtime
│   ├── components/        # UI components
│   ├── ai/                # AI toolkit
│   ├── design-system/     # Design tokens
│   ├── config/            # Configuration
│   └── cli/               # CLI tool
├── templates/             # Starter templates
├── examples/              # Example apps
└── docs/                  # Documentation
```

## Development Workflow

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Edit files in appropriate package
   - Add tests if applicable
   - Update documentation

3. **Build and Test**
   ```bash
   pnpm build
   pnpm test
   pnpm type-check
   ```

4. **Create Changeset**
   ```bash
   pnpm changeset
   ```
   Follow prompts to describe your changes

5. **Commit**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

6. **Push and PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub

## Commit Convention

We use conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `refactor:` - Code refactoring
- `test:` - Test changes

## Publishing

Maintainers will handle releases using Changesets:

```bash
pnpm changeset version
pnpm build
pnpm release
```

## Questions?

Join our Discord or open a GitHub Discussion.
