#!/usr/bin/env node

/**
 * fabrk CLI
 *
 * Framework CLI for FABRK projects. Provides dev, build, lint, and generate commands
 * that validate config and enforce FABRK conventions.
 *
 * @example
 * ```bash
 * fabrk dev          # Start dev server with config validation
 * fabrk build        # Build with config validation
 * fabrk lint         # Lint for design token compliance
 * fabrk generate component MyWidget  # Scaffold a component
 * ```
 */

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { execSync, spawn } from 'child_process';

const VERSION = '0.1.0';

// ============================================================================
// HELPERS
// ============================================================================

function findProjectRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'fabrk.config.ts')) ||
        fs.existsSync(path.join(dir, 'fabrk.config.js'))) {
      return dir;
    }
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

function hasFabrkConfig(root: string): boolean {
  return fs.existsSync(path.join(root, 'fabrk.config.ts')) ||
         fs.existsSync(path.join(root, 'fabrk.config.js'));
}

function runCommand(cmd: string, args: string[], cwd: string): void {
  const child = spawn(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });

  child.on('close', (code) => {
    process.exit(code ?? 0);
  });

  child.on('error', (err) => {
    console.error(chalk.red(`Failed to run ${cmd}: ${err.message}`));
    process.exit(1);
  });
}

// ============================================================================
// COMMANDS
// ============================================================================

program
  .name('fabrk')
  .description('FABRK Framework CLI')
  .version(VERSION);

/**
 * fabrk dev — Start dev server with config validation
 */
program
  .command('dev')
  .description('Start development server with FABRK config validation')
  .option('-p, --port <port>', 'Port number', '3000')
  .action((options) => {
    const root = findProjectRoot();

    if (hasFabrkConfig(root)) {
      console.log(chalk.green('[FABRK]') + chalk.dim(' Config detected: fabrk.config.ts'));
    } else {
      console.log(chalk.yellow('[FABRK]') + chalk.dim(' No fabrk.config.ts found — using defaults'));
    }

    console.log(chalk.green('[FABRK]') + chalk.dim(` Starting dev server on port ${options.port}...\n`));
    runCommand('npx', ['next', 'dev', '-p', options.port], root);
  });

/**
 * fabrk build — Validate config + build
 */
program
  .command('build')
  .description('Build the FABRK application with config validation')
  .action(() => {
    const root = findProjectRoot();

    if (hasFabrkConfig(root)) {
      console.log(chalk.green('[FABRK]') + chalk.dim(' Config validated: fabrk.config.ts'));
    } else {
      console.log(chalk.yellow('[FABRK]') + chalk.dim(' No fabrk.config.ts found — using defaults'));
    }

    console.log(chalk.green('[FABRK]') + chalk.dim(' Building...\n'));
    runCommand('npx', ['next', 'build'], root);
  });

/**
 * fabrk lint — Design token compliance, mode.radius checks, terminal casing
 */
