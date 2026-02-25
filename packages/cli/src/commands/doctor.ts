/**
 * fabrk doctor — Diagnose FABRK project issues.
 */
/* eslint-disable no-console */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { findProjectRoot, hasFabrkConfig } from './helpers';

export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Diagnose FABRK project issues')
    .action(() => {
      const root = findProjectRoot();
      console.log(chalk.bold.green('\n[FABRK DOCTOR]\n'));

      let issues = 0;

      // Check package.json exists
      const pkgPath = path.join(root, 'package.json');
      if (fs.existsSync(pkgPath)) {
        console.log(chalk.green('  ✓') + chalk.dim(' package.json found'));
      } else {
        console.log(chalk.red('  ✗') + chalk.dim(' package.json not found'));
        issues++;
      }

      // Check fabrk.config.ts
      if (hasFabrkConfig(root)) {
        console.log(chalk.green('  ✓') + chalk.dim(' fabrk.config.ts found'));
      } else {
        console.log(chalk.yellow('  ⚠') + chalk.dim(' fabrk.config.ts not found (optional but recommended)'));
      }

      // Check @fabrk/core is installed
      if (fs.existsSync(pkgPath)) {
        const pkg = fs.readJsonSync(pkgPath);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (allDeps['@fabrk/core']) {
          console.log(chalk.green('  ✓') + chalk.dim(` @fabrk/core installed (${allDeps['@fabrk/core']})`));
        } else {
          console.log(chalk.red('  ✗') + chalk.dim(' @fabrk/core not installed'));
          issues++;
        }

        // Check for Next.js
        if (allDeps['next']) {
          console.log(chalk.green('  ✓') + chalk.dim(` next installed (${allDeps['next']})`));
        } else {
          console.log(chalk.red('  ✗') + chalk.dim(' next not installed (required runtime)'));
          issues++;
        }

        // Check for React 19
        if (allDeps['react']) {
          const reactVer = allDeps['react'];
          if (reactVer.includes('19') || reactVer.includes('^19')) {
            console.log(chalk.green('  ✓') + chalk.dim(` react ${reactVer}`));
          } else {
            console.log(chalk.yellow('  ⚠') + chalk.dim(` react ${reactVer} — FABRK recommends React 19`));
          }
        }

        // Check for Tailwind CSS
        if (allDeps['tailwindcss'] || allDeps['@tailwindcss/postcss']) {
          console.log(chalk.green('  ✓') + chalk.dim(' Tailwind CSS installed'));
        } else {
          console.log(chalk.yellow('  ⚠') + chalk.dim(' Tailwind CSS not found'));
        }

        // Check for TypeScript
        if (allDeps['typescript']) {
          console.log(chalk.green('  ✓') + chalk.dim(` typescript installed (${allDeps['typescript']})`));
        } else {
          console.log(chalk.yellow('  ⚠') + chalk.dim(' typescript not found'));
        }
      }

      // Check node_modules exists
      if (fs.existsSync(path.join(root, 'node_modules'))) {
        console.log(chalk.green('  ✓') + chalk.dim(' node_modules exists'));
      } else {
        console.log(chalk.red('  ✗') + chalk.dim(' node_modules not found — run pnpm install'));
        issues++;
      }

      // Check .fabrk/ directory
      if (fs.existsSync(path.join(root, '.fabrk'))) {
        console.log(chalk.green('  ✓') + chalk.dim(' .fabrk/ directory exists'));
      } else {
        console.log(chalk.dim('  ○') + chalk.dim(' .fabrk/ not generated yet (run fabrk dev)'));
      }

      console.log();
      if (issues === 0) {
        console.log(chalk.green.bold('  All checks passed!'));
      } else {
        console.log(chalk.yellow(`  ${issues} issue(s) found`));
      }
      console.log();
    });
}