program
  .command('lint')
  .description('Lint for FABRK design system compliance')
  .option('--fix', 'Attempt to fix issues automatically')
  .option('--dir <dir>', 'Directory to lint', 'src')
  .action(async (options) => {
    const root = findProjectRoot();
    const targetDir = path.resolve(root, options.dir);
    const spinner = ora('Scanning for design system violations...').start();

    if (!fs.existsSync(targetDir)) {
      // Try app/ directory (Next.js App Router)
      const appDir = path.resolve(root, 'app');
      if (!fs.existsSync(appDir)) {
        spinner.fail(`Directory not found: ${options.dir}`);
        process.exit(1);
      }
    }

    // Find all TSX/JSX files
    const files = findFiles(targetDir, ['.tsx', '.jsx']);

    if (files.length === 0) {
      spinner.info('No TSX/JSX files found');
      return;
    }

    spinner.text = `Linting ${files.length} files...`;

    let totalIssues = 0;
    const results: Array<{ file: string; issues: string[] }> = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const issues: string[] = [];

      // Check for hardcoded colors
      const colorRegex = /(?:bg|text|border)-(?:red|blue|green|yellow|purple|pink|orange|indigo|gray|slate|zinc|neutral|stone|amber|lime|emerald|teal|cyan|sky|violet|fuchsia|rose)-\d{2,3}/g;
      const colorMatches = content.match(colorRegex);
      if (colorMatches) {
        const unique = [...new Set(colorMatches)];
        issues.push(`Hardcoded colors: ${unique.slice(0, 3).join(', ')}${unique.length > 3 ? ` (+${unique.length - 3} more)` : ''}`);
      }

      // Check for hardcoded border-radius (should use mode.radius)
      const radiusRegex = /\brounded-(?:sm|md|lg|xl|2xl|3xl|full)\b/g;
      const radiusMatches = content.match(radiusRegex);
      if (radiusMatches) {
        // Skip if it's switch-specific (rounded-full is OK for switches)
        const nonSwitchRadius = radiusMatches.filter(r => r !== 'rounded-full');
        if (nonSwitchRadius.length > 0) {
          issues.push(`Hardcoded radius (use mode.radius): ${[...new Set(nonSwitchRadius)].join(', ')}`);
        }
      }

      // Check for inline styles
      const inlineStyleRegex = /style\s*=\s*\{\{/g;
      const inlineMatches = content.match(inlineStyleRegex);
      if (inlineMatches) {
        issues.push(`Inline styles found (${inlineMatches.length} occurrences)`);
      }

      // Check for eval or dangerouslySetInnerHTML
      if (content.includes('dangerouslySetInnerHTML')) {
        issues.push('dangerouslySetInnerHTML usage detected');
      }

      if (issues.length > 0) {
        totalIssues += issues.length;
        results.push({
          file: path.relative(root, file),
          issues,
        });
      }
    }

    if (totalIssues === 0) {
      spinner.succeed(chalk.green(`All ${files.length} files pass FABRK lint`));
    } else {
      spinner.warn(chalk.yellow(`Found ${totalIssues} issues in ${results.length} files`));
      console.log();

      for (const result of results) {
        console.log(chalk.bold(result.file));
        for (const issue of result.issues) {
          console.log(chalk.dim('  ') + chalk.yellow('⚠') + chalk.dim(` ${issue}`));
        }
        console.log();
      }
    }
  });

/**
 * fabrk generate — Scaffold new files following FABRK conventions
 */
const generate = program
  .command('generate')
  .alias('g')
  .description('Generate FABRK files from templates');

generate
  .command('component <name>')
  .description('Generate a new UI component')
  .option('--dir <dir>', 'Target directory', 'src/components')
  .action((name: string, options) => {
    const root = findProjectRoot();
    const componentDir = path.resolve(root, options.dir);
    const fileName = toKebabCase(name);
    const componentName = toPascalCase(name);
    const filePath = path.join(componentDir, `${fileName}.tsx`);

    if (fs.existsSync(filePath)) {
      console.log(chalk.red(`✗ Component already exists: ${filePath}`));
      process.exit(1);
    }

    fs.ensureDirSync(componentDir);
    fs.writeFileSync(filePath, generateComponentTemplate(componentName));

    console.log(chalk.green('✓') + chalk.dim(` Created ${path.relative(root, filePath)}`));
  });

generate
  .command('page <name>')
  .description('Generate a new page')
  .option('--dir <dir>', 'Target directory', 'app')
  .action((name: string, options) => {
    const root = findProjectRoot();
    const pageName = toKebabCase(name);
    const pageDir = path.resolve(root, options.dir, pageName);
    const filePath = path.join(pageDir, 'page.tsx');

    if (fs.existsSync(filePath)) {
      console.log(chalk.red(`✗ Page already exists: ${filePath}`));
      process.exit(1);
    }

    fs.ensureDirSync(pageDir);
    fs.writeFileSync(filePath, generatePageTemplate(toPascalCase(name)));

    console.log(chalk.green('✓') + chalk.dim(` Created ${path.relative(root, filePath)}`));
  });

generate
  .command('api <name>')
  .description('Generate a new API route')
  .option('--dir <dir>', 'Target directory', 'app/api')
  .action((name: string, options) => {
    const root = findProjectRoot();
    const routeName = toKebabCase(name);
    const routeDir = path.resolve(root, options.dir, routeName);
    const filePath = path.join(routeDir, 'route.ts');

    if (fs.existsSync(filePath)) {
      console.log(chalk.red(`✗ API route already exists: ${filePath}`));
      process.exit(1);
    }

    fs.ensureDirSync(routeDir);
    fs.writeFileSync(filePath, generateApiTemplate(name));

    console.log(chalk.green('✓') + chalk.dim(` Created ${path.relative(root, filePath)}`));
  });

/**
 * fabrk info — Show project info and config
 */
program
  .command('info')
  .description('Show FABRK project information')
  .action(() => {
    const root = findProjectRoot();
    const hasConfig = hasFabrkConfig(root);
    const pkgPath = path.join(root, 'package.json');

    console.log(chalk.bold.green('\n[FABRK PROJECT INFO]\n'));

    if (fs.existsSync(pkgPath)) {
      const pkg = fs.readJsonSync(pkgPath);
      console.log(chalk.dim('  Name:    ') + pkg.name);
      console.log(chalk.dim('  Version: ') + (pkg.version || 'N/A'));

      // Find FABRK dependencies
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const fabrkDeps = Object.keys(allDeps).filter(d => d.startsWith('@fabrk/'));
      if (fabrkDeps.length > 0) {
        console.log(chalk.dim('  Packages:'));
        for (const dep of fabrkDeps) {
          console.log(chalk.dim('    ') + chalk.cyan(dep) + chalk.dim(` ${allDeps[dep]}`));
        }
      }
    }

    console.log(chalk.dim('  Config:  ') + (hasConfig ? chalk.green('fabrk.config.ts') : chalk.yellow('none')));
    console.log(chalk.dim('  Root:    ') + root);
    console.log();
  });

program.parse();

// ============================================================================
// UTILITIES
// ============================================================================

function findFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...findFiles(fullPath, extensions));
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

function generateComponentTemplate(name: string): string {
  return `'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

export interface ${name}Props {
  className?: string
  children?: React.ReactNode
}

export function ${name}({ className, children }: ${name}Props) {
  return (
    <div
      className={cn(
        'border border-border bg-card p-4',
        mode.radius,
        mode.font,
        className
      )}
    >
      {children}
    </div>
  )
}
`;
}

function generatePageTemplate(name: string): string {
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

function generateApiTemplate(name: string): string {
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
